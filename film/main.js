import {initBaker,bake} from './lib/wash.js';
import {bakeHE} from './lib/he.js';
import scene from './chapters/s08.js';
import {T} from './timeline.js';
const c=document.getElementById('c');c.width=1920;c.height=1080;const ctx=c.getContext('2d');
await document.fonts.load('500 32px MixSans');await initBaker();bakeHE((k,r,o)=>bake(k,r,{...o,hd:true,soft:true,grain:.12,edge:.3,bleed:.5}));
scene.prepare();window.DUR=T.end(34);window.render=t=>scene.draw(ctx,t,T);window.READY=true;
