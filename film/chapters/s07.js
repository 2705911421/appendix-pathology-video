// Continuous paper inset, carried from the final S06 pose. All events use sentence IDs.
import s06 from './s06.js';
import {forScene} from '../timeline.js';
import {drawVascular,drawNeutrophil} from '../lib_ext/vascular_response.js';

import {bake,get} from '../lib/wash.js';
import {rng} from '../lib/motion.js';
const prev=forScene(23,24,0),TAU=Math.PI*2;
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);},mix=(a,b,p)=>a+(b-a)*p;
const fibers=[],dots=[];
function label(c,text,x,y,px,py,a=1){if(a<=0)return;c.save();c.globalAlpha*=a;c.font='500 40px MixSans';c.fillStyle='#9276A6';c.fillText(text,x,y);c.strokeStyle='#AC98B7';c.lineWidth=1.6;c.beginPath();c.moveTo(x+8,y+12);c.lineTo(x+65,y+12);c.lineTo(px,py);c.stroke();c.restore();}
function blob(c,x,y,rx,ry,seed,fill){c.beginPath();for(let i=0;i<=64;i++){const a=i/64*TAU,k=1+.055*Math.sin(a*5+seed)+.035*Math.cos(a*3+seed);const xx=x+Math.cos(a)*rx*k,yy=y+Math.sin(a)*ry*k;i?c.lineTo(xx,yy):c.moveTo(xx,yy);}c.closePath();c.fillStyle=fill;c.fill();}
export default {prepare(){s06.prepare();const r=rng(72530);fibers.length=dots.length=0;for(let i=0;i<48;i++)fibers.push({x:-440+r()*880,y:70+r()*260,l:35+r()*120,a:r()});for(let i=0;i<25;i++)dots.push({x:-180+r()*390,y:r(),s:2.2+r()*2});bake('s07.water',(b,P)=>{P.fill(b,P.blob(0,0,280,70,.3,725),'#8EBACB',65,.36,[.25,.5]);},{seed:725,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});},draw(c,t,T){
 if(t===0){s06.draw(c,prev.duration,prev.T);return;}
 const advance=(id,a,b)=>smooth((t-T.frac(id,a))/(T.frac(id,b)-T.frac(id,a)));
 const z=advance(25,0,.25),fluid=advance(25,.26,.96),protein=advance(26,.06,.86),adhere=advance(27,.04,.25),cross=advance(27,.28,.90),move=advance(28,.05,.9),damage=advance(29,.05,.8),merge=advance(30,.08,.55);
 c.setTransform(1,0,0,1,0,0);c.fillStyle='#F4EFE6';c.fillRect(0,0,1920,1080);
 // Preserve the previous exterior and retire it while the SAME round window moves.
 if(z<1){c.save();c.beginPath();c.rect(0,0,1920,1080);c.moveTo(1802,490);c.arc(1410,490,392,0,TAU,true);c.clip('evenodd');s06.draw(c,prev.duration,prev.T);c.globalAlpha=z;c.fillStyle='#F4EFE6';c.fillRect(0,0,1920,1080);c.restore();}
 const cx=mix(1410,1285,z),cy=mix(490,470,z),radius=mix(390,440,z);
 c.save();c.beginPath();c.arc(cx,cy,radius,0,TAU);c.fillStyle='#F4EFE6';c.fill();c.clip();c.translate(cx,cy);c.scale(radius/390,radius/390);
 c.save();c.globalAlpha=z;
 // Loose collagen separates as interstitial water accumulates; stromal cells stay sparse.
 for(let i=0;i<fibers.length;i++){const f=fibers[i],y=f.y+fluid*(f.y-65)*.17;c.strokeStyle=i%3?'rgba(191,145,162,.37)':'rgba(159,132,161,.32)';c.lineWidth=i%3?1.4:2.5;c.beginPath();c.moveTo(f.x,y);c.bezierCurveTo(f.x+f.l*.3,y-14,f.x+f.l*.7,y+13,f.x+f.l,y-3);c.stroke();}
 for(let i=0;i<5;i++){const x=-295+i*130,y=138+(i%3)*62+fluid*25;blob(c,x,y,24,11,i,'rgba(222,204,211,.6)');c.fillStyle='#AA98B4';c.beginPath();c.ellipse(x,y,10,3,-.3,0,TAU);c.fill();}
 // Distant tissue injury, revealed before its dedicated close attention in sentence 29.
 for(let i=0;i<7;i++){const x=190+(i%3)*48,y=190+Math.floor(i/3)*44;const grow=1+damage*.22;c.save();c.translate(x,y);c.rotate(i*.8);blob(c,0,0,24*grow,20*grow,i,'rgba(218,171,175,.38)');c.save();c.clip();c.globalAlpha=.14;c.drawImage(get('s06.vascular'),-35,-28,70,56);c.restore();c.strokeStyle='#B590A5';c.lineWidth=1.25;c.beginPath();for(let j=0;j<4;j++){const a=j*TAU/4+.12;c.ellipse(0,0,24*grow,20*grow,0,a,a+TAU/4-.10-damage*.35);}c.stroke();c.fillStyle='#B29CB4';c.beginPath();c.ellipse(1,-2,7+damage*2,5,0,0,TAU);c.fill();if(damage>.1){blob(c,29,-12,3,2,i,'#BBA5B3');blob(c,-25,22,4,2,i,'#C7A4AE');}c.restore();}
 c.restore();
 // Reuse the S06 vessel and biconcave discs exactly; continuously move it to the upper half.
 const vy=-130*z,ys=1-.32*z,wallY=vy+181*ys;
 c.save();c.translate(0,vy);c.scale(1,ys);drawVascular(c,1,{wbc:false});drawNeutrophil(c,205,-143,{rot:-.2});drawNeutrophil(c,310,143,{rot:.2});if(t<T.at(27))drawNeutrophil(c,-260+120*advance(26,.5,1),143);c.restore();
 // Interendothelial junctions, distinct from the intact intravascular red cells.
 c.save();c.globalAlpha=z;const gapX=-55;
 for(const x of [-180,gapX,100]){c.strokeStyle='#F4EFE6';c.lineWidth=x===gapX?4+10*Math.sin(Math.PI*cross):5;c.beginPath();c.moveTo(x,wallY-10);c.lineTo(x+2,wallY+4);c.stroke();}
 if(fluid>0){c.globalAlpha=z*fluid*.5;c.drawImage(get('s07.water'),-350,wallY+8,690,245);c.globalAlpha=z*fluid*.72;for(let i=0;i<4;i++){const x=-220+i*95;c.strokeStyle='rgba(124,171,194,.55)';c.lineWidth=3;c.beginPath();c.moveTo(x,wallY-35);c.bezierCurveTo(x-16,wallY,x+18,wallY+35,x+50,wallY+68+fluid*45);c.stroke();}}
 c.globalAlpha=z;
 for(let i=0;i<dots.length;i++){const d=dots[i],p=clamp(protein*1.55-d.y*.55);if(!p)continue;const x=d.x+Math.sin(i)*p*25,y=mix(wallY-42,wallY+45+d.y*115,p);c.globalAlpha=z*Math.min(1,p*6);blob(c,x,y,d.s,d.s*.8,i,'#B39AAF');}
 c.restore();
 // One viable, segmented-nucleus neutrophil: margination → adhesion → dumbbell → exit → migration.
 if(t>=T.at(27)){const a=advance(27,0,.07),x=mix(-140,gapX,adhere)+move*235,y=mix(wallY-38,wallY-33,adhere)+cross*97+move*125;
 c.save();c.globalAlpha=a;c.translate(x,y);const squeeze=Math.sin(Math.PI*cross);c.beginPath();for(let j=0;j<=80;j++){const th=j/80*TAU,yy=Math.sin(th)*29*(1+.65*squeeze),xx=Math.cos(th)*31*(1-.72*squeeze*Math.exp(-(((yy+y-wallY)/20)**2)));j?c.lineTo(xx,yy):c.moveTo(xx,yy);}c.closePath();c.fillStyle='rgba(239,227,235,.96)';c.fill();c.strokeStyle='#AA94B7';c.lineWidth=1.1;c.stroke();c.scale(1-.65*squeeze,1+.65*squeeze);c.globalAlpha*=.8;drawNeutrophil(c,0,0);c.restore();
 if(move>0){c.save();c.globalAlpha=move*.6;c.strokeStyle='#A38AB5';c.lineWidth=1.6;c.setLineDash([5,7]);c.beginPath();c.moveTo(-48,wallY+105);c.quadraticCurveTo(20,wallY+163,110,wallY+177);c.stroke();c.setLineDash([]);c.beginPath();c.moveTo(100,wallY+169);c.lineTo(112,wallY+177);c.lineTo(99,wallY+181);c.stroke();c.restore();}
 }
 c.restore();c.strokeStyle='#C6B6C9';c.lineWidth=1.6;c.beginPath();c.arc(cx,cy,radius,0,TAU);c.stroke();
 // Match the old label at the exact handoff, then retire it.
 label(c,'血管扩张',1430,815,1590,663,1-smooth(z*2));label(c,'白细胞贴壁',1185,205,1150,633,1-smooth(z*2));
 c.save();c.globalAlpha=smooth((z-.65)/.35);c.fillStyle='#2A2A35';c.font='700 52px MixSans';c.fillText('血管内 → 组织间隙',85,240);
 const entries=[['液体',25],['蛋白质',26],['白细胞',27]];entries.forEach(([txt,id],i)=>{const a=id===25?fluid:advance(id,0,.2);c.globalAlpha=z*a*(1-merge);c.font='500 44px MixSans';c.fillText(txt,95,350+i*90-merge*(i*55));});c.globalAlpha=z*merge;c.font='800 60px MixSans';c.fillText('渗出',95,405);c.restore();
 const screen=(x,y)=>[cx+x*radius/390,cy+y*radius/390];
 if(t<T.at(26))label(c,'液体',1000,730,...screen(-190,140),fluid*(1-advance(25,.88,1)));
 if(t>=T.at(26)&&t<T.at(27))label(c,'蛋白质',1030,745,...screen(-80,110),advance(26,.3,.5));
 if(t>=T.at(27)&&t<T.at(29))label(c,'白细胞',920,745,...screen(-55+move*235,wallY+64+move*125),advance(27,.06,.2));
 if(t>=T.at(29)&&t<T.at(30))label(c,'受损组织',1420,850,...screen(240,245),advance(29,.05,.25));
 if(t>=T.at(30)){const a=advance(30,.35,.65);label(c,'液体',890,690,...screen(-220,130),a);label(c,'蛋白质',1040,830,...screen(-55,160),a);label(c,'白细胞',1550,580,...screen(180,wallY+189),a);}
 }};
