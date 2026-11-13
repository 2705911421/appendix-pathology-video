// Lane open · intro/closing drawing helpers.
// Paper, the three observation colours, hairline tags and the valueless compass.
// Nothing here invents numbers, letters or ticks: the compass carries colour only.
import {bake, drawWash} from '../lib/wash.js';
import {C, FONT} from '../lib/tokens.js';

export const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
export const clamp = v => Math.max(0, Math.min(1, v));
export const mix = (a, b, t) => a + (b - a) * t;
export const mixPt = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t)];

export const RED = '#D6453A';
export const YEL = '#8A6B34';
export const BLK = '#2E2033';
export const VIO = '#A38AB5';

let prepped = false;
export function prepareBlooms() {
  if (prepped) return; prepped = true;
  // First bake keeps the shared 2.4 brush scale; the rest pass 1 (scaleBrushes multiplies).
  bake('open.redT', (b, P) => {
    P.fill(b, P.blob(-120, -70, 250, 38, .34, 711), '#D6453A', 210, .55, [.36, .46]);
    P.fill(b, P.blob(150, 60, 220, 42, .40, 712), '#C0302C', 195, .50, [.36, .46]);
    P.fill(b, P.blob(0, 190, 190, 34, .36, 713), '#E15A48', 175, .50, [.36, .46]);
  }, {seed: 71, size: 1024, soft: true, grain: .12, edge: .25, bleed: .6, scale: 2.4});
  bake('open.yelT', (b, P) => {
    P.fill(b, P.blob(-110, -80, 250, 38, .34, 721), '#CDB98A', 210, .58, [.36, .46]);
    P.fill(b, P.blob(160, 40, 215, 42, .40, 722), '#C2A868', 195, .52, [.36, .46]);
    P.fill(b, P.blob(-20, 200, 185, 32, .36, 723), '#DAC79C', 175, .52, [.36, .46]);
  }, {seed: 72, size: 1024, soft: true, grain: .12, edge: .25, bleed: .6, scale: 1});
  bake('open.blkT', (b, P) => {
    P.fill(b, P.blob(-120, -60, 245, 40, .34, 731), '#2E2033', 205, .58, [.36, .46]);
    P.fill(b, P.blob(150, 70, 210, 42, .40, 732), '#1D1424', 190, .55, [.36, .46]);
    P.fill(b, P.blob(-10, 200, 180, 32, .36, 733), '#4A3556', 170, .52, [.36, .46]);
  }, {seed: 73, size: 1024, soft: true, grain: .12, edge: .25, bleed: .6, scale: 1});
}

export function text(c, s, x, y, size = 30, weight = 500, col = C.ink, alpha = 1) {
  c.save(); c.globalAlpha *= alpha; c.fillStyle = col;
  c.font = `${weight} ${size}px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillText(s, x, y); c.restore();
}

export function measure(c, s, size, weight = 500) {
  c.save(); c.font = `${weight} ${size}px ${FONT}`; const w = c.measureText(s).width; c.restore(); return w;
}

// Multi-colour line: parts = [[string, colour, weight?], …]. Reveal by k and a small rise.
export function rich(c, parts, x, y, size, alpha = 1, k = 1, rise = 0) {
  if (alpha <= 0 || k <= 0) return 0;
  c.save(); c.globalAlpha *= alpha; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  let xx = x; const total = parts.reduce((n, p) => n + measure(c, p[0], size, p[2] || 500), 0);
  c.beginPath(); c.rect(x - 6, y - size * 1.25 + rise, (total + 12) * k, size * 1.7); c.clip();
  for (const [s, col, w = 500] of parts) { c.font = `${w} ${size}px ${FONT}`; c.fillStyle = col; c.fillText(s, xx, y + rise); xx += measure(c, s, size, w); }
  c.restore(); return total;
}

// Hairline tag: pale-violet text, one 1.6px leader, no frame.
export function tag(c, s, x, y, ax, ay, {alpha = 1, size = 30, col = VIO, side = 1} = {}) {
  if (alpha <= 0) return;
  const w = measure(c, s, size, 500);
  text(c, s, x, y, size, 500, col, alpha);
  c.save(); c.globalAlpha *= alpha; c.strokeStyle = col; c.lineWidth = 1.6; c.lineCap = 'round';
  const sx = side > 0 ? x + w + 6 : x - 6, sy = y - 10;
  c.beginPath(); c.moveTo(sx, sy); c.lineTo(ax, ay); c.stroke();
  c.fillStyle = col; c.beginPath(); c.arc(ax, ay, 3.4, 0, 7); c.fill(); c.restore();
}

// Soft watercolour disc (texture tile scaled to `size`) — used for the three colours.
export function bloom(c, key, x, y, size, alpha = 1, rot = 0) {
  if (alpha <= 0) return;
  drawWash(c, key, x, y, size, {alpha, rot, blend: 'multiply', soft: .5});
}

// Annulus sector. Built on a scratch canvas (paper, multiply the wash, keep the
// sector) and stamped back. A clip() on the main canvas is empty the first
// time llvmpipe presents the frame, so the sectors would drop out.
const sectorScratch = { cv: null, side: 0 };
export function sectorWash(c, key, cx, cy, rIn, rOut, a0, a1, alpha = 1, tex = 1100) {
  if (alpha <= 0 || a1 <= a0) return;
  const side = Math.ceil(rOut * 2 + 4);
  if (!sectorScratch.cv || sectorScratch.side !== side) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = side;
    sectorScratch.cv = cv;
    sectorScratch.side = side;
  }
  const g = sectorScratch.cv.getContext('2d');
  const mid = side / 2;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#F4EFE6';
  g.fillRect(0, 0, side, side);
  bloom(g, key, mid, mid, tex, 1, .2);
  g.globalCompositeOperation = 'destination-in';
  g.beginPath();
  g.arc(mid, mid, rOut, a0, a1);
  g.arc(mid, mid, rIn, a1, a0, true);
  g.closePath();
  g.fill();
  c.save();
  c.globalAlpha *= alpha;
  c.globalCompositeOperation = 'source-over';
  c.drawImage(sectorScratch.cv, cx - mid, cy - mid);
  c.restore();
}
