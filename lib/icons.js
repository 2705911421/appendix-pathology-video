// detail: ch07 hand-drawn icons. Opt-in — only chapters/07.js imports this file, so 04–06 stay pixel-identical.
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

function starPts(rOut, rIn, n, spin = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = spin + (i * Math.PI) / n, r = i % 2 ? rIn : rOut;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

/** Ankle in profile with two bandage wraps. Natural size ~48 px; pass s to land in 40–60. */
export function iconAnkle(ctx, x, y, opt = {}) {
  const k = opt.k ?? 1, a = opt.alpha ?? 1, s = opt.s ?? 1.15;
  glyph(ctx, x, y, s, a, () => {
    mark(ctx, 'c07.ico.ankle.legO', 'curve', [[[-8, -24], [-11, -4], [-4, 8]]], { strokeWidth: 2.2, seed: 811 }, { k });
    mark(ctx, 'c07.ico.ankle.legI', 'curve', [[[7, -24], [8, -6], [11, 6]]], { strokeWidth: 2, seed: 812 }, { k });
    mark(ctx, 'c07.ico.ankle.foot', 'curve', [[[-4, 8], [8, 14], [24, 12], [26, 18], [2, 20], [-16, 12], [-10, 6]]], { strokeWidth: 2.2, seed: 813 }, { k });
    mark(ctx, 'c07.ico.ankle.wrap', 'curve', [[[-16, -4], [0, -10], [16, -2]]], { strokeWidth: 2.4, seed: 814 }, { k });
    // detail: the second wrap is vermilion — the sprain, not a new hue.
    mark(ctx, 'c07.ico.ankle.wrapR', 'curve', [[[-14, 6], [0, 0], [15, 8]]], { stroke: C.red, strokeWidth: 2.2, seed: 815 }, { k });
    mark(ctx, 'c07.ico.ankle.knot', 'circle', [16, 2, 7], { strokeWidth: 1.6, seed: 816 }, { k });
  });
}

/** Skin patch. Rash itself is the baked dot wash (opt.wash), plus a few solid dots so it still reads. */
export function iconRash(ctx, x, y, opt = {}) {
  const k = opt.k ?? 1, a = opt.alpha ?? 1, s = opt.s ?? 1.15;
  glyph(ctx, x, y, s, a, () => {
    if (opt.wash) drawWash(ctx, opt.wash, 0, 2, 34, { alpha: .72 * Math.min(1, k * 1.4), grow: Math.min(1, Math.max(k, 0)) });
    mark(ctx, 'c07.ico.rash.skin', 'ellipse', [0, 2, 46, 32], { strokeWidth: 2, seed: 821 }, { k });
    [[-14, -4], [-4, 3], [8, -3], [15, 6], [-6, 9], [3, -8]].forEach((p, i) => {
      mark(ctx, 'c07.ico.rash.d' + i, 'circle', [p[0], p[1], 5.5], { stroke: C.red, strokeWidth: 1.4, fill: C.red, fillStyle: 'solid', disableMultiStroke: true, seed: 822 + i }, { k });
    });
  });
}

/** Two bone ends and a 4-point urate crystal in the joint gap. */
export function iconGout(ctx, x, y, opt = {}) {
  const k = opt.k ?? 1, a = opt.alpha ?? 1, s = opt.s ?? 1.15;
  glyph(ctx, x, y, s, a, () => {
    mark(ctx, 'c07.ico.gout.bL', 'ellipse', [-15, 2, 26, 20], { strokeWidth: 2, fill: C.paper, fillStyle: 'solid', seed: 831 }, { k });
    mark(ctx, 'c07.ico.gout.bR', 'ellipse', [15, 2, 26, 20], { strokeWidth: 2, fill: C.paper, fillStyle: 'solid', seed: 832 }, { k });
    mark(ctx, 'c07.ico.gout.star', 'polygon', [starPts(13, 5, 4)], { stroke: C.red, strokeWidth: 1.5, fill: C.red, fillStyle: 'solid', roughness: .55, disableMultiStroke: true, seed: 833 }, { k });
  });
}

/** Rounded bottle: cap ridges, label band, three pills, inner glass highlight. Origin is the label centre. */
export function iconBottle(ctx, x, y, opt = {}) {
  const k = opt.k ?? 1, a = opt.alpha ?? 1;
  glyph(ctx, x, y, opt.s ?? 1, a, () => {
    mark(ctx, 'c07.ico.bot.body', 'path', [roundRect(-36, -44, 72, 108, 16)], { strokeWidth: 2.2, fill: C.paper, fillStyle: 'solid', seed: 841 }, { k });
    mark(ctx, 'c07.ico.bot.neck', 'rectangle', [-20, -52, 40, 12], { strokeWidth: 1.8, fill: C.paper, fillStyle: 'solid', seed: 842 }, { k });
    mark(ctx, 'c07.ico.bot.cap', 'path', [roundRect(-28, -74, 56, 24, 5)], { strokeWidth: 2, fill: C.paper, fillStyle: 'solid', seed: 843 }, { k });
    [-14, 0, 14].forEach((rx, i) => mark(ctx, 'c07.ico.bot.ridge' + i, 'line', [rx, -70, rx, -54], { strokeWidth: 1.5, seed: 844 + i }, { k }));
    mark(ctx, 'c07.ico.bot.band', 'rectangle', [-36, -22, 72, 32], { strokeWidth: 1.6, seed: 848 }, { k });
    [[-16, 30, 18, 11], [4, 34, 16, 10], [-4, 48, 15, 10]].forEach((e, i) => {
      mark(ctx, 'c07.ico.bot.pill' + i, 'ellipse', e, { strokeWidth: 1.5, fill: C.paper, fillStyle: 'solid', disableMultiStroke: true, seed: 849 + i }, { k });
    });
    // detail: inner highlight — a thin ink curve, no extra colour.
    mark(ctx, 'c07.ico.bot.hi', 'curve', [[[-22, -28], [-26, 4], [-20, 36]]], { strokeWidth: 1.4, roughness: .5, seed: 853 }, { k, alpha: .55 });
  });
}

/** Prohibition slash as a filled polygon with pointed ends (a stroke cannot taper). opt.k fades the whole mark so the fill is not held until k = 1. */
export function iconSlash(ctx, a, b, opt = {}) {
  const alpha = (opt.alpha ?? 1) * Math.min(1, Math.max(opt.k ?? 1, 0));
  if (alpha <= 0) return;
  const [x0, y0] = a, [x1, y1] = b, dx = x1 - x0, dy = y1 - y0;
  const L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, w = opt.w ?? 8;
  const p = (t, s) => [x0 + dx * t + nx * w * s, y0 + dy * t + ny * w * s];
  // detail: tips at both ends; the wide points sit inboard so the slash reads as a stroke that thins out.
  const pts = [p(0, 0), p(.2, 1), p(.8, .65), p(1, 0), p(.8, -.65), p(.2, -1)];
  mark(ctx, opt.key || 'c07.ico.slash', 'polygon', [pts], { stroke: C.red, strokeWidth: 1.6, fill: C.red, fillStyle: 'solid', roughness: .6, seed: opt.seed ?? 860 }, { k: 1, alpha });
}

/**
 * Small hospital: eave, double-door slit, two steps, red cross on a paper-white round sign.
 * opt.wash is a pale-red baked blot drawn inside the sign. Anchor = facade centre.
 */
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
export function iconBar(ctx, x, y, opt = {}) {
  const k = opt.k ?? 1, a = opt.alpha ?? 1;
  glyph(ctx, x, y, 1, a, () => {
    mark(ctx, opt.key || 'c07.ico.bar', 'rectangle', [0, -6, 22, 12], { stroke: C.red, strokeWidth: 1.4, fill: C.red, fillStyle: 'solid', roughness: .6, disableMultiStroke: true, seed: opt.seed ?? 881 }, { k });
  });
}

/** Clock — migrating pain takes hours. */
export function iconClock(ctx, x, y, opt = {}) {
  const k = opt.k ?? 1, a = opt.alpha ?? 1, s = opt.s ?? 1;
  glyph(ctx, x, y, s, a, () => {
    mark(ctx, 'c07.ico.clk', 'circle', [0, 0, 30], { strokeWidth: 2, seed: 891 }, { k });
    mark(ctx, 'c07.ico.clk.h', 'line', [0, 1, -5, -6], { strokeWidth: 1.8, seed: 892 }, { k });
    mark(ctx, 'c07.ico.clk.m', 'line', [0, 1, 7, -1], { strokeWidth: 1.6, seed: 893 }, { k });
    [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach((d, i) => {
      mark(ctx, 'c07.ico.clk.t' + i, 'line', [d[0] * 9, d[1] * 9, d[0] * 12, d[1] * 12], { strokeWidth: 1.5, seed: 894 + i }, { k });
    });
  });
}

/** Thermometer — fever. Bulb and mercury stay vermilion. */
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
export function iconHand(ctx, x, y, opt = {}) {
  const k = opt.k ?? 1, a = opt.alpha ?? 1, s = opt.s ?? 1;
  glyph(ctx, x, y, s, a, () => {
    mark(ctx, 'c07.ico.hand.p', 'ellipse', [1, 5, 22, 24], { strokeWidth: 2, fill: C.paper, fillStyle: 'solid', seed: 911 }, { k });
    [[[-6, 0], [-8, -8], [-6, -16]], [[0, -2], [0, -10], [1, -18]], [[6, 0], [7, -8], [6, -15]]].forEach((pts, i) => {
      mark(ctx, 'c07.ico.hand.f' + i, 'curve', [pts], { strokeWidth: 1.8, seed: 912 + i }, { k });
    });
    mark(ctx, 'c07.ico.hand.th', 'curve', [[[-8, 4], [-15, 0], [-13, 8]]], { strokeWidth: 1.8, seed: 916 }, { k });
  });
}

/** Short hand-drawn underline. Pair with the c07.uline wash for the soft red bar. */
export function iconUnderline(ctx, x, y, w, opt = {}) {
  const k = opt.k ?? 1, a = opt.alpha ?? 1;
  mark(ctx, opt.key || 'c07.ico.uline', 'line', [x, y, x + w, y], { stroke: C.red, strokeWidth: 1.8, roughness: .8, bowing: .8, seed: opt.seed ?? 921 }, { k, alpha: a });
}
