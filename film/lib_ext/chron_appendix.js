// Small gross appendix for the S18 recurrence loop.
// Silhouette is the vermiform tube from gross_appendix.js (same spine, same ~10:1
// length/diameter). The mesoappendix is left off so the organ stays slender inside the ring.
// Colour is the serosal palette only: pale → a warm flush → a duskier rose that does not
// return to the pale base. No pus, no gangrene, no labels, no counts.
import {bake, drawWash} from '../lib/wash.js';
import {ink} from '../lib/ink.js';
import {rng} from '../lib/motion.js';
import {tubeOutline, frameAt, tubeRadius} from './gross_appendix.js';
const TAU=Math.PI*2;
const SPECKS=(()=>{const R=rng(6618),o=[];for(let i=0;i<22;i++)o.push({s:.08+R()*.78,v:(R()-.5)*.72,rx:7+R()*12,ry:.5+R()*.28,rot:R()*TAU,a:.08+R()*.09});return o;})();

const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const css=c=>`rgb(${c[0]|0},${c[1]|0},${c[2]|0})`;
const PALE=[198,154,144], BLUSH=[206,58,52], DUSK=[102,40,46];
const SH_P=[118,74,70], SH_D=[58,22,28], GL_P=[240,226,218], GL_B=[255,186,176];

let OUTLINE, BOX;
function outline(){
 if(OUTLINE)return OUTLINE;
 OUTLINE=tubeOutline(1,0);
 let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
 for(const p of OUTLINE){x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);}
 BOX={cx:(x0+x1)/2,cy:(y0+y1)/2,w:x1-x0,h:y1-y0};
 return OUTLINE;
}
function poly(c,pts){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();}

export function prepareAppendix(){
 outline();
 // scale:1 — brush scale already accumulated in the shared baker; do not multiply it again.
 const opt={seed:6618,scale:1,hd:true,soft:true,grain:.12,edge:.3,bleed:.5};
 bake('chron.appGrain',(b,P)=>{
  P.fill(b,P.blob(-90,-30,240,40,.42,11),'#B89890',70,.5,[.42,.52]);
  P.fill(b,P.blob(80,24,190,32,.4,12),'#8E726C',48,.48,[.4,.5]);
  P.fill(b,P.blob(6,-8,150,26,.38,13),'#C4A69A',36,.5,[.4,.5]);
 },opt);
 bake('chron.appRed',(b,P)=>{
  P.fill(b,P.blob(-40,-8,260,36,.36,21),'#C9453A',120,.46,[.36,.46]);
  P.fill(b,P.blob(70,18,160,28,.4,22),'#8E2430',80,.5,[.34,.44]);
 },{...opt,seed:6620});
}

// state.flash ∈ [0,1] is the current blush; state.floor ∈ [0,1] is the residue left by earlier laps.
export function drawRecurrenceAppendix(c,x,y,sc,rot,{flash=0,floor=0}={}){
 const pts=outline();
 const f=Math.max(0,Math.min(1,flash)), k=Math.max(0,Math.min(1,floor));
 const rest=mix(PALE,DUSK,Math.min(1,k/.62));
 const body=mix(rest,BLUSH,f);
 const sh=mix(mix(SH_P,SH_D,Math.min(1,k/.62)),[72,16,22],f);
 const gl=mix(GL_P,GL_B,Math.min(1,f*.85));
 c.save();
 c.translate(x,y);c.rotate(rot);c.scale(sc,sc);c.translate(-BOX.cx,-BOX.cy);
 poly(c,pts);
 const g=c.createLinearGradient(BOX.cx,BOX.cy-62,BOX.cx,BOX.cy+62);
 g.addColorStop(0,css(sh));
 g.addColorStop(.4,css(body));
 g.addColorStop(.62,css(mix(body,gl,.28)));
 g.addColorStop(1,css(sh));
 c.fillStyle=g;c.fill();
 c.save();c.clip();
 drawWash(c,'chron.appGrain',BOX.cx,BOX.cy,Math.max(BOX.w,BOX.h)*1.15,{alpha:.58,blend:'multiply'});
 drawWash(c,'chron.appRed',BOX.cx,BOX.cy,Math.max(BOX.w,BOX.h)*1.05,{alpha:.1+.3*f+.12*k,blend:'multiply'});
 c.globalCompositeOperation='multiply';
 for(const s of SPECKS){
  const fr=frameAt(s.s),w=tubeRadius(s.s,1)*s.v;
  c.fillStyle=`rgba(92,48,46,${s.a.toFixed(3)})`;
  c.beginPath();c.ellipse(fr.p[0]+fr.nx*w,fr.p[1]+fr.ny*w,s.rx,s.rx*s.ry,s.rot,0,TAU);c.fill();
 }
 c.restore();
 // A few serosal vessels. They brighten with each flush and stay faintly after it fades.
 c.save();c.lineCap='round';c.lineJoin='round';
 c.strokeStyle=`rgba(${(150-40*f)|0},${(48-22*f)|0},${(46-16*f)|0},${(.2+.55*f+.28*k).toFixed(3)})`;
 c.lineWidth=1.45/sc;
 for(const s0 of [.2,.38,.56,.72]){
  c.beginPath();
  const side=s0<.5?.22:-.18;
  for(let i=0;i<=12;i++){
   const s=Math.min(.86,s0+i*.016);
   const fr=frameAt(s),w=tubeRadius(s,1)*(side+.05*Math.sin(s*18+s0));
   const px=fr.p[0]+fr.nx*w,py=fr.p[1]+fr.ny*w;
   i?c.lineTo(px,py):c.moveTo(px,py);
  }
  c.stroke();
 }
 c.restore();
 ink(c,'chron.appWall','linearPath',[pts.concat([pts[0]])],{stroke:'#5C3A3A',strokeWidth:2.5/sc,roughness:.92,bowing:.55,seed:81,boil:false},{alpha:.88,fill:false});
 c.restore();
}
