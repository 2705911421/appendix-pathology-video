import { HEIGHT, WIDTH, assertBlindReviewText } from '../../shared/canvasCore.js';
import { createCueTimeline, timeCueSheet } from '../../shared/timelineHelper.js';

export function prepareTimeline(sheet) {
  const { width, height, fps } = sheet;
  if (sheet.module !== 's1.1-3' || width !== WIDTH || height !== HEIGHT || fps !== 30) {
    throw new RangeError('Expected the 1920×1080 third-act cue sheet at 30 fps');
  }
  const timed = timeCueSheet(sheet);
  const speech = timed.cues.filter(cue => cue.type === 'speech');
  if (speech.length !== 5 || speech.some((cue, i) => cue.id !== `S${10 + i}`)) throw new RangeError('Incomplete third-act timeline');
  for (const { id, zhText, highlightZh, enText } of speech) {
    if (!zhText || !enText || !Array.isArray(highlightZh)
      || !highlightZh.every(term => term && zhText.includes(term))) {
      throw new TypeError(`Invalid bilingual captions or highlights for ${id}`);
    }
    for (const text of [zhText, enText, ...highlightZh]) assertBlindReviewText(text);
  }
  return { ...timed, CUES: createCueTimeline(timed) };
}

export function resolveCue(timeline, t) {
  return timeline.at(t);
}
