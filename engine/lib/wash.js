// p5.brush watercolour — PATHOLOGY layer only (redness, blood, exudate, pus, HE stain).
// Washes are BAKED once at load time with a fixed seed into offscreen canvases, then composited per frame
// (scale / alpha / radial-mask growth). This removes edge shimmer and makes frames fast + deterministic.
import { C } from './tokens.js';
import { fbm, hash } from './motion.js';
const baked = new Map(); let P5 = null, SIZE = 1024;
export function initBaker() { return new Promise(res => { new p5(p => { P5 = p; brush.instance(p);
  p.setup = () => { p.createCanvas(SIZE, SIZE, p.WEBGL); p.pixelDensity(1); p.noLoop(); res(); }; p.draw = () => {}; }, document.createElement('div')); }); }
// recipe(b, P): draw in local coords with origin at canvas centre, ±SIZE/2. b = brush api, P = helpers
export function bake(key, recipe, { seed = 1, scale = 2.4, keepWhite = false, hd = false, size, grain = 0, edge = 0, bleed = 0, soft = false } = {}) {   // keepWhite: skip colour-to-alpha (pale pigments over dark washes)
  // detail: p5.brush buffers stay bound to the original 1024 canvas; only 2D output is resized.
  const bakeSize = size === undefined ? (hd ? 2048 : SIZE) : Math.max(1, Math.round(size));
  const p = P5;
  p.clear(); p.randomSeed(seed); p.noiseSeed(seed); if (brush.seed) brush.seed(seed);
  brush.scaleBrushes(scale);
  recipe(brush, helpers); brush.reDraw && brush.reDraw();
  const cv = document.createElement('canvas'); cv.width = SIZE; cv.height = SIZE; const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(p.canvas, 0, 0);
  // colour-to-alpha against white: brush paper-texture speckle (near-white) becomes transparent, pigment keeps its density
  const im = cx.getImageData(0, 0, SIZE, SIZE), d = im.data;
  // detail: leave the legacy conversion byte-for-byte intact unless an effect is requested.
  if (soft || grain || edge || bleed) {
    detailWash(d, SIZE, key, { keepWhite, soft, grain: hd ? 0 : grain, edge, bleed });
  } else if (!keepWhite) for (let i = 0; i < d.length; i += 4) { const a = d[i + 3] / 255; if (!a) continue; const m = Math.max(255 - d[i], 255 - d[i + 1], 255 - d[i + 2]) / 255; const na = m * a; if (na < .02) { d[i + 3] = 0; continue; }
    for (let c = 0; c < 3; c++) d[i + c] = 255 - (255 - d[i + c]) * a / na; d[i + 3] = na * 255; }
  if (!keepWhite || soft || grain || edge || bleed) cx.putImageData(im, 0, 0);
  let output = cv;
  if (hd || bakeSize !== SIZE) {
    // detail: interpolate processed RGBA, never the brush canvas or its recipe coordinates.
    output = document.createElement('canvas'); output.width = output.height = bakeSize;
    const out = output.getContext('2d', { willReadFrequently: true });
    out.imageSmoothingEnabled = true; out.imageSmoothingQuality = 'high';
    out.drawImage(cv, 0, 0, bakeSize, bakeSize);
    if (hd) {
      const enlarged = out.getImageData(0, 0, bakeSize, bakeSize);
      finishHD(enlarged.data, bakeSize, key, grain); out.putImageData(enlarged, 0, 0);
    }
  }
  baked.set(key, output); return output;
}
// detail: separable scalar filters, with transparent padding; all radii use 1024-unit pixels.
function filterPlane(src, n, radius, dilate = false) {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length), width = 2 * radius + 1;
  for (let axis = 0; axis < 2; axis++) {
    const input = axis ? tmp : src, output = axis ? out : tmp;
    for (let row = 0; row < n; row++) {
      let sum = 0;
      for (let j = -radius; j <= radius; j++) if (j >= 0 && j < n) sum += input[axis ? j * n + row : row * n + j];
      for (let col = 0; col < n; col++) {
        const i = axis ? col * n + row : row * n + col;
        if (dilate) {
          let max = 0;
          for (let j = Math.max(0, col - radius); j <= Math.min(n - 1, col + radius); j++) max = Math.max(max, input[axis ? j * n + row : row * n + j]);
          output[i] = max;
        } else output[i] = sum / width;
        const lo = col - radius, hi = col + radius + 1;
        if (lo >= 0) sum -= input[axis ? lo * n + row : row * n + lo];
        if (hi < n) sum += input[axis ? hi * n + row : row * n + hi];
      }
    }
  }
  return out;
}
function detailWash(d, n, key, { keepWhite, soft, grain, edge, bleed }) {
  const unit = n / SIZE, count = n * n, alpha = new Float32Array(count);
  let seed = 0; for (let i = 0; i < key.length; i++) seed = (hash(key.charCodeAt(i), seed) * 4294967296) | 0;
  for (let j = 0; j < count; j++) {
    const i = j * 4, a = d[i + 3] / 255;
    const na = keepWhite ? a : a * Math.max(255 - d[i], 255 - d[i + 1], 255 - d[i + 2]) / 255;
    if (!keepWhite && na) for (let c = 0; c < 3; c++) d[i + c] = 255 - (255 - d[i + c]) * a / (soft ? Math.max(na, .05) : na);
    const k = Math.max(0, Math.min(1, (na - .008) / (.05 - .008)));
    alpha[j] = soft ? na * k * k * (3 - 2 * k) : (keepWhite || na >= .02 ? na : 0);
  }
  const radius = Math.max(1, Math.round(unit)), bleedRadius = Math.ceil(3 * Math.min(1, Math.max(0, bleed)) * unit);
  let result = soft ? filterPlane(alpha, n, radius) : alpha.slice();
  // detail: keepWhite softening preserves existing pigment RGB; only empty pixels borrow weighted colour.
  // detail: extend interior pigment into newly softened/bled pixels using alpha-weighted colour.
  if (soft || bleed) {
    const reach = Math.max(radius, bleedRadius), weight = filterPlane(alpha, n, reach);
    for (let c = 0; c < 3; c++) {
      const plane = new Float32Array(count);
      for (let j = 0; j < count; j++) plane[j] = d[j * 4 + c] * alpha[j];
      const colour = filterPlane(plane, n, reach);
      for (let j = 0; j < count; j++) if ((keepWhite ? alpha[j] === 0 : alpha[j] < .05) && weight[j] > 0) d[j * 4 + c] = colour[j] / weight[j];
    }
  }
  if (bleedRadius) {
    const dilated = filterPlane(result, n, bleedRadius, true);
    const inner = bleedRadius > 1 ? filterPlane(result, n, bleedRadius - 1, true) : result;
    for (let j = 0; j < count; j++) {
      const x = (j % n) / unit, y = Math.floor(j / n) / unit;
      const modulation = fbm(x / 18, y / 18, 2, seed + 17);
      const spread = inner[j] + (dilated[j] - inner[j]) * modulation;
      result[j] += Math.max(0, spread - result[j]) * .25 * Math.min(1, bleed);
    }
  }
  const blurred = edge ? filterPlane(result, n, Math.max(1, Math.round(4 * unit))) : null;
  for (let j = 0; j < count; j++) {
    const i = j * 4, x = (j % n) / unit, y = Math.floor(j / n) / unit;
    if (edge) { const k = Math.min(1, Math.max(0, result[j] - blurred[j]) * 4), dark = Math.max(0, 1 - edge * k); for (let c = 0; c < 3; c++) d[i + c] *= dark; }
    const noise = grain && result[j] > 0 ? .65 * fbm(x / 3, y / 3, 2, seed) + .35 * fbm(x / 18, y / 18, 2, seed + 7) : 0;
    d[i + 3] = result[j] * Math.max(0, 1 - grain * noise) * 255;
  }
}
// detail: grain uses final pixels (3px / 18px at 2048); sharpening touches alpha only.
function finishHD(d, n, key, grain) {
  let seed = 0; for (let i = 0; i < key.length; i++) seed = (hash(key.charCodeAt(i), seed) * 4294967296) | 0;
  const unit = n / 2048;
  for (let j = 0; j < n * n; j++) {
    const i = j * 4, a = d[i + 3] / 255;
    if (!a) continue;
    const x = (j % n) / unit, y = Math.floor(j / n) / unit;
    const noise = grain ? .65 * fbm(x / 3, y / 3, 2, seed) + .35 * fbm(x / 18, y / 18, 2, seed + 7) : 0;
    const smooth = a * Math.max(0, 1 - grain * noise);
    const k = Math.max(0, Math.min(1, (smooth - .15) / (.85 - .15)));
    d[i + 3] = .5 * (smooth + k * k * (3 - 2 * k)) * 255;
  }
}
const helpers = {
  blob(cx, cy, r, n = 28, jit = .3, seed = 1) { let s = seed * 9301 + 49297; const R = () => ((s = (s * 16807) % 2147483647) / 2147483647); const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rr = r * (1 + jit * (R() - .5)); o.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); } return o; },
  fill(b, pts, col, alpha, bleed = .25, tex = [.4, .5]) { b.noStroke(); b.fill(col, alpha); b.fillBleed(bleed); b.fillTexture(tex[0], tex[1]); b.polygon(pts); b.noFill(); },
  C,
};
export const get = key => baked.get(key);
// composite a baked wash centred at (x,y) in current ctx coords. size = drawn width in px (1024 baked px → size).
// grow∈[0,1]: radial mask reveal from centre (ink-bleed growth) — no regeneration, no shimmer.
const tmp = document.createElement('canvas'); tmp.width = tmp.height = SIZE; const tctx = tmp.getContext('2d');
export function drawWash(ctx, key, x, y, size, { alpha = 1, grow = 1, rot = 0, origin = [0.5, 0.5], soft = .35, blend = 'multiply' } = {}) {
  const img = baked.get(key); if (!img || alpha <= 0 || grow <= 0) return;
  let src = img;
  if (grow < 1) { const maskSize = img.width;
    // detail: match each bake without resizing the legacy scratch canvas on its usual path.
    if (tmp.width !== maskSize) tmp.width = tmp.height = maskSize;
    tctx.clearRect(0, 0, maskSize, maskSize); tctx.globalCompositeOperation = 'source-over'; tctx.drawImage(img, 0, 0);
    tctx.globalCompositeOperation = 'destination-in'; const ox = origin[0] * maskSize, oy = origin[1] * maskSize, R = maskSize * .75 * grow;
    const g = tctx.createRadialGradient(ox, oy, R * (1 - soft), ox, oy, R + 1); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    tctx.fillStyle = g; tctx.fillRect(0, 0, maskSize, maskSize); tctx.globalCompositeOperation = 'source-over'; src = tmp; }
  ctx.save(); ctx.globalAlpha *= alpha; if (blend) ctx.globalCompositeOperation = blend; ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(src, -size / 2, -size / 2, size, size); ctx.restore();
}
export const BAKE_SIZE = SIZE;
