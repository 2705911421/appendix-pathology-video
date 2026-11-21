import argparse
from collections import defaultdict
import json
import os
from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
KEY_SHOTS = {
    "target", "mucosa", "cells", "serosa", "simple", "phlegmon", "doctor",
    "ct0", "ct1", "ct2", "lymph", "elective", "credits",
}
REVIEW_TIMES = (48, 64, 76, 136, 152, 184, 208, 212, 220, 224, 226, 288, 294)


def timecode(frame, fps):
    seconds, remainder = divmod(frame, fps)
    return f"{seconds // 60:02d}:{seconds % 60:02d}:{remainder:02d}"


def selection(timeline):
    fps = timeline["fps"]
    end = timeline["frames"]
    cues = timeline["cues"]
    cuts = [cue for i, cue in enumerate(cues)
            if not i or (cue["act"], cue["shot"]) != (cues[i - 1]["act"], cues[i - 1]["shot"])]
    cuts += [dict(act=8, shot="credits", startFrame=timeline["creditsFrame"])]
    frames = defaultdict(list)
    for frame in range(0, end, 5 * fps):
        frames[frame].append("5s")
    for seconds in REVIEW_TIMES:
        if seconds * fps < end:
            frames[seconds * fps].append("review")
    for cue in cues:
        if any(word in cue["en"] for word in ("McBurney's", "guideline's", "Don't")):
            frames[cue["startFrame"] + cue["audioFrames"] // 2].append("apostrophe")
        if cue["shot"] == "recover":
            for i, fraction in enumerate((.05, .24, .43, .59)):
                frames[cue["startFrame"] + round(cue["audioFrames"] * fraction + .38 * fps)].append(f"swatch-{i+1}")
    for i, cue in enumerate(cuts):
        start = cue["startFrame"]
        following = cuts[i + 1]["startFrame"] if i + 1 < len(cuts) else end
        if start:
            frames[start - 1].append("before")
        frames[start].append("cut")
        frames[min(following - 1, start + fps // 2)].append("settled")
        if cue["shot"] in KEY_SHOTS:
            frames[(start + following) // 2].append("detail")
    frames[end - 1].append("last")
    current = 0
    for index, (frame, labels) in enumerate(sorted(frames.items())):
        while current + 1 < len(cuts) and frame >= cuts[current + 1]["startFrame"]:
            current += 1
        cue = cuts[current]
        yield dict(file=f"frame-{index:03d}.png", frame=frame, time=timecode(frame, fps),
                   act=cue["act"], shot=cue["shot"], reasons=labels)


def sheets(directory, selected):
    padding = 12
    columns = 4
    card = 428
    photo_h = 240
    row_h = photo_h + 26
    font_name = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / "segoeuib.ttf"
    font = ImageFont.truetype(str(font_name), 15) if font_name.is_file() else ImageFont.load_default()
    counts = defaultdict(list)
    for item in selected:
        counts[item["act"]].append(item)
    for act, rows in sorted(counts.items()):
        for page, base in enumerate(range(0, len(rows), 24), 1):
            items = rows[base:base + 24]
            image = Image.new("RGB", (padding + (card + padding) * columns,
                                      padding + ((len(items) + columns - 1) // columns) * (row_h + padding)),
                              "#ede4db")
            draw = ImageDraw.Draw(image)
            for i, item in enumerate(items):
                x = padding + i % columns * (card + padding)
                y = padding + i // columns * (row_h + padding)
                with Image.open(directory / item["file"]) as original:
                    image.paste(original.convert("RGB").resize((card, photo_h), Image.Resampling.LANCZOS), (x, y))
                    if "detail" in item["reasons"]:
                        original.resize((640, 360), Image.Resampling.LANCZOS).save(
                            directory / f"phone-{act}-{item['shot']}.png")
                draw.text((x + 3, y + photo_h + 3),
                          f"{item['time']}  {item['shot']}  {', '.join(item['reasons'])}",
                          font=font, fill="#593a3f")
            image.save(directory / f"sheet-{act}-{page}.jpg", quality=92)


def filter_tree(frames):
    if len(frames) == 1:
        return f"eq(n\\,{frames[0]})"
    mid = len(frames) // 2
    return f"if(lt(n\\,{frames[mid]})\\,{filter_tree(frames[:mid])}\\,{filter_tree(frames[mid:])})"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pass_name", choices=("baseline", "final"))
    args = parser.parse_args()
    timeline = json.loads((ROOT / "film/timeline.json").read_text(encoding="utf-8"))
    selected = list(selection(timeline))
    directory = ROOT / "_audit_frames" / args.pass_name
    directory.mkdir(parents=True, exist_ok=True)
    expression = filter_tree([item["frame"] for item in selected])
    subprocess.run([
        os.environ.get("FFMPEG_PATH", "ffmpeg"), "-hide_banner", "-v", "error", "-xerror", "-y",
        "-i", str(ROOT / "out/submission.mp4"), "-vf", f"select={expression}", "-fps_mode", "vfr",
        "-threads:v", "2", "-start_number", "0", str(directory / "frame-%03d.png"),
    ], check=True)
    files = sorted(directory.glob("frame-*.png"))
    if len(files) != len(selected):
        raise ValueError(f"Expected {len(selected)} decoded frames, got {len(files)}")
    for file in files:
        with Image.open(file) as result:
            if result.size != (1920, 1080):
                raise ValueError(f"Unexpected output size in {file.name}: {result.size}")
    (directory / "manifest.json").write_text(json.dumps(selected, indent=2) + "\n", encoding="utf-8")
    sheets(directory, selected)
    print(f"{args.pass_name}: {len(files)} full-resolution PNGs, "
          f"{sum('cut' in item['reasons'] for item in selected)} cuts")


if __name__ == "__main__":
    main()
