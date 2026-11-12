TASK: Build a standalone bilingual subtitle module and a final-assembly pipeline for the NEW pathology film (v5). This is not an edit of the old film. You are Grok Build. Supervisor reviews; you implement, run a dry-run, and stop. Do not git commit.

CWD: /workspace/病理科普视频/v5/assembly/

================================================================================
HARD BOUNDARIES
================================================================================
WRITE ONLY under /workspace/病理科普视频/v5/assembly/ and ONLY in these new trees:
  assembly/subtitle/
  assembly/pipeline/
  assembly/qa/          (reports, dry-run outputs, sample frames)
You may add assembly/package.json, assembly/package-lock.json, assembly/node_modules/, assembly/.gitignore.

DO NOT MODIFY:
- assembly/endcard/**  (already approved; do not change any string, js, json, font, render.mjs, or 样帧)
- anything outside assembly/: no v5/scenes/, v5/lib/, v5/main.js, v5/data/, v5/package.json, v5/.gitignore, v5/render.mjs, v4_mix/**, 配音/**, 解说词_v2/**
- Do not git commit or git add.

READ-ONLY references (absolute paths; do not write to them):
- Subtitle source of truth (branch subtitle-bilingual):
  /workspace/病理科普视频/v4_mix/film_subtitle/lib/subtitle.js
  /workspace/病理科普视频/v4_mix/film_subtitle/lib/timeline.js
  /workspace/病理科普视频/v4_mix/film_subtitle/lib/tokens.js
  /workspace/病理科普视频/v4_mix/qa/subtitle/说明.md
  /workspace/病理科普视频/v4_mix/film_subtitle/fonts/   (MixSans Regular/Bold woff2)
- Approved endcard (reuse the render pattern, do not edit):
  /workspace/病理科普视频/v5/assembly/endcard/   especially render.mjs, index.html, endcard.js, data/endcard.json
- Voiceover (IN PROGRESS; final sentences.tsv / narration.json / 旁白_v3.wav may not exist yet):
  /workspace/病理科普视频/配音/全稿_v3/TASK.md
  /workspace/病理科普视频/配音/全稿_v3/lines.json      (77 sentences, already has "en" with " | " card breaks, "text", "chapter", "seg", "chunks", "hanzi")
  /workspace/病理科普视频/配音/全稿_v3/chunks_status.json
  /workspace/病理科普视频/配音/全稿_v3/pipeline.py
- Final narration text:
  /workspace/病理科普视频/解说词_v2/解说词_定稿.md     (77-row markdown table; English in 对应画面建议 as 「英文：…」 and optional 「英文续卡：…」)
- Optional timing preview (READ only if useful; do not depend on editing it):
  /workspace/病理科普视频/v5/data/timeline.preview.json
  /workspace/病理科普视频/v5/data/script.json

Chrome is at /usr/bin/google-chrome. ffmpeg 7.1 and ffprobe are on PATH. Node is /usr/local/bin/node. Python 3 is on PATH; /workspace/venv_asr/bin/python has pyloudnorm, numpy, soundfile if you need them.

If you need Playwright, create assembly/package.json (do NOT edit v5/package.json) and `npm install playwright` inside assembly/. Launch Chromium with executablePath: '/usr/bin/google-chrome' or channel: 'chrome'. headless, --no-sandbox, --font-render-hinting=none, --force-color-profile=srgb. Follow endcard/render.mjs routing pattern (page.route a fake origin, serve local files).

================================================================================
1) assembly/subtitle/  — standalone bilingual subtitle component
================================================================================
Copy MixSans-Regular.woff2 and MixSans-Bold.woff2 into assembly/subtitle/fonts/ (from endcard/fonts or film_subtitle/fonts). Do not symlink out of this tree. Runtime must not import from v4_mix or from v5/lib.

Port the APPROVED typography and behaviour from film_subtitle/lib/subtitle.js and 说明.md, with one addition for English card-breaks (below). Do not invent a new layout.

Required constants (must match the approved module):
  CN_SIZE = 68          font weight 500
  EN_SIZE = 42          font weight 400
  EN_FLOOR = 28         auto-shrink floor, never wrap, never ellipsis
  EN_MAX_W = 1840       40 px side inset
  MAX = 18              Chinese visual-char wrap budget (quotes “” " don't count, same as visLen)
  BAND = {
    fadeTop: 810,       // picture content stays at y < 810
    fadeEnd: 910,       // paper fade solid here, above Chinese halo
    cnY: 986,           // Chinese alphabetic baseline (FIXED even when en is absent)
    enY: 1038,          // English alphabetic baseline
    safeTop: 810
  }
  Paper #F4EFE6, ink #2A2A35, accent red #D6453A.
  FONT = "MixSans","Noto Sans CJK SC","Noto Sans SC",sans-serif
  ACCENT list: copy the array from film_subtitle/lib/subtitle.js as-is (do not invent new terms).

Visual style (copy the paint recipe from subtitle.js):
  Dark ink + thin paper-coloured halo (strokeWidth 6 + shadowBlur 10), no black stroke, no box.
  Chinese keywords in ACCENT use vermilion fill.
  Dark-mode path (dark > .5): light fill #EFE8DC, dark halo rgb(17,17,20).
  safeFade(ctx, paper, dark): linear gradient from BAND.fadeTop (transparent) to BAND.fadeEnd (solid paper), fill Rect (0, fadeTop, 1920, 1080-fadeTop).

Chinese: keep split() / linesFor() logic (punctuation breaks, drop trailing soft punctuation, per-line timing by character share, two-pass halo then fill, centered at x=960). One Chinese line on screen at a time.

English — APPROVED behaviour PLUS card breaks:
  - Source text is the parent sentence's English. If it contains " | " (spaces around the pipe), split into sequential CARDS. Also accept an already-split `englishCards` array. Cards display one after another, NEVER stacked, during that sentence's [start, end). Time-share cards by character count (same idea as Chinese line split). This is required by the final script: 「英文续卡按语义依次显示，不同时堆叠。」
  - Each card is a single line. Auto-shrink from 42 px down to 28 px if measureText width > 1840. If still overflowing at 28 px, draw anyway and record via consumeOverflow() / measureEnglish().
  - No ACCENT colouring on English. Same halo recipe. Centered at 960, baseline BAND.enY.
  - Chinese baseline does not move when en is missing.
  - Chinese fragment timing and English card timing are INDEPENDENT (do not tie English cards to Chinese wraps).
  - If en is empty, draw Chinese only.

Fade / xfade (keep from subtitle.js):
  - Default: each Chinese line fades in 0.12 s and out 0.08 s; current English card uses the current Chinese line's alpha only if you would otherwise flicker — prefer: English cards fade in/out at their own edges (0.12 / 0.08) except when { xfade: true }.
  - { xfade: true }: within-sentence Chinese line switches HARD-CUT; only the first Chinese line of the sentence fades in 0.12 s and the last fades out 0.08 s. English cards likewise hard-cut inside the sentence and follow the sentence-edge fade (first card in, last card out). Do not draw two Chinese lines or two English cards at once.

On-screen Chinese: strip citation markers like [1], [2], [3][4] from the DRAWN text only (they are not spoken). Keep them in the cue data.

Public API (ES module):
  export function drawSubtitles(ctx, t, cues, { dark = 0, xfade = false } = {})
      Find the cue with t in [start, end), draw fade + current CN line + current EN card. No-op if none.
  export function safeFade(ctx, paper, dark)
  export function loadCues(options) → Promise<{ cues, source, duration }>   // see loader below
  export { CN_SIZE, EN_SIZE, EN_FLOOR, BAND, split, linesFor, measureEnglish, consumeOverflow }

Also provide a Node-friendly loader (fs) used by the pipeline, e.g. loadCuesFromFs(paths) in the same file or loadCues.js. Browser index.html may fetch local JSON the pipeline writes, or call a small preview hook.

index.html: 1920×1080 canvas, load MixSans (400/500) before READY, window.READY, window.render(t) fills paper, safeFade, drawSubtitles. Useful for stills.

render.mjs (stills helper): Playwright, same pattern as endcard/render.mjs. Not the dry-run video itself.

README.md: how to drop this folder into a host, API, cue format, typography table, safe area y<810, how English " | " cards work, how ka moji's narration.json / sentences.tsv plug in, how the fallback estimate works.

--------------------------------------------------------------------------------
CUE LOADER
--------------------------------------------------------------------------------
Each cue:
  { i, id, ch, start, end, text, en, englishCards }
  - i: 0-based index
  - id: "01".."77"
  - ch: keep both the section title (开场, 就诊, …) if known and/or ka moji's seg ("01")
  - text: Chinese sentence (including any [n] in the source)
  - en: the full English joined with " | " if there are multiple cards (for TSV compatibility)
  - englishCards: array of one or more single-line strings (split on " | " and trimmed; if no pipe, one-element array)
  - start, end: seconds

Load priority (stop at the first source that exists AND has usable timings):

  A. /workspace/病理科普视频/配音/全稿_v3/narration.json
     Schema like v4 (object with segments: [{ id, ch, start, end, text, en? }]). Use segment.en when non-empty.

  B. Else /workspace/病理科普视频/配音/全稿_v3/sentences.tsv
     Tab-separated, header includes 段 起 止 时长 句子 and a 6th column en (header `en`).
     Rows: ch, start, end, dur, text, en. Number formatting may have padded spaces; trim and coerce to Number.

  If A or B is used but some rows lack en, MERGE English from (in order) lines.json by sentence index / exact text, or from 解说词_定稿.md.

  C. FALLBACK (needed TODAY — A and B do not exist yet):
     Parse all 77 sentences from 解说词_定稿.md (the markdown table). English: lines after 英文： and 英文续卡： (also tolerate <br>).
     You MAY also read lines.json, which already has n, text, en (with " | "), chapter, seg, hanzi — use it to make parsing robust, but if it disagrees with 定稿 on Chinese text, prefer 定稿 and log the mismatch.
     Estimated timing formula (document in README and in the returned `source` string):
        duration_i = hanzi_i * 0.22 + 0.4   seconds
        start_0 = 0; start_{i+1} = end_i;  end_i = start_i + duration_i
        hanzi = count of Chinese characters in the spoken sentence, excluding ASCII letters/digits, punctuation, and citation marks [n], matching the 定稿 字数 column when present.
     Mark source as 'estimate' / '定稿+estimate'. This is NOT final audio timing.

  The loader must work when called with explicit paths, and also with defaults pointing at the locations above so `assemble` can just call it.

  Write a cached snapshot the pipeline can reuse, e.g.
    assembly/qa/cues_estimate.json
  (ok to overwrite). Include source and formula fields.

================================================================================
2) assembly/pipeline/  — assemble script
================================================================================
Provide assemble.sh and/or assemble.mjs (bash + node/python is fine) plus a short README.md.

Usage (suggested flags, names can vary if documented):
  assemble.sh \
    --scene-video <path>        # optional 1080p video of rendered scenes; default: generate a paper-colour (#F4EFE6) 1920×1080 placeholder of the needed duration \
    --cues <path>               # optional; default: loadCues() as specified \
    --voice <wav>               # optional; default: 配音/全稿_v3/旁白_v3.wav if it exists, else silence of the content duration \
    --music <wav/aiff/mp3>      # optional; default: silence (do NOT reuse old-film music from v4_mix) \
    --endcard-dir <dir>         # default: ../endcard \
    --fps 30 \
    --out-dir assembly/qa \
    --out-name dryrun_测试 \
    --content-duration <sec>    # optional clip of the first N cues, see dry run \
    --blind                     # also emit a metadata-stripped copy

Pipeline steps:

  1. Load cues. Determine content duration (full last cue end, or --content-duration). Endcard is always 12.0 s after the content. Total = content + 12.

  2. Scene video: if --scene-video is missing, generate a 1920×1080 30 fps yuv420p H.264 placeholder filled with #F4EFE6 for `content` seconds (ffmpeg lavfi color). If a scene video is provided, trim or pad (paper frames) to the content duration, scale/crop only if needed to 1920×1080, do not change look otherwise.

  3. Subtitle overlay:
     Render a subtitle layer in the browser (Playwright, same font loading as index.html).
     Preferred: transparent PNG sequence (alpha) for the subtitle band: pixels above BAND.fadeTop stay fully transparent; from fadeTop, draw safeFade + Chinese + English. Overlay onto the scene video with ffmpeg overlay=0:0.
     Alternative acceptable for the dry run: render full paper+subtitle frames and use those as the content video (since the placeholder is already paper). Still implement the transparent-band path or document it, because real scene video will arrive later.
     Must wait for MixSans to be loaded before any measureText / draw.
     xfade defaults to false for the dry run.

  4. Endcard video (12 s, 30 fps, 1920×1080):
     Do NOT edit endcard files. Write pipeline/render_endcard.mjs (or a function in the assembler) that loads endcard/index.html the same way endcard/render.mjs does (route http://endcard.local/**, wait for window.READY, call window.render(t) for t in [0, 12) at 30 fps) and encodes to a short mp4. Fill paper via the page's own render().
     Concatenate: [content with subs] then [endcard]. Audio of the endcard is silence unless music is long enough to continue (if music exists, allow it to play under the endcard, faded out in the last ~0.8 s; if no music, endcard is silent).

  5. Audio mux:
     - Voiceover starts at t=0 of the content and must not overrun the content (do not play voice over the endcard). Pad with silence to content duration if short; trim if long.
     - Music starts at t=0 and may cover content + endcard, then fade out.
     - Duck music under the voice with ffmpeg sidechaincompress (e.g. threshold=0.05:ratio=8:attack=50:release=300, then amix). If either input is missing, substitute an equal-length silent track so the graph still runs.
     - Loudness target of the MIXED programme: integrated -14 LUFS, true peak ≤ -1 dBTP. Use ffmpeg loudnorm (two-pass recommended). If BOTH voice and music are silence, skip loudnorm (it misbehaves on digital silence) and write that fact in the report; still produce a valid silent stereo 48 kHz stream.
     - Output stereo 48 kHz AAC (or PCM wav intermediate + AAC in the mp4).

  6. Outputs:
     - 1080p H.264 yuv420p + AAC, +faststart:  <out-dir>/<out-name>.mp4
     - 720p (1280×720) small version:         <out-dir>/<out-name>_720p.mp4
     - Write a short JSON or text report with durations, cue source, loudness measurements, file paths.

  7. Blind-review step (always run for the dry run; also a standalone script pipeline/blind_review.sh):
     a) Produce a copy <out-dir>/<out-name>_盲审.mp4 (or _blind.mp4 plus a Chinese-named copy — use 盲审 in the filename) by remuxing/re-encoding with:
          -map_metadata -1  -fflags +bitexact  -flags:v +bitexact  -flags:a +bitexact
          no title / artist / author / comment / description / genre / composer / encoded_by
          no stream tags (handler_name, encoder) if you can strip them
        Goal: ffprobe -hide_banner -show_format -show_streams must NOT contain author / school / supervisor / encoder-identifying strings.
        Search the ffprobe text (case-insensitive) for: encoder, lavf, lavc, libx264, libfdk, HandBrake, author, artist, title, comment, description, 三峡, Sharpton, Gisele, 导师, 指导, copyright.
        It is acceptable if a technical codec name like "H.264 / AVC" or "aac" remains as a codec identifier, but "encoder" tags such as "Lavf...", "Lavc...", "x264" in TAG:encoder / TAG:handler_name / format tags must be gone. If ffmpeg cannot strip a particular encoder tag without a re-encode, re-encode with bitexact flags rather than leave it.
        Verify with ffprobe and write the full probe (or the tag section) plus a PASS/FAIL line to assembly/qa/blind_ffprobe.txt.
     b) Grep all visible strings that will appear on screen or in cue files:
          - assembly/endcard/data/endcard.json  (READ only)
          - the loaded cues (text, en, englishCards, ch)
          - any other JSON/TSV the pipeline emits that could go on screen
        Patterns (report every hit with file and snippet): 三峡, Sharpton, Gisele, 导师, 指导
        【待填】 is NOT a fail; leave it alone (Gisele still has two blanks to fill).
        Write assembly/qa/blind_strings.txt. If there are hits, list them clearly; do not silently edit endcard.json.

  Keep intermediate frames under assembly/qa/tmp/ or /tmp and document; they do not need to be kept after a successful run (you may delete large PNG sequences to save disk, but keep the 3 sample frames).

================================================================================
3) DRY RUN (you must execute this)
================================================================================
Produce:
  /workspace/病理科普视频/v5/assembly/qa/dryrun_测试.mp4
    ~30 s total: first N cues from the fallback (or real) timeline covering about 17–18 s of content, then the 12 s endcard.
    Using the estimate formula, the first 5 sentences end at 17.40 s (14,12,16,15,13 hanzi). Use those 5 cues (ids 01–05) as the content, optionally pad the last hold with paper so content is 18.00 s; then append 12 s endcard. Total ≈ 29.4–30.0 s.
    Placeholder paper scene + subtitles + endcard. Voice/music will likely be missing; that is OK (silence).
  /workspace/病理科普视频/v5/assembly/qa/dryrun_测试_720p.mp4
  /workspace/病理科普视频/v5/assembly/qa/dryrun_测试_盲审.mp4

  Three sample frames (1920×1080 PNG) in assembly/qa/frames/ :
    1. Mid-point of sentence 01 (opening Chinese + first/second English card as timed).
    2. A frame showing the LONGEST English line in this dry-run window. Among ids 01–05, sentence 03 English is the single card
       "These colors reveal how tissue is injured." (42 characters) — use a mid-sentence-03 frame and name it so this is obvious, e.g. 帧_02_最长英文_s03.png
    3. Endcard A fully visible, i.e. local t=3 (file time ≈ contentDur+3).
  Also write assembly/qa/dryrun_report.md with: cue source, timings of 01–05, typography constants, BAND, file sizes/durations, loudness, blind-review PASS/FAIL, overflow list (should be empty at 42 px for these cards), any blockers.

Self-checks you must run and record in the report:
  - All 77 cues parse from the fallback (even if the video only uses 5). Log count = 77, first and last text.
  - Measure all English cards at 42 px; list any that shrink below 42 or overflow at 28. (Current cards are all ≤ 42 characters; most should fit at 42 px. Do not fail the build if a rare overflow is only logged.)
  - Content pixels of subtitles: Chinese/English ink and halo should sit in y ≥ 810 (halo may start ~y 915+). The fade may begin at 810. Fail if ink is above y=810.
  - Endcard render stays unmodified: do not rewrite endcard.json; the word 【待填】 must still be present in that file after you finish.
  - Duration of dryrun_测试.mp4 is 29–31 s; 1920×1080; has an audio stream (even if silent).
  - ffprobe on the 盲审 file meets the tag rules.

================================================================================
DONE
================================================================================
Print a concise summary:
  files created (paths)
  typography / BAND
  cue source and 77-count
  dry-run durations and paths
  blind-review result
  anything blocked
Do not git commit. Last line: EXIT 0  (or EXIT 1 with the reason).
