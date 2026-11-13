// Independent same-camera rendering of the immutable r8 library. Canonical strokes
// are screen-space compensated, so resampling a larger screenshot is not equivalent.
import {drawAppendix,frameAt,tubeOutline} from './gross_swap_canonical.js';
const smooth=p=>{p=Math.max(0,Math.min(1,p));return p*p*(3-2*p);};
const mix=(a,b,p)=>a+(b-a)*p;
let normal;
function draw(c,state,x,y,sc,rot,a=1){drawAppendix(c,state,{x,y,sc,rot},{alpha:a});}
export function reference(c,name,t,T){
 c.setTransform(1,0,0,1,0,0);c.fillStyle='#F4EFE6';c.fillRect(0,0,1920,1080);
 if(name==='s01'){
  const F=(n,f)=>T.frac(n,f);const g=smooth((t-F(1,.4))/(F(1,.74)-F(1,.4)));
  const dim=1-.18*smooth((t-T.at(5))/(F(5,.30)-T.at(5)));
  if(t<T.at(2)){
   if(!normal){const R=Math.ceil(560*1.06+90);normal=document.createElement('canvas');normal.width=normal.height=2*R;const cc=normal.getContext('2d');draw(cc,'normal',R,R,1.06,-.78);}
   const sc=mix(.90,1.06,g),k=sc/1.06,w=normal.width*k;c.drawImage(normal,1215-w/2,420-w/2,w,w);return;
  }
  const out=smooth((t-F(3,.1))/(F(3,.26)-F(3,.1)))*(1-smooth((t-F(4,.12))/(F(4,.30)-F(4,.12))));
  const close=smooth((t-F(3,.26))/(F(3,.44)-F(3,.26)))*(1-smooth((t-T.at(4))/(F(4,.15)-T.at(4))));
  ['red','yellow','black'].forEach((s,i)=>{const a=smooth((t-(T.at(2)+.04+i*.10))/.42)*(1-out)*dim;if(a>0)draw(c,s,[878,1225,1572][i],440,.70,-1.2,a);});
  if(close>0){const sc=1.16,R=Math.ceil(560*sc+90),cv=document.createElement('canvas');cv.width=cv.height=2*R;draw(cv.getContext('2d'),'yellow',R,R,sc,-1.2);const w=cv.width*1.02/sc;c.save();c.globalAlpha=close*dim;c.drawImage(cv,1240-w/2,385-w/2,w,w);c.restore();}
 }else if(name==='s05'){
  const p=smooth((t-T.at(20))/(T.frac(20,.9)-T.at(20))),q=2*p,i=Math.floor(q),f=q-i;
  draw(c,Math.min(3,i+1),1240,355,1.425,-.62,1-f);if(f>0)draw(c,Math.min(3,i+2),1240,355,1.425,-.62,f);
 }else if(name==='s06'){
  const red=smooth((t-T.frac(23,.12))/(T.frac(23,.72)-T.frac(23,.12))),z=smooth((t-T.at(24))/(T.frac(24,.24)-T.at(24)));
  draw(c,red,mix(1220,815,z),mix(395,480,z),mix(1.72,.83,z),mix(-.65,-1.12,z));
 }else if(name==='s11'){
  c.fillStyle='#111114';c.fillRect(0,0,1920,1080);c.save();c.beginPath();c.arc(1110,475,425,0,Math.PI*2);c.clip();c.fillStyle='#F4EFE6';c.fillRect(685,50,850,850);
  const q=frameAt(.42).p;c.translate(1110,475);c.rotate(-1.2);c.scale(3,3);c.translate(-q[0],-q[1]);draw(c,'yellow',0,0,1,0);c.restore();
 }else if(name==='s18'){
  const dur=T.end(66)-T.at(66),u=(t-T.at(66)-dur*.0877)/(dur/3),done=Math.floor(u),phase=u-done;
  const flash=u<0?0:Math.exp(-Math.max(0,phase-.04)*2.4),prev=done*.16,next=Math.min(.64,prev+.16),floor=u<0?0:prev+(next-prev)*(1-flash),stage=Math.max(0,Math.min(1,Math.max(floor,flash)));
  const pts=tubeOutline(1,0),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);const cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
  c.save();c.globalAlpha=smooth((t-T.at(66))/.3);c.translate(1340,470);c.rotate(-.62);c.scale(.74,.74);c.translate(-cx,-cy);draw(c,stage,0,0,1,0);c.restore();
 }
}
