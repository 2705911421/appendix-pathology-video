# v5 bilingual subtitles

Standalone subtitle band for the new pathology film. Drop this folder into a host as-is. It does not import `v4_mix` or `v5/lib`.

## Host

Serve the folder over HTTP (ES modules). Open `index.html`, or import the module from your own canvas:

```js
import { drawSubtitles, safeFade } from './subtitle/subtitle.js';

// Clear the frame first. drawSubtitles paints the fade and the current line;
// it does not erase the previous frame.
ctx.clearRect(0, 0, 1920, 1080);
drawSubtitles(ctx, t, cues, { dark: 0, xfade: false });
```

`index.html` loads MixSans (weights 400 and 500, at the live sizes and the old comparison sizes) before `window.READY`. `window.render(t)` fills paper `#F4EFE6`, draws the safe fade, then the subtitles. `window.renderOverlay(t)` leaves y < 950 transparent so a scene plate can show through. Set `window.CUES` before rendering. Stills:

```
node subtitle/render.mjs --cues qa/cues_estimate.json --t 1.74,8.48 --out-dir qa/frames
```

Playwright uses system Chrome (`CHROME_PATH` or `/usr/bin/google-chrome`).

## API

| Export | Role |
|---|---|
| `drawSubtitles(ctx, t, cues, { dark, xfade, paper })` | Cue with `t` in `[start, end)`, then fade + one Chinese line + one English card. No-op if none. |
| `safeFade(ctx, paper, dark)` | Short soft paper fade from `BAND.fadeTop` to `BAND.fadeEnd`. It does not paint a solid slab down to y=1080. |
| `loadCues(options)` | Node: read narration / TSV / 定稿. Browser: `fetch` `options.url` or a snapshot. |
| `loadCuesFromFs(paths)` | Same loader, filesystem only (`subtitle/loadCues.js`). |
| `split`, `linesFor` | Chinese wrap and per-line timing. `linesFor` strips `[n]` citations from the drawn line. The cue's `text` keeps them. |
| `measureEnglish`, `consumeOverflow` | Fit one card from 30 px down to 24 px. Overflows at 24 px are drawn and logged. |
| `CN_SIZE`, `EN_SIZE`, `EN_FLOOR`, `EN_MAX_W`, `BAND`, `MAX` | Live constants. Every number is defined in `config.js`. |

`dark > 0.5` uses fill `#EFE8DC` and halo `rgb(17,17,20)`. Otherwise ink `#2A2A35` and a paper halo (stroke 6, shadow blur 10). No black stroke and no box. Chinese words in the approved `ACCENT` list use vermilion `#D6453A`. English is never accented.

`drawSubtitles(..., { preset: 'old' })` paints the previous sizes. The default preset is `current`. Do not switch the film to `old`.

## Typography

All of these live in `config.js`. The table is the live `current` preset.

| Item | Value |
|---|---|
| Chinese | 52 px, weight 500. One line at a time, centered at x=960, baseline `cnY` 1010. |
| English | 30 px, weight 400, baseline `enY` 1050. Never wraps, never ellipsis. |
| Floor | 24 px. If the card is still wider than 1840 px, draw it and record it. |
| Max English width | 1840 px (40 px inset each side). |
| Chinese budget | 18 visual characters. Quotes `“”"` do not count. Breaks on `，。；：？！、` and `——`. Trailing `，。；、` is dropped on screen. |
| Font | `"MixSans","Noto Sans CJK SC","Noto Sans SC",sans-serif` |
| Halo | stroke 6, shadow blur 10 |

`cnY` does not move when English is missing.

`PRESETS.old` (alias `v1`) keeps the previous look for the comparison still only: Chinese 68 px, English 42 px, floor 28 px, `cnY` 986, `enY` 1038, fade 810→910, then a solid paper slab.

## Safe area

Picture content may extend to **y < 950**. `BAND.fadeTop` and `BAND.safeTop` are 950. Tell mini that the picture safe-area top is y=950, so scene art can move down to just above that line.

The backing is a soft scrim from y=950. It peaks at y=961 (opacity 0.16), just above the dense Chinese halo, is 0.05 at the English descent, and is clear again at y=1080. It is not a solid paper slab, and it does not end in a hard edge. The halo keeps the glyphs readable.

Measured with MixSans in Chrome, at these baselines:

| | y |
|---|---|
| fadeTop / safeTop | 950 |
| fadeEnd | 961 |
| Chinese halo (first alpha) | 952 |
| Chinese ink | 965–1015 |
| cnY | 1010 |
| English cap | 1028 |
| English ink | 1026–1056 |
| enY | 1050 |

Chinese descent (y=1015) to the English cap (y=1028) is 13 px. The English descent ends 24 px above y=1080. Ink and halo stay at y ≥ 950.

## Cue

```js
{ i, id, ch, start, end, text, en, englishCards }
```

- `i` is 0-based. `id` is `"01"`…`"77"`.
- `ch` keeps the section title and, when known, ka moji's segment, for example `"01 开场"`. `seg` is also stored.
- `text` is the Chinese sentence, citations included.
- `en` joins cards with `" | "` for TSV compatibility.
- `englishCards` is one string per card.

## English cards

If `en` contains `" | "` (spaces around the pipe), or `englishCards` is already an array, the cards play **one after another** across `[start, end)`. Time is shared by character count. They are never stacked. Chinese line timing is independent: a Chinese wrap does not change the English card.

Default fades: each Chinese line fades in 0.12 s and out 0.08 s. Each English card fades on its own edges with the same timing, so a Chinese wrap does not blink the English.

`{ xfade: true }`: hard-cut inside the sentence. Only the first Chinese line fades in and the last fades out. English cards do the same (first card in, last card out).

## Where timings come from

`loadCues()` / `loadCuesFromFs()` stop at the first source that exists and has usable `start`/`end`:

1. `配音/全稿_v3/narration.json` — `{ segments: [{ id, ch, start, end, text, en }] }`.
2. `配音/全稿_v3/sentences.tsv` — header `段 起 止 时长 句子 en`. Cells are trimmed; times are numbers.
3. Fallback (used until the wav is finished): the 77-row table in `解说词_v2/解说词_定稿.md`. `lines.json` supplies `seg` and is checked for mismatches. If Chinese text disagrees, the 定稿 wins and the mismatch is logged.

If a narration or TSV row has an empty `en`, English is filled from `lines.json` (same index, else exact Chinese) and then from the 定稿.

Pass `{ cues: '/path/to/snapshot.json' }` to skip the search. The pipeline writes `qa/cues_estimate.json` with `source`, `formula`, and `cues`.

### Estimate

Not final audio timing.

```
duration_i = hanzi_i * 0.22 + 0.4    seconds
start_0 = 0
end_i = start_i + duration_i
start_{i+1} = end_i
```

`hanzi` is the 定稿 字数 column when present: Chinese characters in the spoken sentence (U+4E00–U+9FFF), excluding ASCII letters and digits, punctuation, and citation marks `[n]`. The loader evaluates that formula in whole milliseconds (`hanzi * 220 + 400`).

`source` is `定稿+estimate`.
