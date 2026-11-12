# v5 assembly dry run

Cue source: `narration.json`. Count: **77**.
First: 这根形似小香肠的盲管，就是阑尾。
Last: 持续右下腹痛、发热，请及时就诊。

Mismatches vs lines.json / 字数 column: 0.

## Typography

| Item | Value |
|---|---|
| Chinese | 52 px, weight 500 |
| English | 30 px, weight 400, floor 24 px |
| English max width | 1840 px |
| Chinese wrap budget | 18 visual characters |
| fadeTop / safeTop | 950 |
| fadeEnd | 961 |
| cnY | 1010 |
| enY | 1050 |
| fade extend | ease |
| fade stops | 0→0, 0.0846→0.16, 0.8154→0.05, 1→0 |
| halo | stroke 6, blur 10, shadow 0.9, stroke alpha 0.82 |
| xfade | false |

Picture safe-area top: **y=950**. Scene art may extend down through y < 950. This is the number to give mini.
The backing is a soft scrim (ease) from y=950. Peak opacity 0.16 is at fadeEnd y=961, just above the dense Chinese halo. It eases out instead of becoming a solid paper slab.
Chinese baseline cnY=1010. English baseline enY=1050. Ink and the halo stay at y ≥ 950.

## Timing of the dry-run window

Content duration 21.7 s (last cue ends 20.9 s; the gap is a paper hold). Endcard 12 s. Expected total 33.7 s.

| id | ch | start | end | zh lines | en cards |
|---|---|---:|---:|---:|---:|
| 01 | 01 开场 | 0 | 4.1 | 1 | 2 |
| 02 | 01 开场 | 4.6 | 8 | 1 | 2 |
| 03 | 01 开场 | 8.4 | 12.3 | 1 | 1 |
| 04 | 01 开场 | 12.8 | 16.5 | 1 | 2 |
| 05 | 01 开场 | 16.9 | 20.9 | 1 | 2 |

**01** 这根形似小香肠的盲管，就是阑尾。

- 中 0–4.1 这根形似小香肠的盲管，就是阑尾
- EN 0–3.298 This small sausage-shaped tube is the
- EN 3.298–4.1 appendix.

**02** 发起炎来，它可能染上红、黄、黑。

- 中 4.6–8 发起炎来，它可能染上红、黄、黑
- EN 4.6–7.252 When inflamed, it may turn red, yellow,
- EN 7.252–8 then black.

**03** 每一次颜色流转，都记录着组织的伤痕。

- 中 8.4–12.3 每一次颜色流转，都记录着组织的伤痕
- EN 8.4–12.3 These colors reveal how tissue is injured.

**04** 循着这抹色彩，我们走进炎症的现场。

- 中 12.8–16.5 循着这抹色彩，我们走进炎症的现场
- EN 12.8–15.407 Follow the colors to understand
- EN 15.407–16.5 inflammation.

**05** 病理学里的“变质”，不是食物变坏。

- 中 16.9–20.9 病理学里的“变质”，不是食物变坏
- EN 16.9–20.219 In pathology, alteration has a specific
- EN 20.219–20.9 meaning.

## English measure

Cards measured: 136. Widest: 52 card 0 “Necrosis and hemoglobin breakdown products” 652.3px at 30px.
Shrinks below 30 px: 0. Overflows at the 24 px floor: 0.
Every English card fits at 30 px. None shrink below 30, and none overflow at 24 px.

## Sample frames

- 帧_01_句01中点.png at t=2.05 shows “这根形似小香肠的盲管，就是阑尾” / “This small sausage-shaped tube is the”.
- 帧_02_最长英文_s03.png at t=10.35 shows “These colors reveal how tissue is injured.”.
- 帧_03_片尾A_t3.png is endcard local t=3 (file time ≈ 24.7 s), 1920×1080.

Safe-area scan (non-paper pixels above y=950 fail; ink must exist at y≥950):

- 帧_01_句01中点.png 1920×1080 above=0 minInkY=965 inkPixels=18463 PASS
- 帧_02_最长英文_s03.png 1920×1080 above=0 minInkY=965 inkPixels=19693 PASS
- Overlay alpha: pixels above y=950 with alpha≠0: 0; opaque pixels in the band: 11353.

Ink and halo stay at y ≥ 950. Full-frame ink starts at or below the safe area, and the subtitle overlay has no alpha above it.

Comparison and phone preview:

- /workspace/病理科普视频/v5/assembly/qa/v3check/frames/对比_字幕字号.png (1920×2320)
  - 「原 68 / 42，安全区 810」
  - 「新 52 / 30，安全区 950」
- /workspace/病理科普视频/v5/assembly/qa/v3check/frames/预览_手机竖屏.png (390×219) — 1920×1080 frame scaled to 390 px wide.
- /workspace/病理科普视频/v5/assembly/qa/v3check/frames/预览_手机竖屏_条.png (390×26) — subtitle band from y=950, same scale.

## Outputs

Scene: placeholder #F4EFE6.
Master: /workspace/病理科普视频/v5/assembly/qa/v3check/第01章_真配音试装.mp4 3.96 MB, 33.700 s, 1920×1080 yuv420p h264, audio aac 48000 Hz 2 ch.
720p: /workspace/病理科普视频/v5/assembly/qa/v3check/第01章_真配音试装_720p.mp4 1.40 MB, 33.700 s.

## Loudness

loudnorm two-pass. Integrated -14 LUFS, true peak -2.27 dBTP. Target -14 LUFS, true peak ≤ -1 dBTP.
Voice file: /workspace/病理科普视频/配音/全稿_v3/旁白_v3.wav. Music file: none (v4 music is not reused).

## Blind review

Endcard files unchanged: true. 【待填】 still present: true.
Blind result: skipped.

## Blockers

- duration 33.7s is outside 29–31

Intermediate PNG sequences live in `qa/tmp/` during the run and are deleted after a successful encode. The three sample frames are kept.
