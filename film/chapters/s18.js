// S18 (sentences 66–68): repeated episodes may turn chronic.
// Left column: 反复发作 → 可转慢性, then 急性：变质、渗出 / 慢性：增生.
// Right: a non-counting recurrence loop on paper, an iris into the acute H&E wall,
// then one acute / chronic comparison pair. Acute drawing vocabulary comes from the
// approved S10/S11 segment; chronic tissue is the S19 candidate plate (read-only copy).
import {bake} from '../lib/wash.js';
import {arrow} from '../lib/ann.js';
import {prepareAcute,ACUTE_RECT} from '../lib_ext/chron_acute.js';
import {prepareChronic,focus} from '../lib_ext/chron_he_chronic.js';
const TAU=Math.PI*2;
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const CX=1110,CY=475,R=425;
let acute,chronic,off,offc;
// ---------------------------------------------------------------- paper: recurrence loop
function loopPath(c,cx,cy,rr,a0,a1){c.beginPath();for(let i=0;i<=48;i++){const a=a0+(a1-a0)*i/48,f=1+.020*Math.sin(a*5+1.2)+.011*Math.sin(a*9);const x=cx+Math.cos(a)*rr*f,y=cy+Math.sin(a)*rr*f;i?c.lineTo(x,y):c.moveTo(x,y);}}
function head(c,x,y,ang,size=.42){c.save();c.translate(x,y);c.rotate(ang);c.beginPath();c.moveTo(size*26,0);c.lineTo(-size*10,-size*17);c.quadraticCurveTo(-size*3,0,-size*10,size*17);c.closePath();c.fill();c.restore();}
function drawLoop(c,t,T){
 const t0=T.at(66),p1=ease((t-t0-.08)/.62),p2=ease((t-t0-.46)/.32);
 c.save();
 const rr=330;
 // A broad watercolour band follows the ring; no filled disc, no ticking marks.
 c.save();c.filter='blur(7px)';c.strokeStyle='rgba(214,69,58,.16)';c.lineCap='round';c.lineWidth=26;
 for(const [a0,a1] of [[-3.0,-.5],[.15,2.62]]){loopPath(c,CX,CY,rr,a0,a0+(a1-a0)*p1);c.stroke();}
 c.restore();
 // One warm pulse runs around the ring: a recurring episode, never a count.
 const pa=-3.0+((t-t0)*.72)%TAU;
 c.save();c.globalAlpha=.55*p1;c.filter='blur(2.5px)';c.strokeStyle='#C9503F';c.lineWidth=8;c.lineCap='round';loopPath(c,CX,CY,rr,pa,pa+.72);c.stroke();
 const hx=CX+Math.cos(pa+.72)*rr,hy=CY+Math.sin(pa+.72)*rr;
 const g0=c.createRadialGradient(hx,hy,1,hx,hy,40);g0.addColorStop(0,'rgba(214,69,58,.42)');g0.addColorStop(1,'rgba(214,69,58,0)');
 c.fillStyle=g0;c.beginPath();c.arc(hx,hy,40,0,TAU);c.fill();c.restore();
 // Two hand-drawn arcs with arrowheads: a closed cycle, no ticks and no numbers.
 c.strokeStyle='#2A2A35';c.fillStyle='#2A2A35';c.lineWidth=3.2;c.lineCap='round';
 const arcs=[[-3.0,-.5],[.15,2.62]];
 arcs.forEach(([a0,a1],i)=>{
  const k=ease((p1-i*.16)/.84);if(k<=0)return;
  c.save();c.globalAlpha=Math.min(1,k*1.4);
  loopPath(c,CX,CY,rr,a0,a0+(a1-a0)*k);c.stroke();
  if(p2>0){const a=a1,x=CX+Math.cos(a)*rr,y=CY+Math.sin(a)*rr;c.globalAlpha*=p2;head(c,x,y,a+Math.PI/2,.82);}
  c.restore();
 });
 // Inner echo stroke: watercolour double line, never a vector symbol.
 c.globalAlpha=.22*p1;c.lineWidth=6.5;c.strokeStyle='#B5573F';
 for(const [a0,a1] of arcs){loopPath(c,CX,CY,rr-5,a0,a1);c.stroke();}
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
function tag(c,text,tx,ty,px,py,a){
 if(a<=0)return;
 c.save();c.globalAlpha=a;c.font='400 27px MixSans';
 c.fillStyle='#D8C5E7';c.fillText(text,tx,ty);
 c.strokeStyle='rgba(184,161,200,.9)';c.lineWidth=1.3;c.beginPath();c.moveTo(tx+4,ty+10);c.lineTo(tx-18,ty+26);c.lineTo(px,py);c.stroke();
 c.fillStyle='rgba(216,197,231,.9)';c.beginPath();c.arc(px,py,2.6,0,TAU);c.fill();c.restore();
}
function caption(c,text,x,y,a){
 if(a<=0)return;c.save();c.globalAlpha=a;c.font='500 30px MixSans';c.fillStyle='#CDBBDD';c.textAlign='center';c.fillText(text,x,y);c.restore();
}
function acuteCam(t,T){
 const k=[[T.at(67),[10,-80,1.18]],[T.frac(67,.62),[0,-90,1.34]],[T.end(67),[0,-94,1.38]]];
 let v=k[0][1];for(let i=1;i<k.length;i++){if(t>=k[i][0]){v=k[i][1];continue;}const a=k[i-1],b=k[i],f=ease((t-a[0])/(b[0]-a[0]));v=a[1].map((q,j)=>q+(b[1][j]-q)*f);break;}return v;
}
function drawDark(c,t,T){
 c.setTransform(1,0,0,1,0,0);c.fillStyle='#111114';c.fillRect(0,0,1920,1080);
 const cam=acuteCam(t,T),sz=cam[2];
 if(t<T.at(68)){
  field(c,acute,ACUTE_RECT,cam,CX,CY,R,sz);
  const S=(fx,fy)=>[CX+(fx-cam[0])*sz,CY+(fy-cam[1])*sz];
  const inA=ease((t-T.frac(67,.30))/.20),outA=ease((T.at(68)-t)/.22);
  const a=Math.min(inA,outA);
  let p=S(-14,-268);tag(c,'变质',546,300,p[0],p[1],a);
  p=S(64,-70);tag(c,'渗出',546,620,p[0],p[1],a*ease((t-T.frac(67,.55))/.2));
 } else {
  const q=ease((t-T.at(68))/.46),qc=ease((q-.55)/.45);
  const cx=1110+(860-1110)*q,cy=475+(470-475)*q,rr=425+(272-425)*q;
  field(c,acute,ACUTE_RECT,cam,cx,cy,rr,sz*rr/R);
  if(qc>0)field(c,chronic,[focus.fib[0]-300,focus.fib[1]-300,600,600],[focus.fib[0]+6,focus.fib[1]+4],1480,470,272*qc,1.32,qc);
  caption(c,'急性',cx,168,qc);caption(c,'慢性',1480,168,qc);
  const fa=ease((t-T.frac(68,.42))/.26);
  tag(c,'纤维组织增生',1236,812,1480+46*1.32,470+30*1.32,fa);
 }
 c.save();c.fillStyle='#E8DDE9';c.font='500 30px MixSans';c.fillText('中倍',1030,35);c.restore();
 drawLeft(c,t,T,true);
}
// ---------------------------------------------------------------- scene
export default {
 prepare(){
  bake('chron.edema',(b,P)=>P.fill(b,P.blob(0,0,230,24,.3,719),'#F5DFE8',85,.65),{seed:719,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});
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
  // paper plate under the opening iris
  c.fillStyle='#F4EFE6';c.fillRect(0,0,1920,1080);drawLoop(c,t,T);drawLeft(c,t,T,false);
  const radius=1250*d;
  const dim=c.createRadialGradient(CX,CY,Math.max(0,radius-18),CX,CY,Math.max(1,radius));
  dim.addColorStop(0,'rgba(17,17,20,0)');dim.addColorStop(1,`rgba(17,17,20,${d.toFixed(4)})`);
  c.fillStyle=dim;c.fillRect(0,0,1920,1080);
  offc.setTransform(1,0,0,1,0,0);offc.clearRect(0,0,1920,1080);offc.globalCompositeOperation='source-over';
  drawDark(offc,t,T);
  offc.globalCompositeOperation='destination-in';
  const mask=offc.createRadialGradient(CX,CY,Math.max(0,radius-18),CX,CY,Math.max(1,radius+.01));
  mask.addColorStop(0,'rgba(0,0,0,1)');mask.addColorStop(1,'rgba(0,0,0,0)');
  offc.fillStyle=mask;offc.fillRect(0,0,1920,1080);offc.globalCompositeOperation='source-over';
  c.setTransform(1,0,0,1,0,0);c.drawImage(off,0,0);
 }
};
