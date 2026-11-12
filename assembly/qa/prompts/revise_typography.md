TASK: Revise the v5 assembly subtitle typography. Do NOT start over. Keep the existing standalone module, cue loader, assemble pipeline, endcard integration, dry-run and blind-review scripts. Only change typography/config and re-render the affected dry-run frames / video as needed.

CWD: /workspace/病理科普视频/v5/assembly/

HARD BOUNDARIES (same as before):
- Write only under assembly/subtitle/, assembly/pipeline/, assembly/qa/
- Do NOT modify assembly/endcard/** (any file or string)
- Do not edit v5/scenes, v5/lib, v5/main.js, v5/data, v5/package.json
- Do not git commit

WHY: Gisele found the 68/42 subtitles too big — they squeeze the main picture and the backing reads as a wide strip. Shrink the type, drop the band, lighten the backing, put every size in one config.

NEW DEFAULTS (must be the live values after this pass):
  Chinese: 52 px, weight 500
  English: 30 px, weight 400, auto-shrink floor 24 px (still one line, no wrap, no ellipsis, EN_MAX_W stays 1840)
  Tighter line gap
  Chinese baseline ≈ 1010
  English baseline ≈ 1050
  Band top / picture safe-area top ≈ y 950  (content may now go down to y < 950, not 810)
  Lighter backing: do not paint a tall solid paper slab. Use a short, soft fade that starts near the band top and is only as opaque as needed to keep the halo/glyphs readable. The footer must not look like a big closed strip. Fade end should sit just above the Chinese halo.

Measure with MixSans (already loaded in the preview page). You may nudge baselines by a few pixels after measuring so that:
  - English descent has a modest bottom margin (~18–28 px to y=1080)
  - Gap from Chinese descent to English cap is tight but readable (~10–16 px)
  - Chinese halo top stays at or below the safe-area top (do not let ink or halo invade y < safeTop)
  - safeTop / fadeTop is about 950 (report the exact integer you land on)

CONFIG: put EVERY typography number in one file, e.g. assembly/subtitle/config.js (or config.json imported by the module). That file is the single source of truth: CN_SIZE, EN_SIZE, EN_FLOOR, EN_MAX_W, MAX, font weights, BAND (fadeTop, fadeEnd, cnY, enY, safeTop), fade opacity stops, halo stroke/blur, colours. subtitle.js and the renderer must read this config — no leftover magic 68/42/810/986/1038 in draw code.

Also keep a named preset in the same config for the OLD sizes, used only by the comparison still (do not make it the default):
  old / v1: CN 68, EN 42, EN_FLOOR 28, cnY 986, enY 1038, fadeTop 810, fadeEnd 910, original heavier fade

Public exports (CN_SIZE, EN_SIZE, EN_FLOOR, BAND, drawSubtitles, safeFade, …) must reflect the NEW defaults. safeFade must use the new, lighter band.

Update subtitle/README.md and any pipeline comments that still say 68/42 or y<810. Mention the new safe-area top (exact y) so mini can lower picture content to y < that value.

DRY RUN additions (plus re-render the previous 3 frames and the ~30 s mp4 if they were made with 68/42):
  1. Keep/update the three sample frames (s01 mid, longest English s03, endcard A at local t=3) at the NEW sizes.
  2. NEW comparison still: assembly/qa/frames/对比_字幕字号.png
     Same sentence (prefer s03, the 42-char English line "These colors reveal how tissue is injured.") composited as old 68/42 (with old band) vs new 52/30 (with new band). Stacked or side-by-side, 1920 wide is fine; label each half clearly 「原 68 / 42，安全区 810」 and 「新 52 / 30，安全区 <actual>」. Same Chinese+English text, paper background.
  3. NEW phone preview: assembly/qa/frames/预览_手机竖屏.png
     Take a 1920×1080 NEW-size frame (s03 is fine) and scale it to 390 px wide (height scales to 219.375 ≈ 219 or 220 px). This simulates a 1080p landscape film shown full-width on a phone held upright. You may add a simple phone-bezel or just the scaled frame; the point is to judge whether 52/30 is readable at that size. If you also want a second strip of just the subtitle band scaled to 390, that can be a bonus file 预览_手机竖屏_条.png.

Re-run or patch dryrun_测试.mp4 / _720p / _盲审 so the video itself uses the NEW typography. Re-run the blind-review metadata/string check if you remux. Do not change endcard.json; 【待填】 stays.

Update assembly/qa/dryrun_report.md with:
  - exact new BAND / sizes from config
  - the NEW picture safe-area top y (this is the number to tell mini)
  - whether any English card shrinks below 30 px or overflows at 24 px
  - paths of the comparison and phone frames
  - confirmation that ink/halo stay at y ≥ safeTop

Print a short summary: new sizes, exact safeTop, files updated, dry-run paths, any blockers.
Last line: EXIT 0 (or EXIT 1 with the reason). Do not git commit.
