"""Deterministic, single-process FFmpeg narration/music mix; no input mutation."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import tempfile


def run(args):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-nostats', '-y',
                        '-threads', '1', '-filter_threads', '1', '-filter_complex_threads', '1'] + args,
                       capture_output=True, text=True)
    if p.returncode:
        raise RuntimeError(p.stderr)
    return p.stderr


def probe(path):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format',
                                              '-show_streams', '-of', 'json', str(path)]))


def loudness(path, target=-16):
    log = run(['-i', str(path), '-af',
               f'loudnorm=I={target}:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'])
    return json.loads(re.findall(r'\{\s*"input_i".*?\}', log, re.S)[-1])


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--voice', required=True, type=Path)
    p.add_argument('--music', required=True, type=Path)
    p.add_argument('--total', type=float, default=342.0)
    p.add_argument('--out', required=True, type=Path)
    p.add_argument('--music-extra-db', type=float, default=0,
                   help='Optional additional attenuation after normalization to -30 LUFS (<=0).')
    a = p.parse_args()
    if not math.isfinite(a.total) or a.total < 6 or a.music_extra_db > 0:
        p.error('total must be finite and >=6; extra music gain must be <=0')
    for path in (a.voice, a.music):
        if not path.is_file():
            p.error(f'Input missing: {path}')
    if a.out.resolve() in (a.voice.resolve(), a.music.resolve()):
        p.error('Output cannot overwrite an input')
    voice_duration = float(probe(a.voice)['format']['duration'])
    mdur = float(probe(a.music)['format']['duration'])
    if a.total < voice_duration:
        p.error('total must contain the entire narration')
    if a.total > 2*mdur-4:
        p.error('Music too short: only one repeat with a 4-second acrossfade is permitted')
    a.out.parent.mkdir(parents=True, exist_ok=True)
    diag = a.out.with_suffix('.diagnostics')
    diag.mkdir(exist_ok=True)
    source = loudness(a.music, -30)
    gain = -30-float(source['input_i'])
    n = round(a.total*48000)
    with tempfile.TemporaryDirectory(prefix='final_music_') as tmp:
        tmp = Path(tmp)
        bed = tmp/'bed.wav'
        # Normalize once at constant gain. Acrossfade is used only if needed.
        music = f'[0:a]aresample=48000,aformat=channel_layouts=stereo,volume={gain:.9f}dB'
        if a.total > mdur:
            music += ',asplit=2[m1][m2];[m1][m2]acrossfade=d=4:c1=tri:c2=tri'
        music += f',atrim=end_sample={n},asetpts=PTS-STARTPTS[m]'
        run(['-i', str(a.music), '-filter_complex', music, '-map', '[m]',
             '-c:a', 'pcm_f32le', str(bed)])
        bed_info = loudness(bed, -30)
        # Loop/crop can change gated I: calibrate the actual full-length bed to -30.
        correction = -30-float(bed_info['input_i'])
        before = diag/'mix_before_normalization.wav'
        voice = diag/'voice_before_normalization.wav'
        ducked = diag/'music_before_normalization.wav'

        def build_mix(music_trim_db):
            """Build the pre-normalization mix with music trimmed by extra_db."""
            graph = (
                f'[0:a]aresample=48000,pan=stereo|c0=c0|c1=c0,apad,atrim=end_sample={n},'
                'asetpts=PTS-STARTPTS,asplit=3[sc][v][vsave];'
                f'[1:a]volume={correction+a.music_extra_db+music_trim_db:.9f}dB[m];'
                '[m][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400:makeup=1[d];'
                f'[d]afade=t=in:st=0:d=2:curve=tri,afade=t=out:st={a.total-4:.9f}:d=4:curve=exp,'
                'asplit=2[dm][msave];[v][dm]amix=inputs=2:normalize=0:duration=longest[mix]'
            )
            run(['-i', str(a.voice), '-i', str(bed), '-filter_complex', graph,
                 '-map', '[mix]', '-c:a', 'pcm_f32le', str(before),
                 '-map', '[vsave]', '-c:a', 'pcm_f32le', str(voice),
                 '-map', '[msave]', '-c:a', 'pcm_f32le', str(ducked)])
            return loudness(before)

        # Pre-trim the music so the mix premix is already close to -16 LUFS.
        # This ensures loudnorm applies near-zero linear gain so the voice level
        # is preserved to within 0.1 dB.
        music_trim = 0.0
        iterations = []
        for _ in range(4):
            meas = build_mix(music_trim)
            premix_i = float(meas['input_i'])
            # We want premix_i ≈ -16; excess loudness comes from both voice and music.
            # Voice is fixed at ~-16 LUFS; only trim music further.
            # If premix is louder than -16, attenuate music more.
            delta = premix_i - (-16.0)
            iterations.append({'music_trim_db': music_trim, 'premix_i': meas['input_i'],
                               'delta_db': delta})
            if abs(delta) < 0.1:
                break
            music_trim -= delta  # attenuate music to push premix toward -16
        first = meas
        norm = ('loudnorm=I=-16:TP=-1.5:LRA=11:linear=true:'
                f'measured_I={first["input_i"]}:measured_TP={first["input_tp"]}:'
                f'measured_LRA={first["input_lra"]}:measured_thresh={first["input_thresh"]}:'
                f'offset={first["target_offset"]}:print_format=json')
        log = run(['-i', str(before), '-af', norm+f',aresample=48000,atrim=end_sample={n}',
                   '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', '-map_metadata', '-1',
                   '-fflags', '+bitexact', '-flags:a', '+bitexact', str(a.out)])
        second = json.loads(re.findall(r'\{\s*"input_i".*?\}', log, re.S)[-1])
        report = dict(voice=str(a.voice.resolve()), music=str(a.music.resolve()), total=a.total,
                      music_source=source, bed_before_fades=bed_info,
                      music_gain_db=gain, bed_correction_db=correction,
                      music_extra_db=a.music_extra_db, music_trim_db=music_trim,
                      premix_calibration_iterations=iterations,
                      first_pass=first, second_pass=second,
                      output_measurement=loudness(a.out),
                      sha256=hashlib.sha256(a.out.read_bytes()).hexdigest())
        (diag/'loudness.json').write_text(json.dumps(report, indent=2)+'\n')
        print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
