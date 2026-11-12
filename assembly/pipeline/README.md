# v5 final assembly

Builds a 1920×1080 H.264 film: scene plate, bilingual subtitle band, 12 s endcard, stereo 48 kHz AAC. The endcard directory is only read. Old-film music from `v4_mix` is not used.

```
./pipeline/assemble.sh \
  --scene-video <path> \          # optional; else a #F4EFE6 plate
  --cues <snapshot.json> \        # optional; else loadCues()
  --voice <wav> \                 # optional; else 配音/全稿_v3/旁白_v3.wav if it exists, else silence
  --music <wav> \                 # optional; else silence
  --endcard-dir ../endcard \      # default: assembly/endcard
  --fps 30 \
  --out-dir qa \
  --out-name dryrun_测试 \
  --content-duration 18 \         # optional; pad or trim the picture to this many seconds
  --max-cues 5 \                  # optional; keep the first N cues
  --blind                         # also write <out-name>_盲审.mp4 (default on)
```

`--xfade` turns on hard-cut subtitle switches. `--no-blind` skips the stripped copy. `--keep-tmp` leaves `qa/tmp/`.

## Steps

1. Load cues (`subtitle/loadCues.js`). Content length is the last cue's end, or `--content-duration`. The endcard is always 12 s after that.
2. Scene. A missing plate becomes a 1920×1080 30 fps `#F4EFE6` video. A provided plate is trimmed or padded with paper frames and scaled or cropped only when it is not already 1920×1080.
3. Subtitles. Headless Chrome (MixSans loaded before any `measureText`) paints a transparent PNG sequence. Picture content may extend to y < 950 (`BAND.safeTop` in `subtitle/config.js`). From that line the frame is a soft paper scrim — it peaks just above the Chinese halo and fades out by the bottom of the frame, not a solid slab — plus one Chinese line (52 px) and one English card (30 px). `ffmpeg overlay=0:0` puts that band on the scene. Identical frames are hard-linked. `xfade` defaults off.
4. Endcard. `pipeline/render_endcard.mjs` opens `endcard/index.html` at `http://endcard.local/`, waits for `window.READY`, and calls `window.render(t)` for `t` in `[0, 12)` at 30 fps. The page fills the paper itself. The clip is concatenated after the content.
5. Audio. Voice starts at t=0 and is trimmed or padded so it never plays over the endcard. Music may cover content + endcard and fades out over the last 0.8 s. Music is ducked under the voice with `sidechaincompress=threshold=0.05:ratio=8:attack=50:release=300`, then `amix`. Missing inputs are silent tracks of the right length. The mix targets −14 LUFS and true peak ≤ −1 dBTP (two-pass `loudnorm`). If both inputs are silence, loudnorm is skipped. Output is stereo 48 kHz AAC, `+faststart`, `yuv420p`.
6. Writes `<out-name>.mp4`, `<out-name>_720p.mp4` (1280×720), and a JSON report next to the markdown dry-run report.

## Blind review

`pipeline/blind_review.sh INPUT OUTPUT PROBE STRINGS [files...]` re-encodes with `-map_metadata -1`, bitexact flags, and a filter that drops SEI type 6, then clears the `avc1` compressor-name field (ffmpeg 7 still writes `Lavc libx264` there). `qa/blind_ffprobe.txt` is `ffprobe -hide_banner -show_format -show_streams` with structural `DISPOSITION:` rows removed, plus `RESULT: PASS` or `FAIL`.

`qa/blind_strings.txt` scans `endcard.json` (read only), the cue snapshot, and other emitted JSON for `三峡`, `Sharpton`, `Gisele`, `导师`, `指导`. `【待填】` is not a failure.

## Intermediates

Frames are written under `qa/tmp/sub/` and `qa/tmp/endcard/` and deleted after the mp4s exist. Pass `--keep-tmp` to inspect them. The three sample PNGs in `qa/frames/` are kept.

## Dry run

```
./pipeline/assemble.sh --content-duration 18 --max-cues 5 --out-dir qa --out-name dryrun_测试
```

That keeps sentences 01–05 (estimate end 17.40 s), holds paper until 18.00 s, then appends the 12 s endcard (30 s total).
