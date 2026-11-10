// Migrated detailed cell morphology. v5 scenes own tissue and disease geometry.
import { rng } from './motion.js';
import { C } from './tokens.js';
const R = rng(40417), TAU = Math.PI * 2;
const ellipse = (p,x,y,rx,ry,a=0) => { p.moveTo(x+Math.cos(a)*rx,y+Math.sin(a)*rx); p.ellipse(x,y,rx,ry,a,0,TAU); };
const speck = new Path2D();
for(let i=0;i<25;i++){const a=R()*TAU,r=Math.sqrt(R())*.86; ellipse(speck,Math.cos(a)*r,Math.sin(a)*r,.035+R()*.065,.04+R()*.08);}
export function chromatin(ctx,x,y,rx,ry,a){ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.scale(rx,ry);ctx.fillStyle='#38234F';ctx.fill(speck);ctx.restore();}
// Fine eosin bundles give the preserved wall a fibrous, ink-on-watercolour structure.
const muscleFibres = new Path2D(), collagen = new Path2D();
for(let i=0;i<280;i++){
 const x=-440+R()*880,y=-5+R()*230,l=22+R()*65;
 muscleFibres.moveTo(x-l,y);muscleFibres.bezierCurveTo(x-l*.4,y-5,x+l*.3,y-4,x+l,y);
 muscleFibres.bezierCurveTo(x+l*.2,y+5,x-l*.4,y+4,x-l,y);
}
for(let i=0;i<180;i++){
 const x=-430+R()*860,y=-145+R()*130,l=12+R()*50;
 collagen.moveTo(x,y);collagen.bezierCurveTo(x+l*.3,y-7,x+l*.6,y+8,x+l,y+2);
}
export function tissueTexture(ctx,k){ctx.save();ctx.globalAlpha*=k;ctx.strokeStyle='rgba(177,84,124,.3)';ctx.lineWidth=.65;ctx.stroke(muscleFibres);ctx.strokeStyle='rgba(189,106,147,.4)';ctx.stroke(collagen);ctx.restore();}
const NR=rng(40303);
// Kidney/sausage lobes, semi-axes 4.0×2.9. Centres are packed so neighbours keep ≥1.2 of pale cytoplasm.
const lobeOutline=(path,x,y,a,b,rot,phase,sign)=>{const N=36;for(let k=0;k<=N;k++){const t=k/N*TAU,f=1+.006*Math.sin(2*t+phase)+.004*Math.cos(3*t+phase*1.3),indent=1-.14*Math.exp(-(((t-sign*Math.PI/2)/.58)**2)),u=Math.cos(t)*a*f,v=Math.sin(t)*b*f*indent,px=x+u*Math.cos(rot)-v*Math.sin(rot),py=y+u*Math.sin(rot)+v*Math.cos(rot);k?path.lineTo(px,py):path.moveTo(px,py);}path.closePath();};
const lobeSets=[
[{x:-3.66,y:0.17,rot:1.50},{x:3.54,y:-0.18,rot:1.72}],
[{x:0,y:-4.50,rot:-0.22},{x:3.90,y:2.25,rot:1.87},{x:-3.90,y:2.25,rot:3.97}],
[{x:0,y:-5.85,rot:-0.07},{x:5.85,y:0,rot:1.50},{x:0,y:5.85,rot:3.07},{x:-5.85,y:0,rot:4.64}],
[{x:-6.12,y:-4.15,rot:5.28},{x:1.81,y:-5.72,rot:5.06},{x:7.65,y:-.2,rot:1.48},{x:2.21,y:5.59,rot:1.2},{x:-5.77,y:4.57,rot:4.07}],
];
const cellRadii=[[7.20,5.65],[8.05,7.55],[9.25,8.70],[10.625,10]];
const cells=lobeSets.map((chain,ci)=>{const lobes=new Path2D(),bridges=new Path2D(),granules=new Path2D(),clumps=new Path2D();let inward=0;for(const p of chain)inward+=Math.sin(p.rot)*p.x-Math.cos(p.rot)*p.y;const sign=inward>=0?1:-1;chain.forEach((p,i)=>{const ja=.997+NR()*.006,jb=.997+NR()*.006;lobeOutline(lobes,p.x,p.y,4*ja,2.9*jb,p.rot,i*1.7,sign);if(i){const q=chain[i-1],mx=(p.x+q.x)/2,my=(p.y+q.y)/2,ol=Math.hypot(mx,my)||1;bridges.moveTo(q.x,q.y);bridges.quadraticCurveTo(mx-my/ol*.65,my+mx/ol*.65,p.x,p.y);}for(let k=0;k<5;k++)ellipse(clumps,p.x+(R()-.5)*3.1,p.y+(R()-.5)*2.2,.35+R()*.4,.32);});const reach=cellRadii[ci][0]*.78;for(let i=0;i<22;i++){const a=R()*TAU,r=reach*Math.sqrt(R());ellipse(granules,Math.cos(a)*r,Math.sin(a)*r*.94,.22+R()*.22,.3);}return {lobes,bridges,granules,clumps};});
export function detailedNeutrophil(ctx,x,y,c,s){const p=cells[c.lobes-2],sc=s*(c.sz||1),rad=cellRadii[c.lobes-2];ctx.save();ctx.translate(x,y);ctx.rotate(c.rot);ctx.scale(sc,sc);ctx.beginPath();ctx.ellipse(0,0,rad[0],rad[1],0,0,TAU);ctx.fillStyle='rgba(226,170,200,.75)';ctx.fill();ctx.fillStyle='rgba(167,105,159,.38)';ctx.fill(p.granules);ctx.strokeStyle='#9273A5';ctx.lineWidth=.48/sc;ctx.lineCap='round';ctx.stroke(p.bridges);ctx.fillStyle='#51336F';ctx.fill(p.lobes);ctx.fillStyle='#3F2A66';ctx.fill(p.clumps);ctx.restore();}
const mesh=new Path2D();
for(let i=0;i<140;i++){const x=-430+R()*860,y=270+R()*110,l=20+R()*65,a=(R()-.5)*2.4;for(let w=0;w<3;w++){mesh.moveTo(x,y+w*1.5);mesh.bezierCurveTo(x+l*.3,y-12+w*2,x+l*.6,y+Math.sin(a)*l,x+l,y+Math.sin(a)*l+w*2);mesh.moveTo(x+l*.5,y+Math.sin(a)*l*.4);mesh.quadraticCurveTo(x+l*.7,y-12,x+l*.85,y-16-R()*15);}}
export function fibrinMesh(ctx,k){ctx.save();ctx.globalAlpha*=k;ctx.strokeStyle='#C66D92';ctx.lineWidth=.55;ctx.stroke(mesh);ctx.restore();}
// v5 gangrene scene must own its geometry/cache; the old absolute plate is private.
export function prepareGangrene(geometry) {
 if(!geometry || typeof geometry.prepare!=='function')throw Error('v5 gangrene requires a scene-local geometry adapter');
 return geometry.prepare();
}
export function gangrene(ctx,state) {
 if(typeof state?.geometry?.draw!=='function')throw Error('v5 gangrene requires scene-local geometry');
 state.geometry.draw(ctx,state);
}
export function fadeSeams(ctx,amount,geometry) {
 if(typeof geometry?.fadeSeams!=='function')throw Error('v5 seam fade requires scene-local geometry');
 geometry.fadeSeams(ctx,amount);
}
