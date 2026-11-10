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
export const SAFE = Object.freeze({ contentBottom:950, zhBaseline:1010, enBaseline:1052 });
export const LAYOUT = Object.freeze({ main:{x:40,y:30,w:1840,h:910} });
export const TYPE = Object.freeze({ heading:52,diagnosis:48,body:38,source:32,zh:52,en:30 });
