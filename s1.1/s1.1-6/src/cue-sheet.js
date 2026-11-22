import { HEIGHT, WIDTH, assertBlindReviewText } from '../../shared/canvasCore.js';
import { createCueTimeline } from '../../shared/timelineHelper.js';

export const sceneFades = { homecomingStart: .92, creditsEnd: .08 };

const script = [
  {
    id: 'S23',
    defaultDuration: 12,
    zhText: '聊到这儿，细心的你可能会问：教科书里炎症常说的“增生”去哪了？其实，只有当急性阑尾炎反复发作、拖成慢性阑尾炎时，修复性的“增生”才会真正登场。',
    highlightZh: ['增生', '反复发作', '慢性阑尾炎'],
    enText: 'You might wonder: where is the "proliferation" of inflammation? Only when recurrent acute episodes turn into chronic appendicitis does reparative proliferation appear.',
  },
  {
    id: 'S24',
    defaultDuration: 15.5,
    zhText: '镜下可见阑尾壁明显纤维化、伴随淋巴细胞等慢性炎细胞浸润。慢性阑尾炎的手术时机核心原则是：一旦确诊，通常建议在症状缓解期择期切除；若正处于急性发作期，则视情况急诊手术。',
    highlightZh: ['纤维化', '淋巴细胞', '症状缓解期择期切除', '急性发作期', '急诊手术'],
    enText: 'Microscopy shows wall fibrosis and chronic inflammatory infiltration. Core surgical rule: once diagnosed, elective resection in remission is usually advised; during acute flare-ups, emergency surgery as indicated.',
  },
  {
    id: 'S25',
    defaultDuration: 11.5,
    zhText: '从粉白到暗红、灰黄再到焦黑，这根“小香肠”的每一次变色，都是身体发出的求救信号。面对转移性右下腹痛、高热与腹部拒按，别硬扛、别乱吃止痛药，尽早就医！',
    highlightZh: ['求救信号', '转移性右下腹痛', '别乱吃止痛药', '尽早就医'],
    enText: 'From pink to dark red, yellow, and black, every color shift is an SOS. Facing migratory right lower abdominal pain, fever, and guarding, never tough it out—seek prompt care!',
  },
  {
    id: 'S26',
    defaultDuration: 8,
    isCredits: true,
    zhText: '',
    highlightZh: [],
    enText: '',
  },
];

let seconds = 0;
export const CUES = (globalThis.__sectionCueSheet?.cues ?? script).map(cue => {
  for (const text of [cue.zhText, cue.enText, ...cue.highlightZh]) assertBlindReviewText(text);
  const start = seconds;
  seconds += cue.duration ?? cue.defaultDuration;
  return { ...cue, start, end: seconds };
});

export function resolveCue(cues, t) {
  const { cue, p } = createCueTimeline({ duration: cues.at(-1).end, cues }).at(t);
  return { cue, p: Math.round(p * 1e12) / 1e12 };
}

export const sheet = {
  module: 's1.1-6',
  width: WIDTH,
  height: HEIGHT,
  fps: 30,
  duration: seconds,
  cues: CUES,
};

export const samples = [
  ['S23', .75], ['S24', .82],
  ['S25', .75], ['S26', .60],
];
