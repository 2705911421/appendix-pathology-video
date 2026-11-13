import {initBaker,bake} from './lib/wash.js';
import {bakeHE} from './lib/he.js';
import s08 from './chapters/s08.js';
import {forScene} from './timeline.js';
import {timing as allTiming} from './timing_snapshot.js';
const params=new URLSearchParams(location.search);
const name=params.get('scene')||'s08';
// Merged scene registry (mini, 2026-11-13): main line + ct-dev (S04/S09/S12/S15 real CT) + mech-dev (S13) + clin-dev (S02/S03/S16) + open-dev (S01/S21) + card-dev (S05/S17/S20).
const ranges={s07:[25,30],s14:[54,57],s19:[69,70],s13:[49,53],s02:[6,10],s03:[11,13],s16:[60,62],s04:[14,19],s09:[35,36],s12:[47,48],s15:[58,59],ct_library:[35,36],s05:[20,22],s17:[63,65],s20:[71,74],card:[20,22]};
const cardSc=['s05','s17','s20','card'];
const noWash=['s02','s03','s16','s04','s09','s12','s15','ct_library'];
if(!['s06','s07','s08','s10','s11','s19','s14','s13','s02','s03','s16','s04','s09','s12','s15','ct_library','s01','s21','s05','s17','s20','card'].includes(name))throw Error('Unknown scene '+name);
const scene=name==='s08'?s08:(await import(`./chapters/${name}.js`)).default;
// S06 owns the silence between sentences 24 and 25, so the animatic has no
// uncovered frames at the S06→S07 handoff (previously 13 placeholder frames).
const gapAfter=id=>{const i=allTiming.findIndex(s=>s.n===id);return i+1<allTiming.length?Math.max(0,allTiming[i+1].start-allTiming[i].end):.8;};
const clock=name==='s08'?{duration:T.end(34),T}:name==='s06'?forScene(23,24,gapAfter(24)):name==='s01'?forScene(1,5,.9):name==='s21'?forScene(75,77,.9):ranges[name]?forScene(...ranges[name],0):forScene(37,name==='s11'?46:42);
import {T} from './timeline.js';
const c=document.getElementById('c');c.width=1920;c.height=1080;const ctx=c.getContext('2d');
await document.fonts.load('500 32px MixSans');await document.fonts.load('700 32px MixSans');await document.fonts.load('800 32px MixSans');if(cardSc.includes(name)){if(params.has('bake_card')||name==='s20')await initBaker();}else if(!noWash.includes(name)&&params.get('nowash')!=='1'){await initBaker();bakeHE((k,r,o)=>bake(k,r,{...o,hd:true,soft:true,grain:.12,edge:.3,bleed:.5}));}
await scene.prepare();window.DUR=clock.duration;window.render=t=>scene.draw(ctx,t,clock.T);window.READY=true;
