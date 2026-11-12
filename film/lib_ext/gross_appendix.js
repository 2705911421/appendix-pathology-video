// Resected appendix — four gross states on one rig.
// stage 0 normal · 1 red · 2 yellow · 3 black. In-between values (0.5, 1.5, …)
// smoothstep the serosal palette and the pus / necrosis / hemorrhage layers.
// Spine and shaft width come from figure.js. The blind end is a round cap — figure.js
// leaves specimenOutline's tip array empty and pinches s>0.9 to a point, so the cap is built here.
// No Math.random. Ink via ink.js. Watercolour via wash.js (hd / soft / grain .12 / edge .3 / bleed .5).
import { C } from '../lib/tokens.js';
import { bake, get } from '../lib/wash.js';
import { shape, draw as inkDraw } from '../lib/ink.js';
import { spine, halfW } from '../lib/figure.js';
import { rng } from '../lib/motion.js';
import * as A from '../lib/ann.js';

export const PUS = '#CDB98A';
export const STATES = ['normal', 'red', 'yellow', 'black'];
// Identical contour and pose in all states, including fractional stages.
// Congestion and swelling are conveyed by colour and surface lighting.
const SWELL_K = [1, 1, 1, 1];
export const SWELL = { normal: SWELL_K[0], red: SWELL_K[1], yellow: SWELL_K[2], black: SWELL_K[3] };

const CAP_S = 0.9;
const MESO_TIP = 0.8;
const N_SHAFT = 40;
const WASH = { hd: true, soft: true, grain: .12, edge: .3, bleed: .5 };

export const META = {
  normal: { name: '正常', diag: '正常阑尾', sub: '灰粉色 · 浆膜光滑有光泽', tone: C.ink },
  red:    { name: '红',   diag: '单纯性阑尾炎', sub: '朱红充血 · 轻度肿胀', tone: C.red },
  yellow: { name: '黄',   diag: '化脓性阑尾炎', sub: '肿胀增粗 · 斑驳灰黄脓苔', tone: '#8A7348' },
  black:  { name: '黑',   diag: '坏疽性阑尾炎', sub: '局部坏死发黑 · 周围仍有红黄', tone: '#3A2438' },
};

// Serosal lighting. base is the opaque midtone of the cylinder (t≈0.5 across the tube).
// shadow is the mesenteric side, gloss is the serosal band on the lit side. All three are mixed
// into solid colours — a multiply gradient leaves 1px gaps that read as stripes.
const LOOK = [
  { base: [198, 154, 144], shadow: [64, 36, 34], gloss: [246, 234, 228] },
  { base: [206, 64, 56],   shadow: [58, 12, 18], gloss: [255, 228, 220] },
  { base: [196, 56, 50],   shadow: [52, 10, 16], gloss: [255, 224, 216] },
  { base: [184, 50, 46],   shadow: [44, 8, 14],  gloss: [248, 214, 208] },
];

const smooth = t => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
function ramp(stage, a, b) {
  if (stage <= a) return 0;
  if (stage >= b) return 1;
  return smooth((stage - a) / (b - a));
}
function knot(stage, table) {
  const s = Math.max(0, Math.min(3, stage));
  if (s >= 3) return table[3];
  const i = Math.floor(s), f = smooth(s - i);
  const A = table[i], B = table[i + 1];
  return typeof A === 'number' ? lerp(A, B, f) : mix3(A, B, f);
}

export function asStage(state) {
  if (typeof state === 'number' && Number.isFinite(state)) return Math.max(0, Math.min(3, state));
  const i = STATES.indexOf(state);
  return i < 0 ? 0 : i;
}
export function swellAt(stage) { return knot(asStage(stage), SWELL_K); }

export function frameAt(s) {
  const p = spine(s), q = spine(Math.min(1, s + .01)), r = spine(Math.max(0, s - .01));
  const dx = q[0] - r[0], dy = q[1] - r[1], L = Math.hypot(dx, dy) || 1;
  return { p, tx: dx / L, ty: dy / L, nx: -dy / L, ny: dx / L };
}
// Shaft uses halfW. Past 0.8 the radius eases so it meets the round cap without a kink.
export function tubeRadius(s, swell) {
  const u = Math.max(0, Math.min(CAP_S, s));
  if (u <= 0.8) return halfW(u, swell);
  const w0 = halfW(0.8, swell), w1 = halfW(CAP_S, swell);
  const e = smooth((u - 0.8) / (CAP_S - 0.8));
  return w0 + (w1 - w0) * e;
}
function addN(f, w) { return [f.p[0] + f.nx * w, f.p[1] + f.ny * w]; }

export function tubeOutline(swell) {
  const L = [], R = [];
  for (let i = 0; i <= N_SHAFT; i++) {
    const s = CAP_S * (i / N_SHAFT), f = frameAt(s), w = tubeRadius(s, swell);
    L.push(addN(f, w));
    R.push(addN(f, -w));
  }
  const f = frameAt(CAP_S), rad = tubeRadius(CAP_S, swell), arc = [];
  for (let i = 1; i < 14; i++) {
    const a = Math.PI * (i / 14);
    arc.push([
      f.p[0] + f.nx * Math.cos(a) * rad + f.tx * Math.sin(a) * rad,
      f.p[1] + f.ny * Math.cos(a) * rad + f.ty * Math.sin(a) * rad,
    ]);
  }
  // Elliptical cut face: from the lit lip (−normal) back to the mesenteric lip, bulging out of the base.
  const f0 = frameAt(0), w0 = tubeRadius(0, swell), base = [];
  for (let i = 1; i < 8; i++) {
    const ang = Math.PI * (1 - i / 8);
    const bulge = Math.sin(ang) * w0 * 0.34;
    base.push([
      f0.p[0] + f0.nx * Math.cos(ang) * w0 - f0.tx * bulge,
      f0.p[1] + f0.ny * Math.cos(ang) * w0 - f0.ty * bulge,
    ]);
  }
  return L.concat(arc, R.reverse(), base);
}

// Fatty mesoappendix: thick through the middle, lobulated free edge, blunt end.
// Not a triangle and not a vessel chart. `extra` is pixels past the wall.
export function mesoHang(s) {
  if (s >= MESO_TIP) return 0;
  const u = Math.max(0, s) / MESO_TIP;
  const belly = Math.sin(Math.PI * Math.min(u * 0.96, 1)) ** 0.62;
  let h = 44 + 78 * belly;
  h += 16 * (0.5 + 0.5 * Math.sin(u * Math.PI * 3.15 + 0.35)) ** 1.35;
  h += 8 * Math.sin(u * Math.PI * 6.5 + 1.05);
  h += 4 * Math.sin(u * 20.5 + 0.4);
  if (u > 0.76) h *= Math.cos(((u - 0.76) / 0.24) * Math.PI * 0.5);
  return Math.max(0, h);
}
export function mesoPt(s, sw, extra) {
  const f = frameAt(Math.max(0, Math.min(1, s)));
  const w = tubeRadius(Math.max(0, Math.min(CAP_S, s)), sw) + extra;
  return [f.p[0] + f.nx * w, f.p[1] + f.ny * w];
}
export function sidePt(s, sw, extra) {
  const f = frameAt(Math.max(0, Math.min(1, s)));
  const w = tubeRadius(Math.max(0, Math.min(CAP_S, s)), sw) + extra;
  return [f.p[0] - f.nx * w, f.p[1] - f.ny * w];
}
function mesoLoop(sw) {
  const wall = [], free = [];
  const N = 28;
  for (let i = 0; i <= N; i++) wall.push(mesoPt((i / N) * MESO_TIP, sw, 0));
  for (let i = N; i >= 0; i--) free.push(mesoPt((i / N) * MESO_TIP, sw, mesoHang((i / N) * MESO_TIP)));
  return wall.concat(free);
}
function mesoFreeEdge(sw) {
  const pts = [];
  const N = 32;
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * MESO_TIP;
    pts.push(mesoPt(s, sw, mesoHang(s)));
  }
  return pts;
}
export function toScreen(pose, p) {
  const c = Math.cos(pose.rot), sn = Math.sin(pose.rot);
  return [pose.x + (p[0] * c - p[1] * sn) * pose.sc, pose.y + (p[0] * sn + p[1] * c) * pose.sc];
}
function path(ctx, pts, close = true) {
  ctx.beginPath();
  pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
  if (close) ctx.closePath();
}

function along(b, P, col, a, rK, seed, step) {
  const sw = 1;
  for (let u = 0; u <= CAP_S; u += step) {
    const p = spine(u);
    P.fill(b, P.blob(p[0], p[1], tubeRadius(u, sw) * rK, 20, .32, seed + u * 100), col, a, .2, [.4, .5]);
  }
}
function smearPoly(s, vFrac, len, wid, seed) {
  const sw = 1, f = frameAt(s), w = tubeRadius(Math.min(s, CAP_S), sw);
  const R = rng(seed | 0);
  const n = 36 + (seed % 4);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const jag = 0.86 + 0.14 * Math.sin(a * 5 + seed) + (R() - 0.5) * 0.25;
    const spike = R() > 0.9 ? 1.14 : 1;
    const u = Math.cos(a) * len * jag * spike;
    const v = Math.sin(a) * wid * (0.5 + R());
    const across = w * vFrac + v;
    pts.push([f.p[0] + f.tx * u + f.nx * across, f.p[1] + f.ty * u + f.ny * across]);
  }
  return pts;
}

// Irregular serosal sheets. Gaps stay red. Same polygons at every stage; alpha carries the mix.
const PUS_PATCHES = [
  [0.16, -0.22, 48, 18], [0.28, 0.18, 34, 15], [0.38, -0.42, 56, 20],
  [0.48, 0.02, 40, 17], [0.56, -0.28, 32, 13], [0.64, 0.26, 46, 16],
  [0.72, -0.08, 28, 13], [0.24, 0.46, 20, 10], [0.44, -0.58, 22, 9],
  [0.60, 0.48, 16, 8], [0.33, -0.02, 18, 11], [0.68, -0.40, 24, 11],
];
// Distal, mostly the lit serosa — the mesenteric side of the tip stays red and yellow.
const NEC_PATCHES = [
  [0.73, -0.38, 44, 22, '#161018'],
  [0.80, -0.06, 52, 26, '#1C1224'],
  [0.86, -0.30, 32, 16, '#24182C'],
  [0.77, 0.18, 18, 11, '#100C14'],
];

const PIX = new Map();
function pin(k) {
  const src = get(k); if (!src) return null;
  const im = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, src.width, src.height);
  const held = document.createElement('canvas');
  held.width = src.width; held.height = src.height;
  held.getContext('2d', { willReadFrequently: true }).putImageData(im, 0, 0);
  PIX.set(k, held);
  return held;
}
// keepWhite used to leave opaque paper-white brush streaks. Pus is only #CDB98A;
// near-white pixels are dropped, and the dry edge stays a darker ochre, not a white rim.
function lockPus(cv) {
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const im = ctx.getImageData(0, 0, cv.width, cv.height), d = im.data;
  const pr = 0xCD, pg = 0xB9, pb = 0x8A, pLum = (pr + pg + pb) / 3;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255;
    if (a < 0.025) { d[i + 3] = 0; continue; }
    const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
    const chroma = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
    if (lum > 208 && chroma < 32) { d[i + 3] = 0; continue; }
    const dark = 0.78 + 0.22 * Math.max(0, Math.min(1, lum / pLum));
    d[i] = pr * dark; d[i + 1] = pg * dark; d[i + 2] = pb * dark;
    d[i + 3] = Math.min(255, a * 2.35 * 255);
  }
  ctx.putImageData(im, 0, 0);
}
// Pull any red-brown fringe to purple-black. The interior is opaque so the red serosa
// does not show through and turn the patch mahogany. Pale halos go away.
function lockNecro(cv) {
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const im = ctx.getImageData(0, 0, cv.width, cv.height), d = im.data;
  const pr = 0x1A, pg = 0x12, pb = 0x1E;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255;
    if (a < 0.05) { d[i + 3] = 0; continue; }
    const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
    if (lum > 140) { d[i + 3] = 0; continue; }
    const k = 0.32 + 0.5 * Math.max(0, Math.min(1, lum / 80));
    d[i] = pr * k; d[i + 1] = pg * k; d[i + 2] = pb * k;
    const na = a > 0.18 ? 1 : (a - 0.05) / 0.13;
    d[i + 3] = Math.round(Math.max(0, Math.min(1, na)) * 255);
  }
  ctx.putImageData(im, 0, 0);
}
function drawPinned(ctx, key, x, y, size, { alpha = 1, blend = 'multiply' } = {}) {
  const img = PIX.get(key); if (!img || alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = blend;
  ctx.translate(x, y);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
}

// Exact #CDB98A sheets. The watercolour bake is only a mask: filling the live canvas
// with destination-in would punch holes in the tube. Interior alpha is hardened so the
// red serosa does not blush through, and the feather stays short and ochre, not white.
let pusLayer = null;
function buildPus() {
  const src = PIX.get('g.pus');
  if (!src) return;
  const S = src.width;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.setTransform(S / 1024, 0, 0, S / 1024, S / 2, S / 2);
  c.fillStyle = PUS;
  PUS_PATCHES.forEach((spec, j) => {
    path(c, smearPoly(spec[0], spec[1], spec[2], spec[3], 2400 + j * 17));
    c.fill();
  });
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'destination-in';
  c.drawImage(src, 0, 0);
  const im = c.getImageData(0, 0, S, S), d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255;
    const na = a > 0.2 ? 1 : a > 0.07 ? (a - 0.07) / 0.13 : 0;
    d[i] = 0xCD; d[i + 1] = 0xB9; d[i + 2] = 0x8A;
    d[i + 3] = Math.round(na * 255);
  }
  c.putImageData(im, 0, 0);
  pusLayer = cv;
}
function drawPus(ctx, alpha) {
  if (!pusLayer || alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(pusLayer, -512, -512, 1024, 1024);
  ctx.restore();
}

export function prepare() {
  // scaleBrushes multiplies. One ×2.4, then hold it — later bakes pass scale 1.
  bake('g.pink', (b, P) => {
    along(b, P, '#C4A094', 120, 1.55, 3, .06);
    along(b, P, '#A88880', 90, 1.05, 4, .09);
    along(b, P, '#8A7068', 70, .7, 5, .12);
  }, { ...WASH, seed: 21, scale: 2.4 });
  pin('g.pink');
  bake('g.red', (b, P) => {
    along(b, P, C.red, 150, 1.45, 8, .055);
    along(b, P, '#C9455A', 120, 1.1, 9, .08);
    along(b, P, '#6E1A24', 100, .72, 10, .1);
  }, { ...WASH, seed: 22, scale: 1 });
  pin('g.red');
  bake('g.pus', (b, P) => {
    PUS_PATCHES.forEach((spec, j) => {
      P.fill(b, smearPoly(spec[0], spec[1], spec[2], spec[3], 2400 + j * 17), PUS, 200, .22, [.24, .34]);
    });
  }, { ...WASH, seed: 25, scale: 1 });
  lockPus(pin('g.pus'));
  bake('g.necro', (b, P) => {
    NEC_PATCHES.forEach((spec, j) => {
      P.fill(b, smearPoly(spec[0], spec[1], spec[2], spec[3], 4200 + j * 19), spec[4], 230, .18, [.3, .4]);
    });
  }, { ...WASH, seed: 27, scale: 1 });
  lockNecro(pin('g.necro'));
  bake('g.meso', (b, P) => {
    P.fill(b, P.blob(0, 0, 240, 26, .34, 8), '#E2B45A', 150, .4, [.32, .42]);
    P.fill(b, P.blob(-40, 16, 140, 18, .3, 9), '#C99840', 100, .35, [.28, .38]);
    P.fill(b, P.blob(36, -12, 110, 16, .32, 10), '#E8C878', 80, .35, [.3, .4]);
  }, { ...WASH, seed: 29, scale: 1 });
  pin('g.meso');
  buildPus();
}

function paintMeso(ctx, swell) {
  const loop = mesoLoop(swell);
  ctx.save();
  path(ctx, loop); ctx.clip();
  ctx.fillStyle = '#E2B85A';
  path(ctx, loop); ctx.fill();
  const N = 26;
  for (let i = 0; i < N; i++) {
    const step = MESO_TIP / N;
    const s0 = step * i, s1 = Math.min(MESO_TIP, step * (i + 1.25));
    const h0 = mesoHang(s0), h1 = mesoHang(s1);
    if (h0 < 4 && h1 < 4) continue;
    const a = mesoPt(s0, swell, 0), b = mesoPt(s1, swell, 0);
    const c = mesoPt(s1, swell, h1), d = mesoPt(s0, swell, h0);
    const g = ctx.createLinearGradient(a[0], a[1], d[0], d[1]);
    // Whole hang stays yellow fat. The old 0.8 stop (#F6E6BC) turned the lower two-thirds cream.
    g.addColorStop(0, '#C4923E');
    g.addColorStop(0.14, '#D4A84E');
    g.addColorStop(0.48, '#E4BE62');
    g.addColorStop(0.78, '#E8C56E');
    g.addColorStop(1, '#D4A84E');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
    ctx.closePath(); ctx.fill();
  }
  for (let s = 0.04; s < MESO_TIP; s += 0.07) {
    const h = mesoHang(s);
    if (h < 20) continue;
    const p = mesoPt(s, swell, h * 0.62);
    drawPinned(ctx, 'g.meso', p[0], p[1], h * 0.55 / 240 * 1024, { alpha: 0.22, blend: 'multiply' });
  }
  ctx.restore();
}

function vesselGeom(swell) {
  const R = rng(12007);
  const artery = [], vein = [];
  let s = 0.04, fa = 0.62, fv = 0.4;
  while (s < 0.74) {
    const h = mesoHang(s);
    artery.push(mesoPt(s, swell, Math.max(3, h * fa)));
    vein.push(mesoPt(s, swell, Math.max(3, h * fv)));
    s += 0.048;
    fa = Math.max(0.3, Math.min(0.78, fa + (R() - 0.5) * 0.16));
    fv = Math.max(0.22, Math.min(0.58, fv + (R() - 0.5) * 0.12));
  }
  const branches = [];
  [0.14, 0.32, 0.5].forEach((s0, i) => {
    const h = mesoHang(s0);
    const f = frameAt(s0);
    const start = mesoPt(s0, swell, h * (0.5 + 0.08 * i));
    const mid = mesoPt(s0 + 0.03, swell, h * 0.28);
    const end = mesoPt(s0 + 0.02, swell, h * 0.06);
    // A small sideways jog so the branch is not a ruler line.
    mid[0] += f.tx * (i % 2 ? 8 : -8);
    mid[1] += f.ty * (i % 2 ? 8 : -8);
    branches.push([start, mid, end]);
  });
  return { artery, vein, branches };
}

function lobules(swell) {
  const out = [];
  for (let i = 1; i < 36; i++) {
    const s0 = MESO_TIP * (i - 1) / 36, s1 = MESO_TIP * i / 36, s2 = MESO_TIP * (i + 1) / 36;
    const h1 = mesoHang(s1);
    if (h1 >= mesoHang(s0) && h1 >= mesoHang(s2) && h1 > 56) out.push({ s: s1, h: h1 });
  }
  return out;
}

// Small warm caps on the free-edge bulges. No cream coins and no white centres.
function paintLobules(ctx, swell, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  path(ctx, mesoLoop(swell)); ctx.clip();
  lobules(swell).forEach(L => {
    const f = frameAt(L.s);
    const ang = Math.atan2(f.ty, f.tx);
    const belly = mesoPt(L.s, swell, L.h * 0.8);
    const lit = mesoPt(L.s, swell, L.h * 0.6);
    ctx.fillStyle = `rgba(168, 112, 40, ${0.62 * alpha})`;
    ctx.beginPath();
    ctx.ellipse(belly[0], belly[1], L.h * 0.2, L.h * 0.12, ang, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(226, 176, 78, ${0.78 * alpha})`;
    ctx.beginPath();
    ctx.ellipse(lit[0], lit[1], L.h * 0.16, L.h * 0.1, ang, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

// Opaque yellow dabs laid across the artery so it dives through the fat instead of sitting on top.
function paintFatDabs(ctx, swell) {
  const R = rng(8801);
  ctx.save();
  path(ctx, mesoLoop(swell)); ctx.clip();
  for (let i = 0; i < 11; i++) {
    const s = 0.08 + i * 0.058;
    const h = mesoHang(s);
    if (h < 22) continue;
    const c = mesoPt(s, swell, h * (0.4 + R() * 0.28));
    const f = frameAt(s);
    const ang = Math.atan2(f.ty, f.tx) + (R() - 0.5) * 0.5;
    ctx.fillStyle = i % 2 ? 'rgba(232, 196, 108, 0.9)' : 'rgba(210, 162, 62, 0.9)';
    ctx.beginPath();
    ctx.ellipse(c[0], c[1], 8 + R() * 12, 5 + R() * 5, ang, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// t = 0 on the mesenteric (shadow) wall, t = 1 on the lit serosa. Opaque, so overlaps do not darken.
function crossColor(look, t) {
  const sh = look.shadow, base = look.base, gl = look.gloss;
  const u = Math.max(0, Math.min(1, t));
  const stops = [0, 0.16, 0.34, 0.52, 0.74, 0.9, 1];
  const cols = [
    mix3(sh, base, 0.16),
    mix3(sh, base, 0.42),
    mix3(sh, base, 0.76),
    base,
    mix3(base, gl, 0.32),
    mix3(base, gl, 0.58),
    mix3(base, gl, 0.16),
  ];
  let i = 0;
  while (i < stops.length - 2 && u > stops[i + 1]) i++;
  const span = stops[i + 1] - stops[i] || 1;
  return mix3(cols[i], cols[i + 1], (u - stops[i]) / span);
}
function quad(ctx, a, b, c, d) {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
  ctx.closePath(); ctx.fill();
}

function paintCylinder(ctx, swell, look) {
  const outline = tubeOutline(swell);
  ctx.save();
  path(ctx, outline); ctx.clip();
  ctx.fillStyle = css(look.base);
  path(ctx, outline); ctx.fill();

  const N = 32;
  for (let i = 0; i < N; i++) {
    const step = CAP_S / N;
    const s0 = step * i;
    const s1 = Math.min(CAP_S, s0 + step * 1.22);
    const f0 = frameAt(s0), f1 = frameAt(s1);
    const w0 = tubeRadius(s0, swell), w1 = tubeRadius(s1, swell);
    const sh = addN(f0, w0), li = addN(f0, -w0);
    const g = ctx.createLinearGradient(sh[0], sh[1], li[0], li[1]);
    for (let k = 0; k <= 8; k++) g.addColorStop(k / 8, css(crossColor(look, k / 8)));
    ctx.fillStyle = g;
    quad(ctx,
      addN(f0, w0), addN(f1, w1),
      addN(f1, -w1), addN(f0, -w0));
  }
  paintCap(ctx, swell, look);
  ctx.restore();
  return outline;
}

// Blind end: chords parallel to the tangent, same cross-section colours as the shaft.
// A triangle fan left radial spokes; a gradient of solid strips does not.
function paintCap(ctx, swell, look) {
  const f = frameAt(CAP_S), R = tubeRadius(CAP_S, swell), c = f.p;
  const strips = 28;
  const pt = (u, h) => [
    c[0] + f.nx * u * R + f.tx * h,
    c[1] + f.ny * u * R + f.ty * h,
  ];
  for (let i = 0; i < strips; i++) {
    const a0 = i / strips;
    const a1 = Math.min(1, (i + 1.28) / strips);
    const u0 = 1 - 2 * a0, u1 = 1 - 2 * a1;
    const h0 = Math.sqrt(Math.max(0, 1 - u0 * u0)) * R;
    const h1 = Math.sqrt(Math.max(0, 1 - u1 * u1)) * R;
    ctx.fillStyle = css(crossColor(look, (a0 + a1) / 2));
    quad(ctx, pt(u0, 0), pt(u0, h0), pt(u1, h1), pt(u1, 0));
  }
}

function paintCut(ctx, swell, look) {
  const f = frameAt(0.02), w = tubeRadius(0.02, swell);
  ctx.save();
  ctx.translate(f.p[0] - f.tx * w * 0.02, f.p[1] - f.ty * w * 0.02);
  ctx.rotate(Math.atan2(f.ny, f.nx));
  ctx.fillStyle = css(look.shadow, 0.85);
  ctx.beginPath();
  ctx.ellipse(0, w * 0.02, w * 0.16, w * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Hemorrhage sits on the lit serosa so it does not melt into the congested shadow.
const BLEEDS = [
  { s: 0.18, v: -0.42, rx: 15, ry: 10, col: [122, 48, 56] },
  { s: 0.32, v: -0.58, rx: 11, ry: 8, col: [142, 58, 62] },
  { s: 0.44, v: -0.22, rx: 17, ry: 11, col: [168, 64, 78] },
  { s: 0.56, v: -0.5, rx: 10, ry: 7, col: [154, 62, 72] },
];
function paintBleeds(ctx, swell, alpha) {
  if (alpha <= 0.01) return;
  const R = rng(6301);
  ctx.save();
  BLEEDS.forEach(b => {
    const f = frameAt(b.s), w = tubeRadius(b.s, swell);
    const c = [f.p[0] + f.nx * w * b.v, f.p[1] + f.ny * w * b.v];
    const ang = Math.atan2(f.ty, f.tx);
    ctx.fillStyle = css([b.col[0] * 0.62, b.col[1] * 0.55, b.col[2] * 0.55], 0.95 * alpha);
    ctx.beginPath();
    ctx.ellipse(c[0], c[1], b.rx * 1.18, b.ry * 1.15, ang, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(b.col, 0.92 * alpha);
    ctx.beginPath();
    const jx = (R() - 0.5) * 3, jy = (R() - 0.5) * 2;
    ctx.ellipse(c[0] + jx, c[1] + jy, b.rx, b.ry * (0.85 + R() * 0.2), ang, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function paintPit(ctx, swell, alpha) {
  if (alpha <= 0.02) return;
  const s = 0.8, f = frameAt(s), w = tubeRadius(s, swell);
  const c = [f.p[0] + f.nx * w * -0.1, f.p[1] + f.ny * w * -0.1];
  ctx.save();
  ctx.translate(c[0], c[1]);
  ctx.rotate(Math.atan2(f.ty, f.tx));
  ctx.globalAlpha *= alpha;
  const g = ctx.createRadialGradient(-3, -2, 1, 1, 1, 16);
  g.addColorStop(0, '#07060A');
  g.addColorStop(0.45, '#120E16');
  g.addColorStop(0.78, '#3A2C44');
  g.addColorStop(1, 'rgba(18, 12, 22, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(214, 196, 188, 0.55)';
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.ellipse(-1, -2, 9, 5, 0, Math.PI * 1.15, Math.PI * 1.9);
  ctx.stroke();
  ctx.restore();
}

function inkStroke(ctx, key, kind, args, o, alpha) {
  if (alpha <= 0.01) return;
  // fill:false — rough's toPaths sets fill to the string 'none', which is truthy, so ink.js
  // would fill the path with whatever fillStyle is current (the paper). An open curve then
  // closes and paints a paper ribbon across the fat.
  inkDraw(ctx, shape(key, kind, args, { boil: false, ...o }, true), { alpha, fill: false });
}

const SURFACE = [];
function surfacePaths() {
  if (SURFACE.length) return SURFACE;
  const R = rng(41011);
  for (let i = 0; i < 7; i++) {
    const s0 = 0.08 + R() * 0.5;
    const len = 0.1 + R() * 0.14;
    const side = i < 5 ? -1 : 1;
    const inset0 = 0.22 + R() * 0.46;
    const wob = [];
    for (let k = 0; k <= 8; k++) wob.push((R() - 0.5) * 0.16);
    SURFACE.push({ s0, len, side, inset0, wob, w: 0.7 + R() * 0.55 });
  }
  return SURFACE;
}
function surfaceAt(swell) {
  return surfacePaths().map(v => {
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const s = Math.min(CAP_S - 0.03, v.s0 + v.len * k / 8);
      const f = frameAt(s), w = tubeRadius(s, swell);
      const ins = Math.max(0.1, Math.min(0.88, v.inset0 + Math.sin(k * 0.85) * 0.1 + v.wob[k]));
      pts.push([f.p[0] + f.nx * w * ins * v.side, f.p[1] + f.ny * w * ins * v.side]);
    }
    return { pts, w: v.w };
  });
}

function drawMesoInk(ctx, swell, px) {
  const edge = mesoFreeEdge(swell);
  inkStroke(ctx, 'g.mesoE', 'curve', [edge], { strokeWidth: 1.7 * px, roughness: .62, bowing: .35, seed: 61 }, 0.78);
  const cap = [mesoPt(0, swell, 0), mesoPt(0, swell, mesoHang(0))];
  inkStroke(ctx, 'g.mesoCap', 'linearPath', [cap], { strokeWidth: 1.8 * px, roughness: .7, bowing: .3, seed: 62 }, 0.72);
  // Creases only. The artery and vein are already under the lobule caps.
  const lobes = lobules(swell);
  lobes.slice(0, -1).forEach((L, i) => {
    const nxt = lobes[i + 1];
    if (!nxt || nxt.s - L.s > 0.22) return;
    const a = mesoPt(L.s + (nxt.s - L.s) * 0.5, swell, mesoHang((L.s + nxt.s) / 2) * 0.55);
    const f = frameAt((L.s + nxt.s) / 2);
    const p1 = [a[0] - f.tx * 10 + f.nx * 4, a[1] - f.ty * 10 + f.ny * 4];
    const p2 = [a[0] + f.tx * 12 + f.nx * 2, a[1] + f.ty * 12 + f.ny * 2];
    inkStroke(ctx, 'g.crease' + i, 'curve', [[p1, a, p2]], { strokeWidth: 0.8 * px, roughness: .6, bowing: .25, seed: 190 + i }, 0.28);
  });
}

function drawSurface(ctx, swell, px, cong) {
  const col = css(mix3([176, 132, 126], [214, 69, 58], cong));
  surfaceAt(swell).forEach((v, i) => {
    const show = i < 3 ? 0.28 + 0.55 * cong : cong;
    inkStroke(ctx, 'g.sv' + i, 'curve', [v.pts], { stroke: col, strokeWidth: (v.w * (0.75 + 0.45 * cong)) * px, roughness: .55, bowing: .28, seed: 220 + i }, show * 0.8);
  });
}

function drawGlossInk(ctx, swell, px, amount) {
  if (amount <= 0.05) return;
  [[0.14, 0.24, 201], [0.36, 0.46, 202], [0.56, 0.66, 203]].forEach(([a, b, seed], i) => {
    const pts = [];
    for (let j = 0; j <= 5; j++) {
      const s = a + (b - a) * (j / 5), f = frameAt(s), w = tubeRadius(s, swell);
      pts.push([f.p[0] - f.nx * w * 0.62, f.p[1] - f.ny * w * 0.62]);
    }
    inkStroke(ctx, 'g.hi' + i, 'curve', [pts], { stroke: '#FFFaf6', strokeWidth: 1.35 * px, roughness: .4, bowing: .2, seed }, amount);
  });
}

function drawTubeInk(ctx, swell, px, alpha) {
  const wall = tubeOutline(swell);
  const closed = wall.concat([wall[0]]);
  inkStroke(ctx, 'g.wall', 'linearPath', [closed], { strokeWidth: 2.6 * px, roughness: .9, bowing: .8, seed: 81 }, alpha);
  inkStroke(ctx, 'g.wall2', 'linearPath', [closed], { strokeWidth: 1.2 * px, roughness: 1.15, bowing: 1.0, seed: 97 }, alpha * 0.5);
}

export function drawAppendix(ctx, state, pose, { alpha = 1 } = {}) {
  const stage = asStage(state);
  const swell = swellAt(stage);
  const look = {
    base: knot(stage, LOOK.map(L => L.base)),
    shadow: knot(stage, LOOK.map(L => L.shadow)),
    gloss: knot(stage, LOOK.map(L => L.gloss)),
  };
  const cong = ramp(stage, 0, 1);
  const pusA = ramp(stage, 1, 2);
  const necA = ramp(stage, 2, 3);
  const bleedA = ramp(stage, 2.1, 2.85);
  const glossK = lerp(0.72, 0.28, Math.min(1, stage / 2));
  const px = 1 / pose.sc;

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = 'source-over';
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.rot);
  ctx.scale(pose.sc, pose.sc);

  paintMeso(ctx, swell);
  const { artery, vein, branches } = vesselGeom(swell);
  const art = mix3([112, 32, 36], [158, 36, 42], cong);
  // Vessels under the fat dabs, clipped to the meso, so they run inside the fat.
  ctx.save();
  path(ctx, mesoLoop(swell)); ctx.clip();
  inkStroke(ctx, 'g.veinB', 'curve', [vein], { stroke: '#5A2830', strokeWidth: (1.7 + 0.35 * cong) * px, roughness: .5, bowing: .2, seed: 142 }, 0.88);
  inkStroke(ctx, 'g.artB', 'curve', [artery], { stroke: css(art), strokeWidth: (2.5 + 0.7 * cong) * px, roughness: .48, bowing: .22, seed: 141 }, 0.92);
  branches.forEach((pts, i) => {
    inkStroke(ctx, 'g.brB' + i, 'curve', [pts], { stroke: css(art), strokeWidth: (1.45 + 0.35 * cong) * px, roughness: .5, bowing: .2, seed: 171 + i }, 0.85);
  });
  ctx.restore();
  paintFatDabs(ctx, swell);
  paintLobules(ctx, swell, 1);
  drawMesoInk(ctx, swell, px);

  paintCylinder(ctx, swell, look);
  ctx.save();
  path(ctx, tubeOutline(swell)); ctx.clip();
  drawPinned(ctx, 'g.pink', 0, 0, 1024, { alpha: (1 - cong) * 0.28, blend: 'multiply' });
  drawPinned(ctx, 'g.red', 0, 0, 1024, { alpha: cong * 0.4, blend: 'multiply' });
  drawGlossInk(ctx, swell, px, glossK * (1 - pusA * 0.8) * 0.4);
  drawSurface(ctx, swell, px, cong);
  drawPus(ctx, pusA);
  paintBleeds(ctx, swell, bleedA);
  drawPinned(ctx, 'g.necro', 0, 0, 1024, { alpha: necA, blend: 'source-over' });
  paintPit(ctx, swell, necA);
  paintCut(ctx, swell, look);
  ctx.restore();

  drawTubeInk(ctx, swell, px, 1);
  ctx.restore();
}

const NOTES = {
  normal: [
    { s: 0.42, side: -1, d: 8, label: '浆膜光泽', dir: 'up', shelf: 'right' },
    { s: 0.36, extra: 0.62, label: '阑尾系膜', dir: 'down', shelf: 'left' },
    { s: 0.16, extra: 0.45, label: '系膜血管细', dir: 'down', shelf: 'left' },
  ],
  red: [
    { s: 0.28, side: -1, d: 8, label: '朱红充血', dir: 'up', col: C.red, shelf: 'left' },
    { s: 0.62, side: -1, d: 8, label: '表面血管扩张', dir: 'up', shelf: 'right' },
    { s: 0.22, extra: 0.7, label: '轻度肿胀', dir: 'down', shelf: 'left' },
  ],
  yellow: [
    { s: 0.4, side: -1, d: 8, label: '灰黄色脓苔', dir: 'up', shelf: 'left', lift: 48 },
    { s: 0.64, side: -1, d: 8, label: '斑驳、片状', dir: 'up', shelf: 'right' },
    { s: 0.24, extra: 0.62, label: '明显肿胀增粗', dir: 'down', shelf: 'left' },
  ],
  black: [
    { s: 0.82, side: -1, d: 10, label: '局部坏死发黑', dir: 'up', shelf: 'right' },
    { s: 0.32, side: -1, d: 8, label: '出血斑', dir: 'up', shelf: 'left' },
    { s: 0.5, side: -1, d: 8, label: '周围仍有红、黄', dir: 'up', shelf: 'right', lift: 36 },
  ],
};

function noteKey(state) {
  if (typeof state === 'number') return STATES[Math.round(Math.max(0, Math.min(3, state)))];
  return state;
}

export function drawNotes(ctx, state, pose) {
  const key = noteKey(state);
  const swell = SWELL[key];
  NOTES[key].forEach(n => {
    const f = frameAt(n.s);
    const local = n.extra != null
      ? mesoPt(n.s, swell, mesoHang(n.s) * n.extra)
      : [f.p[0] + f.nx * (tubeRadius(n.s, swell) + (n.d || 0)) * (n.side || 1),
         f.p[1] + f.ny * (tubeRadius(n.s, swell) + (n.d || 0)) * (n.side || 1)];
    const p = toScreen(pose, local);
    const up = n.dir === 'up';
    const qy = p[1] + (up ? -78 : 86) - (n.lift || 0);
    const shelf = n.label.length * 15 + 12;
    const right = n.shelf === 'right' ? true : n.shelf === 'left' ? false : p[0] > 1300;
    const qx = right ? p[0] - 36 : p[0] + 36;
    const rx = right ? qx - shelf : qx + shelf;
    A.leader(ctx, p, [qx, qy], [rx, qy], { k: 1, elbow: true });
    A.label(ctx, n.label, right ? rx : qx + 6, qy - 16, { size: 26, w: 700, col: n.col || C.ink, halo: true, align: right ? 'right' : 'left' });
  });
}

export function drawTitle(ctx, state, { x = 96, y = 120 } = {}) {
  const m = META[noteKey(state)];
  ctx.save(); ctx.fillStyle = m.tone; ctx.fillRect(x, y + 8, 64, 5); ctx.restore();
  A.label(ctx, '大体标本 画风样张', x, y - 36, { size: 22, w: 500, alpha: .55 });
  A.label(ctx, m.diag, x, y + 52, { size: 48, w: 800, col: m.tone });
  A.label(ctx, m.sub, x, y + 104, { size: 26, w: 500, alpha: .78 });
}
