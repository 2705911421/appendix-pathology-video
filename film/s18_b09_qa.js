import {initBaker,bake} from './lib/wash.js';
import {bakeHE} from './lib/he.js';
import scene,{cameraAt,chronicCameraAt,pxPerUm,faithfulAcute,audit,Z_HI,Z_MID,Z_END} from './chapters/s18.js';
import {forScene} from './timeline.js';
import {point,measureAcute} from './lib_ext/b09_acute_window.js';
import {focus} from './lib_ext/b09_chronic.js';
const clock=forScene(66,68,0),c=document.getElementById('c');
c.width=1920;c.height=1080;
const ctx=c.getContext('2d');
await document.fonts.load('500 36px MixSans');
await document.fonts.load('700 44px MixSans');
await initBaker();
bakeHE((k,r,o)=>bake(k,r,{...o,hd:true,soft:true,grain:.12,edge:.3,bleed:.5}));
scene.prepare();
const mode=new URLSearchParams(location.search).get('mode');
function median(xs){const a=[...xs].sort((p,q)=>p-q);const n=a.length;return n?a[n>>1]:null;}
window.QA={
 clock,Z_HI,Z_MID,Z_END,focus,point,
 measure(t){
  const v=cameraAt(t,clock.T),samples=measureAcute(v.slice(0,2),v[2],425,[1110,475]);
  const px=samples.map(s=>s.body_diameter_px);
  return {t,camera:v,n:px.length,median_px:median(px),px_per_um:pxPerUm(v[2]),power:pxPerUm(v[2])>1.23?'高倍':pxPerUm(v[2])>=.6?'中倍':'低倍'};
 },
 state(t){
  if(mode==='faithful')faithfulAcute(ctx);else scene.draw(ctx,t,clock.T);
  const chr=chronicCameraAt(t,clock.T);
  return {t,camera:cameraAt(t,clock.T),chronic:chr,px_per_um_acute:pxPerUm(cameraAt(t,clock.T)[2]),px_per_um_chronic:pxPerUm(chr[2]),power:audit.power,boxes:audit.boxes,targets:audit.targets,windows:audit.windows};
 }
};
window.DUR=clock.duration;
window.render=t=>{if(mode==='faithful')faithfulAcute(ctx);else scene.draw(ctx,t,clock.T);};
window.READY=true;
