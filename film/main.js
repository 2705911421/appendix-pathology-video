import {initBaker,bake} from './lib/wash.js';
import {bakeHE} from './lib/he.js';
import s08 from './chapters/s08.js';
import {forScene} from './timeline.js';
import {timing as allTiming} from './timing_snapshot.js';
const name=new URLSearchParams(location.search).get('scene')||'s08';
if(!['s06','s07','s08','s10','s11','s19','s14'].includes(name))throw Error('Unknown scene '+name);
const scene=name==='s08'?s08:(await import(`./chapters/${name}.js`)).default;
// S06 owns the silence between sentences 24 and 25, so the animatic has no
// uncovered frames at the S06→S07 handoff (previously 13 placeholder frames).
const gapAfter=id=>{const i=allTiming.findIndex(s=>s.n===id);return i+1<allTiming.length?Math.max(0,allTiming[i+1].start-allTiming[i].end):.8;};
const clock=name==='s08'?{duration:T.end(34),T}:(name==='s06'?forScene(23,24,gapAfter(24)):name==='s07'?forScene(25,30,0):name==='s14'?forScene(54,57,0):name==='s19'?forScene(69,70,0):forScene(37,name==='s11'?46:42));
import {T} from './timeline.js';
const c=document.getElementById('c');c.width=1920;c.height=1080;const ctx=c.getContext('2d');
await document.fonts.load('500 32px MixSans');await initBaker();bakeHE((k,r,o)=>bake(k,r,{...o,hd:true,soft:true,grain:.12,edge:.3,bleed:.5}));
scene.prepare();window.DUR=clock.duration;window.render=t=>scene.draw(ctx,t,clock.T);window.READY=true;
