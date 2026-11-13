// Cache exact gross-line drawings once; frames only crossfade fixed teaching states.
import {prepare,drawAppendix} from './gross_swap_canonical.js';
let plates;
export async function prepareGross(){if(plates)return;prepare();plates=[1,2,3].map(stage=>{const c=document.createElement('canvas');c.width=1400;c.height=1000;drawAppendix(c.getContext('2d'),stage,{x:700,y:320,sc:1.5,rot:-.62});return c;});}
export function gross(c,stage,{x=1240,y=355,scale=1,alpha=1}={}){const q=Math.max(0,Math.min(2,stage-1)),i=Math.floor(q),f=q-i;c.save();c.translate(x,y);c.scale(scale,scale);c.globalAlpha*=alpha*(1-f);c.drawImage(plates[i],-700,-320);if(f>0){c.globalAlpha=alpha*f;c.drawImage(plates[Math.min(2,i+1)],-700,-320);}c.restore();}
export function grossPlates(){return plates;}
