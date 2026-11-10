// detail: port of film_mini_detail/lib/he_detail.js (neutrophil, chromatin, fibrin mesh, muscle/collagen).
// detail: copied in, not imported across directories. Only he.js state.detail draws these. Seeds are fixed.
// detail: rng runs once at load to bake Path2Ds. render(t) does not call rng, Date, or Math.random.
import { rng, noise2 } from './motion.js';

const R = rng(40417), TAU = Math.PI * 2;
const ellipse = (p, x, y, rx, ry, a = 0) => { p.moveTo(x + Math.cos(a) * rx, y + Math.sin(a) * rx); p.ellipse(x, y, rx, ry, a, 0, TAU); };
const speck = new Path2D();
for (let i = 0; i < 25; i++) { const a = R() * TAU, r = Math.sqrt(R()) * .86; ellipse(speck, Math.cos(a) * r, Math.sin(a) * r, .035 + R() * .065, .04 + R() * .08); }
// detail: 25 chromatin specks. Not stamped on the accepted crypt / muscle nuclei (those shapes stay).
export function chromatin(ctx, x, y, rx, ry, a) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(rx, ry); ctx.fillStyle = '#38234F'; ctx.fill(speck); ctx.restore(); }
const muscleFibres = new Path2D(), collagen = new Path2D();
for (let i = 0; i < 280; i++) {
  const x = -440 + R() * 880, y = -5 + R() * 230, l = 22 + R() * 65;
  muscleFibres.moveTo(x - l, y); muscleFibres.bezierCurveTo(x - l * .4, y - 5, x + l * .3, y - 4, x + l, y);
  muscleFibres.bezierCurveTo(x + l * .2, y + 5, x - l * .4, y + 4, x - l, y);
}
for (let i = 0; i < 180; i++) {
  const x = -430 + R() * 860, y = -145 + R() * 130, l = 12 + R() * 50;
  collagen.moveTo(x, y); collagen.bezierCurveTo(x + l * .3, y - 7, x + l * .6, y + 8, x + l, y + 2);
}
// detail: microscope hairlines, round caps, no hatch. Muscle and collagen share line width 0.65.
export function tissueTexture(ctx, k) {
  ctx.save(); ctx.globalAlpha *= k; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(177,84,124,.3)'; ctx.lineWidth = .65; ctx.stroke(muscleFibres);
  ctx.strokeStyle = 'rgba(189,106,147,.4)'; ctx.stroke(collagen); ctx.restore();
}
const NR = rng(40303);
// detail: lobe half-axes 4.0×2.9. Centres keep a cytoplasm gap; the inner side pinches 0.14.
const lobeOutline = (path, x, y, a, b, rot, phase, sign) => {
  const N = 36;
  for (let k = 0; k <= N; k++) {
    const t = k / N * TAU, f = 1 + .006 * Math.sin(2 * t + phase) + .004 * Math.cos(3 * t + phase * 1.3), indent = 1 - .14 * Math.exp(-(((t - sign * Math.PI / 2) / .58) ** 2));
    const u = Math.cos(t) * a * f, v = Math.sin(t) * b * f * indent, px = x + u * Math.cos(rot) - v * Math.sin(rot), py = y + u * Math.sin(rot) + v * Math.cos(rot);
    k ? path.lineTo(px, py) : path.moveTo(px, py);
  }
  path.closePath();
};
const lobeSets = [
  [{ x: -3.66, y: 0.17, rot: 1.50 }, { x: 3.54, y: -0.18, rot: 1.72 }],
  [{ x: 0, y: -4.50, rot: -0.22 }, { x: 3.90, y: 2.25, rot: 1.87 }, { x: -3.90, y: 2.25, rot: 3.97 }],
  [{ x: 0, y: -5.85, rot: -0.07 }, { x: 5.85, y: 0, rot: 1.50 }, { x: 0, y: 5.85, rot: 3.07 }, { x: -5.85, y: 0, rot: 4.64 }],
  [{ x: -6.12, y: -4.15, rot: 5.28 }, { x: 1.81, y: -5.72, rot: 5.06 }, { x: 7.65, y: -.2, rot: 1.48 }, { x: 2.21, y: 5.59, rot: 1.2 }, { x: -5.77, y: 4.57, rot: 4.07 }],
];
// detail: cytoplasm ellipses for 2 → 5 lobes (guide §3).
const cellRadii = [[7.20, 5.65], [8.05, 7.55], [9.25, 8.70], [10.625, 10]];
const cells = lobeSets.map((chain, ci) => {
  const lobes = new Path2D(), bridges = new Path2D(), granules = new Path2D(), clumps = new Path2D();
  let inward = 0; for (const p of chain) inward += Math.sin(p.rot) * p.x - Math.cos(p.rot) * p.y; const sign = inward >= 0 ? 1 : -1;
  chain.forEach((p, i) => {
    const ja = .997 + NR() * .006, jb = .997 + NR() * .006;
    lobeOutline(lobes, p.x, p.y, 4 * ja, 2.9 * jb, p.rot, i * 1.7, sign);
    if (i) { const q = chain[i - 1], mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, ol = Math.hypot(mx, my) || 1; bridges.moveTo(q.x, q.y); bridges.quadraticCurveTo(mx - my / ol * .65, my + mx / ol * .65, p.x, p.y); }
    for (let k = 0; k < 5; k++) ellipse(clumps, p.x + (R() - .5) * 3.1, p.y + (R() - .5) * 2.2, .35 + R() * .4, .32);
  });
  const reach = cellRadii[ci][0] * .78;
  for (let i = 0; i < 22; i++) { const a = R() * TAU, r = reach * Math.sqrt(R()); ellipse(granules, Math.cos(a) * r, Math.sin(a) * r * .94, .22 + R() * .22, .3); }
  return { lobes, bridges, granules, clumps };
});
// detail: opt.bridgePx is the stroke in the caller's pixels (default 0.48, guide §1). Inset passes 1.6 because it is not under the lens scale.
// detail: opt.cytoOutline is inset-only (chapter 03 lockLobes). Field plate omits it — fill stays rgba(226,170,200,.75), no contour stroke.
export function detailedNeutrophil(ctx, x, y, c, s, opt) {
  const n = c.lobes >= 2 && c.lobes <= 5 ? c.lobes : 3;
  const p = cells[n - 2], sc = s * (c.sz || 1), rad = cellRadii[n - 2], bridge = opt && opt.bridgePx != null ? opt.bridgePx : .48;
  ctx.save(); ctx.translate(x, y); ctx.rotate(c.rot || 0); ctx.scale(sc, sc);
  ctx.beginPath(); ctx.ellipse(0, 0, rad[0], rad[1], 0, 0, TAU); ctx.fillStyle = 'rgba(226,170,200,.75)'; ctx.fill();
  // detail: 1.2px screen-space mauve rim. lineWidth is divided by the cell scale, same as the bridge.
  if (opt && opt.cytoOutline) { ctx.strokeStyle = 'rgba(176,122,154,.88)'; ctx.lineWidth = 1.2 / sc; ctx.stroke(); }
  ctx.fillStyle = 'rgba(167,105,159,.38)'; ctx.fill(p.granules);
  ctx.strokeStyle = '#9273A5'; ctx.lineWidth = bridge / sc; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(p.bridges);
  ctx.fillStyle = '#51336F'; ctx.fill(p.lobes);
  ctx.fillStyle = '#3F2A66'; ctx.fill(p.clumps);
  ctx.restore();
}
const mesh = new Path2D();
for (let i = 0; i < 140; i++) {
  const x = -430 + R() * 860, y = 270 + R() * 110, l = 20 + R() * 65, a = (R() - .5) * 2.4;
  for (let w = 0; w < 3; w++) {
    mesh.moveTo(x, y + w * 1.5); mesh.bezierCurveTo(x + l * .3, y - 12 + w * 2, x + l * .6, y + Math.sin(a) * l, x + l, y + Math.sin(a) * l + w * 2);
    mesh.moveTo(x + l * .5, y + Math.sin(a) * l * .4); mesh.quadraticCurveTo(x + l * .7, y - 12, x + l * .85, y - 16 - R() * 15);
  }
}
// detail: 140 fine strands. Coarse 60 stay in he.js (ratio ~60:140).
export function fibrinMesh(ctx, k) { ctx.save(); ctx.globalAlpha *= k; ctx.strokeStyle = '#C66D92'; ctx.lineWidth = .55; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(mesh); ctx.restore(); }

// detail: early-plate vessels. Double wall, no Zahn bands (those are thrombosed vessels on the later plate).
// detail: RBC rx uses 5 in place of the old 3.1, so diameter ~10 against a neutrophil cytoplasm of ~14–21 (≈1.5×).
const VR = rng(40717);
function blobRing(cx, cy, rx, ry, seed, amp) {
  const p = new Path2D(), n = 22;
  for (let i = 0; i <= n; i++) {
    const a = i / n * TAU, f = 1 + amp * (noise2(Math.cos(a) * 1.3 + seed, Math.sin(a) * 1.3 + seed * .7) - .5) * 2;
    const x = cx + Math.cos(a) * rx * f, y = cy + Math.sin(a) * ry * f;
    i ? p.lineTo(x, y) : p.moveTo(x, y);
  }
  p.closePath(); return p;
}
let VCACHE = null;
function buildVessels(vessels) {
  return vessels.map((v, i) => {
    const x = v[0], y = v[1], vr = v[2];
    const outer = blobRing(x, y, vr * 1.14, vr * .9, i * 3.1, .1);
    const inner = blobRing(x, y, vr * .78, vr * .62, i * 3.1 + 1.7, .08);
    const clip = blobRing(x, y, vr * .7, vr * .54, i * 3.1 + .4, .06);
    const nuclei = new Path2D(), nn = 4 + Math.floor(VR() * 3);
    for (let k = 0; k < nn; k++) {
      const a = VR() * TAU;
      ellipse(nuclei, x + Math.cos(a) * vr * 1.02, y + Math.sin(a) * vr * .8, 2.6, .65, a + 1.57);
    }
    const discs = [], n = 3 + Math.floor(VR() * 3);
    for (let k = 0; k < n; k++) {
      const a = VR() * TAU, rad = Math.sqrt(VR()) * .62;
      const px = x + Math.cos(a) * vr * .48 * rad, py = y + Math.sin(a) * vr * .36 * rad;
      const rx = 5 * (.72 + VR() * .6), ry = rx * (.36 + VR() * .4), ang = VR() * TAU;
      const disc = new Path2D(), pale = new Path2D();
      ellipse(disc, px, py, rx, ry, ang); ellipse(pale, px, py, rx * .46, ry * .38, ang);
      discs.push({ disc, pale, lysed: VR() < .25, alpha: .55 + VR() * .4 });
    }
    return { outer, inner, clip, nuclei, discs };
  });
}
export function drawVessels(ctx, vessels) {
  if (!VCACHE) VCACHE = buildVessels(vessels);
  const base = ctx.globalAlpha;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const w of VCACHE) {
    ctx.save(); ctx.clip(w.clip);
    for (const d of w.discs) {
      ctx.globalAlpha = base * d.alpha * (d.lysed ? .35 : 1);
      ctx.fillStyle = d.lysed ? '#C9A4AC' : '#A8404E'; ctx.fill(d.disc);
      if (!d.lysed) { ctx.strokeStyle = '#7E2A38'; ctx.lineWidth = .28; ctx.stroke(d.disc); ctx.fillStyle = '#C9A8AE'; ctx.fill(d.pale); }
    }
    ctx.restore();
    ctx.globalAlpha = base;
    // detail: outer wall 1.45 in hema so it reads on eosin; inner wall 0.85. Stamp path keeps the single 2.2 outline.
    ctx.strokeStyle = '#6B4C9A'; ctx.lineWidth = 1.45; ctx.stroke(w.outer);
    ctx.strokeStyle = '#D98BA8'; ctx.lineWidth = .85; ctx.stroke(w.inner);
    ctx.fillStyle = '#6B4C9A'; ctx.fill(w.nuclei);
  }
  ctx.restore();
}
