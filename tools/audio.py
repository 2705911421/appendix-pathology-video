import asyncio
import hashlib
import json
import math
import os
from pathlib import Path
import re
import subprocess
import wave

import edge_tts
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "film" / "script.psv"
CACHE = ROOT / "audio" / "sentences"
FFMPEG = os.environ.get("FFMPEG_PATH", "ffmpeg")
RATE = 48_000
FPS = 30
FRAME = RATE // FPS
GAP = 21 * FRAME
ACT_SECONDS = (25, 49, 60, 62, 50, 34, 13)
SHOT_SECONDS = {"alarm": 64, "rupture": 184, "ctOverview": 204, "ct0": 207}
CREDITS = 7
VOICE = "zh-CN-XiaoxiaoNeural"
PADDING_LIMIT = 32  # below -60 dBFS in signed 16-bit PCM


def command(*args, data=None, output=False):
    return subprocess.run(
        [FFMPEG, "-hide_banner", "-loglevel", "error", "-nostdin", "-y", *map(str, args)],
        input=data, stdout=subprocess.PIPE if output else None, check=True,
    ).stdout


def load_script():
    rows = []
    for line in SOURCE.read_text(encoding="utf-8").splitlines():
        if not line or line.startswith("#"):
            continue
        act, shot, zh, en, *spoken = line.split("|")
        voice_text = spoken[0] if spoken else zh
        mandarin = re.sub(r"(?<![A-Za-z])C ?T(?![A-Za-z])", "", voice_text)
        if (len(re.findall(r"[\u3400-\u9fff]", zh)) > 24 or
                re.search(r"[A-Za-z<>【】]", mandarin) or re.search(r"[\u2018\u2019]", en)):
            raise ValueError(f"Incorrect caption or non-Chinese narration: {zh}")
        rows.append(dict(act=int(act), shot=shot, zh=zh, en=en, spoken=voice_text))
    if sorted({row["act"] for row in rows}) != list(range(1, 8)):
        raise ValueError("Expected seven populated acts")
    return rows


async def narrate(rows):
    CACHE.mkdir(exist_ok=True, parents=True)
    limit = asyncio.Semaphore(4)

    async def fetch(index, row):
        key = hashlib.sha256(f"{VOICE}|{row['spoken']}".encode()).hexdigest()[:16]
        path = CACHE / f"{key}.mp3"
        if path.exists() and path.stat().st_size > 1024:
            return path
        async with limit:
            temp = path.with_suffix(".part")
            for attempt in range(4):
                try:
                    await edge_tts.Communicate(row["spoken"], VOICE).save(str(temp))
                    if temp.stat().st_size <= 1024:
                        raise ValueError("TTS returned an empty segment")
                    temp.replace(path)
                    print(f"TTS {index + 1}/{len(rows)}", flush=True)
                    return path
                except Exception:
                    if attempt == 3:
                        raise
                    await asyncio.sleep(2 ** attempt)

    return await asyncio.gather(*(fetch(index, row) for index, row in enumerate(rows)))


def wav(path, samples):
    temp = path.with_suffix(".part")
    with wave.open(str(temp), "wb") as file:
        file.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        file.writeframes(samples.tobytes())
    temp.replace(path)


def score(samples):
    """Original quiet mallet and pad score in 6/8, composed for the seven-act arc."""
    count = len(samples)
    music = np.zeros(count, dtype=np.float32)
    chords = ((50, 57, 64, 69), (46, 53, 60, 65), (53, 60, 67, 72), (48, 55, 62, 67))
    beats = np.array([0, 3, 5, 6, 9, 11]) * .38
    for bar_index, start in enumerate(np.arange(0, count / RATE, 4.56)):
        chord = chords[bar_index % len(chords)]
        length = min(round(RATE * 5.5), count - round(start * RATE))
        t = np.arange(length, dtype=np.float32) / RATE
        pad = np.minimum(1, t / .75) * np.maximum(0, np.minimum(1, (5.3 - t) / 1.55))
        for note in chord[:3]:
            freq = 440 * 2 ** ((note - 69) / 12)
            tone = np.sin(2 * math.pi * freq * t) + .19 * np.sin(4 * math.pi * freq * t)
            music[round(start * RATE):round(start * RATE) + length] += tone * pad * .0042
        for i, beat in enumerate(beats):
            offset = round((start + beat) * RATE)
            if offset >= count:
                break
            length = min(round(RATE * 1.7), count - offset)
            t = np.arange(length, dtype=np.float32) / RATE
            freq = 440 * 2 ** ((chord[(0, 2, 1, 3, 2, 1)[i]] - 69) / 12)
            envelope = np.minimum(1, t / .019) * np.exp(-3.2 * t)
            tone = np.sin(2 * math.pi * freq * t) + .23 * np.sin(2 * math.pi * freq * 2.01 * t)
            music[offset:offset + length] += .015 * tone * envelope
    cut = count - CREDITS * RATE
    music[:RATE] *= np.linspace(0, 1, RATE)
    music[cut - 2 * RATE:cut] *= np.linspace(1, 0, 2 * RATE)
    music[cut:] = 0
    active = (samples != 0).astype(np.float32)
    # 100 ms local voice energy envelope for smooth ducking.
    block = RATE // 10
    levels = active.reshape(-1, block).mean(axis=1)
    duck = np.interp(np.arange(count), (np.arange(len(levels)) + .5) * block, 1 - .33 * levels)
    return music * duck


def decode_cue(path):
    decoded = command("-i", path, "-ac", 1, "-ar", RATE, "-f", "s16le", "-", output=True)
    samples = np.frombuffer(decoded, dtype="<i2")
    active = np.flatnonzero(np.abs(samples.astype(np.int32)) > PADDING_LIMIT)
    if not active.size or np.abs(samples.astype(np.int32)).max() < 1000:
        raise ValueError(f"Missing speech in {path.name}")
    guard = round(.055 * RATE)
    left, right = max(0, active[0] - guard), min(len(samples), active[-1] + guard + 1)
    return samples[left:right], len(samples), int(left), int(len(samples) - right)


def fit_cue(samples, allocated):
    # The input tail guard absorbs atempo's lookahead. Output is only padded, never cut.
    padded = np.pad(samples, (0, round(.10 * RATE)))
    buffer = padded.tobytes()
    target = allocated - FRAME
    tempo = len(padded) / target
    for _ in range(5):
        if not .79 <= tempo <= 1.27:
            raise ValueError(f"Narration tempo {tempo:.3f} is outside the listening range")
        fitted = command(
            "-f", "s16le", "-ar", RATE, "-ac", 1, "-i", "-",
            "-af", f"atempo={tempo:.8f}", "-f", "s16le", "-",
            data=buffer, output=True,
        )
        clip = np.frombuffer(fitted, dtype="<i2")
        if len(clip) <= allocated:
            active = np.flatnonzero(np.abs(clip.astype(np.int32)) > PADDING_LIMIT)
            if not active.size or len(clip) - active[-1] - 1 < .024 * RATE:
                raise ValueError("Tempo filter did not preserve the cue's tail margin")
            pcm = np.pad(clip, (0, allocated - len(clip)))
            return pcm, tempo, len(clip), int(active[0]), int(active[-1])
        tempo *= len(clip) / target
    raise ValueError("Unable to fit the complete narration inside its cue")


def allocate_act_cues(indices, rows, decoded, start, end):
    minimum_margin = round(.10 * RATE)
    cuts = [(0, start)]
    for offset, index in enumerate(indices[1:], 1):
        shot = rows[index]["shot"]
        if shot in SHOT_SECONDS and shot != rows[index - 1]["shot"]:
            cuts.append((offset, SHOT_SECONDS[shot] * RATE))
    cuts.append((len(indices), end))
    for (left, begin), (right, finish) in zip(cuts, cuts[1:]):
        section = indices[left:right]
        available = finish - begin - len(section) * GAP
        if available <= 0:
            raise ValueError(f"No narration time for {rows[section[0]]['shot']}")
        weights = [len(decoded[index][0]) + minimum_margin for index in section]
        weight_sum = sum(weights)
        previous = 0
        cumulative = 0
        for index, weight in zip(section, weights):
            cumulative += weight
            endpoint = round(cumulative / weight_sum * available / FRAME) * FRAME
            yield index, endpoint - previous
            previous = endpoint


def build(rows, files):
    decoded = [decode_cue(path) for path in files]
    cursor = 0
    clips = []
    segments = []
    report = []
    for act, seconds in enumerate(ACT_SECONDS, 1):
        indices = [index for index, row in enumerate(rows) if row["act"] == act]
        print(f"Act {act}: {len(indices)} cues", flush=True)
        for index, allocated in allocate_act_cues(indices, rows, decoded, cursor, cursor + seconds * RATE):
            row = rows[index]
            samples, raw_count, trim_head, trim_tail = decoded[index]
            try:
                clip, tempo, fitted_count, first_active, last_active = fit_cue(samples, allocated)
            except ValueError as error:
                raise ValueError(f"Cue {index + 1} ({row['shot']}): {error}") from error
            clips.append(clip)
            clips.append(np.zeros(GAP, dtype="<i2"))
            segments.append(dict(
                act=act, shot=row["shot"], zh=row["zh"], en=row["en"],
                startFrame=cursor // FRAME, audioFrames=len(clip) // FRAME,
                endFrame=(cursor + len(clip) + GAP) // FRAME,
            ))
            report.append(dict(
                beat=index + 1, act=act, sha256=hashlib.sha256(files[index].read_bytes()).hexdigest(),
                ttsSeconds=round(raw_count / RATE, 6), audioDuration=len(clip) / RATE, tempo=round(tempo, 5),
                trimPaddingSamples=[trim_head, trim_tail], fittedSamples=fitted_count,
                firstActiveSample=first_active, lastActiveSample=last_active,
            ))
            cursor += len(clip) + GAP
    total_frames = (cursor + CREDITS * RATE) // FRAME
    narration = np.concatenate([*clips, np.zeros(CREDITS * RATE, dtype="<i2")])
    wav(ROOT / "audio" / "narration.wav", narration)
    score_mix = narration.astype(np.float32) / 32768 + score(narration)
    pcm = np.round(np.clip(score_mix, -.97, .97) * 32767).astype("<i2")
    normalized = command(
        "-f", "s16le", "-ar", RATE, "-ac", 1, "-i", "-", "-af",
        f"loudnorm=I=-16:TP=-1.8:LRA=7,aresample={RATE},apad=whole_len={len(pcm)},atrim=end_sample={len(pcm)}",
        "-f", "s16le", "-", data=pcm.tobytes(), output=True,
    )
    cut = len(pcm) - CREDITS * RATE
    mix_pcm = np.frombuffer(normalized, dtype="<i2").copy()
    mix_pcm[cut:] = 0
    wav(ROOT / "audio" / "mix.wav", mix_pcm)
    timeline = dict(fps=FPS, frames=total_frames, creditsFrame=cursor // FRAME, cues=segments)
    audio_report = dict(
        ttsSourceSeconds=round(sum(row[1] for row in decoded) / RATE, 6),
        fittedSpeechSeconds=sum(x["audioFrames"] for x in segments) / FPS,
        bufferSeconds=len(rows) * GAP / RATE, sampleRate=RATE, activeThreshold=PADDING_LIMIT,
        creditsSeconds=CREDITS, totalSeconds=total_frames / FPS, voice=VOICE, beats=report,
    )
    for path, value in ((ROOT / "film" / "timeline.json", timeline), (ROOT / "qa" / "audio.json", audio_report)):
        temp = path.with_suffix(".part")
        temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temp.replace(path)
    print(f"{total_frames / FPS:.2f}s total | {len(rows)} narration beats | {total_frames} frames", flush=True)


if __name__ == "__main__":
    script = load_script()
    build(script, asyncio.run(narrate(script)))
