// Design tokens — the ONLY place colours / fonts / sizes are defined.
export const C = {
  paper: '#F4EFE6', grid: 'rgba(42,42,53,.07)',
  ink: '#2A2A35',      // structure, text
  red: '#D6453A',      // vermilion = living tissue / inflammation / accent
  vio: '#6B4C9A',      // HE purple = nuclei, microscopy only
  // tint (not a 4th hue): muted ochre for pus / purulent coating only — derived as a grey-warm mix of ink+vermilion+paper
  pus: '#B39459',
  subAccent: '#F07A63', // vermilion lifted for legibility inside subtitles
};
export const FONT = '"MixSans","Noto Sans CJK SC","Noto Sans SC",sans-serif';
export const W = 1920, H = 1080;
export const SAFE = { subY: 1012, fadeTop: 900 };   // subtitle baseline; nothing busy below fadeTop
