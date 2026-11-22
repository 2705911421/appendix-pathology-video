import { createCueTimeline, timeCueSheet } from '../../shared/timelineHelper.js';
import source from '../out/cues_s1.1-2.json' with { type: 'json' };

export const sheet = timeCueSheet(source);
export const CUES = Object.freeze(sheet.cues.map(Object.freeze));
export const sectionDuration = sheet.duration;
const timeline = createCueTimeline(sheet);

export function resolveCue(cues, t) {
  return (cues === CUES ? timeline : createCueTimeline({ cues, duration: cues.at(-1).end })).at(t);
}

export function cueTime(id, p) {
  const cue = CUES.find(item => item.id === id);
  if (!cue) throw new RangeError(`Unknown cue ${id}`);
  return cue.start + (cue.end - cue.start) * p;
}
