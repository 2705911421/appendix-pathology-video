import {bake,drawWash} from '../lib/wash.js';
import {detailedNeutrophil} from '../lib/he_detail.js';
import {rng} from '../lib/motion.js';
import {drawHE} from '../lib_ext/he_mucosa.js';
import {cell,columnar,erythrocyte} from '../lib_ext/cells_ext.js';
const TAU=Math.PI*2;let atlas;
// One continuous oblique section, shared by every magnification and camera move.
function point(x,y){const a=x/620-Math.PI/2,r=640+y+12*Math.sin(a*3)+9*Math.sin(a*5),u=1.6*Math.cos(a)*r,v=Math.sin(a)*r;return [u*Math.cos(.4)-v*Math.sin(.4),u*Math.sin(.4)+v*Math.cos(.4)];}
function pus(c,x,y,sz,rot,key){c.save();c.translate(x,y);c.rotate(rot);c.scale(sz,sz);c.filter='blur(1px)';c.beginPath();c.ellipse(0,0,10.2,9.6,0,0,TAU);c.fillStyle='rgba(226,170,200,.44)';c.fill();c.filter='none';c.fillStyle='#50345F';for(let j=0;j<(key%2?4:1);j++){c.beginPath();c.ellipse(key%2?-4+j*2.6:0,key%2?(j%2?2:-2):0,key%2?1.5:3.3,key%2?2:3.8,j*.7,0,TAU);c.fill();}c.restore();}
function build(){const src=document.createElement('canvas');src.width=1680;src.height=1580;const c=src.getContext('2d');c.scale(2,2);c.translate(420,500);drawHE(c,{ulcer:.8,neut:0,fibrin:0,t:0,detail:1,gap:[-60,70]});const R=rng(103742);
// Pale fluid separates remaining muscle bundles instead of tinting the entire field.
for(let j=0;j<10;j++){const y=12+j*23;c.save();c.globalAlpha=.7;drawWash(c,'s10.fluid',0,y,440,{alpha:.36});c.restore();}
c.fillStyle='rgba(250,241,245,.86)';for(let j=0;j<5;j++){const yy=20+j*36;c.beginPath();c.moveTo(175,yy);c.bezierCurveTo(240,yy+15,325,yy-12,415,yy+8);c.lineTo(415,yy+20);c.bezierCurveTo(325,yy+2,240,yy+28,175,yy+12);c.closePath();c.fill();}
for(let i=0;i<70;i++)cell(c,-410+R()*820,145+R()*79,'dot',.85,R()*TAU,i);
for(let i=0;i<62;i++)cell(c,-410+i*13.5,274+Math.sin(i*.4)*2,'meso',.8,0,i);
for(let i=0;i<710;i++){const x=-405+R()*810,y=-285+R()*557;
 // The loose right muscle patch retains widened spaces for sentence 41.
 if(x>170&&y>0&&y<210&&i%3!==0)continue;
 // Sentence 42 is an intentional sparse diagnostic comparison in the same wall.
 if(x>-20&&x<220&&y>-40&&y<160)continue;
 const sz=.70+R()*.23,rot=R()*TAU;if(i%4===0)pus(c,x,y,sz,rot,i);else detailedNeutrophil(c,x,y,{lobes:2+i%4,rot,sz},1);
}
// Several irregular ulcer gaps with residual frayed epithelium and luminal exudate.
for(const centre of [-280,0,290]){c.fillStyle='#F6EEF0';c.beginPath();c.ellipse(centre,-291,37,15,.12,0,TAU);c.fill();for(const side of [-1,1])for(let j=0;j<3;j++)columnar(c,centre+side*(37+j*2),-289-j*3,.48,side*.5,j,'fray');drawWash(c,'s10.exudate',centre,-347,110,{alpha:.42});
for(let i=0;i<38;i++){const x=centre+(R()-.5)*115,y=-300-R()*110,sz=.65+R()*.15;if(i%3===0)pus(c,x,y,sz,R()*TAU,i);else detailedNeutrophil(c,x,y,{lobes:2+i%4,rot:R()*TAU,sz},1);}
c.fillStyle='rgba(204,158,180,.32)';for(let i=0;i<40;i++){const x=centre+(R()-.5)*130,y=-300-R()*116;c.beginPath();c.ellipse(x,y,1+R()*4,1+R()*2,R()*TAU,0,TAU);c.fill();}
c.strokeStyle='rgba(221,166,185,.3)';c.lineWidth=.4;for(let i=0;i<30;i++){const x=centre+(R()-.5)*110,y=-300-R()*90;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+6,y-4,x+10,y+5);c.stroke();}for(let i=0;i<4;i++)erythrocyte(c,centre-25+R()*50,-302-R()*25,.45,R()*TAU,i);}
detailedNeutrophil(c,75,55,{lobes:3,rot:.4,sz:1},1);[[105,42],[124,65],[92,80]].forEach(([x,y],i)=>pus(c,x,y,1,i*.8,i));
// Use the S08 polar atlas method, preserving its shared cell drawing vocabulary.
const im=c.getImageData(0,0,1680,1580);atlas=document.createElement('canvas');atlas.width=6800;atlas.height=4800;const ac=atlas.getContext('2d'),out=ac.createImageData(6800,4800),co=Math.cos(.4),si=Math.sin(.4);
for(let j=0;j<4800;j++)for(let i=0;i<6800;i++){const u=i/2-1700,v=j/2-1200,x=(u*co+v*si)/1.6,y=-u*si+v*co,a=Math.atan2(y,x),fy=Math.hypot(x,y)-640-12*Math.sin(a*3)-9*Math.sin(a*5);if(fy< -500||fy>=280)continue;let fx=((a+Math.PI/2)*620+420)%840;if(fx<0)fx+=840;const q=(Math.floor((fy+500)*2)*1680+Math.floor(fx*2))*4,n=(j*6800+i)*4;out.data.set(im.data.subarray(q,q+4),n);}ac.putImageData(out,0,0);
}
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export default {prepare(){for(const [key,col] of [['s10.fluid','#F5DFE8'],['s10.exudate','#E9B4B7']])bake(key,(b,P)=>P.fill(b,P.blob(0,0,230,24,.3,83),col,85,.65),{seed:83,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});build();},draw(c,t,T){
const ids=[37,38,39,40,41,42],id=ids.find(n=>t<T.end(n))||42;
const muscle=point(-160,95),dense=point(-180,60),lumen=point(0,-305),edema=point(280,100),compare=point(102,60);
const keys=[[0,[120,120,.50]],[T.frac(37,.7),[120,120,.50]],[T.frac(38,.28),[...muscle,1.15]],[T.end(38),[...muscle,1.15]],[T.frac(39,.3),[...dense,2.7]],[T.end(39),[...dense,2.7]],[T.frac(40,.3),[...lumen,2.7]],[T.end(40),[...lumen,2.7]],[T.frac(41,.3),[...edema,1.8]],[T.end(41),[...edema,1.8]],[T.frac(42,.3),[...compare,3.4]],[T.end(42)+.8,[...compare,3.4]]];let v=keys[0][1];for(let i=1;i<keys.length;i++){if(t>=keys[i][0]){v=keys[i][1];continue;}const a=keys[i-1],b=keys[i],f=smooth((t-a[0])/(b[0]-a[0]));v=a[1].map((q,j)=>q+(b[1][j]-q)*f);break;}const [x,y,z]=v;
c.setTransform(1,0,0,1,0,0);c.fillStyle='#111114';c.fillRect(0,0,1920,1080);c.save();c.beginPath();c.arc(1110,475,425,0,TAU);c.clip();c.fillStyle='#F6EEF0';c.fill();c.translate(1110,475);c.scale(z,z);c.translate(-x,-y);c.drawImage(atlas,-1700,-1200,3400,2400);c.restore();c.strokeStyle='#4C4555';c.lineWidth=1.6;c.beginPath();c.arc(1110,475,431,0,TAU);c.stroke();c.fillStyle='#E8DDE9';c.font='500 30px MixSans';c.fillText(z<.65?'低倍':z<2.2?'中倍':'高倍',1030,35);
const text={37:['第二幕 黄'],38:['化脓性阑尾炎','（蜂窝织炎性阑尾炎）'],39:['中性粒细胞浸润','部分变性坏死'],40:['脓液','脓细胞','组织碎屑','渗出液'],41:['渗出伴随局部肿胀'],42:['脓细胞','变性坏死的中性粒细胞']};const phase=(t-T.at(id))/(T.end(id)-T.at(id)),alpha=Math.max(0,Math.min(1,phase/.10,id===42?1:(1-phase)/.10));c.save();c.globalAlpha=alpha;text[id].forEach((s,i)=>{c.font=`${i?400:700} ${i?27:36}px MixSans`;c.fillText(s,75,320+i*56);});c.strokeStyle='#BFA9CB';c.lineWidth=1.6;c.beginPath();c.moveTo(475,410);c.lineTo(630,410);c.lineTo(900,475);c.stroke();
if(id===42&&t>=T.frac(42,.3)){for(const [label,p,dx,dy] of [['中性粒细胞',point(75,55),-120,-100],['脓细胞',point(124,65),75,100]]){const sx=1110+(p[0]-x)*z,sy=475+(p[1]-y)*z;c.beginPath();c.moveTo(sx,sy);c.lineTo(sx+dx,sy+dy);c.stroke();c.font='400 27px MixSans';c.fillStyle='#51336F';c.fillText(label,sx+dx-45,sy+dy-10);}}c.restore();}};
