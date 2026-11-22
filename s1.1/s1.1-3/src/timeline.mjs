import { HEIGHT, WIDTH, assertBlindReviewText } from '../../shared/canvasCore.js';
import { createCueTimeline } from '../../shared/timelineHelper.js';

export function prepareTimeline(sheet) {
  const { width, height, fps } = sheet;
  if (sheet.module !== 's1.1-3' || width !== WIDTH || height !== HEIGHT || fps !== 30) {
    throw new RangeError('Expected the 1920×1080 third-act cue sheet at 30 fps');
  }
  let elapsed = 0;
  const cues = sheet.cues.map((cue, index) => {
    const { id, zhText, highlightZh, enText } = cue;
    const duration = cue.duration ?? cue.defaultDuration;
    if (id !== `S${10 + index}` || !Number.isFinite(duration) || !(duration > 0)) {
      throw new RangeError(`Invalid duration or sequence for ${id}`);
    }
    if (!zhText || !enText || !Array.isArray(highlightZh)
      || !highlightZh.every(term => term && zhText.includes(term))) {
      throw new TypeError(`Invalid bilingual captions or highlights for ${id}`);
    }
    for (const text of [zhText, enText, ...highlightZh]) assertBlindReviewText(text);
    const start = elapsed;
    elapsed += duration;
    return { ...cue, duration, start, end: elapsed };
  });
  const duration = sheet.duration ?? sheet.defaultDuration ?? elapsed;
  if (cues.length !== 5 || !Number.isFinite(duration) || Math.abs(elapsed - duration) > 1e-7) {
    throw new RangeError('Incomplete third-act timeline');
  }
  return { width, height, fps, duration, cues, CUES: createCueTimeline({ duration, cues }) };
}

export function resolveCue(timeline, t) {
  return timeline.at(t);
}
