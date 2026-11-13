#!/workspace/venv_qa/bin/python
"""Build film/lib_ext/credits_text.json from the CT and music source files.

The music credit is read at assembly time. Prefer
/workspace/病理科普视频/music/来源与授权.md when that file exists; otherwise use
the Clean Soul sentence in 配乐授权说明.md. Re-run this script before a final
assemble so the on-screen sentence tracks the latest file.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CT_DEFAULT = Path("/workspace/病理科普视频/v5_ct_dev/qa/v6/ct_real/credits.md")
MUSIC_PREFERRED = Path("/workspace/病理科普视频/music/来源与授权.md")
MUSIC_FALLBACK = Path("/workspace/病理科普视频/music/配乐授权说明.md")
LICENSE = "CT 图像许可：CC BY-NC-SA 3.0（https://creativecommons.org/licenses/by-nc-sa/3.0/）"

AI_LINES = [
    {
        "text": "旁白由 AI 语音合成生成。",
        "evidence": "配音/全稿_v3/TASK.md",
        "verified": True,
    },
    {
        "text": "画面由人工设计分镜，借助 AI 编程工具编写代码生成。",
        "evidence": "分镜/分镜_v1.md; film/chapters/; /workspace/病理科普视频/lane_briefs/",
        "verified": True,
    },
    {
        "text": "CT 图像为真实公开病例图，仅做裁切、缩放与标注。",
        "evidence": "/workspace/病理科普视频/ct_real/来源与授权.md",
        "verified": True,
    },
    {
        "text": "配乐为授权曲目。",
        "evidence": "/workspace/病理科普视频/music/来源与授权.md",
        "verified": True,
    },
]


def parse_ct(text: str) -> list[dict]:
    rows = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or stripped.startswith("http"):
            continue
        rows.append(stripped)
    if len(rows) != 8:
        raise SystemExit(f"credits.md: expected 8 credit lines, found {len(rows)}")
    return [{"zh": rows[i], "en": rows[i + 1]} for i in range(0, 8, 2)]


def extract_music_lines(text: str) -> list[str]:
    """On-screen music credit, verbatim.

    来源与授权.md publishes a fenced 「片尾署名格式」 block. Every non-empty line
    inside those fences is used in order. The short 配乐授权说明.md fallback has
    a single 「署名文本」 sentence.
    """
    if "片尾署名格式" in text:
        lines = []
        capture = False
        in_fence = False
        for line in text.splitlines():
            if "片尾署名格式" in line:
                capture = True
                continue
            if not capture:
                continue
            if line.startswith("## "):
                break
            if line.strip().startswith("```"):
                in_fence = not in_fence
                continue
            if in_fence and line.strip():
                lines.append(line.strip())
        if lines:
            return lines
    for line in text.splitlines():
        for sep in ("署名文本：", "署名文本:"):
            if sep in line:
                credit = line.split(sep, 1)[1].strip()
                if credit:
                    return [credit]
    raise SystemExit("music source has no credit sentence")


def build(ct_path: Path, music_path: Path) -> dict:
    pairs = parse_ct(ct_path.read_text(encoding="utf-8"))
    music_lines = extract_music_lines(music_path.read_text(encoding="utf-8"))
    preferred_present = MUSIC_PREFERRED.is_file()
    return {
        "paper": {
            "hex": "#F4EFE6",
            "rgb": [244, 239, 230],
            "sample": "qa/v6/h02_s06/s23_red.png median of the paper field",
        },
        "title": "声明与致谢",
        "ai": AI_LINES,
        "original": {
            "text": "分镜与画面为原创设计，由代码绘制。",
            "evidence": "分镜/分镜_v1.md; film/chapters/",
            "verified": True,
        },
        "music": {
            "lines": music_lines,
            "credit": "\n".join(music_lines),
            "source_file": str(music_path),
            "preferred_file": str(MUSIC_PREFERRED),
            "preferred_present": preferred_present,
            "note": "装配时重新运行 assembly/build_credits_text.py。来源与授权.md 的「片尾署名格式」代码块按原文逐行上屏；该文件不存在时才回退到配乐授权说明.md 的署名文本。",
            "verified": True,
            "evidence": str(music_path),
        },
        "ct": {
            "items": pairs,
            "license": LICENSE,
            "source_file": str(ct_path),
        },
    }


def dumps(data: dict) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Rebuild credits_text.json from CT and music sources.")
    parser.add_argument("--ct", type=Path, default=CT_DEFAULT)
    parser.add_argument("--music", type=Path, default=None, help="Override the music credit file.")
    parser.add_argument("--check", action="store_true", help="Compare the existing JSON to the sources and exit 1 on drift.")
    args = parser.parse_args()
    music = args.music or (MUSIC_PREFERRED if MUSIC_PREFERRED.is_file() else MUSIC_FALLBACK)
    if not args.ct.is_file():
        print(f"missing CT credits: {args.ct}", file=sys.stderr)
        return 1
    if not music.is_file():
        print(f"missing music credit file: {music}", file=sys.stderr)
        return 1
    data = build(args.ct, music)
    text = dumps(data)
    targets = [
        ROOT / "film/lib_ext/credits_text.json",
        ROOT / "qa/v6/final_credits_qa/credits_text.json",
    ]
    if args.check:
        drift = False
        for path in targets:
            if not path.is_file() or path.read_text(encoding="utf-8") != text:
                print(f"drift: {path}", file=sys.stderr)
                drift = True
        return 1 if drift else 0
    for path in targets:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        print(path)
    identity = ROOT / "film/lib_ext/credits_identity.json"
    if not identity.exists():
        identity.write_text(dumps({"team": "", "school": "", "name": ""}), encoding="utf-8")
        print(identity)
    return 0


if __name__ == "__main__":
    sys.exit(main())
