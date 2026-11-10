// Manim-style ANNOTATION layer: crisp geometry, drawn on top. Every helper takes k∈[0,1] (draw-in progress).
import { C, FONT } from './tokens.js';
// mood_v2 dark-surround mode: ink annotations turn warm-light on the near-black microscope surround (setDark(k)).
// Lines get a thin dark underlay so a light leader that crosses into the bright H&E field still reads there.
let DARK = 0; export const setDark = k => { DARK = Math.max(0, Math.min(1, k || 0)); }; export const darkness = () => DARK;
const INKR = [42, 42, 53], LIT = [239, 232, 220];
const cc = c => (DARK > 0 && c === C.ink) ? `rgb(${INKR.map((v, i) => Math.round(v + (LIT[i] - v) * DARK)).join(',')})` : c;
function under(ctx, w, s, a, e) { if (DARK <= .02) return; ctx.save(); ctx.strokeStyle = 'rgba(17,17,20,' + (.85 * DARK).toFixed(3) + ')'; ctx.lineWidth = (w + 2.6) * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...e); ctx.stroke(); ctx.restore(); }
// detail: reuse the dark underlay's surround colour for opt-in annotation halos.
const haloPaper = () => DARK > .02 ? 'rgb(17,17,20)' : C.paper;
const L = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const px = ctx => 1 / Math.max(1e-3, Math.hypot(ctx.getTransform().a, ctx.getTransform().b)); // keep hairlines constant under camera zoom
export function dashed(ctx, a, b, { k = 1, col = C.ink, w = 2, dash = [10, 9] } = {}) { if (k <= 0) return; col = cc(col); const s = px(ctx);
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w * s; ctx.setLineDash(dash.map(d => d * s)); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...L(a, b, k)); ctx.stroke(); ctx.restore(); }
export function line(ctx, a, b, { k = 1, col = C.ink, w = 2 } = {}) { if (k <= 0) return; const s = px(ctx); under(ctx, w, s, a, L(a, b, k)); col = cc(col); ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w * s; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...L(a, b, k)); ctx.stroke(); ctx.restore(); }
export function tick(ctx, p, dir, { k = 1, len = 12, col = C.ink, w = 2.4 } = {}) { if (k <= 0) return; col = cc(col); const s = px(ctx), n = [-dir[1], dir[0]], l = len * s * k;
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w * s; ctx.beginPath(); ctx.moveTo(p[0] - n[0] * l, p[1] - n[1] * l); ctx.lineTo(p[0] + n[0] * l, p[1] + n[1] * l); ctx.stroke(); ctx.restore(); }
export function arrow(ctx, a, b, { k = 1, col = C.ink, w = 2.4, head = 14 } = {}) { if (k <= 0) return; col = cc(col); const s = px(ctx), e = L(a, b, k), g = Math.atan2(e[1] - a[1], e[0] - a[0]), h = head * s;
  ctx.save(); ctx.strokeStyle = ctx.fillStyle = col; ctx.lineWidth = w * s; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...e); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(...e); ctx.lineTo(e[0] - h * Math.cos(g - .38), e[1] - h * Math.sin(g - .38)); ctx.lineTo(e[0] - h * Math.cos(g + .38), e[1] - h * Math.sin(g + .38)); ctx.closePath(); ctx.fill(); ctx.restore(); }
export function dot(ctx, p, { r = 5, col = C.ink, k = 1 } = {}) { if (k <= 0) return; col = cc(col); const s = px(ctx); ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(...p, r * s * k, 0, 7); ctx.fill(); ctx.restore(); }
export function ring(ctx, p, r, { k = 1, col = C.ink, w = 2.4, dash = null, a0 = -Math.PI / 2 } = {}) { if (k <= 0) return; col = cc(col); const s = px(ctx);
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w * s; if (dash) ctx.setLineDash(dash.map(d => d * s)); ctx.beginPath(); ctx.arc(...p, r, a0, a0 + Math.PI * 2 * k); ctx.stroke(); ctx.restore(); }
// text with Manim "Write" feel: left-to-right wipe + slight rise. size in SCREEN px (independent of zoom).
export function label(ctx, s, x, y, { size = 26, col = C.ink, w = 500, align = 'left', k = 1, alpha = 1, base = 'middle', halo = false, haloW = 5, haloCol = null, track = 0, minSize = 0 } = {}) { if (k <= 0 || alpha <= 0) return; col = cc(col);
  // detail: keep the original text path untouched unless typography is requested.
  size = Math.max(size, minSize);
  const sc = px(ctx); ctx.save(); ctx.font = `${w} ${size * sc}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = base; ctx.globalAlpha *= alpha * Math.min(1, k * 2);
  // detail: spacing is in screen em; scale it with the font under camera zoom.
  const spaced = track !== 0, nativeSpacing = spaced && 'letterSpacing' in ctx, spacing = track * size * sc;
  if (nativeSpacing) ctx.letterSpacing = `${spacing}px`;
  const glyphs = spaced && !nativeSpacing ? Array.from(s) : null;
  const m = glyphs ? glyphs.reduce((n, g) => n + ctx.measureText(g).width, 0) + Math.max(0, glyphs.length - 1) * spacing : ctx.measureText(s).width, x0 = align === 'center' ? x - m / 2 : align === 'right' ? x - m : x;
  ctx.beginPath(); ctx.rect(x0 - 4 * sc, y - size * sc, (m + 8 * sc) * k, size * 2 * sc); ctx.clip(); ctx.fillStyle = col;
  const yy = y + (1 - k) * 6 * sc;
  const text = stroke => {
    if (!glyphs) { if (stroke) ctx.strokeText(s, x, yy); else ctx.fillText(s, x, yy); return; }
    ctx.textAlign = 'left'; let xx = x0;
    for (const g of glyphs) { if (stroke) ctx.strokeText(g, xx, yy); else ctx.fillText(g, xx, yy); xx += ctx.measureText(g).width + spacing; }
  };
  if (halo) { ctx.strokeStyle = haloCol ?? haloPaper(); ctx.lineJoin = 'round'; ctx.lineWidth = haloW * sc; text(true); }
  text(false); ctx.restore(); return m; }
// leader: dot at anchor p, elbow q, shelf to r; label sits on shelf
export function leader(ctx, p, q, r, { k = 1, col = C.ink, elbow = false, endDot = true, halo = false } = {}) { if (k <= 0) return;
  // detail: preserve the original leader (including its dark underlay) by default.
  if (!elbow && endDot && !halo) { col = cc(col); dot(ctx, p, { r: 4, col, k: Math.min(1, k * 3) });
    const k1 = Math.min(1, k * 2), k2 = Math.max(0, k * 2 - 1); line(ctx, p, q, { k: k1, col, w: 1.6 }); if (k2 > 0) line(ctx, q, r, { k: k2, col, w: 1.6 }); return; }
  // detail: cap the diagonal at the available horizontal distance, then run level into q.
  const dx = q[0] - p[0], dy = q[1] - p[1];
  const knee = elbow ? [p[0] + Math.sign(dx || 1) * Math.min(Math.abs(dx), Math.abs(dy)), q[1]] : q;
  const l1 = Math.hypot(knee[0] - p[0], knee[1] - p[1]), l2 = Math.hypot(q[0] - knee[0], q[1] - knee[1]);
  const d = (l1 + l2) * Math.min(1, k * 2), k2 = Math.max(0, k * 2 - 1);
  const pts = [p, L(p, knee, l1 ? Math.min(1, d / l1) : 1)];
  if (d > l1) pts.push(L(knee, q, l2 ? Math.min(1, (d - l1) / l2) : 1));
  if (k2 > 0) pts.push(L(q, r, k2));
  const sc = px(ctx);
  const path = (colour, width) => { ctx.save(); ctx.strokeStyle = colour; ctx.lineWidth = width * sc; ctx.lineJoin = ctx.lineCap = 'round'; ctx.beginPath(); pts.forEach((v, i) => i ? ctx.lineTo(...v) : ctx.moveTo(...v)); ctx.stroke(); ctx.restore(); };
  if (halo) path(haloPaper(), 4);
  else for (let i = 1; i < pts.length; i++) under(ctx, 1.6, sc, pts[i - 1], pts[i]);
  path(cc(col), 1.6);
  if (endDot) dot(ctx, p, { r: 4, col, k: Math.min(1, k * 3) }); }
export function brace(ctx, a, b, { k = 1, col = C.ink, depth = 10, w = 1.6 } = {}) { if (k <= 0) return; col = cc(col); const s = px(ctx), d = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(...d), n = [-d[1] / l * depth * s, d[0] / l * depth * s];
  ctx.save(); ctx.globalAlpha *= k; ctx.strokeStyle = col; ctx.lineWidth = w * s; ctx.beginPath(); ctx.moveTo(a[0] - n[0], a[1] - n[1]); ctx.lineTo(...a); ctx.lineTo(...b); ctx.lineTo(b[0] - n[0], b[1] - n[1]); ctx.stroke(); ctx.restore(); }
export function scalebar(ctx, x, y, pxLen, text, { k = 1, col = C.ink } = {}) { if (k <= 0) return; col = cc(col); line(ctx, [x, y], [x + pxLen, y], { k, col, w: 4 }); label(ctx, text, x + pxLen / 2, y - 16, { size: 18, align: 'center', k, col }); }
// counter: value interpolated & formatted, tabular feel
export function counter(ctx, v, x, y, { fmt = v => v.toFixed(1), unit = '', size = 40, col = C.ink, w = 700, align = 'left', alpha = 1 } = {}) {
  return label(ctx, fmt(v) + unit, x, y, { size, col, w, align, alpha }); }
