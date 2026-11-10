// Alive surface — opt-in pigment life for gross / figure / vessel washes.
// 活体表面 — 大体标本、人体示意、血管示意的可选呼吸。默认关闭：不传 alive 时与 drawWash 逐像素相同。
//
// SCIENCE RULE / 科学规则: enable ONLY on gross specimens (大体标本), body/figure schematics (人体示意), and the ch05 vessel schematic (血管示意). NEVER on H&E microscope fields — fixed, stained, dead tissue must not breathe. Microscope dynamism = camera push/pull and focus only (镜下只允许推拉镜头与对焦).
//
// detail: every sample is a pure function of t. Phases come from motion.hash; a slow fbm term keeps the Lissajous from closing. No Math.random, Date, or frame-to-frame pixel state.
// detail: the warn-once Set only dedups console output. It is not read by the transform.
import { hash, fbm } from './motion.js';
import { drawWash } from './wash.js';

export const ALIVE_KINDS = Object.freeze(['gross', 'figure', 'vessel']);

const TAU = Math.PI * 2;
const PHI = (1 + Math.sqrt(5)) / 2; // detail: irrational, so the two sines on an axis never commensurate.
const warned = new Set();

const ident = () => ({ dx: 0, dy: 0, sx: 1, sy: 1, rot: 0 });

/** True when this call must hit drawWash with the original arguments (pixel-identical). */
function rejected(key, alive) {
  if (alive == null || alive === false || alive.off === true || alive.on === false) return true;
  if (!ALIVE_KINDS.includes(alive.kind)) {
    // detail: once per wash key — a bad kind (he / micro / undefined) draws still, it does not breathe.
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(`[alive] "${key}": kind ${alive.kind === undefined ? 'undefined' : JSON.stringify(alive.kind)} is not in ALIVE_KINDS (${ALIVE_KINDS.join(', ')}); wash left still.`);
    }
    return true;
  }
  // detail: amplitude 0 is identity even for an allowed kind — skip the CTM so the frame matches drawWash.
  return !(+alive.drift || +alive.breathe || +alive.undulate);
}

/**
 * Pigment motion in wash-local units. Amplitudes default to 0 → exactly {dx:0, dy:0, sx:1, sy:1, rot:0}.
 * Disallowed kind (anything outside ALIVE_KINDS, including undefined) is the same identity.
 * @param {number} t seconds
 * @param {{kind?:string, seed?:number, period?:number, drift?:number, breathe?:number, undulate?:number}} [a]
 */
export function aliveXform(t, a = {}) {
  if (!a || !ALIVE_KINDS.includes(a.kind)) return ident();
  const drift = +a.drift || 0, breathe = +a.breathe || 0, undulate = +a.undulate || 0;
  if (!drift && !breathe && !undulate) return ident();
  const seed = a.seed ?? 1, period = a.period ?? 6;
  const ph = i => hash(i, seed | 0) * TAU;

  // detail: drift is a slow Lissajous. Base period ≈ 2.3×period; two incommensurate sines per axis. Weights + fbm sum to 1, so |dx|,|dy| ≤ drift.
  const Td = period * 2.3, w = TAU / Td;
  const fx = fbm(t / Td, 0.13, 3, (seed | 0) + 21) * 2 - 1;
  const fy = fbm(0.13, t / Td, 3, (seed | 0) + 22) * 2 - 1;
  const dx = drift * (0.58 * Math.sin(w * t + ph(1)) + 0.32 * Math.sin(w * PHI * t + ph(2)) + 0.10 * fx);
  const dy = drift * (0.55 * Math.sin(w * Math.SQRT2 * t + ph(3)) + 0.35 * Math.sin(w * PHI * PHI * t + ph(4)) + 0.10 * fy);

  // detail: edge breathing — sx and sy share the amplitude but not the period or the phase, so the outline crawls instead of pulsing as a circle.
  const sx = 1 + breathe * Math.sin(TAU * t / period + ph(5));
  const sy = 1 + breathe * Math.sin(TAU * t / (period * 1.07) + ph(6));
  const rot = undulate * Math.sin(TAU * t / (period * 1.6) + ph(7));
  return { dx, dy, sx, sy, rot };
}

/**
 * drawWash, plus an optional alive transform.
 * Pass-through (alive null / off / kind not allowed / all amplitudes 0) calls drawWash(ctx, key, x, y, size, washOpt) with the same arguments.
 * Otherwise: position gains the drift (rotated by washOpt.rot into the parent frame, × size/1024), size is × sx,
 * sy is a wash-local scale(1, sy/sx) around that centre, and rotation is washOpt.rot + the undulation.
 * grow / origin / alpha / blend / soft are copied through. `t` rides on `alive.t` (the frame clock).
 */
export function drawAliveWash(ctx, key, x, y, size, washOpt = {}, alive = null) {
  if (rejected(key, alive)) return drawWash(ctx, key, x, y, size, washOpt);
  const xf = aliveXform(alive.t ?? 0, alive);
  const rot0 = washOpt.rot || 0;
  const k = size / 1024, c = Math.cos(rot0), si = Math.sin(rot0);
  // detail: dx,dy are bake pixels (1024). Rotate by the wash's own rot so the crawl stays in the pigment's frame, then scale into the drawn size.
  const cx = x + (xf.dx * c - xf.dy * si) * k;
  const cy = y + (xf.dx * si + xf.dy * c) * k;
  const rot = rot0 + xf.rot;
  const sx = xf.sx, sy = xf.sy;
  ctx.save();
  // detail: translate / scale(1, sy/sx) / translate back, sandwiched in the wash rotation so a diagonal specimen is not sheared in screen-Y.
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(1, sx === 0 ? 1 : sy / sx);
  ctx.rotate(-rot);
  ctx.translate(-cx, -cy);
  drawWash(ctx, key, cx, cy, size * sx, { ...washOpt, rot });
  ctx.restore();
}

// detail: subtle on purpose. grossSpecimen.breathe .012 and period 3.7 match the old ch02 `1 + .012*sin(t*1.7)` (2π/1.7 ≈ 3.70).
export const ALIVE_PRESETS = Object.freeze({
  grossSpecimen: Object.freeze({ kind: 'gross', breathe: .012, drift: 3, undulate: .004, period: 3.7 }),
  figureLesion: Object.freeze({ kind: 'figure', breathe: .02, drift: 2, undulate: .006, period: 4.5 }),
  vesselSchematic: Object.freeze({ kind: 'vessel', breathe: .008, drift: 1.5, undulate: 0, period: 5 }),
});
