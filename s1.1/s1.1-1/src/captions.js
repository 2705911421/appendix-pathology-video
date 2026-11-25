import { drawPreparedStorySubtitles } from '../../shared/canvasCore.js';
import { cueCaptionAt, prepareCueCaptionPages } from '../../shared/cueCaptions.js';
import { cueType } from '../../shared/timelineHelper.js';

const cuts = {
  S01: [['午饭后，', 'lunch,', .23], ['隐隐作痛，', 'navel,', .72]],
  S02: [['内脏神经传导，', 'visceral nerves.', .31], ['肚脐周围在疼，', 'the navel,', .72]],
  S03: [
    ["右下腹。", "abdomen."],
    ["体表投影。", "appendiceal base."],
    ["产生压痛；", "on pressure."],
    ["引发反跳痛。", "rebound tenderness."],
  ],
  S04: [
    ['36–37℃），', '36–37°C).', .34],
    ['4–10×10⁹/L），', '4–10 × 10⁹/L).', .67],
  ],
  S05: [['十小时。', 'department.', .27], ['“小香肠”，', 'appendix', .57], ['变色：', 'inflammation:', .74]],
};

export function mountCaptions(root, cues) {
  const pages = new Map(cues.filter(cue => cueType(cue) === 'speech')
    .map(cue => [cue.id, prepareCueCaptionPages(cue, cuts[cue.id])]));
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
    const prepared = cueCaptionAt(options, p);
    const { zh, en } = prepared.pages[0];
    const text = zh.map(run => run.text).join('');
    drawPreparedStorySubtitles(ctx, prepared);
    if (chinese.textContent !== text) chinese.textContent = text;
    if (english.textContent !== en) english.textContent = en;
  };
}
