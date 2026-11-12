// Single source of truth for subtitle typography.
// subtitle.js, index.html, and the assembler read these values.
// `current` is the live default. `old` / `v1` is the previous 68/42 band,
// used only by the comparison still.

export const FONT = '"MixSans","Noto Sans CJK SC","Noto Sans SC",sans-serif';

export const FRAME = Object.freeze({ w: 1920, h: 1080, cx: 960 });

export const COLOURS = Object.freeze({
  paper: '#F4EFE6',
  paperRgb: '244,239,230',
  ink: '#2A2A35',
  accent: '#D6453A',
  darkInk: '#EFE8DC',
  darkRgb: '17,17,20',
});

// Halo recipe shared by both presets: paper (or dark) stroke, then the fill.
export const HALO = Object.freeze({
  stroke: 6,
  blur: 10,
  shadowAlpha: 0.9,
  strokeAlpha: 0.82,
});

// Chrome + MixSans, weight 500 at 52 px, baseline 1010 (s03 and the tallest cue glyphs):
//   halo alpha begins at y=952, dense stroke at y=962, ink y=965–1015.
// Weight 400 at 30 px, baseline 1050:
//   English ink y=1026–1056, cap top y=1028, descent ends 24 px above y=1080.
// Gap from the Chinese descent (y=1015) to the English cap (y=1028) is 13 px.
// safeTop 950 stays above that halo. The scrim peaks at fadeEnd 961, just above the
// dense halo, then eases to clear at the bottom of the frame. It is not a solid slab.

function band(fadeTop, fadeEnd, cnY, enY, safeTop) {
  return Object.freeze({ fadeTop, fadeEnd, cnY, enY, safeTop });
}

function fade(extend, stops) {
  return Object.freeze({
    extend,
    stops: Object.freeze(stops.map((s) => Object.freeze({
      t: Math.round(s.t * 10000) / 10000,
      a: s.a,
    }))),
  });
}

// `ease` stops are t along y = fadeTop → frame bottom. The peak is fadeEnd.
function easeFade(fadeTop, points) {
  const span = FRAME.h - fadeTop;
  return fade('ease', points.map((p) => ({ t: (p.y - fadeTop) / span, a: p.a })));
}

function preset(p) {
  return Object.freeze({
    id: p.id,
    cnSize: p.cnSize,
    enSize: p.enSize,
    enFloor: p.enFloor,
    enMaxW: 1840,
    max: 18,
    weightCn: 500,
    weightEn: 400,
    font: FONT,
    frame: FRAME,
    halo: HALO,
    colours: COLOURS,
    band: p.band,
    fade: p.fade,
  });
}

const CURRENT_TOP = 950;
const CURRENT_FADE_END = 961;
const current = preset({
  id: 'current',
  cnSize: 52,
  enSize: 30,
  enFloor: 24,
  band: band(CURRENT_TOP, CURRENT_FADE_END, 1010, 1050, CURRENT_TOP),
  // Peak just above the dense halo, then clear again at the frame bottom.
  fade: easeFade(CURRENT_TOP, [
    { y: CURRENT_TOP, a: 0 },
    { y: CURRENT_FADE_END, a: 0.16 },
    { y: 1056, a: 0.05 },
    { y: FRAME.h, a: 0 },
  ]),
});

const old = preset({
  id: 'old',
  cnSize: 68,
  enSize: 42,
  enFloor: 28,
  band: band(810, 910, 986, 1038, 810),
  // Original heavier fade: transparent at 810, solid paper by 910, then a solid slab to y=1080.
  fade: fade('solid', [
    { t: 0, a: 0 },
    { t: 1, a: 1 },
  ]),
});

export const PRESETS = Object.freeze({
  current,
  old,
  v1: old,
});

export const ACTIVE = PRESETS.current;

export const CN_SIZE = ACTIVE.cnSize;
export const EN_SIZE = ACTIVE.enSize;
export const EN_FLOOR = ACTIVE.enFloor;
export const EN_MAX_W = ACTIVE.enMaxW;
export const MAX = ACTIVE.max;
export const WEIGHT_CN = ACTIVE.weightCn;
export const WEIGHT_EN = ACTIVE.weightEn;
export const BAND = ACTIVE.band;
export const FADE = ACTIVE.fade;
export const PAPER = COLOURS.paper;
export const INK = COLOURS.ink;
export const ACCENT_RED = COLOURS.accent;

export function resolvePreset(id = 'current') {
  const found = PRESETS[id];
  if (!found) throw new Error('Unknown subtitle preset ' + id);
  return found;
}
