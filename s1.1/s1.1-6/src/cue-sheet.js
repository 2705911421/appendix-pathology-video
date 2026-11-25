import { HEIGHT, WIDTH, assertBlindReviewText } from '../../shared/canvasCore.js';
import { CREDIT_FADE_FRACTION, CREDITS_TIMING, RECOVERY_FADE_SECONDS, createCueTimeline, timeCueSheet } from '../../shared/timelineHelper.js';

const script = [
  {
    id: 'S23',
    defaultDuration: 10.6,
    zhText: '反复或持续的右下腹痛，可能见于慢性阑尾炎。长期炎症刺激导致的“增生”，可使阑尾壁逐渐增厚，并出现纤维化。',
    highlightZh: ['慢性阑尾炎', '炎症刺激导致的“增生”', '增厚', '纤维化'],
    enText: 'Chronic appendicitis can present with recurrent or persistent right lower abdominal pain. Inflammation-induced proliferation can gradually thicken and fibrose the appendiceal wall.',
  },
  {
    id: 'S24',
    defaultDuration: 16,
    zhText: '镜下可见阑尾壁明显纤维化，有淋巴细胞和浆细胞浸润。一旦确诊，通常建议在症状缓解期择期切除；若正处于急性发作期，则视情况急诊手术。',
    highlightZh: ['纤维化', '淋巴细胞', '浆细胞', '症状缓解期择期切除', '急性发作期', '急诊手术'],
    enText: 'Microscopy shows wall fibrosis with lymphocyte and plasma cell infiltration. Once diagnosed, elective appendectomy is usually advised when symptoms have subsided. During an acute flare, emergency surgery may be needed depending on the clinical findings.',
  },
  {
    id: 'B08',
    type: 'bridge',
    duration: 1.4,
  },
  {
    id: 'S25',
    defaultDuration: 12,
    zhText: '粉白、暗红、灰黄、焦黑，颜色帮助我们读懂阑尾的病理变化。若腹痛转移到右下腹，或持续加重，尤其伴发热或腹部拒按，应尽快就医。',
    highlightZh: ['病理变化', '右下腹', '持续加重', '发热', '腹部拒按', '尽快就医'],
    enText: 'Pale pink, dark red, grayish yellow and black reflect changes in the appendix. Seek urgent medical care if abdominal pain moves to the right lower abdomen or keeps worsening, especially with fever or guarding.',
  },
  {
    id: 'S26',
    defaultDuration: CREDITS_TIMING.duration,
    isCredits: true,
    zhText: '',
    highlightZh: [],
    enText: '',
  },
];

export const sheet = timeCueSheet(globalThis.__sectionCueSheet ?? {
  module: 's1.1-6', width: WIDTH, height: HEIGHT, fps: 30, cues: script,
});
export const CUES = sheet.cues;
export const sceneFades = {
  homecomingStart: 1 - RECOVERY_FADE_SECONDS / CUES.find(({ id }) => id === 'S25').duration,
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
