// Resected appendix specimen — four gross states (normal / red / yellow / black).
// Geometry from engine/lib/figure.js (spine, halfW, specimenOutline). Washes baked once.
// Ink via engine/lib/ink.js. No Math.random; all jitter is rng(fixed seed) or bake seeds.
import { C } from '../lib/tokens.js';
import { bake, get } from '../lib/wash.js';
import { shape, draw } from '../lib/ink.js';
import { specimenOutline, spine, halfW } from '../lib/figure.js';
import { rng } from '../lib/motion.js';
import * as A from '../lib/ann.js';

export const PUS = '#CDB98A';          // 大体脓苔 — 风格规范 §2 / 02 章
export const STATES = ['normal', 'red', 'yellow', 'black'];
export const SWELL = { normal: .22, red: .48, yellow: 1, black: .96 };
const MESO_TIP = .8;
const N_WALL = 48;
const HD = { hd: true, soft: true, grain: .12, edge: .3, bleed: .5, scale: 2.4 };
const HD_PALE = { hd: true, soft: true, grain: .12, edge: 0, bleed: .5, scale: 2.4, keepWhite: true };

export const META = {
  normal: { name: '正常', diag: '正常阑尾', sub: '灰粉色 · 浆膜光滑有光泽', tone: C.ink },
  red:    { name: '红',   diag: '单纯性阑尾炎', sub: '朱红充血 · 轻度肿胀', tone: C.red },
  yellow: { name: '黄',   diag: '化脓性阑尾炎', sub: '肿胀增粗 · 斑驳灰黄脓苔', tone: '#8A7348' },
  black:  { name: '黑',   diag: '坏疽性阑尾炎', sub: '局部坏死发黑 · 周围仍有红黄', tone: '#5A3038' },
};

export function frameAt(s) {
  const p = spine(s), q = spine(Math.min(1, s + .01)), r = spine(Math.max(0, s - .01));
  const dx = q[0] - r[0], dy = q[1] - r[1], L = Math.hypot(dx, dy) || 1;
  return { p, tx: dx / L, ty: dy / L, nx: -dy / L, ny: dx / L };
}
export function mesoPt(s, sw, extra) {
  const f = frameAt(Math.max(0, Math.min(1, s))), w = halfW(Math.max(0, Math.min(.9, s)), sw) + extra;
  return [f.p[0] + f.nx * w, f.p[1] + f.ny * w];
}
export function sidePt(s, sw, extra) {
  const f = frameAt(Math.max(0, Math.min(1, s))), w = halfW(Math.max(0, Math.min(.9, s)), sw) + extra;
  return [f.p[0] - f.nx * w, f.p[1] - f.ny * w];
}
// Cut face of the mesoappendix has real width (s=0); free edge scallops; tapers out near the tip.
function mesoHang(s) {
  if (s >= MESO_TIP) return 0;
  const u = Math.max(0, s) / MESO_TIP;
  const profile = 54 * (1 - Math.pow(u, 1.35)) + 38 * Math.sin(Math.PI * Math.min(1, u * 1.05));
  const scallop = 1 + .16 * Math.sin(s * 14.2 + .5) + .08 * Math.sin(s * 27.6 + 1.1) + .04 * Math.sin(s * 41 + .2);
  return Math.max(0, profile * scallop);
}
function mesoLoop(sw) {
  const wall = [], free = [], N = 26;
  for (let i = 0; i <= N; i++) wall.push(mesoPt((i / N) * MESO_TIP, sw, .4));
  for (let i = N; i >= 0; i--) free.push(mesoPt((i / N) * MESO_TIP, sw, mesoHang((i / N) * MESO_TIP)));
  return wall.concat(free);
}
function mesoFreeEdge(sw) {
  const pts = [mesoPt(0, sw, 0)];
  const N = 26;
  for (let i = 0; i <= N; i++) pts.push(mesoPt((i / N) * MESO_TIP, sw, mesoHang((i / N) * MESO_TIP)));
  pts.push(mesoPt(MESO_TIP, sw, 0));
  return pts;
}
function baseCap(sw) {
  const a = mesoPt(0, sw, 0), b = sidePt(0, sw, 0), f = frameAt(0);
  return [a, [(a[0] + b[0]) / 2 - f.tx * 8, (a[1] + b[1]) / 2 - f.ty * 8], b];
}
export function toScreen(pose, p) {
  const c = Math.cos(pose.rot), s = Math.sin(pose.rot);
  return [pose.x + (p[0] * c - p[1] * s) * pose.sc, pose.y + (p[0] * s + p[1] * c) * pose.sc];
}
function path(ctx, pts, close = true) {
  ctx.beginPath();
  pts.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p));
  if (close) ctx.closePath();
}

function along(b, P, sw, col, a, rK, seed, step = .065) {
  for (let u = 0; u <= 1.001; u += step) {
    const p = spine(u);
    P.fill(b, P.blob(p[0], p[1], halfW(Math.min(u, .9), sw) * rK, 22, .28, seed + u * 100), col, a, .2, [.42, .52]);
  }
}
function alongOffset(b, P, sw, side, inset, col, a, rK, seed, step = .09) {
  for (let u = .03; u <= .97; u += step) {
    const f = frameAt(u), w = halfW(Math.min(u, .9), sw);
    const p = [f.p[0] + f.nx * w * inset * side, f.p[1] + f.ny * w * inset * side];
    P.fill(b, P.blob(p[0], p[1], w * rK, 18, .3, seed + u * 80), col, a, .22, [.38, .48]);
  }
}
function smear(P, s, across, len, wid, seed) {
  const f = frameAt(s), R = rng(seed);
  const o = [];
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * Math.PI * 2, rr = 1 + .38 * (R() - .5);
    const u = Math.cos(a) * len * rr, v = Math.sin(a) * wid * rr;
    o.push([f.p[0] + f.tx * u + f.nx * (across + v), f.p[1] + f.ty * u + f.ny * (across + v)]);
  }
  return o;
}

const PIX = new Map();
function pin(k) {
  const src = get(k); if (!src) return;
  const im = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, src.width, src.height);
  const held = document.createElement('canvas');
  held.width = src.width; held.height = src.height;
  held.getContext('2d', { willReadFrequently: true }).putImageData(im, 0, 0);
  PIX.set(k, held);
}
function drawPinned(ctx, key, x, y, size, { alpha = 1, blend = 'multiply' } = {}) {
  const img = PIX.get(key); if (!img || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (blend) ctx.globalCompositeOperation = blend;
  ctx.translate(x, y);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
}

export function prepare() {
  const swN = SWELL.normal, swR = SWELL.red, swY = SWELL.yellow, swB = SWELL.black;
  bake('g.normal', (b, P) => {
    along(b, P, swN, '#D9C0B8', 155, 1.7, 3, .055);
    along(b, P, swN, '#E8B9B0', 110, 1.25, 4, .08);
    alongOffset(b, P, swN, 1, .58, '#C4A39A', 90, .8, 5, .08);
    alongOffset(b, P, swN, -1, .62, '#EBD3CC', 70, .55, 6, .14);
  }, { ...HD, seed: 21 }); pin('g.normal');
  bake('g.red', (b, P) => {
    along(b, P, swR, '#E8B9B0', 80, 1.5, 7);
    along(b, P, swR, C.red, 155, 1.38, 8, .06);
    along(b, P, swR, '#C9455A', 110, 1.08, 9, .09);
    alongOffset(b, P, swR, 1, .52, '#6E1A24', 105, .78, 10, .08);
    alongOffset(b, P, swR, -1, .38, '#A8404E', 80, .58, 11, .11);
  }, { ...HD, seed: 22 }); pin('g.red');
  bake('g.yellow', (b, P) => {
    along(b, P, swY, C.red, 150, 1.38, 12, .06);
    along(b, P, swY, '#C9455A', 100, 1.1, 13, .09);
    alongOffset(b, P, swY, 1, .5, '#6E1A24', 115, .72, 14, .08);
    alongOffset(b, P, swY, -1, .4, '#A8404E', 85, .55, 15, .11);
  }, { ...HD, seed: 23 }); pin('g.yellow');
  bake('g.black', (b, P) => {
    along(b, P, swB, C.red, 140, 1.35, 16, .06);
    along(b, P, swB, '#A8404E', 100, 1.12, 17, .09);
    alongOffset(b, P, swB, 1, .5, '#6E1A24', 110, .72, 18, .08);
  }, { ...HD, seed: 24 }); pin('g.black');
  bake('g.pus', (b, P) => {
    // Irregular elongated sheets along the serosa, not a solid yellow coat.
    [[.26, 8, 42, 16], [.38, -6, 50, 14], [.47, 14, 36, 13], [.58, -2, 54, 18],
     [.66, 12, 40, 15], [.74, -10, 46, 17], [.83, 6, 32, 12], [.31, -16, 28, 11],
     [.54, 18, 24, 10], [.7, 4, 30, 13]].forEach(([s, across, len, wid], j) => {
      P.fill(b, smear(P, s, across, len, wid, 200 + j), PUS, 170, .24, [.22, .34]);
    });
  }, { ...HD_PALE, seed: 25 }); pin('g.pus');
  bake('g.pusStain', (b, P) => {
    [[.26, 6, 36, 14], [.38, -8, 40, 13], [.5, 10, 34, 12], [.62, -4, 42, 15],
     [.74, 8, 30, 12], [.82, -6, 24, 10], [.33, 14, 20, 8], [.58, -14, 22, 9]].forEach(([s, across, len, wid], j) => {
      P.fill(b, smear(P, s, across, len, wid, 310 + j), PUS, 90, .3, [.4, .5]);
    });
  }, { ...HD, seed: 26, edge: .2, bleed: .4 }); pin('g.pusStain');
  bake('g.necro', (b, P) => {
    // Distal third only: brown-red halo then near-black core.
    [[.72, 0, 70, 38, '#7A3038', 130], [.8, 4, 62, 34, '#8E3A3E', 140],
     [.88, -6, 48, 28, '#A8404E', 120]].forEach(([s, ac, len, wid, col, a], j) => {
      P.fill(b, smear(P, s, ac, len, wid, 400 + j), col, a, .28, [.4, .5]);
    });
    [[.78, 2, 52, 28, '#2A1014', 210], [.86, -4, 46, 24, '#1A0C0E', 220],
     [.93, 2, 30, 16, '#14080A', 220], [.74, 10, 32, 16, '#4E1019', 180]].forEach(([s, ac, len, wid, col, a], j) => {
      P.fill(b, smear(P, s, ac, len, wid, 420 + j), col, a, .2, [.32, .42]);
    });
  }, { ...HD, seed: 27, edge: .42, bleed: .32 }); pin('g.necro');
  bake('g.bleed', (b, P) => {
    [[.34, 12, 14, 9, '#A8404E'], [.46, -10, 12, 8, '#8E3A3E'],
     [.55, 8, 16, 10, '#9A3E48'], [.63, -14, 11, 7, '#7A3038']].forEach(([s, ac, len, wid, col], j) => {
      P.fill(b, smear(P, s, ac, len, wid, 500 + j), col, 170, .2, [.4, .5]);
    });
  }, { ...HD, seed: 28 }); pin('g.bleed');
  bake('g.meso', (b, P) => {
    P.fill(b, P.blob(0, 0, 260, 26, .32, 8), '#EFD9A0', 155, .5, [.3, .4]);
    P.fill(b, P.blob(-50, 18, 150, 20, .3, 9), '#E4C78A', 80, .42, [.28, .38]);
    P.fill(b, P.blob(40, -10, 110, 18, .34, 10), '#F3E4B8', 70, .45, [.3, .4]);
  }, { ...HD, seed: 29, scale: 1.6 }); pin('g.meso');
}

function clipTube(ctx, sw) { path(ctx, specimenOutline(sw, N_WALL)); ctx.clip(); }

function stampMeso(ctx, sw, alpha) {
  ctx.save();
  ctx.beginPath(); ctx.rect(-2400, -2400, 4800, 4800);
  specimenOutline(sw, N_WALL).forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p));
  ctx.closePath(); ctx.clip('evenodd');
  path(ctx, mesoLoop(sw)); ctx.clip();
  for (let s = 0; s < MESO_TIP; s += .04) {
    const extra = mesoHang(s);
    if (extra < 6) continue;
    [[.38, .62, .82], [.7, .4, .52]].forEach(([frac, radK, a]) => {
      const p = mesoPt(s, sw, extra * frac);
      drawPinned(ctx, 'g.meso', p[0], p[1], extra * radK / 260 * 1024, { alpha: alpha * a * 1.15, blend: 'multiply' });
    });
  }
  ctx.restore();
}

function inkStroke(ctx, key, kind, args, o, alpha) {
  // dynamic: strokeWidth follows pose.sc; a cached shape from the 2×2 would leak into singles.
  draw(ctx, shape(key, kind, args, { boil: false, ...o }, true), { alpha });
}

function drawMesoInk(ctx, state, sw, px, alpha) {
  inkStroke(ctx, `g.${state}.mesoE`, 'curve', [mesoFreeEdge(sw)], { strokeWidth: 1.55 * px, roughness: .75, bowing: .5, seed: 61 }, alpha * .62);
  const cap = [mesoPt(0, sw, 0), mesoPt(0, sw, mesoHang(0))];
  inkStroke(ctx, `g.${state}.mesoCap`, 'linearPath', [cap], { strokeWidth: 1.8 * px, roughness: .8, bowing: .4, seed: 62 }, alpha * .7);
  const col = state === 'black' ? '#7A3038' : C.red;
  const alongFold = frac => {
    const pts = [];
    for (let i = 0; i <= 18; i++) pts.push(mesoPt(.02 + .72 * (i / 18), sw, Math.max(1, mesoHang(.02 + .72 * (i / 18)) * frac)));
    return pts;
  };
  inkStroke(ctx, `g.${state}.vein`, 'curve', [alongFold(.55)], { stroke: '#7A4A55', strokeWidth: (.8 + .2 * (state !== 'normal')) * px, roughness: .45, bowing: .18, seed: 142 }, alpha * .48);
  inkStroke(ctx, `g.${state}.art`, 'curve', [alongFold(.82)], { stroke: col, strokeWidth: (state === 'normal' ? 1.15 : 1.75) * px, roughness: .42, bowing: .16, seed: 141 }, alpha * .84);
  const branches = [];
  [[.06, 54], [.15, 62], [.25, 48], [.36, 68], [.48, 56]].forEach(([s, deg], i) => {
    const extra = mesoHang(s); if (extra < 10) return;
    const f = frameAt(s), th = deg * Math.PI / 180, side = i % 2 ? 1 : -1;
    const sin = Math.sin(th), cos = Math.cos(th);
    const start = mesoPt(s, sw, extra * .82);
    const dx = f.tx * cos * side - f.nx * sin, dy = f.ty * cos * side - f.ny * sin;
    const L = extra * .82 / Math.max(.22, sin);
    const s2 = Math.max(.02, Math.min(.74, s + cos * side * L / 760));
    const end = mesoPt(s2, sw, .3);
    const p1 = [start[0] + dx * L * .3, start[1] + dy * L * .3];
    const p2 = [start[0] + dx * L * .6 - f.nx * extra * .05, start[1] + dy * L * .6 - f.ny * extra * .05];
    const pts = [start, p1, p2, end];
    branches.push(pts);
    inkStroke(ctx, `g.${state}.br${i}`, 'curve', [pts], { stroke: col, strokeWidth: (state === 'normal' ? 1.0 : 1.4) * px, roughness: .5, bowing: .22, seed: 171 + i }, alpha * .78);
  });
  for (let i = 0; i < branches.length - 1; i++) {
    const A = branches[i][2], B = branches[i + 1][2];
    const mid = [(A[0] + B[0]) / 2 + (branches[i][0][0] - A[0]) * .26, (A[1] + B[1]) / 2 + (branches[i][0][1] - A[1]) * .26];
    inkStroke(ctx, `g.${state}.loop${i}`, 'curve', [[A, mid, B]], { stroke: col, strokeWidth: .8 * px, roughness: .48, bowing: .2, seed: 181 + i }, alpha * .52);
  }
  [[.1, .48, 10], [.2, .55, 8], [.32, .42, 7]].forEach(([s, frac, d], i) => {
    const extra = mesoHang(s); if (extra < 14) return;
    const c = mesoPt(s, sw, extra * frac);
    inkStroke(ctx, `g.${state}.lob${i}`, 'circle', [c[0], c[1], d], { strokeWidth: .7 * px, roughness: .55, bowing: .15, seed: 191 + i }, alpha * .2);
  });
}

const SURFACE = {};
function surfaceVessels(state, sw) {
  if (SURFACE[state]) return SURFACE[state];
  const R = rng(41011 + STATES.indexOf(state) * 131);
  const trunks = state === 'normal' ? 2 : state === 'black' ? 5 : 7;
  const paths = [];
  for (let i = 0; i < trunks; i++) {
    const s0 = .1 + R() * .58, len = .09 + R() * (state === 'normal' ? .07 : .13);
    const side = i % 2 ? 1 : -1, inset0 = .32 + R() * .28;
    const pts = [];
    for (let k = 0; k <= 7; k++) {
      const s = Math.min(.92, s0 + len * k / 7), f = frameAt(s), w = halfW(Math.min(s, .9), sw);
      const ins = Math.max(.18, Math.min(.82, inset0 + Math.sin(k * .7 + i * 1.3) * .1));
      pts.push([f.p[0] + f.nx * w * ins * side, f.p[1] + f.ny * w * ins * side]);
    }
    paths.push({ pts, w: state === 'normal' ? .65 : 1.15 + R() * .5 });
  }
  SURFACE[state] = paths;
  return paths;
}

function drawSurfaceVessels(ctx, state, sw, px, alpha) {
  if (state === 'normal') alpha *= .4;
  const col = state === 'black' ? '#7A3038' : C.red;
  surfaceVessels(state, sw).forEach((v, i) => {
    if (state === 'black' && v.pts[0] && v.pts[0][0] > 120) return;
    inkStroke(ctx, `g.${state}.sv${i}`, 'curve', [v.pts], { stroke: col, strokeWidth: v.w * px, roughness: .58, bowing: .32, seed: 220 + i }, alpha * .72);
  });
}

function drawHighlights(ctx, state, sw, px, alpha) {
  if (state === 'black' || state === 'yellow') return;
  const k = state === 'normal' ? 1 : .48;
  [[.17, .26, 201], [.39, .47, 202], [.6, .68, 203]].forEach(([a, b, seed], i) => {
    const pts = [];
    for (let j = 0; j <= 5; j++) {
      const s = a + (b - a) * (j / 5), f = frameAt(s), w = Math.max(1.6, halfW(s, sw) - 3.6);
      pts.push([f.p[0] - f.nx * w, f.p[1] - f.ny * w]);
    }
    inkStroke(ctx, `g.${state}.hi${i}`, 'curve', [pts], { stroke: '#FFFFFF', strokeWidth: 1.5 * px, roughness: .38, bowing: .22, seed }, alpha * .8 * k);
  });
}

function drawTubeInk(ctx, state, sw, px, alpha) {
  const wall = specimenOutline(sw, N_WALL);
  inkStroke(ctx, `g.${state}.wall`, 'linearPath', [wall], { strokeWidth: 2.6 * px, roughness: .9, bowing: .8, seed: 81 }, alpha);
  inkStroke(ctx, `g.${state}.wall2`, 'linearPath', [wall], { strokeWidth: 1.2 * px, roughness: 1.2, bowing: 1.0, seed: 97 }, alpha * .48);
  const cap = baseCap(sw);
  inkStroke(ctx, `g.${state}.cap`, 'curve', [cap], { strokeWidth: 2.4 * px, roughness: .85, bowing: .5, seed: 88 }, alpha);
  inkStroke(ctx, `g.${state}.cap2`, 'curve', [cap], { strokeWidth: 1.15 * px, roughness: 1.1, bowing: .8, seed: 89 }, alpha * .45);
  drawHighlights(ctx, state, sw, px, alpha);
}

export function drawAppendix(ctx, state, pose, { alpha = 1 } = {}) {
  const sw = SWELL[state], px = 1 / pose.sc;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = 'source-over';
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.rot);
  ctx.scale(pose.sc, pose.sc);

  stampMeso(ctx, sw, 1);
  ctx.save();
  clipTube(ctx, sw);
  const body = state === 'yellow' ? 'g.yellow' : state === 'red' ? 'g.red' : state === 'black' ? 'g.black' : 'g.normal';
  drawPinned(ctx, body, 0, 0, 1024, { alpha: 1, blend: 'multiply' });
  if (state === 'yellow' || state === 'black') {
    drawPinned(ctx, 'g.pusStain', 0, 0, 1024, { alpha: state === 'black' ? .55 : .8, blend: 'multiply' });
    drawPinned(ctx, 'g.pus', 0, 0, 1024, { alpha: state === 'black' ? .32 : .48, blend: 'source-over' });
  }
  if (state === 'black') {
    drawPinned(ctx, 'g.necro', 0, 0, 1024, { alpha: 1, blend: 'multiply' });
    drawPinned(ctx, 'g.bleed', 0, 0, 1024, { alpha: .9, blend: 'multiply' });
  }
  ctx.restore();

  drawMesoInk(ctx, state, sw, px, 1);
  drawSurfaceVessels(ctx, state, sw, px, 1);
  drawTubeInk(ctx, state, sw, px, 1);
  ctx.restore();
}

const NOTES = {
  normal: [
    { s: .44, side: -1, d: 6, label: '浆膜光泽', dir: 'up', shelf: 'right' },
    { s: .28, extra: .55, label: '阑尾系膜', dir: 'down', shelf: 'left' },
    { s: .08, extra: .88, label: '系膜血管细', dir: 'down', shelf: 'left' },
  ],
  red: [
    { s: .24, side: -1, d: 6, label: '朱红充血', dir: 'up', col: C.red, shelf: 'left' },
    { s: .72, side: -1, d: 4, label: '表面血管扩张', dir: 'up', shelf: 'right' },
    { s: .2, extra: .55, label: '轻度肿胀', dir: 'down', shelf: 'left' },
  ],
  yellow: [
    { s: .56, side: -1, d: 4, label: '灰黄色脓苔', dir: 'up' },
    { s: .78, side: -1, d: 6, label: '斑驳、片状', dir: 'up' },
    { s: .24, extra: .5, label: '明显肿胀增粗', dir: 'down' },
  ],
  black: [
    { s: .86, side: -1, d: 6, label: '局部坏死发黑', dir: 'up', shelf: 'right' },
    { s: .38, side: -1, d: 5, label: '出血斑', dir: 'up', shelf: 'left' },
    { s: .16, extra: .55, label: '周围仍有红、黄', dir: 'down', shelf: 'left' },
  ],
};

export function drawNotes(ctx, state, pose) {
  NOTES[state].forEach(n => {
    const f = frameAt(n.s);
    const w = halfW(Math.min(n.s, .9), SWELL[state]);
    const local = n.extra != null
      ? mesoPt(n.s, SWELL[state], mesoHang(n.s) * n.extra)
      : [f.p[0] + f.nx * (w + (n.d || 0)) * (n.side || 1), f.p[1] + f.ny * (w + (n.d || 0)) * (n.side || 1)];
    const p = toScreen(pose, local);
    const up = n.dir === 'up';
    const qy = p[1] + (up ? -68 : 72);
    const shelf = n.label.length * 15 + 10;
    const right = n.shelf === 'right' ? true : n.shelf === 'left' ? false : p[0] > 1300;
    const qx = right ? p[0] - 40 : p[0] + 40;
    const rx = right ? qx - shelf : qx + shelf;
    A.leader(ctx, p, [qx, qy], [rx, qy], { k: 1, elbow: true });
    A.label(ctx, n.label, right ? rx : qx + 6, qy - 16, { size: 26, w: 700, col: n.col || C.ink, halo: true, align: right ? 'right' : 'left' });
  });
}

export function drawTitle(ctx, state, { x = 96, y = 120 } = {}) {
  const m = META[state];
  ctx.save(); ctx.fillStyle = m.tone; ctx.fillRect(x, y + 8, 64, 5); ctx.restore();
  A.label(ctx, '大体标本 画风样张', x, y - 36, { size: 22, w: 500, alpha: .55 });
  A.label(ctx, m.diag, x, y + 52, { size: 48, w: 800, col: m.tone });
  A.label(ctx, m.sub, x, y + 104, { size: 26, w: 500, alpha: .78 });
}
