"""Measure the trial mix against the final_music acceptance criteria."""
import argparse
import json
import re
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 48000


def read_wav(path):
    p = subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-of', 'json', str(path)],
                       capture_output=True, text=True, check=True)
    info = json.loads(p.stdout)['streams'][0]
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f32le', '-acodec', 'pcm_f32le',
                          '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    a = np.frombuffer(raw, dtype='<f4')
    if info['channels'] > 1:
        # Take channel 0 only: the narration is duplicated to L/R in the mix, so
        # averaging would apply an unintended -3 dB to every stereo measurement.
        a = a.reshape(-1, info['channels'])[:, 0]
    return a


def st_loudness(x, win=3.0):
    """Short-term loudness (K-weighted-ish approx) per window, in LUFS-ish dB."""
    n = int(win * SR)
    hop = n // 2
    # simple K-weighting: pre-filter (high shelf) + highpass approximation via biquad
    import scipy.signal as sig
    b, a = sig.butter(2, 1500 / (SR / 2), btype='high')
    xf = sig.lfilter(b, a, x)
    # ITU K-weighting shelf
    f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    K = np.tan(np.pi * f0 / SR)
    Vh = 10 ** (G / 20)
    Vb = Vh ** 0.4996
    a0 = 1 + K / Q + K * K
    b0 = (Vh + Vb * K / Q + K * K) / a0
    b1 = 2 * (K * K - Vh) / a0
    b2 = (Vh - Vb * K / Q + K * K) / a0
    a1 = 2 * (K * K - 1) / a0
    a2 = (1 - K / Q + K * K) / a0
    xf = sig.lfilter([b0, b1, b2], [1.0, a1, a2], xf)
    out = []
    for s in range(0, len(xf) - n, hop):
        seg = xf[s:s + n]
        rms = np.sqrt(np.mean(seg ** 2) + 1e-20)
        out.append((s / SR, 20 * np.log10(rms) - 0.691))
    return np.array(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--mix', required=True, type=Path)
    ap.add_argument('--voice', required=True, type=Path)
    ap.add_argument('--music', required=True, type=Path, help='ducked music bed from diagnostics')
    ap.add_argument('--timeline', required=True, type=Path)
    ap.add_argument('--total', type=float, default=342.0)
    ap.add_argument('--out', required=True, type=Path)
    a = ap.parse_args()

    mix = read_wav(a.mix)
    voice = read_wav(a.voice)
    music = read_wav(a.music)
    tl = json.loads(a.timeline.read_text())
    lines = tl['lines']
    res = {}

    # 1 duration / clipping
    dur = len(mix) / SR
    peak = float(np.max(np.abs(mix)))
    res['duration_s'] = dur
    res['duration_err_s'] = dur - a.total
    res['sample_peak'] = peak
    res['clipped_samples_ge_0_979'] = int(np.sum(np.abs(mix) >= 0.979))

    # 2 intelligibility: per sentence, median short-term loudness of music vs voice
    music_st = st_loudness(music)
    voice_st = st_loudness(voice)
    rows = []
    for ln in lines:
        s, e = ln['start'], ln['end']
        m = music_st[(music_st[:, 0] >= s) & (music_st[:, 0] + 3.0 <= e + 1e-9)]
        v = voice_st[(voice_st[:, 0] >= s) & (voice_st[:, 0] + 3.0 <= e + 1e-9)]
        if len(m) == 0 or len(v) == 0:
            continue
        rows.append((ln['n'], s, e, float(np.median(m[:, 1])), float(np.median(v[:, 1]))))
    gaps = [(n, v - m) for n, s, e, m, v in rows]
    worst = min(gaps, key=lambda t: t[1])
    res['sentences_measured'] = len(rows)
    res['voice_total_sentences'] = len(lines)
    res['min_gap_lu'] = worst[1]
    res['min_gap_sentence'] = worst[0]
    res['sentences_below_14lu'] = [n for n, g in gaps if g < 14.0]
    res['median_gap_lu'] = float(np.median([g for _, g in gaps]))

    # music short-term peak in narration gaps (voice silent)
    vmask = np.zeros(len(music), dtype=bool)
    for ln in lines:
        vmask[int(ln['start'] * SR):int(ln['end'] * SR)] = True
    gapwin = 3.0
    peak_st = -99
    for t, l in music_st:
        s = int(t * SR)
        if s + gapwin * SR < len(music) and not vmask[s:s + int(gapwin * SR)].any():
            peak_st = max(peak_st, l)
    res['music_shortterm_peak_in_gaps_dbfs'] = peak_st

    # 3 voice unchanged: compare the narration-band component of mix vs voice.
    # The mix is stereo; the narration was authored mono. Compare in the mono
    # (channel-summed) domain so the stereo duplication does not bias the fit.
    mix_mono = mix
    idx = np.where(vmask[:len(mix)])[0]
    seg_m = mix_mono[idx]
    seg_v = voice[idx][:len(seg_m)]
    alpha = float(np.dot(seg_m, seg_v) / np.dot(seg_v, seg_v))
    res['voice_fit_alpha'] = alpha
    res['voice_level_change_db'] = 20 * np.log10(alpha) if alpha > 0 else None
    resid = seg_m - alpha * seg_v
    res['voice_residual_db'] = 20 * np.log10(np.sqrt(np.mean(resid ** 2)))
    res['voice_signal_db'] = 20 * np.log10(np.sqrt(np.mean(seg_v ** 2)))
    # Independent check: integrated loudness of the narration-only region of the
    # final mix vs. the narration source (both measured with the same filter).
    def ebur128_of(sig_arr, start=None, dur=None):
        seg = sig_arr
        if start is not None:
            seg = seg[int(start * SR):int((start + dur) * SR)]
        raw = seg.astype('<f4').tobytes()
        p = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1',
                            '-i', 'pipe:0', '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                           input=raw, capture_output=True)
        i = re.search(r'^\s+I:\s+(-?[\d.]+) LUFS', p.stderr.decode(), re.M)
        pk = re.search(r'^\s+Peak:\s+(-?[\d.]+) dBFS', p.stderr.decode(), re.M)
        return (float(i.group(1)) if i else None, float(pk.group(1)) if pk else None)
    mix_i, mix_pk = ebur128_of(mix_mono)
    voice_i, voice_pk = ebur128_of(voice)
    res['mix_integrated_lufs'] = mix_i
    res['mix_peak_dbfs'] = mix_pk
    res['voice_source_integrated_lufs'] = voice_i
    res['voice_source_peak_dbfs'] = voice_pk
    res['voice_level_change_db_ebur128'] = (mix_i - voice_i) if (mix_i and voice_i) else None

    # 4 fades
    # music component estimate: mix - voice (voice already scaled) to inspect fade tail
    mus_est = mix[:int((a.total) * SR)] - np.pad(alpha * voice, (0, max(0, len(mix) - len(voice))))[:len(mix)]
    tail = mus_est[int((a.total - 4) * SR):]
    # monotonic check on 20 ms RMS envelope
    env = []
    for s in range(0, len(tail), int(0.02 * SR)):
        seg = tail[s:s + int(0.02 * SR)]
        env.append(20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-12))
    env = np.array(env)
    diffs = np.diff(env)
    nonmono = int(np.sum(diffs > 0.05))
    res['tail_final_dbfs'] = float(env[-1])
    res['tail_monotonic_violations'] = nonmono
    res['tail_max_after_start_dbfs'] = float(env.max())
    head = mus_est[:int(2.0 * SR)]
    henv = []
    for s in range(0, len(head), int(0.05 * SR)):
        seg = head[s:s + int(0.05 * SR)]
        henv.append(20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-12))
    henv = np.array(henv)
    res['fadein_db_at_0_05s'] = float(henv[0])
    res['fadein_db_at_2_0s'] = float(henv[-1])
    res['fadein_max_slope_db_per_05s'] = float(np.max(np.diff(henv)))

    res = {k: (float(v) if isinstance(v, (np.floating, np.integer)) else v) for k, v in res.items()}
    a.out.write_text(json.dumps(res, indent=2) + '\n')
    print(json.dumps(res, indent=2))


if __name__ == '__main__':
    main()
