// Bilingual subtitle component for the v5 film.
// Sizes, baselines, fade, halo, and colours come from ./config.js.
// English " | " cards play one after another inside the sentence.
// Picture content may extend to y < BAND.safeTop. The live band is the current preset.

import {
  ACTIVE,
  PRESETS,
  resolvePreset,
  CN_SIZE,
  EN_SIZE,
  EN_FLOOR,
  EN_MAX_W,
  MAX,
  WEIGHT_CN,
  WEIGHT_EN,
  BAND,
  FADE,
  HALO,
  PAPER,
  INK,
  ACCENT_RED,
  FONT,
  COLOURS,
} from './config.js';

export {
  ACTIVE,
  PRESETS,
  resolvePreset,
  CN_SIZE,
  EN_SIZE,
  EN_FLOOR,
  EN_MAX_W,
  MAX,
  WEIGHT_CN,
  WEIGHT_EN,
  BAND,
  FADE,
  HALO,
  PAPER,
  INK,
  ACCENT_RED,
  FONT,
  COLOURS,
};

// Approved keyword list. Do not extend it here.
export const ACCENT = ['急性蜂窝织炎性阑尾炎', '急性阑尾炎', '化脓性炎', '中性粒细胞', '右下腹', '肚脐周围', '脓苔', '脓液', '纤维素', '炎症', '麦氏点'];

const BREAK = /([，。；：？！、]|——)/;
const visLen = (s) => [...s.replace(/[“”"]/g, '')].length;

function asPreset(preset) {
  if (!preset) return ACTIVE;
  if (typeof preset === 'string') return resolvePreset(preset);
  return preset;
}

/** Citation marks are not spoken. Removed from drawn Chinese only. */
export function stripCitations(text) {
  return String(text ?? '').replace(/\[\d+\]/g, '');
}

export function split(text) {
  const parts = [];
  let buf = '';
  for (const tok of String(text ?? '').split(BREAK).filter(Boolean)) {
    if (BREAK.test(tok) && tok.length <= 2) {
      buf += tok;
      parts.push(buf);
      buf = '';
    } else buf += tok;
  }
  if (buf) parts.push(buf);
  const lines = [];
  let cur = '';
  for (const p of parts) {
    if (visLen(cur + p) <= MAX) cur += p;
    else {
      if (cur) lines.push(cur);
      cur = p;
    }
  }
  if (cur) lines.push(cur);
  const out = [];
  for (const l of lines) {
    if (visLen(l) <= MAX) out.push(l);
    else {
      const a = [...l];
      for (let i = 0; i < a.length; i += MAX) out.push(a.slice(i, i + MAX).join(''));
    }
  }
  return out.map((l) => l.replace(/[，。；、]+$/, ''));
}

const lineCache = new Map();

export function linesFor(s) {
  const src = stripCitations(s.text);
  const key = `${s.i}|${s.start}|${s.end}|${src}`;
  if (lineCache.has(key)) return lineCache.get(key);
  const ls = split(src).filter((l) => l.length);
  const span = s.end - s.start;
  const n = ls.reduce((a, l) => a + [...l].length, 0);
  let out;
  if (!ls.length || n <= 0 || !(span > 0)) {
    out = [{ text: ls[0] || src, start: s.start, end: s.end }];
  } else {
    let t = s.start;
    out = ls.map((text, i) => {
      const d = span * [...text].length / n;
      const o = { text, start: t, end: i === ls.length - 1 ? s.end : t + d };
      t += d;
      return o;
    });
    out[out.length - 1].end = s.end;
  }
  lineCache.set(key, out);
  return out;
}

/** One card string per sequential English line. Prefers englishCards, else splits en on " | ". */
export function rawCards(s) {
  if (s && Array.isArray(s.englishCards) && s.englishCards.length) {
    return s.englishCards.map((c) => String(c).trim()).filter(Boolean);
  }
  const en = s && s.en != null ? String(s.en).trim() : '';
  if (!en) return [];
  if (en.includes(' | ')) return en.split(' | ').map((c) => c.trim()).filter(Boolean);
  return [en];
}

const cardCache = new Map();

/** Time-share cards by character count across the sentence. Independent of Chinese wraps. */
export function cardsFor(s) {
  const cards = rawCards(s);
  const key = `${s.i}|${s.start}|${s.end}|${cards.join('\u0001')}`;
  if (cardCache.has(key)) return cardCache.get(key);
  if (!cards.length) {
    cardCache.set(key, []);
    return [];
  }
  const span = s.end - s.start;
  const n = cards.reduce((a, c) => a + [...c].length, 0) || cards.length;
  let t = s.start;
  const out = cards.map((text, i) => {
    const d = span * ([...text].length || 1) / n;
    const o = { text, start: t, end: i === cards.length - 1 ? s.end : t + d };
    t += d;
    return o;
  });
  out[out.length - 1].end = s.end;
  cardCache.set(key, out);
  return out;
}

function itemAlpha(t, item, index, list, xfade) {
  if (xfade) {
    return Math.max(0, Math.min(
      1,
      index === 0 ? (t - item.start) / 0.12 : 1,
      index === list.length - 1 ? (item.end - t) / 0.08 : 1,
    ));
  }
  return Math.max(0, Math.min(1, (t - item.start) / 0.12, (item.end - t) / 0.08));
}

const enCache = new Map();
const overflowLog = [];
const overflowSeen = new Set();

function fitEnglish(ctx, text, style) {
  const key = `${style.id}\u0000${text}`;
  let rec = enCache.get(key);
  if (!rec) {
    ctx.save();
    let size = style.enSize;
    let width = 0;
    for (;;) {
      ctx.font = `${style.weightEn} ${size}px ${style.font}`;
      width = ctx.measureText(text).width;
      if (width <= style.enMaxW || size <= style.enFloor) break;
      size -= 1;
    }
    rec = { size, width, overflow: width > style.enMaxW };
    enCache.set(key, rec);
    ctx.restore();
  }
  return rec;
}

/**
 * Fit one English card. Shrinks from EN_SIZE to EN_FLOOR. Never wraps.
 * A cue whose `en` still contains " | " is measured per card; the worst card is returned.
 * Pass a preset id or object to measure something other than the live default.
 */
export function measureEnglish(ctx, s, preset = ACTIVE) {
  const style = asPreset(preset);
  const list = rawCards(s || {});
  if (!list.length) return { size: style.enSize, width: 0, overflow: false };
  let worst = null;
  list.forEach((text, k) => {
    const rec = fitEnglish(ctx, text, style);
    const seen = `${style.id}:${s && s.i != null ? s.i : ''}:${k}:${text}`;
    if (rec.overflow && style.id === ACTIVE.id && !overflowSeen.has(seen)) {
      overflowSeen.add(seen);
      overflowLog.push({ i: s && s.i, id: s && s.id, text, width: rec.width, maxWidth: style.enMaxW, size: rec.size });
    }
    if (!worst || (rec.overflow && !worst.overflow) || rec.size < worst.size || (rec.size === worst.size && rec.width > worst.width)) {
      worst = rec;
    }
  });
  return worst;
}

export function consumeOverflow() {
  return overflowLog.slice();
}

function findCue(cues, t) {
  if (!cues) return null;
  for (let i = 0; i < cues.length; i++) {
    const s = cues[i];
    if (t >= s.start && t < s.end) return s;
  }
  return null;
}

function accentSegments(text) {
  const segs = [];
  let rest = text;
  while (rest) {
    let best = null;
    for (const w of ACCENT) {
      const j = rest.indexOf(w);
      if (j >= 0 && (!best || j < best.j || (j === best.j && w.length > best.w.length))) best = { j, w };
    }
    if (!best) {
      segs.push([rest, 0]);
      break;
    }
    if (best.j) segs.push([rest.slice(0, best.j), 0]);
    segs.push([best.w, 1]);
    rest = rest.slice(best.j + best.w.length);
  }
  return segs;
}

// Interpolate one glyph pass: no duplicated text or threshold switch.
function mixColour(a, b, t) {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const rgb = c => c.startsWith('#') ? c.slice(1).match(/../g).map(x => parseInt(x,16)) : c.split(',').map(Number);
  return `rgb(${rgb(a).map((v,i) => Math.round(v+(rgb(b)[i]-v)*t)).join(',')})`;
}
function haloRgb(style, dark) {
  if (dark <= 0) return style.colours.paperRgb;
  if (dark >= 1) return style.colours.darkRgb;
  return style.colours.paperRgb.split(',').map((v,i) => Math.round(+v+(+style.colours.darkRgb.split(',')[i]-v)*dark)).join(',');
}

function paintHalo(ctx, style, dark) {
  const rgb = haloRgb(style, dark);
  ctx.shadowColor = `rgba(${rgb},${style.halo.shadowAlpha})`;
  ctx.shadowBlur = style.halo.blur;
  ctx.lineWidth = style.halo.stroke;
  ctx.strokeStyle = `rgba(${rgb},${style.halo.strokeAlpha})`;
  ctx.lineJoin = 'round';
}

function paintChinese(ctx, text, dark, alpha, style) {
  if (!text || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${style.weightCn} ${style.cnSize}px ${style.font}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const segs = accentSegments(text);
  const wsum = segs.reduce((a, [sg]) => a + ctx.measureText(sg).width, 0);
  const x = style.frame.cx - wsum / 2;
  for (const pass of [0, 1]) {
    let xx = x;
    for (const [sg, acc] of segs) {
      const w = ctx.measureText(sg).width;
      if (pass === 0) {
        paintHalo(ctx, style, dark);
        ctx.strokeText(sg, xx, style.band.cnY);
        ctx.shadowColor = 'transparent';
      } else {
        ctx.fillStyle = acc ? mixColour(style.colours.accent, style.colours.darkAccent, dark) : mixColour(style.colours.ink, style.colours.darkInk, dark);
        ctx.fillText(sg, xx, style.band.cnY);
      }
      xx += w;
    }
  }
  ctx.restore();
}

function paintEnglish(ctx, text, dark, alpha, style) {
  if (!text || alpha <= 0) return;
  const { size } = fitEnglish(ctx, text, style);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${style.weightEn} ${size}px ${style.font}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  paintHalo(ctx, style, dark);
  ctx.strokeText(text, style.frame.cx, style.band.enY);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = mixColour(style.colours.ink, style.colours.darkInk, dark);
  ctx.fillText(text, style.frame.cx, style.band.enY);
  ctx.restore();
}

function paperRgbOf(paper, style, dark) {
  if (dark > 0) return style.colours.darkRgb;
  if (!paper || paper === style.colours.paper) return style.colours.paperRgb;
  const m = /^#([0-9a-f]{6})$/i.exec(paper);
  if (!m) return style.colours.paperRgb;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

export function safeFade(ctx, paper = PAPER, dark = 0, preset = ACTIVE) {
  if (dark >= 1) return;
  const style = asPreset(preset);
  const { fadeTop, fadeEnd } = style.band;
  const rgb = paperRgbOf(paper, style, 0);
  const ease = style.fade.extend === 'ease';
  const gradBottom = ease ? style.frame.h : fadeEnd;
  const fillBottom = style.fade.extend === 'short' ? fadeEnd : style.frame.h;
  const g = ctx.createLinearGradient(0, fadeTop, 0, gradBottom);
  for (const stop of style.fade.stops) {
    g.addColorStop(stop.t, `rgba(${rgb},${stop.a * (1-dark)})`);
  }
  const h = fillBottom - fadeTop;
  if (!(h > 0)) return;
  ctx.fillStyle = g;
  ctx.fillRect(0, fadeTop, style.frame.w, h);
}

/**
 * Draw the paper fade, the current Chinese line, and the current English card.
 * No-op when t is outside every cue. Host must clear the canvas first.
 * Chinese line fades and English card fades are independent unless xfade is set.
 * `preset` selects `current` (default) or `old` / `v1` for the comparison still.
 */
export function drawSubtitles(ctx, t, cues, { dark = 0, xfade = false, paper = PAPER, preset = ACTIVE } = {}) {
  const s = findCue(cues, t);
  if (!s) return;
  const style = asPreset(preset);
  ctx.save();
  ctx.globalAlpha = 1;
  safeFade(ctx, paper, dark, style);
  ctx.restore();
  const lines = linesFor(s);
  const li = lines.findIndex((l) => t >= l.start && t < l.end);
  const cards = cardsFor(s);
  const ci = cards.findIndex((c) => t >= c.start && t < c.end);
  if (li >= 0) {
    const line = lines[li];
    paintChinese(ctx, line.text, dark, itemAlpha(t, line, li, lines, xfade), style);
  }
  if (ci >= 0) {
    const card = cards[ci];
    paintEnglish(ctx, card.text, dark, itemAlpha(t, card, ci, cards, xfade), style);
  }
  return { cn: li >= 0 ? lines[li].text : '', en: ci >= 0 ? cards[ci].text : '' };
}

/** Pure timing snapshot used by the assembler to reuse identical frames. */
export function subtitleState(t, cues, { xfade = false } = {}) {
  const s = findCue(cues, t);
  if (!s) return null;
  const lines = linesFor(s);
  const li = lines.findIndex((l) => t >= l.start && t < l.end);
  const cards = cardsFor(s);
  const ci = cards.findIndex((c) => t >= c.start && t < c.end);
  const line = li >= 0 ? lines[li] : null;
  const card = ci >= 0 ? cards[ci] : null;
  return {
    id: s.id,
    cn: line ? line.text : '',
    en: card ? card.text : '',
    cnA: line ? itemAlpha(t, line, li, lines, xfade) : 0,
    enA: card ? itemAlpha(t, card, ci, cards, xfade) : 0,
  };
}

export async function loadCues(options = {}) {
  if (Array.isArray(options.cues)) {
    const cues = options.cues;
    return {
      cues,
      source: options.source || 'provided',
      duration: cues.length ? cues[cues.length - 1].end : 0,
      formula: options.formula || null,
    };
  }
  const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
  if (!isNode) {
    const url = options.url || options.snapshot || 'cues.json';
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Cannot fetch cues: ${url}`);
    const data = await r.json();
    const cues = data.cues || data;
    return {
      cues,
      source: data.source || String(url),
      duration: data.duration ?? (cues.length ? cues[cues.length - 1].end : 0),
      formula: data.formula || null,
      mismatches: data.mismatches || [],
    };
  }
  const { loadCuesFromFs } = await import('./loadCues.js');
  return loadCuesFromFs(options);
}
