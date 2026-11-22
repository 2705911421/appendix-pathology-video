import { createCueTimeline, timeCueSheet } from '../../shared/timelineHelper.js';

const timelines = new WeakMap();

export function timeCues(cues) {
  return timeCueSheet({ cues });
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
