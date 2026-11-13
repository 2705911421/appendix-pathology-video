import {
  BODY_PX, BODY_WEIGHT, PAPER, TITLE_PX, TITLE_WEIGHT,
  fadeAlpha, layoutPages, layoutProblems, pageEntries, pageIndex, summarise,
} from './credits_layout.js';

function measureWith(ctx) {
  return (text, size, weight, letterSpacing) => {
    ctx.save();
    ctx.font = `${weight} ${size}px MixSans`;
    ctx.letterSpacing = `${letterSpacing || 0}px`;
    const m = ctx.measureText(text);
    ctx.restore();
    const ascent = m.actualBoundingBoxAscent > 0 ? m.actualBoundingBoxAscent : size * 0.8;
    const descent = m.actualBoundingBoxDescent > 0 ? m.actualBoundingBoxDescent : size * 0.2;
    return {width: m.width, ascent, descent};
  };
}

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`credits fetch ${response.status} ${url}`);
  return response.json();
}

export async function prepareCredits(params) {
  await document.fonts.load(`${BODY_WEIGHT} ${BODY_PX}px MixSans`);
  await document.fonts.load(`${TITLE_WEIGHT} ${TITLE_PX}px MixSans`);
  await document.fonts.ready;
  const blind = ['1', 'true', 'yes'].includes(String(params.get('blind') || '').toLowerCase());
  const duration = Math.max(1, +(params.get('duration') || 14));
  const pages = String(params.get('pages') || '2') === '1' ? 1 : 2;
  const data = await loadJson(new URL('./credits_text.json', import.meta.url));
  data.identity = {team: '', school: '', name: ''};
  if (!blind) {
    try {
      const identity = await loadJson(new URL('./credits_identity.json', import.meta.url));
      data.identity = {
        team: identity.team || '',
        school: identity.school || '',
        name: identity.name || '',
      };
    } catch {
      data.identity = {team: '', school: '', name: ''};
    }
  }
  if (!data.ct || !Array.isArray(data.ct.items) || data.ct.items.length !== 4) {
    throw new Error('credits_text.json must contain exactly 4 CT credits');
  }
  const probe = document.createElement('canvas').getContext('2d');
  const entries = pageEntries(data, blind, pages);
  const laid = layoutPages(measureWith(probe), entries);
  const problems = layoutProblems(laid);
  const summary = summarise(laid);
  const state = {
    duration,
    pages,
    blind,
    paper: PAPER,
    laid,
    problems,
    summary,
    strings: summary.strings,
  };
  window.CREDITS_REPORT = state;
  return state;
}

export function drawCredits(ctx, t, state) {
  const duration = state.duration;
  const alpha = fadeAlpha(t, duration);
  const index = pageIndex(t, duration, state.laid.length);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, 1920, 1080);
  ctx.globalAlpha = 1;
  ctx.fillStyle = state.paper;
  ctx.fillRect(0, 0, 1920, 1080);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (const item of state.laid[index].items) {
    ctx.font = `${item.weight} ${item.size}px MixSans`;
    ctx.fillStyle = item.color;
    ctx.letterSpacing = `${item.letterSpacing || 0}px`;
    ctx.fillText(item.text, item.x, item.y);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  if (window.CREDITS_REPORT) {
    window.CREDITS_REPORT.t = t;
    window.CREDITS_REPORT.alpha = alpha;
    window.CREDITS_REPORT.page = index;
  }
}
