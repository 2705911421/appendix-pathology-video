#!/workspace/venv_qa/bin/python
"""Measure a rendered credits frame against the brief: contrast, boxes, verbatim credits, blind strings."""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from build_credits_text import LICENSE, extract_music_lines, parse_ct

FONT = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
BODY = (0x4C, 0x45, 0x55)
SAFE = (90, 60, 1830, 950)


def lin(c: float) -> float:
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def contrast(a, b) -> float:
    def lum(rgb):
        r, g, b = (lin(float(v)) for v in rgb)
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
    l1, l2 = lum(a), lum(b)
    if l1 < l2:
        l1, l2 = l2, l1
    return (l1 + 0.05) / (l2 + 0.05)


def md5(path: Path) -> str:
    h = hashlib.md5()
    h.update(path.read_bytes())
    return h.hexdigest()


def items_of(report: dict) -> list[dict]:
    return [item for page in report["laid"] for item in page["items"]]


def check_layout(report: dict) -> dict:
    items = items_of(report)
    problems = list(report.get("problems") or [])
    min_gap = None
    min_ratio = None
    for page in report["laid"]:
        rows = page["items"]
        for a, b in zip(rows, rows[1:]):
            gap = b["y0"] - a["y1"]
            ratio = (b["y"] - a["y"]) / max(a["size"], b["size"])
            min_gap = gap if min_gap is None else min(min_gap, gap)
            min_ratio = ratio if min_ratio is None else min(min_ratio, ratio)
            if gap <= 0:
                problems.append(f"overlap {gap:.2f}")
            if ratio < 1.5 - 1e-3:
                problems.append(f"leading {ratio:.3f}")
    for item in items:
        if item["size"] < 36:
            problems.append(f"size {item['size']}")
        if item["role"] == "title" and (item["size"] < 44 or abs(item["y"] - 120) > 0.01):
            problems.append("title geometry")
        if item["x0"] < SAFE[0] or item["x1"] > SAFE[2] or item["y0"] < SAFE[1] or item["y1"] > SAFE[3]:
            problems.append(f"outside safe {item['text'][:24]} box=({item['x0']:.1f},{item['y0']:.1f},{item['x1']:.1f},{item['y1']:.1f})")
    sizes = sorted({item["size"] for item in items})
    return {
        "problems": problems,
        "min_gap_px": min_gap,
        "min_leading": min_ratio,
        "sizes": sizes,
        "min_size": min(sizes) if sizes else None,
        "pass": not problems,
    }


def sample_paper(img: Image.Image) -> list[int]:
    arr = np.asarray(img.convert("RGB"))
    patch = arr[:40, :40].reshape(-1, 3)
    med = np.median(patch, axis=0)
    return [int(v) for v in med]


def ink_bbox(img: Image.Image, paper: list[int]) -> list[int] | None:
    arr = np.asarray(img.convert("RGB")).astype(np.int16)
    delta = np.abs(arr - np.array(paper, dtype=np.int16)).sum(axis=2)
    mask = delta > 40
    ys, xs = np.nonzero(mask)
    if xs.size == 0:
        return None
    return [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]


def crop_200(img: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    x0, y0, x1, y1 = box
    crop = img.crop((x0, y0, x1, y1))
    return crop.resize((crop.width * 2, crop.height * 2), Image.Resampling.NEAREST)


def text_window(report: dict, page: int) -> tuple[int, int, int, int]:
    items = report["laid"][page]["items"]
    x0 = max(0, int(min(item["x0"] for item in items) - 24))
    y0 = max(0, int(min(item["y0"] for item in items) - 16))
    x1 = min(1920, int(max(item["x1"] for item in items) + 24))
    y1 = min(1080, int(max(item["y1"] for item in items) + 16))
    # Keep the local view readable: cap the source window, biased to the top of the block.
    if x1 - x0 > 860:
        cx = 960
        x0, x1 = cx - 430, cx + 430
    if y1 - y0 > 420:
        y1 = y0 + 420
    return x0, y0, x1, y1


def draw_caption(img: Image.Image, caption: str) -> Image.Image:
    face = ImageFont.truetype(FONT, 28)
    bar = 48
    out = Image.new("RGB", (img.width, img.height + bar), (28, 26, 32))
    out.paste(img, (0, 0))
    ImageDraw.Draw(out).text((16, img.height + 8), caption, fill=(232, 221, 233), font=face)
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Check credits layout JSON and keyframes.")
    parser.add_argument("--layout", type=Path, required=True)
    parser.add_argument("--layout-blind", type=Path, required=True)
    parser.add_argument("--p1", type=Path, required=True)
    parser.add_argument("--p2", type=Path, required=True)
    parser.add_argument("--blind-p1", type=Path, required=True)
    parser.add_argument("--p1-again", type=Path, required=True)
    parser.add_argument("--ref", type=Path, required=True)
    parser.add_argument("--ct", type=Path, required=True)
    parser.add_argument("--music", type=Path, required=True)
    parser.add_argument("--identity", type=Path, required=True)
    parser.add_argument("--text-json", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--sentence-end", type=float, default=None, help="Sentence 77 end, read by the caller from timeline.json.")
    args = parser.parse_args()

    report = json.loads(args.layout.read_text(encoding="utf-8"))
    blind = json.loads(args.layout_blind.read_text(encoding="utf-8"))
    text = json.loads(args.text_json.read_text(encoding="utf-8"))
    identity = json.loads(args.identity.read_text(encoding="utf-8"))
    pairs = parse_ct(args.ct.read_text(encoding="utf-8"))
    music_lines = extract_music_lines(args.music.read_text(encoding="utf-8"))
    problems = []
    layout = check_layout(report)
    problems.extend(f"layout: {p}" for p in layout["problems"])
    blind_layout = check_layout(blind)
    problems.extend(f"blind layout: {p}" for p in blind_layout["problems"])

    got = text["ct"]["items"]
    ct_diff = 0
    if len(got) != len(pairs):
        ct_diff = abs(len(got) - len(pairs))
    else:
        for a, b in zip(got, pairs):
            if a["zh"] != b["zh"]:
                ct_diff += 1
            if a["en"] != b["en"]:
                ct_diff += 1
    if ct_diff:
        problems.append(f"ct diff {ct_diff}")
    drawn_ct = [item["text"] for item in items_of(report) if item["role"] == "ct"]
    expected_ct = [line for pair in pairs for line in (pair["zh"], pair["en"])]
    if drawn_ct != expected_ct:
        problems.append("drawn CT lines differ from credits.md")
    music_drawn = []
    for item in items_of(report):
        if item["role"] != "music":
            continue
        src = item.get("source") or item["text"]
        piece = item["text"]
        if music_drawn and music_drawn[-1][0] == src:
            music_drawn[-1][1].append(piece)
        else:
            music_drawn.append((src, [piece]))
    music_rendered = ["".join(parts) for _, parts in music_drawn]
    if music_rendered != music_lines or text["music"]["lines"] != music_lines:
        problems.append("music credit mismatch")
    for src, parts in music_drawn:
        if "".join(parts) != src:
            problems.append("wrapped music line does not concatenate to its source")
    if text["ct"]["license"] != LICENSE:
        problems.append("license line mismatch")
    if any(item["text"] != LICENSE for item in items_of(report) if item["role"] == "license"):
        problems.append("drawn license mismatch")

    blob = json.dumps(text, ensure_ascii=False) + "\n" + "\n".join(report.get("strings") or []) + "\n" + "\n".join(blind.get("strings") or [])
    forbidden = ["三峡"]
    for key in ("team", "school", "name"):
        value = (identity.get(key) or "").strip()
        if value:
            forbidden.append(value)
    hits = [word for word in forbidden if word and word in blob]
    if hits:
        problems.append(f"forbidden strings {hits}")
    if report.get("blind"):
        problems.append("non-blind layout was rendered blind")
    if not blind.get("blind"):
        problems.append("blind layout was not blind")
    if (report.get("strings") or []) != (blind.get("strings") or []):
        # Empty identity must make the two string lists identical.
        empty = not any((identity.get(k) or "").strip() for k in ("team", "school", "name"))
        if empty:
            problems.append("blind and open string lists differ while identity is empty")

    p1 = Image.open(args.p1).convert("RGB")
    p2 = Image.open(args.p2).convert("RGB")
    bp = Image.open(args.blind_p1).convert("RGB")
    again = Image.open(args.p1_again).convert("RGB")
    ref = Image.open(args.ref).convert("RGB")
    for name, img in (("p1", p1), ("p2", p2), ("blind", bp)):
        if img.size != (1920, 1080):
            problems.append(f"{name} size {img.size}")
    paper = sample_paper(p1)
    if paper != [244, 239, 230]:
        problems.append(f"paper median {paper}")
    ratio = contrast(BODY, paper)
    if ratio < 4.5:
        problems.append(f"contrast {ratio:.3f}")
    for name, img in (("p1", p1), ("p2", p2), ("blind", bp)):
        box = ink_bbox(img, paper)
        if box is None:
            problems.append(f"{name} has no text pixels")
            continue
        if box[0] < SAFE[0] or box[1] < SAFE[1] or box[2] > SAFE[2] or box[3] > SAFE[3]:
            problems.append(f"{name} ink bbox {box} outside safe")
    same = md5(args.p1) == md5(args.p1_again)
    if not same:
        problems.append("two renders of p1 differ")
    blind_same = md5(args.p1) == md5(args.blind_p1)
    empty_identity = not any((identity.get(k) or "").strip() for k in ("team", "school", "name"))
    if empty_identity and not blind_same:
        problems.append("blind frame differs from open frame while identity is empty")

    out = args.out
    out.mkdir(parents=True, exist_ok=True)
    p1.save(out / "credits_p1.png")
    p2.save(out / "credits_p2.png")
    bp.save(out / "credits_blind_p1.png")
    w1 = text_window(report, 0)
    w2 = text_window(report, 1 if len(report["laid"]) > 1 else 0)
    crop_200(p1, w1).save(out / "credits_p1_200pct.png")
    crop_200(p2, w2).save(out / "credits_p2_200pct.png")
    crop_200(bp, w1).save(out / "credits_blind_p1_200pct.png")

    ref_box = (60, 80, 540, 380)
    left = crop_200(ref, ref_box)
    right = crop_200(p1, ref_box)
    pair = Image.new("RGB", (left.width + right.width + 16, left.height), (28, 26, 32))
    pair.paste(left, (0, 0))
    pair.paste(right, (left.width + 16, 0))
    end = "" if args.sentence_end is None else f"句77 end={args.sentence_end:.2f}s 之后"
    draw_caption(pair, f"左 S06 s23_red 200%  右片尾同坐标 200%  纸色 {paper}  {end}").save(out / "compare_vs_ref_200pct.png")

    sheet_w = 640
    tiles = []
    caps = [
        f"页1 t=3.50s 声明与致谢 {end}",
        "页2 t=10.50s CT 署名与许可",
        "盲审页1 t=3.50s identity 为空，与非盲审相同",
    ]
    for img, cap in ((p1, caps[0]), (p2, caps[1]), (bp, caps[2])):
        thumb = img.resize((sheet_w, int(sheet_w * 1080 / 1920)), Image.Resampling.LANCZOS)
        tiles.append(draw_caption(thumb, cap))
    sheet = Image.new("RGB", (sheet_w, sum(t.height for t in tiles) + 16), (28, 26, 32))
    y = 8
    for tile in tiles:
        sheet.paste(tile, (0, y))
        y += tile.height
    sheet.save(out / "review_sheet.png")

    metrics = {
        "paper_rgb": paper,
        "body_hex": "#4C4555",
        "contrast_body_on_paper": ratio,
        "min_gap_px": layout["min_gap_px"],
        "min_leading": layout["min_leading"],
        "font_sizes": layout["sizes"],
        "ct_diff": ct_diff,
        "music_match": music_rendered == music_lines,
        "blind_forbidden_hits": hits,
        "p1_md5": md5(args.p1),
        "p1_again_md5": md5(args.p1_again),
        "md5_match": same,
        "blind_md5": md5(args.blind_p1),
        "blind_matches_open": blind_same,
        "ink_boxes": {
            "p1": ink_bbox(p1, paper),
            "p2": ink_bbox(p2, paper),
            "blind": ink_bbox(bp, paper),
        },
        "layout_problems": problems,
        "pass": not problems,
    }
    (out / "metrics_credits.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: metrics[k] for k in ("pass", "contrast_body_on_paper", "min_gap_px", "min_leading", "ct_diff", "md5_match", "paper_rgb", "font_sizes")}, ensure_ascii=False))
    if problems:
        print("\n".join(problems), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
