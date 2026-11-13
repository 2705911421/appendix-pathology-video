// Continuous paper inset, carried from the final S06 pose. All events use sentence IDs.
import s06 from './s06.js';
import {forScene} from '../timeline.js';
import {drawVascular,drawNeutrophil} from '../lib_ext/vascular_response.js';
import {prepareExudate,drawInterstitium,drawFluid,drawProtein,drawCrossingNeutrophil} from '../lib_ext/main_fix01_exudate.js';

// Composite the round view once to avoid Chromium clip bounding-box seams.
let inset;
const insetCanvas=()=>{if(!inset){inset=document.createElement('canvas');inset.width=1920;inset.height=1080;}return inset;};
const prev=forScene(23,24,0),TAU=Math.PI*2;
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);},mix=(a,b,p)=>a+(b-a)*p;
function label(c,text,x,y,px,py,a=1){if(a<=0)return;c.save();c.globalAlpha*=a;c.font='500 40px MixSans';c.fillStyle='#9276A6';c.fillText(text,x,y);c.strokeStyle='#AC98B7';c.lineWidth=1.6;c.beginPath();c.moveTo(x+8,y+12);c.lineTo(x+65,y+12);c.lineTo(px,py);c.stroke();c.restore();}
function blob(c,x,y,rx,ry,seed,fill){c.beginPath();for(let i=0;i<=64;i++){const a=i/64*TAU,k=1+.055*Math.sin(a*5+seed)+.035*Math.cos(a*3+seed);const xx=x+Math.cos(a)*rx*k,yy=y+Math.sin(a)*ry*k;i?c.lineTo(xx,yy):c.moveTo(xx,yy);}c.closePath();c.fillStyle=fill;c.fill();}
export default {prepare(){s06.prepare();prepareExudate();},draw(c,t,T){
 if(t===0){s06.draw(c,prev.duration,prev.T);return;}
 const advance=(id,a,b)=>smooth((t-T.frac(id,a))/(T.frac(id,b)-T.frac(id,a)));
 const z=advance(25,0,.25),fluid=advance(25,.26,.96),protein=advance(25,.40,.96),adhere=advance(27,.04,.25),cross=advance(27,.28,.90),move=advance(28,.05,.9),damage=advance(29,.05,.8),merge=advance(30,.08,.55);
 // Edema keeps accumulating after sentence 25; by 30 it fills the upper interstitium.
 const wet=clamp(fluid*.20+advance(26,.05,.85)*.28+advance(27,0,.6)*.12+advance(30,.05,.55)*.35);
 c.setTransform(1,0,0,1,0,0);c.fillStyle='#F4EFE6';c.fillRect(0,0,1920,1080);
 // Preserve the previous exterior and retire it while the SAME round window moves.
 if(z<1){c.save();c.beginPath();c.rect(0,0,1920,1080);c.moveTo(1802,490);c.arc(1410,490,392,0,TAU,true);c.clip('evenodd');s06.draw(c,prev.duration,prev.T);c.globalAlpha=z;c.fillStyle='#F4EFE6';c.fillRect(0,0,1920,1080);c.restore();}
 const cx=mix(1410,1285,z),cy=mix(490,470,z),radius=mix(390,440,z);
 const output=c,layer=insetCanvas();c=layer.getContext('2d',{willReadFrequently:true});c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,1920,1080);
 c.save();c.beginPath();c.arc(cx,cy,radius,0,TAU);c.fillStyle='#F4EFE6';c.fill();c.translate(cx,cy);c.scale(radius/390,radius/390);
 const vy=-130*z,ys=1-.32*z,wallY=vy+181*ys;
 // Interstitium first: pink collagen ground, spindle fibroblasts, resident cells.
 drawInterstitium(c,wallY,wet,z);
 // Reuse the S06 vessel and biconcave discs exactly; continuously move it to the upper half.
 c.save();c.translate(0,vy);c.scale(1,ys);drawVascular(c,1,{wbc:false,interstitium:false});drawNeutrophil(c,205,-143,{rot:-.2,sy:1/ys});drawNeutrophil(c,310,143,{rot:.2,sy:1/ys});if(t<T.at(27))drawNeutrophil(c,-260+120*advance(26,.5,1),143,{sy:1/ys});c.restore();
 // Interendothelial junctions, distinct from the intact intravascular red cells.
 const gapX=-55;
 const neutX=mix(-140,gapX,adhere)+move*235,neutY=wallY-46+cross*94+move*125;
 // Small translucent junction openings begin with leakage, never white cuts.
 c.save();c.globalAlpha=z*fluid*.7;
 for(const x of [-180,gapX,100]){const w=x===gapX?2+7*Math.sin(Math.PI*cross):2;c.fillStyle='rgba(229,210,224,.8)';c.beginPath();c.ellipse(x,wallY-3,w,6,.15,0,TAU);c.fill();}
 c.restore();
 // Fluid: pale blue water bloom spreading from the wall downward, growing per sentence.
 drawFluid(c,wallY,wet,z);
 // Protein particles drift out with the fluid.
 drawProtein(c,wallY,protein,wet,z);
 // Distant tissue injury, revealed in sentence 29. Swollen, fading cells with
 // broken outlines and dusty chromatin — not a neat cluster of eggs.
 const vis=smooth(clamp((damage-.10)/.40));
 const hurt=[[198,220,25,-.2],[256,232,21,.5],[216,276,29,.1],[279,288,22,-.6],[308,244,16,.8]];
 c.save();c.globalAlpha=z*vis;
 for(let i=0;i<hurt.length;i++){const [hx,hy,hr,rot]=hurt[i],grow=1+damage*.26;const x=hx+Math.sin(i*2.1)*7,y=wallY+hy;
  c.save();c.translate(x,y);c.rotate(rot);
  blob(c,0,0,hr*grow,hr*.82*grow,i*1.3,'rgba(206,120,135,'+(.24+damage*.18)+')');
  c.globalAlpha=z*vis*(.18+.22*damage);
  blob(c,-hr*.12,-hr*.06,hr*.58,hr*.44,i*1.3+5,'#F1D8D7');
  c.globalAlpha=z*vis;
  c.fillStyle='rgba(157,115,158,'+(.52-damage*.22)+')';c.beginPath();c.ellipse(hr*.05,-hr*.06,hr*.30,hr*.20,.4,0,TAU);c.fill();
  for(let k=0;k<3;k++){blob(c,hr*.05+Math.cos(k*2.3)*hr*.34,-hr*.06+Math.sin(k*1.7)*hr*.24,2.2,1.8,k+i,'rgba(120,82,128,.55)');}
  c.strokeStyle='rgba(178,110,130,.55)';c.lineWidth=1.5;
  c.beginPath();c.ellipse(0,0,hr*grow,hr*.82*grow,0,.18,.18+1.45);c.stroke();
  c.beginPath();c.ellipse(0,0,hr*grow,hr*.82*grow,0,2.05,2.05+.85);c.stroke();
  for(let k=0;k<4;k++){blob(c,Math.cos(k*2.4+i)*hr*1.18,Math.sin(k*1.7+i)*hr*.94,2.2+damage*3,1.8+damage*2,k+i,'rgba(185,139,156,.65)');}
  c.restore();}
 c.restore();
 // One viable neutrophil: margination → adhesion → dumbbell squeeze → exit → migration.
 if(t>=T.at(27)){
  const a=advance(27,0,.07),x=neutX,y=neutY;
  c.save();c.globalAlpha=a;
  c.translate(x,y);c.scale(1.6,1.6);
  drawCrossingNeutrophil(c,0,0,(wallY-y)/1.6,Math.sin(Math.PI*cross));
  c.restore();
  if(move>0){c.save();c.globalAlpha=move*.6;c.strokeStyle='#A38AB5';c.lineWidth=1.6;c.setLineDash([5,7]);c.beginPath();c.moveTo(gapX+6,wallY+66);c.quadraticCurveTo(45,wallY+150,168,wallY+196);c.stroke();c.setLineDash([]);c.beginPath();c.moveTo(156,wallY+188);c.lineTo(171,wallY+197);c.lineTo(158,wallY+202);c.stroke();c.restore();}
 }
 c.restore();c.save();c.globalCompositeOperation='destination-in';c.beginPath();c.arc(cx,cy,radius,0,TAU);c.fillStyle='#000';c.fill();c.restore();c=output;c.drawImage(layer,0,0);c.strokeStyle='#C6B6C9';c.lineWidth=1.6;c.beginPath();c.arc(cx,cy,radius,0,TAU);c.stroke();
 // Match the old label at the exact handoff, then retire it.
 label(c,'血管扩张',1430,815,1590,663,1-smooth(z*2));label(c,'白细胞贴壁',1185,205,1150,633,1-smooth(z*2));
 c.save();c.globalAlpha=smooth((z-.65)/.35);c.fillStyle='#2A2A35';c.font='700 52px MixSans';c.fillText('血管内 → 组织间隙',85,240);
 const entries=[['液体',25],['蛋白质',26],['白细胞',27]];entries.forEach(([txt,id],i)=>{const a=id===25?fluid:advance(id,0,.2);c.globalAlpha=z*a*(1-merge);c.font='500 44px MixSans';c.fillText(txt,95,350+i*90-merge*(i*55));});c.globalAlpha=z*merge;c.font='800 60px MixSans';c.fillText('渗出',95,405);c.restore();
 const screen=(x,y)=>[cx+x*radius/390,cy+y*radius/390];
 if(t<T.at(26))label(c,'液体',1000,730,...screen(-175,92),fluid*(1-advance(25,.88,1)));
 if(t>=T.at(26)&&t<T.at(27))label(c,'蛋白质',1030,745,...screen(-55,120),advance(26,.3,.5));
 if(t>=T.at(27)&&t<T.at(29))label(c,'白细胞',660,610,...screen(neutX-10,neutY),advance(27,.06,.2));
 if(t>=T.at(29)&&t<T.at(30))label(c,'受损组织',1420,850,...screen(250,wallY+250),advance(29,.05,.25));
 if(t>=T.at(30)){const a=advance(30,.35,.65);label(c,'液体',890,690,...screen(-200,105),a);label(c,'蛋白质',1040,830,...screen(-60,155),a);label(c,'白细胞',1550,580,...screen(180,wallY+187),a);}
}};
