// S18 (sentences 66–68): repeated episodes may turn chronic.
// Left column: 反复发作 → 可转慢性, then 急性：变质、渗出 / 慢性：增生.
// Right: a non-counting recurrence loop around a small gross appendix, an iris into
// the acute H&E wall, then one acute / chronic comparison pair.
// Acute drawing vocabulary comes from the approved S10/S11 segment; chronic tissue
// is the S19 candidate plate (read-only copy).
import {bake} from '../lib/wash.js';
import {arrow} from '../lib/ann.js';
import {prepareAcute,ACUTE_RECT} from './gross_swap_chron_acute.js';
import {prepareChronic,focus} from './gross_swap_chron_he_chronic.js';
import {prepareAppendix,drawRecurrenceAppendix} from './gross_swap_chron_appendix.js';
const TAU=Math.PI*2;
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
// Loop and the acute window it opens into sit center-right. Diameter is 55% of the frame height.
const LX=1340,LY=470,LOOP_R=1080*.55/2,SCOPE_R=425;
// Sentence 68 pair: each window is 62% of the frame height, to the right of the left column.
const CMP={ax:845,ay:493,ar:335,bx:1551,by:493,br:335};
let acute,chronic,off,offc;
// One lap of the warm pulse is one blush. Residue rises after every return and is not cleared.
// The offset (a fraction of sentence 66) puts the review stills on a flush and on the settled colour.
function lapState(t,T){
 const t0=T.at(66),dur=Math.max(1e-3,T.end(66)-t0),period=dur/3,offset=dur*.0877;
 const u=(t-t0-offset)/period;
 if(u<0)return {phase:0,flash:0,floor:0,ang:-2.85+u*TAU};
 const done=Math.floor(u),phase=u-done;
 const fade=Math.exp(-Math.max(0,phase-.04)*2.4);
 const prev=done*.16,next=Math.min(.64,prev+.16);
 return {phase,flash:fade,floor:prev+(next-prev)*(1-fade),ang:-2.85+phase*TAU};
}
// ---------------------------------------------------------------- paper: recurrence loop
function loopPath(c,cx,cy,rr,a0,a1){c.beginPath();for(let i=0;i<=48;i++){const a=a0+(a1-a0)*i/48,f=1+.020*Math.sin(a*5+1.2)+.011*Math.sin(a*9);const x=cx+Math.cos(a)*rr*f,y=cy+Math.sin(a)*rr*f;i?c.lineTo(x,y):c.moveTo(x,y);}}
function head(c,x,y,ang,size=.42){c.save();c.translate(x,y);c.rotate(ang);c.beginPath();c.moveTo(size*26,0);c.lineTo(-size*10,-size*17);c.quadraticCurveTo(-size*3,0,-size*10,size*17);c.closePath();c.fill();c.restore();}
function drawLoop(c,t,T){
 const t0=T.at(66),p1=ease((t-t0-.08)/.62),p2=ease((t-t0-.46)/.32);
 const lap=lapState(t,T),rr=LOOP_R;
 c.save();
 const appA=ease((t-t0)/.30);
 if(appA>0){c.save();c.globalAlpha*=appA;drawRecurrenceAppendix(c,LX,LY,.74,-.62,lap);c.restore();}
 // A broad watercolour band follows the ring; no filled disc, no ticking marks.
 c.save();c.filter='blur(7px)';c.strokeStyle='rgba(214,69,58,.16)';c.lineCap='round';c.lineWidth=26;
 for(const [a0,a1] of [[-3.0,-.5],[.15,2.62]]){loopPath(c,LX,LY,rr,a0,a0+(a1-a0)*p1);c.stroke();}
 c.restore();
 // One warm pulse runs around the ring. Each return is the blush above; never a count.
 const pa=lap.ang;
 c.save();c.globalAlpha=.55*p1;c.filter='blur(2.5px)';c.strokeStyle='#C9503F';c.lineWidth=8;c.lineCap='round';
 loopPath(c,LX,LY,rr,pa,pa+.72);c.stroke();
 const hx=LX+Math.cos(pa+.72)*rr,hy=LY+Math.sin(pa+.72)*rr;
 const g0=c.createRadialGradient(hx,hy,1,hx,hy,40);g0.addColorStop(0,'rgba(214,69,58,.42)');g0.addColorStop(1,'rgba(214,69,58,0)');
 c.fillStyle=g0;c.beginPath();c.arc(hx,hy,40,0,TAU);c.fill();c.restore();
 // Two hand-drawn arcs with arrowheads. Ink is at least 5px. No ticks and no numbers.
 c.strokeStyle='#2A2A35';c.fillStyle='#2A2A35';c.lineWidth=5.6;c.lineCap='round';c.lineJoin='round';
 const arcs=[[-3.0,-.5],[.15,2.62]];
 arcs.forEach(([a0,a1],i)=>{
  const k=ease((p1-i*.16)/.84);if(k<=0)return;
  c.save();c.globalAlpha=Math.min(1,k*1.4);
  loopPath(c,LX,LY,rr,a0,a0+(a1-a0)*k);c.stroke();
  if(p2>0){const a=a1,x=LX+Math.cos(a)*rr,y=LY+Math.sin(a)*rr;c.globalAlpha*=p2;head(c,x,y,a+Math.PI/2,1);}
  c.restore();
 });
 c.globalAlpha=.22*p1;c.lineWidth=6.5;c.strokeStyle='#B5573F';
 for(const [a0,a1] of arcs){loopPath(c,LX,LY,rr-8,a0,a1);c.stroke();}
 c.restore();
}
// ---------------------------------------------------------------- left column
function drawLeft(c,t,T,light){
 const ink=light?'#EFE8DC':'#2A2A35',red=light?'#F07A63':'#D6453A',rule=light?'rgba(239,232,220,.30)':'rgba(42,42,53,.22)';
 const a1=ease((t-T.frac(66,.06))/.18),a2=ease((t-T.frac(66,.30))/.16),a3=ease((t-T.frac(66,.44))/.18);
 const r67=ease((t-T.at(67)-.06)/.24),r68=ease((t-T.frac(68,.08))/.22);
 c.save();c.textAlign='left';c.textBaseline='alphabetic';
 c.globalAlpha=a1;c.fillStyle=ink;c.font='700 40px MixSans';c.fillText('反复发作',75,330);
 c.globalAlpha=a2;
 arrow(c,[95,348],[95,398],{k:a2,col:red,w:2.4,head:13});
 c.globalAlpha=a3;c.fillStyle=ink;c.font='700 40px MixSans';c.fillText('可转慢性',75,442);
 if(r67>0){
  c.globalAlpha=r67;c.strokeStyle=rule;c.lineWidth=1.2;c.beginPath();c.moveTo(75,492);c.lineTo(462,492);c.stroke();
  c.globalAlpha=r67*ease((t-T.frac(67,.10))/.26);c.fillStyle=ink;c.font='700 34px MixSans';c.fillText('急性：变质、渗出',75,566);
 }
 if(r68>0){c.globalAlpha=r68;c.fillStyle=ink;c.font='700 34px MixSans';c.fillText('慢性：增生',75,648);}
 c.restore();
}
// ---------------------------------------------------------------- dark field helpers
function field(c,plate,rect,cam,cx,cy,rr,sz,alpha=1){
 const [px,py,pw,ph]=rect;
 c.save();c.globalAlpha=alpha;
 c.beginPath();c.arc(cx,cy,rr,0,TAU);c.clip();
 c.fillStyle='#F6EEF0';c.fillRect(cx-rr,cy-rr,rr*2,rr*2);
 c.translate(cx,cy);c.scale(sz,sz);c.translate(-cam[0],-cam[1]);
 c.drawImage(plate,px,py,pw,ph);
 c.restore();
 c.save();
 c.beginPath();c.arc(cx,cy,rr,0,TAU);
 const g=c.createRadialGradient(cx,cy,rr*.76,cx,cy,rr);
 g.addColorStop(0,'rgba(42,42,53,0)');g.addColorStop(1,'rgba(42,42,53,.22)');
 c.fillStyle=g;c.fill();
 c.strokeStyle='#4C4555';c.lineWidth=1.6;c.stroke();
 c.globalAlpha=alpha*.5;c.strokeStyle='#2E2933';c.lineWidth=1.2;c.beginPath();c.arc(cx,cy,rr+7,0,TAU);c.stroke();
 c.restore();
}
// Leader ends in an arrowhead and a dot, both on the anchor. Size is screen pixels.
function tag(c,text,tx,ty,px,py,a,size=30){
 if(a<=0)return;
 c.save();c.globalAlpha=a;c.font=`500 ${size}px MixSans`;c.textAlign='left';c.textBaseline='alphabetic';
 c.fillStyle='#D8C5E7';c.fillText(text,tx,ty);
 const x0=tx+8,y0=ty+8;
 const x1=tx+Math.max(28,Math.min(84,(px-tx)*.2));
 const y1=y0+Math.sign(py-y0||1)*14;
 const stroke=(w,col)=>{c.strokeStyle=col;c.lineWidth=w;c.lineJoin='round';c.lineCap='round';c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.lineTo(px,py);c.stroke();};
 stroke(2.3,'rgba(17,17,20,.42)');
 stroke(1.6,'rgba(216,197,231,.98)');
 const ang=Math.atan2(py-y1,px-x1),ah=12;
 c.fillStyle='#111114';c.beginPath();
 c.moveTo(px,py);
 c.lineTo(px-Math.cos(ang-.5)*ah-Math.cos(ang)*1.5,py-Math.sin(ang-.5)*ah-Math.sin(ang)*1.5);
 c.lineTo(px-Math.cos(ang+.5)*ah-Math.cos(ang)*1.5,py-Math.sin(ang+.5)*ah-Math.sin(ang)*1.5);
 c.closePath();c.fill();
 c.fillStyle='#E7D8F2';c.beginPath();
 c.moveTo(px,py);
 c.lineTo(px-Math.cos(ang-.42)*(ah-3),py-Math.sin(ang-.42)*(ah-3));
 c.lineTo(px-Math.cos(ang+.42)*(ah-3),py-Math.sin(ang+.42)*(ah-3));
 c.closePath();c.fill();
 c.fillStyle='#111114';c.beginPath();c.arc(px,py,5,0,TAU);c.fill();
 c.fillStyle='#E7D8F2';c.beginPath();c.arc(px,py,3.4,0,TAU);c.fill();
 c.restore();
}
function caption(c,text,x,y,a){
 if(a<=0)return;c.save();c.globalAlpha=a;c.font='700 42px MixSans';c.fillStyle='#E4D4F0';c.textAlign='center';c.textBaseline='alphabetic';c.fillText(text,x,y);c.restore();
}
function acuteCam(t,T){
 const k=[[T.at(67),[10,-80,1.18]],[T.frac(67,.62),[0,-90,1.34]],[T.end(67),[0,-94,1.38]]];
 let v=k[0][1];for(let i=1;i<k.length;i++){if(t>=k[i][0]){v=k[i][1];continue;}const a=k[i-1],b=k[i],f=ease((t-a[0])/(b[0]-a[0]));v=a[1].map((q,j)=>q+(b[1][j]-q)*f);break;}return v;
}
function drawDark(c,t,T){
 c.setTransform(1,0,0,1,0,0);c.fillStyle='#111114';c.fillRect(0,0,1920,1080);
 const cam=acuteCam(t,T),sz=cam[2];
 const S=(fx,fy)=>[LX+(fx-cam[0])*sz,LY+(fy-cam[1])*sz];
 if(t<T.at(68)){
  field(c,acute,ACUTE_RECT,cam,LX,LY,SCOPE_R,sz);
  const inA=ease((t-T.frac(67,.30))/.20),outA=ease((T.at(68)-t)/.22);
  const a=Math.min(inA,outA);
  // 变质: upper edge of the mucosal necrosis, in the pale ground just under the broken epithelium.
  let p=S(0,-308);tag(c,'变质',620,168,p[0],p[1],a,30);
  // 渗出: submucosa, inflammatory cells in the pale edematous ground.
  p=S(30,-90);tag(c,'渗出',620,690,p[0],p[1],a*ease((t-T.frac(67,.55))/.2),30);
 } else {
  const q=ease((t-T.at(68))/.46),qc=ease((q-.55)/.45);
  const ax=LX+(CMP.ax-LX)*q,ay=LY+(CMP.ay-LY)*q,ar=SCOPE_R+(CMP.ar-SCOPE_R)*q;
  field(c,acute,ACUTE_RECT,cam,ax,ay,ar,sz*ar/SCOPE_R);
  if(qc>0)field(c,chronic,[focus.fib[0]-300,focus.fib[1]-300,600,600],[focus.fib[0]+6,focus.fib[1]+4],CMP.bx,CMP.by,CMP.br*qc,1.32,qc);
  caption(c,'急性',ax,136,qc);caption(c,'慢性',CMP.bx,136,qc);
  const fa=ease((t-T.frac(68,.42))/.26);
  // Collagen inside the chronic window, clear of the vignette.
  tag(c,'纤维组织增生',1288,882,CMP.bx+36,CMP.by+78,fa,34);
 }
 c.save();c.fillStyle='#E8DDE9';c.font='500 30px MixSans';c.textAlign='left';c.fillText('中倍',1188,36);c.restore();
 drawLeft(c,t,T,true);
}
// ---------------------------------------------------------------- scene
export default {
 prepare(){
  bake('chron.edema',(b,P)=>P.fill(b,P.blob(0,0,230,24,.3,719),'#F5DFE8',85,.65),{seed:719,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});
  prepareAppendix();
  acute=prepareAcute();
  const tiles=prepareChronic();
  chronic=document.createElement('canvas');chronic.width=chronic.height=1800;
  const cc=chronic.getContext('2d');cc.scale(3,3);cc.translate(300,300);cc.translate(-focus.fib[0],-focus.fib[1]);
  for(const q of tiles)cc.drawImage(q.canvas,q.x,q.y,q.w,q.h);
  off=document.createElement('canvas');off.width=1920;off.height=1080;offc=off.getContext('2d');
 },
 draw(c,t,T){
  const enterStart=T.at(67)-.45,enterEnd=T.at(67)+.25;
  const d=ease((t-enterStart)/(enterEnd-enterStart));
  c.setTransform(1,0,0,1,0,0);
  if(d<=0){c.fillStyle='#F4EFE6';c.fillRect(0,0,1920,1080);drawLoop(c,t,T);drawLeft(c,t,T,false);return;}
  if(d>=1){drawDark(c,t,T);return;}
  c.fillStyle='#F4EFE6';c.fillRect(0,0,1920,1080);drawLoop(c,t,T);drawLeft(c,t,T,false);
  const radius=1250*d;
  const dim=c.createRadialGradient(LX,LY,Math.max(0,radius-18),LX,LY,Math.max(1,radius));
  dim.addColorStop(0,'rgba(17,17,20,0)');dim.addColorStop(1,`rgba(17,17,20,${d.toFixed(4)})`);
  c.fillStyle=dim;c.fillRect(0,0,1920,1080);
  offc.setTransform(1,0,0,1,0,0);offc.clearRect(0,0,1920,1080);offc.globalCompositeOperation='source-over';
  drawDark(offc,t,T);
  offc.globalCompositeOperation='destination-in';
  const mask=offc.createRadialGradient(LX,LY,Math.max(0,radius-18),LX,LY,Math.max(1,radius+.01));
  mask.addColorStop(0,'rgba(0,0,0,1)');mask.addColorStop(1,'rgba(0,0,0,0)');
  offc.fillStyle=mask;offc.fillRect(0,0,1920,1080);offc.globalCompositeOperation='source-over';
  c.setTransform(1,0,0,1,0,0);c.drawImage(off,0,0);
 }
};
