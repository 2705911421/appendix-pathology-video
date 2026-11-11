import {rng} from '../lib/motion.js';
import {chromatin} from '../lib/he_detail.js';
const R=rng(40418),TAU=Math.PI*2;
function shape(rx,ry,x=0){const p=new Path2D(),phase=R()*TAU;for(let i=0;i<=32;i++){const a=i/32*TAU,f=1+.04*Math.sin(3*a+phase)+.022*Math.cos(5*a+phase*1.3);i?p.lineTo(x+Math.cos(a)*rx*f,Math.sin(a)*ry*f):p.moveTo(x+rx*f,0);}p.closePath();return p;}
const cache=Array.from({length:12},()=>({rim:shape(6.3,6),n:shape(5.3,5.1),pl:shape(9,8),pn:shape(4.4,4.3,-3),dot:shape(3.2,3),flat:shape(9,1.4)}));
export function cell(c,x,y,type='lymph',s=1,rot=0,key=0){const p=cache[key%12];c.save();c.translate(x,y);c.rotate(rot);c.scale(s,s);c.fillStyle='rgba(226,170,200,.75)';if(type==='lymph'||type==='plasma')c.fill(type==='plasma'?p.pl:p.rim);c.fillStyle='#51336F';c.fill(type==='plasma'?p.pn:type==='dot'?p.dot:type==='meso'?p.flat:p.n);if(type==='plasma'){c.fillStyle='rgba(255,248,250,.85)';c.beginPath();c.ellipse(2.5,0,2.5,3.2,0,0,TAU);c.fill();c.strokeStyle='#3F2A66';c.lineWidth=.9;for(let i=0;i<7;i++){const a=i*TAU/7;c.beginPath();c.moveTo(-3+Math.cos(a)*1.9,Math.sin(a)*1.9);c.lineTo(-3+Math.cos(a)*3.8,Math.sin(a)*3.8);c.stroke();}}else if(type==='lymph'){c.fillStyle='rgba(63,42,102,.4)';c.fill(p.n);chromatin(c,0,0,4.7,4.6,0);}c.restore();}
const pop=Array.from({length:170},(_,i)=>{const a=R()*TAU,m=i<110,r=m?.72+R()*.28:Math.sqrt(R())*.62;return [Math.cos(a)*r*65,Math.sin(a)*r*53,m?.65:1,m?1:.5,R()*TAU];});
export function follicle(c,x,y){pop.forEach((p,i)=>{c.save();c.globalAlpha*=p[3];cell(c,x+p[0],y+p[1],'lymph',p[2],p[4],i);c.restore();});}

// Separate seed: must not advance R, or cell()/follicle() shapes used by the b05 map would shift.
const R2=rng(40917);
function shape2(rx,ry,x=0){const p=new Path2D(),phase=R2()*TAU;for(let i=0;i<=32;i++){const a=i/32*TAU,f=1+.04*Math.sin(3*a+phase)+.022*Math.cos(5*a+phase*1.3);i?p.lineTo(x+Math.cos(a)*rx*f,Math.sin(a)*ry*f):p.moveTo(x+rx*f,0);}p.closePath();return p;}
const colCache=Array.from({length:12},()=>({body:shape2(4.2,11.8),nuc:shape2(2.6,4.5),gob:shape2(5.6,8.8),gn:shape2(2.3,2.1),tiny:shape2(2.7,3.5),fray:shape2(3.6,7.2)}));
// Simple columnar epithelial cell. Origin at mid-body; +y is basal (nucleus), −y is apical (lumen).
export function columnar(c,x,y,s=1,rot=0,key=0,kind='abs'){
  const p=colCache[key%12];
  c.save();c.translate(x,y);c.rotate(rot);c.scale(s,s);
  c.fillStyle=kind==='gob'?'rgba(246,228,232,.84)':kind==='fray'?'rgba(228,176,196,.62)':'rgba(230,184,202,.74)';
  c.fill(kind==='gob'?p.gob:kind==='fray'?p.fray:p.body);
  c.fillStyle='#51336F';
  c.save();c.translate(0,kind==='gob'?6.6:kind==='fray'?3.4:5.4);c.fill(kind==='gob'?p.gn:p.nuc);
  chromatin(c,0,0,kind==='gob'?2.1:2.4,kind==='gob'?2:4.1,0);c.restore();
  c.restore();
}
// Basal crypt-epithelial nucleus at low power: dark purple grain, same outline language.
export function cryptNucleus(c,x,y,s=1,rot=0,key=0){
  const p=colCache[key%12];
  c.save();c.translate(x,y);c.rotate(rot);c.scale(s,s);
  c.fillStyle='#51336F';c.fill(p.tiny);
  c.fillStyle='#3F2A66';c.globalAlpha*=.4;c.fill(p.tiny);
  c.restore();
}
