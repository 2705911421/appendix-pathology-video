// Shared anatomy geometry (WORLD px). Patient's RIGHT = viewer's LEFT. Front view.
import { C } from './tokens.js';
import { ink, shape, draw } from './ink.js';
import { weighted } from './detail.js';
const I = o => o;
// detail: ellipse arc (radians, 0 = +x, +angle toward +y). Used only by the opt-in contour weight.
function arcPts(cx, cy, rx, ry, a0, a1, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return pts;
}
export const FIG = {
  head: { cx: 960, cy: 232, rx: 70, ry: 86 },
  hair: [[886,232],[884,180],[905,150],[945,134],[990,136],[1025,152],[1040,185],[1036,226],[1022,196],[995,182],[960,190],[925,186],[900,205]],
  neck: [[932,300],[988,300],[992,352],[928,352]],
  shirt: [[805,372],[905,342],[960,362],[1015,342],[1115,372],[1190,520],[1140,548],[1102,480],[1098,830],[822,830],[818,480],[780,548],[730,520]],
  pants: [[822,830],[1098,830],[1112,1090],[985,1090],[960,915],[935,1090],[808,1090]],
  armL: [[1165,535],[1182,640],[1182,760],[1172,840]],
  navel: [960, 640], asis: [845, 790],
};
FIG.mcb = [FIG.asis[0] + (FIG.navel[0] - FIG.asis[0]) / 3, FIG.asis[1] + (FIG.navel[1] - FIG.asis[1]) / 3]; // McBurney: outer 1/3 of navel–right ASIS line
export const painCtrl = [925, 705];
export function painPt(t) { const a = FIG.navel, c = painCtrl, b = FIG.mcb, u = 1 - t; return [u*u*a[0] + 2*u*t*c[0] + t*t*b[0], u*u*a[1] + 2*u*t*c[1] + t*t*b[1]]; }
export const painPts = (n = 40) => Array.from({ length: n + 1 }, (_, i) => painPt(i / n));
// in-situ caecum / appendix (surface projection, right iliac fossa). Base of appendix ≈ McBurney point.
export const INSITU = {
  colon: [[848,600],[842,680],[838,735],[852,770],[884,772],[900,748],[890,700],[884,600]],   // ascending colon → caecum
  ileum: [[1010,690],[960,700],[898,716]], ileum2: [[1010,716],[962,724],[900,740]],
  appendix: [[878,762],[884,790],[898,812],[914,822]],      // base → tip (pelvic-pointing, ~7 cm)
  base: [878, 762],
};
// hands
export const HAND_R = [790, 808];  // patient's right hand clutching just lateral/below McBurney (keeps landmark visible)
// idle-life options (all optional, backward compatible): breath∈[-1,1] chest rise, sway px, blink 0/1, hatch = pants hatching alpha
// detail: detail=false leaves every existing stroke untouched (02/04/05/06/07 stay pixel-identical).
export function drawFigure(ctx, { alpha = 1, face = 'pain', press = 0, breath = 0, sway = 0, blink = 0, hatch = 1, detail = false } = {}) {
  if (alpha <= 0) return; ctx.save(); ctx.globalAlpha *= alpha; const F = FIG;
  ctx.translate(sway, 0); ctx.translate(960, 830); ctx.scale(1, 1 + breath * .007); ctx.translate(-960, -830);
  // detail: weight the original Rough curves in place; no independently smoothed overstroke.
  ink(ctx, detail ? 'fd.armL' : 'f.armL', 'curve', [F.armL], { seed: 4, ...(detail ? { strokeWidth: 1.7 } : {}) }); ink(ctx, detail ? 'fd.armL2' : 'f.armL2', 'curve', [F.armL.map(p => [p[0] + 44, p[1] + 4])], { seed: 5, ...(detail ? { strokeWidth: 2.8 } : {}) });
  // detail: no cast-shadow hatch. Guide §1 allows hachure only on hair and trousers.
  ink(ctx, 'f.handL', 'ellipse', [1170, 860, 40, 54], { fill: C.paper, fillStyle: 'solid', seed: 6 });
  if (detail) weighted(ctx, 'fd.handL', arcPts(1170, 860, 20, 27, -0.77, 4.11, 20), { w0: 2.8, w1: 2.0, seed: 6 });
  { const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * hatch; ink(ctx, 'f.pants', 'polygon', [F.pants], { fill: 'rgba(42,42,53,.5)', fillStyle: 'hachure', hachureAngle: -60, hachureGap: 10, fillWeight: 1.1, roughness: .55, seed: 7 }); ctx.globalAlpha = a0;
    if (hatch < 1) ink(ctx, 'f.pantsO', 'polygon', [F.pants], { roughness: .55, seed: 7 }, { alpha: 1 - hatch }); }
  // detail: outer leg seams heavier; inseam lighter.
  if (detail) {
    weighted(ctx, 'fd.legL', [[822, 830], [808, 1090]], { w0: 2.8, w1: 2.0, seed: 7 });
    weighted(ctx, 'fd.legR', [[1098, 830], [1112, 1090]], { w0: 2.8, w1: 2.0, seed: 17 });
    weighted(ctx, 'fd.inseamL', [[960, 915], [935, 1090]], { w0: 1.5, w1: 1.1, seed: 18 });
    weighted(ctx, 'fd.inseamR', [[960, 915], [985, 1090]], { w0: 1.5, w1: 1.1, seed: 19 });
  }
  ink(ctx, 'f.neck', 'polygon', [F.neck], { fill: C.paper, fillStyle: 'solid', seed: 8 });
  if (detail) weighted(ctx, 'fd.neck', [[928, 352], [932, 300], [988, 300], [992, 352]], { w0: 2.4, w1: 1.8, seed: 8 });
  const h = F.head; ink(ctx, 'f.head', 'ellipse', [h.cx, h.cy, h.rx * 2, h.ry * 2], { fill: C.paper, fillStyle: 'solid', seed: 9 });
  // detail: jaw stops below the ears (a≈0.45). The ear ellipse is the only contour there.
  if (detail) weighted(ctx, 'fd.jaw', arcPts(h.cx, h.cy, h.rx, h.ry, 0.45, Math.PI - 0.45, 24), { w0: 3.0, w1: 2.6, seed: 9 });
  // detail: ear is the stock ellipse only (2.6 / .9 / .8). Inner folds read as stray marks.
  ink(ctx, 'f.earR', 'ellipse', [h.cx - h.rx, h.cy + 8, 16, 28], { seed: 12 }); ink(ctx, 'f.earL', 'ellipse', [h.cx + h.rx, h.cy + 8, 16, 28], { seed: 13 });
  ink(ctx, 'f.hair', 'polygon', [F.hair], { fill: C.ink, fillStyle: 'hachure', hachureAngle: -30, hachureGap: 4, fillWeight: 2, roughness: .5, seed: 10 });
  if (detail) {
    weighted(ctx, 'fd.hairO', F.hair.slice(0, 8), { w0: 3.0, w1: 2.2, seed: 10 });
    weighted(ctx, 'fd.hairI', F.hair.slice(7), { w0: 1.5, w1: 1.1, seed: 16 });
  }
  if (face === 'pain') {
    ink(ctx, 'f.bR', 'linearPath', [[[918,212],[948,224]]], { strokeWidth: 3, seed: 20 }); ink(ctx, 'f.bL', 'linearPath', [[[1002,212],[972,224]]], { strokeWidth: 3, seed: 21 });
    ink(ctx, 'f.eR', 'curve', [[[922,248],[934,240],[946,249]]], { seed: 22 }); ink(ctx, 'f.eL', 'curve', [[[974,249],[986,240],[998,248]]], { seed: 23 });
    ink(ctx, 'f.m', 'curve', [[[942,288],[960,279],[978,288]]], { strokeWidth: 3, seed: 24 });
    ink(ctx, 'f.sweat', 'path', ['M1030 190 q-7 13 0 20 q7 -7 0 -20'], { strokeWidth: 1.8, seed: 25 });
  } else { // mild discomfort
    ink(ctx, 'f.bR0', 'linearPath', [[[918,216],[948,218]]], { strokeWidth: 3, seed: 26 }); ink(ctx, 'f.bL0', 'linearPath', [[[972,218],[1002,216]]], { strokeWidth: 3, seed: 27 });
    if (blink) { ink(ctx, 'f.eRb', 'linearPath', [[[928,247],[940,247]]], { strokeWidth: 2.6, seed: 31 }); ink(ctx, 'f.eLb', 'linearPath', [[[980,247],[992,247]]], { strokeWidth: 2.6, seed: 32 }); }
    else { ink(ctx, 'f.eR0', 'ellipse', [934, 246, 8, 10], { fill: C.ink, fillStyle: 'solid', seed: 28 }); ink(ctx, 'f.eL0', 'ellipse', [986, 246, 8, 10], { fill: C.ink, fillStyle: 'solid', seed: 29 }); }
    ink(ctx, 'f.m0', 'curve', [[[944,286],[960,284],[976,287]]], { strokeWidth: 2.6, seed: 30 });
  }
  // detail: short nose only. Temple strain ticks sat on the ears and are gone.
  if (detail) {
    ink(ctx, 'fd.nose', 'curve', [[[960, 254], [957, 270], [964, 276]]], { strokeWidth: 1.7, seed: 35 });
  }
  // detail: separate cache keys preserve default output regardless of chapter render order.
  // detail: keep polygon corners and all shoulder/sleeve/side coordinates exactly intact.
  ink(ctx, detail ? 'fd.shirt' : 'f.shirt', 'polygon', [F.shirt], { seed: 11, ...(detail ? { strokeWidth: 2.8 } : {}) });
  ink(ctx, 'f.collar', 'curve', [[[905,342],[960,392],[1015,342]]], { seed: 14 });
  // detail: four short armpit folds and a collar tuck. No side hatch (guide §1).
  if (detail) {
    [[[824, 488], [845, 504], [864, 520]], [[825, 530], [842, 548], [855, 566]],
     [[1096, 488], [1075, 504], [1056, 520]], [[1095, 530], [1078, 548], [1065, 566]]].forEach((pts, i) => ink(ctx, 'fd.fold' + i, 'curve', [pts], { strokeWidth: 1.4, seed: 81 + i }));
    ink(ctx, 'fd.foldCollar', 'curve', [[[944, 402], [960, 404], [976, 402]]], { strokeWidth: 1.4, seed: 85 });
  }
  ctx.restore();
}
// right arm: pose 'rest' (hand on navel, early mild pain) → 'clutch' (pressing RLQ). k blends via 2 cached poses (alpha crossfade + tiny offset)
// detail: detail=false keeps the two cached poses pixel-identical.
export function drawArmR(ctx, { pose = 'clutch', alpha = 1, press = 0, rub = [0, 0], detail = false } = {}) { if (alpha <= 0) return; ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(rub[0], rub[1]);
  if (pose === 'clutch') { ctx.translate(press * 2, press * 3);
    // detail: replace arm contour weight on the original Rough geometry in both poses.
    ink(ctx, detail ? 'fd.a.c1' : 'a.c1', 'curve', [[[742,540],[722,640],[724,740],[760,812]]], { seed: 41, ...(detail ? { strokeWidth: 2.8 } : {}) }); ink(ctx, detail ? 'fd.a.c2' : 'a.c2', 'curve', [[[790,540],[772,630],[774,700],[800,780]]], { seed: 42, ...(detail ? { strokeWidth: 1.6 } : {}) });
    // detail: outer forearm heavier, inner lighter. No forearm hatch.
    ink(ctx, 'a.ch', 'ellipse', [HAND_R[0], HAND_R[1], 78, 54], { fill: C.paper, fillStyle: 'solid', seed: 43 });
    if (detail) weighted(ctx, 'fd.a.ch', arcPts(HAND_R[0], HAND_R[1], 39, 27, 3.51, 8.78, 26), { w0: 2.8, w1: 2.1, seed: 43 });
    ink(ctx, 'a.f1', 'curve', [[[798,798],[820,802]]], { strokeWidth: 1.5, seed: 44 }); ink(ctx, 'a.f2', 'curve', [[[796,812],[820,818]]], { strokeWidth: 1.5, seed: 45 });
    if (detail) {
      weighted(ctx, 'fd.a.f1', [[798, 798], [820, 802]], { w0: 1.35, w1: 1.05, seed: 44 });
      weighted(ctx, 'fd.a.f2', [[796, 812], [820, 818]], { w0: 1.35, w1: 1.05, seed: 45 });
    }
  } else {
    ink(ctx, detail ? 'fd.a.r1' : 'a.r1', 'curve', [[[742,540],[734,610],[800,640],[878,622]]], { seed: 46, ...(detail ? { strokeWidth: 2.8 } : {}) }); ink(ctx, detail ? 'fd.a.r2' : 'a.r2', 'curve', [[[790,545],[792,585],[830,598],[880,586]]], { seed: 47, ...(detail ? { strokeWidth: 1.6 } : {}) });
    // detail: lower edge is the outer contour. The shadow band under it is removed.
    ink(ctx, 'a.rh', 'ellipse', [905, 600, 80, 50], { fill: C.paper, fillStyle: 'solid', seed: 48 });
    if (detail) weighted(ctx, 'fd.a.rh', arcPts(905, 600, 40, 25, Math.PI + 0.55, Math.PI + Math.PI * 2 - 0.55, 26), { w0: 2.8, w1: 2.1, seed: 48 });
  }
  ctx.restore(); }
// detail: scale (default 1) and anchor (default INSITU.base) shrink the whole in-situ organ — colon/ileum fill, colon/ileum/ileum2 strokes, and the appendix — about the caecum base. scale 1 skips the transform (same draw order, no extra save/restore).
export function drawInsitu(ctx, { k = 1, alpha = 1, scale = 1, anchor = null } = {}) { const S = INSITU;
  if (scale !== 1) { const anc = anchor || S.base; ctx.save(); ctx.translate(anc[0], anc[1]); ctx.scale(scale, scale); ctx.translate(-anc[0], -anc[1]); }
  if (k > .3) { ctx.save(); ctx.globalAlpha *= alpha * Math.min(1, (k - .3) * 2); ctx.fillStyle = 'rgba(236,205,196,.55)'; ctx.beginPath(); S.colon.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath(); ctx.fill();
    ctx.beginPath(); S.ileum.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); [...S.ileum2].reverse().forEach(p => ctx.lineTo(...p)); ctx.closePath(); ctx.fill(); ctx.restore(); }
  ink(ctx, 'i.colon', 'curve', [S.colon], { strokeWidth: 2.4, roughness: .6, seed: 60 }, { k, alpha: alpha * .9 });
  ink(ctx, 'i.ile', 'curve', [S.ileum], { strokeWidth: 2.4, roughness: .6, seed: 61 }, { k, alpha: alpha * .9 }); ink(ctx, 'i.ile2', 'curve', [S.ileum2], { strokeWidth: 2.4, roughness: .6, seed: 63 }, { k, alpha: alpha * .9 });
  ink(ctx, 'i.app', 'curve', [S.appendix], { strokeWidth: 9, stroke: C.red, roughness: .5, seed: 62 }, { k, alpha });
  if (scale !== 1) ctx.restore();
}
// ---------- resected specimen (LOCAL coords, centred, length ≈ 760px) ----------
export function spine(s) { const x = -380 + 760 * s; return [x, 46 * Math.sin(s * Math.PI * .9 - .3)]; }
export function halfW(s, swell) { const n = 20 + 2 * s, w = 52 + 26 * Math.pow(s, 1.6); const v = n + (w - n) * swell; return s > .9 ? v * Math.sqrt(Math.max(0, 1 - ((s - .9) / .1) ** 2)) + 1e-3 : v; }
export function specimenOutline(swell, N = 28) { const L = [], R = [];
  for (let i = 0; i <= N; i++) { const s = i / N, p = spine(s), q = spine(Math.min(1, s + .01)), r = spine(Math.max(0, s - .01)), dx = q[0] - r[0], dy = q[1] - r[1], l = Math.hypot(dx, dy), n = [-dy / l, dx / l], w = halfW(s, swell);
    L.push([p[0] + n[0] * w, p[1] + n[1] * w]); R.unshift([p[0] - n[0] * w, p[1] - n[1] * w]); }
  const tip = [];
  // L runs base→tip on the + normal side; tip arc goes from + normal (bottom) around to − normal (top)
  return L.concat(tip.reverse(), R); }
