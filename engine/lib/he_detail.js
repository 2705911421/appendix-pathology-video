// Opt-in chapter 04 plate. All irregular geometry is seeded and cached in field coordinates.
import { rng } from './motion.js';
import { C } from './tokens.js';
import { drawWash } from './wash.js';
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
// Open C of plump lobes. Semi-axes stay ~3.4×2.4; centre spacing leaves ≥1.5 of cytoplasm at sz≈1.
const arcChain=(n,R0,sweep)=>{const a0=-sweep/2,out=[];for(let i=0;i<n;i++){const a=a0+sweep*i/(n-1);out.push({x:Math.cos(a)*R0,y:Math.sin(a)*R0,rot:Math.atan2(Math.cos(a),-Math.sin(a))});}return out;};
const lobeOutline=(path,x,y,a,b,rot,phase,sign)=>{const N=32;for(let k=0;k<=N;k++){const t=k/N*TAU,f=1+.04*Math.sin(3*t+phase)+.022*Math.cos(5*t+phase*1.3),indent=1-.12*Math.exp(-(((t-sign*Math.PI/2)/.7)**2)),u=Math.cos(t)*a*f,v=Math.sin(t)*b*f*indent,px=x+u*Math.cos(rot)-v*Math.sin(rot),py=y+u*Math.sin(rot)+v*Math.cos(rot);k?path.lineTo(px,py):path.moveTo(px,py);}path.closePath();};
const cells=[arcChain(2,5.85,1.5),arcChain(3,5.85,3),arcChain(4,6.35,4.25),arcChain(5,7.05,4.85)].map(chain=>{const lobes=new Path2D(),bridges=new Path2D(),granules=new Path2D(),clumps=new Path2D();let inward=0;for(const p of chain)inward+=Math.sin(p.rot)*p.x-Math.cos(p.rot)*p.y;const sign=inward>=0?1:-1;chain.forEach((p,i)=>{const ja=.98+NR()*.04,jb=.98+NR()*.04;lobeOutline(lobes,p.x,p.y,3.4*ja,2.4*jb,p.rot,i*1.7,sign);if(i){const q=chain[i-1],mx=(p.x+q.x)/2,my=(p.y+q.y)/2,ol=Math.hypot(mx,my)||1;bridges.moveTo(q.x,q.y);bridges.quadraticCurveTo(mx+mx/ol*.45,my+my/ol*.45,p.x,p.y);}for(let k=0;k<5;k++)ellipse(clumps,p.x+(R()-.5)*2.8,p.y+(R()-.5)*3,.3+R()*.35,.35);});for(let i=0;i<22;i++){const a=R()*TAU,r=9.4*Math.sqrt(R());ellipse(granules,Math.cos(a)*r,Math.sin(a)*r,.22+R()*.22,.3);}return {lobes,bridges,granules,clumps};});
export function detailedNeutrophil(ctx,x,y,c,s){const p=cells[c.lobes-2],sc=s*(c.sz||1);ctx.save();ctx.translate(x,y);ctx.rotate(c.rot);ctx.scale(sc,sc);ctx.beginPath();ctx.ellipse(0,0,10.2,9.6,0,0,TAU);ctx.fillStyle='rgba(226,170,200,.75)';ctx.fill();ctx.fillStyle='rgba(167,105,159,.38)';ctx.fill(p.granules);ctx.strokeStyle='#9273A5';ctx.lineWidth=.48/sc;ctx.lineCap='round';ctx.stroke(p.bridges);ctx.fillStyle='#51336F';ctx.fill(p.lobes);ctx.fillStyle='#3F2A66';ctx.fill(p.clumps);ctx.restore();}
const mesh=new Path2D();
for(let i=0;i<140;i++){const x=-430+R()*860,y=270+R()*110,l=20+R()*65,a=(R()-.5)*2.4;for(let w=0;w<3;w++){mesh.moveTo(x,y+w*1.5);mesh.bezierCurveTo(x+l*.3,y-12+w*2,x+l*.6,y+Math.sin(a)*l,x+l,y+Math.sin(a)*l+w*2);mesh.moveTo(x+l*.5,y+Math.sin(a)*l*.4);mesh.quadraticCurveTo(x+l*.7,y-12,x+l*.85,y-16-R()*15);}}
export function fibrinMesh(ctx,k){ctx.save();ctx.globalAlpha*=k;ctx.strokeStyle='#C66D92';ctx.lineWidth=.55;ctx.stroke(mesh);ctx.restore();}
// Cached territories, overlapping RBC discs, and torn tissue, all in field coordinates.
const territories=[],plugs=new Path2D(),blood=[],tractBlood=[],dust=new Path2D(),ghosts=new Path2D();
const BR=rng(40304);
const disc=(out,x,y)=>{const rx=3.85*(.8+R()*.4),ry=rx*(.5+R()*.4),a=R()*TAU,p=new Path2D(),c=new Path2D();ellipse(p,x,y,rx,ry,a);ellipse(c,x,y,rx*.54,ry*.5,a);out.push({p,c,alpha:.7+BR()*.15,under:BR()<.45});};
let prepared=false;
export function prepareGangrene(vessels){
 if(prepared)return;prepared=true;
 for(const [vx,vy,vr] of vessels){
  ellipse(plugs,vx,vy,vr*.93,vr*.72,.12);
  for(let i=0;i<5;i++){const a=i*TAU/5+R()*.5,d=i?35+R()*70:0;territories.push({x:vx+Math.cos(a)*d,y:vy+Math.sin(a)*d*1.6,size:225+R()*160,rot:R()*TAU,key:i%4,alpha:.48+R()*.27});}
  // Compact asymmetric pools outside each vessel; leave the dark plug exposed.
  for(let j=0;j<3;j++){const a=R()*TAU,cx=vx+Math.cos(a)*(vr+19),cy=vy+Math.sin(a)*(vr+19);
   for(let i=0;i<65;i++){const b=R()*TAU,d=Math.sqrt(R()),x=cx+Math.cos(b)*d*29,y=cy+Math.sin(b)*d*22;if(Math.hypot(x-vx,(y-vy)/.8)>vr+4)disc(blood,x,y);}
  }
 }
 for(let i=0;i<1050;i++){const x=-420+R()*840,y=-286+R()*565;dust.moveTo(x,y);dust.lineTo(x+R()*2.4,y+R()*2.5);dust.lineTo(x-1,y+R()*3);dust.closePath();}
 for(let i=0;i<180;i++)ellipse(ghosts,-420+R()*840,-280+R()*560,5+R()*7,4+R()*5,R()*TAU);
}
const tear=new Path2D(),fray=new Path2D(),tags=new Path2D(),edgeDust=new Path2D(),debris=new Path2D();
const left=[],right=[];
for(let i=0;i<=80;i++){const y=-310+i*7.75,axis=190+Math.sin(i*.31)*8+Math.sin(i*.83)*4,width=12+R()*32;left.push([axis-width/2-R()*10,y]);right.push([axis+width/2+R()*10,y]);}
[...left,...right.slice().reverse()].forEach((p,i)=>i?tear.lineTo(...p):tear.moveTo(...p));tear.closePath();
// Separate rng: keeps the R/BR stream (tear, pus, vessel pools) while halving tract discs into rim clumps.
const clumpGate=(()=>{const G=rng(40311),m=Array(162).fill(false);let i=0;while(i<162){const width=2+Math.floor(G()*3);for(let k=0;k<width&&i<162;k++,i++)m[i]=true;i+=2+Math.floor(G()*3);}return m;})();
let edge=0;
for(const [side,sign] of [[left,1],[right,-1]])for(const [x,y] of side){
 const reach=4+R()*14;
 tags.moveTo(x-sign*3,y-4);tags.quadraticCurveTo(x+sign*reach*.6,y-3,x+sign*reach,y+3);tags.lineTo(x+sign*3,y+8);tags.closePath();
 for(let j=0;j<3;j++){fray.moveTo(x-sign*5,y+j);fray.quadraticCurveTo(x+sign*reach*.8,y+3,x+sign*(reach+R()*7),y+6+R()*9);}
 for(let j=0;j<9;j++)ellipse(edgeDust,x+(R()-.5)*13,y+(R()-.5)*12,.4+R()*1.2,.5+R());
 const gate=clumpGate[edge++],bloodPatch=BR()<.5;
 for(let j=0;j<5;j++){const u=R(),v=R();if(!bloodPatch)continue;if(!gate){R();R();R();BR();BR();continue;}disc(tractBlood,x-sign*(.4+u*3.5),y+(v-.5)*5);}
 ellipse(debris,x+sign*(5+R()*9),y+R()*5,1+R()*2,1+R()*3,R()*TAU);
}
const pus=new Path2D(),pusNuclei=new Path2D(),leakFibres=new Path2D();
for(let i=0;i<95;i++){const y=275+R()*115;ellipse(pus,190+(R()-.5)*(35+(y-275)*.8),y,3+R()*10,3+R()*9);}
for(let i=0;i<80;i++){const y=286+R()*94,x=190+(R()-.5)*(38+(y-275)*.8);ellipse(pusNuclei,x,y,1.3,1.8);ellipse(pusNuclei,x+3,y+2,1.2,1.6);if(i<35){leakFibres.moveTo(x,y-8);leakFibres.quadraticCurveTo(x-8,y+5,x+5,y+16);}}
function drawBlood(ctx,pool,under=false){ctx.save();const alpha=ctx.globalAlpha;for(const d of pool){if(d.under!==under)continue;ctx.globalAlpha=alpha*d.alpha*(under ? .42 : 1);ctx.fillStyle='#A8404E';ctx.fill(d.p);ctx.strokeStyle='#7E2A38';ctx.lineWidth=.32;ctx.stroke(d.p);ctx.fillStyle='#C98A92';ctx.fill(d.c);}ctx.restore();}
export function gangrene(ctx,{kv,kn,kp,ko}){
 ctx.save();ctx.globalAlpha*=kv;drawBlood(ctx,blood,true);ctx.restore();
 for(const p of territories)drawWash(ctx,`c04.necro.${p.key}`,p.x,p.y,p.size,{alpha:kn*p.alpha,grow:kn,rot:p.rot,soft:.65});
 ctx.save();ctx.globalAlpha*=kn;ctx.fillStyle='rgba(128,109,128,.24)';ctx.fill(ghosts);ctx.strokeStyle='rgba(98,76,100,.2)';ctx.lineWidth=2.6;ctx.stroke(ghosts);ctx.fillStyle='rgba(53,32,57,.7)';ctx.fill(dust);ctx.restore();
 ctx.save();ctx.globalAlpha*=kv*.9;drawBlood(ctx,blood);ctx.fillStyle='#3A1F2A';ctx.fill(plugs);ctx.restore();
 if(kp>0){ctx.save();ctx.beginPath();ctx.rect(125,-320,140,640*kp);ctx.clip();
  ctx.strokeStyle='rgba(58,31,42,.45)';ctx.lineJoin='round';ctx.lineWidth=7;ctx.stroke(tear);
  ctx.fillStyle='#E8D6DB';ctx.fill(tear);ctx.strokeStyle='#50303F';ctx.lineWidth=4;ctx.stroke(tear);
  ctx.fillStyle='#785565';ctx.fill(tags);ctx.strokeStyle='#9F7288';ctx.lineWidth=.7;ctx.stroke(fray);
  drawBlood(ctx,tractBlood,true);drawBlood(ctx,tractBlood);ctx.fillStyle='#3F2A48';ctx.fill(edgeDust);ctx.fillStyle='#725367';ctx.fill(debris);ctx.restore();
 }
 if(ko>0){ctx.save();ctx.globalAlpha*=ko;ctx.fillStyle=C.pus;ctx.fill(pus);ctx.fillStyle='#6B4C9A';ctx.fill(pusNuclei);ctx.strokeStyle='#D98BA8';ctx.lineWidth=.6;ctx.stroke(leakFibres);ctx.restore();}
}
