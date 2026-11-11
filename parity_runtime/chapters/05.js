// 05 炎症是什么 — sentences 14–23. One continuous tissue "battlefield" (world layer) that every beat acts on:
//   05a (14–15) 炎症 = ?  → 自卫反击战（损伤/感染 in the tissue, the body answers from the vessel）
//   05b (16–19) 五征 by mechanism: 血管扩张充血→红/热；富含蛋白质的血浆+白细胞渗出→肿；张力+炎症因子→神经末梢→痛；组织失能→功能障碍
//   05c (20–23) 三种基本动作 on the same field: 变质（战损）/ 渗出（冲锋）/ 增生（重建）
// Entry = 04 exit (lens with gangrenous wall) shrinking away. Exit = EXIT_05 (wide field, camera EXIT_CAM5) — 06 opens from it.
import { C } from '../lib/tokens.js';
import * as A from '../lib/ann.js';
import { drawWash } from '../lib/wash.js';
import { ink, shape, draw } from '../lib/ink.js';
import { drawLens, drawNeutrophil } from '../lib/he.js';
import { rng, ease } from '../lib/motion.js';
import { moodAt, burstShake } from '../lib/mood.js';
import { win, fade, clamp, titleBlock } from '../lib/chapter.js';
import { EXIT_04, lensAt as lensAt04, drawLens04, heAt as heAt04, fsAt as fsAt04, gangAt as gangAt04, offAt as offAt04, creep04 } from './04.js';
import { drawSurround, drawPointer } from '../lib/scope.js';
const I0 = 14, s = i => I0 + i;
const lerp = (a, b, k) => a + (b - a) * k;
export const EXIT_CAM5 = { x: 960, y: 520, zoom: 1 };
// ---- field geometry (WORLD px) ----
const VY = 660, VX0 = 160, VX1 = 1760;                  // capillary axis
const TOP = 300;                                        // tissue surface (epithelium) at rest
const INJ = [1260, 400];                                // injury / infection focus
const NERVE = [[430, 600], [470, 540], [520, 490], [575, 452]]; const NTIP = NERVE.at(-1);
const R = rng(505);
const EPI = Array.from({ length: 22 }, (_, i) => ({ x: 250 + i * 66, r: R() }));   // (v1c, kept so the shared RNG stream is unchanged)
// ---- mood_v2 histology (schematic, not to scale) ----
// Surface: SIMPLE COLUMNAR epithelium (appendix mucosa: columnar absorptive cells + goblet cells) on a basement membrane.
// Vessel: post-capillary venule lined by ONE layer of FLAT endothelial cells (spindle nuclei bulging into the lumen),
// joined at inter-endothelial junctions — the paracellular route leukocytes and plasma use during exudation.
const R2 = rng(5052);
const COLW = 30, COLH = 50, COLX0 = 190, NCOL = 52;
const COL = Array.from({ length: NCOL }, (_, i) => ({ x0: COLX0 + i * COLW, gob: i % 5 === 2 || i % 11 === 7, r: R2(), ph: R2() * 6.28 }));
const ENDW = 64, NEND = Math.floor((VX1 - VX0) / ENDW);
const ENDO = [-1, 1].flatMap(sg => Array.from({ length: NEND }, (_, i) => ({ sg, x0: VX0 + i * ENDW + (sg > 0 ? 30 : 0), r: R2(), ph: R2() * 6.28 })));
const JUNC = Array.from({ length: NEND + 1 }, (_, i) => VX0 + i * ENDW);         // upper-wall junction x positions
const nearJ = x => JUNC.reduce((b, j) => Math.abs(j - x) < Math.abs(b - x) ? j : b, JUNC[0]);
// lumen: a FEW leukocytes + platelets among many RBCs (RBCs stay the clear majority)
const WBC = [{ type: 'mono', u: .12, dy: .1 }, { type: 'lym', u: .47, dy: -.15 }, { type: 'neu', u: .71, dy: .2, lobes: 3 }, { type: 'neu', u: .9, dy: -.05, lobes: 4 }, { type: 'lym', u: .3, dy: .35 }];
const PLT = Array.from({ length: 9 }, () => ({ u: R2(), dy: (R2() - .5) * 1.5, a: R2() * 3 }));
const FBR = [[300, 470, .3], [520, 395, -.2], [760, 430, .15], [905, 520, -.35], [1500, 450, .25], [1640, 520, -.1]].map(([x, y, a]) => ({ x, y, a, ph: R2() * 6.28 }));
const RBC2 = Array.from({ length: 18 }, () => ({ u: R2(), dy: (R2() - .5) * 1.5, a: R2() * .6 - .3 }));   // more RBCs: they stay the clear majority
const MAC = { x: 1080, y: 480, ph: R2() * 6.28 };
const wallY = (x, sg, hw) => VY + sg * (hw + 3 * Math.sin((x - VX0) / 50 * .9));
const BACT = Array.from({ length: 16 }, () => ({ x: INJ[0] - 70 + R() * 140, y: INJ[1] - 40 + R() * 80, a: R() * 3.14 }));
const RBC = Array.from({ length: 34 }, () => ({ u: R(), dy: (R() - .5) * 1.4, a: R() * .6 - .3 }));
const MED = Array.from({ length: 18 }, () => ({ ox: (R() - .5) * 120, oy: (R() - .5) * 90, d: R() * .35, w: R() * 6.28 }));
const PROT = Array.from({ length: 40 }, () => ({ x: VX0 + 200 + R() * 1300, h: 30 + R() * 200, d: R() * .5 }));
// neutrophils: first wave 6 (sentence 17), main wave 14 (sentence 22)
const NEU = Array.from({ length: 20 }, (_, i) => ({ wave: i < 6 ? 0 : 1, x: 820 + R() * 520, tx: INJ[0] + (R() - .5) * 220, ty: INJ[1] + 10 + (R() - .5) * 120, d: R(), lobes: 3 + Math.floor(R() * 2), rot: R() * 6.28 }));
const FIB = Array.from({ length: 16 }, () => ({ x: INJ[0] + (R() - .5) * 240, y: INJ[1] + (R() - .5) * 120, a: (R() - .5) * .5, d: R() }));
const hwAt = (t, T) => 40 + 22 * win(t, T.frac(s(2), .08), T.frac(s(2), .24));               // capillary half-width (dilation)
const swellAt = (t, T) => win(t, T.frac(s(3), .2), T.frac(s(3), .62));                        // tissue swelling
const surf = (x, sw) => TOP - sw * 46 * Math.exp(-(((x - 1000) / 520) ** 2));                    // epithelial surface bulges up
const p = (t, a, b) => clamp((t - a) / (b - a));
// Integral of chapter.win: time-varying flow speed without discontinuities or frame-history state.
const rampArea = (t, a, b) => { const u = p(t, a, b); return (b - a) * (1.5 * u ** 2 - u ** 3 + .25 * u ** 4) + Math.max(0, t - b); };
// Leukocyte extravasation (Robbins Basic Pathology, acute inflammation; Granger & Senchenkova 2010, NCBI NBK53380):
// margination (near the wall in slowed flow) → rolling → firm adhesion (flattens) → transmigration THROUGH an
// inter-endothelial junction → chemotaxis toward the injury → keeps crawling there (alive, never parked still).
// Stagger: first-wave cells are spread across sentences 17–19 so at any moment some roll, some cross, some crawl.
NEU.forEach((n, i) => { n.j = nearJ(n.x); n.i = i; });
const NEU_TIMES = (n, T) => {
  const t0 = n.wave ? T.frac(s(8), .02 + n.d * .22) : T.frac(s(3), .02) + (n.i / 6) * (T.frac(s(5), .55) - T.frac(s(3), .02)) + n.d * .6;
  const roll = n.wave ? .8 : 1.6, stick = n.wave ? .3 : .6, cross = n.wave ? .6 : .95, go = n.wave ? 1.5 : 2.6;
  return { t0, t1: t0 + roll, t2: t0 + roll + stick, t3: t0 + roll + stick + cross, t4: t0 + roll + stick + cross + go };
};
function neutroPos(n, t, T) {
  const { t0, t1, t2, t3, t4 } = NEU_TIMES(n, T), hw = hwAt(t, T), yin = wallY(n.j, -1, hw) + 21, yout = wallY(n.j, -1, hw) - 26;
  const D = 80 * (t1 - t0) / 2, wob = (a, f) => Math.sin(t * f + n.d * 17) * a;
  if (t < t0) { const x = n.j - D - 80 * (t0 - t); return { x, y: yin + wob(1.5, 2.1), sx: 1, sy: 1, rot: n.rot + x / 25, a: clamp((x - VX0 - 10) / 60), ph: 'flow' }; }
  if (t < t1) { const k = p(t, t0, t1), x = n.j - D * (1 - k) ** 2; return { x, y: yin, sx: 1, sy: 1, rot: n.rot + x / 25, a: 1, ph: 'roll' }; }
  if (t < t2) { const k = ease.inOutSine(p(t, t1, t2)); return { x: n.j + wob(.6, 3), y: yin + 3 * k, sx: 1 + .22 * k, sy: 1 - .2 * k, rot: n.rot + n.j / 25, a: 1, ph: 'stick' }; }
  if (t < t3) { const k = p(t, t2, t3), e = ease.inOutSine(k), sq = Math.sin(k * Math.PI);
    return { x: n.j, y: lerp(yin + 3, yout, e), sx: lerp(1.22, 1, e) - .5 * sq, sy: lerp(.8, 1, e) + .45 * sq, rot: n.rot + n.j / 25, a: 1, ph: 'cross', sq }; }
  const k = p(t, t3, t4), e = 1 - (1 - k) ** 3, bend = Math.sin(k * 7 + n.d * 6) * 16 * (1 - k);
  const mill = clamp((t - t4) / 1.5), wx = mill * (8 * Math.sin(t * .7 + n.d * 9) + 4 * Math.sin(t * 1.9 + n.d * 3)), wy = mill * 6 * Math.sin(t * .9 + n.d * 5);
  return { x: lerp(n.j, n.tx, e) + bend + wx, y: lerp(yout, n.ty, e) + wy, sx: 1 + wob(.05, 2.7), sy: 1 - wob(.05, 2.7), rot: n.rot + n.j / 25, a: 1, ph: 'migrate', dir: [n.tx - n.j, n.ty - yout] };
}
// junction opening: background widening during exudation + extra opening while a leukocyte squeezes through
const juncGap = (x, t, T) => { let g = 0;
  const kx = win(t, T.frac(s(3), .02), T.frac(s(3), .25)) * (1 - .8 * win(t, T.at(s(6)), T.frac(s(6), .4))) + win(t, T.frac(s(8), 0), T.frac(s(8), .15)) * (1 - win(t, T.frac(s(9), .2), T.end(s(9))));
  if (x > 640 && x < 1560) g = 3.5 * Math.min(1, kx);
  for (const n of NEU) if (n.j === x) { const { t2, t3 } = NEU_TIMES(n, T); if (t > t2 - .3 && t < t3 + .3) g = Math.max(g, 16 * Math.sin(Math.PI * clamp((t - t2 + .3) / (t3 - t2 + .6)))); }
  return g; };
function pseudopod(ctx, q, n, t) { if (!q.dir) return; const l = Math.hypot(...q.dir) || 1, d = [q.dir[0] / l, q.dir[1] / l], ext = 13 + 6 * Math.sin(t * 2.2 + n.d * 11), side = Math.sin(t * 1.3 + n.d * 7) * .5;
  const dx = d[0] * Math.cos(side) - d[1] * Math.sin(side), dy = d[0] * Math.sin(side) + d[1] * Math.cos(side);
  ctx.fillStyle = 'rgba(236,178,198,.85)'; ctx.beginPath(); ctx.ellipse(q.x + dx * ext * 1.25, q.y + dy * ext * 1.25, 14, 9, Math.atan2(dy, dx), 0, 6.283); ctx.fill(); }
function drawWBC(ctx, w, x, y, t, z) { ctx.save(); ctx.translate(x, y);
  if (w.type === 'mono') { ctx.fillStyle = 'rgba(206,196,222,.92)'; ctx.beginPath(); ctx.ellipse(0, 0, 29, 27, Math.sin(t * .8 + w.u * 9) * .2, 0, 6.283); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2 / z; ctx.stroke();
    ctx.fillStyle = C.vio; ctx.beginPath(); ctx.ellipse(-3, 2, 15, 11, .3, -2.3, 2.3); ctx.quadraticCurveTo(-4, 1, -11, -10); ctx.fill(); }        // kidney-shaped nucleus
  else if (w.type === 'lym') { ctx.fillStyle = 'rgba(206,196,222,.92)'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, 6.283); ctx.fill(); ctx.fillStyle = C.vio; ctx.beginPath(); ctx.arc(.8, -.5, 12.2, 0, 6.283); ctx.fill(); } // thin rim, round dense nucleus
  else drawNeutrophil(ctx, 0, 0, { lobes: w.lobes, rot: w.u * 6 + x / 30 }, 3);
  ctx.restore(); }
export default {
  id: '05',
  shake: (t, T) => burstShake(t, T.frac(s(4), .55), { frames: 3, amp: 1.1, seed: 505 }),
  drift: false, boil: false,
  bake(bake) {
    bake('c05.hyper', (b, P) => { P.fill(b, [[-500, -30], [-250, -38], [0, -32], [250, -40], [500, -30], [500, 30], [250, 38], [0, 32], [-250, 40], [-500, 30]], C.red, 150, .25, [.5, .6]); }, { seed: 51, scale: 2 });
    bake('c05.flush', (b, P) => { P.fill(b, P.blob(0, 0, 420, 34, .25, 52), C.red, 70, .4, [.6, .6]); }, { seed: 52 });
    bake('c05.edema', (b, P) => { P.fill(b, [[-500, -120], [-250, -160], [0, -150], [250, -170], [500, -120], [500, 120], [-500, 120]], '#E8A79E', 110, .35, [.6, .6]); }, { seed: 53 });
    bake('c05.necro', (b, P) => { P.fill(b, P.blob(0, 0, 300, 26, .35, 54), C.ink, 110, .3, [.6, .6]); }, { seed: 54 });
    bake('c05.pus', (b, P) => { P.fill(b, P.blob(0, 0, 320, 26, .4, 55), C.pus, 150, .3, [.6, .5]); }, { seed: 55 });
  },
  camera: T => {
    const vessel = { x: 980, y: 590, zoom: 1.22 }, edema = { x: 1020, y: 520, zoom: 1.16 };
    const nerve = { x: 760, y: 480, zoom: 1.30 }, loss = { x: 1100, y: 420, zoom: 1.18 };
    const damage = { x: 1230, y: 430, zoom: 1.42 }, charge = { x: 1120, y: 520, zoom: 1.2 };
    const pain = T.frac(s(4), .55);
    return [
      [T.at(s(0)), EXIT_CAM5], [T.frac(s(1), .55), { x: 960, y: 514, zoom: 1 }],
      [T.end(s(1), -.35), { x: 960, y: 514, zoom: 1 }], // title settles and leaves BEFORE the vessel push
      [T.frac(s(2), .22), vessel], [T.at(s(3)), vessel],
      [T.frac(s(3), .18), edema], [T.frac(s(4), .08), edema],
      [T.frac(s(4), .3), nerve], [pain, nerve],
      [pain + .09, { ...nerve, zoom: 1.335 }], [pain + .24, nerve], // one subtle scale pulse, not a shake system
      [T.at(s(5)), nerve], [T.frac(s(5), .55), loss], [T.end(s(5)), loss], // functional loss: markedly slower
      [T.frac(s(6), .55), EXIT_CAM5], [T.at(s(7)), EXIT_CAM5],
      [T.frac(s(7), .28), damage], [T.at(s(8)), damage], // weighty arrival / held explanation
      [T.frac(s(8), .14), charge], [T.at(s(9)), charge], // faster charge
      [T.frac(s(9), .38), damage], [T.frac(s(9), .66), damage], // reconstruction eases out
      [T.end(s(9), -.45), EXIT_CAM5], [T.end(s(9)), EXIT_CAM5],
    ];
  },
  world(ctx, t, T, cam) {
    const kin = win(t, T.frac(s(1), .05), T.frac(s(1), .4));       // field draws on during 05a
    if (kin <= 0) return;
    const hw = hwAt(t, T), sw = swellAt(t, T), kred = win(t, T.frac(s(2), .1), T.frac(s(2), .5));
    // ---- watercolour (lesion only) ----
    drawWash(ctx, 'c05.flush', 1000, 500, 1050, { grow: kred, alpha: kred * .45 });
    const ked = swellAt(t, T); drawWash(ctx, 'c05.edema', 1000, VY - 190, 1700, { grow: ked, alpha: ked * .4, origin: [.5, .9] });
    drawWash(ctx, 'c05.hyper', (VX0 + VX1) / 2, VY, 1700 * (hw + 8) / 70, { alpha: .25 + .5 * kred });
    const kne = win(t, T.frac(s(7), .1), T.frac(s(7), .6)) * (1 - .6 * win(t, T.frac(s(9), .3), T.end(s(9))));
    drawWash(ctx, 'c05.necro', INJ[0], INJ[1] - 20, 330, { grow: kne, alpha: kne * .9 });
    const kpu = win(t, T.frac(s(8), .3), T.end(s(8))) * (1 - .7 * win(t, T.frac(s(9), .2), T.end(s(9)))); drawWash(ctx, 'c05.pus', INJ[0] + 10, INJ[1] + 30, 360, { grow: kpu, alpha: kpu, blend: 'source-over' });
    // ---- tissue surface + epithelium ----
    const sp = Array.from({ length: 33 }, (_, i) => { const x = 180 + i * 50; return [x, surf(x, sw)]; });
    draw(ctx, shape('c05.surf', 'curve', [sp], { strokeWidth: 2.6, seed: 61 }, true), { k: kin });
    const kf = win(t, T.frac(s(5), .1), T.frac(s(5), .5));
    // simple columnar epithelium: contiguous cells sharing lateral walls, basal oval nuclei, goblet cells; slow asynchronous
    // micro-motion (≤1 px walls, ≤.8 px nuclei) so living tissue never looks printed.
    const wx = i => COLX0 + i * COLW + (i % NCOL ? .9 * Math.sin(t * (.45 + .25 * ((i * 37) % 7) / 7) + i * 1.7) : 0);
    const bm = Array.from({ length: 33 }, (_, i) => { const x = 180 + i * 50; return [x, surf(x, sw) + COLH + 4]; });
    ctx.save(); ctx.globalAlpha = kin * .7; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4 / cam.zoom; ctx.beginPath(); bm.forEach((q, i) => i ? ctx.lineTo(...q) : ctx.moveTo(...q)); ctx.stroke(); ctx.restore();
    COL.forEach((c, i) => { const xa = wx(i), xb = wx(i + 1), xm = (xa + xb) / 2, ya = surf(xm, sw), near = Math.abs(xm - INJ[0]) < 200, dmg = near ? Math.max(kf, kne) : 0;
      ctx.save(); ctx.globalAlpha = kin * (1 - .45 * dmg); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.3 / cam.zoom; if (dmg > .3) ctx.setLineDash([5 / cam.zoom, 5 / cam.zoom]);
      ctx.beginPath(); ctx.moveTo(xb, surf(xb, sw) + 1); ctx.lineTo(xb + .4 * Math.sin(t * .6 + c.ph), surf(xb, sw) + COLH + 3); ctx.stroke(); ctx.setLineDash([]);
      const bob = .8 * Math.sin(t * (.5 + .3 * c.r) + c.ph);
      if (c.gob && dmg < .5) { ctx.fillStyle = 'rgba(244,239,230,.85)'; ctx.beginPath(); ctx.ellipse(xm, ya + 15, 10.5, 12 + .6 * Math.sin(t * .7 + c.ph), 0, 0, 6.283); ctx.fill(); ctx.lineWidth = 1 / cam.zoom; ctx.stroke(); }
      ctx.fillStyle = C.vio;
      if (dmg > .5) { for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(xm - 7 + j * 5, ya + 34 + Math.sin(j * 2 + c.r) * 5, 2.2, 0, 6.283); ctx.fill(); } }   // karyorrhexis
      else if (c.gob) { ctx.beginPath(); ctx.ellipse(xm, ya + 40 + bob * .5, 6, 3.6, 0, 0, 6.283); ctx.fill(); }   // goblet: nucleus pushed basally
      else { ctx.beginPath(); ctx.ellipse(xm + bob * .3, ya + 33 + bob, 5, 9.5, 0, 0, 6.283); ctx.fill(); }
      ctx.restore(); });
    // resident stromal cells (fibroblast spindle nuclei, one macrophage): slow shape breathing, no bouncing
    ctx.save(); ctx.globalAlpha = kin * (1 - .6 * win(t, T.frac(s(9), .3), T.end(s(9))));
    for (const f of FBR) { const br = Math.sin(t * .55 + f.ph); ctx.save(); ctx.translate(f.x + .8 * Math.sin(t * .3 + f.ph), f.y); ctx.rotate(f.a + .04 * br);
      ctx.strokeStyle = 'rgba(42,42,53,.45)'; ctx.lineWidth = 1.2 / cam.zoom; ctx.beginPath(); ctx.moveTo(-34 - 2 * br, 2); ctx.quadraticCurveTo(0, -6 - br, 34 + 2 * br, 1); ctx.quadraticCurveTo(0, 7 + br, -34 - 2 * br, 2); ctx.stroke();
      ctx.fillStyle = C.vio; ctx.beginPath(); ctx.ellipse(0, 0, 13 + .8 * br, 3.2, 0, 0, 6.283); ctx.fill(); ctx.restore(); }
    { const mx = MAC.x + 5 * Math.sin(t * .35 + MAC.ph), my = MAC.y + 3 * Math.sin(t * .27 + MAC.ph * 2), a = t * .4; ctx.fillStyle = 'rgba(206,196,222,.8)';
      ctx.beginPath(); for (let k = 0; k <= 16; k++) { const th = k / 16 * 6.283, rr = 24 + 3 * Math.sin(th * 3 + a) + 2 * Math.sin(th * 5 - a * 1.3); ctx.lineTo(mx + Math.cos(th) * rr, my + Math.sin(th) * rr * .85); } ctx.fill();
      ctx.fillStyle = C.vio; ctx.beginPath(); ctx.ellipse(mx - 3, my, 9, 6.5, .4, 0, 6.283); ctx.fill(); }
    ctx.restore();
    // ---- capillary (dilates) ----
    const wall = sgn => Array.from({ length: 33 }, (_, i) => { const x = VX0 + i * 50; return [x, VY + sgn * (hw + 3 * Math.sin(i * .9))]; });
    draw(ctx, shape('c05.vu', 'curve', [wall(-1)], { strokeWidth: 3, seed: 62 }, true), { k: kin }); draw(ctx, shape('c05.vd', 'curve', [wall(1)], { strokeWidth: 3, seed: 63 }, true), { k: kin });
    // endothelium: ONE layer of flattened cells lining both walls; spindle nuclei bulge into the lumen; junction gaps
    for (const e of ENDO) { const x0 = e.x0, x1 = Math.min(VX1, x0 + ENDW); if (x0 >= VX1) continue;
      const g0 = e.sg < 0 ? juncGap(x0, t, T) / 2 : 0, g1 = e.sg < 0 ? juncGap(x1, t, T) / 2 : 0, xs = x0 + 1 + g0, xe = x1 - 1 - g1, inn = -e.sg;
      ctx.save(); ctx.globalAlpha = kin; ctx.strokeStyle = 'rgba(214,69,58,.30)'; ctx.lineWidth = 6; ctx.lineCap = 'butt'; ctx.beginPath();
      for (let k = 0; k <= 6; k++) { const x = lerp(xs, xe, k / 6); ctx.lineTo(x, wallY(x, e.sg, hw) + inn * 4); } ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.1 / cam.zoom; ctx.beginPath(); for (let k = 0; k <= 6; k++) { const x = lerp(xs, xe, k / 6); ctx.lineTo(x, wallY(x, e.sg, hw) + inn * 7.2); } ctx.stroke();
      const xm = (x0 + x1) / 2 + .7 * Math.sin(t * .4 + e.ph), ym = wallY(xm, e.sg, hw) + inn * (7.5 + .4 * Math.sin(t * .6 + e.ph));
      ctx.fillStyle = C.vio; ctx.beginPath(); ctx.ellipse(xm, ym, 15, 3.8, Math.atan2(wallY(xm + 5, e.sg, hw) - wallY(xm - 5, e.sg, hw), 10), 0, 6.283); ctx.fill(); ctx.restore(); }
    // lumen: red cells (many, no nucleus) + a few leukocytes + platelets; flow slows with congestion; leukocytes marginate
    const flow = 60 * (t - T.at(s(0))) - 30 * rampArea(t, T.frac(s(2), .1), T.frac(s(2), .5))
      - 18 * rampArea(t, T.frac(s(5), .1), T.frac(s(5), .45)) + 18 * rampArea(t, T.at(s(6)), T.frac(s(6), .3));
    ctx.save(); ctx.globalAlpha = kin; for (const r of [...RBC, ...RBC2]) { const x = VX0 + 20 + ((r.u * 1560 + flow) % 1560), y = VY + r.dy * (hw - 16);
      ctx.fillStyle = C.red; ctx.beginPath(); ctx.ellipse(x, y, 15, 10, r.a, 0, 6.283); ctx.fill(); ctx.fillStyle = 'rgba(244,239,230,.55)'; ctx.beginPath(); ctx.ellipse(x, y, 6, 3.6, r.a, 0, 6.283); ctx.fill(); }
    ctx.fillStyle = 'rgba(107,76,154,.75)'; for (const q of PLT) { const x = VX0 + 20 + ((q.u * 1560 + flow * 1.02) % 1560), y = VY + q.dy * (hw - 12); ctx.beginPath(); ctx.ellipse(x, y, 4.2, 2.6, q.a + t * .5, 0, 6.283); ctx.fill(); }
    const marg = win(t, T.frac(s(2), .15), T.frac(s(2), .6));
    for (const w of WBC) { const x = VX0 + 30 + ((w.u * 1540 + flow * .82) % 1540), side = w.dy >= 0 ? 1 : -1, y = VY + lerp(w.dy, side * .62, marg) * (hw - 22) + Math.sin(t * 1.1 + w.u * 20) * 2;
      const edge = Math.min(1, (x - VX0 - 10) / 50, (VX1 - 10 - x) / 50); if (edge <= 0) continue; ctx.save(); ctx.globalAlpha = kin * edge; drawWBC(ctx, w, x, y, t, cam.zoom); ctx.restore(); }
    ctx.restore();
    // ---- heat: shimmer lines rising off the hyperaemic vessel ----
    const kh = fade(t, T.frac(s(2), .55), T.frac(s(2), .7), T.frac(s(3), .2), T.frac(s(3), .4));
    if (kh > 0) for (let j = 0; j < 6; j++) { const x0 = 560 + j * 150, ph = (t * .8 + j * .37) % 1, y0 = VY - hw - 20 - ph * 140; ctx.save(); ctx.globalAlpha = kh * Math.sin(ph * Math.PI); ctx.strokeStyle = C.red; ctx.lineWidth = 2.4 / cam.zoom;
      ctx.beginPath(); for (let k = 0; k <= 12; k++) { const y = y0 - k * 6; ctx.lineTo(x0 + Math.sin(k * .9 + t * 5) * 7, y); } ctx.stroke(); ctx.restore(); }
    // ---- protein-rich plasma leaking out (dots through the wall) ----
    const kpl = fade(t, T.frac(s(3), .02), T.frac(s(3), .15), T.frac(s(6), 0), T.frac(s(6), .3));
    if (kpl > 0) for (const q of PROT) { const k = p(t, T.frac(s(3), .02 + q.d * .4), T.frac(s(3), .5 + q.d * .45)); if (k <= 0) continue; const jx = nearJ(q.x); if (jx < 640 || jx > 1560) continue; A.dot(ctx, [jx + (q.x - jx) * .5 * k, wallY(jx, -1, hw) - 6 - k * q.h], { r: 3.2, col: C.vio, k: kpl }); }
    // ---- bacteria (损伤/感染) + mediators drifting to the nerve ----
    const kb = win(t, T.frac(s(1), .3), T.frac(s(1), .55)) * (1 - win(t, T.frac(s(8), .5), T.end(s(8))));
    if (kb > 0) { ctx.save(); ctx.globalAlpha = kb; ctx.strokeStyle = C.ink; ctx.lineCap = 'round'; ctx.lineWidth = 7; for (const b of BACT) { ctx.beginPath(); ctx.moveTo(b.x - 9 * Math.cos(b.a), b.y - 9 * Math.sin(b.a)); ctx.lineTo(b.x + 9 * Math.cos(b.a), b.y + 9 * Math.sin(b.a)); ctx.stroke(); } ctx.restore(); }
    const km = fade(t, T.frac(s(4), 0), T.frac(s(4), .1), T.frac(s(5), .1), T.frac(s(5), .3));
    if (km > 0) for (const m of MED) { const k = p(t, T.frac(s(4), .05 + m.d), T.frac(s(4), .5 + m.d)), e = 1 - (1 - k) ** 2; const x = lerp(INJ[0] - 150 + m.ox, NTIP[0] + 30 + m.ox * .3, e), y = lerp(INJ[1] + m.oy, NTIP[1] + m.oy * .3, e) + Math.sin(e * 6 + m.w) * 18;
      A.dot(ctx, [x, y], { r: 4.5, col: C.vio, k: km }); }
    // ---- nerve ending (ink) — flashes red & conducts when stimulated ----
    const kpain = win(t, T.frac(s(4), .4), T.frac(s(4), .6)) * (1 - win(t, T.frac(s(5), .2), T.frac(s(5), .5)));
    ink(ctx, 'c05.nerve', 'linearPath', [NERVE], { strokeWidth: 3, seed: 64 }, { k: kin });
    ink(ctx, 'c05.nb1', 'linearPath', [[NTIP, [600, 430], [618, 418]]], { strokeWidth: 2, seed: 65 }, { k: kin }); ink(ctx, 'c05.nb2', 'linearPath', [[NTIP, [590, 470], [612, 474]]], { strokeWidth: 2, seed: 66 }, { k: kin });
    if (kpain > 0) { ctx.save(); ctx.globalAlpha = kpain; ink(ctx, 'c05.nerveR', 'linearPath', [NERVE], { strokeWidth: 4.5, stroke: C.red, seed: 64 });
      for (let j = 0; j < 3; j++) { const u = ((t * 1.2 + j / 3) % 1), i = Math.min(2, Math.floor((1 - u) * 3)), f = (1 - u) * 3 - i, a = NERVE[3 - i], b = NERVE[2 - i] || NERVE[0]; A.dot(ctx, [lerp(a[0], b[0], f), lerp(a[1], b[1], f)], { r: 6, col: C.red }); }
      for (const d of [[-1, 0], [0, -1]]) { const c = [NTIP[0] + 60 + d[0] * 70, NTIP[1] + 20 + d[1] * 70]; A.arrow(ctx, [c[0] + 60, c[1] + 40], [NTIP[0] + 40, NTIP[1] + 10], { col: C.ink, k: kpain, w: 2.2 }); } ctx.restore(); }
    // ---- neutrophils (multilobed, distinct from RBC) ----
    for (const n of NEU) { const q = neutroPos(n, t, T); if (q.a <= 0) continue; if (n.wave === 0 && t < T.frac(s(2), .5)) continue;
      ctx.save(); ctx.globalAlpha = q.a * kin * (1 - .7 * win(t, T.frac(s(9), .3), T.end(s(9)))); pseudopod(ctx, q, n, t); ctx.translate(q.x, q.y); ctx.scale(q.sx, q.sy); drawNeutrophil(ctx, 0, 0, { lobes: n.lobes, rot: q.rot }, 3); ctx.restore(); }
    // ---- 增生: fibroblasts + collagen knit the defect from its edges ----
    const kr = win(t, T.frac(s(9), .1), T.frac(s(9), .85));
    if (kr > 0) for (const f of FIB) { const k = clamp(kr * 1.6 - f.d * .6); if (k <= 0) continue; ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a);
      ctx.fillStyle = C.vio; ctx.globalAlpha = k; ctx.beginPath(); ctx.ellipse(0, 0, 16 * k, 3.4, 0, 0, 6.283); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6 / cam.zoom; ctx.beginPath(); ctx.moveTo(-60 * k, 9); ctx.quadraticCurveTo(0, 13, 60 * k, 8); ctx.moveTo(-50 * k, -9); ctx.quadraticCurveTo(0, -13, 50 * k, -8); ctx.stroke(); ctx.restore(); }
    // ---- annotations (world, one focus at a time) ----
    const vl = fade(t, T.frac(s(1), .5), T.frac(s(1), .65), T.frac(s(2), 0), T.frac(s(2), .1));
    A.leader(ctx, [INJ[0] + 60, INJ[1] - 30], [INJ[0] + 120, INJ[1] - 110], [INJ[0] + 260, INJ[1] - 110], { k: vl }); A.label(ctx, '损伤 / 感染', INJ[0] + 128, INJ[1] - 132, { size: 28, w: 700, k: vl });
    A.leader(ctx, [700, VY + 44], [640, VY + 110], [480, VY + 110], { k: vl }); A.label(ctx, '微静脉：援军的通道', 480, VY + 88, { size: 26, w: 700, k: vl, align: 'left' }); A.label(ctx, '管壁衬一层扁平内皮细胞', 480, VY + 134, { size: 20, k: vl, alpha: .85 });
    A.leader(ctx, [305, surf(305, sw) + 30], [305, 410], [320, 410], { k: vl }); A.label(ctx, '黏膜上皮（单层柱状）', 326, 410, { size: 22, w: 700, k: vl });
    const k1 = fade(t, T.frac(s(2), .2), T.frac(s(2), .35), T.frac(s(3), 0), T.frac(s(3), .1));
    A.brace(ctx, [1500, VY - hw], [1500, VY + hw], { k: k1, depth: -12, col: C.red }); A.label(ctx, '血管扩张 · 充血', 1530, VY - 12, { size: 26, w: 700, col: C.red, k: k1 }); A.label(ctx, '血流变慢、血量增多', 1530, VY + 22, { size: 20, k: k1, alpha: .8 });
    const k2 = fade(t, T.frac(s(3), .25), T.frac(s(3), .4), T.frac(s(4), 0), T.frac(s(4), .1)), a2 = [NEU[2].x, VY - hw - 40];
    A.leader(ctx, a2, [a2[0] - 80, VY - 220], [a2[0] - 360, VY - 220], { k: k2 }); A.label(ctx, '富含蛋白质的血浆 + 白细胞', a2[0] - 360, VY - 242, { size: 26, w: 700, k: k2 }); A.label(ctx, '挤出血管 → 组织水肿', a2[0] - 360, VY - 196 + 28, { size: 20, k: k2, alpha: .8 }); A.label(ctx, '白细胞：贴壁滚动 → 黏附 → 从内皮间隙穿出', a2[0] - 360, VY - 196 + 60, { size: 20, k: k2, alpha: .8 });
    const k3 = fade(t, T.frac(s(4), .45), T.frac(s(4), .6), T.frac(s(5), 0), T.frac(s(5), .1));
    A.label(ctx, '张力 + 炎症因子', NTIP[0] - 30, NTIP[1] + 70, { size: 26, w: 700, k: k3 }); A.label(ctx, '刺激神经末梢', NTIP[0] - 30, NTIP[1] + 104, { size: 22, col: C.red, k: k3 });
    const k4 = fade(t, T.frac(s(5), .3), T.frac(s(5), .45), T.frac(s(6), 0), T.frac(s(6), .15));
    A.leader(ctx, [INJ[0] - 120, surf(INJ[0] - 120, sw) + 26], [INJ[0] - 170, TOP - 120], [INJ[0] - 400, TOP - 120], { k: k4 }); A.label(ctx, '受损细胞无法正常工作', INJ[0] - 400, TOP - 142, { size: 26, w: 700, k: k4 });
    // neutrophil identity tag (first time cells cross)
    const kn = fade(t, T.frac(s(3), .4), T.frac(s(3), .55), T.frac(s(4), 0), T.frac(s(4), .1)), np = neutroPos(NEU[0], t, T);
    A.ring(ctx, [np.x, np.y], 36, { k: kn, col: C.red }); A.label(ctx, '中性粒细胞 · 核分 2–5 叶', np.x + 42, np.y + 50, { size: 20, k: kn });
    A.label(ctx, '红细胞最多（无核）· 白细胞少量（有核）', 1180, VY + hw + 30, { size: 20, k: kn, alpha: .8 });
    // 05c: three actions, each pinned to its own process
    // Process captions rise in place (not separate slides): heavy -> quick -> gently settled.
    const lab = (k, x, y, a, b, arrival) => { const dy = 36 * (1 - arrival); A.label(ctx, a, x, y + dy, { size: 40, w: 800, col: C.red, k }); A.label(ctx, b, x, y + dy + 42, { size: 24, k, alpha: .85 }); };
    const kc1 = fade(t, T.frac(s(7), .06), T.frac(s(7), .28), T.frac(s(8), 0), T.frac(s(8), .1)); lab(kc1, INJ[0] + 170, INJ[1] + 70, '变质', '细胞受损坏死 · 战损', ease.inOutCubic(p(t, T.at(s(7)), T.frac(s(7), .28))));
    const kc2 = fade(t, T.frac(s(8), .02), T.frac(s(8), .14), T.frac(s(9), 0), T.frac(s(9), .1)); lab(kc2, INJ[0] + 170, INJ[1] + 70, '渗出', '白细胞、渗出液涌出血管 · 冲锋', ease.outCubic(p(t, T.at(s(8)), T.frac(s(8), .14))));
    const kc3 = fade(t, T.frac(s(9), .04), T.frac(s(9), .38), T.end(s(9), -.5), T.end(s(9))); lab(kc3, INJ[0] + 170, INJ[1] + 70, '增生', '纤维组织长出、填补创面 · 重建', ease.outQuint(p(t, T.at(s(9)), T.frac(s(9), .38))));
  },
  screen(ctx, t, T, cam, mood = moodAt(t, T)) {
    // main.js paints shared mood.paper behind tissue; the entry veil must not reset it to white.
    // entry: 04's lens (gangrenous field) shrinks away while the question is posed
    // starts on 04's exact last frame (same veil, lens, field zoom, gangrene overlay), then eases away
    const ks = (k => k * k * (3 - 2 * k))(win(t, T.at(s(0)), T.frac(s(0), .3))),   // eased start: no velocity jump out of 04's settle
      _ks0 = 0, kg = win(t, T.at(s(1)), T.frac(s(1), .2)), L = lensAt04(T.end(s(0) - 1) - 1e-3, T);
    const kd = win(t, T.frac(s(0), .2), T.at(s(1)));   // continuous slow drift/shrink + field push so the hold never freezes
    if (kg < 1) { const Ls = { x: lerp(L.x, 560, ks) - 18 * kd, y: lerp(L.y, 470, ks) + 6 * kd, r: lerp(L.r, 150, ks) * (1 - .08 * kd) * (1 - kg) }, te = T.end(s(0) - 1) - 1e-3;
      // leaving the eyepiece: the dark surround and pointer fade with mood.scope while the field shrinks away (no paper veil)
      drawSurround(ctx, Ls, mood.scope ?? 0, Ls.r + 8);
      drawLens04(ctx, Ls, { ...heAt04(te, T), t: lerp(T.end(s(0) - 1, -.55), t, ks) }, fsAt04(te, T) * creep04(t, T) * (1 + .06 * kd), gangAt04(te, T), offAt04(te, T)); drawPointer(ctx, Ls, mood.scope ?? 0);
      A.label(ctx, '坏疽的阑尾壁', Ls.x, Ls.y + Ls.r + 34, { size: 22, align: 'center', k: win(t, T.frac(s(0), .3), T.frac(s(0), .4)), alpha: .7 * (1 - kg) }); }
    const kq = fade(t, T.frac(s(0), .3), T.frac(s(0), .45), T.frac(s(1), .05), T.frac(s(1), .25));
    const qb = win(t, T.frac(s(0), .3), T.frac(s(0), .45)), qs = 96 * (1 + .03 * qb * Math.sin((t - T.at(s(0))) * 2.6)), qx = 920 + 10 * win(t, T.frac(s(0), .3), T.at(s(1)));
    A.arrow(ctx, [740, 470], [880 + (qx - 920), 470], { k: kq, w: 2.4 }); A.label(ctx, '炎症 ＝ ？', qx, 470, { size: qs, w: 800, k: kq });
    // 05a verdict: not "illness" itself → self-defence counter-attack (top band, above the field)
    const kn = fade(t, T.frac(s(1), .15), T.frac(s(1), .3), T.end(s(1), -.75), T.end(s(1), -.35));
    const w1 = A.label(ctx, '炎症 ≠「生病」本身', 960, 160, { size: 40, w: 700, align: 'center', k: kn });
    const kx = win(t, T.frac(s(1), .3), T.frac(s(1), .42)) * kn; if (w1) A.line(ctx, [960 - w1 / 2 + 130, 162], [960 + w1 / 2, 162], { k: kx, col: C.red, w: 3 });
    const ky = fade(t, T.frac(s(1), .55), T.frac(s(1), .7), T.end(s(1), -.75), T.end(s(1), -.35));
    A.label(ctx, '＝ 身体主动打响的自卫反击战', 960, 225, { size: 44, w: 800, col: C.red, align: 'center', k: ky });
    // five-sign ledger (top right), fills in narration order; stays through 05b
    const signs = ['红', '热', '肿', '痛', '功能障碍'], when = [[2, .3], [2, .65], [3, .45], [4, .55], [5, .5]];
    const kl = fade(t, T.at(s(2)), T.frac(s(2), .15), T.frac(s(6), 0), T.frac(s(6), .2));
    A.label(ctx, '炎症五征', 1220, 110, { size: 22, alpha: .65 * kl }); let x = 1220;
    signs.forEach((g, i) => { const on = win(t, T.frac(s(when[i][0]), when[i][1]), T.frac(s(when[i][0]), when[i][1] + .1)), k = on * kl; const cur = t < T.frac(s(when[i][0] + 1), 0);
      A.label(ctx, g, x, 160 - (i < 4 ? 6 * Math.sin(on * Math.PI) : 0), { size: 44, w: 800, col: cur && i !== 4 ? C.red : C.ink, alpha: i === 4 ? .5 : 1, k }); x += g.length * 44 + 30; });
    // 05c header: three basic actions
    const kh = fade(t, T.frac(s(6), .3), T.frac(s(6), .5), T.end(s(9), -.5), T.end(s(9)));
    A.label(ctx, '炎症的三种基本动作', 1220, 110, { size: 22, alpha: .65 * kh });
    ['变质', '渗出', '增生'].forEach((g, i) => { const on = t >= T.at(s(7 + i)); A.label(ctx, g, 1220 + i * 130, 160, { size: 40, w: 800, col: on && t < T.end(s(7 + i)) ? C.red : C.ink, k: kh, alpha: on ? 1 : .35 }); });
  },
  title(ctx, t, T) { titleBlock(ctx, t, T.frac(s(0), .05), '05 · 炎症是什么', '一场自卫反击战', 5); },
};
