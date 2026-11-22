import { createCueTimeline } from '../../shared/timelineHelper.js';

const timelines = new WeakMap();

export function timeCues(cues) {
  let duration = 0;
  const timed = cues.map(cue => {
    const seconds = cue.duration ?? cue.defaultDuration;
    if (!Number.isFinite(seconds) || seconds <= 0) throw new RangeError(`Invalid duration for ${cue.id}`);
    const start = duration;
    duration += seconds;
    return { ...cue, duration: seconds, start, end: duration };
  });
  return { duration, cues: timed };
}

function cueTimeline(cues) {
  if (!timelines.has(cues)) {
    timelines.set(cues, createCueTimeline(timeCues(cues)));
  }
  return timelines.get(cues);
}

export function resolveCue(cues, t) {
  return cueTimeline(cues).at(t);
}
