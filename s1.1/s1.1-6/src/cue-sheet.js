import { assertBlindReviewText } from '../../shared/canvasCore.js';
import { CREDIT_FADE_FRACTION, createCueTimeline, timeCueSheet } from '../../shared/timelineHelper.js';
import bundledSource from '../out/cues_s1.1-6.json' with { type: 'json' };

export const sheet = timeCueSheet(globalThis.__sectionCueSheet ?? bundledSource);
export const CUES = sheet.cues;
export const sceneFades = {
  homecomingStart: .88,
  paperHoldSeconds: .3,
  creditsEnd: CREDIT_FADE_FRACTION,
};
for (const cue of CUES.filter(({ type }) => type === 'speech')) {
  for (const text of [cue.zhText, cue.enText, ...cue.highlightZh]) assertBlindReviewText(text);
}
const timeline = createCueTimeline(sheet);

export function resolveCue(cues, t) {
  const { cue, p } = (cues === CUES ? timeline : createCueTimeline({ duration: cues.at(-1).end, cues })).at(t);
  return { cue, p: Math.round(p * 1e12) / 1e12 };
}

export const samples = [
  ['S23', .75], ['S24', .82],
  ['S25', .75], ['S26', .60],
];
