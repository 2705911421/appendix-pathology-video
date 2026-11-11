// HE-stained appendix wall field (shared by 03 → 04 continuity). Field LOCAL coords: ±420 square, lumen at top, serosa at bottom.
// drawHE(ctx, state) draws into current transform (caller translates to lens centre, scales by r/420 and clips) — or use drawLens().
// state: { ulcer 0..1, neut 0..1 (share of infiltrating neutrophils arrived), fibrin 0..1, t (seconds, micro-motion) }
// v2 (polish pass): organic clustered cells (~1300), margination → emigration paths, 2–5 lobed nuclei, noisy structures.
//                  API unchanged; drawLens/fieldToScreen gained optional extras (off, blur) — old calls behave as before.
import { chromatin, detailedNeutrophil, fibrinMesh, tissueTexture } from './he_detail.js';
import { C } from './tokens.js';
import { drawWash } from './wash.js';
import { rng, noise2, hash } from './motion.js';
export const HE = { eosin: '#D98BA8', eosinPale: '#EBC3D0', hema: C.vio, hemaDark: '#3F2A66', rbc: '#C9455A' };
export const BANDS = { lumen: [-420, -290], mucosa: [-290, -150], submucosa: [-150, -10], muscularis: [-10, 230], serosa: [230, 280], fibrin: [280, 420] };
export const ULCER = [-90, 110];
export const VESSELS = [[-270, -80, 26], [-90, -60, 20], [130, -90, 24], [300, -70, 18], [-170, 120, 14], [220, 150, 13]];
const R = rng(2026);
const inUlcer = x => x > ULCER[0] && x < ULCER[1];
const gauss = () => (R() + R() + R() - 1.5) / 1.5;
const lobePick = () => { const u = R(); return u < .15 ? 2 : u < .6 ? 3 : u < .9 ? 4 : 5; };   // 核分 2–5 叶
const bandOf = y => Object.keys(BANDS).find(k => y >= BANDS[k][0] && y < BANDS[k][1]) || 'fibrin';
// noisy closed outline (hand-drawn, never a perfect circle/ellipse)
function blobPath(ctx, cx, cy, rx, ry, seed, amp = .12, n = 22) { ctx.beginPath(); for (let i = 0; i <= n; i++) { const a = i / n * 6.283, f = 1 + amp * (noise2(Math.cos(a) * 1.3 + seed, Math.sin(a) * 1.3 + seed * .7) - .5) * 2; const x = cx + Math.cos(a) * rx * f, y = cy + Math.sin(a) * ry * f; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); }
// --- static cell populations (fixed seed) ---
export const CELLS = (() => { const out = [];
  // lumen pus: clumped sheets of neutrophils (already present)
  for (let c = 0; c < 14; c++) { const cx = -400 + R() * 800, cy = -400 + R() * 100, n = 8 + Math.floor(R() * 12);
    for (let i = 0; i < n; i++) out.push({ x: cx + gauss() * 45, y: Math.min(-296, cy + gauss() * 30), band: 'lumen', kind: 'pus', lobes: lobePick(), rot: R() * 6.28, sz: .85 + R() * .3 }); }
  // infiltrating: rejection sampling on density (gradient toward mucosa/ulcer) × clumping noise
  const dens = (x, y) => { const b = bandOf(y); let d = { mucosa: 1, submucosa: .75, muscularis: .5, serosa: .65, fibrin: .55, lumen: 0 }[b];
    d += 1.1 * Math.exp(-(((x - 10) / 130) ** 2 + ((y + 270) / 90) ** 2)); if (b === 'fibrin' && y > 400) d = 0; return d * (.25 + .75 * noise2(x / 55 + 9, y / 55 + 3)); };
  let guard = 0; while (out.filter(c => c.kind === 'inf').length < 1150 && guard++ < 60000) { const x = -412 + R() * 824, y = -292 + R() * 700; if (R() * 1.9 < dens(x, y)) out.push({ x, y, band: bandOf(y), kind: 'inf', lobes: lobePick(), rot: R() * 6.28, sz: .8 + R() * .35 }); }
  let maxD = 1;
  for (const c of out) if (c.kind === 'inf') { let best = VESSELS[0], d = 1e9; for (const v of VESSELS) { const dd = Math.hypot(c.x - v[0], c.y - v[1]); if (dd < d) { d = dd; best = v; } }
    const a = Math.atan2(c.y - best[1], c.x - best[0]); c.vx = best[0]; c.vy = best[1]; c.d = d; maxD = Math.max(maxD, d);
    c.mx = best[0] + Math.cos(a + gauss() * .6) * best[2] * .95; c.my = best[1] + Math.sin(a + gauss() * .6) * best[2] * .95;   // margination point on the vessel wall
    c.cx = (c.mx + c.x) / 2 + gauss() * 50; c.cy = (c.my + c.y) / 2 + gauss() * 50; }                                        // curved emigration path
  for (const c of out) if (c.kind === 'inf') c.order = Math.min(.999, (c.d / maxD) * .72 + R() * .28);
  return out; })();
const SPINDLE = Array.from({ length: 170 }, () => ({ x: -410 + R() * 820, y: -10 + R() * 240, r: (R() - .5) * .3, l: 10 + R() * 9 }));
const CRYPTS = []; for (let x = -390; x < 410; x += 58 + R() * 12) CRYPTS.push({ x: x + (R() - .5) * 14, y: -225 + (R() - .5) * 24, h: 40 + R() * 18, w: 13 + R() * 5, s: R() * 50, tilt: (R() - .5) * .25 });
const FIBRIN = Array.from({ length: 60 }, () => { const x = -400 + R() * 800, y = 284 + R() * 100; return { x, y, a: (R() - .5) * 1.6 + (R() < .5 ? 0 : Math.PI), l: 30 + R() * 60, b: (R() - .5) * 40 }; });
export function bakeHE(bake) {
  bake('he.bands', (b, P) => { const band = (y0, y1, col, a) => { const pts = []; for (let x = -520; x <= 520; x += 65) pts.push([x, y0 + Math.sin(x * .013) * 9]); for (let x = 520; x >= -520; x -= 65) pts.push([x, y1 + Math.sin(x * .011 + 1) * 9]); P.fill(b, pts, col, a, .14, [.5, .55]); };
    band(-420, -290, HE.eosinPale, 90); band(-290, -150, HE.eosin, 110); band(-150, -10, HE.eosinPale, 120); band(-10, 230, HE.eosin, 150); band(230, 282, HE.eosinPale, 120); }, { seed: 31, scale: 2 });
  bake('he.ulcer', (b, P) => { P.fill(b, P.blob(0, 0, 150, 24, .4, 3), HE.eosinPale, 160, .3); P.fill(b, P.blob(0, 10, 90, 20, .5, 4), HE.hema, 40, .3); }, { seed: 32 });
  bake('he.fibrin', (b, P) => { P.fill(b, [[-520, -60], [-300, -30], [-100, -70], [120, -40], [330, -75], [520, -45], [520, 70], [200, 40], [-200, 60], [-520, 50]], HE.eosin, 120, .4, [.6, .6]); }, { seed: 33 });
  bake('he.vessel', (b, P) => { P.fill(b, P.blob(0, 0, 300, 22, .3, 5), HE.rbc, 170, .2); }, { seed: 34 });
}
// 0 in preserved wall, 1 in the necrotic core around thrombosed vessels and the tear (x=190).
function coreAt(x, y) {
  const ty = y < -320 ? -320 : y > 330 ? 330 : y;
  let d = Math.hypot((x - 190) * .78, (y - ty) * .5);
  for (const v of VESSELS) { const dd = Math.hypot(x - v[0], y - v[1]); if (dd < d) d = dd; }
  const u = Math.max(0, Math.min(1, (d - 46) / 188));
  return 1 - u * u * (3 - 2 * u);
}
// Crisp 1px seams in the shared band wash. Lifted only while necrosis is on.
// Reads the baked composite (respects whatever is already drawn) and replaces a row
// only where it is a thin darker line than the tissue just above and below it.
export function fadeSeams(ctx, necrosis, lens, off, fs) {
  const a = Math.max(0, Math.min(1, necrosis));
  if (a <= 0 || !lens || !(fs > 0)) return;
  const m = ctx.getTransform();
  const c = m.transformPoint(new DOMPoint(off[0], off[1]));
  const e = m.transformPoint(new DOMPoint(off[0] + 420 / fs, off[1]));
  const rad = Math.hypot(e.x - c.x, e.y - c.y);
  const inset = rad - 8;
  if (!(inset > 12)) return;
  const cvs = ctx.canvas;
  const x0 = Math.max(0, Math.floor(c.x - inset));
  const y0 = Math.max(0, Math.floor(c.y - inset));
  const x1 = Math.min(cvs.width, Math.ceil(c.x + inset));
  const y1 = Math.min(cvs.height, Math.ceil(c.y + inset));
  const w = x1 - x0, h = y1 - y0;
  if (w < 8 || h < 8) return;
  const img = ctx.getImageData(x0, y0, w, h);
  const src = new Uint8ClampedArray(img.data);
  const d = img.data;
  const luma = (row, col) => {
    const i = (row * w + col) * 4;
    return src[i] * .299 + src[i + 1] * .587 + src[i + 2] * .114;
  };
  const inside = (col, row) => {
    const dx = x0 + col - c.x, dy = y0 + row - c.y;
    return dx * dx + dy * dy < inset * inset;
  };
  const dipAt = (row, col) => {
    if (!inside(col, row) || !inside(col, row - 2) || !inside(col, row + 2)) return false;
    const up = luma(row - 2, col), dn = luma(row + 2, col), mid = luma(row, col);
    return Math.abs(up - dn) < 28 && mid <= Math.min(up, dn) - 7;
  };
  const rows = [];
  for (let row = 2; row < h - 2; row++) {
    let chord = 0, dips = 0;
    for (let col = 0; col < w; col++) { if (!inside(col, row)) continue; chord++; if (dipAt(row, col)) dips++; }
    if (dips >= 64 && dips > chord * .30) rows.push(row);
  }
  if (!rows.length) return;
  // The seam is often 2–3 px thick. The darkest row matches ±2; the shoulder
  // still holds the line, so lift it from a sample just outside the trough.
  const lift = (rt, col, dist, th) => {
    if (rt - dist < 0 || rt + dist >= h) return false;
    if (!inside(col, rt) || !inside(col, rt - dist) || !inside(col, rt + dist)) return false;
    const up = luma(rt - dist, col), dn = luma(rt + dist, col), mid = luma(rt, col);
    return Math.abs(up - dn) < 34 && mid <= Math.min(up, dn) - th;
  };
  const paint = (rt, col, dist) => {
    const i = (rt * w + col) * 4;
    const iu = ((rt - dist) * w + col) * 4, idn = ((rt + dist) * w + col) * 4;
    for (let ch = 0; ch < 3; ch++) d[i + ch] = Math.round(src[i + ch] * (1 - a) + (src[iu + ch] + src[idn + ch]) * .5 * a);
  };
  const changed = [];
  const mark = rt => {
    let run = -1;
    for (let col = 0; col <= w; col++) {
      const hit = col < w && d[(rt * w + col) * 4] !== src[(rt * w + col) * 4];
      if (hit && run < 0) run = col;
      if (!hit && run >= 0) { changed.push([rt, run, col]); run = -1; }
    }
  };
  for (const row of rows) {
    for (let col = 0; col < w; col++) if (dipAt(row, col)) paint(row, col, 2);
    mark(row);
    for (const rt of [row - 1, row + 1]) {
      if (rt < 3 || rt >= h - 3) continue;
      for (let col = 0; col < w; col++) if (lift(rt, col, 3, 4)) paint(rt, col, 3);
      mark(rt);
    }
  }
  for (const [row, xA, xB] of changed) {
    const rw = xB - xA, strip = ctx.createImageData(rw, 1);
    strip.data.set(d.subarray((row * w + xA) * 4, (row * w + xB) * 4));
    ctx.putImageData(strip, x0 + xA, y0 + row);
  }
}
function edgeAt(x, y, ox, oy, vr) {
  const d = Math.hypot(x - ox, y - oy), u = Math.max(0, Math.min(1, (d - vr * .36) / (vr * .52)));
  return u * u * (3 - 2 * u);
}
// Faint ghost outlines away from the core; fully gone inside it. Lens-edge tissue stays a little clearer.
function structAlpha(x, y, necrosis, ox, oy, vr) {
  return (1 - necrosis) + necrosis * (1 - coreAt(x, y)) * (.26 + .22 * edgeAt(x, y, ox, oy, vr));
}
function neutro(ctx, x, y, c, s = 1) { s *= c.sz || 1;
  ctx.fillStyle = 'rgba(236,178,198,.85)'; blobPath(ctx, x, y, 8.5 * s, 8 * s, c.rot * 3, .12, 10); ctx.fill();
  ctx.fillStyle = HE.hemaDark; const n = c.lobes, sp = n === 2 ? 1.6 : 1.15; const P = [];
  for (let i = 0; i < n; i++) { const a = c.rot + (i - (n - 1) / 2) * sp, rr = (n === 2 ? 3.6 : 4.6) * s; P.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  ctx.beginPath(); for (const p of P) { ctx.moveTo(p[0] + 2.9 * s, p[1]); ctx.arc(p[0], p[1], (n === 2 ? 3.3 : 2.9) * s, 0, 6.283); } ctx.fill();
  ctx.strokeStyle = HE.hemaDark; ctx.lineWidth = 1.1 * s; ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.stroke(); }
export { neutro as drawNeutrophil };
const bez = (a, c, b, k) => { const u = 1 - k; return [u * u * a[0] + 2 * u * k * c[0] + k * k * b[0], u * u * a[1] + 2 * u * k * c[1] + k * k * b[1]]; };
// detail = 0 and necrosis = 0 must issue the original v2d canvas calls, in order, with no extra save/restore.
function drawHEPlain(ctx, ulcer, neut, fibrin, t) {
  ctx.fillStyle = '#F6EEF0'; ctx.fillRect(-430, -430, 860, 900);
  drawWash(ctx, 'he.bands', 0, 0, 1024);
  drawWash(ctx, 'he.fibrin', 0, 330, 1024, { grow: fibrin, alpha: fibrin, origin: [.5, .3] });
  for (const g of CRYPTS) { const k = inUlcer(g.x) ? 1 - ulcer : 1; if (k <= .02) continue; ctx.save(); ctx.globalAlpha *= k; ctx.translate(g.x, g.y); ctx.rotate(g.tilt);
    ctx.fillStyle = 'rgba(255,248,250,.9)'; blobPath(ctx, 0, 0, g.w, g.h, g.s, .18); ctx.fill();
    ctx.fillStyle = HE.hema; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, j = 1 + .15 * (noise2(i, g.s) - .5); ctx.beginPath(); ctx.ellipse(Math.cos(a) * (g.w + 4) * j, Math.sin(a) * (g.h + 4) * j, 3, 4.4, a, 0, 6.283); ctx.fill(); } ctx.restore(); }
  ctx.strokeStyle = HE.hema; ctx.lineWidth = 7; ctx.lineCap = 'round'; const gap0 = ULCER[0] + 100 * (1 - ulcer), gap1 = ULCER[1] - 100 * (1 - ulcer);
  const epi = (x0, x1) => { ctx.beginPath(); for (let x = x0; x <= x1; x += 10) { const y = -290 + 5 * Math.sin(x * .05) + 4 * (noise2(x / 40, 2) - .5); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); };
  epi(-430, gap0); epi(gap1, 430);
  drawWash(ctx, 'he.ulcer', (ULCER[0] + ULCER[1]) / 2, -265, 330, { grow: ulcer, alpha: ulcer });
  VESSELS.forEach((v, i) => { drawWash(ctx, 'he.vessel', v[0], v[1], v[2] * 3.6); ctx.strokeStyle = HE.hema; ctx.lineWidth = 2.2; blobPath(ctx, v[0], v[1], v[2] * 1.1, v[2] * .85, i * 3.1, .16); ctx.stroke(); });
  ctx.fillStyle = 'rgba(80,52,120,.75)'; for (const m of SPINDLE) { ctx.beginPath(); ctx.ellipse(m.x, m.y, m.l, 2.4, m.r, 0, 6.283); ctx.fill(); }
  ctx.strokeStyle = 'rgba(206,110,145,.95)'; ctx.lineWidth = 2.4; for (let i = 0; i < FIBRIN.length; i++) { const f = FIBRIN[i], k = Math.min(1, Math.max(0, fibrin * 1.6 - i / FIBRIN.length * .6)); if (k <= 0) continue;
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo(f.x + Math.cos(f.a) * f.l * .5 * k, f.y + Math.sin(f.a) * f.l * .5 * k + f.b * k, f.x + Math.cos(f.a) * f.l * k, f.y + Math.sin(f.a) * f.l * k + 10 * k); ctx.stroke(); }
  for (const c of CELLS) { let x = c.x, y = c.y, s = 1;
    if (c.kind === 'inf') { const k = Math.min(1, Math.max(0, (neut * 1.3 - c.order) / .3)); if (k <= 0) continue;
      if (k < .25) { const q = k / .25; x = c.vx + (c.mx - c.vx) * q; y = c.vy + (c.my - c.vy) * q; s = .6; }
      else { const q = (k - .25) / .75, e = 1 - Math.pow(1 - q, 2.2); [x, y] = bez([c.mx, c.my], [c.cx, c.cy], [c.x, c.y], e); s = .6 + .4 * Math.min(1, q * 2); } }
    x += Math.sin(t * 1.3 + c.rot * 5) * 1.3; y += Math.cos(t * 1.1 + c.rot * 3) * .9; neutro(ctx, x, y, c, s); }
}
export function drawHE(ctx, { ulcer = 1, neut = 1, fibrin = 1, t = 0, detail = 0, necrosis = 0, ox = 0, oy = 0, vr = 420 } = {}) {
  if (!(detail > 0) && !(necrosis > 0)) { drawHEPlain(ctx, ulcer, neut, fibrin, t); return; }
  ctx.fillStyle = '#F6EEF0'; ctx.fillRect(-430, -430, 860, 900);
  if (necrosis > 0) { ctx.save(); ctx.globalAlpha *= 1 - necrosis * .36; }
  drawWash(ctx, 'he.bands', 0, 0, 1024);
  if (necrosis > 0) ctx.restore();
  if (necrosis > 0) { ctx.save(); ctx.globalAlpha *= 1 - necrosis * .22; }
  drawWash(ctx, 'he.fibrin', 0, 330, 1024, { grow: fibrin, alpha: fibrin, origin: [.5, .3] });
  if (necrosis > 0) ctx.restore();
  if (detail) tissueTexture(ctx, detail * (necrosis > 0 ? 1 - necrosis * .78 : 1));
  // crypts — irregular, destroyed inside the ulcer. Necrotic core dissolves them; the rim keeps a ghost.
  for (const g of CRYPTS) { const k = inUlcer(g.x) ? 1 - ulcer : 1; if (k <= .02) continue; ctx.save(); ctx.globalAlpha *= k;
    if (necrosis > 0) ctx.globalAlpha *= structAlpha(g.x, g.y, necrosis, ox, oy, vr);
    ctx.translate(g.x, g.y); ctx.rotate(g.tilt);
    ctx.fillStyle = 'rgba(255,248,250,.9)'; blobPath(ctx, 0, 0, g.w, g.h, g.s, .18); ctx.fill();
    ctx.fillStyle = HE.hema; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, j = 1 + .15 * (noise2(i, g.s) - .5); ctx.beginPath(); ctx.ellipse(Math.cos(a) * (g.w + 4) * j, Math.sin(a) * (g.h + 4) * j, 3, 4.4, a, 0, 6.283); ctx.fill(); if(detail) { ctx.save(); ctx.globalAlpha *= detail; chromatin(ctx,Math.cos(a)*(g.w+4)*j,Math.sin(a)*(g.h+4)*j,3,4.4,a);ctx.restore(); } } ctx.restore(); }
  // surface epithelium (wavy) with ulcer gap
  ctx.strokeStyle = HE.hema; ctx.lineWidth = 7; ctx.lineCap = 'round'; const gap0 = ULCER[0] + 100 * (1 - ulcer), gap1 = ULCER[1] - 100 * (1 - ulcer);
  const yEpi = x => -290 + 5 * Math.sin(x * .05) + 4 * (noise2(x / 40, 2) - .5);
  if (necrosis <= 0) {
    const epi = (x0, x1) => { ctx.beginPath(); for (let x = x0; x <= x1; x += 10) { const y = yEpi(x); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); };
    epi(-430, gap0); epi(gap1, 430);
  } else {
    const epi = (x0, x1) => { for (let x = x0; x < x1; x += 16) { const x2 = Math.min(x1, x + 16), a = structAlpha((x + x2) / 2, -290, necrosis, ox, oy, vr); if (a < .03) continue;
      ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); for (let xx = x; xx <= x2 + .01; xx += 8) { const xk = Math.min(xx, x2), y = yEpi(xk); xx === x ? ctx.moveTo(xk, y) : ctx.lineTo(xk, y); } ctx.stroke(); ctx.restore(); } };
    epi(-430, gap0); epi(gap1, 430);
  }
  drawWash(ctx, 'he.ulcer', (ULCER[0] + ULCER[1]) / 2, -265, 330, { grow: ulcer, alpha: ulcer * (necrosis > 0 ? 1 - necrosis * .75 : 1) });
  // Old congested disc fades; the layered thrombus and wall are drawn on top in the gangrene plate.
  if (necrosis > 0) { ctx.save(); ctx.globalAlpha *= 1 - necrosis * .86; }
  VESSELS.forEach((v, i) => { drawWash(ctx, 'he.vessel', v[0], v[1], v[2] * 3.6); ctx.strokeStyle = HE.hema; ctx.lineWidth = 2.2; blobPath(ctx, v[0], v[1], v[2] * 1.1, v[2] * .85, i * 3.1, .16); ctx.stroke(); });
  if (necrosis > 0) ctx.restore();
  ctx.fillStyle = 'rgba(80,52,120,.75)'; for (const m of SPINDLE) {
    if (necrosis > 0) { ctx.save(); ctx.globalAlpha *= structAlpha(m.x, m.y, necrosis, ox, oy, vr); }
    ctx.beginPath(); ctx.ellipse(m.x, m.y, m.l, 2.4, m.r, 0, 6.283); ctx.fill(); if(detail) { ctx.save();ctx.globalAlpha *= detail;chromatin(ctx,m.x,m.y,m.l,2.4,m.r);ctx.restore(); }
    if (necrosis > 0) ctx.restore(); }
  // fibrin strands (eosinophilic, outward from serosa). The tear corridor lets them go.
  ctx.strokeStyle = 'rgba(206,110,145,.95)'; ctx.lineWidth = 2.4 * (1 - detail * .85); const fibA = ctx.globalAlpha;
  for (let i = 0; i < FIBRIN.length; i++) { const f = FIBRIN[i], k = Math.min(1, Math.max(0, fibrin * 1.6 - i / FIBRIN.length * .6)); if (k <= 0) continue;
    if (necrosis > 0) { const keep = Math.max(0, Math.min(1, (Math.abs(f.x - 190) - 18) / 64)); ctx.save(); ctx.globalAlpha = fibA * (1 - necrosis * (1 - keep)); }
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo(f.x + Math.cos(f.a) * f.l * .5 * k, f.y + Math.sin(f.a) * f.l * .5 * k + f.b * k, f.x + Math.cos(f.a) * f.l * k, f.y + Math.sin(f.a) * f.l * k + 10 * k); ctx.stroke();
    if (necrosis > 0) ctx.restore(); }
  if(detail) fibrinMesh(ctx,fibrin*detail*(necrosis > 0 ? .45 : 1));
  // neutrophils: margination along the vessel wall → emigration on a curved path → settle (jiggle)
  for (const c of CELLS) { let x = c.x, y = c.y, s = 1;
    if (c.kind === 'inf') { const k = Math.min(1, Math.max(0, (neut * 1.3 - c.order) / .3)); if (k <= 0) continue;
      if (k < .25) { const q = k / .25; x = c.vx + (c.mx - c.vx) * q; y = c.vy + (c.my - c.vy) * q; s = .6; }
      else { const q = (k - .25) / .75, e = 1 - Math.pow(1 - q, 2.2); [x, y] = bez([c.mx, c.my], [c.cx, c.cy], [c.x, c.y], e); s = .6 + .4 * Math.min(1, q * 2); } }
    x += Math.sin(t * 1.3 + c.rot * 5) * 1.3; y += Math.cos(t * 1.1 + c.rot * 3) * .9;
    if(detail > 0) { ctx.save();
      if (necrosis > 0) { const core = coreAt(x, y), edge = edgeAt(x, y, ox, oy, vr), kill = core * (core > .5 ? 1 : 1 - .5 * edge), h = hash(Math.imul(Math.round(x * 4), 374761) ^ Math.imul(Math.round(y * 4), 668265), 29);
        if (h > 1 - necrosis * kill * .985) { ctx.restore(); continue; }
        ctx.globalAlpha *= 1 - necrosis * (.4 + .55 * kill); }
      if(detail<1){ctx.save();ctx.globalAlpha *= 1-detail;neutro(ctx,x,y,c,s);ctx.restore();} ctx.globalAlpha *= detail; detailedNeutrophil(ctx,x,y,c,s);ctx.restore(); } else neutro(ctx, x, y, c, s); }
}
// Screen-space eyepiece: clips to a circle and draws the HE field. L = {x, y, r}; fs = field zoom (1 = full field).
// opt (optional): { off:[fx,fy] field-units pan, blur: px defocus }
export function drawLens(ctx, L, state, fs = 1, opt = {}) { if (L.r <= 1) return; const off = opt.off || [0, 0];
  ctx.save(); ctx.shadowColor = 'rgba(42,42,53,.28)'; ctx.shadowBlur = 40; ctx.fillStyle = '#F6EEF0'; ctx.beginPath(); ctx.arc(L.x, L.y, L.r, 0, 6.283); ctx.fill(); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.arc(L.x, L.y, L.r, 0, 6.283); ctx.clip();
  ctx.translate(L.x, L.y); const k = L.r / 420 * fs; ctx.scale(k, k); ctx.translate(-off[0], -off[1]); drawHE(ctx, state); ctx.restore();
  // defocus: canvas blur filters drop the baked wash layers in software GL, so 'blur' is a milky veil that clears as focus lands
  if (opt.blur > .05) { ctx.save(); ctx.fillStyle = `rgba(246,238,240,${Math.min(.85, opt.blur / 9 * .85).toFixed(3)})`; ctx.beginPath(); ctx.arc(L.x, L.y, L.r, 0, 6.283); ctx.fill(); ctx.restore(); }
  ctx.save(); const g = ctx.createRadialGradient(L.x, L.y, L.r * .78, L.x, L.y, L.r); g.addColorStop(0, 'rgba(42,42,53,0)'); g.addColorStop(1, 'rgba(42,42,53,.2)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(L.x, L.y, L.r, 0, 6.283); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.stroke(); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(L.x, L.y, L.r + 9, 0, 6.283); ctx.stroke(); ctx.restore(); }
export const fieldToScreen = (L, p, fs = 1, off = [0, 0]) => [L.x + (p[0] - off[0]) * L.r / 420 * fs, L.y + (p[1] - off[1]) * L.r / 420 * fs];
