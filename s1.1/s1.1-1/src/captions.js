import { drawPreparedStorySubtitles, storySubtitleAt } from '../../shared/canvasCore.js';
import { prepareProductionSubtitles } from '../../shared/cueCaptions.js';
import { cueType } from '../../shared/timelineHelper.js';

export function mountCaptions(root, cues) {
  const pages = new Map(cues.filter(cue => cueType(cue) === 'speech')
    .map(cue => [cue.id, prepareProductionSubtitles(cue)]));
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
    drawPreparedStorySubtitles(ctx, options, p);
    const { page: { zh, en } } = storySubtitleAt(options, p);
    const text = zh.map(run => run.text).join('');
    if (chinese.textContent !== text) chinese.textContent = text;
    if (english.textContent !== en) english.textContent = en;
  };
}
