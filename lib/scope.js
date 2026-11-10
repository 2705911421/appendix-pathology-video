// Microscope viewing style (mood_v2). Used ONLY while the story looks through the eyepiece (03 → 04 → 05 entry).
// - Surround: neutral near-black outside the bright H&E field (no new hue).
// - Pointer: a FIXED eyepiece needle (a selected viewing style; not every microscope has one). It never moves with
//   the narration — the STAGE (field offset `off`) and magnification move so the structure lands under its tip.
//   Dynamic teaching arrows stay ink/vermilion with arrowheads; the pointer is a headless tapered black needle.
import { clamp } from './motion.js';
export const SCOPE_BLACK = '#111114';
export const LIGHT_INK = '#EFE8DC';                 // warm light for annotations on the dark surround
const sm = (t, a, b) => { const k = clamp((t - a) / (b - a)); return k * k * (3 - 2 * k); };
/** 0..1: how much we are "inside the eyepiece". In with the 03 eyepiece opening, out with the 05 lens leaving. */
export function scopeAt(t, T) {
  if (T.S.length < 15) return 0;
  if (t < T.at(14)) return sm(t, T.at(7, .08), T.frac(7, .80));
  return 1 - sm(t, T.at(14), T.frac(14, .35));
}
/** Near-black surround with a circular hole. hole ≥ L.r keeps the field stop visible; iris effect when hole > L.r. */
export function drawSurround(ctx, L, k, hole = L.r + 10) {
  if (k <= 0) return; ctx.save(); ctx.globalAlpha *= k; ctx.fillStyle = SCOPE_BLACK;
  ctx.beginPath(); ctx.rect(-60, -60, 2040, 1200); ctx.arc(L.x, L.y, Math.max(1, hole), 0, Math.PI * 2, true); ctx.fill('evenodd'); ctx.restore();
}
// Pointer geometry relative to the lens: enters from the right field stop, tip slightly right of centre.
export const POINTER = { ang: -0.18, tip: 0.12 };   // ang: base direction (rad, screen); tip: tip distance from centre / r (on the right)
export const pointerTip = L => [L.x + L.r * POINTER.tip, L.y];
/** Field offset that places field point g (field units) under the pointer tip for lens L at magnification fs. */
export const offFor = (L, g, fs) => [g[0] - POINTER.tip * 420 / fs, g[1]];
export function drawPointer(ctx, L, k) {
  if (k <= 0 || L.r < 20) return; const tip = pointerTip(L), a = POINTER.ang;
  const base = [L.x + Math.cos(a) * L.r * 1.02, L.y + Math.sin(a) * L.r * 1.02], dx = tip[0] - base[0], dy = tip[1] - base[1], l = Math.hypot(dx, dy), n = [-dy / l, dx / l];
  ctx.save(); ctx.beginPath(); ctx.arc(L.x, L.y, L.r, 0, Math.PI * 2); ctx.clip(); ctx.globalAlpha *= k * .93; ctx.fillStyle = SCOPE_BLACK;
  const w0 = Math.max(3.5, L.r * .016);
  ctx.beginPath(); ctx.moveTo(base[0] + n[0] * w0, base[1] + n[1] * w0); ctx.lineTo(tip[0] + n[0] * .7, tip[1] + n[1] * .7); ctx.lineTo(tip[0] - n[0] * .7, tip[1] - n[1] * .7); ctx.lineTo(base[0] - n[0] * w0, base[1] - n[1] * w0); ctx.closePath(); ctx.fill();
  ctx.restore();
}
export { sm as smooth };
