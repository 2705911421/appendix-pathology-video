import { drawStorySubtitles } from '../../shared/canvasCore.js';
import { cueType } from '../../shared/timelineHelper.js';

const cuts = {
  S01: [[.23, '午饭后，', 'lunch,'], [.72, '隐隐作痛，', 'navel,']],
  S02: [[.31, '内脏神经传导，', 'visceral nerves.'], [.72, '肚脐周围在疼，', 'the navel,']],
  S03: [[.34, '左右，', '6 PM,'], [.67, '右下腹。', 'abdomen.']],
  S04: [[.22, '急诊，', 'department,'], [.65, '三十九点三度。', '39.3°C.']],
  S05: [[.27, '十小时。', 'department.'], [.57, '“小香肠”，', 'appendix'], [.74, '变色：', 'inflammation:']],
};

function splitAfter(text, endings, id) {
  let cursor = 0;
  return [...endings, ''].map(ending => {
    const match = ending ? text.indexOf(ending, cursor) : text.length;
    if (match < 0) throw new Error(`Caption break not found in ${id}`);
    const page = text.slice(cursor, match + ending.length).trim();
    cursor = match + ending.length;
    return page;
  });
}

function bilingualPages({ id, zhText, enText, highlightZh }) {
  const timing = cuts[id];
  const chinese = splitAfter(zhText, timing.map(([, zh]) => zh), id);
  const english = splitAfter(enText, timing.map(([, , en]) => en), id);
  return chinese.map((text, i) => ({
    until: timing[i]?.[0] ?? 1, zh: { text, highlights: highlightZh }, en: english[i],
  }));
}

export function mountCaptions(root, cues) {
  const pages = new Map(cues.filter(cue => cueType(cue) === 'speech').map(cue => [cue.id, bilingualPages(cue)]));
  const caption = document.createElement('div');
  caption.className = 'story-caption';
  const chinese = document.createElement('p');
  chinese.className = 'story-caption-cn';
  const english = document.createElement('p');
  english.className = 'story-caption-en';
  english.lang = 'en';
  caption.append(chinese, english);
  root.append(caption);

  return (ctx, { id }, p) => {
    const options = pages.get(id);
    caption.hidden = !options;
    if (!options) return;
    const { zh, en } = options.find(page => p < page.until) ?? options.at(-1);
    drawStorySubtitles(ctx, zh, en, 0, { singlePage: true });
    if (chinese.textContent !== zh.text) chinese.textContent = zh.text;
    if (english.textContent !== en) english.textContent = en;
  };
}
