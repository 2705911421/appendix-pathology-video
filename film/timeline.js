// Timing snapshot generated from data/narration/timeline.json
// (lines n=29–34, real start/end seconds; no estimated durations).
// Preserve the approved scene through its legacy clock.
import scene from './chapters/s08.js';
import {timing as allTiming} from './timing_snapshot.js';
const timing=allTiming.filter(s=>s.n>=29&&s.n<=34);
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

export function forScene(first,last,tail=.8){
 const rows=allTiming.filter(s=>s.n>=first&&s.n<=last),origin=rows[0].start;
 const row=id=>{const s=rows.find(s=>s.n===Number(id));if(!s)throw Error('Unknown sentence '+id);return s;};
 return {origin,duration:rows.at(-1).end-origin+tail,rows,
 T:{has:id=>rows.some(s=>s.n===id),at:id=>row(id).start-origin,end:id=>row(id).end-origin,frac:(id,f)=>row(id).start-origin+(row(id).end-row(id).start)*f}};
}
