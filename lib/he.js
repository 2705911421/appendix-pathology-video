// v5 microscopy framework. Explicit scene-owned geometry replaces the old fixed full-wall plate.
import {C} from './tokens.js';
import {detailedNeutrophil} from './he_detail.js';
export const HE={eosin:'#D98BA8',eosinPale:'#EBC3D0',hema:C.vio,hemaDark:'#3F2A66',rbc:'#A8404E'};
export async function bakeHE(geometry){if(typeof geometry?.bake!=='function')throw Error('HE bake requires scene-owned geometry');await geometry.bake();}
export function drawHE(ctx,state={}){const draw=state.drawField||state.geometry?.draw;if(typeof draw!=='function')throw Error('HE requires explicit scene-owned geometry');draw(ctx,state);}
export function drawNeutrophil(ctx,x,y,cell,s=1){if(cell.kind==='pus')throw Error('Pus cells require pyknotic/fragmented nuclei; use a dedicated pus-cell renderer');detailedNeutrophil(ctx,x,y,cell,s);}
export function drawLens(ctx,L,state,fs=1,opt={}){if(L.y+L.r+4>=810)throw Error('Lens crosses content safety');const off=opt.off||[0,0];ctx.save();ctx.beginPath();ctx.arc(L.x,L.y,L.r,0,Math.PI*2);ctx.clip();ctx.fillStyle='#F6EEF0';ctx.fillRect(L.x-L.r,L.y-L.r,L.r*2,L.r*2);ctx.translate(L.x,L.y);ctx.scale(L.r/420*fs,L.r/420*fs);ctx.translate(-off[0],-off[1]);drawHE(ctx,state);ctx.restore();ctx.save();ctx.strokeStyle=C.red;ctx.lineWidth=5;ctx.beginPath();ctx.arc(L.x,L.y,L.r,0,Math.PI*2);ctx.stroke();ctx.restore();}
export const fieldToScreen=(L,p,fs=1,off=[0,0])=>[L.x+(p[0]-off[0])*L.r/420*fs,L.y+(p[1]-off[1])*L.r/420*fs];
