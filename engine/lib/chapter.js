// Small shared helpers for chapter authors.
import { C, FONT } from './tokens.js';
import { label } from './ann.js';
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const e3 = k => 1 - Math.pow(1 - clamp(k), 3);
export const win = (t, a, b) => e3((t - a) / (b - a));        // eased 0→1 between a and b
export const fade = (t, a, b, c, d) => Math.min(win(t, a, b), 1 - win(t, c, d));
// chapter title block (top-left): fades in at chapter start, out after `hold` seconds
export function titleBlock(ctx, t, t0, chap, title, hold = 6) { const k = fade(t, t0, t0 + .8, t0 + hold, t0 + hold + 1); if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = k; label(ctx, title, 140, 150, { size: 56, w: 700 }); ctx.fillStyle = C.red; ctx.fillRect(140, 190, 72 * k, 5);
  label(ctx, chap, 140, 226, { size: 22, alpha: .6 }); ctx.restore(); }
