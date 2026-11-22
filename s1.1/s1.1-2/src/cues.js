import { createCueTimeline } from '../../shared/timelineHelper.js';
import sheet from '../out/cues_s1.1-2.json' with { type: 'json' };

let end = 0;
export const CUES = Object.freeze(sheet.cues.map(cue => {
  const start = end;
  const duration = cue.duration ?? cue.defaultDuration;
  if (!Number.isFinite(duration) || duration <= 0) throw new RangeError(`Invalid duration for ${cue.id}`);
  end += duration;
  return Object.freeze({ ...cue, start, end });
}));

export const sectionDuration = sheet.duration ?? sheet.defaultDuration ?? end;
if (!Number.isFinite(sectionDuration) || Math.abs(end - sectionDuration) > 1e-8) {
  throw new RangeError('Cue durations must add up to the section duration');
}
export { sheet };

export function resolveCue(cues, t) {
  return createCueTimeline({ cues, duration: cues.at(-1).end }).at(t);
}

export function cueTime(id, p) {
  const cue = CUES.find(item => item.id === id);
  if (!cue) throw new RangeError(`Unknown cue ${id}`);
  return cue.start + (cue.end - cue.start) * p;
}
