import {initBaker,bake} from './lib/wash.js';
import {bakeHE} from './lib/he.js';
import s08 from './chapters/s08.js';
import {forScene} from './timeline.js';
const name=new URLSearchParams(location.search).get('scene')||'s08';
if(!['s06','s08','s10','s11','s19','s14','s05','s17','s20','card'].includes(name))throw Error('Unknown scene '+name);
const scene=name==='s08'?s08:(await import(`./chapters/${name}.js`)).default;
const cardRanges={s05:[20,22],s17:[63,65],s20:[71,74],card:[20,22]};
const clock=cardRanges[name]?forScene(...cardRanges[name],0):name==='s08'?{duration:T.end(34),T}:(name==='s06'?forScene(23,24,0):name==='s14'?forScene(54,57,0):name==='s19'?forScene(69,70,0):forScene(37,name==='s11'?46:42));
import {T} from './timeline.js';
const c=document.getElementById('c');c.width=1920;c.height=1080;const ctx=c.getContext('2d');
await document.fonts.load('500 32px MixSans');
if(!cardRanges[name]||new URLSearchParams(location.search).has('bake_card')||name==='s20'){await initBaker();if(!cardRanges[name])bakeHE((k,r,o)=>bake(k,r,{...o,hd:true,soft:true,grain:.12,edge:.3,bleed:.5}));}
await scene.prepare();window.DUR=clock.duration;window.render=t=>scene.draw(ctx,t,clock.T);window.READY=true;
