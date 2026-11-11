// Subtitle component: bottom safe area, dark ink text + thin paper-coloured halo (no black stroke, no box).
// Long sentences auto-split into ≤18-char lines at punctuation; each line timed by its share of characters.
import { C, FONT, SAFE } from './tokens.js';
export const MAX = 18;
export const ACCENT = ['急性蜂窝织炎性阑尾炎', '急性阑尾炎', '化脓性炎', '中性粒细胞', '右下腹', '肚脐周围', '脓苔', '脓液', '纤维素', '炎症', '麦氏点'];
const BREAK = /([，。；：？！、]|——)/;
const visLen = s => [...s.replace(/[“”"]/g, '')].length; // quotes don't count toward width budget much
export function split(text) {
  const parts = []; let buf = '';
  for (const tok of text.split(BREAK).filter(Boolean)) { if (BREAK.test(tok) && tok.length <= 2) { buf += tok; parts.push(buf); buf = ''; } else buf += tok; }
  if (buf) parts.push(buf);
  const lines = []; let cur = '';
  for (const p of parts) { if (visLen(cur + p) <= MAX) cur += p; else { if (cur) lines.push(cur); cur = p; } }
  if (cur) lines.push(cur);
  const out = []; for (const l of lines) { if (visLen(l) <= MAX) out.push(l); else { const a = [...l]; for (let i = 0; i < a.length; i += MAX) out.push(a.slice(i, i + MAX).join('')); } }
  return out.map(l => l.replace(/[，。；、]+$/, '')); // drop trailing soft punctuation on screen
}
const cache = new Map();
export function linesFor(s) { if (!cache.has(s.i)) { const ls = split(s.text), n = ls.reduce((a, l) => a + [...l].length, 0); let t = s.start;
  cache.set(s.i, ls.map(l => { const d = (s.end - s.start) * [...l].length / n, o = { text: l, start: t, end: t + d }; t += d; return o; })); } return cache.get(s.i); }
export function draw(ctx, S, t, dark = 0) {
  const s = S.find(s => t >= s.start && t < s.end); if (!s) return; const l = linesFor(s).find(l => t >= l.start && t < l.end); if (!l) return;
  const a = Math.min(1, (t - l.start) / .12, (l.end - t) / .08);
  ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.font = `500 44px ${FONT}`; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  // rich segments (accent terms)
  const segs = []; let rest = l.text;
  while (rest) { let best = null; for (const w of ACCENT) { const j = rest.indexOf(w); if (j >= 0 && (!best || j < best.j || (j === best.j && w.length > best.w.length))) best = { j, w }; }
    if (!best) { segs.push([rest, 0]); break; } if (best.j) segs.push([rest.slice(0, best.j), 0]); segs.push([best.w, 1]); rest = rest.slice(best.j + best.w.length); }
  const wsum = segs.reduce((a, [s]) => a + ctx.measureText(s).width, 0); let x = 960 - wsum / 2;
  for (const pass of [0, 1]) { let xx = x; for (const [s, acc] of segs) { const w = ctx.measureText(s).width;
      const halo = dark > .5 ? '17,17,20' : '244,239,230';
      if (pass === 0) { ctx.shadowColor = `rgba(${halo},.9)`; ctx.shadowBlur = 10; ctx.lineWidth = 6; ctx.strokeStyle = `rgba(${halo},.82)`; ctx.strokeText(s, xx, SAFE.subY); ctx.shadowColor = 'transparent'; }
      else { ctx.fillStyle = acc ? C.red : (dark > .5 ? '#EFE8DC' : C.ink); ctx.fillText(s, xx, SAFE.subY); } xx += w; } }
  ctx.restore(); return l.text;
}
export function safeFade(ctx, paper = C.paper, dark = 0) { const g = ctx.createLinearGradient(0, SAFE.fadeTop, 0, SAFE.fadeTop + 100); g.addColorStop(0, dark > 0 ? 'rgba(17,17,20,0)' : 'rgba(244,239,230,0)'); g.addColorStop(1, paper); ctx.fillStyle = g; ctx.fillRect(0, SAFE.fadeTop, 1920, 1080 - SAFE.fadeTop); }
