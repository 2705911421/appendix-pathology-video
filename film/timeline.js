// Timing snapshot generated from /workspace/病理科普视频/配音/全稿_v3/timeline.json
// (lines n=29–34, real start/end seconds; no estimated durations).
// Preserve the approved scene through its legacy clock.
import scene from './chapters/s08.js';
const timing = [{"n": 29, "seg": "04", "chapter": "红·单纯性", "start": 116.61454166666672, "end": 120.71216666666672, "dur": 4.097625, "text": "然而战况一旦失控，也可能伤及自身组织。", "en": "An excessive response can also damage the | body's own tissue."}, {"n": 30, "seg": "04", "chapter": "红·单纯性", "start": 121.16216666666672, "end": 125.55695833333338, "dur": 4.394791666666666, "text": "液体、蛋白质和白细胞外出，叫渗出。", "en": "These changes are called exudation."}, {"n": 31, "seg": "04", "chapter": "红·单纯性", "start": 126.00695833333339, "end": 130.09441666666672, "dur": 4.087458333333333, "text": "单纯性时，中性粒细胞主要驻守在", "en": "In simple appendicitis, neutrophils are | mainly found"}, {"n": 32, "seg": "04", "chapter": "红·单纯性", "start": 130.5444166666667, "end": 134.93608333333339, "dur": 4.391666666666667, "text": "黏膜及黏膜下层，组织损伤相对较轻。", "en": "in the mucosa and submucosa, with | relatively mild damage."}, {"n": 33, "seg": "04", "chapter": "红·单纯性", "start": 135.38608333333337, "end": 138.3009166666667, "dur": 2.914833333333333, "text": "变质，就是细胞组织的变性、坏死。", "en": "Alteration means cell degeneration and | necrosis."}, {"n": 34, "seg": "04", "chapter": "红·单纯性", "start": 138.75091666666668, "end": 141.81645833333334, "dur": 3.065541666666667, "text": "此时，黏膜上皮已局部受损脱落。[2]", "en": "Mucosal epithelium is locally injured | and shed."}];
export const origin = timing[0].start;
export const sentences = timing.map(s => ({id:s.n,start:s.start-origin,end:s.end-origin}));
export const duration = sentences.at(-1).end + 0.8;
export const T = {
  at: id => sentences[id-29].start,
  end: id => id===34 ? duration : sentences[id-29].end,
  frac: (id,f) => sentences[id-29].start + (sentences[id-29].end-sentences[id-29].start)*f,
};
const legacy = {at:id=>(id-29)*6,end:id=>(id-28)*6,frac:(id,f)=>(id-29+f)*6};
export function sceneTime(t) {
  const s = sentences.find(s=>t<s.end) || sentences.at(-1);
  if(t>=sentences.at(-1).end) return 33; // retain the approved final state for the tail
  return (s.id-29)*6 + Math.max(0,(t-s.start)/(s.end-s.start))*6;
}
const draw = scene.draw;
scene.draw = (ctx,t) => draw.call(scene,ctx,sceneTime(t),legacy);
