// S18 (sentences 66–68). Sentence 66 keeps the recurrence loop.
// Microscopy is b09 only: acute window = s08 ulcer map; chronic window = S19 b09_chronic.
// Sentence 68 ends on the S19 overview camera so the circular field matches s69_overview.
import {arrow} from '../lib/ann.js';
import {prepareAcute,point} from '../lib_ext/b09_acute_window.js';
import {prepareChronic,focus} from '../lib_ext/b09_chronic.js';
import {prepareAppendix,drawRecurrenceAppendix} from '../lib_ext/chron_appendix.js';
const TAU=Math.PI*2;
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
// High power is s08 z≈1 (neutrophil body ~20 px). Medium power is half of that.
export const Z_HI=1,Z_MID=.5,Z_END=.6;
export const SCOPE={x:1110,y:475,r:425},WIN_A={x:950,y:475,r:300},WIN_C={x:1580,y:475,r:300};
const DEFECT=[10,-285],EXUDATE=[12,-328],INFIL=[-200,-226];
const LX=1340,LY=470,LOOP_R=1080*.55/2;
let acute,chronic,off,offc;
export const audit={boxes:[],targets:{},camera:null,chronicCamera:null,windows:null,power:''};

function lapState(t,T){
 const t0=T.at(66),dur=Math.max(1e-3,T.end(66)-t0),period=dur/3,offset=dur*.0877;
 const u=(t-t0-offset)/period;
 if(u<0)return {phase:0,flash:0,floor:0,ang:-2.85+u*TAU};
 const done=Math.floor(u),phase=u-done;
 const fade=Math.exp(-Math.max(0,phase-.04)*2.4);
 const prev=done*.16,next=Math.min(.64,prev+.16);
 return {phase,flash:fade,floor:prev+(next-prev)*(1-fade),ang:-2.85+phase*TAU};
}
function loopPath(c,cx,cy,rr,a0,a1){c.beginPath();for(let i=0;i<=48;i++){const a=a0+(a1-a0)*i/48,f=1+.020*Math.sin(a*5+1.2)+.011*Math.sin(a*9);const x=cx+Math.cos(a)*rr*f,y=cy+Math.sin(a)*rr*f;i?c.lineTo(x,y):c.moveTo(x,y);}}
function head(c,x,y,ang,size=.42){c.save();c.translate(x,y);c.rotate(ang);c.beginPath();c.moveTo(size*26,0);c.lineTo(-size*10,-size*17);c.quadraticCurveTo(-size*3,0,-size*10,size*17);c.closePath();c.fill();c.restore();}
function drawLoop(c,t,T){
 const t0=T.at(66),p1=ease((t-t0-.08)/.62),p2=ease((t-t0-.46)/.32);
 const lap=lapState(t,T),rr=LOOP_R;
 c.save();
 const appA=ease((t-t0)/.30);
 if(appA>0){c.save();c.globalAlpha*=appA;drawRecurrenceAppendix(c,LX,LY,.74,-.62,lap);c.restore();}
 c.save();c.filter='blur(7px)';c.strokeStyle='rgba(214,69,58,.16)';c.lineCap='round';c.lineWidth=26;
 for(const [a0,a1] of [[-3.0,-.5],[.15,2.62]]){loopPath(c,LX,LY,rr,a0,a0+(a1-a0)*p1);c.stroke();}
 c.restore();
 const pa=lap.ang;
 c.save();c.globalAlpha=.55*p1;c.filter='blur(2.5px)';c.strokeStyle='#C9503F';c.lineWidth=8;c.lineCap='round';
 loopPath(c,LX,LY,rr,pa,pa+.72);c.stroke();
 const hx=LX+Math.cos(pa+.72)*rr,hy=LY+Math.sin(pa+.72)*rr;
 const g0=c.createRadialGradient(hx,hy,1,hx,hy,40);g0.addColorStop(0,'rgba(214,69,58,.42)');g0.addColorStop(1,'rgba(214,69,58,0)');
 c.fillStyle=g0;c.beginPath();c.arc(hx,hy,40,0,TAU);c.fill();c.restore();
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
function note(c,text,x,y,font,align){
 c.font=font;const w=c.measureText(text).width,size=+font.match(/(\d+)px/)[1];
 const left=align==='center'?x-w/2:x;
 audit.boxes.push({text,x:left,y:y-size,w,h:size+8,baseline:y,font,align:align||'left'});
}
function drawLeft(c,t,T,light){
 const ink=light?'#E8DDE9':'#2A2A35',red=light?'#F07A63':'#D6453A',rule=light?'rgba(232,221,233,.30)':'rgba(42,42,53,.22)';
 const a1=ease((t-T.frac(66,.06))/.18),a2=ease((t-T.frac(66,.30))/.16),a3=ease((t-T.frac(66,.44))/.18);
 const r67=ease((t-T.frac(67,.10))/.20),r68=ease((t-T.frac(68,.08))/.18);
 c.save();c.textAlign='left';c.textBaseline='alphabetic';
 if(a1>0){c.globalAlpha=a1;c.fillStyle=ink;c.font='700 44px MixSans';c.fillText('反复发作',75,330);if(a1>.8)note(c,'反复发作',75,330,'700 44px MixSans','left');}
 if(a2>0){c.globalAlpha=a2;arrow(c,[95,356],[95,390],{k:a2,col:red,w:2.4,head:13});}
 if(a3>0){c.globalAlpha=a3;c.fillStyle=ink;c.font='700 44px MixSans';c.fillText('可转慢性',75,442);if(a3>.8)note(c,'可转慢性',75,442,'700 44px MixSans','left');}
 if(r67>0){
  c.globalAlpha=r67;c.strokeStyle=rule;c.lineWidth=1.2;c.beginPath();c.moveTo(75,500);c.lineTo(430,500);c.stroke();
  c.fillStyle=ink;c.font='700 44px MixSans';c.fillText('急性：变质、渗出',75,566);if(r67>.8)note(c,'急性：变质、渗出',75,566,'700 44px MixSans','left');
 }
 if(r68>0){c.globalAlpha=r68;c.fillStyle=ink;c.font='700 44px MixSans';c.fillText('慢性：增生',75,648);if(r68>.8)note(c,'慢性：增生',75,648,'700 44px MixSans','left');}
 c.restore();
}
export function cameraAt(t,T){
 const def=point(...DEFECT),inf=point(...INFIL);
 const mid=[def[0],def[1],Z_MID],hi=[inf[0],inf[1],Z_HI];
 if(!T.has(67)||t<T.at(67))return mid;
 if(t<T.at(68)){
  const a=T.frac(67,.30),b=T.frac(67,.62);
  if(t<=a)return mid;if(t>=b)return hi;
  const k=ease((t-a)/(b-a));return mid.map((v,i)=>v+(hi[i]-v)*k);
 }
 const back=[def[0],def[1],Z_MID],a=T.at(68),b=T.frac(68,.32);
 if(t>=b)return back;
 const k=ease((t-a)/(b-a));return hi.map((v,i)=>v+(back[i]-v)*k);
}
// S19 s69_overview (frac .10, still on the opening hold) is center (0,0), z=0.60.
// The compare pair uses z_mid; the iris settles on that S19 camera 0.05s before the sentence ends
// so the encoded last frame is already the handoff, then holds through T.end(68).
export function chronicCameraAt(t,T){
 const settle=T.end(68)-.05,a=T.frac(68,.40);
 if(t<=a)return [0,0,Z_MID];
 const k=ease((t-a)/(settle-a));
 return [0,0,Z_MID+(Z_END-Z_MID)*k];
}
export function pxPerUm(z){return z/Z_HI*(850/475);}
function powerOf(z){const p=pxPerUm(z);return p>1.23?'高倍':p>=.6?'中倍':'低倍';}
function windowsAt(t,T){
 if(t<T.at(68))return {acute:{...SCOPE,a:1},chronic:null,split:0,iris:0};
 const split=ease((t-T.at(68))/(T.frac(68,.32)-T.at(68)));
 const settle=T.end(68)-.05,iris=t<=T.frac(68,.40)?0:ease((t-T.frac(68,.40))/(settle-T.frac(68,.40)));
 const acute={x:SCOPE.x+(WIN_A.x-SCOPE.x)*split,y:475,r:SCOPE.r+(WIN_A.r-SCOPE.r)*split,a:1-iris};
 const chronic={x:WIN_C.x+(SCOPE.x-WIN_C.x)*iris,y:475,r:(iris>0?WIN_C.r+(SCOPE.r-WIN_C.r)*iris:WIN_C.r*split),a:iris>0?1:split};
 return {acute,chronic,split,iris};
}
function scope(c,plate,cam,win){
 if(!win||win.a<=.001||win.r<2)return;
 c.save();c.globalAlpha*=win.a;
 c.beginPath();c.arc(win.x,win.y,win.r,0,TAU);c.clip();
 c.fillStyle='#F6EEF0';c.fillRect(win.x-win.r-2,win.y-win.r-2,win.r*2+4,win.r*2+4);
 c.translate(win.x,win.y);c.scale(cam[2],cam[2]);c.translate(-cam[0],-cam[1]);
 c.drawImage(plate,-1600,-1050);c.restore();
 c.save();c.globalAlpha*=win.a;c.beginPath();c.arc(win.x,win.y,win.r+6,0,TAU);
 c.strokeStyle='#4C4555';c.lineWidth=1.6;c.stroke();c.restore();
}
function leader(c,text,tx,ty,px,py,a){
 if(a<=.01)return;
 c.save();c.globalAlpha=a;c.font='500 36px MixSans';c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle='#D8C5E7';
 c.fillText(text,tx,ty);
 c.strokeStyle='#D8C5E7';c.lineWidth=1.5;c.lineCap='round';c.beginPath();c.moveTo(tx+4,ty+8);c.lineTo(px,py);c.stroke();
 c.beginPath();c.arc(px,py,3.2,0,TAU);c.fill();c.restore();
 if(a>.8)note(c,text,tx,ty,'500 36px MixSans','left');
}
function caption(c,text,x,y,a){
 if(a<=.01)return;
 c.save();c.globalAlpha=a;c.font='500 36px MixSans';c.fillStyle='#E8DDE9';c.textAlign='center';c.textBaseline='alphabetic';c.fillText(text,x,y);c.restore();
 if(a>.8)note(c,text,x,y,'500 36px MixSans','center');
}
function screenPoint(src,cam,win){const p=point(src[0],src[1]);return [win.x+(p[0]-cam[0])*cam[2],win.y+(p[1]-cam[1])*cam[2]];}
function drawDark(c,t,T){
 c.setTransform(1,0,0,1,0,0);c.fillStyle='#111114';c.fillRect(0,0,1920,1080);
 const cam=cameraAt(t,T),chr=chronicCameraAt(t,T),w=windowsAt(t,T);
 audit.camera=cam;audit.chronicCamera=chr;audit.windows=w;
 scope(c,acute,cam,w.acute);scope(c,chronic,chr,w.chronic);
 const labelA=t<T.at(68)?ease((t-T.frac(67,.08))/.12)*ease((T.at(68)-t)/.16):0;
 const pDef=w.acute?screenPoint(DEFECT,cam,w.acute):[0,0];
 const pExu=w.acute?screenPoint(EXUDATE,cam,w.acute):[0,0];
 leader(c,'变质',620,250,pDef[0],pDef[1],labelA);
 leader(c,'渗出',620,690,pExu[0],pExu[1],labelA*ease((t-T.frac(67,.12))/.10));
 audit.targets.变质={screen:pDef,source:DEFECT,map:point(...DEFECT)};
 audit.targets.渗出={screen:pExu,source:EXUDATE,map:point(...EXUDATE)};
 const cap=w.split*ease((T.frac(68,.55)-t)/.12);
 caption(c,'急性',WIN_A.x,815,cap*(w.acute?w.acute.a:0));
 caption(c,'慢性',WIN_C.x,815,cap*(w.chronic?Math.min(1,w.chronic.a*2):0));
 const fibA=ease((t-T.frac(68,.26))/.06)*ease((T.frac(68,.62)-t)/.12);
 const fib=[w.chronic?w.chronic.x+(focus.fib[0]-chr[0])*chr[2]:0,w.chronic?w.chronic.y+(focus.fib[1]-chr[1])*chr[2]:0];
 leader(c,'纤维组织增生',1470,870,fib[0],fib[1],fibA*(w.chronic?w.chronic.a:0));
 audit.targets.纤维组织增生={screen:fib,map:focus.fib};
 const zShow=w.iris>.85?chr[2]:cam[2];
 audit.power=powerOf(zShow);
 c.save();c.fillStyle='#E8DDE9';c.font='500 36px MixSans';c.textAlign='left';c.fillText(audit.power,48,64);c.restore();
 note(c,audit.power,48,64,'500 36px MixSans','left');
 drawLeft(c,t,T,true);
}
export function faithfulAcute(c){
 const p=point(...DEFECT);
 c.setTransform(1,0,0,1,0,0);c.fillStyle='#111114';c.fillRect(0,0,1920,1080);
 c.save();c.beginPath();c.arc(1110,475,425,0,TAU);c.clip();c.fillStyle='#F6EEF0';c.fillRect(0,0,1920,1080);
 c.translate(1110,475);c.scale(2.7,2.7);c.translate(-p[0],-p[1]);c.drawImage(acute,-1600,-1050);c.restore();
 c.strokeStyle='#4C4555';c.lineWidth=1.6;c.beginPath();c.arc(1110,475,431,0,TAU);c.stroke();
}
export default {
 prepare(){
  // Chronic plate first, same bakeHE → prepareChronic order as S19, before any S18 bake.
  chronic=prepareChronic();
  acute=prepareAcute();
  prepareAppendix();
  off=document.createElement('canvas');off.width=1920;off.height=1080;offc=off.getContext('2d');
 },
 plates(){return {acute,chronic};},
 draw(c,t,T){
  audit.boxes=[];
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
