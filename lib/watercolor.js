// Thin recipe adapter; production pigment is baked by the unmodified v4 wash engine.
import {bake,drawWash} from './wash.js';
const ready=new Set();
export function pigment(key,color,seed){if(ready.has(key))return;ready.add(key);bake(key,(b,P)=>{P.fill(b,P.blob(0,0,360,45,.23,seed),color,155,.5,[.5,.55]);P.fill(b,P.blob(-35,25,275,39,.28,seed+1),color,65,.5,[.5,.55]);},{seed,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});globalThis.brush.scaleBrushes(1/2.4);}
export function stain(c,key,x,y,size,alpha=1){drawWash(c,key,x,y,size,{alpha,blend:'multiply'});}
