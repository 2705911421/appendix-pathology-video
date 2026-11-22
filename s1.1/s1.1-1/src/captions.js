import { drawStorySubtitles } from '../../shared/canvasCore.js';

// Timing positions point into the original Chinese line without changing any wording.
const cuts = {
  S01: [[.27, '午饭后，'], [.76, '隐隐作痛，']],
  S02: [[.31, '阑尾内层，'], [.86, '定位含糊不清，']],
  S03: [[.36, '傍晚六点，'], [.65, '死死钉在了']],
  S04: [[.22, '急诊入院，'], [.65, '三十九点三度，']],
  S05: [[.29, '那根原本'], [.58, '“小香肠”，'], [.78, '变色日记：']],
};

function chinesePages(cue) {
  let start = 0;
  return [...cuts[cue.id], [1, '']].map(([until, ending]) => {
    const match = ending ? cue.zhText.indexOf(ending, start) : cue.zhText.length;
    if (match < 0) throw new Error(`Caption break not found in ${cue.id}`);
    const end = match + ending.length;
    const text = cue.zhText.slice(start, end);
    start = end;
    if ([...text].length > 22) throw new Error(`Subtitle page exceeds shared line length in ${cue.id}`);
    return { until, zh: { text, highlights: cue.highlightZh } };
  });
}

export function mountCaptions(root, cues) {
  const pages = new Map(cues.map(cue => [cue.id, chinesePages(cue)]));
  const caption = document.createElement('div');
  caption.className = 'story-caption';
  const chinese = document.createElement('p');
  chinese.className = 'story-caption-cn';
  const english = document.createElement('p');
  english.className = 'story-caption-en';
  english.lang = 'en';
  caption.append(chinese, english);
  root.append(caption);

  return (ctx, { id, enText }, p) => {
    const options = pages.get(id);
    const { zh } = options.find(page => p < page.until) ?? options.at(-1);
    drawStorySubtitles(ctx, zh, enText);
    if (chinese.textContent !== zh.text) chinese.textContent = zh.text;
    if (english.textContent !== enText) english.textContent = enText;
  };
}
