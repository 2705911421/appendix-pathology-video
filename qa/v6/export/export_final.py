#!/usr/bin/env python3
"""Export a 1080p master and a metadata-free blind-review copy.

The blind file is a bitexact remux of the master: same decoded frames and
the same decoded audio samples, with container metadata removed.

Example:
  python3 qa/v6/export/export_final.py \\
    --video /path/picture_and_voice.mp4 \\
    --music /path/music.wav \\
    --credits /path/credits_12s.mp4 \\
    --out /path/out
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

THREADS = "2"
WIDTH = 1920
HEIGHT = 1080
FPS = 30
CRF = "18"
AUDIO_RATE = 48000
AUDIO_BITRATE = "192k"
AUDIO_BITRATE_BPS = 192000
SAMPLES_PER_FRAME = AUDIO_RATE // FPS  # 1600, exact at 30 fps / 48 kHz
CREDITS_SECONDS = 12
CREDITS_FRAMES = CREDITS_SECONDS * FPS
I_TARGET = -16.0
TP_TARGET = -1.5
LRA_TARGET = 11.0
I_TOL = 0.5

# Identity strings that must not survive in the blind file.
# The brief lists Gisele / 三峡 / Sharpton / CTGU / mini and says 等.
PERSONAL_STRINGS = (
    "Gisele",
    "gisele",
    "三峡",
    "Sharpton",
    "sharpton",
    "CTGU",
    "ctgu",
    "mini",
    "导师",
    "指导",
)
PERSONAL_BYTES = tuple(s.encode("utf-8") for s in PERSONAL_STRINGS)

# ffprobe tag keys that are not allowed on the blind file.
# "encoder" is allowed only when it is a codec version string.
FORBIDDEN_TAG_KEYS = {
    "title",
    "artist",
    "author",
    "comment",
    "copyright",
    "creation_time",
    "location",
    "encoded_by",
    "description",
    "synopsis",
    "album",
    "album_artist",
    "composer",
    "genre",
    "publisher",
    "date",
    "year",
    "show",
    "episode_id",
    "network",
    "performer",
    "track",
    "grouping",
    "comment-eng",
    "copyright-eng",
    "title-eng",
    "artist-eng",
}
ENCODER_VERSION_RE = re.compile(
    r"^(lavc|lavf|x264|libx264|aac|h\.?264)\b",
    re.IGNORECASE,
)

MASTER_NAME = "成片_1080p.mp4"
BLIND_NAME = "成片_盲审版.mp4"
VERIFY_NAME = "verify.json"


class ExportError(RuntimeError):
    pass


def run_ffmpeg(cmd: list[str], log_path: Path) -> str:
    """Run one ffmpeg/ffprobe process. Never overlaps another encode."""
    log_path.parent.mkdir(parents=True, exist_ok=True)
    text_cmd = " ".join(_quote(c) for c in cmd)
    print(f"\n$ {text_cmd}", flush=True)
    with log_path.open("a", encoding="utf-8") as log:
        log.write(f"\n$ {text_cmd}\n")
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        out = proc.stdout.decode("utf-8", "replace")
        err = proc.stderr.decode("utf-8", "replace")
        log.write(out)
        log.write(err)
    if proc.returncode != 0:
        tail = (err or out)[-4000:]
        raise ExportError(f"command failed ({proc.returncode}): {text_cmd}\n{tail}")
    return err + out


def _quote(text: str) -> str:
    if not text or any(ch.isspace() for ch in text):
        return "'" + text.replace("'", "'\\''") + "'"
    return text


def probe(path: Path) -> dict:
    cmd = [
        "ffprobe",
        "-hide_banner",
        "-loglevel",
        "error",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        "-show_chapters",
        str(path),
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if proc.returncode != 0:
        raise ExportError(proc.stderr.decode("utf-8", "replace")[-2000:])
    return json.loads(proc.stdout.decode("utf-8"))


def stream_of(info: dict, codec_type: str) -> dict:
    for stream in info.get("streams") or []:
        if stream.get("codec_type") == codec_type:
            return stream
    raise ExportError(f"no {codec_type} stream")


def parse_rate(text: str) -> float:
    if not text or text == "0/0":
        return 0.0
    if "/" in text:
        num, den = text.split("/", 1)
        den_f = float(den)
        if den_f == 0:
            return 0.0
        return float(num) / den_f
    return float(text)


def parse_loudnorm(text: str) -> dict:
    matches = list(
        re.finditer(r"\{[^{}]*\"input_i\"\s*:[^{}]*\}", text, flags=re.DOTALL)
    )
    if not matches:
        raise ExportError("loudnorm JSON missing\n" + text[-2000:])
    raw = json.loads(matches[-1].group(0))
    out = {}
    for key in (
        "input_i",
        "input_tp",
        "input_lra",
        "input_thresh",
        "output_i",
        "output_tp",
        "output_lra",
        "output_thresh",
        "target_offset",
        "normalization_type",
    ):
        if key in raw:
            value = raw[key]
            if key == "normalization_type":
                out[key] = value
            else:
                try:
                    out[key] = float(value)
                except (TypeError, ValueError):
                    out[key] = value
    return out


def loudnorm_filter(measured: dict | None, linear: bool) -> str:
    base = f"loudnorm=I={I_TARGET}:TP={TP_TARGET}:LRA={LRA_TARGET}"
    if measured is None:
        return base + ":print_format=json"
    mode = "true" if linear else "false"
    return (
        base
        + f":measured_I={measured['input_i']}"
        + f":measured_TP={measured['input_tp']}"
        + f":measured_LRA={measured['input_lra']}"
        + f":measured_thresh={measured['input_thresh']}"
        + f":offset={measured['target_offset']}"
        + f":linear={mode}"
    )


def audio_chain(end_sample: int, whole_dur: str) -> str:
    # apad then atrim so a short music bed does not end the mix early.
    # normalize is applied later by loudnorm, not by amix.
    return (
        "aresample=48000,"
        "aformat=sample_fmts=fltp:channel_layouts=stereo,"
        f"apad=whole_dur={whole_dur},"
        f"atrim=end_sample={end_sample},"
        "asetpts=PTS-STARTPTS"
    )


def audio_filtergraph(
    end_sample: int,
    whole_dur: str,
    has_music: bool,
    music_index: int,
    measured: dict | None,
    linear: bool,
) -> str:
    parts = [f"[0:a]{audio_chain(end_sample, whole_dur)}[voice]"]
    if has_music:
        parts.append(f"[{music_index}:a]{audio_chain(end_sample, whole_dur)}[bed]")
        # normalize=0 keeps the ducked music at its authored level.
        parts.append(
            "[voice][bed]amix=inputs=2:duration=first:"
            "dropout_transition=0:normalize=0[mix]"
        )
        src = "[mix]"
    else:
        src = "[voice]"
    parts.append(f"{src}{loudnorm_filter(measured, linear)}[aout]")
    return ";".join(parts)


def video_prep(end_frame: int | None, already_cfr_1080: bool) -> str:
    if already_cfr_1080:
        steps = ["setsar=1", "format=yuv420p", "setpts=PTS-STARTPTS"]
    else:
        steps = [
            f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease:flags=lanczos",
            f"pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black",
            "setsar=1",
            f"fps={FPS}",
            "format=yuv420p",
            "setpts=PTS-STARTPTS",
        ]
    if end_frame is not None:
        steps.append(f"trim=end_frame={end_frame}")
        steps.append("setpts=PTS-STARTPTS")
    return ",".join(steps)


def is_cfr_1080(stream: dict) -> bool:
    fps = parse_rate(str(stream.get("avg_frame_rate") or ""))
    sar = stream.get("sample_aspect_ratio") or "1:1"
    return (
        int(stream.get("width") or 0) == WIDTH
        and int(stream.get("height") or 0) == HEIGHT
        and stream.get("pix_fmt") == "yuv420p"
        and abs(fps - FPS) < 0.01
        and sar in ("1:1", "1")
    )


def expected_frames(stream: dict, duration: float) -> int:
    nb = stream.get("nb_frames")
    fps = parse_rate(str(stream.get("avg_frame_rate") or ""))
    if nb and str(nb).isdigit() and abs(fps - FPS) < 0.01:
        return int(nb)
    if duration <= 0:
        raise ExportError("video duration is missing")
    return int(round(duration * FPS))


def measure_loudness(path: Path, log_path: Path) -> dict:
    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-nostdin",
        "-threads",
        THREADS,
        "-i",
        str(path),
        "-map",
        "0:a:0",
        "-af",
        f"loudnorm=I={I_TARGET}:TP={TP_TARGET}:LRA={LRA_TARGET}:print_format=json",
        "-f",
        "null",
        "-",
    ]
    text = run_ffmpeg(cmd, log_path)
    return parse_loudnorm(text)


def build_normalized_wav(
    video: Path,
    music: Path | None,
    end_sample: int,
    whole_dur: str,
    wav_path: Path,
    log_path: Path,
) -> dict:
    has_music = music is not None
    analyze = [
        "ffmpeg",
        "-hide_banner",
        "-nostdin",
        "-threads",
        THREADS,
        "-i",
        str(video),
    ]
    if has_music:
        analyze += ["-i", str(music)]
    analyze += [
        "-filter_complex",
        audio_filtergraph(end_sample, whole_dur, has_music, 1, None, True),
        "-map",
        "[aout]",
        "-f",
        "null",
        "-",
    ]
    measured = parse_loudnorm(run_ffmpeg(analyze, log_path))
    for key in ("input_i", "input_tp", "input_lra", "input_thresh", "target_offset"):
        if key not in measured:
            raise ExportError(f"loudnorm pass 1 missing {key}: {measured}")

    def render(linear: bool) -> None:
        cmd = [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-nostdin",
            "-threads",
            THREADS,
            "-i",
            str(video),
        ]
        if has_music:
            cmd += ["-i", str(music)]
        cmd += [
            "-filter_complex",
            audio_filtergraph(end_sample, whole_dur, has_music, 1, measured, linear),
            "-map",
            "[aout]",
            "-c:a",
            "pcm_s24le",
            "-ar",
            str(AUDIO_RATE),
            "-ac",
            "2",
            str(wav_path),
        ]
        run_ffmpeg(cmd, log_path)

    render(linear=True)
    wav_measured = measure_loudness(wav_path, log_path)
    linear_used = True
    if not loudness_ok(wav_measured):
        render(linear=False)
        wav_measured = measure_loudness(wav_path, log_path)
        linear_used = False
    return {
        "pass1": measured,
        "pcm": {
            "I": wav_measured.get("input_i"),
            "TP": wav_measured.get("input_tp"),
            "LRA": wav_measured.get("input_lra"),
        },
        "linear": linear_used,
    }


def loudness_ok(measured: dict) -> bool:
    integrated = float(measured["input_i"])
    true_peak = float(measured["input_tp"])
    return abs(integrated - I_TARGET) <= I_TOL and true_peak <= TP_TARGET + 1e-3


def apply_gain(wav_in: Path, wav_out: Path, gain_db: float, log_path: Path) -> None:
    cmd = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-nostdin",
        "-threads",
        THREADS,
        "-i",
        str(wav_in),
        "-af",
        f"volume={gain_db:.4f}dB",
        "-c:a",
        "pcm_s24le",
        "-ar",
        str(AUDIO_RATE),
        "-ac",
        "2",
        str(wav_out),
    ]
    run_ffmpeg(cmd, log_path)


def encode_aac(wav_path: Path, m4a_path: Path, log_path: Path) -> None:
    cmd = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-nostdin",
        "-threads",
        THREADS,
        "-i",
        str(wav_path),
        "-c:a",
        "aac",
        "-b:a",
        AUDIO_BITRATE,
        "-ar",
        str(AUDIO_RATE),
        "-ac",
        "2",
        "-map_metadata",
        "-1",
        str(m4a_path),
    ]
    run_ffmpeg(cmd, log_path)


def video_filtergraph(main_cfr: bool, keep_frames: int | None) -> str:
    if keep_frames is None:
        return "[0:v]" + video_prep(None, main_cfr) + "[v]"
    main = "[0:v]" + video_prep(keep_frames, main_cfr) + "[vmain]"
    # Credits are normalized even when they are already 1080p30, then cut
    # to exactly 12 s so a longer slate cannot change the programme length.
    credits = "[1:v]" + video_prep(CREDITS_FRAMES, False) + "[vcred]"
    concat = (
        "[vmain][vcred]concat=n=2:v=1:a=0,format=yuv420p,setsar=1[v]"
    )
    return ";".join([main, credits, concat])


def encode_video(
    video: Path,
    credits: Path | None,
    keep_frames: int | None,
    main_cfr: bool,
    video_only: Path,
    log_path: Path,
    x264_extra: str,
) -> None:
    cmd = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-nostdin",
        "-threads",
        THREADS,
        "-i",
        str(video),
    ]
    if credits is not None:
        cmd += ["-i", str(credits)]
    cmd += [
        "-filter_complex",
        video_filtergraph(main_cfr, keep_frames),
        "-map",
        "[v]",
        "-an",
        "-c:v",
        "libx264",
        "-profile:v",
        "high",
        "-pix_fmt",
        "yuv420p",
        "-crf",
        CRF,
        "-preset",
        "medium",
        "-r",
        str(FPS),
        "-fps_mode",
        "cfr",
        "-x264-params",
        x264_extra,
        "-map_metadata",
        "-1",
        "-map_chapters",
        "-1",
        "-movflags",
        "+faststart",
        str(video_only),
    ]
    run_ffmpeg(cmd, log_path)


def mux_master(video_only: Path, audio_m4a: Path, master: Path, log_path: Path) -> None:
    cmd = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-nostdin",
        "-threads",
        THREADS,
        "-i",
        str(video_only),
        "-i",
        str(audio_m4a),
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c",
        "copy",
        "-map_metadata",
        "-1",
        "-map_chapters",
        "-1",
        "-movflags",
        "+faststart",
        str(master),
    ]
    run_ffmpeg(cmd, log_path)


def remux_blind(master: Path, blind: Path, log_path: Path) -> None:
    # Stream copy keeps decoded frames and samples identical to the master.
    # bitexact + map_metadata -1 drops container tags. SEI NAL type 6 is
    # encoder metadata, not picture data; removing it does not change pixels.
    cmd = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-nostdin",
        "-threads",
        THREADS,
        "-i",
        str(master),
        "-map",
        "0:v:0",
        "-map",
        "0:a:0",
        "-c",
        "copy",
        "-map_metadata",
        "-1",
        "-map_chapters",
        "-1",
        "-fflags",
        "+bitexact",
        "-flags:v",
        "+bitexact",
        "-flags:a",
        "+bitexact",
        "-bsf:v",
        "filter_units=remove_types=6",
        "-movflags",
        "+faststart",
        str(blind),
    ]
    run_ffmpeg(cmd, log_path)


def iter_boxes(data: bytearray | bytes, start: int, end: int):
    pos = start
    while pos + 8 <= end:
        size = int.from_bytes(data[pos : pos + 4], "big")
        typ = bytes(data[pos + 4 : pos + 8])
        header = 8
        if size == 1:
            if pos + 16 > end:
                return
            size = int.from_bytes(data[pos + 8 : pos + 16], "big")
            header = 16
        elif size == 0:
            size = end - pos
        if size < header or pos + size > end:
            return
        yield pos, size, header, typ
        pos += size


def mdat_payloads(data: bytes) -> list[bytes]:
    payloads = []
    for pos, size, header, typ in iter_boxes(data, 0, len(data)):
        if typ == b"mdat":
            payloads.append(bytes(data[pos + header : pos + size]))
    return payloads


def clear_hdlr_name(data: bytearray, pos: int, size: int, header: int) -> None:
    if header != 8 or size < 33:
        return
    name_off = pos + 32
    raw = bytes(data[name_off : pos + size])
    name = raw.split(b"\x00", 1)[0]
    personal = any(needle in raw for needle in PERSONAL_BYTES)
    if name in (b"VideoHandler", b"SoundHandler") or personal:
        for index in range(name_off, pos + size):
            data[index] = 0


def clear_stsd(data: bytearray, pos: int, size: int, header: int) -> None:
    cursor = pos + header + 8
    end = pos + size
    while cursor + 8 <= end:
        entry_size = int.from_bytes(data[cursor : cursor + 4], "big")
        entry_type = bytes(data[cursor + 4 : cursor + 8])
        if entry_size < 8 or cursor + entry_size > end:
            return
        if entry_type in (b"avc1", b"avc3") and entry_size >= 82:
            if bytes(data[cursor + 8 : cursor + 14]) == b"\x00" * 6:
                name = cursor + 50
                data[name : name + 32] = b"\x00" * 32
        cursor += entry_size


def zero_needles(data: bytearray, start: int, end: int) -> list[str]:
    hits = []
    blob = bytes(data[start:end])
    for needle in PERSONAL_BYTES:
        index = 0
        while True:
            found = blob.find(needle, index)
            if found < 0:
                break
            absolute = start + found
            hits.append(needle.decode("utf-8"))
            for offset in range(len(needle)):
                data[absolute + offset] = 0
            index = found + len(needle)
    return hits


def scrub_blind_container(path: Path) -> dict:
    """Clear handler and compressor names inside moov. Do not touch mdat."""
    original = path.read_bytes()
    data = bytearray(original)
    before = mdat_payloads(data)
    cleared_udta: list[str] = []

    def walk(start: int, end: int) -> None:
        for pos, size, header, typ in list(iter_boxes(data, start, end)):
            body = pos + header
            box_end = pos + size
            if typ == b"hdlr":
                clear_hdlr_name(data, pos, size, header)
            elif typ == b"stsd":
                clear_stsd(data, pos, size, header)
            elif typ == b"udta":
                cleared_udta.extend(zero_needles(data, body, box_end))
            elif typ in (b"moov", b"trak", b"mdia", b"minf", b"stbl", b"edts", b"meta"):
                walk(body, box_end)

    for pos, size, header, typ in list(iter_boxes(data, 0, len(data))):
        if typ == b"moov":
            walk(pos + header, pos + size)
    after = mdat_payloads(data)
    if before != after:
        raise ExportError("container scrub changed media data")
    path.write_bytes(data)
    return {"udta_strings_cleared": cleared_udta}


def decoded_md5(path: Path, kind: str, log_path: Path) -> str:
    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-nostdin",
        "-threads",
        THREADS,
        "-i",
        str(path),
    ]
    if kind == "video":
        cmd += ["-map", "0:v:0", "-f", "hash", "-hash", "md5", "-"]
    else:
        cmd += [
            "-map",
            "0:a:0",
            "-c:a",
            "pcm_s16le",
            "-f",
            "hash",
            "-hash",
            "md5",
            "-",
        ]
    text = run_ffmpeg(cmd, log_path)
    match = re.search(r"MD5=([0-9a-fA-F]+)", text)
    if not match:
        raise ExportError(f"md5 missing for {kind}: {text[-1000:]}")
    return match.group(1).lower()


def faststart_ok(path: Path) -> bool:
    data = path.read_bytes()
    atoms = []
    for pos, size, header, typ in iter_boxes(data, 0, len(data)):
        atoms.append(typ)
        if len(atoms) >= 4:
            break
    if b"mdat" not in atoms or b"moov" not in atoms:
        return False
    return atoms.index(b"moov") < atoms.index(b"mdat")


def find_byte_hits(path: Path) -> list[dict]:
    data = path.read_bytes()
    hits = []
    for needle in PERSONAL_BYTES:
        index = 0
        while True:
            found = data.find(needle, index)
            if found < 0:
                break
            start = max(0, found - 12)
            end = min(len(data), found + len(needle) + 12)
            context = data[start:end]
            printable = "".join(chr(b) if 32 <= b < 127 else "." for b in context)
            hits.append(
                {
                    "string": needle.decode("utf-8"),
                    "offset": found,
                    "context": printable,
                }
            )
            index = found + 1
            if len(hits) >= 20:
                return hits
    return hits


def strings_hits(path: Path) -> list[str]:
    if shutil.which("strings") is None:
        return []
    proc = subprocess.run(
        ["strings", "-a", "-n", "4", str(path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    text = proc.stdout.decode("utf-8", "replace")
    found = []
    for needle in PERSONAL_STRINGS:
        if needle in text:
            found.append(needle)
    return found


def exiftool_scan(path: Path) -> dict:
    tool = shutil.which("exiftool")
    if tool is None:
        return {"available": False, "forbidden": [], "personal": []}
    proc = subprocess.run(
        [tool, "-j", "-G1", "-a", str(path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if proc.returncode != 0:
        return {
            "available": True,
            "error": proc.stderr[-500:],
            "forbidden": ["exiftool_failed"],
            "personal": [],
        }
    rows = json.loads(proc.stdout or "[]")
    forbidden = []
    personal = []
    ignore_keys = {
        "SourceFile",
        "FileName",
        "Directory",
        "FileSize",
        "FileModifyDate",
        "FileAccessDate",
        "FileInodeChangeDate",
        "FilePermissions",
        "FileType",
        "FileTypeExtension",
        "MIMEType",
        "ExifToolVersion",
    }
    zero_dates = ("0000:00:00", "1904:01:01", "1970:01:01")
    for row in rows:
        for key, value in row.items():
            short = key.split(":")[-1]
            if short in ignore_keys or key in ignore_keys:
                continue
            text = str(value)
            key_l = short.lower().replace(" ", "_")
            if key_l in FORBIDDEN_TAG_KEYS or key_l in {
                "create_date",
                "creation_date",
                "datetime",
                "datetimeoriginal",
                "gps_position",
                "gps_latitude",
                "gps_longitude",
                "make",
                "model",
                "software",
                "creator",
                "producer",
                "author",
                "artist",
                "title",
                "comment",
                "copyright",
                "location",
            }:
                if any(text.startswith(prefix) for prefix in zero_dates):
                    continue
                if key_l in {"software", "encoder"} and ENCODER_VERSION_RE.match(text.strip()):
                    continue
                forbidden.append(f"{key}={text[:180]}")
            for needle in PERSONAL_STRINGS:
                if needle in text or needle in key:
                    personal.append(f"{key}={text[:180]}")
                    break
    return {"available": True, "forbidden": forbidden, "personal": personal}


def tag_scan(info: dict) -> dict:
    forbidden = []
    personal = []
    keys = []

    def consider(scope: str, tags: dict) -> None:
        for key, value in (tags or {}).items():
            keys.append(f"{scope}.{key}")
            text = str(value)
            key_l = key.lower()
            if key_l in FORBIDDEN_TAG_KEYS:
                forbidden.append(f"{scope}.{key}={text}")
            elif key_l == "encoder":
                if any(needle in text for needle in PERSONAL_STRINGS) or not ENCODER_VERSION_RE.match(
                    text.strip()
                ):
                    forbidden.append(f"{scope}.{key}={text}")
            elif key_l == "handler_name":
                if text.strip() and any(needle in text for needle in PERSONAL_STRINGS):
                    personal.append(f"{scope}.{key}={text}")
            else:
                for needle in PERSONAL_STRINGS:
                    if needle in text:
                        personal.append(f"{scope}.{key}={text}")
                        break

    consider("format", (info.get("format") or {}).get("tags") or {})
    for stream in info.get("streams") or []:
        scope = f"stream{stream.get('index')}:{stream.get('codec_type')}"
        consider(scope, stream.get("tags") or {})
    return {"keys": keys, "forbidden": forbidden, "personal": personal}


def bitrate_ok(stream: dict) -> bool:
    raw = stream.get("bit_rate")
    if raw in (None, "N/A"):
        return True
    value = int(raw)
    return int(AUDIO_BITRATE_BPS * 0.85) <= value <= int(AUDIO_BITRATE_BPS * 1.15)


def media_summary(path: Path, info: dict, loudness: dict, frame_md5: str, audio_md5: str) -> dict:
    video = stream_of(info, "video")
    audio = stream_of(info, "audio")
    nb = video.get("nb_frames")
    frames = int(nb) if nb and str(nb).isdigit() else None
    return {
        "path": path.name,
        "duration_s": float((info.get("format") or {}).get("duration") or 0),
        "video_duration_s": float(video.get("duration") or 0),
        "nb_frames": frames,
        "width": video.get("width"),
        "height": video.get("height"),
        "fps": parse_rate(str(video.get("r_frame_rate") or video.get("avg_frame_rate") or "")),
        "pix_fmt": video.get("pix_fmt"),
        "profile": video.get("profile"),
        "video_codec": video.get("codec_name"),
        "audio_codec": audio.get("codec_name"),
        "sample_rate": int(audio.get("sample_rate") or 0),
        "channels": audio.get("channels"),
        "channel_layout": audio.get("channel_layout"),
        "audio_bitrate": int(audio["bit_rate"]) if str(audio.get("bit_rate") or "").isdigit() else None,
        "faststart": faststart_ok(path),
        "loudness": {
            "I": loudness.get("input_i"),
            "TP": loudness.get("input_tp"),
            "LRA": loudness.get("input_lra"),
            "thresh": loudness.get("input_thresh"),
        },
        "decoded_frame_md5": frame_md5,
        "decoded_audio_md5": audio_md5,
    }


def add_check(checks: list[dict], name: str, ok: bool, detail: str) -> None:
    checks.append({"name": name, "ok": bool(ok), "detail": detail})


def gain_for(measured: dict) -> float:
    integrated = float(measured["input_i"])
    true_peak = float(measured["input_tp"])
    gain = I_TARGET - integrated
    if true_peak + gain > TP_TARGET:
        gain = TP_TARGET - true_peak - 0.3
    return gain


def export_once(
    video: Path,
    music: Path | None,
    credits: Path | None,
    out_dir: Path,
    x264_extra: str,
) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    log_path = out_dir / "export.log"
    master = out_dir / MASTER_NAME
    blind = out_dir / BLIND_NAME
    info = probe(video)
    vstream = stream_of(info, "video")
    stream_of(info, "audio")
    duration = float((info.get("format") or {}).get("duration") or vstream.get("duration") or 0)
    frames = expected_frames(vstream, duration)
    if credits is not None:
        if frames <= CREDITS_FRAMES:
            raise ExportError("video is not longer than the 12 s credits")
        cinfo = probe(credits)
        stream_of(cinfo, "video")
        cdur = float((cinfo.get("format") or {}).get("duration") or 0)
        if cdur + 0.05 < CREDITS_SECONDS:
            raise ExportError(f"credits are {cdur:.3f}s; need at least 12s")
        keep = frames - CREDITS_FRAMES
    else:
        keep = None
    end_sample = frames * SAMPLES_PER_FRAME
    whole_dur = f"{frames / FPS:.6f}"
    main_cfr = is_cfr_1080(vstream)

    with tempfile.TemporaryDirectory(prefix="export_final_") as tmp_name:
        tmp = Path(tmp_name)
        wav = tmp / "norm.wav"
        m4a = tmp / "audio.m4a"
        video_only = tmp / "video.mp4"
        loudnorm_report = build_normalized_wav(
            video, music, end_sample, whole_dur, wav, log_path
        )
        encode_video(video, credits, keep, main_cfr, video_only, log_path, x264_extra)
        vinfo = probe(video_only)
        actual_frames = int(stream_of(vinfo, "video").get("nb_frames") or 0)
        if keep is not None and actual_frames != frames:
            raise ExportError(
                f"credits replace changed frame count: got {actual_frames}, want {frames}"
            )
        if keep is None and actual_frames and abs(actual_frames - frames) > 1:
            raise ExportError(
                f"frame count drifted: got {actual_frames}, source {frames}"
            )
        # Trim audio to the picture that was actually encoded.
        if actual_frames and actual_frames != frames:
            end_sample = actual_frames * SAMPLES_PER_FRAME
            trimmed = tmp / "trim.wav"
            run_ffmpeg(
                [
                    "ffmpeg",
                    "-y",
                    "-hide_banner",
                    "-nostdin",
                    "-threads",
                    THREADS,
                    "-i",
                    str(wav),
                    "-af",
                    f"atrim=end_sample={end_sample},asetpts=PTS-STARTPTS",
                    "-c:a",
                    "pcm_s24le",
                    str(trimmed),
                ],
                log_path,
            )
            wav = trimmed

        encode_aac(wav, m4a, log_path)
        aac_measured = measure_loudness(m4a, log_path)
        gain_applied = 0.0
        if not loudness_ok(aac_measured):
            gain_applied = gain_for(aac_measured)
            adjusted = tmp / "gain.wav"
            apply_gain(wav, adjusted, gain_applied, log_path)
            encode_aac(adjusted, m4a, log_path)
            aac_measured = measure_loudness(m4a, log_path)
            if not loudness_ok(aac_measured):
                raise ExportError(f"loudness still outside target after AAC: {aac_measured}")
        mux_master(video_only, m4a, master, log_path)

    remux_blind(master, blind, log_path)
    scrub = scrub_blind_container(blind)
    return {
        "loudnorm": loudnorm_report,
        "aac_preflight": {
            "I": aac_measured.get("input_i"),
            "TP": aac_measured.get("input_tp"),
            "LRA": aac_measured.get("input_lra"),
            "gain_db": gain_applied,
        },
        "scrub": scrub,
        "source_frames": frames,
        "credits_frames_replaced": CREDITS_FRAMES if credits is not None else 0,
    }


def metadata_report(path: Path) -> dict:
    info = probe(path)
    tags = tag_scan(info)
    byte_hits = find_byte_hits(path)
    string_hits = strings_hits(path)
    exif = exiftool_scan(path)
    chapters = info.get("chapters") or []
    empty = not (
        tags["forbidden"]
        or tags["personal"]
        or byte_hits
        or string_hits
        or exif.get("forbidden")
        or exif.get("personal")
        or chapters
    )
    return {
        "ffprobe_tag_keys": tags["keys"],
        "forbidden_tags": tags["forbidden"],
        "personal_in_tags": tags["personal"],
        "chapters": len(chapters),
        "byte_hits": byte_hits,
        "strings_hits": string_hits,
        "exiftool": exif,
        "empty": empty,
    }


def build_verify(
    video: Path,
    music: Path | None,
    credits: Path | None,
    out_dir: Path,
    prep: dict,
) -> dict:
    log_path = out_dir / "export.log"
    master = out_dir / MASTER_NAME
    blind = out_dir / BLIND_NAME
    master_info = probe(master)
    blind_info = probe(blind)
    master_loud = measure_loudness(master, log_path)
    blind_loud = measure_loudness(blind, log_path)
    master_vmd5 = decoded_md5(master, "video", log_path)
    blind_vmd5 = decoded_md5(blind, "video", log_path)
    master_amd5 = decoded_md5(master, "audio", log_path)
    blind_amd5 = decoded_md5(blind, "audio", log_path)
    master_sum = media_summary(master, master_info, master_loud, master_vmd5, master_amd5)
    blind_sum = media_summary(blind, blind_info, blind_loud, blind_vmd5, blind_amd5)
    blind_meta = metadata_report(blind)
    checks: list[dict] = []
    add_check(
        checks,
        "master_resolution",
        master_sum["width"] == WIDTH and master_sum["height"] == HEIGHT,
        f"{master_sum['width']}x{master_sum['height']}",
    )
    add_check(checks, "master_fps", abs(master_sum["fps"] - FPS) < 0.01, str(master_sum["fps"]))
    add_check(checks, "master_pix_fmt", master_sum["pix_fmt"] == "yuv420p", str(master_sum["pix_fmt"]))
    add_check(checks, "master_profile", master_sum["profile"] == "High", str(master_sum["profile"]))
    add_check(checks, "master_codec", master_sum["video_codec"] == "h264", str(master_sum["video_codec"]))
    add_check(
        checks,
        "master_audio",
        master_sum["audio_codec"] == "aac"
        and master_sum["sample_rate"] == AUDIO_RATE
        and master_sum["channels"] == 2,
        f"{master_sum['audio_codec']} {master_sum['sample_rate']} {master_sum['channels']}ch",
    )
    add_check(
        checks,
        "master_audio_bitrate",
        bitrate_ok(stream_of(master_info, "audio")),
        str(master_sum["audio_bitrate"]),
    )
    add_check(checks, "master_faststart", master_sum["faststart"], "moov before mdat")
    add_check(
        checks,
        "master_loudness_I",
        abs(float(master_sum["loudness"]["I"]) - I_TARGET) <= I_TOL,
        str(master_sum["loudness"]["I"]),
    )
    add_check(
        checks,
        "master_loudness_TP",
        float(master_sum["loudness"]["TP"]) <= TP_TARGET + 1e-3,
        str(master_sum["loudness"]["TP"]),
    )
    add_check(
        checks,
        "blind_duration",
        abs(master_sum["duration_s"] - blind_sum["duration_s"]) < 0.02,
        f"{master_sum['duration_s']} vs {blind_sum['duration_s']}",
    )
    add_check(
        checks,
        "blind_frames",
        master_sum["nb_frames"] == blind_sum["nb_frames"] and master_sum["nb_frames"],
        f"{master_sum['nb_frames']} vs {blind_sum['nb_frames']}",
    )
    add_check(
        checks,
        "blind_resolution",
        blind_sum["width"] == WIDTH and blind_sum["height"] == HEIGHT,
        f"{blind_sum['width']}x{blind_sum['height']}",
    )
    add_check(
        checks,
        "decoded_frame_md5_match",
        master_vmd5 == blind_vmd5,
        f"{master_vmd5} vs {blind_vmd5}",
    )
    add_check(
        checks,
        "decoded_audio_md5_match",
        master_amd5 == blind_amd5,
        f"{master_amd5} vs {blind_amd5}",
    )
    name_hits = [s for s in PERSONAL_STRINGS if s in BLIND_NAME or s in MASTER_NAME]
    add_check(checks, "filenames_clean", not name_hits, ",".join(name_hits) or "clean")
    add_check(checks, "blind_metadata_empty", blind_meta["empty"], "see metadata_scan")
    add_check(checks, "blind_faststart", blind_sum["faststart"], "moov before mdat")
    ok = all(item["ok"] for item in checks)
    return {
        "ok": ok,
        "inputs": {
            "video": str(video),
            "music": None if music is None else str(music),
            "credits": None if credits is None else str(credits),
            "credits_replaced_last_seconds": CREDITS_SECONDS if credits is not None else None,
        },
        "targets": {
            "width": WIDTH,
            "height": HEIGHT,
            "fps": FPS,
            "profile": "High",
            "pix_fmt": "yuv420p",
            "crf": int(CRF),
            "audio": f"aac {AUDIO_RATE} Hz {AUDIO_BITRATE} stereo",
            "loudness_I": I_TARGET,
            "loudness_TP": TP_TARGET,
            "loudness_LRA": LRA_TARGET,
        },
        "loudnorm": prep["loudnorm"],
        "aac_preflight": prep["aac_preflight"],
        "container_scrub": prep["scrub"],
        "master": master_sum,
        "blind": blind_sum,
        "decoded_frame_md5_match": master_vmd5 == blind_vmd5,
        "decoded_audio_md5_match": master_amd5 == blind_amd5,
        "metadata_scan": blind_meta,
        "checks": checks,
    }


def write_verify(payload: dict, path: Path) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export the final 1080p film and a blind-review copy.")
    parser.add_argument("--video", required=True, type=Path, help="picture + voice mp4")
    parser.add_argument("--music", type=Path, default=None, help="optional music wav, mixed at unity")
    parser.add_argument("--credits", type=Path, default=None, help="optional 12s end card; replaces the last 12s of picture")
    parser.add_argument("--out", required=True, type=Path, help="output directory")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    video = args.video.expanduser().resolve()
    music = None if args.music is None else args.music.expanduser().resolve()
    credits = None if args.credits is None else args.credits.expanduser().resolve()
    out_dir = args.out.expanduser().resolve()
    if not video.is_file():
        raise ExportError(f"video not found: {video}")
    if music is not None and not music.is_file():
        raise ExportError(f"music not found: {music}")
    if credits is not None and not credits.is_file():
        raise ExportError(f"credits not found: {credits}")
    for name in (MASTER_NAME, BLIND_NAME):
        for needle in PERSONAL_STRINGS:
            if needle in name:
                raise ExportError(f"output name contains {needle}")

    # A second x264 param is only used when compressed bytes collide with an
    # identity string. Both outputs of a given attempt stay frame-identical.
    attempts = ("threads=2", "threads=2:ipratio=1.41")
    last_error: Exception | None = None
    for attempt, extra in enumerate(attempts, start=1):
        try:
            prep = export_once(video, music, credits, out_dir, extra)
            hits = find_byte_hits(out_dir / BLIND_NAME)
            if hits:
                last_error = ExportError(
                    "blind file still contains identity strings: "
                    + ", ".join(hit["string"] for hit in hits[:8])
                )
                print(last_error, flush=True)
                continue
            payload = build_verify(video, music, credits, out_dir, prep)
            payload["encode_attempt"] = attempt
            payload["x264_params"] = extra
            write_verify(payload, out_dir / VERIFY_NAME)
            print(json.dumps({"ok": payload["ok"], "verify": str(out_dir / VERIFY_NAME)}, ensure_ascii=False))
            return 0 if payload["ok"] else 1
        except ExportError as exc:
            last_error = exc
            print(exc, file=sys.stderr)
            break
    if last_error:
        fail = {
            "ok": False,
            "error": str(last_error),
            "inputs": {
                "video": str(video),
                "music": None if music is None else str(music),
                "credits": None if credits is None else str(credits),
            },
        }
        try:
            out_dir.mkdir(parents=True, exist_ok=True)
            write_verify(fail, out_dir / VERIFY_NAME)
        except OSError:
            pass
        print(last_error, file=sys.stderr)
    return 1


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except ExportError as exc:
        print(exc, file=sys.stderr)
        sys.exit(1)
