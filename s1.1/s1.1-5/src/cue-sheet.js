import { assertBlindReviewText } from '../../shared/canvasCore.js';
import { createCueTimeline, timeCueSheet } from '../../shared/timelineHelper.js';
import bundledSource from '../cues_s1.1-5.json' with { type: 'json' };

export function prepareCueSheet(source) {
  const timed = timeCueSheet(source);
  for (const { type, zhText, enText, highlightZh } of timed.cues) {
    if (type !== 'speech') continue;
    assertBlindReviewText(zhText);
    assertBlindReviewText(enText);
    if (!highlightZh.every(term => zhText.includes(assertBlindReviewText(term)))) throw new Error('Missing cue highlight');
  }
  return timed;
}

export const sheet = prepareCueSheet(globalThis.__sectionCueSheet ?? bundledSource);
export const CUES = createCueTimeline(sheet);
export const resolveCue = (timeline, time) => timeline.at(time);
