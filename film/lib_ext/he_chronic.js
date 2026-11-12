import {rng} from '../lib/motion.js';
import {cell,columnar} from './cells_ext.js';
import {bake,drawWash} from '../lib/wash.js';
const TAU=Math.PI*2;
export function point(a,r){const u=Math.cos(a)*r*1.5,v=Math.sin(a)*r;return [u*Math.cos(.3)-v*Math.sin(.3),u*Math.sin(.3)+v*Math.cos(.3)];}
export const focus={fib:point(-1.58,650),lymph:point(-1.72,650),plasma:point(-1.43,665)};
// S19-specific plasma morphology; shared cell assets remain unchanged.
function chronicCell(c,x,y,type,s=1,rot=0,key=0){
 if(type!=='plasma'){cell(c,x,y,type,s,rot,key);return;}
 c.save();c.translate(x,y);c.rotate(rot);c.scale(s,s);
 c.fillStyle='#C894BA';c.beginPath();c.ellipse(0,0,9,7.8,0,0,TAU);c.fill();
 // A softly graded Golgi zone, always pink-grey rather than white.
 const halo=c.createRadialGradient(2.8,0,.3,2.8,0,4.3);
 halo.addColorStop(0,'#DCC3D5');halo.addColorStop(.5,'#D5B4CC');halo.addColorStop(1,'#C894BA');
 c.fillStyle=halo;c.beginPath();c.ellipse(2.8,0,4.3,5.2,0,0,TAU);c.fill();
 c.fillStyle='#94709F';c.beginPath();c.ellipse(-3,0,4.45,4.35,0,0,TAU);c.fill();
 c.strokeStyle='#624074';c.lineWidth=.45;c.stroke();
 c.fillStyle='#49305F';for(let j=0;j<8;j++){const a=j*TAU/8+.1*(key%3);c.beginPath();c.ellipse(-3+Math.cos(a)*3.25,Math.sin(a)*3.15,.95,.65,a,0,TAU);c.fill();}
 c.restore();
}
export function prepareChronic(){
 bake('chronic.collagen',(b,P)=>{P.fill(b,P.blob(0,0,80,8,.22,719),'#DF9CB3',100,.35);},{seed:719,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});
 const canvas=document.createElement('canvas');canvas.width=6800;canvas.height=5000;const c=canvas.getContext('2d');c.scale(2,2);c.translate(1700,1250);const R=rng(69070);
 // One oblique wall, shared by every magnification. No acute-cell assets.
 for(const [r,color] of [[885,'#EAD0D8'],[830,'#E2B1C2'],[740,'#E9C4D0'],[570,'#EAD5E0'],[390,'#D6BCD5'],[290,'#F6EEF0']]){c.beginPath();for(let i=0;i<=360;i++){const a=i/360*TAU,p=point(a,r+8*Math.sin(a*7)+5*Math.sin(a*11));i?c.lineTo(...p):c.moveTo(...p);}c.closePath();c.fillStyle=color;c.fill();}
 for(let i=0;i<155;i++){const a=i/155*TAU,p=point(a,342);c.save();c.translate(...p);c.rotate(a+.3);c.fillStyle='#F7EDF1';c.beginPath();c.ellipse(0,0,32,12,0,0,TAU);c.fill();for(let j=0;j<18;j++){const q=j/18*TAU;columnar(c,Math.cos(q)*35,Math.sin(q)*15,.65,q+Math.PI/2,i+j);}c.restore();}
 // Muscle fascicles with interspersed collagen; retain a recognisable muscular wall.
 for(let i=0;i<2900;i++){const a=R()*TAU,r=745+R()*105,p=point(a,r);c.save();c.translate(...p);c.rotate(a+Math.PI/2+.3);c.fillStyle='rgba(185,101,144,.19)';c.beginPath();c.ellipse(0,0,20+R()*20,3+R()*3,0,0,TAU);c.fill();c.fillStyle='rgba(94,55,111,.65)';c.beginPath();c.ellipse(0,0,7,1.4,0,0,TAU);c.fill();c.restore();}
 for(let i=0;i<2350;i++){const a=R()*TAU,r=545+R()*285,p=point(a,r);c.save();c.translate(...p);c.rotate(a+Math.PI/2+.3+(R()-.5)*.55);drawWash(c,'chronic.collagen',0,0,85+R()*55,{alpha:.12+R()*.1});c.strokeStyle='rgba(194,107,145,.30)';c.lineWidth=1+R()*2;c.beginPath();c.moveTo(-24,-2);c.bezierCurveTo(-8,-6,8,5,28,0);c.stroke();c.fillStyle='#795479';c.beginPath();c.ellipse(3,5,5.5,1.15,.1,0,TAU);c.fill();c.restore();}
 // Dense collagen bands separate muscle fascicles, with loose interstitium between bands.
 for(let band=0;band<7;band++){
  const origin=point(-1.58,548+band*34);c.save();c.translate(...origin);c.rotate(.23+band*.035);
  for(let strand=0;strand<13;strand++){
   const yy=(strand-6)*2.3,phase=band*.7;
   c.strokeStyle=strand%3===0?'rgba(184,83,126,.66)':'rgba(207,113,151,.62)';c.lineWidth=2.1+(strand%3)*.5;
   c.beginPath();for(let k=0;k<=48;k++){const xx=-205+strand*1.7+k*(8.5-strand*.06),yy2=yy+5*Math.sin(xx/38+phase)+2*Math.sin(xx/17+phase);k?c.lineTo(xx,yy2):c.moveTo(xx,yy2);}c.stroke();
  }
  for(let j=0;j<12;j++){const xx=-185+j*33,yy=(j%3-1)*8+5*Math.sin(xx/38+band*.7);c.fillStyle='#795078';c.beginPath();c.ellipse(xx,yy,6.4,1.15,.12*Math.cos(xx/38),0,TAU);c.fill();}
  c.restore();
 }
 for(let i=0;i<1050;i++){const a=R()*TAU,r=480+R()*355,p=point(a,r);chronicCell(c,...p,R()<.23?'plasma':'lymph',.55+R()*.2,R()*TAU,i);}
 for(const [type,target] of [['lymph',focus.lymph],['plasma',focus.plasma]])for(let i=0;i<38;i++){const a=R()*TAU,r=Math.sqrt(R())*76;chronicCell(c,target[0]+Math.cos(a)*r,target[1]+Math.sin(a)*r,type,.8+R()*.2,R()*TAU,i);}
 // Teaching anchors use exactly the same morphology as every neighbouring cell.
 for(const [type,target] of [['lymph',focus.lymph],['plasma',focus.plasma]])chronicCell(c,...target,type,1,0,0);
 return canvas;
}
