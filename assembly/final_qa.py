#!/workspace/venv_qa/bin/python
"""Full-film QA for an assembled cut.

Writes, into --out:
  contact_sheet.png   one frame every 10 s, 8 columns, timecode under each frame
  sync_report.json    subtitle cue vs timeline sentence, and audio onset vs timeline
  black_frames.json   ffmpeg blackdetect d=0.1 pic_th=0.98
  audio_report.json   ebur128, astats peak, clipped samples, silence list
  scene_boundaries.png  one frame before and after each scene cut
  report.md           every number and pass/fail

Exit 0 when subtitle sync, audio onset and black-frame checks all pass.
Exit 1 when any of those fail. The report still lists the measured values.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

FONT = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
SUB_TOL = 0.05
AUDIO_TOL = 0.10


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def ffprobe(video: Path) -> dict:
    proc = run([
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration", "-show_entries", "stream=codec_type,width,height,avg_frame_rate,sample_rate,channels",
        "-of", "json", str(video),
    ])
    if proc.returncode != 0:
        raise SystemExit(proc.stderr.decode("utf-8", "replace")[:500])
    info = json.loads(proc.stdout.decode("utf-8"))
    duration = float(info["format"]["duration"])
    video_stream = next(s for s in info["streams"] if s["codec_type"] == "video")
    rate = video_stream.get("avg_frame_rate") or "30/1"
    num, den = rate.split("/")
    fps = float(num) / float(den) if float(den) else 30.0
    audio = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    return {
        "duration": duration,
        "width": int(video_stream["width"]),
        "height": int(video_stream["height"]),
        "fps": fps,
        "audio": audio,
    }


def parse_srt(path: Path) -> list[dict]:
    raw = path.read_text(encoding="utf-8-sig")
    blocks = re.split(r"\n\s*\n", raw.strip())
    cues = []
    for block in blocks:
        match = re.search(
            r"(\d+):(\d+):(\d+),(\d+)\s*-->\s*(\d+):(\d+):(\d+),(\d+)",
            block,
        )
        if not match:
            continue
        nums = [int(v) for v in match.groups()]

        def stamp(h, m, s, ms):
            return h * 3600 + m * 60 + s + ms / 1000.0

        lines = block.splitlines()
        time_at = next(i for i, line in enumerate(lines) if "-->" in line)
        text = "\n".join(lines[time_at + 1:]).strip()
        cues.append({
            "start": stamp(*nums[:4]),
            "end": stamp(*nums[4:]),
            "text": text,
            "first": text.split("\n", 1)[0].strip(),
        })
    return cues


def norm_text(text: str) -> str:
    return re.sub(r"[\s\W_]+", "", text or "", flags=re.UNICODE).lower()


def text_same(a: str, b: str) -> bool:
    na, nb = norm_text(a), norm_text(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    return na in nb or nb in na


def load_timeline(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    lines = data["lines"]
    return {"duration": float(data.get("duration") or lines[-1]["end"]), "lines": lines}


def sync_subtitles(cues: list[dict], lines: list[dict], tol: float) -> dict:
    pairs = []
    count = min(len(cues), len(lines))
    for i in range(count):
        cue, line = cues[i], lines[i]
        ds = cue["start"] - float(line["start"])
        de = cue["end"] - float(line["end"])
        same = text_same(cue["first"], line["text"])
        pairs.append({
            "n": line["n"],
            "cue_index": i + 1,
            "timeline_text": line["text"],
            "srt_text": cue["first"],
            "text_match": same,
            "timeline_start": float(line["start"]),
            "timeline_end": float(line["end"]),
            "srt_start": cue["start"],
            "srt_end": cue["end"],
            "delta_start": ds,
            "delta_end": de,
            "pass": same and abs(ds) <= tol and abs(de) <= tol,
        })
    unmatched = []
    if len(cues) != len(lines):
        unmatched.append({"cues": len(cues), "lines": len(lines)})
    fail = [p for p in pairs if not p["pass"]]
    passed = len(cues) == len(lines) and not fail and len(pairs) == len(lines) and len(lines) > 0
    deltas_s = [abs(p["delta_start"]) for p in pairs]
    deltas_e = [abs(p["delta_end"]) for p in pairs]
    return {
        "tolerance_s": tol,
        "cue_count": len(cues),
        "line_count": len(lines),
        "pair_count": len(pairs),
        "text_mismatch": sum(1 for p in pairs if not p["text_match"]),
        "max_abs_start_delta": max(deltas_s) if deltas_s else None,
        "max_abs_end_delta": max(deltas_e) if deltas_e else None,
        "fail_count": len(fail) + (0 if len(cues) == len(lines) else abs(len(cues) - len(lines))),
        "pass": passed,
        "unmatched_counts": unmatched,
        "pairs": pairs,
    }


def parse_silence(log: str) -> list[dict]:
    starts = [float(v) for v in re.findall(r"silence_start:\s*([\d.]+)", log)]
    ends = [float(v) for v in re.findall(r"silence_end:\s*([\d.]+)", log)]
    durations = [float(v) for v in re.findall(r"silence_duration:\s*([\d.]+)", log)]
    segs = []
    for i, start in enumerate(starts):
        end = ends[i] if i < len(ends) else None
        dur = durations[i] if i < len(durations) else (None if end is None else end - start)
        segs.append({"start": start, "end": end, "duration": dur})
    return segs


def parse_black(log: str) -> list[dict]:
    found = []
    for start, end, dur in re.findall(
        r"black_start:([\d.]+)\s+black_end:([\d.]+)\s+black_duration:([\d.]+)",
        log,
    ):
        found.append({"start": float(start), "end": float(end), "duration": float(dur)})
    return found


def parse_ebur128(log: str) -> dict:
    summary = log.split("Summary:", 1)[-1]
    integrated = re.search(r"Integrated loudness:\s+I:\s*([-\d.]+)\s*LUFS", summary)
    lra = re.search(r"Loudness range:\s+LRA:\s*([-\d.]+)\s*LU", summary)
    true_peak = re.search(r"True peak:\s+Peak:\s*([-\d.]+)\s*dBFS", summary)
    return {
        "integrated_lufs": float(integrated.group(1)) if integrated else None,
        "lra": float(lra.group(1)) if lra else None,
        "true_peak_dbtp": float(true_peak.group(1)) if true_peak else None,
    }


def parse_astats_peak(log: str) -> float | None:
    peaks = re.findall(r"Peak level dB:\s*([-\d.]+|inf|-inf)", log)
    if not peaks:
        return None
    value = peaks[-1]
    if value in ("inf", "-inf"):
        return float(value)
    return float(value)


def decode_pcm(video: Path) -> tuple[np.ndarray, int]:
    proc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", str(video), "-vn", "-ac", "2", "-ar", "48000", "-f", "s16le", "pipe:1"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    raw, err = proc.communicate()
    if proc.returncode != 0 or not raw:
        raise RuntimeError(err.decode("utf-8", "replace")[:400] or "no audio samples")
    samples = np.frombuffer(raw, dtype=np.int16)
    if samples.size % 2:
        samples = samples[:-1]
    return samples.reshape(-1, 2), 48000


def energy_onsets(stereo: np.ndarray, sr: int, lines: list[dict], thresh_db: float, tol: float) -> list[dict]:
    mono = stereo.astype(np.float32).mean(axis=1)
    hop = sr // 100
    frames = mono.size // hop
    if frames < 2:
        return [{"n": line["n"], "onset": None, "delta": None, "pass": False, "reason": "audio too short"} for line in lines]
    trimmed = mono[: frames * hop].reshape(frames, hop)
    rms = np.sqrt(np.mean(trimmed * trimmed, axis=1) + 1e-12)
    db = 20.0 * np.log10(rms / 32768.0 + 1e-12)
    times = np.arange(frames) * hop / sr
    out = []
    for line in lines:
        start = float(line["start"])
        end = float(line["end"])
        i_s = min(frames - 1, max(0, int(start * sr / hop)))
        # If the sentence start is already inside a loud run, the onset is the
        # beginning of that run. A later dip must not be treated as the attack.
        if db[i_s] >= thresh_db:
            i = i_s
            while i > 0 and db[i - 1] >= thresh_db:
                i -= 1
            onset = float(times[i])
            reason = "loud-run"
        else:
            i_e = min(frames - 1, max(i_s + 1, int(max(start + 0.25, end) * sr / hop)))
            onset = None
            for i in range(max(1, i_s), i_e + 1):
                if db[i - 1] < thresh_db <= db[i]:
                    onset = float(times[i])
                    break
            reason = "rising-edge" if onset is not None else "no-energy"
        delta = None if onset is None else onset - start
        out.append({
            "n": line["n"],
            "timeline_start": start,
            "onset": onset,
            "delta": delta,
            "pass": delta is not None and abs(delta) <= tol,
            "reason": reason,
        })
    return out


def silence_onsets(silences: list[dict], duration: float, lines: list[dict], tol: float) -> list[dict]:
    spans = []
    for seg in silences:
        if seg["end"] is None:
            continue
        spans.append((seg["start"], seg["end"]))
    spans.sort()
    speech = []
    cursor = 0.0
    for start, end in spans:
        if start > cursor + 1e-3:
            speech.append([cursor, start])
        cursor = max(cursor, end)
    if duration > cursor + 1e-3:
        speech.append([cursor, duration])
    merged = []
    for start, end in speech:
        if merged and start - merged[-1][1] < 0.22:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    out = []
    for line in lines:
        start = float(line["start"])
        end = float(line["end"])
        hit = next((seg for seg in merged if seg[1] > start + 1e-3 and seg[0] < end), None)
        if hit is None and merged:
            hit = min(merged, key=lambda seg: abs(seg[0] - start))
        onset = None if hit is None else hit[0]
        delta = None if onset is None else onset - start
        out.append({
            "n": line["n"],
            "onset": onset,
            "delta": delta,
            "pass": delta is not None and abs(delta) <= tol,
        })
    return out


def summarise_onsets(rows: list[dict]) -> dict:
    deltas = [abs(row["delta"]) for row in rows if row["delta"] is not None]
    return {
        "max_abs_delta": max(deltas) if deltas else None,
        "fail_count": sum(1 for row in rows if not row["pass"]),
        "pass": bool(rows) and all(row["pass"] for row in rows),
        "sentences": rows,
    }


def font(size: int):
    return ImageFont.truetype(FONT, size)


def tc(t: float) -> str:
    ms = int(round(max(0.0, t) * 1000))
    s, ms = divmod(ms, 1000)
    m, s = divmod(s, 60)
    h, m = divmod(m, 60)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def montage(frames: list[tuple[Path, str]], dest: Path, cols: int) -> None:
    thumbs = []
    for path, label in frames:
        img = Image.open(path).convert("RGB")
        img.thumbnail((320, 180))
        thumbs.append((img, label))
    if not thumbs:
        Image.new("RGB", (640, 180), (244, 239, 230)).save(dest)
        return
    tw, th = 320, 180
    label_h = 44
    pad = 10
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw + (cols + 1) * pad, rows * (th + label_h) + (rows + 1) * pad), (28, 26, 32))
    draw = ImageDraw.Draw(sheet)
    face = font(18)
    for i, (img, label) in enumerate(thumbs):
        r, c = divmod(i, cols)
        x = pad + c * (tw + pad)
        y = pad + r * (th + label_h + pad)
        canvas = Image.new("RGB", (tw, th), (0, 0, 0))
        canvas.paste(img, ((tw - img.width) // 2, (th - img.height) // 2))
        sheet.paste(canvas, (x, y))
        draw.text((x, y + th + 6), label, fill=(232, 221, 233), font=face)
    dest.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(dest)


def extract_frames(video: Path, times: list[float], dest: Path) -> list[Path]:
    dest.mkdir(parents=True, exist_ok=True)
    paths = []
    for i, t in enumerate(times):
        path = dest / f"f_{i:03d}.png"
        proc = run([
            "ffmpeg", "-y", "-ss", f"{max(0.0, t):.3f}", "-i", str(video),
            "-frames:v", "1", str(path),
        ])
        if proc.returncode != 0 or not path.exists():
            raise RuntimeError(f"frame extract failed at {t}: {proc.stderr.decode()[:200]}")
        paths.append(path)
    return paths


def contact_sheet(video: Path, info: dict, out_dir: Path, work: Path, interval: float, cols: int) -> dict:
    times = []
    t = 0.0
    while t < info["duration"] - 1e-3:
        times.append(round(t, 3))
        t += interval
    if not times:
        times = [0.0]
    paths = extract_frames(video, times, work / "contact")
    montage([(p, tc(ts)) for p, ts in zip(paths, times)], out_dir / "contact_sheet.png", cols)
    return {"interval_s": interval, "columns": cols, "frames": len(times), "times": times}


def scene_sheet(video: Path, info: dict, timeline: dict, coverage_path: Path | None, out_dir: Path, work: Path) -> dict:
    coverage = {}
    if coverage_path and coverage_path.is_file():
        coverage = json.loads(coverage_path.read_text(encoding="utf-8"))
    fps = info["fps"] or 30.0
    half = 0.5 / fps
    raw = []
    chapter = None
    for line in timeline["lines"]:
        if line.get("chapter") != chapter:
            chapter = line.get("chapter")
            raw.append((float(line["start"]), f"{chapter} 句{int(line['n']):02d}"))
    by_n = {int(line["n"]): line for line in timeline["lines"]}
    missing = []
    for scene, pair in (coverage.get("ranges") or {}).items():
        if not isinstance(pair, (list, tuple)) or not pair:
            continue
        n = int(pair[0])
        line = by_n.get(n)
        if line is None:
            missing.append({"scene": scene, "n": n})
            continue
        raw.append((float(line["start"]), f"{scene} 句{n:02d}"))
    raw.sort(key=lambda item: item[0])
    merged = []
    for t, label in raw:
        if merged and abs(t - merged[-1]["t"]) <= half:
            if label not in merged[-1]["label"]:
                merged[-1]["label"] += " / " + label
        else:
            merged.append({"t": t, "label": label})
    frames = []
    inside = []
    for cut in merged:
        if cut["t"] > info["duration"] + 1e-3:
            cut["in_video"] = False
            continue
        cut["in_video"] = True
        before = max(0.0, cut["t"] - half)
        after = min(info["duration"] - half, cut["t"] + half)
        inside.append(cut)
        frames.append((before, f"{cut['label']} {tc(cut['t'])} 前"))
        frames.append((after, f"{cut['label']} {tc(cut['t'])} 后"))
    paths = extract_frames(video, [t for t, _ in frames], work / "cuts") if frames else []
    montage([(p, label) for p, (_, label) in zip(paths, frames)], out_dir / "scene_boundaries.png", 8)
    return {"cuts": merged, "shown": len(inside), "missing_sentences": missing, "coverage": str(coverage_path or "")}


def write_report(path: Path, video: Path, info: dict, sync: dict, audio: dict, black: dict, contact: dict, scenes: dict, passes: bool) -> None:
    worst = [p for p in sync["pairs"] if not p["pass"]][:12]
    lines = [
        "# 全片 QA",
        "",
        f"- 视频：`{video}`",
        f"- 时长：{info['duration']:.3f} s，{info['width']}×{info['height']}，{info['fps']:.3f} fps",
        f"- 总结：{'通过' if passes else '未通过'}",
        "",
        "## 字幕同步",
        "",
        f"- 阈值：|Δstart| 与 |Δend| ≤ {sync['tolerance_s']:.2f} s，且条数相同、首行文本为同一句",
        f"- 字幕条数 {sync['cue_count']}，timeline 句数 {sync['line_count']}",
        f"- max |Δstart| = {sync['max_abs_start_delta']}",
        f"- max |Δend| = {sync['max_abs_end_delta']}",
        f"- 文本不一致 {sync['text_mismatch']}，失败条数 {sync['fail_count']}",
        f"- 结果：{'通过' if sync['pass'] else '未通过'}",
        "",
    ]
    if worst:
        lines.append("失败样例（最多 12 条）：")
        lines.append("")
        for p in worst:
            lines.append(
                f"- 句 {p['n']}: Δstart={p['delta_start']:.3f} Δend={p['delta_end']:.3f} "
                f"text_match={p['text_match']} srt=`{p['srt_text']}` timeline=`{p['timeline_text']}`"
            )
        lines.append("")
    onset = audio["onset"]
    lines += [
        "## 音频起声",
        "",
        f"- 阈值：|onset − timeline start| ≤ {onset['threshold_s']:.2f} s",
        f"- 采用方法：{onset['method']}",
        f"- 能量法 max |Δ| = {onset['energy']['max_abs_delta']}，失败 {onset['energy']['fail_count']}",
        f"- silencedetect 法 max |Δ| = {onset['silencedetect']['max_abs_delta']}，失败 {onset['silencedetect']['fail_count']}",
        f"- 结果：{'通过' if onset['pass'] else '未通过'}",
        "",
        "## 黑帧",
        "",
        f"- blackdetect d=0.1 pic_th=0.98，段数 {len(black['segments'])}",
        f"- 结果：{'通过' if black['pass'] else '未通过'}",
        "",
        "## 响度与削波",
        "",
        f"- ebur128 integrated {audio['ebur128']['integrated_lufs']} LUFS，LRA {audio['ebur128']['lra']} LU，TP {audio['ebur128']['true_peak_dbtp']} dBTP",
        f"- astats 峰值 {audio['astats_peak_db']} dB",
        f"- 削波样本 {audio['clipped_samples']}",
        f"- silencedetect 静音段 {len(audio['silence_segments'])}（-35 dB，d=0.1 s）",
        "",
        "## 联系表与切点",
        "",
        f"- 联系表每 {contact['interval_s']:.0f} s 一帧，共 {contact['frames']} 帧，{contact['columns']} 列",
        f"- 场景切点 {len(scenes['cuts'])} 个（片内 {scenes['shown']}），coverage `{scenes['coverage']}`",
        "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Contact sheet, sync, black frames, loudness and scene cuts for one video.")
    parser.add_argument("video", type=Path)
    parser.add_argument("--timeline", type=Path, required=True)
    parser.add_argument("--srt", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--coverage", type=Path, default=None)
    parser.add_argument("--interval", type=float, default=10.0)
    parser.add_argument("--cols", type=int, default=8)
    parser.add_argument("--subtitle-tol", type=float, default=SUB_TOL)
    parser.add_argument("--audio-tol", type=float, default=AUDIO_TOL)
    args = parser.parse_args()
    if not args.video.is_file():
        print(f"missing video {args.video}", file=sys.stderr)
        return 1
    info = ffprobe(args.video)
    timeline = load_timeline(args.timeline)
    cues = parse_srt(args.srt)
    coverage = args.coverage
    if coverage is None:
        guess = Path(__file__).resolve().parents[1] / "qa/v6/a02/coverage.json"
        coverage = guess if guess.is_file() else None
    out = args.out
    work = out / ".work"
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True, exist_ok=True)
    out.mkdir(parents=True, exist_ok=True)
    try:
        print("contact sheet", flush=True)
        contact = contact_sheet(args.video, info, out, work, args.interval, args.cols)
        print("scene boundaries", flush=True)
        scenes = scene_sheet(args.video, info, timeline, coverage, out, work)
        print("blackdetect + ebur128 + silencedetect", flush=True)
        audio_log = run([
            "ffmpeg", "-hide_banner", "-i", str(args.video),
            "-af", "silencedetect=n=-35dB:d=0.1,ebur128=peak=true",
            "-f", "null", "-",
        ]).stderr.decode("utf-8", "replace")
        black_log = run([
            "ffmpeg", "-hide_banner", "-i", str(args.video),
            "-vf", "blackdetect=d=0.1:pic_th=0.98",
            "-an", "-f", "null", "-",
        ]).stderr.decode("utf-8", "replace")
        astats_log = run([
            "ffmpeg", "-hide_banner", "-i", str(args.video),
            "-af", "astats",
            "-f", "null", "-",
        ]).stderr.decode("utf-8", "replace")
        print("pcm onset", flush=True)
        stereo, sr = decode_pcm(args.video)
        clipped = int(np.sum(np.abs(stereo) >= 32767))
        silences = parse_silence(audio_log)
        energy = summarise_onsets(energy_onsets(stereo, sr, timeline["lines"], -35.0, args.audio_tol))
        silenced = summarise_onsets(silence_onsets(silences, info["duration"], timeline["lines"], args.audio_tol))
        if energy["pass"]:
            method, chosen, onset_pass = "energy", energy, True
        elif silenced["pass"]:
            method, chosen, onset_pass = "silencedetect", silenced, True
        else:
            method, chosen, onset_pass = "energy", energy, False
        onset = {
            "method": method,
            "threshold_s": args.audio_tol,
            "threshold_db": -35,
            "pass": onset_pass,
            "max_abs_delta": chosen["max_abs_delta"],
            "fail_count": chosen["fail_count"],
            "energy": {k: energy[k] for k in ("max_abs_delta", "fail_count", "pass")},
            "silencedetect": {k: silenced[k] for k in ("max_abs_delta", "fail_count", "pass")},
            "energy_sentences": energy["sentences"],
            "silencedetect_sentences": silenced["sentences"],
        }
        sync = sync_subtitles(cues, timeline["lines"], args.subtitle_tol)
        blacks = parse_black(black_log)
        black = {"params": {"d": 0.1, "pic_th": 0.98}, "segments": blacks, "pass": len(blacks) == 0}
        audio = {
            "ebur128": parse_ebur128(audio_log),
            "astats_peak_db": parse_astats_peak(astats_log),
            "clipped_samples": clipped,
            "sample_rate": sr,
            "channels": 2,
            "silence_db": -35,
            "silence_min_duration": 0.1,
            "silence_segments": silences,
            "onset": onset,
        }
        (out / "sync_report.json").write_text(json.dumps(sync, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (out / "black_frames.json").write_text(json.dumps(black, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (out / "audio_report.json").write_text(json.dumps(audio, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        passes = bool(sync["pass"] and onset["pass"] and black["pass"])
        write_report(out / "report.md", args.video, info, sync, audio, black, contact, scenes, passes)
        print(
            f"{'pass' if passes else 'fail'} sync={sync['pass']} onset={onset['pass']} "
            f"black={black['pass']} max_start={sync['max_abs_start_delta']} max_onset={onset['max_abs_delta']}"
        )
        return 0 if passes else 1
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
