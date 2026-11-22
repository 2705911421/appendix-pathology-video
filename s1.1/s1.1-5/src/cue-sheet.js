import { assertBlindReviewText } from '../../shared/canvasCore.js';
import { createCueTimeline } from '../../shared/timelineHelper.js';
import bundledSource from '../cues_s1.1-5.json' with { type: 'json' };

export function prepareCueSheet(source) {
  let time = 0;
  const cues = source.cues.map(cue => {
    const { zhText, enText, highlightZh } = cue;
    const length = cue.duration ?? cue.defaultDuration;
    if (!Number.isFinite(length) || length <= 0) throw new RangeError(`Invalid duration for ${cue.id}`);
    assertBlindReviewText(zhText);
    assertBlindReviewText(enText);
    if (!highlightZh.every(term => zhText.includes(assertBlindReviewText(term)))) throw new Error('Missing cue highlight');
    const start = time;
    time += length;
    return { ...cue, start, end: time };
  });
  const duration = source.duration ?? source.defaultDuration ?? time;
  if (!Number.isFinite(duration) || duration <= 0) throw new RangeError('Invalid section duration');
  return { ...source, duration, cues };
}

export const sheet = prepareCueSheet(globalThis.__sectionCueSheet ?? bundledSource);
export const CUES = createCueTimeline(sheet);
export const resolveCue = (timeline, time) => timeline.at(time);
