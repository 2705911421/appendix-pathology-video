// Resected appendix — four gross states on one rig.
// stage 0 normal · 1 red · 2 yellow · 3 black. In-between values (0.5, 1.5, …)
// smoothstep the serosal palette, the swelling, and the pus / necrosis / hemorrhage layers.
// Spine comes from figure.js; an independent near-uniform radius preserves the long
// vermiform shape. Swelling changes width; the rounded cap retains its axial extent.
// No Math.random. Ink via ink.js. Watercolour via wash.js (hd / soft / grain .12 / edge .3 / bleed .5).
import { C } from '../lib/tokens.js';
import { bake, get } from '../lib/wash.js';
import { shape, draw as inkDraw } from '../lib/ink.js';
import { spine } from '../lib/figure.js';
import { rng } from '../lib/motion.js';
import * as A from '../lib/ann.js';

export const PUS = '#CDB98A';
export const STATES = ['normal', 'red', 'yellow', 'black'];
// Radius multiplier: stage 0 is the thin normal appendix, 1 is clearly swollen,
// 2 is the widest (maximal wall tension), 3 stays swollen while the necrotic wall sags.
const SWELL_K = [1, 1.16, 1.47, 1.34];
export const SWELL = { normal: SWELL_K[0], red: SWELL_K[1], yellow: SWELL_K[2], black: SWELL_K[3] };
const DENT_K = 0.10;            // local sag of the lit wall at the gangrenous pole
const CAP_S = 0.9;
const MESO_TIP = CAP_S;
const NORMAL_RADIUS = 35; // Centreline arc + rounded ends / diameter ≈ 10.5.
const N_SHAFT = 40;
const WASH = { hd: true, soft: true, grain: .12, edge: .3, bleed: .5 };

export const META = {
  normal: { name: '正常', diag: '正常阑尾', sub: '灰粉色 · 浆膜光滑有光泽', tone: C.ink },
  red:    { name: '红',   diag: '单纯性阑尾炎', sub: '朱红充血 · 轻度肿胀增粗', tone: C.red },
  yellow: { name: '黄',   diag: '化脓性阑尾炎', sub: '最粗、张力最大 · 斑驳灰黄脓苔', tone: '#8A7348' },
  black:  { name: '黑',   diag: '坏疽性阑尾炎', sub: '保持肿胀 · 局部坏死发黑', tone: '#3A2438' },
};

// Serosal lighting. base is the opaque midtone of the cylinder (t≈0.5 across the tube).
// shadow is the mesenteric side, gloss is the serosal band on the lit side. All three are mixed
// into solid colours — a multiply gradient leaves 1px gaps that read as stripes.
const LOOK = [
  { base: [198, 154, 144], shadow: [64, 36, 34], gloss: [248, 238, 230] },
  { base: [206, 64, 56],   shadow: [58, 12, 18], gloss: [255, 228, 220] },
  { base: [196, 56, 50],   shadow: [52, 10, 16], gloss: [255, 224, 216] },
  { base: [184, 50, 46],   shadow: [44, 8, 14],  gloss: [248, 214, 208] },
];
const GLOSS_FADE = [1, .78, .30, .18];   // how much of the painted gloss band survives per stage
const GLOSS_A = [.96, .48, .09, .02];    // wet-highlight strokes painted over the surface

const smooth = t => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
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
export function dentAt(stage) { return ramp(asStage(stage), 2.15, 3) * DENT_K; }

export function frameAt(s) {
  const p = spine(s), q = spine(Math.min(1, s + .01)), r = spine(Math.max(0, s - .01));
  const dx = q[0] - r[0], dy = q[1] - r[1], L = Math.hypot(dx, dy) || 1;
  return { p, tx: dx / L, ty: dy / L, nx: -dy / L, ny: dx / L };
}
// Fixed low-amplitude silhouette variation, identical in every state, so the shaft is not a
// machined cylinder. It multiplies the radius and never changes between stages.
function silhouette(s) {
  return 1 + .013 * Math.sin(s * 16.3 + 1.2) + .007 * Math.sin(s * 33.7 + 0.4);
}
// Nearly uniform vermiform shaft. Swelling changes width alone, never the spine.
export function tubeRadius(s, swell) {
  return NORMAL_RADIUS * swell * silhouette(clamp(s, 0, CAP_S));
}
// The lit wall sags a little where the gangrene has destroyed the tissue (dent ∈ 0…1).
function dentShape(s) {
  const u = (s - 0.62) / 0.24;
  if (u <= 0 || u >= 1) return 0;
  return Math.sin(Math.PI * u) ** 2;
}
export function litRadius(s, swell, dent = 0) {
  return tubeRadius(s, swell) * (1 - dent * dentShape(clamp(s, 0, CAP_S)));
}
function addN(f, w) { return [f.p[0] + f.nx * w, f.p[1] + f.ny * w]; }

export function tubeOutline(swell, dent = 0) {
  const L = [], R = [];
  for (let i = 0; i <= N_SHAFT; i++) {
    const s = CAP_S * (i / N_SHAFT), f = frameAt(s);
    L.push(addN(f, tubeRadius(s, swell)));
    R.push(addN(f, -litRadius(s, swell, dent)));
  }
  const f = frameAt(CAP_S), rad = tubeRadius(CAP_S, swell), arc = [];
  for (let i = 1; i < 14; i++) {
    const a = Math.PI * (i / 14);
    arc.push([
      f.p[0] + f.nx * Math.cos(a) * rad + f.tx * Math.sin(a) * NORMAL_RADIUS,
      f.p[1] + f.ny * Math.cos(a) * rad + f.ty * Math.sin(a) * NORMAL_RADIUS,
    ]);
  }
  // Elliptical cut face: from the lit lip (−normal) back to the mesenteric lip, bulging out of the base.
  const f0 = frameAt(0), w0 = tubeRadius(0, swell), base = [];
  for (let i = 1; i < 8; i++) {
    const ang = Math.PI * (1 - i / 8);
    const bulge = Math.sin(ang) * NORMAL_RADIUS * 0.34;
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
  h += 15 * (0.5 + 0.5 * Math.sin(u * Math.PI * 3.15 + 0.35)) ** 1.35;
  h += 8 * Math.sin(u * Math.PI * 6.5 + 1.05);
  h += 4 * Math.sin(u * 20.5 + 0.4);
  // Two soft scallops so the free edge is not one regular wave.
  h -= 15 * Math.max(0, Math.sin(u * Math.PI * 2.6 + 1.9)) ** 3;
  h -= 8 * Math.max(0, Math.sin(u * Math.PI * 4.4 + 0.4)) ** 4;
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
function centroid(pts) {
  let x = 0, y = 0;
  for (const p of pts) { x += p[0]; y += p[1]; }
  return [x / pts.length, y / pts.length];
}
function scaleAbout(pts, k, c) {
  return pts.map(p => [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k]);
}
function fillPoly(ctx, pts, col, a) {
  if (a <= 0.002) return;
  ctx.fillStyle = Array.isArray(col) ? css(col, a) : col;
  path(ctx, pts); ctx.fill();
}
// Irregular patch on the tube surface: `v` is the fraction of the radius (−1 lit, +1 mesenteric),
// rx/ry are pixels along the tangent / across the tube.
function surfaceBlob(s, v, rx, ry, seed, { n = 56, jitter = .24, lobes = 3, amp = .17, swell = 1 } = {}) {
  const f = frameAt(clamp(s, 0, CAP_S)), w = tubeRadius(clamp(s, 0, CAP_S), swell);
  const R = rng(seed | 0);
  const phase = R() * Math.PI * 2;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = 1 + amp * Math.sin(a * lobes + phase) + (R() - .5) * jitter;
    const u = Math.cos(a) * rx * rr;
    const vv = Math.sin(a) * ry * rr;
    const across = w * v + vv;
    pts.push([f.p[0] + f.tx * u + f.nx * across, f.p[1] + f.ty * u + f.ny * across]);
  }
  return pts;
}
function along(b, P, col, a, rK, seed, step) {
  const sw = 1;
  for (let u = 0; u <= CAP_S; u += step) {
    const p = spine(u);
    P.fill(b, P.blob(p[0], p[1], tubeRadius(u, sw) * rK, 20, .32, seed + u * 100), col, a, .2, [.4, .5]);
  }
}

// ── mesentery fat clumps (deterministic geometry in s / height-fraction space) ─────────────
const FAT_TONES = ['#EFD28C', '#E6C274', '#DDAA5C', '#F4DD9C', '#D2A858'];
const LOBULES = (() => {
  const R = rng(31017), out = [];
  for (let i = 0; i < 84; i++) {
    const s = 0.012 + R() * 0.88;
    const h = mesoHang(s);
    if (h < 12) continue;
    const hf = 0.08 + R() * 0.88;
    const r = 7 + R() * 12;
    out.push({
      s, hf, r,
      rot: (R() - .5) * 1.6,
      tone: (R() * FAT_TONES.length) | 0,
      alpha: 0.30 + R() * 0.34,
      top: R() < 0.16,
    });
  }
  return out;
})();
function lobuleCenter(L, swell) {
  return mesoPt(L.s, swell, mesoHang(L.s) * L.hf);
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
// Irregular plaque sprite: hard-ish body of layered rings (so the rim is visible but feathered),
// the baked wash multiplied inside for pigment grain, and a broken darker dry edge.
let PUS_SPRITE = null, NECRO_SPRITE = null;
function blobPts(cx, cy, r, seed, { n = 64, lobes = 3, amp = .15, jit = .12 } = {}) {
  const R = rng(seed | 0), ph = R() * Math.PI * 2, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 + amp * Math.sin(a * lobes + ph) + (R() - .5) * jit);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}
function makePlaqueSprite(color, seed, texKey, { core = null, rings = [[1.15, .12], [1.0, .93]] } = {}) {
  const S = 640, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const pts = blobPts(S / 2, S / 2, S * .35, seed);
  const cen = [S / 2, S / 2];
  rings.forEach(([k, a], i) => {
    c.save();
    c.filter = i === 0 ? 'blur(12px)' : 'blur(2.5px)';
    fillPoly(c, scaleAbout(pts, k, cen), hexA(color, a), 1);
    c.restore();
  });
  const tex = PIX.get(texKey);
  if (tex) {
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.globalAlpha = .55;
    c.drawImage(tex, 0, 0, S, S);
    c.restore();
  }
  // Uneven thickness: dull ochre spits and a lighter raised shoulder.
  const R = rng(seed + 91);
  for (let i = 0; i < 5; i++) {
    const p = [S * (.34 + R() * .32), S * (.34 + R() * .32)];
    const rad = 22 + R() * 34;
    const g = c.createRadialGradient(p[0], p[1], 1, p[0], p[1], rad);
    const dark = i % 2 === 0;
    g.addColorStop(0, dark ? 'rgba(146, 124, 82, .20)' : 'rgba(232, 219, 188, .18)');
    g.addColorStop(1, dark ? 'rgba(146, 124, 82, 0)' : 'rgba(232, 219, 188, 0)');
    c.fillStyle = g; c.beginPath(); c.arc(p[0], p[1], rad, 0, Math.PI * 2); c.fill();
  }
  if (core) {
    const inner = blobPts(S / 2 + 12, S / 2 - 8, S * .16, seed + 5, { n: 34, amp: .22, jit: .26 });
    fillPoly(c, inner, hexA(core, .55), 1);
    const inner2 = blobPts(S * .44, S * .47, S * .08, seed + 9, { n: 30, amp: .26, jit: .28 });
    fillPoly(c, inner2, hexA(core, .78), 1);
  }
  return cv;
}
let FAT_SPRITES = [];
function makeFatSprites() {
  FAT_SPRITES = FAT_TONES.map((tone, si) => {
    const S = 160, cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const c = cv.getContext('2d');
    const blob = (ox, oy, rr, a0) => {
      const g = c.createRadialGradient(S / 2 + ox, S / 2 + oy, 2, S / 2 + ox, S / 2 + oy, rr);
      g.addColorStop(0, `rgba(255, 248, 220, ${.44 * a0})`);
      g.addColorStop(.34, hexA(tone, .52 * a0));
      g.addColorStop(.62, hexA(tone, .42 * a0));
      g.addColorStop(.78, hexA(tone,.17*a0));
      g.addColorStop(1, hexA(tone, 0));
      c.fillStyle = g;
      c.beginPath(); c.arc(S / 2 + ox, S / 2 + oy, rr, 0, Math.PI * 2); c.fill();
    };
    blob(0, 0, S * 0.40, 1);
    blob(-S * 0.16, S * 0.12, S * 0.27, .85);
    blob(S * 0.19, -S * 0.10, S * 0.24, .7);
    // Off-centre translucent light and underside shade give each lobule soft volume.
    const shade = c.createRadialGradient(85, 99, 3, 85, 99, 43);
    shade.addColorStop(0, 'rgba(142,100,39,.19)');
    shade.addColorStop(1, 'rgba(142,100,39,0)');
    c.fillStyle=shade;c.fillRect(0,0,S,S);
    const light = c.createRadialGradient(67, 61, 2, 67, 61, 31);
    light.addColorStop(0,'rgba(255,249,217,.34)');
    light.addColorStop(1,'rgba(255,249,217,0)');
    c.fillStyle=light;c.fillRect(0,0,S,S);
    // Broken golden crescent instead of a full outline.
    c.strokeStyle = `rgba(150, 96, 28, ${.09 + si * .008})`;
    c.lineWidth = 1.3;
    c.beginPath();
    c.arc(S / 2, S / 2, S * 0.33, 1.55 + si * .32, 2.35 + si * .32);
    c.stroke();
    return cv;
  });
}

// ── vessel tree: trunk near the free edge, branches turning into the appendiceal wall ─────
function trunkHF(s) {
  return clamp(0.70 + 0.085 * Math.sin(s * 8.5 + 1.3) + 0.02 * Math.sin(s * 23.7), 0.52, 0.86);
}
const VESSEL = (() => {
  const trunk = [];
  for (let s = 0.02; s <= 0.755; s += 0.032) trunk.push({ s, hf: trunkHF(s) });
  const branches = [], twigs = [], vein = [];
  const R = rng(12007);
  let s0 = 0.055;
  while (s0 < 0.71) {
    const h0 = trunkHF(s0);
    const drift = 0.03 + R() * 0.05;
    const jog = (R() - .5) * 0.02;
    branches.push([
      { s: s0, hf: h0 },
      { s: s0 + drift * 0.34 + jog, hf: h0 * (0.58 + R() * 0.12) },
      { s: s0 + drift * 0.74, hf: h0 * (0.20 + R() * 0.10) },
      { s: s0 + drift, hf: 0.035 },
    ]);
    twigs.push([
      { s: s0 + drift * 0.34 + jog, hf: h0 * 0.62 },
      { s: s0 + drift * 0.82, hf: h0 * (0.28 + R() * 0.12) },
      { s: s0 + drift + 0.015 + R() * 0.02, hf: 0.08 + R() * 0.06 },
    ]);
    s0 += 0.085 + R() * 0.08;
  }
  for (let s = 0.02; s <= 0.70; s += 0.045) {
    vein.push({ s, hf: Math.max(0.05, trunkHF(s) - 0.09 + 0.02 * Math.sin(s * 17)) });
  }
  const arcades = branches.slice(0,-1).map((b,i) => [b[1],
    {s:(b[1].s+branches[i+1][1].s)*.5,hf:.27+.09*R()}, branches[i+1][1]]);
  return { trunk, branches, twigs, vein, arcades };
})();
function vesselPts(spec, swell) {
  const out = [];
  for (let i = 0; i < spec.length; i++) {
    if (i === 0) {
      const q = spec[0];
      out.push(mesoPt(q.s, swell, Math.max(1.2, mesoHang(q.s) * q.hf)));
      continue;
    }
    const a = spec[i - 1], b = spec[i];
    for (let k = 1; k <= 10; k++) {
      const t = k / 10;
      const prev = spec[Math.max(0,i-2)], next = spec[Math.min(spec.length-1,i+1)];
      const cat = key => .5*((2*a[key])+(-prev[key]+b[key])*t+(2*prev[key]-5*a[key]+4*b[key]-next[key])*t*t+(-prev[key]+3*a[key]-3*b[key]+next[key])*t*t*t);
      const s = clamp(cat('s'),0,.89);
      const hf = clamp(cat('hf'),.02,.94);
      out.push(mesoPt(s, swell, Math.max(1.2, mesoHang(s) * hf)));
    }
  }
  return out;
}
function strokeTapered(ctx, pts, w0, w1, col, alpha) {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = css(col, alpha);
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const t = n > 2 ? i / (n - 2) : 0;
    ctx.lineWidth = lerp(w0, w1, t);
    ctx.beginPath();
    ctx.moveTo(pts[i][0], pts[i][1]);
    ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
    ctx.stroke();
  }
  ctx.restore();
}

// ── pathology layouts (s / radius fraction, stage-independent) ────────────────────────────
// Gaps stay red; patches overlap so the plaque is thick in the middle and thin at the rim.
const PUS_PATCHES = [
  [.175, -.30, 28, 16, .25], [.265, -.02, 22, 13, -.28], [.325, -.49, 31, 16, .12],
  [.415, -.20, 40, 19, .04], [.495, .10, 24, 13, -.20], [.555, -.44, 22, 12, .38],
  [.625, -.13, 38, 18, .08], [.695, -.35, 20, 12, -.24], [.455, .31, 15, 10, .18],
  [.305, .25, 17, 10, -.10], [.735, .04, 24, 13, .30], [.385, -.62, 18, 10, -.35],
  [.205, -.62, 13, 8, .22], [.585, -.62, 12, 8, -.18],
  [.145, -.05, 12, 8, .10], [.535, -.70, 10, 7, .30], [.665, .22, 14, 9, -.20],
];

const BLEEDS = (() => {
  const R = rng(6301), out = [];
  // Scattered spots of mixed size, some grouped.
  for (let i = 0; i < 16; i++) {
    const s = 0.08 + R() * 0.80;
    const v = -0.74 + R() * 1.30;
    const rx = 4 + R() * 15;
    out.push({ s, v, rx, ry: rx * (0.45 + R() * 0.55), seed: 6400 + i * 13, a: 0.62 + R() * 0.34 });
  }
  // Four clusters of pin-point petechiae.
  const anchors = [[.19, -.36], [.37, -.55], [.54, -.24], [.70, -.44]];
  anchors.forEach(([s0, v0], ai) => {
    for (let k = 0; k < 6; k++) {
      const s = s0 + (R() - .5) * 0.05;
      const v = v0 + (R() - .5) * 0.22;
      const rx = 1.4 + R() * 2.6;
      out.push({ s, v, rx, ry: rx * (0.7 + R() * 0.5), seed: 6600 + ai * 40 + k * 7, a: 0.45 + R() * 0.4 });
    }
  });
  // A few elongated sheets following the tube.
  [[.16, -.18], [.34, -.08], [.58, -.34], [.68, -.05]].forEach(([s, v], i) => {
    out.push({ s, v, rx: 15 + R() * 9, ry: 4.5 + R() * 3, seed: 6800 + i * 23, a: 0.5 + R() * 0.3 });
  });
  return out;
})();

const NECRO = [
  { s: .752, v: -.22, rx: 30, ry: 23, seed: 7101 },
  { s: .800, v: -.05, rx: 36, ry: 27, seed: 7102 },
  { s: .845, v: -.26, rx: 25, ry: 19, seed: 7103 },
  { s: .785, v: .20, rx: 19, ry: 14, seed: 7104 },
];

// ── baked pigment ────────────────────────────────────────────────────────────────────────
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
// Pus is only #CDB98A. Keep the wash's own alpha (soft, uneven edges), drop near-white
// paper speckle, and let its luminance modulate the ochre so thick and thin crust differ.
function lockPus(cv) {
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const im = ctx.getImageData(0, 0, cv.width, cv.height), d = im.data;
  const pr = 0xCD, pg = 0xB9, pb = 0x8A, pLum = (pr + pg + pb) / 3;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255;
    if (a < 0.02) { d[i + 3] = 0; continue; }
    const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
    const chroma = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
    if (lum > 205 && chroma < 28) { d[i + 3] = 0; continue; }
    const dark = 0.82 + 0.20 * clamp(lum / pLum, 0, 1);
    d[i] = pr * dark; d[i + 1] = pg * dark; d[i + 2] = pb * dark;
    d[i + 3] = Math.round(clamp(a * 1.42, 0, 1) * 255);
  }
  ctx.putImageData(im, 0, 0);
}
// Gangrene: keep only the dark pigment, pull it to purple-black and preserve soft alpha.
function lockNecro(cv) {
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const im = ctx.getImageData(0, 0, cv.width, cv.height), d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255;
    if (a < 0.03) { d[i + 3] = 0; continue; }
    const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
    if (lum > 132) { d[i + 3] = 0; continue; }
    const t = clamp(lum / 84, 0, 1);
    d[i] = 18 + 38 * t; d[i + 1] = 12 + 22 * t; d[i + 2] = 24 + 34 * t;
    d[i + 3] = Math.round(clamp(a * 1.55, 0, 1) * 255);
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
function drawSprite(ctx, img, x, y, sx, sy, rot, alpha, blend = 'source-over') {
  if (!img || alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = blend;
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.drawImage(img, -sx / 2, -sy / 2, sx, sy);
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
  // Crust sheet: several soft overlapping pigment bodies, not one clean disc.
  bake('g.pusTile', (b, P) => {
    P.fill(b, P.blob(0, 6, 210, 42, .30, 331), PUS, 195, .45, [.32, .42]);
    P.fill(b, P.blob(-66, 34, 122, 30, .42, 332), PUS, 130, .52, [.3, .4]);
    P.fill(b, P.blob(62, -46, 104, 26, .38, 333), PUS, 120, .48, [.3, .4]);
    P.fill(b, P.blob(30, 66, 90, 24, .4, 334), PUS, 95, .5, [.3, .4]);
  }, { ...WASH, seed: 33, scale: 1 });
  const pusCv = pin('g.pusTile');
  lockPus(pusCv);
  bake('g.necroTile', (b, P) => {
    P.fill(b, P.blob(-22, -12, 222, 40, .34, 351), '#2C1A32', 170, .40, [.3, .4]);
    P.fill(b, P.blob(64, 48, 158, 30, .42, 352), '#160E1C', 150, .46, [.3, .4]);
    P.fill(b, P.blob(-96, 48, 118, 24, .38, 353), '#3C284A', 110, .50, [.3, .4]);
  }, { ...WASH, seed: 35, scale: 1 });
  const necCv = pin('g.necroTile');
  lockNecro(necCv);
  // Pale ochre washes for the fat, multiplied over the yellow base.
  bake('g.fat', (b, P) => {
    P.fill(b, P.blob(-42, -30, 250, 32, .34, 51), '#D8AE58', 110, .5, [.34, .44]);
    P.fill(b, P.blob(72, 42, 190, 28, .42, 52), '#C89A44', 95, .46, [.30, .40]);
    P.fill(b, P.blob(8, 82, 150, 24, .38, 53), '#EFD08C', 85, .5, [.30, .40]);
    P.fill(b, P.blob(-124, 62, 120, 22, .42, 54), '#E8C275', 80, .46, [.30, .40]);
  }, { ...WASH, seed: 31, scale: 1 });
  pin('g.fat');
  // Neutral pigment grain: broken warm-grey blooms that break the digital cylinder gradient.
  bake('g.grain', (b, P) => {
    P.fill(b, P.blob(-120, -80, 300, 54, .52, 61), '#8B7A66', 34, .6, [.45, .55]);
    P.fill(b, P.blob(150, 90, 260, 48, .56, 62), '#7A6A58', 26, .6, [.45, .55]);
    P.fill(b, P.blob(40, -170, 220, 40, .5, 63), '#9A8A76', 22, .6, [.45, .55]);
    P.fill(b, P.blob(-180, 150, 180, 36, .55, 64), '#8E7E6A', 20, .6, [.45, .55]);
  }, { ...WASH, seed: 41, scale: 1 });
  pin('g.grain');
  makeFatSprites();
  PUS_SPRITE = makePlaqueSprite('#CDB98A', 8123, 'g.pusTile');
  NECRO_SPRITE = makePlaqueSprite('#241A2C', 8321, 'g.necroTile', {
    core: '#0E0A12',
    rings: [[1.14, .12], [1.0, .94]],
  });
}

// ── mesentery ────────────────────────────────────────────────────────────────────────────
function paintMesoBase(ctx, swell) {
  const loop = mesoLoop(swell);
  ctx.fillStyle = '#E9C778';
  path(ctx, loop); ctx.fill();
  // One smooth gradient across the hang (wall → free edge); the old 28 strips left seams.
  const a = mesoPt(0.36, swell, 2), b = mesoPt(0.3, swell, 112);
  const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
  g.addColorStop(0, '#C08C3C');
  g.addColorStop(0.14, '#D5A64E');
  g.addColorStop(0.44, '#EAC97D');
  g.addColorStop(0.74, '#F2D997');
  g.addColorStop(0.9, '#EACE86');
  g.addColorStop(1, '#D8AE57');
  ctx.fillStyle = g;
  path(ctx, loop); ctx.fill();
  // Pigment blooms over the flat fill.
  drawPinned(ctx, 'g.fat', 0, 20, 980, { alpha: .30, blend: 'multiply' });
  drawPinned(ctx, 'g.fat', -60, -10, 720, { alpha: .14, blend: 'multiply' });
}
// Fat cells: soft overlapping lobule sprites over the wash. No closed outlines — only the
// broken golden crescent baked into each sprite keeps the clumps legible.
function paintFatCells(ctx, swell, topOnly = false) {
  LOBULES.forEach(L => {
    if (!!L.top !== topOnly) return;
    const c = lobuleCenter(L, swell);
    const f = frameAt(L.s);
    const ang = Math.atan2(f.ty, f.tx) + L.rot;
    const r = L.r * 3.0;
    const a = L.alpha * (topOnly ? .88 : .92);
    drawSprite(ctx, FAT_SPRITES[L.tone], c[0], c[1], r, r * 0.9, ang, a);
    // Second offset lobe: the clump is not a round coin.
    const ox = f.tx * L.r * .42 + f.nx * L.r * .18;
    const oy = f.ty * L.r * .42 + f.ny * L.r * .18;
    drawSprite(ctx, FAT_SPRITES[(L.tone + 2) % FAT_SPRITES.length], c[0] + ox, c[1] + oy, r * .62, r * .56, ang + 1.25, a * .68);
  });
}
function paintMesoTint(ctx, swell, cong) {
  if (cong <= 0.02) return;
  const a = mesoPt(0.28, swell, 0), b = mesoPt(0.28, swell, 120);
  const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
  g.addColorStop(0, `rgba(190, 44, 40, ${.32 * cong})`);
  g.addColorStop(.45, `rgba(202, 74, 52, ${.16 * cong})`);
  g.addColorStop(1, 'rgba(210, 140, 70, 0)');
  ctx.fillStyle = g;
  path(ctx, mesoLoop(swell)); ctx.fill();
}
function paintVessels(ctx, swell, cong) {
  const artCol = mix3([126, 52, 50], [198, 44, 40], cong);
  const veinCol = mix3([86, 46, 54], [140, 42, 56], cong);
  const halo = mix3([180, 96, 88], [230, 96, 84], cong);
  const kW = 1 + 0.45 * cong;
  const trunkPts = vesselPts(VESSEL.trunk, swell);
  const veinPts = vesselPts(VESSEL.vein, swell);
  // Soft flush beneath the vessels.
  strokeTapered(ctx, trunkPts, 8 * kW, 5 * kW, halo, .09 * (.3 + cong));
  VESSEL.branches.forEach(b => strokeTapered(ctx, vesselPts(b, swell), 6 * kW, 3 * kW, halo, .08 * (.3 + cong)));
  // Vein sits deeper and slightly bluer.
  strokeTapered(ctx, veinPts, 1.5 * kW, 1.0 * kW, veinCol, .68);
  // Artery trunk + branches, tapering into the wall.
  strokeTapered(ctx, trunkPts, 2.2 * kW, 1.3 * kW, artCol, .86);
  VESSEL.branches.forEach((b, i) => {
    const pts = vesselPts(b, swell);
    strokeTapered(ctx, pts, 1.45 * kW, .55, artCol, .78);
    const tw = vesselPts(VESSEL.twigs[i], swell);
    strokeTapered(ctx, tw, .8 * kW, .38, artCol, .48);
  });
  VESSEL.arcades.forEach((b,i) => strokeTapered(ctx,vesselPts(b,swell),(.9-i*.08)*kW,.45,artCol,.48));
  // Fine caps near the serosa, more visible when congested.
  const R = rng(77021);
  for (let i = 0; i < 13; i++) {
    const s = 0.05 + R() * 0.7;
    const h = mesoHang(s);
    if (h < 10) continue;
    const p0 = mesoPt(s, swell, h * (0.04 + R() * 0.12));
    const p1 = mesoPt(s + 0.02 + R() * 0.02, swell, h * (0.10 + R() * 0.16));
    strokeTapered(ctx, [p0, p1], .8, .45, artCol, .30 + .35 * cong);
  }
}
function drawMesoInk(ctx, swell, px) {
  const edge = mesoFreeEdge(swell);
  inkStroke(ctx, 'g.mesoE', 'curve', [edge], { strokeWidth: 1.2 * px, roughness: .85, bowing: .46, seed: 61 }, 0.30);
  const cap = [mesoPt(0, swell, 0), mesoPt(0, swell, mesoHang(0))];
  inkStroke(ctx, 'g.mesoCap', 'linearPath', [cap], { strokeWidth: 1.1 * px, roughness: .85, bowing: .3, seed: 62 }, 0.24);
  // Fat-lobule septa: short faint creases, not a wireframe.
  const R = rng(4409);
  for (let i = 0; i < 28; i++) {
    const s = 0.08 + R() * 0.66;
    const h = mesoHang(s);
    if (h < 26) continue;
    const hf = 0.22 + R() * 0.62;
    const c = mesoPt(s, swell, h * hf);
    const f = frameAt(s);
    const len = 7 + R() * 11, ang = (R() - .5) * 1.5;
    const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
    inkStroke(ctx, 'g.crease' + i, 'curve', [[
      [c[0] - f.tx * dx - f.nx * dy, c[1] - f.ty * dx - f.ny * dy],
      [c[0], c[1]],
      [c[0] + f.tx * dx + f.nx * dy, c[1] + f.ty * dx + f.ny * dy],
    ]], { strokeWidth: .7 * px, stroke: 'rgba(150, 104, 42, .55)', roughness: .62, bowing: .25, seed: 190 + i }, 0.20);
  }
}

// ── cylinder ────────────────────────────────────────────────────────────────────────────
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
    mix3(base, gl, 0.30),
    mix3(base, gl, 0.35),
    mix3(base, gl, 0.14),
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

function paintCylinder(ctx, swell, look, dent) {
  const outline = tubeOutline(swell, dent);
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
    const wS0 = tubeRadius(s0, swell), wS1 = tubeRadius(s1, swell);
    const wL0 = litRadius(s0, swell, dent), wL1 = litRadius(s1, swell, dent);
    const sh = addN(f0, wS0), li = addN(f0, -wL0);
    const g = ctx.createLinearGradient(sh[0], sh[1], li[0], li[1]);
    for (let k = 0; k <= 8; k++) g.addColorStop(k / 8, css(crossColor(look, k / 8)));
    ctx.fillStyle = g;
    quad(ctx,
      addN(f0, wS0), addN(f1, wS1),
      addN(f1, -wL1), addN(f0, -wL0));
  }
  paintCap(ctx, swell, look);
  ctx.restore();
  return outline;
}

// Blind end shares the shaft's continuous cross-wall gradient, without strip seams.
function paintCap(ctx, swell, look) {
  const f = frameAt(CAP_S), R = tubeRadius(CAP_S, swell);
  const sh = addN(f, R), li = addN(f, -R);
  const g = ctx.createLinearGradient(sh[0], sh[1], li[0], li[1]);
  for (let k = 0; k <= 8; k++) g.addColorStop(k / 8, css(crossColor(look, k / 8)));
  ctx.fillStyle = g;
  const pt = (u, h) => [f.p[0] + f.nx * u + f.tx * h, f.p[1] + f.ny * u + f.ty * h];
  // Overlap the final shaft segment slightly to avoid a raster seam.
  path(ctx, [pt(R, -1), pt(R, NORMAL_RADIUS + 1), pt(-R, NORMAL_RADIUS + 1), pt(-R, -1)]);
  ctx.fill();
}

function paintCut(ctx, swell, look) {
  const f = frameAt(0.02), w = tubeRadius(0.02, swell);
  ctx.save();
  ctx.translate(f.p[0] - f.tx * w * 0.02, f.p[1] - f.ty * w * 0.02);
  ctx.rotate(Math.atan2(f.ny, f.nx));
  ctx.fillStyle = css(look.shadow, 0.78);
  ctx.beginPath();
  ctx.ellipse(0, w * 0.02, w * 0.16, w * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── pus: yellow fibrinopurulent crust (r6) ──────────────────────────────────────────────
// r5's radial blooms read as a white fog at 1080p. r6 builds each patch from a few
// concentric irregular fills (solid core, narrow feather) plus axial fibrin threads.
// No reused sprite, no outline stroke, no gaussian. Normal/red never reach this code
// (pus alpha is 0). The gangrenous core keeps the r5 exudate underneath the unchanged
// necrosis paint; new crust fades out before that core and turns dirty grey-green beside it.
const PUS_TONES = [
  [194, 160, 98],   // 灰黄
  [204, 170, 108],  // 灰黄
  [216, 186, 126],  // 乳黄
  [182, 150, 88],   // 深灰黄
  [188, 174, 104],  // 淡黄绿
  [198, 164, 100],  // 灰黄
  [210, 178, 116],  // 乳黄
];
const PUS_DIRTY = [114, 120, 86]; // 污秽灰绿，只在坏疽交界
// s, v, along-px, across-px, core alpha, tone index. Thick cores do not show red.
const PUS_CRUSTS = [
  [0.13, -0.52, 36, 13, 0.94, 0],
  [0.15, -0.16, 48, 15, 0.97, 2],
  [0.18, 0.22, 30, 12, 0.90, 4],
  [0.21, -0.74, 28, 10, 0.88, 1],
  [0.24, -0.36, 62, 17, 0.98, 3],
  [0.27, 0.02, 40, 14, 0.93, 5],
  [0.30, -0.58, 44, 13, 0.95, 0],
  [0.32, 0.34, 26, 11, 0.86, 6],
  [0.36, -0.20, 78, 19, 0.98, 2],
  [0.39, -0.64, 40, 12, 0.94, 1],
  [0.42, 0.10, 38, 15, 0.92, 4],
  [0.45, -0.40, 68, 16, 0.98, 6],
  [0.48, 0.38, 24, 10, 0.84, 5],
  [0.51, -0.08, 52, 17, 0.97, 2],
  [0.54, -0.56, 38, 12, 0.93, 0],
  [0.57, 0.14, 42, 14, 0.91, 3],
  [0.60, -0.30, 74, 18, 0.98, 1],
  [0.63, -0.66, 32, 11, 0.90, 4],
  [0.66, 0.02, 46, 15, 0.95, 2],
  [0.69, -0.42, 36, 13, 0.92, 5],
  [0.72, 0.26, 28, 11, 0.84, 0],
  [0.74, -0.18, 40, 14, 0.90, 6],
  // reach toward the lit rim so the coat reads yellow, leaving a thin red edge
  [0.19, -0.84, 36, 12, 0.92, 2],
  [0.33, -0.80, 44, 13, 0.94, 1],
  [0.48, -0.82, 40, 12, 0.92, 6],
  [0.62, -0.78, 36, 12, 0.90, 0],
  // thin veils — red serosa stays visible
  [0.16, -0.38, 34, 8, 0.32, 2],
  [0.28, -0.08, 40, 7, 0.28, 3],
  [0.41, -0.72, 26, 6, 0.26, 4],
  [0.50, 0.22, 30, 7, 0.30, 1],
  [0.62, -0.14, 36, 7, 0.30, 5],
  [0.22, 0.46, 20, 6, 0.24, 6],
  [0.56, -0.46, 24, 6, 0.28, 0],
  // cords along the axis
  [0.28, -0.48, 96, 4.0, 0.74, 1],
  [0.46, -0.14, 110, 3.6, 0.70, 3],
  [0.58, -0.50, 88, 3.4, 0.66, 4],
  [0.36, 0.18, 76, 3.2, 0.58, 5],
];
const PUS_EXTRA = (() => {
  const R = rng(72107), out = [];
  for (let i = 0; i < 16; i++) {
    const s = 0.14 + R() * 0.60;
    const v = -0.80 + R() * 1.20;
    const thick = R() > 0.42;
    out.push([
      s, v,
      (thick ? 14 : 8) + R() * (thick ? 22 : 12),
      (thick ? 6 : 3.5) + R() * (thick ? 6 : 3),
      thick ? 0.72 + R() * 0.22 : 0.22 + R() * 0.12,
      (R() * PUS_TONES.length) | 0,
    ]);
  }
  return out;
})();
// Specks seated on the necrotic rim (dist in plaque-radii). Painted after the black, so the join is exudate over the halo, not a cut line.
const PUS_MARGIN = (() => {
  const out = [];
  NECRO.forEach((n, i) => {
    const R = rng(88000 + i * 19);
    for (let k = 0; k < 4; k++) out.push({
      ni: i, ang: R() * Math.PI * 2, dist: 1.25 + R() * 0.5,
      rx: 9 + R() * 8, ry: 4 + R() * 3, body: 0.18 + R() * 0.16, tone: (R() * 3) | 0,
    });
  });
  return out;
})();

function pusAt(swell, s, v) {
  const f = frameAt(clamp(s, 0, CAP_S)), w = tubeRadius(clamp(s, 0, CAP_S), swell);
  return [f.p[0] + f.nx * w * v, f.p[1] + f.ny * w * v];
}
// 1 at a necrotic centre, 0 outside the plaque.
function necroMask(s, v, swell) {
  let m = 0;
  for (let i = 0; i < NECRO.length; i++) {
    const n = NECRO[i];
    const rad = tubeRadius(n.s, swell);
    const d = Math.hypot((s - n.s) * 760 / n.rx, (v - n.v) * rad / n.ry);
    m = Math.max(m, clamp(1.05 - d, 0, 1));
  }
  return m;
}
function necroDist(s, v, swell) {
  let best = 9;
  for (let i = 0; i < NECRO.length; i++) {
    const n = NECRO[i];
    const rad = tubeRadius(n.s, swell);
    best = Math.min(best, Math.hypot((s - n.s) * 760 / n.rx, (v - n.v) * rad / n.ry));
  }
  return best;
}
// 0 on the necrotic plaque, 1 once the exudate is clear of it.
function exudateKeep(dist) {
  if (dist >= 1.75) return 1;
  if (dist <= 1.02) return 0;
  return smooth((dist - 1.02) / 0.73);
}
function pusTone(idx, s, necrosis, dist) {
  const base = PUS_TONES[idx % PUS_TONES.length];
  if (necrosis < 0.01) return base;
  const distal = smooth((s - 0.56) / 0.16);
  const near = dist < 8 ? smooth((1.55 - dist) / 0.7) : 0;
  const k = necrosis * Math.min(0.9, Math.max(distal * 0.7, near));
  return mix3(base, PUS_DIRTY, k);
}
// New exudate may not paint the necrotic plaque. Holes use the opposite winding so overlaps stay empty.
function clipOutsideNecro(ctx, swell, scale) {
  ctx.beginPath();
  ctx.rect(-980, -560, 1960, 1120);
  NECRO.forEach(n => {
    const pts = surfaceBlob(n.s, n.v, n.rx * scale, n.ry * scale, n.seed + 17, {
      swell, n: 28, jitter: 0.08, amp: 0.1, lobes: 2,
    });
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      if (i === pts.length - 1) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    }
    ctx.closePath();
  });
  ctx.clip('nonzero');
}
function clipNecroCore(ctx, swell, scale) {
  ctx.beginPath();
  NECRO.forEach(n => {
    const pts = surfaceBlob(n.s, n.v, n.rx * scale, n.ry * scale, n.seed + 17, {
      swell, n: 22, jitter: 0.12, amp: 0.08, lobes: 2,
    });
    pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.closePath();
  });
  ctx.clip();
}
function crustBlob(s, v, rx, ry, seed, swell, lobes) {
  return surfaceBlob(s, v, Math.max(2, rx), Math.max(1.6, ry), seed, {
    swell, n: 48, jitter: 0.06, amp: 0.12, lobes,
  });
}
function paintCrustLayers(ctx, swell, crusts, alpha, necrosis) {
  for (let i = 0; i < crusts.length; i++) {
    const [s, v, rx0, ry0, body, toneI] = crusts[i];
    const rx = rx0 * 1.12, ry = ry0 * 1.22;
    const dist = necrosis > 0.01 ? necroDist(s, v, swell) : 9;
    const keep = exudateKeep(dist);
    const strength = body * keep * alpha;
    if (strength < 0.03) continue;
    const tone = pusTone(toneI, s, necrosis, dist);
    const seed = 9100 + i * 13;
    const lobes = 2 + (i % 3);
    const thick = body >= 0.5;
    const steps = thick ? 8 : 4;
    const feather = thick ? 7.5 : 4.2;
    for (let k = 0; k < steps; k++) {
      const t = k / (steps - 1);
      const a = strength * (thick ? (0.035 + 0.965 * t * t) : (0.18 + 0.82 * t * t));
      if (a < 0.02) continue;
      const grow = (1 - t) * feather;
      fillPoly(ctx, crustBlob(s, v, rx + grow, ry + grow * 0.7, seed, swell, lobes), tone, a);
    }
    if (!thick) continue;
    const rad = tubeRadius(s, swell);
    // Lit shoulder and shadow lip: same family of colour, low alpha, no outline.
    fillPoly(ctx, crustBlob(s, v - ry * 0.34 / rad, rx * 0.52, ry * 0.42, seed + 3, swell, 2),
      mix3(tone, [224, 200, 148], 0.38), strength * 0.26);
    fillPoly(ctx, crustBlob(s, v + ry * 0.42 / rad, rx * 0.66, ry * 0.36, seed + 5, swell, 2),
      mix3(tone, [128, 100, 56], 0.42), strength * 0.12);
    const R = rng(seed + 40);
    const f = frameAt(s);
    const ang = Math.atan2(f.ty, f.tx);
    for (let g = 0; g < 5; g++) {
      const u = (R() - 0.5) * rx * 0.9;
      const vv = v * rad + (R() - 0.5) * ry * 0.7;
      const dark = R() < 0.65;
      const col = dark ? mix3(tone, [110, 86, 48], 0.55) : mix3(tone, [222, 198, 146], 0.3);
      ctx.fillStyle = css(col, strength * (dark ? 0.18 : 0.1));
      ctx.beginPath();
      ctx.ellipse(f.p[0] + f.tx * u + f.nx * vv, f.p[1] + f.ty * u + f.ny * vv,
        0.6 + R() * 1.2, 0.4 + R() * 0.7, ang, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
function fiberPoints(swell, s0, v0, lenS, driftV, seed) {
  const R = rng(seed | 0);
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const s = clamp(s0 + (t - 0.5) * lenS, 0.04, 0.88);
    const wob = Math.sin(t * Math.PI * (1.2 + (seed % 5) * 0.37) + seed) * 0.055;
    const v = v0 + driftV * (t - 0.5) + wob + (R() - 0.5) * 0.008;
    pts.push(pusAt(swell, s, v));
  }
  return pts;
}
function strokeFiber(ctx, pts, col, alpha, width) {
  if (alpha < 0.04 || pts.length < 2) return;
  const n = pts.length - 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const k = Math.sin(Math.PI * t);
    ctx.strokeStyle = css(col, alpha * (0.2 + 0.8 * k));
    ctx.lineWidth = width * (0.32 + 0.68 * k);
    ctx.beginPath();
    ctx.moveTo(pts[i][0], pts[i][1]);
    ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
    ctx.stroke();
  }
}
function paintFibrin(ctx, swell, crusts, alpha, necrosis) {
  ctx.save();
  for (let i = 0; i < crusts.length; i++) {
    const [s, v, rx, ry, body, toneI] = crusts[i];
    if (body < 0.6 || ry < 8) continue;
    const dist = necrosis > 0.01 ? necroDist(s, v, swell) : 9;
    const keep = exudateKeep(dist);
    if (body * keep * alpha < 0.45) continue;
    const tone = pusTone(toneI, s, necrosis, dist);
    const dark = mix3(tone, [102, 78, 44], 0.42);
    const lite = mix3(tone, [208, 182, 124], 0.16);
    const rad = tubeRadius(s, swell);
    const R = rng(12000 + i * 29);
    const rows = 3;
    for (let r = 0; r < rows; r++) {
      const vv = v + ((r / (rows - 1)) - 0.5) * (ry / rad) * 0.8;
      const lenS = (rx / 760) * (0.46 + R() * 0.22);
      const drift = (R() - 0.5) * 0.035;
      const pts = fiberPoints(swell, s + (R() - 0.5) * lenS * 0.12, vv, lenS, drift, 13000 + i * 20 + r);
      strokeFiber(ctx, pts, r === 1 ? lite : dark, alpha * keep * (r === 1 ? 0.34 : 0.66), 0.8 + R() * 0.4);
    }
    const vv = v + (R() - 0.5) * (ry / rad) * 0.35;
    const lenS = (rx / 760) * (0.22 + R() * 0.16);
    const pts = fiberPoints(swell, s, vv, lenS, (R() < 0.5 ? -1 : 1) * (ry / rad) * 0.38, 14000 + i);
    strokeFiber(ctx, pts, dark, alpha * keep * 0.5, 0.7 + R() * 0.25);
  }
  ctx.restore();
}
function paintMarginRing(ctx, swell, alpha, necrosis) {
  PUS_MARGIN.forEach((sp, i) => {
    const n = NECRO[sp.ni];
    const rad = tubeRadius(n.s, swell);
    const s = clamp(n.s + Math.cos(sp.ang) * n.rx * sp.dist / 760, 0.05, 0.88);
    const v = n.v + Math.sin(sp.ang) * n.ry * sp.dist / rad;
    const dist = necroDist(s, v, swell);
    if (dist < 1.05) return;
    const keep = smooth(clamp((dist - 1.05) / 0.28, 0, 1)) * (1 - smooth(clamp((dist - 1.7) / 0.35, 0, 1)));
    const tone = mix3(PUS_TONES[4 + sp.tone], PUS_DIRTY, 0.78);
    const a = sp.body * keep * alpha * necrosis;
    if (a < 0.04) return;
    for (let k = 0; k < 5; k++) {
      const t = k / 4;
      fillPoly(ctx, crustBlob(s, v, sp.rx + 5 * (1 - t), sp.ry + 3.4 * (1 - t), 16000 + i * 9, swell, 3),
        tone, a * (0.06 + 0.94 * t * t));
    }
    const pts = fiberPoints(swell, s, v, sp.rx / 760, (sp.ang % 1) * 0.04 - 0.02, 17000 + i);
    strokeFiber(ctx, pts, mix3(tone, [70, 78, 52], 0.4), a * 0.7, 1.05);
  });
}
// r5 painter, used only inside the gangrenous core so that core's underlayer matches r5.
function paintPusLegacy(ctx, swell, alpha, necrosis = 0, marginOnly = false) {
  if (alpha <= .002) return;
  const R = rng(marginOnly ? 59032 : 59031);
  const point = (s, v) => {
    const f = frameAt(s), w = tubeRadius(s, swell);
    return [f.p[0] + f.nx * w * v, f.p[1] + f.ny * w * v];
  };
  const density = (s, v) => {
    const centre = -.26 + .15 * Math.sin(s * 21) + .07 * Math.sin(s * 57);
    const width = .34 + .12 * Math.sin(s * 35 + 1);
    return smooth((s - .10) / .08) * (1 - smooth((s - .72) / .16)) *
      Math.exp(-(((v - centre) / width) ** 2)) *
      (.56 + .25 * Math.sin(s * 49 + v * 7) + .17 * Math.sin(s * 97 - v * 13));
  };
  for (let i = 0; i < (marginOnly ? 520 : 4200); i++) {
    const s = marginOnly ? .68 + R() * .19 : .105 + R() * .76;
    const v = -.90 + R() * 1.55;
    const d = density(s, v);
    if (R() > d * (marginOnly ? Math.exp(-(((s - .75) / .075) ** 2)) : 1)) continue;
    const dirty = necrosis * smooth((s - .63) / .17);
    const tone = mix3(mix3([207, 201, 161], [237, 224, 184], R()), [153, 163, 125], dirty * .78);
    const f = frameAt(s), p = point(s, v);
    ctx.save(); ctx.translate(...p); ctx.rotate(Math.atan2(f.ty, f.tx));
    ctx.scale(3 + R() * 15, 1.1 + R() * 4.5);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    const opacity = (.09 + R() * .15) * alpha * (marginOnly ? .5 : 1);
    g.addColorStop(0, css(tone, opacity));
    g.addColorStop(.42, css(tone, opacity * .78));
    g.addColorStop(1, css(tone, 0));
    ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
  }
  for (let i = 0; i < (marginOnly ? 55 : 530); i++) {
    const s = marginOnly ? .68 + R() * .17 : .12 + R() * .70;
    const v = -.80 + R() * 1.25;
    if (R() > density(s, v)) continue;
    const len = .008 + R() * .044, drift = (R() - .5) * .13;
    const tone = mix3([234, 225, 191], [159, 171, 133], necrosis * smooth((s - .64) / .15));
    const pts = Array.from({ length: 13 }, (_, j) => {
      const t = j / 12;
      return point(Math.min(.89, s + len * t), v + drift * t + .018 * Math.sin(t * 5 + i));
    });
    for (let j = 0; j < 12; j++) {
      ctx.lineWidth = (.25 + R() * .48) * Math.sin(Math.PI * (j + .5) / 12);
      ctx.strokeStyle = css(tone, (.12 + R() * .23) * alpha * (marginOnly ? .5 : 1));
      ctx.beginPath(); ctx.moveTo(...pts[j]); ctx.lineTo(...pts[j + 1]); ctx.stroke();
    }
  }
}
function paintPus(ctx, swell, alpha, necrosis = 0, marginOnly = false) {
  if (alpha <= .002) return;
  // Inner necrotic core: r5 exudate only, so the unchanged black paint sits on the same ground.
  if (necrosis > 0.04) {
    ctx.save();
    clipNecroCore(ctx, swell, marginOnly ? 1.0 : 1.02);
    paintPusLegacy(ctx, swell, alpha, necrosis, marginOnly);
    ctx.restore();
  }
  if (marginOnly) {
    ctx.save();
    clipOutsideNecro(ctx, swell, 1.04);
    paintMarginRing(ctx, swell, alpha, necrosis);
    ctx.restore();
    return;
  }
  const crusts = PUS_CRUSTS.concat(PUS_EXTRA);
  if (necrosis > 0.04) {
    ctx.save();
    clipOutsideNecro(ctx, swell, 0.98);
    paintCrustLayers(ctx, swell, crusts, alpha, necrosis);
    paintFibrin(ctx, swell, crusts, alpha, necrosis);
    ctx.restore();
  } else {
    paintCrustLayers(ctx, swell, crusts, alpha, necrosis);
    paintFibrin(ctx, swell, crusts, alpha, necrosis);
  }
}

// Surface pigment has clustered grains and short strokes following the tissue axis.
function paintSerosalTooth(ctx, swell, cong) {
  const R = rng(94031);
  for(let i=0;i<3400;i++) {
    const s=.012+R()*.89, v=-.97+R()*1.94, f=frameAt(s), w=tubeRadius(s,swell);
    const x=f.p[0]+f.nx*w*v, y=f.p[1]+f.ny*w*v;
    const cluster=.5+.5*Math.sin(s*83+v*9)*Math.sin(v*24+s*37);
    const dark=R()>.28;
    ctx.fillStyle=dark ? css(mix3([106,73,66],[122,32,34],cong),.025+cluster*.095) : 'rgba(252,232,214,.13)';
    ctx.beginPath();ctx.ellipse(x,y,.18+R()*.65,.16+R()*.36,0,0,Math.PI*2);ctx.fill();
    if(i%11===0) {
      const len=1.4+R()*5;
      ctx.strokeStyle=dark?'rgba(104,53,49,.10)':'rgba(249,226,210,.16)';ctx.lineWidth=.35+R()*.8;
      ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+f.tx*len*.5+f.nx,y+f.ty*len*.5+f.ny,x+f.tx*len,y+f.ty*len);ctx.stroke();
    }
  }
  for(let i=0;i<62;i++) {
    const s=.025+R()*.85,v=-.85+R()*1.7;
    const pts=surfaceBlob(s,v,4+R()*15,1.5+R()*4,94500+i,{swell,n:24,jitter:.32});
    fillPoly(ctx,pts, i%3===0?[246,218,201]:mix3([134,92,82],[152,44,41],cong),.045+R()*.055);
    if(i%3!==0){ctx.strokeStyle=css(mix3([121,83,74],[144,38,38],cong),.055);ctx.lineWidth=.45;ctx.beginPath();pts.slice(5,15).forEach((p,j)=>j?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();}
  }
}
function paintNecroDamage(ctx,swell,alpha) {
 const R=rng(94322);
 ctx.save();ctx.globalAlpha*=alpha;
 for(let i=0;i<30;i++) {
  const s=.735+R()*.14,v=-.58+R()*.95,f=frameAt(s),w=tubeRadius(s,swell);
  const x=f.p[0]+f.nx*w*v,y=f.p[1]+f.ny*w*v,len=2+R()*7;
  ctx.strokeStyle='rgba(8,5,13,.48)';ctx.lineWidth=.35+R()*.65;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+f.tx*len*.5+f.nx,y+f.ty*len*.5+f.ny);ctx.lineTo(x+f.tx*len-f.nx,y+f.ty*len-f.ny);ctx.stroke();
  if(i%3===0){fillPoly(ctx,surfaceBlob(s,v,2+R()*4,1+R()*2,94700+i,{swell,n:20}),[8,7,13],.34);
  ctx.strokeStyle='rgba(188,168,158,.19)';ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(x,y-1);ctx.lineTo(x+f.tx*len*.6,y+f.ty*len*.6-1);ctx.stroke();}
 }
 ctx.restore();
}

// ── hemorrhage ──────────────────────────────────────────────────────────────────────────
function paintBleeds(ctx, swell, alpha) {
  if (alpha <= 0.01) return;
  const rings = [
    { k: 1.60, col: [172, 92, 92], a: .13 },
    { k: 1.22, col: [142, 58, 62], a: .26 },
    { k: .88, col: [112, 34, 46], a: .46 },
    { k: .55, col: [76, 20, 32], a: .56 },
  ];
  BLEEDS.forEach(b => {
    rings.forEach((rg, j) => {
      const pts = surfaceBlob(b.s, b.v, b.rx * rg.k, b.ry * rg.k, b.seed + j, {
        swell, n: 24, jitter: .42, amp: .28, lobes: 3 + (j % 2),
      });
      fillPoly(ctx, pts, rg.col, rg.a * b.a * alpha);
    });
  });
}

// ── gangrene ────────────────────────────────────────────────────────────────────────────
function paintNecro(ctx, swell, alpha) {
  if (alpha <= 0.01) return;
  const R = rng(8807);
  // 1. Dark-red congested band around the necrotic pole.
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  NECRO.forEach(n => {
    const band = surfaceBlob(n.s, n.v, n.rx * 1.95, n.ry * 2.05, n.seed + 5, { swell, jitter: .28, amp: .20 });
    fillPoly(ctx, band, [140, 40, 44], .26 * alpha);
  });
  ctx.restore();
  // 2. Dark-red transition band, not a smooth violet halo.
  NECRO.forEach(n => {
    fillPoly(ctx, surfaceBlob(n.s, n.v, n.rx * 1.52, n.ry * 1.6, n.seed + 7, { swell, jitter: .32, amp: .22 }), [122, 38, 40], .30 * alpha);
  });
  // 3. Sparse violet mottles where the wall is dying but not yet black.
  [[.752, -.22, 9, 7, 7701], [.828, .09, 8, 6, 7702], [.792, .22, 7, 5, 7703], [.865, -.10, 6, 4.5, 7704]].forEach(([s, v, rx, ry, sd]) => {
    fillPoly(ctx, surfaceBlob(s, v, rx, ry, sd, { swell, jitter: .45, amp: .3 }), [78, 46, 68], .28 * alpha);
  });
  // 4. Textured purple-black plaques (watercolour grain baked in).
  if (NECRO_SPRITE) NECRO.forEach((n, i) => {
    const f = frameAt(n.s), w = tubeRadius(n.s, swell);
    const c = [f.p[0] + f.nx * w * n.v, f.p[1] + f.ny * w * n.v];
    const ang = Math.atan2(f.ty, f.tx);
    drawSprite(ctx, NECRO_SPRITE, c[0], c[1], n.rx * 3.4, n.ry * 3.6, ang + (R() - .5) * .9, .80 * alpha);
    drawSprite(ctx, NECRO_SPRITE, c[0] + (R() - .5) * n.rx * .7, c[1] + (R() - .5) * n.ry * .6, n.rx * 2.2, n.ry * 2.4, ang + (R() - .5) * 1.4, .50 * alpha);
  });
  // 5. Sooty cores: small, irregular, plus one soft band tying them together.
  fillPoly(ctx, surfaceBlob(.800, -.08, 30, 13, 7203, { swell, jitter: .42, amp: .24 }), [12, 8, 14], .44 * alpha);
  NECRO.forEach((n, i) => {
    fillPoly(ctx, surfaceBlob(n.s - .006, n.v - .03, n.rx * .34, n.ry * .34, n.seed + 11, { swell, jitter: .48, amp: .28 }), [10, 7, 12], .55 * alpha);
  });
  fillPoly(ctx, surfaceBlob(.818, -.10, 9, 5.5, 7721, { swell, jitter: .48, amp: .3 }), [12, 8, 14], .50 * alpha);
  // 6. Small dull slough islands, low contrast inside the black.
  fillPoly(ctx, surfaceBlob(.789, -.27, 6.5, 4.4, 7710, { swell, jitter: .45, amp: .28 }), [132, 118, 98], .30 * alpha);
  fillPoly(ctx, surfaceBlob(.833, .05, 5.5, 3.6, 7711, { swell, jitter: .4, amp: .25 }), [146, 132, 112], .24 * alpha);
}

// A small slough-covered perforation near the necrotic pole; reads as a shallow crater.
function paintPit(ctx, swell, alpha) {
  if (alpha <= 0.02) return;
  const s = 0.803, v = -0.17;
  const f = frameAt(s), w = tubeRadius(s, swell);
  const c = [f.p[0] + f.nx * w * v, f.p[1] + f.ny * w * v];
  ctx.save();
  ctx.translate(c[0], c[1]);
  ctx.rotate(Math.atan2(f.ty, f.tx));
  ctx.globalAlpha *= alpha;
  const g = ctx.createRadialGradient(-2, -1, 1, 0, 0, 11);
  g.addColorStop(0, '#060508');
  g.addColorStop(0.42, '#160F18');
  g.addColorStop(0.72, 'rgba(58, 34, 52, .55)');
  g.addColorStop(1, 'rgba(58, 34, 52, 0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(172, 154, 128, .30)';
  ctx.lineWidth = 1.15;
  ctx.beginPath(); ctx.ellipse(-1, -1.5, 6.2, 3.4, 0, Math.PI * 1.1, Math.PI * 1.95); ctx.stroke();
  ctx.restore();
}

// ── wet sheen ───────────────────────────────────────────────────────────────────────────
function paintGloss(ctx, swell, amount, px) {
  if (amount <= 0.03) return;
  const bands = [
    [0.09, 0.15, 0.79, 6], [0.19, 0.25, 0.75, 8],
    [0.32, 0.37, 0.82, 5], [0.41, 0.47, 0.74, 9],
    [0.53, 0.56, 0.77, 5], [0.61, 0.67, 0.72, 7],
    [0.73, 0.77, 0.69, 4],
  ];
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  bands.forEach(([a, b, off, wide], i) => {
    const pts = [];
    for (let j = 0; j <= 7; j++) {
      const s = a + (b - a) * (j / 7), f = frameAt(s), w = litRadius(s, swell, 0);
      pts.push([f.p[0] - f.nx * w * off, f.p[1] - f.ny * w * off]);
    }
    const layers = [
      [wide * 2.4 * px, .13], [wide * 1.1 * px, .22], [wide * .42 * px, .26], [2.4 * px, .40],
    ];
    layers.forEach(([lw, la], k) => {
      ctx.strokeStyle = `rgba(255, 252, 244, ${la * amount})`;
      for(let j=0;j<pts.length-1;j++) {
        const t=(j+.5)/(pts.length-1);
        ctx.lineWidth=lw*(.18+.82*Math.sin(Math.PI*t))*(.82+.18*Math.sin(j*2.7+i));
        ctx.beginPath();ctx.moveTo(...pts[j]);ctx.lineTo(...pts[j+1]);ctx.stroke();
      }
    });
  });
  // Small specular at the cap crest.
  const f = frameAt(0.885), w = tubeRadius(0.885, swell);
  ctx.save();
  ctx.translate(f.p[0] - f.nx * w * .48, f.p[1] - f.ny * w * .48);
  ctx.rotate(Math.atan2(f.ty, f.tx));
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 12 * px);
  g.addColorStop(0, `rgba(255, 253, 248, ${.5 * amount})`);
  g.addColorStop(1, 'rgba(255, 253, 248, 0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, 13 * px, 5 * px, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.restore();
}

// Fine congested serosal vessels, drawn after the pale/red serosal washes.
const SURFACE = [];
function surfacePaths() {
  if (SURFACE.length) return SURFACE;
  const R = rng(41011);
  for (let i = 0; i < 8; i++) {
    const s0 = 0.07 + R() * 0.62;
    const len = 0.08 + R() * 0.15;
    const side = i < 6 ? -1 : 1;
    const inset0 = 0.2 + R() * 0.5;
    const wob = [];
    for (let k = 0; k <= 8; k++) wob.push((R() - 0.5) * 0.2);
    SURFACE.push({ s0, len, side, inset0, wob, w: 0.6 + R() * 0.5, br: R() > .5 ? 0.4 + R() * .4 : 0 });
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
    return { pts, w: v.w, br: v.br, s0: v.s0, len: v.len, side: v.side, swell };
  });
}
function drawSurface(ctx, swell, px, cong) {
  const col = css(mix3([178, 134, 128], [214, 66, 56], cong));
  surfaceAt(swell).forEach((v, i) => {
    const show = i < 4 ? 0.22 + 0.5 * cong : cong * 0.9;
    inkStroke(ctx, 'g.sv' + i, 'curve', [v.pts], { stroke: col, strokeWidth: (v.w * (0.72 + 0.5 * cong)) * px, roughness: .58, bowing: .3, seed: 220 + i }, show * 0.75);
    if (v.br) {
      const p = v.pts[4], f = frameAt(v.s0 + v.len * .5), w = tubeRadius(v.s0 + v.len * .5, swell);
      const q = [p[0] + f.tx * 14 + f.nx * w * .08 * v.side, p[1] + f.ty * 14 + f.ny * w * .08 * v.side];
      inkStroke(ctx, 'g.svb' + i, 'curve', [[p, q]], { stroke: col, strokeWidth: .6 * px, roughness: .5, seed: 260 + i }, cong * smooth(cong / .5) * 0.45);
    }
  });
}

function inkStroke(ctx, key, kind, args, o, alpha) {
  if (alpha <= 0.01) return;
  // fill:false — rough's toPaths sets fill to the string 'none', which is truthy, so ink.js
  // would fill the path with whatever fillStyle is current (the paper). An open curve then
  // closes and paints a paper ribbon across the fat.
  inkDraw(ctx, shape(key, kind, args, { boil: false, ...o }, true), { alpha, fill: false });
}

function drawTubeInk(ctx, swell, px, alpha, dent) {
  const wall = tubeOutline(swell, dent);
  const closed = wall.concat([wall[0]]);
  inkStroke(ctx, 'g.wall', 'linearPath', [closed], { strokeWidth: 2.5 * px, roughness: .92, bowing: .82, seed: 81 }, alpha);
  inkStroke(ctx, 'g.wall2', 'linearPath', [closed], { strokeWidth: 1.15 * px, roughness: 1.18, bowing: 1.0, seed: 97 }, alpha * 0.45);
}

export function drawAppendix(ctx, state, pose, { alpha = 1 } = {}) {
  const stage = asStage(state);
  const swell = swellAt(stage);
  const dent = dentAt(stage);
  const base = knot(stage, LOOK.map(L => L.base));
  const look = {
    base,
    shadow: knot(stage, LOOK.map(L => L.shadow)),
    gloss: mix3(base, knot(stage, LOOK.map(L => L.gloss)), knot(stage, GLOSS_FADE)),
  };
  const cong = ramp(stage, 0, 1);
  const pusA = ramp(stage, 1, 2);
  const necA = ramp(stage, 2, 3);
  const bleedA = ramp(stage, 1.9, 2.75);
  const glossA = knot(stage, GLOSS_A);
  const px = 1 / pose.sc;

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = 'source-over';
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.rot);
  ctx.scale(pose.sc, pose.sc);

  // Mesentery first; the tube covers the attachment seam.
  ctx.save();
  path(ctx, mesoLoop(swell)); ctx.clip();
  paintMesoBase(ctx, swell);
  paintFatCells(ctx, swell);
  paintVessels(ctx, swell, cong);
  // A few fat clumps sit in front of the vessels so the branching dives into the fat.
  paintFatCells(ctx, swell, true);
  // Pigment grain over the pale dabs, otherwise the sprites read as airbrush.
  drawPinned(ctx, 'g.fat', 40, 10, 900, { alpha: .16, blend: 'multiply' });
  paintMesoTint(ctx, swell, cong);
  ctx.restore();
  drawMesoInk(ctx, swell, px);

  // Tube.
  paintCylinder(ctx, swell, look, dent);
  ctx.save();
  path(ctx, tubeOutline(swell, dent)); ctx.clip();
  // Mottled serosa: the baked washes give the flat gradient some watercolour grain.
  drawPinned(ctx, 'g.pink', 0, 0, 1024, { alpha: (1 - cong) * 0.28, blend: 'multiply' });
  drawPinned(ctx, 'g.pink', 70, 26, 760, { alpha: (1 - cong) * 0.14, blend: 'multiply' });
  drawPinned(ctx, 'g.red', 0, 0, 1024, { alpha: cong * 0.38, blend: 'multiply' });
  drawPinned(ctx, 'g.grain', -20, -60, 1200, { alpha: .15, blend: 'multiply' });
  paintSerosalTooth(ctx, swell, cong);
  drawSurface(ctx, swell, px, cong);
  ctx.save();
  ctx.filter = 'blur(1.2px)';
  paintBleeds(ctx, swell, bleedA);
  ctx.restore();
  paintPus(ctx, swell, pusA, necA);
  ctx.save();
  ctx.filter = 'blur(1.6px)';
  paintNecro(ctx, swell, necA);
  ctx.restore();
  if (necA > .01) paintPus(ctx, swell, pusA * necA, necA, true);
  paintNecroDamage(ctx, swell, necA);
  paintPit(ctx, swell, necA);
  paintCut(ctx, swell, look);
  paintGloss(ctx, swell, glossA, px);
  ctx.restore();

  drawTubeInk(ctx, swell, px, 1, dent);
  ctx.restore();
}

const NOTES = {
  normal: [
    { s: 0.42, side: -1, d: 8, label: '浆膜光泽', dir: 'up', shelf: 'right' },
    { s: 0.36, extra: 0.62, label: '阑尾系膜', dir: 'down', shelf: 'left' },
    { s: 0.16, extra: 0.45, label: '系膜血管细', dir: 'down', shelf: 'left' },
  ],
  red: [
    { s: 0.28, side: -1, d: 8, label: '朱红充血', dir: 'up', col: C.red, shelf: 'right' },
    { s: 0.62, side: -1, d: 8, label: '表面血管扩张', dir: 'up', shelf: 'right' },
    { s: 0.22, extra: 0.7, label: '肿胀增粗', dir: 'down', shelf: 'left' },
  ],
  yellow: [
    { s: 0.4, side: -1, d: 8, label: '灰黄色脓苔', dir: 'up', shelf: 'right', lift: 48 },
    { s: 0.64, side: -1, d: 8, label: '斑驳、片状', dir: 'up', shelf: 'left' },
    { s: 0.24, extra: 0.62, label: '肿胀最粗、张力大', dir: 'down', shelf: 'left' },
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
    A.label(ctx, n.label, right ? rx : qx + 6, qy - 16, { size: 26, w: 700, col: '#85718F', halo: true, align: right ? 'right' : 'left' });
  });
}

export function drawTitle(ctx, state, { x = 96, y = 120 } = {}) {
  const m = META[noteKey(state)];
  ctx.save(); ctx.fillStyle = m.tone; ctx.fillRect(x, y + 8, 64, 5); ctx.restore();
  A.label(ctx, '大体标本 画风样张', x, y - 36, { size: 22, w: 500, alpha: .55 });
  A.label(ctx, m.diag, x, y + 52, { size: 48, w: 800, col: m.tone });
  A.label(ctx, m.sub, x, y + 104, { size: 26, w: 500, alpha: .78 });
}
