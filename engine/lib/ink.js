// Rough.js ink — STRUCTURE layer. Shapes are generated once with a fixed seed and cached as Path2D,
// so they never shimmer; "drawing on" is done with a dash reveal, not by regenerating.
const gen = rough.generator();
const cache = new Map();
import { C } from './tokens.js';
const base = o => Object.assign({ stroke: C.ink, strokeWidth: 2.6, roughness: .9, bowing: .8, seed: 3 }, o);
function polyLen(pts, closed) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i-1][0], pts[i][1] - pts[i-1][1]); if (closed) L += Math.hypot(pts[0][0]-pts.at(-1)[0], pts[0][1]-pts.at(-1)[1]); return L; }
function build(kind, args, o) {
  const d = gen[kind](...args, o), paths = gen.toPaths(d).map(p => ({ p: new Path2D(p.d), stroke: p.stroke, w: p.strokeWidth, fill: p.fill }));
  let len = 1000; const pts = kind === 'linearPath' || kind === 'curve' ? args[0] : kind === 'polygon' ? args[0] : null;
  if (pts) len = polyLen(pts, kind === 'polygon') * 1.15; else if (kind === 'ellipse') len = Math.PI * (args[2] + args[3]) * .6; else if (kind === 'circle') len = Math.PI * args[2] * 1.1;
  return { paths, len };
}
// key: unique stable name. If geometry changes per frame (morph), pass dynamic=true (seed stays fixed so it morphs smoothly).
// BOIL (hand-drawn life): main.js calls setBoil(floor(t*8)); every cached shape cycles through 3 fixed-seed variants
// at 8 fps. Deterministic (depends only on t). Opt out per shape with roughOpts.boil = false, or globally with setBoil(null).
let BOIL = null; export const BOIL_FPS = 10, BOIL_VARIANTS = 3;
export function setBoil(frame) { BOIL = frame == null ? null : ((frame % BOIL_VARIANTS) + BOIL_VARIANTS) % BOIL_VARIANTS; }
export function shape(key, kind, args, o = {}, dynamic = false) {
  const v = (BOIL == null || o.boil === false) ? 0 : BOIL, ck = v ? key + '#' + v : key;
  if (!dynamic && cache.has(ck)) return cache.get(ck);
  const oo = base(o); if (v) oo.seed = (oo.seed || 1) * 31 + v * 7919; delete oo.boil;
  const s = build(kind, args, oo); if (!dynamic) cache.set(ck, s); return s;
}
// draw with optional reveal k∈[0,1] (pen draws on) and alpha
export function draw(ctx, s, { k = 1, alpha = 1, fill = true } = {}) {
  if (k <= 0 || alpha <= 0) return; ctx.save(); ctx.globalAlpha *= alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const q of s.paths) {
    if (q.fill && fill && k >= 1) { ctx.fillStyle = q.fill; ctx.fill(q.p); }
    if (q.stroke && q.stroke !== 'none') { ctx.strokeStyle = q.stroke; ctx.lineWidth = q.w;
      if (k < 1) { ctx.setLineDash([s.len * k, s.len * 2]); } else ctx.setLineDash([]);
      if (!(q.fill && !q.stroke)) ctx.stroke(q.p); }
  }
  ctx.restore();
}
export const ink = (ctx, key, kind, args, o, opt) => draw(ctx, shape(key, kind, args, o), opt);
export function grid(ctx, x0, y0, x1, y1, step = 40) { ctx.save(); ctx.strokeStyle = C.grid; ctx.lineWidth = 1 / Math.max(1e-3, ctx.getTransform().a);
  ctx.beginPath(); for (let x = Math.floor(x0 / step) * step; x <= x1; x += step) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
  for (let y = Math.floor(y0 / step) * step; y <= y1; y += step) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); } ctx.stroke(); ctx.restore(); }
