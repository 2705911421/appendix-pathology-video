// detail: opt-in ink weight and shadow for the figure. Pure in t — geometry is memoised by key and boil variant.
import { C } from './tokens.js';
import { ink, boilIndex } from './ink.js';
import { hash } from './motion.js';

const paths = new Map();

function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h | 0;
}
function lerp2(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
// detail: uniform Catmull-Rom through p1→p2. End controls are duplicated by smooth(), so the tips leave along the first/last segment.
function cr(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return [
    0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
  ];
}
function smooth(pts, step) {
  if (pts.length < 3) {
    const a = pts[0], b = pts[pts.length - 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(d / step)), out = [];
    for (let i = 0; i <= n; i++) out.push(lerp2(a, b, i / n));
    return out;
  }
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let s = 0; s < n; s++) out.push(cr(p0, p1, p2, p3, s / n));
  }
  out.push(pts[pts.length - 1]);
  return out;
}
// detail: fixed-seed ±0.6 px per boil variant so the ribbon shifts like a Rough line.
function jitterPts(pts, key, seed, variant) {
  const s = (strHash(key) ^ Math.imul(seed | 0, 0x45d9f3b) ^ Math.imul((variant + 1) | 0, 0x27d4eb2d)) | 0;
  return pts.map((p, i) => [(hash(i * 2 + 1, s) - 0.5) * 1.2 + p[0], (hash(i * 2 + 2, s) - 0.5) * 1.2 + p[1]]);
}
function endTaper(u, taper) {
  const e = Math.min(u, 1 - u);
  if (!(taper > 1e-4)) return 1;
  const k = Math.min(1, e / taper), s = k * k * (3 - 2 * k);
  return 0.3 + 0.7 * s;
}
// detail: filled ribbon. w0→w1 along the stroke; both tips fall to ~0.3×; convex side swells.
function ribbon(samples, w0, w1, taper) {
  const n = samples.length, acc = new Array(n);
  acc[0] = 0;
  for (let i = 1; i < n; i++) acc[i] = acc[i - 1] + Math.hypot(samples[i][0] - samples[i - 1][0], samples[i][1] - samples[i - 1][1]);
  const total = acc[n - 1] || 1, left = [], right = [];
  for (let i = 0; i < n; i++) {
    const u = acc[i] / total, im = Math.max(0, i - 1), ip = Math.min(n - 1, i + 1);
    let dx = samples[ip][0] - samples[im][0], dy = samples[ip][1] - samples[im][1];
    const ln = Math.hypot(dx, dy) || 1;
    dx /= ln; dy /= ln;
    let k = 0;
    if (i > 0 && i < n - 1) {
      const ax = samples[i][0] - samples[i - 1][0], ay = samples[i][1] - samples[i - 1][1];
      const bx = samples[i + 1][0] - samples[i][0], by = samples[i + 1][1] - samples[i][1];
      const la = Math.hypot(ax, ay) || 1, lb = Math.hypot(bx, by) || 1;
      k = Math.atan2((ax / la) * (by / lb) - (ay / la) * (bx / lb), (ax / la) * (bx / lb) + (ay / la) * (by / lb)) / ((la + lb) * 0.5);
    }
    const tw = (w0 + (w1 - w0) * u) * endTaper(u, taper);
    const swell = Math.min(Math.abs(tw) * 0.9, Math.abs(k) * 18);
    let hwL = tw * 0.5, hwR = tw * 0.5;
    if (k >= 0) hwR += swell; else hwL += swell;
    const nx = -dy, ny = dx, p = samples[i];
    left.push([p[0] + nx * hwL, p[1] + ny * hwL]);
    right.push([p[0] - nx * hwR, p[1] - ny * hwR]);
  }
  return left.concat(right.reverse());
}
function toPath(poly) {
  const path = new Path2D();
  poly.forEach((p, i) => i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1]));
  path.closePath();
  return path;
}
export function weighted(ctx, key, pts, { w0 = 3.2, w1 = 1.4, taper = .25, col = C.ink, seed = 1, alpha = 1 } = {}) {
  if (alpha <= 0 || !pts || pts.length < 2) return;
  const variant = boilIndex() == null ? 0 : boilIndex();
  const ck = key + '#' + variant;
  let path = paths.get(ck);
  if (!path) {
    const samples = smooth(jitterPts(pts, key, seed, variant), 8);
    const poly = samples.length > 1 ? ribbon(samples, w0, w1, taper) : [];
    if (poly.length < 3 || poly.some(p => !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) return;
    path = toPath(poly);
    paths.set(ck, path);
  }
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = col; ctx.fill(path); ctx.restore();
}

export function hatch(ctx, key, poly, { angle = -50, gap = 7, w = 1.1, alpha = .35, col = C.ink, seed = 1, cross = false } = {}) {
  if (alpha <= 0 || !poly || poly.length < 3 || poly.some(p => !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) return;
  // detail: Rough hachure (stroke none) so the shadow boils with the rest of the ink.
  ink(ctx, key, 'polygon', [poly], {
    fill: col, fillStyle: cross ? 'cross-hatch' : 'hachure', hachureAngle: angle, hachureGap: gap, fillWeight: w, stroke: 'none', seed,
  }, { alpha });
}

// detail: Sutherland–Hodgman against nx·p >= d. Half-planes are convex, so a concave shirt still clips.
function clipHalf(poly, nx, ny, d) {
  const inside = p => nx * p[0] + ny * p[1] >= d - 1e-6;
  const hit = (a, b) => {
    const da = nx * a[0] + ny * a[1] - d, db = nx * b[0] + ny * b[1] - d, t = da / (da - db || 1e-9);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ia = inside(a), ib = inside(b);
    if (ia && ib) out.push(b);
    else if (ia && !ib) out.push(hit(a, b));
    else if (!ia && ib) { out.push(hit(a, b)); out.push(b); }
  }
  const dedup = [];
  for (const p of out) {
    const q = dedup[dedup.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.04) dedup.push(p);
  }
  if (dedup.length > 2 && Math.hypot(dedup[0][0] - dedup[dedup.length - 1][0], dedup[0][1] - dedup[dedup.length - 1][1]) < 0.04) dedup.pop();
  return dedup;
}
function shadowBand(poly, light, frac) {
  let lx = light[0], ly = light[1];
  const L = Math.hypot(lx, ly) || 1;
  lx /= L; ly /= L;
  let sMin = Infinity, sMax = -Infinity;
  for (const p of poly) {
    const s = p[0] * lx + p[1] * ly;
    if (s < sMin) sMin = s;
    if (s > sMax) sMax = s;
  }
  const span = sMax - sMin;
  if (!(span > 1e-3)) return poly.map(p => [p[0], p[1]]);
  // detail: smallest projection is the side away from the light; keep that frac of the extent.
  const limit = sMin + span * frac;
  return clipHalf(poly, -lx, -ly, -limit);
}
export function shadeSide(ctx, key, poly, opts = {}) {
  const light = opts.light || [-1, -1], frac = opts.frac == null ? .35 : opts.frac;
  if (!poly || poly.length < 3 || frac <= 0) return;
  const clipped = shadowBand(poly, light, frac);
  if (clipped.length < 3) return;
  const { light: _l, frac: _f, ...rest } = opts;
  hatch(ctx, key, clipped, rest);
}
