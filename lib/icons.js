// v5 clinical icons only; no clocks or unrelated old-story disease icons.
// detail: every shape goes through ink() with a stable key, so Rough.js boil variants (key#v) still apply.
// detail: no hatching. Daily stroke 1.4–3, bowing .8. The hospital cross is the one 4.5 十字.
// detail: geometry is a pure function of the arguments (no Math.random, no Date, no frame state).
import { C } from './tokens.js';
import { ink } from './ink.js';
import { drawWash } from './wash.js';

const R = { roughness: .8, bowing: .8, disableMultiStroke: false };

function glyph(ctx, x, y, s, alpha, draw) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (alpha != null) ctx.globalAlpha *= alpha;
  draw();
  ctx.restore();
}

function mark(ctx, key, kind, args, o, opt) {
  ink(ctx, key, kind, args, { ...R, seed: 3, ...o }, opt);
}

// detail: rounded rect as one Rough path so the bottle/sign corners boil with the stroke.
function roundRect(x, y, w, h, r) {
  const x2 = x + w, y2 = y + h;
  return `M ${x + r} ${y} L ${x2 - r} ${y} Q ${x2} ${y} ${x2} ${y + r} L ${x2} ${y2 - r} Q ${x2} ${y2} ${x2 - r} ${y2} L ${x + r} ${y2} Q ${x} ${y2} ${x} ${y2 - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
}

export function iconHospital(ctx, x, y, opt = {}) {
  const k = opt.k ?? 1, a = opt.alpha ?? 1;
  glyph(ctx, x, y, opt.s ?? 1, a, () => {
    mark(ctx, 'c07.ico.hosp.roof', 'curve', [[[-66, -62], [0, -84], [66, -62]]], { strokeWidth: 2.2, seed: 871 }, { k });
    mark(ctx, 'c07.ico.hosp.eave', 'line', [-72, -60, 72, -60], { strokeWidth: 2.4, seed: 872 }, { k });
    mark(ctx, 'c07.ico.hosp.body', 'rectangle', [-56, -58, 112, 100], { strokeWidth: 2.2, fill: C.paper, fillStyle: 'solid', seed: 873 }, { k });
    mark(ctx, 'c07.ico.hosp.door', 'rectangle', [-20, -4, 40, 46], { strokeWidth: 1.8, seed: 874 }, { k });
    mark(ctx, 'c07.ico.hosp.slit', 'line', [0, -4, 0, 42], { strokeWidth: 1.6, seed: 875 }, { k });
    mark(ctx, 'c07.ico.hosp.step1', 'line', [-32, 46, 32, 46], { strokeWidth: 2.2, seed: 876 }, { k });
    mark(ctx, 'c07.ico.hosp.step2', 'line', [-44, 56, 44, 56], { strokeWidth: 2.2, seed: 877 }, { k });
    // detail: sign is C.paper (no new white). The wash tints it pale vermilion.
    mark(ctx, 'c07.ico.hosp.sign', 'ellipse', [0, -106, 48, 48], { strokeWidth: 2, fill: C.paper, fillStyle: 'solid', seed: 878 }, { k });
    if (opt.wash) drawWash(ctx, opt.wash, 0, -106, 40, { alpha: .75 * Math.min(1, k * 1.3), grow: Math.min(1, Math.max(k, 0)) });
    mark(ctx, 'c07.ico.hosp.cx', 'line', [0, -120, 0, -92], { stroke: C.red, strokeWidth: 4.5, seed: 879 }, { k });
    mark(ctx, 'c07.ico.hosp.cy', 'line', [-14, -106, 14, -106], { stroke: C.red, strokeWidth: 4.5, seed: 880 }, { k });
  });
}

/** Small red bar placed before an end-card subhead. Local rect, so one cached shape serves every heading. */
export function iconThermo(ctx, x, y, opt = {}) {
  const k = opt.k ?? 1, a = opt.alpha ?? 1, s = opt.s ?? 1;
  glyph(ctx, x, y, s, a, () => {
    mark(ctx, 'c07.ico.th.stem', 'rectangle', [-4, -18, 8, 26], { strokeWidth: 1.8, fill: C.paper, fillStyle: 'solid', seed: 901 }, { k });
    mark(ctx, 'c07.ico.th.bulb', 'ellipse', [0, 12, 16, 16], { strokeWidth: 1.8, fill: C.red, fillStyle: 'solid', seed: 902 }, { k });
    mark(ctx, 'c07.ico.th.merc', 'line', [0, 8, 0, -8], { stroke: C.red, strokeWidth: 2.2, seed: 903 }, { k });
    [-12, -4, 4].forEach((ty, i) => mark(ctx, 'c07.ico.th.tk' + i, 'line', [5, ty, 9, ty], { strokeWidth: 1.4, seed: 904 + i }, { k }));
  });
}

/** Open hand — 拒按. Palm plus three fingers and a thumb. No hatching. */
