// 02 大体病理 — sentences 4–6. Entry = 01 exit (translucent figure, in-situ appendix, EXIT_CAM). Exit = cross-section disc XS (03 dives into it).
import { C } from '../lib/tokens.js';
import { drawWash } from '../lib/wash.js';
import { drawFigure, drawInsitu, INSITU, specimenOutline, spine, halfW } from '../lib/figure.js';
import * as A from '../lib/ann.js';
import { ink } from '../lib/ink.js';
import { win, fade, clamp, titleBlock } from '../lib/chapter.js';
import { EXIT_CAM } from './01.js';
import { ease } from '../lib/motion.js';
const popY = (t,p,z) => t < p ? 0 : -9 * Math.exp(-(t-p)*6) * Math.sin((t-p)*15) / z;
const I0 = 4, s = i => I0 + i;
const ab = INSITU.appendix[0], at = INSITU.appendix[3];
const POSE0 = { x: (ab[0] + at[0]) / 2, y: (ab[1] + at[1]) / 2, rot: Math.atan2(at[1] - ab[1], at[0] - ab[0]), sc: Math.hypot(at[0] - ab[0], at[1] - ab[1]) / 760 };
const POSE1 = { x: 872, y: 700, rot: -0.06, sc: 0.46 };
const CUT_S = 0.62;
const PUS = '#CDB98A';   // grey-yellow (灰黄色) pus coat — muted ochre/grey, pus only
export const XS = { x: 1005, y: 822, r: 58 };          // cross-section disc (world). 03 opens its lens on the wall at XS_WALL.
// inflamed cross-section is NOT a circle: asymmetric outline, eccentric irregular lumen, wall thickened on the lower-left
export const xsR = th => 1 + .07 * Math.sin(3 * th + .5) + .04 * Math.sin(5 * th + 1.3) + .07 * Math.cos(th - 2.4);
export const LUM = { dx: .16, dy: -.14 }, lumR = th => .36 * (1 + .22 * Math.sin(4 * th + .7) + .1 * Math.sin(7 * th));
const ring = (f, cx, cy, R, n = 72) => Array.from({ length: n }, (_, i) => { const th = i / n * Math.PI * 2; return [cx + Math.cos(th) * R * f(th), cy + Math.sin(th) * R * f(th)]; });
export const xsOuter = (R = XS.r, cx = XS.x, cy = XS.y) => ring(xsR, cx, cy, R);
export const xsLumen = (R = XS.r, cx = XS.x, cy = XS.y) => ring(lumR, cx + LUM.dx * R, cy + LUM.dy * R, R);
const TH_W = 2.35; export const XS_WALL = (() => { const o = xsR(TH_W) * XS.r, l = [XS.x + LUM.dx * XS.r + Math.cos(TH_W) * lumR(TH_W) * XS.r, XS.y + LUM.dy * XS.r + Math.sin(TH_W) * lumR(TH_W) * XS.r];
  const e = [XS.x + Math.cos(TH_W) * o, XS.y + Math.sin(TH_W) * o]; return [(l[0] + e[0]) / 2, (l[1] + e[1]) / 2]; })();
export const EXIT_CAM2 = { x: XS.x, y: XS.y, zoom: 3.6 };
const lerpA = (a, b, k) => a + (b - a) * k;
function path(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath(); }
export default {
  id: '02', drift: false,
  bake(bake) {
    // overlapping blobs along the spine (no single big polygon → no triangulation seams); drawn clipped to the ink outline
    const along = (b, P, sw, col, a, r0, seed) => { for (let u = 0; u <= 1.001; u += .07) { const p = spine(u); P.fill(b, P.blob(p[0], p[1], halfW(Math.min(u, .9), sw) * r0, 20, .3, seed + u * 100), col, a, .18, [.45, .5]); } };
    bake('c02.normal', (b, P) => along(b, P, 0, '#E8B9B0', 110, 1.5, 3), { seed: 21, scale: 1.4 });
    // detail: higher-resolution pigment edges for the close-up specimen and pus coat.
    bake('c02.swollen', (b, P) => { along(b, P, 1, C.red, 150, 1.35, 5); along(b, P, .7, '#6E1A24', 110, 1, 9); P.fill(b, P.blob(spine(.7)[0], spine(.7)[1] + 20, 60, 18, .4, 4), '#4E1019', 90, .3); }, { seed: 22, scale: 1.6, hd: true, soft: true, grain: .12, edge: .3, bleed: .5 });
    bake('c02.pus', (b, P) => { [[.2, -14, 34], [.28, 16, 30], [.36, -4, 44], [.46, 18, 36], [.54, -12, 42], [.62, 10, 46], [.72, -16, 34], [.8, 8, 44], [.9, -4, 30]].forEach(([u, dy, r], j) => { const p = spine(u); P.fill(b, P.blob(p[0], p[1] + dy, r, 22, .45, j + 2), PUS, 175, .22, [.25, .35]); }); }, { seed: 23, keepWhite: true, hd: true, soft: true, grain: .12, edge: .3, bleed: .5 });
    bake('c02.xs', (b, P) => { const R = 420; P.fill(b, ring(xsR, 0, 0, R * 1.02, 48), C.red, 170, .1, [.5, .6]); P.fill(b, ring(xsR, 0, 0, R * .8, 48), '#6E1A24', 70, .1); P.fill(b, ring(t => lumR(t) * 1.25, LUM.dx * R, LUM.dy * R, R, 40), '#E39AA8', 140, .12);
      P.fill(b, ring(lumR, LUM.dx * R, LUM.dy * R, R, 40), '#C2A86E', 210, .08, [.6, .5]); }, { seed: 24 });
  },
  camera: T => [
    [T.at(s(0)), EXIT_CAM],
    [T.frac(s(0), .8), { x: 880, y: 745, zoom: 2.75 }],
    [T.frac(s(1), .65), { x: 890, y: 750, zoom: 2.86 }, ease.linear],
    [T.at(s(2)), { x: 935, y: 765, zoom: 2.9 }],
    [T.at(s(2), .6), { x: 935, y: 765, zoom: 2.63 }, ease.outCubic],
    [T.frac(s(2), .28), { x: 935, y: 765, zoom: 2.63 }],
    [T.end(s(2)), EXIT_CAM2],
  ],
  world(ctx, t, T, cam) {
    const t0 = T.at(s(0));
    const kOut = win(t, t0, T.frac(s(0), .3));                          // figure dissolves; appendix is lifted out
    if (kOut < 1) { ctx.save(); ctx.globalAlpha = .45 * (1 - kOut); drawFigure(ctx, { face: 'pain' }); ctx.restore(); drawInsitu(ctx, { alpha: 1 - kOut }); }
    const kp = win(t, t0 + .2, T.frac(s(0), .45)), P = { x: lerpA(POSE0.x, POSE1.x, kp), y: lerpA(POSE0.y, POSE1.y, kp), rot: lerpA(POSE0.rot, POSE1.rot, kp), sc: Math.exp(lerpA(Math.log(POSE0.sc), Math.log(POSE1.sc), kp)) };
    const sw = win(t, T.frac(s(1), 0), T.frac(s(1), .22));               // 粉白细长 → 肿胀暗红
    const kpus = win(t, T.frac(s(1), .28), T.frac(s(1), .5));
    const size = 1024 * P.sc;
    const dimS = 1 - .85 * win(t, T.at(s(2)), T.frac(s(2), .4));   // s6: negative space around the cut face
    const br = 1 + .012 * Math.sin(t * 1.7);                       // wash breathing
    ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.rot); ctx.scale(P.sc, P.sc); path(ctx, specimenOutline(sw, 40)); ctx.restore(); ctx.save(); ctx.clip();
    drawWash(ctx, 'c02.normal', P.x, P.y, size * br, { rot: P.rot, alpha: (1 - sw) * Math.max(kp, .0001) });
    drawWash(ctx, 'c02.swollen', P.x, P.y, size * br, { rot: P.rot, alpha: sw * (.4 + .6 * dimS) }); ctx.restore();
    ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.rot); ctx.scale(P.sc, P.sc); path(ctx, specimenOutline(sw, 40)); ctx.restore(); ctx.save(); ctx.clip();
    for (let r = 0; r < 1; r++) drawWash(ctx, 'c02.pus', P.x, P.y, size * br, { rot: P.rot, grow: kpus, alpha: kpus * .82 * (.4 + .6 * dimS), blend: 'source-over', origin: [.6, .5] }); ctx.restore();
    // ink outline (morphs with swelling), mesoappendix stub at base
    ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.rot); ctx.scale(P.sc, P.sc);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.4 / (P.sc * cam.zoom); ctx.lineJoin = 'round';
    if (kp > 0) { ctx.globalAlpha = kp * dimS; if (sw < .02) ctx.setLineDash([12 / (P.sc * cam.zoom), 9 / (P.sc * cam.zoom)]); path(ctx, specimenOutline(sw, 40)); ctx.stroke(); ctx.setLineDash([]);
      const b0 = spine(0); ctx.beginPath(); ctx.moveTo(b0[0], b0[1] - halfW(0, sw)); ctx.lineTo(b0[0], b0[1] + halfW(0, sw)); ctx.stroke(); }
    ctx.restore();
    const toW = (u, off = 0) => { const p = spine(u), c = Math.cos(P.rot), si = Math.sin(P.rot); const x = p[0], y = p[1] + off; return [P.x + (x * c - y * si) * P.sc, P.y + (x * si + y * c) * P.sc]; };
    const out2 = 1 - win(t, T.at(s(2)), T.frac(s(2), .25));
    // normal reference: 粉白、细长 + 7 cm scale bar
    const kn = fade(t, T.frac(s(0), .45), T.frac(s(0), .6), T.frac(s(1), .05), T.frac(s(1), .2));
    A.label(ctx, '正常：粉白、细长', toW(.5)[0] - 70, toW(.5)[1] - 60, { size: 30, k: kn });
    { const a = toW(0, 40), b = toW(1, 40); A.line(ctx, a, b, { k: kn, w: 2 }); A.tick(ctx, a, [1, 0], { k: kn, len: 8 }); A.tick(ctx, b, [1, 0], { k: kn, len: 8 }); A.label(ctx, '约 7 cm', (a[0] + b[0]) / 2, a[1] + 22, { size: 22, align: 'center', k: kn }); }
    const ks = win(t, T.frac(s(1), .12), T.frac(s(1), .2)) * out2;
    A.leader(ctx, toW(.35, -30), [toW(.35)[0] - 30, toW(.35)[1] - 70], [toW(.35)[0] - 150, toW(.35)[1] - 70], { k: ks }); A.label(ctx, '肿胀 · 暗红', toW(.35)[0] - 150, toW(.35)[1] - 86 + popY(t,T.frac(s(1),.12),cam.zoom), { size: 28, w: 700, col: C.red, k: ks });
    const kl = win(t, T.frac(s(1), .38), T.frac(s(1), .46)) * out2;
    const pu = toW(.78, 10); A.leader(ctx, pu, [pu[0] + 30, pu[1] - 70], [pu[0] + 140, pu[1] - 70], { k: kl }); A.label(ctx, '灰黄色脓苔', pu[0] + 34, pu[1] - 86 + popY(t,T.frac(s(1),.38),cam.zoom), { size: 28, w: 700, k: kl });
    // knife line → cross-section callout
    const kk = win(t, T.frac(s(1), .55), T.frac(s(1), .66)), cA = toW(CUT_S, -95), cB = toW(CUT_S, 95);
    A.dashed(ctx, cA, cB, { k: kk * out2, col: C.red, w: 2.2, dash: [8, 6] }); A.label(ctx, '切开', cA[0] + 8, cA[1] - 6, { size: 22, col: C.red, k: kk * out2 });
    const kx = win(t, T.frac(s(1), .66), T.frac(s(1), .82));
    if (kx > 0) { const m = toW(CUT_S, 30); A.dashed(ctx, m, [XS.x - XS.r * .7, XS.y - XS.r * .7], { k: kx * out2, w: 1.6 });
      ctx.save(); ctx.beginPath(); xsOuter(XS.r * 1.04).forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath(); ctx.clip();
      drawWash(ctx, 'c02.xs', XS.x, XS.y, XS.r * 1024 / 420 * (1 + .01 * Math.sin(t * 1.9)), { grow: kx, alpha: Math.min(1, kx * 1.4) }); ctx.restore();
      ink(ctx, 'c02.xsO', 'polygon', [xsOuter()], { strokeWidth: 2.4, roughness: .8, seed: 70 }, { k: kx }); ink(ctx, 'c02.xsL', 'polygon', [xsLumen()], { strokeWidth: 1.6, roughness: 1, seed: 71 }, { k: kx });
      const kq = win(t, T.frac(s(1), .8), T.frac(s(1), .88)) * out2; A.leader(ctx, [XS.x + 10, XS.y], [XS.x + 80, XS.y - 40], [XS.x + 170, XS.y - 40], { k: kq }); A.label(ctx, '管腔积满脓液', XS.x + 84, XS.y - 56 + popY(t,T.frac(s(1),.8),cam.zoom), { size: 26, w: 700, k: kq });
      A.label(ctx, '横切面 · 壁增厚不均', XS.x, XS.y + XS.r + 24, { size: 22, align: 'center', k: kq, alpha: .75 }); }
  },
  title(ctx, t, T) { titleBlock(ctx, t, T.at(s(0)), '02 · 大体病理', '切下来的阑尾', 5); },
};
