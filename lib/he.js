// HE-stained appendix wall field (shared by 03 → 04 continuity). Field LOCAL coords: ±420 square, lumen at top, serosa at bottom.
// drawHE(ctx, state) draws into the current transform (caller translates to the lens centre, scales by r/420 and clips) — or use drawLens().
// v2 (polish pass): organic clustered cells (~1300), margination → emigration paths, 2–5 lobed nuclei, noisy structures.
//                  drawLens/fieldToScreen extras (off, blur) are optional — old calls behave as before.
//
// detail: exported API (opts default off; chapters 04–06 omit them and stay on the stamp path).
//   HE, BANDS, ULCER, VESSELS, CELLS
//   bakeHE(bake)
//   drawHE(ctx, state)
//     state.ulcer 0..1, state.neut 0..1, state.fibrin 0..1, state.t seconds — micro-motion only, no frame state.
//     state.detail   boolean, default false. true → chapter 03 histology (open crypt tubes, round follicles,
//                    split muscularis, detailedNeutrophil, neut-ramped density, double-wall vessels,
//                    biconcave RBCs, coarse+fine fibrin). false → original stamp, pixel-identical for 05–06.
//     state.view     optional { fs, off:[fx,fy] }. Detail path only. Skips neutrophils outside the eyepiece
//                    (radius 420/fs around off, plus a cell margin). Omit it and the whole plate is drawn.
//                    Stamp path never reads it. Chapter 04 does not set detail or view.
//     state.style    'ch04' opts into the chapter-04 plate (he_detail.js). Omit it and 03 / the stamp stay.
//     state.necrosis 0..1, read only when state.style==='ch04'. Default off. The stamp and 03 paths do not read it.
//     state.ox, state.oy, state.vr  ch04 eyepiece centre and radius in field units. Ignored unless style is 'ch04'.
//   drawLens(ctx, L, state, fs=1, opt?)
//     opt.off [fx,fy] field pan, opt.blur defocus veil in px. Omit opt for the original lens.
//   drawNeutrophil(ctx, x, y, cell, s=1, opt?)
//     opt omitted or opt.detail falsy → stamp (beginPath per lobe). cell: {lobes, rot, sz, kind, ...}.
//     opt.detail     detailedNeutrophil (lobes 4.0×2.9, cytoplasm seam, quadratic bridges, 5 clumps, 22 granules).
//     opt.lockLobes  inset only (chapter 03). Exact lobe count, sz 1, bridge 1.6px (screen space, no lens scale), cytoOutline.
//     opt.index      ignored on the detail path (lobe count comes from the cell). Stamp path never read it.
//     opt.style      'ch04' draws the r7 plump C-chain lobes from he_detail.js. Omit it and the stamp / lockLobes paths stay.
//     opt.necrosis   reserved, default off / ignored.
//   fieldToScreen(L, p, fs=1, off=[0,0])
// detail: geometry is hash/fbm only (never rng(2026)), so CELLS / CRYPTS / SPINDLE stay put.
// detail: tissue is Path2D subpaths (key "he-detail-v4"), not a bitmap. Each ellipse moveTo's its own arc start.
import { C } from './tokens.js';
import { drawWash } from './wash.js';
import { rng, noise2, hash, fbm } from './motion.js';
import { chromatin as chromatin04, detailedNeutrophil as neutroCh04, fibrinMesh as fibrinMesh04, tissueTexture as tissueTexture04 } from './he_detail.js';
import { detailedNeutrophil, fibrinMesh, tissueTexture, drawVessels } from './he_guide.js';
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
function neutro(ctx, x, y, c, s = 1, opt) {
  // ch04: r7 lobes. Checked before opt.detail so chapter 03 (detail, no style) is unchanged.
  if (opt && opt.style === 'ch04') return neutroCh04(ctx, x, y, c, s);
  // detail: optional 5th arg. 05/06 (and the default field) omit it and keep the stamp below.
  if (opt && opt.detail) return neutroDetail(ctx, x, y, c, s, opt);
  s *= c.sz || 1;
  ctx.fillStyle = 'rgba(236,178,198,.85)'; blobPath(ctx, x, y, 8.5 * s, 8 * s, c.rot * 3, .12, 10); ctx.fill();
  ctx.fillStyle = HE.hemaDark; const n = c.lobes, sp = n === 2 ? 1.6 : 1.15; const P = [];
  for (let i = 0; i < n; i++) { const a = c.rot + (i - (n - 1) / 2) * sp, rr = (n === 2 ? 3.6 : 4.6) * s; P.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  ctx.beginPath(); for (const p of P) { ctx.moveTo(p[0] + 2.9 * s, p[1]); ctx.arc(p[0], p[1], (n === 2 ? 3.3 : 2.9) * s, 0, 6.283); } ctx.fill();
  ctx.strokeStyle = HE.hemaDark; ctx.lineWidth = 1.1 * s; ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.stroke(); }
export { neutro as drawNeutrophil };
const bez = (a, c, b, k) => { const u = 1 - k; return [u * u * a[0] + 2 * u * k * c[0] + k * k * b[0], u * u * a[1] + 2 * u * k * c[1] + k * k * b[1]]; };
export function drawHE(ctx, state = {}) {
  const { ulcer = 1, neut = 1, fibrin = 1, t = 0, detail = false } = state;
  // detail: chapter 03 passes detail:true. Default false keeps 05–06 on the stamp.
  // ch04: the r7 plate is opt-in. Necrosis is not read on the stamp or the chapter-03 path.
  if (state.style === 'ch04') return drawHECh04(ctx, state);
  if (detail) return drawHEDetail(ctx, { ...state, ulcer, neut, fibrin, t });
  drawHEStamp(ctx, { ulcer, neut, fibrin, t });
}
function drawHEStamp(ctx, { ulcer = 1, neut = 1, fibrin = 1, t = 0 } = {}) {
  ctx.fillStyle = '#F6EEF0'; ctx.fillRect(-430, -430, 860, 900);
  drawWash(ctx, 'he.bands', 0, 0, 1024);
  drawWash(ctx, 'he.fibrin', 0, 330, 1024, { grow: fibrin, alpha: fibrin, origin: [.5, .3] });
  // crypts — irregular, destroyed inside the ulcer
  for (const g of CRYPTS) { const k = inUlcer(g.x) ? 1 - ulcer : 1; if (k <= .02) continue; ctx.save(); ctx.globalAlpha *= k; ctx.translate(g.x, g.y); ctx.rotate(g.tilt);
    ctx.fillStyle = 'rgba(255,248,250,.9)'; blobPath(ctx, 0, 0, g.w, g.h, g.s, .18); ctx.fill();
    ctx.fillStyle = HE.hema; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, j = 1 + .15 * (noise2(i, g.s) - .5); ctx.beginPath(); ctx.ellipse(Math.cos(a) * (g.w + 4) * j, Math.sin(a) * (g.h + 4) * j, 3, 4.4, a, 0, 6.283); ctx.fill(); } ctx.restore(); }
  // surface epithelium (wavy) with ulcer gap
  ctx.strokeStyle = HE.hema; ctx.lineWidth = 7; ctx.lineCap = 'round'; const gap0 = ULCER[0] + 100 * (1 - ulcer), gap1 = ULCER[1] - 100 * (1 - ulcer);
  const epi = (x0, x1) => { ctx.beginPath(); for (let x = x0; x <= x1; x += 10) { const y = -290 + 5 * Math.sin(x * .05) + 4 * (noise2(x / 40, 2) - .5); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); };
  epi(-430, gap0); epi(gap1, 430);
  drawWash(ctx, 'he.ulcer', (ULCER[0] + ULCER[1]) / 2, -265, 330, { grow: ulcer, alpha: ulcer });
  // congested vessels (irregular)
  VESSELS.forEach((v, i) => { drawWash(ctx, 'he.vessel', v[0], v[1], v[2] * 3.6); ctx.strokeStyle = HE.hema; ctx.lineWidth = 2.2; blobPath(ctx, v[0], v[1], v[2] * 1.1, v[2] * .85, i * 3.1, .16); ctx.stroke(); });
  ctx.fillStyle = 'rgba(80,52,120,.75)'; for (const m of SPINDLE) { ctx.beginPath(); ctx.ellipse(m.x, m.y, m.l, 2.4, m.r, 0, 6.283); ctx.fill(); }
  // fibrin strands (eosinophilic, outward from serosa)
  ctx.strokeStyle = 'rgba(206,110,145,.95)'; ctx.lineWidth = 2.4; for (let i = 0; i < FIBRIN.length; i++) { const f = FIBRIN[i], k = Math.min(1, Math.max(0, fibrin * 1.6 - i / FIBRIN.length * .6)); if (k <= 0) continue;
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo(f.x + Math.cos(f.a) * f.l * .5 * k, f.y + Math.sin(f.a) * f.l * .5 * k + f.b * k, f.x + Math.cos(f.a) * f.l * k, f.y + Math.sin(f.a) * f.l * k + 10 * k); ctx.stroke(); }
  // neutrophils: margination along the vessel wall → emigration on a curved path → settle (jiggle)
  for (const c of CELLS) { let x = c.x, y = c.y, s = 1;
    if (c.kind === 'inf') { const k = Math.min(1, Math.max(0, (neut * 1.3 - c.order) / .3)); if (k <= 0) continue;
      if (k < .25) { const q = k / .25; x = c.vx + (c.mx - c.vx) * q; y = c.vy + (c.my - c.vy) * q; s = .6; }
      else { const q = (k - .25) / .75, e = 1 - Math.pow(1 - q, 2.2); [x, y] = bez([c.mx, c.my], [c.cx, c.cy], [c.x, c.y], e); s = .6 + .4 * Math.min(1, q * 2); } }
    x += Math.sin(t * 1.3 + c.rot * 5) * 1.3; y += Math.cos(t * 1.1 + c.rot * 3) * .9; neutro(ctx, x, y, c, s); }
}
// ch04: architecture dissolves toward the tear (x=190) and the thrombosed vessels. 0 outside that core.
function coreAt(x, y) {
  const ty = y < -320 ? -320 : y > 330 ? 330 : y;
  let d = Math.hypot((x - 190) * .78, (y - ty) * .5);
  for (const v of VESSELS) { const dd = Math.hypot(x - v[0], y - v[1]); if (dd < d) d = dd; }
  const u = Math.max(0, Math.min(1, (d - 46) / 188));
  return 1 - u * u * (3 - 2 * u);
}
function edgeAt(x, y, ox, oy, vr) {
  const d = Math.hypot(x - ox, y - oy), u = Math.max(0, Math.min(1, (d - vr * .36) / (vr * .52)));
  return u * u * (3 - 2 * u);
}
function structAlpha(x, y, necrosis, ox, oy, vr) {
  return (1 - necrosis) + necrosis * (1 - coreAt(x, y)) * (.26 + .22 * edgeAt(x, y, ox, oy, vr));
}
// ch04: detail 0 and necrosis 0 fall through to the stamp, so the ramp's first frame matches 05–06.
function drawHECh04(ctx, state) {
  const ulcer = state.ulcer ?? 1, neut = state.neut ?? 1, fibrin = state.fibrin ?? 1, t = state.t || 0;
  const detail = typeof state.detail === 'number' ? state.detail : (state.detail ? 1 : 0);
  const necrosis = +state.necrosis || 0, ox = +state.ox || 0, oy = +state.oy || 0, vr = state.vr > 0 ? state.vr : 420;
  if (!(detail > 0) && !(necrosis > 0)) return drawHEStamp(ctx, { ulcer, neut, fibrin, t });
  ctx.fillStyle = '#F6EEF0'; ctx.fillRect(-430, -430, 860, 900);
  if (necrosis > 0) { ctx.save(); ctx.globalAlpha *= 1 - necrosis * .36; }
  drawWash(ctx, 'he.bands', 0, 0, 1024);
  if (necrosis > 0) ctx.restore();
  if (necrosis > 0) { ctx.save(); ctx.globalAlpha *= 1 - necrosis * .22; }
  drawWash(ctx, 'he.fibrin', 0, 330, 1024, { grow: fibrin, alpha: fibrin, origin: [.5, .3] });
  if (necrosis > 0) ctx.restore();
  if (detail) tissueTexture04(ctx, detail * (necrosis > 0 ? 1 - necrosis * .78 : 1));
  for (const g of CRYPTS) { const k = inUlcer(g.x) ? 1 - ulcer : 1; if (k <= .02) continue; ctx.save(); ctx.globalAlpha *= k;
    if (necrosis > 0) ctx.globalAlpha *= structAlpha(g.x, g.y, necrosis, ox, oy, vr);
    ctx.translate(g.x, g.y); ctx.rotate(g.tilt);
    ctx.fillStyle = 'rgba(255,248,250,.9)'; blobPath(ctx, 0, 0, g.w, g.h, g.s, .18); ctx.fill();
    ctx.fillStyle = HE.hema; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, j = 1 + .15 * (noise2(i, g.s) - .5); ctx.beginPath(); ctx.ellipse(Math.cos(a) * (g.w + 4) * j, Math.sin(a) * (g.h + 4) * j, 3, 4.4, a, 0, 6.283); ctx.fill(); if (detail) { ctx.save(); ctx.globalAlpha *= detail; chromatin04(ctx, Math.cos(a) * (g.w + 4) * j, Math.sin(a) * (g.h + 4) * j, 3, 4.4, a); ctx.restore(); } } ctx.restore(); }
  ctx.strokeStyle = HE.hema; ctx.lineWidth = 7; ctx.lineCap = 'round'; const gap0 = ULCER[0] + 100 * (1 - ulcer), gap1 = ULCER[1] - 100 * (1 - ulcer);
  const yEpi = x => -290 + 5 * Math.sin(x * .05) + 4 * (noise2(x / 40, 2) - .5);
  if (necrosis <= 0) {
    const epi = (x0, x1) => { ctx.beginPath(); for (let x = x0; x <= x1; x += 10) { const y = yEpi(x); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); };
    epi(-430, gap0); epi(gap1, 430);
  } else {
    const epi = (x0, x1) => { for (let x = x0; x < x1; x += 16) { const x2 = Math.min(x1, x + 16), aa = structAlpha((x + x2) / 2, -290, necrosis, ox, oy, vr); if (aa < .03) continue;
      ctx.save(); ctx.globalAlpha *= aa; ctx.beginPath(); for (let xx = x; xx <= x2 + .01; xx += 8) { const xk = Math.min(xx, x2), y = yEpi(xk); xx === x ? ctx.moveTo(xk, y) : ctx.lineTo(xk, y); } ctx.stroke(); ctx.restore(); } };
    epi(-430, gap0); epi(gap1, 430);
  }
  drawWash(ctx, 'he.ulcer', (ULCER[0] + ULCER[1]) / 2, -265, 330, { grow: ulcer, alpha: ulcer * (necrosis > 0 ? 1 - necrosis * .75 : 1) });
  if (necrosis > 0) { ctx.save(); ctx.globalAlpha *= 1 - necrosis * .86; }
  VESSELS.forEach((v, i) => { drawWash(ctx, 'he.vessel', v[0], v[1], v[2] * 3.6); ctx.strokeStyle = HE.hema; ctx.lineWidth = 2.2; blobPath(ctx, v[0], v[1], v[2] * 1.1, v[2] * .85, i * 3.1, .16); ctx.stroke(); });
  if (necrosis > 0) ctx.restore();
  ctx.fillStyle = 'rgba(80,52,120,.75)'; for (const m of SPINDLE) {
    if (necrosis > 0) { ctx.save(); ctx.globalAlpha *= structAlpha(m.x, m.y, necrosis, ox, oy, vr); }
    ctx.beginPath(); ctx.ellipse(m.x, m.y, m.l, 2.4, m.r, 0, 6.283); ctx.fill(); if (detail) { ctx.save(); ctx.globalAlpha *= detail; chromatin04(ctx, m.x, m.y, m.l, 2.4, m.r); ctx.restore(); }
    if (necrosis > 0) ctx.restore(); }
  ctx.strokeStyle = 'rgba(206,110,145,.95)'; ctx.lineWidth = 2.4 * (1 - detail * .85); const fibA = ctx.globalAlpha;
  for (let i = 0; i < FIBRIN.length; i++) { const f = FIBRIN[i], k = Math.min(1, Math.max(0, fibrin * 1.6 - i / FIBRIN.length * .6)); if (k <= 0) continue;
    if (necrosis > 0) { const keep = Math.max(0, Math.min(1, (Math.abs(f.x - 190) - 18) / 64)); ctx.save(); ctx.globalAlpha = fibA * (1 - necrosis * (1 - keep)); }
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo(f.x + Math.cos(f.a) * f.l * .5 * k, f.y + Math.sin(f.a) * f.l * .5 * k + f.b * k, f.x + Math.cos(f.a) * f.l * k, f.y + Math.sin(f.a) * f.l * k + 10 * k); ctx.stroke();
    if (necrosis > 0) ctx.restore(); }
  if (detail) fibrinMesh04(ctx, fibrin * detail * (necrosis > 0 ? .45 : 1));
  for (const c of CELLS) { let x = c.x, y = c.y, s = 1;
    if (c.kind === 'inf') { const k = Math.min(1, Math.max(0, (neut * 1.3 - c.order) / .3)); if (k <= 0) continue;
      if (k < .25) { const q = k / .25; x = c.vx + (c.mx - c.vx) * q; y = c.vy + (c.my - c.vy) * q; s = .6; }
      else { const q = (k - .25) / .75, e = 1 - Math.pow(1 - q, 2.2); [x, y] = bez([c.mx, c.my], [c.cx, c.cy], [c.x, c.y], e); s = .6 + .4 * Math.min(1, q * 2); } }
    x += Math.sin(t * 1.3 + c.rot * 5) * 1.3; y += Math.cos(t * 1.1 + c.rot * 3) * .9;
    if (detail > 0) { ctx.save();
      if (necrosis > 0) { const core = coreAt(x, y), edge = edgeAt(x, y, ox, oy, vr), kill = core * (core > .5 ? 1 : 1 - .5 * edge), hv = hash(Math.imul(Math.round(x * 4), 374761) ^ Math.imul(Math.round(y * 4), 668265), 29);
        if (hv > 1 - necrosis * kill * .985) { ctx.restore(); continue; }
        ctx.globalAlpha *= 1 - necrosis * (.4 + .55 * kill); }
      if (detail < 1) { ctx.save(); ctx.globalAlpha *= 1 - detail; neutro(ctx, x, y, c, s); ctx.restore(); }
      ctx.globalAlpha *= detail; neutro(ctx, x, y, c, s, { style: 'ch04' }); ctx.restore();
    } else neutro(ctx, x, y, c, s); }
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

// detail: opt-in histology for chapter 03 (state.detail / neutro opt.detail). Geometry is hashed, never rng(2026),
// so CELLS / CRYPTS / SPINDLE stay put for 04–06. Static layers are Path2Ds built once under key "he-detail-v4";
// ulcer fade and follicle effacement are draw-time alphas (no per-frame rebuild).
const TAU_D = 6.283185307179586;
let DETAIL = null;

// detail: ellipse() lines from the current point to the arc start. Without moveTo, every lobe / nucleus /
// detail: follicle dot is one polygon (triangles, a purple bar, saw-tooth muscle). Angle 0 starts at +rx on the rotated x-axis.
function addEllipse(path, x, y, rx, ry, rot) {
  rx = Math.max(.35, rx); ry = Math.max(.35, ry);
  path.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot));
  path.ellipse(x, y, rx, ry, rot, 0, TAU_D);
}
function addBlob(path, cx, cy, rx, ry, seed, nSeg, amp) {
  for (let i = 0; i <= nSeg; i++) {
    const a = i / nSeg * TAU_D, f = 1 + amp * (noise2(Math.cos(a) * 1.6 + seed, Math.sin(a) * 1.6 + seed * .4) - .5) * 2;
    const x = cx + Math.cos(a) * rx * f, y = cy + Math.sin(a) * ry * f;
    i ? path.lineTo(x, y) : path.moveTo(x, y);
  }
  path.closePath();
}
// detail: inset and any other opt.detail caller. Field plate calls detailedNeutrophil itself.
// detail: lockLobes (chapter 03 inset) forces sz 1, a 1.6px bridge, and cytoOutline. The field plate never sets lockLobes.
function neutroDetail(ctx, x, y, c, s, opt) {
  const lock = opt && opt.lockLobes;
  const cell = lock ? { lobes: c.lobes || 3, rot: c.rot || 0, sz: 1 } : c;
  const guide = { bridgePx: lock ? 1.6 : 0.48 };
  if (lock) guide.cytoOutline = true;
  detailedNeutrophil(ctx, x, y, cell, s || 1, guide);
}
// detail: fbm edge shared by the two bands that meet, so the join is wavy and has no 1px stroke.
function edgeY(x, yBase, seed, amp) { return yBase + (fbm(x * .017 + seed * 2.2, seed * .37, 4, 200 + seed * 13) - .5) * amp; }
function bandBetween(y0, y1, s0, s1, a0, a1) {
  const p = new Path2D(); let first = true;
  for (let x = -470; x <= 470; x += 8) { const y = edgeY(x, y0, s0, a0); if (first) { p.moveTo(x, y); first = false; } else p.lineTo(x, y); }
  for (let x = 470; x >= -470; x -= 8) p.lineTo(x, edgeY(x, y1, s1, a1));
  p.closePath(); return p;
}
function ribbon(y, seed, amp, half) {
  const p = new Path2D(); let first = true;
  for (let x = -470; x <= 470; x += 8) { const yb = edgeY(x, y, seed, amp) - half; if (first) { p.moveTo(x, yb); first = false; } else p.lineTo(x, yb); }
  for (let x = 470; x >= -470; x -= 8) p.lineTo(x, edgeY(x, y, seed, amp) + half);
  p.closePath(); return p;
}
function xform(g, x, y) { const c = Math.cos(g.tilt), s = Math.sin(g.tilt); return [g.x + x * c - y * s, g.y + x * s + y * c]; }
function addLocalPoly(path, g, pts) {
  pts.forEach((pt, i) => { const q = xform(g, pt[0], pt[1]); i ? path.lineTo(q[0], q[1]) : path.moveTo(q[0], q[1]); });
  path.closePath();
}
function addCryptDot(path, g, lx, ly, rx, ry, localRot) {
  const q = xform(g, lx, ly);
  addEllipse(path, q[0], q[1], rx, ry, g.tilt + localRot);
}
function cryptGeom(g) {
  // detail: mouth fixed at the surface; length follows the existing crypt, so x/tilt stay on CRYPTS.
  const top = -284 - g.y, bot = top + g.h * 2.05;
  return { ohw: g.w * 1.02, ihw: Math.max(3.2, g.w * .32), top, bot };
}
function addStadium(path, g, hw, top, bot) {
  const ry = Math.min(hw * .72, 9), steps = 8, pts = [];
  for (let i = 0; i <= steps; i++) pts.push([-hw, top + (bot - top) * i / steps]);
  for (let i = 0; i <= 8; i++) { const a = Math.PI - Math.PI * (i / 8); pts.push([Math.cos(a) * hw, bot + Math.sin(a) * ry]); }
  for (let i = steps; i >= 0; i--) pts.push([hw, top + (bot - top) * i / steps]);
  pts.forEach((pt, i) => { const q = xform(g, pt[0], pt[1]); i ? path.lineTo(q[0], q[1]) : path.moveTo(q[0], q[1]); });
  path.closePath();
}
function sprinkle(keep, fade, cx, cy, r0, r1, step, rMin, rMax, seed, fadeCut) {
  let i = 0;
  for (let y = cy - r1; y <= cy + r1; y += step) for (let x = cx - r1; x <= cx + r1; x += step) {
    const jx = x + (hash(i, seed) - .5) * step * .9, jy = y + (hash(i, seed + 3) - .5) * step * .9;
    const d = Math.hypot(jx - cx, jy - cy);
    if (d < r0 || d > r1 * (.9 + hash(i, seed + 4) * .1)) { i++; continue; }
    const rr = rMin + hash(i, seed + 5) * (rMax - rMin), ry = rr * (.82 + hash(i, seed + 6) * .28);
    addEllipse(hash(i, seed + 8) < fadeCut ? fade : keep, jx, jy, rr, ry, (hash(i, seed + 7) - .5) * 1.4);
    i++;
  }
}
function buildTissue() {
  const bands = [
    { y0: -440, y1: -290, s0: 11, s1: 1, a0: 8, a1: 26, col: 'rgba(252,238,242,.98)' },
    { y0: -290, y1: -150, s0: 1, s1: 2, a0: 26, a1: 26, col: 'rgba(236,186,204,.96)' },
    { y0: -150, y1: -10, s0: 2, s1: 3, a0: 26, a1: 26, col: 'rgba(248,222,230,.97)' },
    // detail: muscularis inner ~45% (y -10 → 98), outer ~55% (98 → 230), shared fbm edge.
    { y0: -10, y1: 98, s0: 3, s1: 4, a0: 26, a1: 16, col: 'rgba(214,152,174,.97)' },
    { y0: 98, y1: 230, s0: 4, s1: 5, a0: 16, a1: 26, col: 'rgba(228,172,192,.97)' },
    { y0: 230, y1: 280, s0: 5, s1: 6, a0: 26, a1: 16, col: 'rgba(244,210,220,.96)' },
    { y0: 280, y1: 450, s0: 6, s1: 12, a0: 16, a1: 8, col: 'rgba(250,230,236,.72)' },
  ].map(b => ({ col: b.col, path: bandBetween(b.y0, b.y1, b.s0, b.s1, b.a0, b.a1) }));
  const feathers = [1, 2, 3, 5, 6].map(s => ribbon([-290, -150, -10, 0, 230, 280][s - 1], s, s === 6 ? 16 : 26, 15));
  // detail: thin pale-pink fbm line on the shared muscularis edge. A wide near-white ribbon read as a hard stripe.
  const septum = ribbon(98, 4, 16, 1.45);
  const cryptWall = new Path2D(), cryptWallU = new Path2D(), cryptLumen = new Path2D(), cryptLumenU = new Path2D();
  const gob = new Path2D(), gobU = new Path2D(), nuc = new Path2D(), nucU = new Path2D();
  const lp = new Path2D(), lpU = new Path2D();
  CRYPTS.forEach((g, gi) => {
    const geom = cryptGeom(g), hole = inUlcer(g.x);
    const wall = hole ? cryptWallU : cryptWall, lumen = hole ? cryptLumenU : cryptLumen;
    const nPath = hole ? nucU : nuc, gPath = hole ? gobU : gob;
    // detail: outer half-width stays geom.ohw so crypt x/tilt/count do not move. Lumen is a thin slit.
    const lhw = 1.65, xIn = lhw - 0.15, pitch = 7.25;
    const yStart = geom.top + 0.6, capDrop = Math.min(8.5, geom.ohw * 0.55);
    const yCap = geom.bot + capDrop - geom.ohw, R0 = geom.ohw, R1 = xIn;
    const sideCells = [];
    for (const side of [-1, 1]) {
      let y = yStart;
      while (y < yCap - 5) {
        const y1 = Math.min(y + pitch, yCap), yEnd = (yCap - y1 < 5) ? yCap : y1;
        // detail: tall (radial) narrow (along-crypt) column. Nucleus on the outer, basal side.
        addLocalPoly(wall, g, [[side * xIn, y], [side * R0, y], [side * R0, yEnd], [side * xIn, yEnd]]);
        addCryptDot(nPath, g, side * (R0 - 2.45), (y + yEnd) / 2, 2.05, 1.55, Math.PI / 2);
        sideCells.push({ side, y0: y, y1: yEnd });
        if (yEnd >= yCap - 0.05) break;
        y = yEnd;
      }
    }
    const nCap = 5;
    for (let i = 0; i < nCap; i++) {
      const a0 = Math.PI - Math.PI * i / nCap, a1 = Math.PI - Math.PI * (i + 1) / nCap, am = (a0 + a1) / 2;
      addLocalPoly(wall, g, [
        [Math.cos(a0) * R1, yCap + Math.sin(a0) * R1], [Math.cos(a0) * R0, yCap + Math.sin(a0) * R0],
        [Math.cos(a1) * R0, yCap + Math.sin(a1) * R0], [Math.cos(a1) * R1, yCap + Math.sin(a1) * R1],
      ]);
      addCryptDot(nPath, g, Math.cos(am) * (R0 - 2.45), yCap + Math.sin(am) * (R0 - 2.45), 2.05, 1.55, am + Math.PI / 2);
    }
    // detail: exactly 2 or 3 goblet vacuoles, apical, one chain down the lining. Not in the lumen.
    if (sideCells.length) {
      const nGob = 2 + (hash(gi, 240) >= .5 ? 1 : 0), used = new Set();
      const mids = sideCells.map(c => (c.y0 + c.y1) / 2);
      const yMin = Math.min(...mids), yMax = Math.max(...mids);
      for (let k = 0; k < nGob; k++) {
        const target = yMin + (yMax - yMin) * ((k + 0.5) / nGob), want = k % 2 === 0 ? -1 : 1;
        let best = -1, bestD = 1e9;
        for (let i = 0; i < sideCells.length; i++) {
          if (used.has(i)) continue;
          const c = sideCells[i], d = Math.abs((c.y0 + c.y1) / 2 - target) + (c.side === want ? 0 : 6);
          if (d < bestD) { bestD = d; best = i; }
        }
        if (best < 0) continue;
        used.add(best);
        const c = sideCells[best];
        addCryptDot(gPath, g, c.side * (lhw + 3.15), (c.y0 + c.y1) / 2, 2.3, 2.05, 0);
      }
    }
    addStadium(lumen, g, lhw, yStart - 1.6, yCap + Math.min(geom.ohw * 0.28, 4.2));
  });
  // detail: scattered lymphocytes / plasma cells in the lamina propria, not a dotted crypt rim.
  let li = 0;
  for (let y = -268; y < -158; y += 16) for (let x = -400; x <= 400; x += 18) {
    const jx = x + (hash(li, 220) - .5) * 12, jy = y + (hash(li, 221) - .5) * 10;
    let inside = false;
    for (const g of CRYPTS) {
      const geom = cryptGeom(g), c = Math.cos(-g.tilt), s = Math.sin(-g.tilt), dx = jx - g.x, dy = jy - g.y;
      const lx = dx * c - dy * s, ly = dx * s + dy * c;
      // detail: cover the round cap (bot + capDrop) so propria dots do not sit inside the lining.
      if (Math.abs(lx) < geom.ohw * 1.12 && ly > geom.top - 2 && ly < geom.bot + 14) { inside = true; break; }
    }
    // detail: keep about half the slots so the propria reads as scattered dots, not a carpet.
    if (!inside && hash(li, 222) > .55) {
      const big = hash(li, 223) < .2, rr = big ? 2.5 + hash(li, 224) * .6 : 1.45 + hash(li, 224) * .7;
      addEllipse(inUlcer(jx) ? lpU : lp, jx, jy, rr, rr * (big ? .82 : .9), hash(li, 225) * 3);
    }
    li++;
  }
  const surface = bandBetween(-298, -274, 21, 22, 9, 8);
  const surfaceNuc = new Path2D(), surfaceGob = new Path2D();
  for (let x = -428, si = 0; x <= 428; x += 7.2, si++) {
    if (CRYPTS.some(g => Math.abs(x - g.x) < g.w * 1.2)) continue;
    const y = edgeY(x, -276, 21, 8) + 2.4;
    addEllipse(surfaceNuc, x + (hash(si, 230) - .5) * 1.6, y, 3.05, 1.4, Math.PI / 2);
    if (hash(si, 231) < .3) addEllipse(surfaceGob, x, y - 3.4, 2.5, 2.05, Math.PI / 2);
  }
  // detail: 4 round follicles in BANDS.submucosa (r 46–54), clear of VESSELS. Dots are separate subpaths, not one bar.
  const FOLS = [{ x: -362, y: -96, r: 54 }, { x: -150, y: -108, r: 46 }, { x: 22, y: -98, r: 54 }, { x: 370, y: -98, r: 48 }];
  const gcDisc = new Path2D(), mantleK = new Path2D(), mantleF = new Path2D(), gcK = new Path2D(), gcF = new Path2D(), infil = new Path2D();
  FOLS.forEach((f, fi) => {
    addBlob(gcDisc, f.x, f.y, f.r * .42, f.r * .4, 12 + fi, 28, .08);
    addBlob(infil, f.x + (fi - 1.5) * 4, f.y + 3, f.r * .7, f.r * .62, 20 + fi, 22, .16);
    // detail: dense small mantle lymphocytes; paler, larger cells in the germinal centre.
    sprinkle(mantleK, mantleF, f.x, f.y, f.r * .40, f.r * .98, 3.5, 1.05, 1.65, 300 + fi * 17, .36);
    sprinkle(gcK, gcF, f.x, f.y, 0, f.r * .38, 6.4, 2.05, 3.15, 420 + fi * 17, .28);
  });
  const musR = new Path2D(), musS = new Path2D();
  const ySplit = BANDS.muscularis[0] + .45 * (BANDS.muscularis[1] - BANDS.muscularis[0]);
  let mi = 0;
  // detail: inner circular = scattered small round/oval dots. Each nucleus is its own subpath (no saw-tooth fill).
  for (let y = BANDS.muscularis[0] + 7; y < ySplit - 6; y += 14) for (let x = -404; x <= 404; x += 16) {
    if (hash(mi, 61) < .14) { mi++; continue; }
    const rx = 1.85 + hash(mi, 64) * 1.15, ry = 1.55 + hash(mi, 65) * 1.05;
    addEllipse(musR, x + (hash(mi, 62) - .5) * 8, y + (hash(mi, 63) - .5) * 6, rx, ry, (hash(mi, 66) - .5) * .7);
    mi++;
  }
  // detail: outer longitudinal = horizontal spindles with a gap between neighbours, not one fused band.
  for (let y = ySplit + 9; y < BANDS.muscularis[1] - 6; y += 16) for (let x = -400; x <= 400; x += 30) {
    if (hash(mi, 71) < .18) { mi++; continue; }
    addEllipse(musS, x + (hash(mi, 72) - .5) * 8, y + (hash(mi, 73) - .5) * 5, 7.2 + hash(mi, 74) * 4.2, 1.4 + hash(mi, 75) * .5, (hash(mi, 76) - .5) * .22);
    mi++;
  }
  return { bands, feathers, septum, cryptWall, cryptWallU, cryptLumen, cryptLumenU, gob, gobU, nuc, nucU, lp, lpU, surface, surfaceNuc, surfaceGob, gcDisc, mantleK, mantleF, gcK, gcF, infil, musR, musS, fols: FOLS };
}
// detail: early cohort only — 170 emigrated (perivascular, mucosa preferred) + 60 lumen.
// detail: CELLS stay the full plate (rng 2026, same positions as 04–06). The cohort is who draws while neut is low.
// detail: A round eyepiece on this cohort sits near guide §7.3's early 150–250. It is not the full-thickness cap.
function earlyMask() {
  const inf = [], pus = [];
  for (let i = 0; i < CELLS.length; i++) {
    const c = CELLS[i];
    if (c.kind === 'inf') inf.push(i);
    else if (c.kind === 'pus') pus.push(i);
  }
  const score = i => {
    const c = CELLS[i];
    const bandW = c.band === 'mucosa' ? 0 : c.band === 'submucosa' ? 36 : c.band === 'muscularis' ? 110 : 190;
    return c.d + bandW + hash(i, 90) * 16;
  };
  inf.sort((a, b) => score(a) - score(b) || a - b);
  const keep = new Uint8Array(CELLS.length);
  for (let k = 0; k < 170 && k < inf.length; k++) keep[inf[k]] = 1;
  pus.sort((a, b) => hash(a, 91) - hash(b, 91) || a - b);
  for (let k = 0; k < 60 && k < pus.length; k++) keep[pus[k]] = 1;
  return keep;
}
// detail: heAt neut = .13*u + .87*u*u across sentence 8 (50.8 s → u=1 at 63.1 s).
// detail: 0.30 ≈ 57.2 s, still the ulcer close-up; 56.5 s (neut ≈ 0.25) stays on the early cohort.
// detail: 0.80 ≈ 61.7 s, so the 62 s serosa/fibrin beat (neut ≈ 0.84) draws the whole plate.
// detail: That plate, circle radius 420/1.15 about the origin, is the guide full-thickness count
// detail: (mucosa ~300, submucosa ~200, muscularis ~260, serosa ~45, fibrin ~50, lumen ~55).
function neutSpread(neut) {
  const u = Math.max(0, Math.min(1, (neut - 0.30) / 0.50));
  return u * u * (3 - 2 * u);
}
function ensureDetail() {
  if (DETAIL) return DETAIL;
  const early = earlyMask();
  const rank = new Float32Array(CELLS.length);
  for (let i = 0; i < CELLS.length; i++) {
    // detail: early cohort rank 0. Everyone else is uniform in (0, 0.94], so each band fills together
    // detail: (muscle fibres, serosa, fibrin) instead of mucosa finishing first.
    // detail: ceiling 0.94 leaves the 0.06 fade finished when neutSpread hits 1 — no cell stuck half-alpha.
    rank[i] = early[i] ? 0 : 0.001 + hash(i, 93) * 0.939;
  }
  DETAIL = { key: 'he-detail-v4', tissue: buildTissue(), early, rank };
  return DETAIL;
}
function drawHEDetail(ctx, { ulcer, neut, fibrin, t, view }) {
  const Tis = ensureDetail().tissue;
  ctx.fillStyle = '#F7E4EB'; ctx.fillRect(-430, -430, 860, 900);
  for (const b of Tis.bands) { ctx.fillStyle = b.col; ctx.fill(b.path); }
  ctx.fillStyle = 'rgba(255,246,248,.32)'; for (const f of Tis.feathers) ctx.fill(f);
  // detail: pale pink, not white. Sits on the fbm join between inner circular and outer longitudinal.
  ctx.fillStyle = 'rgba(245,214,222,.95)'; ctx.fill(Tis.septum);
  // detail: muscle / collagen hairlines (0.65). Spare the septum and follicles so the accepted split and germinal centres stay clean. No hatch.
  ctx.save(); ctx.beginPath(); ctx.rect(-520, -460, 1040, 940); ctx.rect(-520, 88, 1040, 20);
  for (const f of Tis.fols) { ctx.moveTo(f.x + f.r, f.y); ctx.arc(f.x, f.y, f.r, 0, TAU_D); }
  ctx.clip('evenodd'); tissueTexture(ctx, 1); ctx.restore();
  const gap0 = ULCER[0] + 100 * (1 - ulcer), gap1 = ULCER[1] - 100 * (1 - ulcer);
  ctx.save(); ctx.beginPath(); ctx.rect(-520, -330, gap0 + 520, 70); ctx.rect(gap1, -330, 520 - gap1, 70); ctx.clip();
  ctx.fillStyle = 'rgba(206,136,160,.94)'; ctx.fill(Tis.surface); ctx.restore();
  // detail: surface epithelium, round cap, width 7 (guide §1). Crypt mouths paint over it.
  ctx.save(); ctx.strokeStyle = HE.hema; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const epi = (x0, x1) => { if (x1 - x0 < 2) return; ctx.beginPath(); for (let x = x0; x <= x1; x += 10) { const y = -290 + 5 * Math.sin(x * .05) + 4 * (noise2(x / 40, 2) - .5); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); };
  epi(-430, gap0); epi(gap1, 430); ctx.restore();
  // detail: columnar lining — pale pink cells, thin rose membrane, slit lumen, bluish goblet cups, basal nuclei.
  const paintCrypt = (wall, lumen, gob, nuc) => {
    ctx.fillStyle = 'rgba(245,192,208,.99)'; ctx.fill(wall);
    ctx.save(); ctx.strokeStyle = 'rgba(168,96,124,.82)'; ctx.lineWidth = 1.15; ctx.lineJoin = 'round'; ctx.lineCap = 'butt'; ctx.stroke(wall); ctx.restore();
    ctx.fillStyle = 'rgba(255,246,244,.96)'; ctx.fill(lumen);
    ctx.fillStyle = 'rgba(206,228,240,.97)'; ctx.fill(gob);
    ctx.fillStyle = HE.hemaDark; ctx.fill(nuc);
  };
  paintCrypt(Tis.cryptWall, Tis.cryptLumen, Tis.gob, Tis.nuc);
  ctx.fillStyle = 'rgba(58,40,92,.9)'; ctx.fill(Tis.lp);
  const ku = Math.max(0, 1 - ulcer);
  if (ku > .02) {
    ctx.save(); ctx.globalAlpha *= ku;
    paintCrypt(Tis.cryptWallU, Tis.cryptLumenU, Tis.gobU, Tis.nucU);
    ctx.fillStyle = 'rgba(58,40,92,.9)'; ctx.fill(Tis.lpU);
    ctx.restore();
  }
  ctx.save(); ctx.beginPath(); ctx.rect(-520, -330, gap0 + 520, 70); ctx.rect(gap1, -330, 520 - gap1, 70); ctx.clip();
  ctx.fillStyle = 'rgba(255,252,250,.92)'; ctx.fill(Tis.surfaceGob);
  ctx.fillStyle = HE.hemaDark; ctx.fill(Tis.surfaceNuc); ctx.restore();
  ctx.save(); ctx.globalAlpha *= 1 - .28 * neut; ctx.fillStyle = 'rgba(250,242,246,.9)'; ctx.fill(Tis.gcDisc); ctx.restore();
  ctx.fillStyle = 'rgba(63,42,102,.92)'; ctx.fill(Tis.mantleK);
  ctx.save(); ctx.globalAlpha *= 1 - .88 * neut; ctx.fill(Tis.mantleF); ctx.restore();
  ctx.fillStyle = 'rgba(140,118,178,.9)'; ctx.fill(Tis.gcK);
  ctx.save(); ctx.globalAlpha *= 1 - .72 * neut; ctx.fill(Tis.gcF); ctx.restore();
  if (neut > .02) { ctx.save(); ctx.globalAlpha *= .36 * neut; ctx.fillStyle = 'rgba(214,140,164,.95)'; ctx.fill(Tis.infil); ctx.restore(); }
  ctx.fillStyle = 'rgba(63,42,102,.86)'; ctx.fill(Tis.musR);
  ctx.fillStyle = 'rgba(74,52,114,.8)'; ctx.fill(Tis.musS);
  drawWash(ctx, 'he.ulcer', (ULCER[0] + ULCER[1]) / 2, -265, 330, { grow: ulcer, alpha: ulcer });
  VESSELS.forEach(v => { drawWash(ctx, 'he.vessel', v[0], v[1], v[2] * 3.6); });
  // detail: double wall + biconcave RBCs (rx ≈ 5). Stamp path keeps the single 2.2 blob.
  drawVessels(ctx, VESSELS);
  drawWash(ctx, 'he.fibrin', 0, 330, 1024, { grow: fibrin, alpha: fibrin, origin: [.5, .3] });
  // detail: coarse strands thin to 2.4×(1−0.85) = 0.36 at full detail. The 140-strand mesh is fibrinMesh.
  ctx.save(); ctx.strokeStyle = 'rgba(206,110,145,.95)'; ctx.lineWidth = 2.4 * (1 - 0.85); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < FIBRIN.length; i++) { const f = FIBRIN[i], k = Math.min(1, Math.max(0, fibrin * 1.6 - i / FIBRIN.length * .6)); if (k <= 0) continue;
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo(f.x + Math.cos(f.a) * f.l * .5 * k, f.y + Math.sin(f.a) * f.l * .5 * k + f.b * k, f.x + Math.cos(f.a) * f.l * k, f.y + Math.sin(f.a) * f.l * k + 10 * k); ctx.stroke(); }
  ctx.restore();
  if (fibrin > 0) fibrinMesh(ctx, fibrin);
  // detail: same margination → emigration timing. Early cohort until neutSpread opens the rest of CELLS.
  const pop = ensureDetail(), spread = neutSpread(neut);
  const vx0 = view && view.off ? view.off[0] : 0, vy0 = view && view.off ? view.off[1] : 0;
  const vrad = view && view.fs > 0 ? 420 / view.fs + 22 : 0, vrad2 = vrad * vrad;
  for (let ci = 0; ci < CELLS.length; ci++) {
    const c = CELLS[ci];
    let gate = 1;
    if (!pop.early[ci]) {
      const over = spread - pop.rank[ci];
      if (over <= 0) continue;
      // detail: short fade so a newly admitted cell does not pop at full alpha.
      gate = over >= 0.06 ? 1 : over / 0.06;
    }
    let x = c.x, y = c.y, s = 1;
    if (c.kind === 'pus') { if (neut < 0.05) continue; ctx.save(); ctx.globalAlpha *= Math.min(1, (neut - 0.05) / 0.18) * gate;
      x += Math.sin(t * 1.3 + c.rot * 5) * 1.3; y += Math.cos(t * 1.1 + c.rot * 3) * .9;
      if (vrad2 && (x - vx0) * (x - vx0) + (y - vy0) * (y - vy0) > vrad2) { ctx.restore(); continue; }
      detailedNeutrophil(ctx, x, y, c, s); ctx.restore(); continue; }
    if (c.kind === 'inf') { const k = Math.min(1, Math.max(0, (neut * 1.3 - c.order) / .3)); if (k <= 0) continue;
      if (k < .25) { const q = k / .25; x = c.vx + (c.mx - c.vx) * q; y = c.vy + (c.my - c.vy) * q; s = .6; }
      else { const q = (k - .25) / .75, e = 1 - Math.pow(1 - q, 2.2); [x, y] = bez([c.mx, c.my], [c.cx, c.cy], [c.x, c.y], e); s = .6 + .4 * Math.min(1, q * 2); } }
    x += Math.sin(t * 1.3 + c.rot * 5) * 1.3; y += Math.cos(t * 1.1 + c.rot * 3) * .9;
    // detail: optional eyepiece cull. Margin 22 covers the largest lobed cytoplasm plus jiggle, so the clip still matches a full draw.
    if (vrad2 && (x - vx0) * (x - vx0) + (y - vy0) * (y - vy0) > vrad2) continue;
    if (gate < 1) { ctx.save(); ctx.globalAlpha *= gate; detailedNeutrophil(ctx, x, y, c, s); ctx.restore(); }
    else detailedNeutrophil(ctx, x, y, c, s);
  }
}
