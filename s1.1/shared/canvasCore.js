import { HEIGHT, INK, NS, PAPER, RED, WIDTH, clamp, ease } from './detail/geometry.js';
import { createPaper } from './detail/paper.js';
import { assertBlindReviewText } from './blindReview.js';
import { ENGLISH_FONT, NUMERAL_FONT, SANS_FONT, SERIF_FONT } from './fonts.js';

export {
  HEIGHT, INK, NS, PAPER, RED, WIDTH, cellDot, clamp, closedCurve, ease, ellipse, fillPath, lerp,
  mulberry32, organic, round, samplePath, scopeSvg, strokePath, svgId,
} from './detail/geometry.js';
export { arrow, brace, ink, inkLines, inkOutline, roughProp } from './detail/ink.js';
export { morphShape, morphToLens } from './detail/morph.js';
export { pencil, pigment, waitForWashes, washLayer } from './detail/watercolor.js';
export { createPaper, assertBlindReviewText };
export {
  createRaster, drawRaster, drawRasterCrop, logicalContext, logicalSize, rasterScale, setLogicalSize, sizeRaster,
} from './detail/raster.js';

const chinese = { font: `750 46px ${SANS_FONT}`, color: INK, baseline: 964 };
const english = { font: `500 31px ${ENGLISH_FONT}`, color: '#5C564E', baseline: 1014 };
export const CAPTION_SAFE_Y = 885;
const captionInset = 82;
const captionWidth = WIDTH - 2 * captionInset;
const graphemes = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' });
const breaksAfter = /[，。！？、；：,.!?;:][）】》”’」』]*$/u;
const trailingMark = /^[，。！？、；：,.!?;:）】》”’」』]/u;

function oneLine(text) {
  if (typeof text !== 'string') throw new TypeError('Caption text must be a string');
  return assertBlindReviewText(text.replace(/\s+/gu, ' ').trim());
}

export function asciiApostrophes(text) {
  return text.replace(/[\u02bb\u02bc\u2018\u2019\u201b\uff07]/gu, "'");
}

function highlightRanges(text, highlights) {
  if (!Array.isArray(highlights)) throw new TypeError('Caption highlights must be an array');
  const unique = [...new Set(highlights.map(oneLine).filter(Boolean))].sort((a, b) => b.length - a.length);
  const ranges = [];
  for (let from = 0; from < text.length;) {
    const word = unique.find(value => text.startsWith(value, from));
    if (word) {
      ranges.push([from, from + word.length]);
      from += word.length;
    } else {
      from++;
    }
  }
  return ranges;
}

function chineseBreak(text, letters, ranges) {
  let best = { index: text.length, score: Infinity };
  for (let i = 1; i < letters.length; i++) {
    const { index } = letters[i];
    if (trailingMark.test(text.slice(index))) continue;
    const insideHighlight = ranges.some(([from, to]) => from < index && index < to);
    const balance = Math.abs(i - letters.length / 2);
    const overflow = Math.max(0, Math.max(i, letters.length - i) - 22);
    const punctuation = breaksAfter.test(text.slice(0, index).trimEnd());
    const score = balance + 4 * overflow + (punctuation ? 0 : 12) + (insideHighlight ? 50 : 0);
    if (score < best.score) best = { index, score };
  }
  // Even a line consisting entirely of punctuation can be split at a grapheme boundary.
  return best.index < text.length ? best.index : letters[Math.floor(letters.length / 2)].index;
}

function englishPages(text, split, ratio) {
  if (Array.isArray(text)) {
    if (text.length !== 2) throw new RangeError('Expected two English caption pages');
    const pages = text.map(page => asciiApostrophes(oneLine(page)));
    return split ? pages : [pages.filter(Boolean).join(' ')];
  }
  const line = asciiApostrophes(oneLine(text));
  if (!split) return [line];
  let best = { index: 0, score: Infinity };
  for (const { index } of line.matchAll(/ /gu)) {
    const before = line.slice(0, index);
    const score = Math.abs(index / line.length - ratio) + (/[,.!?;:]$/u.test(before) ? 0 : .18);
    if (score < best.score) best = { index, score };
  }
  return best.index ? [line.slice(0, best.index), line.slice(best.index + 1)] : [line, line];
}

export function prepareStorySubtitles(zh, en, { splitAt, pageAt, singlePage = false } = {}) {
  const value = typeof zh === 'string' ? { text: zh, highlights: [] } : zh;
  const text = oneLine(value.text);
  const ranges = highlightRanges(text, value.highlights ?? []);
  const letters = [...graphemes.segment(text)].filter(({ segment }) => segment !== ' ');
  if (splitAt !== undefined && !letters.slice(1).some(({ index }) => index === splitAt)) {
    throw new RangeError('Subtitle split must be at an interior grapheme');
  }
  if (pageAt !== undefined && !(pageAt > 0 && pageAt < 1)) throw new RangeError('Invalid subtitle page time');
  const split = splitAt !== undefined || (!singlePage && letters.length > 22);
  const boundary = split ? splitAt ?? chineseBreak(text, letters, ranges) : text.length;
  const ratio = clamp(boundary / Math.max(text.length, 1), .35, .65);
  const breakAt = split ? pageAt ?? ratio : 1;
  const translations = englishPages(en, split, ratio);
  const pages = (split ? [[0, boundary], [boundary, text.length]] : [[0, text.length]]).map(([from, to], index) => {
    const runs = [];
    let start = from;
    for (const [a, b] of ranges) {
      if (b <= from || a >= to) continue;
      const lo = Math.max(a, from);
      const hi = Math.min(b, to);
      if (start < lo) runs.push({ text: text.slice(start, lo), highlight: false });
      runs.push({ text: text.slice(lo, hi), highlight: true });
      start = hi;
    }
    if (start < to) runs.push({ text: text.slice(start, to), highlight: false });
    if (runs.length) {
      runs[0].text = runs[0].text.trimStart();
      runs.at(-1).text = runs.at(-1).text.trimEnd();
    }
    return { zh: runs, en: translations[index] };
  });
  return { pages, breakAt };
}

export function storySubtitleAt({ pages, breakAt }, progress = 0) {
  if (!Number.isFinite(progress)) throw new TypeError('Subtitle progress must be finite');
  const current = clamp(progress);
  const second = pages.length > 1 && current >= breakAt;
  const enter = second ? ease((current - breakAt) / .025) : 1;
  return {
    page: pages[Number(second)],
    opacity: .90 + .10 * enter,
    offset: 3 * (1 - enter),
  };
}

function measureRuns(ctx, runs) {
  const sizes = runs.map(({ text }) => ctx.measureText(text).width);
  const width = sizes.reduce((total, value) => total + value, 0);
  return { sizes, width, scale: width > captionWidth ? captionWidth / width : 1 };
}

export function drawStorySubtitles(ctx, zh, en, progress = 0, options) {
  drawPreparedStorySubtitles(ctx, prepareStorySubtitles(zh, en, options), progress);
}

export function drawPreparedStorySubtitles(ctx, subtitles, progress = 0) {
  const { page, opacity, offset } = storySubtitleAt(subtitles, progress);
  const draw = (runs, style) => {
    ctx.save();
    ctx.font = style.font;
    const { sizes, scale, width } = measureRuns(ctx, runs);
    ctx.translate(WIDTH / 2, style.baseline + offset);
    ctx.scale(scale, 1);
    let x = -width / 2;
    for (const [i, { text, highlight }] of runs.entries()) {
      ctx.fillStyle = highlight ? RED : style.color;
      ctx.fillText(text, x, 0);
      x += sizes[i];
    }
    ctx.restore();
  };
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  draw(page.zh, chinese);
  draw([{ text: page.en, highlight: false }], english);
  ctx.restore();
}

export function drawSubtitlePaper(ctx) {
  const shade = ctx.createLinearGradient(0, CAPTION_SAFE_Y, 0, 947);
  shade.addColorStop(0, '#F5F1E900');
  shade.addColorStop(1, PAPER);
  ctx.fillStyle = shade;
  ctx.fillRect(0, CAPTION_SAFE_Y, WIDTH, HEIGHT - CAPTION_SAFE_Y);
}

const storyStyle = `
  .story-stage {
    color-scheme: light;
    --paper: ${PAPER}; --ink: ${INK}; --red: ${RED}; --hand: ${SERIF_FONT}; --text: ${SANS_FONT};
    width: ${WIDTH}px; height: ${HEIGHT}px; position: relative; overflow: hidden; isolation: isolate;
    background-color: var(--paper);
    background-image: linear-gradient(to right, rgba(120, 110, 95, .055) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(120, 110, 95, .055) 1px, transparent 1px);
    background-size: 42px 42px; background-position: 15px 11px;
  }
  .story-stage, .story-stage * { box-sizing: border-box; }
  .story-layer, .story-layer > svg, .story-grain canvas, .story-paint > canvas {
    position: absolute; inset: 0; width: 100%; height: 100%;
  }
  .story-grain { pointer-events: none; }
  .story-stage [hidden] { display: none !important; }
  .story-stage .note { font-family: var(--hand); font-weight: 600; }
  .story-stage .title { font-weight: 740; }
  .story-stage .note:not([fill]) { fill: var(--ink); }
  .story-stage .numeral { font-family: ${NUMERAL_FONT}; font-variant-numeric: lining-nums tabular-nums; }
  .story-stage .callout { paint-order: stroke; stroke: var(--paper); stroke-width: 7; stroke-linejoin: round; }
  .story-stage .ct-note { font-family: var(--text); font-weight: 600; paint-order: stroke; stroke: #262325; stroke-width: 4; }
  .story-stage .ct-side { font-family: var(--text); font-weight: 680; }
  .story-caption-halo {
    position: absolute; inset: ${CAPTION_SAFE_Y}px 0 0;
    background: linear-gradient(to bottom, transparent, var(--paper) 32%, var(--paper));
  }
  .story-caption {
    position: absolute; top: 920px; inset-inline: ${captionInset}px;
    display: flex; flex-direction: column; align-items: center;
    text-align: center; white-space: nowrap;
  }
  .story-caption p { width: max-content; }
  .story-caption-cn { margin: 0; font: ${chinese.font}; line-height: 54px; color: ${chinese.color}; }
  .story-caption-cn span { color: var(--red); }
  .story-caption-en { margin: 8px 0 0; font: ${english.font}; line-height: 43px; color: ${english.color}; }
`;

export function createStoryStage(root, { paper = true } = {}) {
  const document = root.ownerDocument;
  if (!document.querySelector('style[data-story-style]')) {
    const style = document.createElement('style');
    style.dataset.storyStyle = '';
    style.textContent = storyStyle;
    document.head.append(style);
  }
  root.classList.add('story-stage');
  root.innerHTML = `
    <div class="story-layer story-paint" aria-hidden="true"></div>
    <div class="story-layer story-grain" aria-hidden="true"></div>
    <div class="story-caption-halo"></div>
    <div class="story-layer story-lettering"></div>
    <div class="story-caption"><p class="story-caption-cn"></p><p class="story-caption-en" lang="en"></p></div>`;
  const [paint, grain, halo, lettering, caption] = root.children;
  const [cn, en] = caption.children;
  const ctx = document.createElement('canvas').getContext('2d');
  const ready = Promise.all([
    paper ? createPaper(grain) : () => {},
    document.fonts.load(chinese.font),
    document.fonts.load(english.font),
    document.fonts.load(`600 42px ${SERIF_FONT}`),
  ]).then(async ([drawPaper]) => {
    await document.fonts.ready;
    drawPaper();
    return drawPaper;
  });
  let current;
  return {
    paint, lettering, ready,
    setSubtitles(subtitles, progress) {
      caption.hidden = halo.hidden = !subtitles;
      if (!subtitles) return;
      const { page, opacity, offset } = storySubtitleAt(subtitles, progress);
      if (page !== current) {
        cn.replaceChildren(...page.zh.map(({ text, highlight }) => {
          if (!highlight) return document.createTextNode(text);
          const span = document.createElement('span');
          span.textContent = text;
          return span;
        }));
        en.textContent = page.en;
        for (const element of [cn, en]) {
          element.style.transform = '';
          const range = document.createRange();
          range.selectNodeContents(element);
          ctx.font = element === cn ? chinese.font : english.font;
          // Use the same font measurements when the stage is being staged off-screen.
          const width = range.getBoundingClientRect().width || ctx.measureText(element.textContent).width;
          element.style.transform = width > captionWidth ? `scaleX(${captionWidth / width})` : '';
        }
        current = page;
      }
      caption.style.opacity = opacity;
      caption.style.transform = offset ? `translateY(${offset}px)` : '';
    },
  };
}

export function appendStorySvg(layer, content, { hidden = false } = {}) {
  const svg = layer.ownerDocument.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
  svg.toggleAttribute('hidden', hidden);
  svg.innerHTML = content;
  assertBlindReviewText([...svg.querySelectorAll('text')].map(text => text.textContent).join(' '));
  layer.append(svg);
  return svg;
}
