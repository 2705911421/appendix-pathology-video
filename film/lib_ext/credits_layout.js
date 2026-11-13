// Credits layout. Text only. Sizes and the paper colour are fixed by the brief.
// Paper RGB 244,239,230 is the median of qa/v6/h02_s06/s23_red.png (S06 #F4EFE6).

export const PAPER = '#F4EFE6';
export const PAPER_RGB = [244, 239, 230];
export const BODY = '#4C4555';
export const TITLE_COLOR = '#2A2A35';
export const TITLE_PX = 52;
export const BODY_PX = 36;
export const TITLE_WEIGHT = 700;
export const BODY_WEIGHT = 500;
export const FADE_IN = 0.8;
export const FADE_OUT = 1.2;
export const TITLE_Y = 120;
export const LEADING = 1.5;
export const SAFE = {x0: 90, x1: 1830, y0: 60, y1: 950};
// Wrap / track target sits inside the safe rect so antialiasing stays inside it.
export const MAX_TEXT_W = 1700;

export function smoothstep(x) {
  x = Math.max(0, Math.min(1, x));
  return x * x * (3 - 2 * x);
}

export function fadeAlpha(t, duration, fadeIn = FADE_IN, fadeOut = FADE_OUT) {
  const inn = fadeIn <= 0 ? 1 : smoothstep(t / fadeIn);
  const out = fadeOut <= 0 ? 1 : smoothstep((duration - t) / fadeOut);
  return inn * out;
}

export function pageIndex(t, duration, n) {
  if (n <= 1) return 0;
  const pageDur = duration / n;
  if (!(t > 0)) return 0;
  if (t >= duration) return n - 1;
  return Math.min(n - 1, Math.floor(t / pageDur));
}

export function splitToWidth(text, maxW, widthOf) {
  if (widthOf(text) <= maxW + 0.5) return [text];
  const out = [];
  let rest = text;
  while (rest.length) {
    if (widthOf(rest) <= maxW + 0.5) {
      out.push(rest);
      break;
    }
    let lo = 1;
    let hi = rest.length - 1;
    let fit = 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (widthOf(rest.slice(0, mid)) <= maxW) {
        fit = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    let cut = fit;
    const sp = rest.lastIndexOf(' ', fit);
    if (sp >= 8) cut = sp + 1;
    if (cut < 1) cut = Math.max(1, fit);
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut);
    if (out.length > 6) {
      out.push(rest);
      break;
    }
  }
  return out;
}

function trackToFit(line, size, weight, maxW, measure) {
  let spacing = 0;
  let m = measure(line, size, weight, 0);
  if (m.width > maxW) {
    const n = Math.max(1, Array.from(line).length - 1);
    spacing = (maxW - 4 - m.width) / n;
    m = measure(line, size, weight, spacing);
  }
  return {spacing, m};
}

export function pageEntries(data, blind, pages) {
  const page1 = [];
  for (const item of data.ai || []) {
    if (item && item.verified !== false && item.text) page1.push({text: item.text, role: 'ai'});
  }
  if (data.original && data.original.verified !== false && data.original.text) {
    page1.push({text: data.original.text, role: 'original'});
  }
  const musicLines = data.music && Array.isArray(data.music.lines) && data.music.lines.length
    ? data.music.lines
    : (data.music && data.music.credit ? String(data.music.credit).split('\n') : []);
  for (const line of musicLines) {
    if (line) page1.push({text: line, role: 'music'});
  }
  if (!blind && data.identity) {
    for (const key of ['team', 'school', 'name']) {
      const value = data.identity[key];
      if (value) page1.push({text: String(value), role: 'identity'});
    }
  }
  const page2 = [];
  for (const item of (data.ct && data.ct.items) || []) {
    page2.push({text: item.zh, role: 'ct'});
    page2.push({text: item.en, role: 'ct', gapAfter: 22});
  }
  if (data.ct && data.ct.license) page2.push({text: data.ct.license, role: 'license'});
  if (pages <= 1) {
    const merged = page1.concat(page2.map(entry => ({...entry, gapAfter: entry.gapAfter ? 12 : 0})));
    return [merged];
  }
  return [page1, page2];
}

export function layoutPages(measure, pages) {
  return pages.map((entries, index) => layoutPage(measure, entries, index));
}

function layoutPage(measure, entries, index) {
  const cx = 960;
  const items = [];
  const pushLine = (line, size, weight, color, role, gapAfter, source) => {
    const {spacing, m} = trackToFit(line, size, weight, MAX_TEXT_W, measure);
    const prev = items[items.length - 1];
    let baseline = TITLE_Y;
    if (prev) {
      const lead = LEADING * Math.max(prev.size, size);
      const clear = prev.descent + m.ascent + 8 + (prev.padAfter || 0);
      baseline = prev.y + Math.max(lead, clear);
    }
    const item = {
      text: line,
      source,
      role,
      size,
      weight,
      color,
      letterSpacing: spacing,
      x: cx,
      y: baseline,
      width: m.width,
      ascent: m.ascent,
      descent: m.descent,
      x0: cx - m.width / 2,
      x1: cx + m.width / 2,
      y0: baseline - m.ascent,
      y1: baseline + m.descent,
      padAfter: 0,
    };
    items.push(item);
    if (gapAfter) item.padAfter = gapAfter;
  };
  pushLine('声明与致谢', TITLE_PX, TITLE_WEIGHT, TITLE_COLOR, 'title', 0, '声明与致谢');
  for (const entry of entries) {
    const size = BODY_PX;
    const weight = BODY_WEIGHT;
    const lines = entry.role === 'music'
      ? splitToWidth(entry.text, MAX_TEXT_W, text => measure(text, size, weight, 0).width)
      : [entry.text];
    lines.forEach((line, li) => {
      const gap = li === lines.length - 1 ? (entry.gapAfter || 0) : 0;
      pushLine(line, size, weight, BODY, entry.role, gap, entry.text);
    });
  }
  return {index, items};
}

export function layoutProblems(pages) {
  const problems = [];
  pages.forEach(page => {
    const items = page.items;
    items.forEach(item => {
      if (item.size < 36) problems.push(`size ${item.size} < 36: ${item.text}`);
      if (item.role === 'title' && item.size < 44) problems.push('title smaller than 44');
      if (item.x0 < SAFE.x0 - 0.01) problems.push(`x0 ${item.x0.toFixed(1)} < 90: ${item.text}`);
      if (item.x1 > SAFE.x1 + 0.01) problems.push(`x1 ${item.x1.toFixed(1)} > 1830: ${item.text}`);
      if (item.y0 < SAFE.y0 - 0.01) problems.push(`y0 ${item.y0.toFixed(1)} < 60: ${item.text}`);
      if (item.y1 > SAFE.y1 + 0.01) problems.push(`y1 ${item.y1.toFixed(1)} > 950: ${item.text}`);
      if (item.role === 'title' && Math.abs(item.y - TITLE_Y) > 0.01) problems.push('title baseline is not 120');
    });
    for (let i = 1; i < items.length; i++) {
      const a = items[i - 1];
      const b = items[i];
      const gap = b.y0 - a.y1;
      const ratio = (b.y - a.y) / Math.max(a.size, b.size);
      if (gap <= 0) problems.push(`overlap gap ${gap.toFixed(2)} between "${a.text}" and "${b.text}"`);
      if (ratio < LEADING - 1e-3) problems.push(`leading ${ratio.toFixed(3)} < 1.5`);
    }
  });
  return problems;
}

export function summarise(pages) {
  const items = pages.flatMap(page => page.items);
  let minGap = Infinity;
  let minRatio = Infinity;
  pages.forEach(page => {
    for (let i = 1; i < page.items.length; i++) {
      const a = page.items[i - 1];
      const b = page.items[i];
      minGap = Math.min(minGap, b.y0 - a.y1);
      minRatio = Math.min(minRatio, (b.y - a.y) / Math.max(a.size, b.size));
    }
  });
  return {
    minGap: Number.isFinite(minGap) ? minGap : null,
    minLeading: Number.isFinite(minRatio) ? minRatio : null,
    minSize: items.reduce((m, item) => Math.min(m, item.size), Infinity),
    maxSize: items.reduce((m, item) => Math.max(m, item.size), 0),
    strings: items.map(item => item.text),
  };
}
