import {bake,drawWash} from '../lib/wash.js';
import {detailedNeutrophil} from '../lib/he_detail.js';
import {rng} from '../lib/motion.js';
import {drawHE} from '../lib_ext/he_mucosa.js';
import {cell,columnar,erythrocyte} from '../lib_ext/cells_ext.js';
const TAU=Math.PI*2;let atlas,lowAtlas,pusAtlas,compareAtlas;
// One continuous oblique section, shared by every magnification and camera move.
function point(x,y){const a=x/620-Math.PI/2,r=640+y+12*Math.sin(a*3)+9*Math.sin(a*5),u=1.6*Math.cos(a)*r,v=Math.sin(a)*r;return [u*Math.cos(.4)-v*Math.sin(.4),u*Math.sin(.4)+v*Math.cos(.4)];}
function pus(c,x,y,sz,rot,key){c.save();c.translate(x,y);c.rotate(rot);c.scale(sz,sz);c.filter='blur(1px)';c.beginPath();c.ellipse(0,0,10.2,9.6,0,0,TAU);c.fillStyle='rgba(226,170,200,.44)';c.fill();c.filter='none';c.fillStyle='#50345F';for(let j=0;j<(key%2?4:1);j++){c.beginPath();c.ellipse(key%2?-4+j*2.6:0,key%2?(j%2?2:-2):0,key%2?1.5:3.3,key%2?2:3.8,j*.7,0,TAU);c.fill();}c.restore();}
function build(mode="base"){const src=document.createElement('canvas');src.width=1680;src.height=1580;const c=src.getContext('2d');c.scale(2,2);c.translate(420,500);drawHE(c,{ulcer:.8,neut:0,fibrin:0,t:0,detail:1,gap:[-60,70]});const R=rng(103742);
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
// Targeted atlas variants keep unrelated sentence views unchanged.
if(mode==='low'){
 c.fillStyle='#F4E6EC';c.fillRect(-420,-295,840,145);
 c.fillStyle='#FBF3F6';c.fillRect(-420,-150,840,140);
 const inGap=x=>x>-110&&x<110;
 // Excavate mucosa before drawing crypts and surface: no epithelial overpainting.
 c.fillStyle='#F6EEF0';c.beginPath();c.moveTo(-110,-310);c.bezierCurveTo(-100,-235,-65,-202,0,-200);c.bezierCurveTo(65,-202,100,-235,110,-310);c.closePath();c.fill();
 const Q=rng(4421);
 // Non-periodic crypts, with interrupted epithelial rings at destroyed glands.
 for(let xx=-410;xx<420;xx+=30+Q()*58){const yy=-224+(Q()-.5)*35,w=9+Q()*13,h=23+Q()*35,tilt=(Q()-.5)*.95,broken=Q()<.32;if(inGap(xx))continue;
 c.save();c.translate(xx,yy);c.rotate(tilt);c.fillStyle='rgba(251,243,246,.9)';c.beginPath();c.ellipse(0,0,w,h,0,0,TAU);c.fill();
 for(let j=0;j<19;j++){if(broken&&j>4&&j<11)continue;const a=j/19*TAU;cell(c,Math.cos(a)*(w+2),Math.sin(a)*(h+2),'dot',.65, a,j);}c.restore();}
 c.strokeStyle='rgba(107,65,121,.8)';c.lineWidth=5;c.lineCap='round';
 for(const [a,b] of [[-420,-112],[112,420]]){c.beginPath();for(let xx=a;xx<=b;xx+=4){const yy=-290+3*Math.sin(xx*.045);xx===a?c.moveTo(xx,yy):c.lineTo(xx,yy);}c.stroke();}
 for(const yy of [-151,-10,230]){c.strokeStyle='rgba(163,110,141,.38)';c.lineWidth=1.4;c.beginPath();for(let xx=-420;xx<=420;xx+=8){const y=yy+3*Math.sin(xx*.025);xx===-420?c.moveTo(xx,y):c.lineTo(xx,y);}c.stroke();}
 for(let i=0;i<150;i++){const xx=-415+Q()*830,yy=-280+Q()*270;if(inGap(xx)&&yy<-202)continue;detailedNeutrophil(c,xx,yy,{lobes:3,rot:Q()*TAU,sz:.6+Q()*.2},1);}
 // Soft luminal exudate projects out of each repeated ulcer in the polar atlas.
 drawWash(c,'s10.exudate',0,-307,145,{alpha:.76});
 c.save();c.filter='blur(4px)';c.fillStyle='rgba(194,139,167,.35)';c.beginPath();c.ellipse(0,-292,91,51,0,0,TAU);c.fill();c.restore();
 for(let i=0;i<70;i++){const xx=(Q()-.5)*155,yy=-340+Q()*125;if(yy>-308&&Math.abs(xx)>55)continue;pus(c,xx,yy,.55,Q()*TAU,i);}
 for(let i=0;i<38;i++){const xx=-410+Q()*820,yy=278+Q()*16;c.strokeStyle='rgba(204,123,153,.5)';c.lineWidth=.8;c.beginPath();c.moveTo(xx,yy);c.quadraticCurveTo(xx+12,yy-5,xx+25,yy+4);c.stroke();if(i%3===0)pus(c,xx,yy,.65,Q()*TAU,i);}
}
if(mode==='pus'){
 // Dense, uneven cellular islands in a debris-filled eosinophilic liquid bed.
 c.save();c.beginPath();c.rect(-275,-500,550,340);c.clip();
 c.fillStyle='#F1DCE5';c.fillRect(-275,-500,550,340);
 const Q=rng(4040);
 for(let i=0;i<1500;i++){
 const xx=(Q()-.5)*550,yy=-500+Q()*340,r=.8+Q()*4.2;
 c.save();c.translate(xx,yy);c.rotate(Q()*TAU);c.fillStyle=i%17===0?'rgba(109,65,123,.46)':'rgba(201,128,155,.38)';
 c.beginPath();c.moveTo(-r,-r*.2);c.quadraticCurveTo(-r*.4,-r,r*.8,-r*.35);c.lineTo(r*.45,r*.65);c.lineTo(-r*.7,r*.4);c.closePath();c.fill();c.restore();
 }
 // Several irregular bright pink fluid pools, feathered without white cutouts.
 for(const [xx,yy,rr] of [[-64,-314,38],[66,-365,29],[12,-245,24]]){
 c.save();c.translate(xx,yy);c.scale(1.5,.72);const g=c.createRadialGradient(0,0,2,0,0,rr);g.addColorStop(0,'rgba(250,232,239,.93)');g.addColorStop(.55,'rgba(249,230,237,.7)');g.addColorStop(1,'rgba(249,230,237,0)');c.fillStyle=g;c.beginPath();for(let j=0;j<=36;j++){const a=j/36*TAU,r=rr*(1+.12*Math.sin(a*3)+.08*Math.cos(a*5));j?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();c.restore();
 }
 // Jittered packed islands: one third degenerating, two thirds intact lobulated nuclei.
 let k=0;
 for(let yy=-490;yy<-165;yy+=17)for(let xx=-267;xx<270;xx+=19){
 const px=xx+(Q()-.5)*10,py=yy+(Q()-.5)*9;
 if((Math.hypot((px+64)/1.5,(py+314)/.72)<30)||(Math.hypot((px-66)/1.5,(py+365)/.72)<22)||(Math.hypot((px-12)/1.5,(py+245)/.72)<17))continue;
 if(Q()<.13+.12*Math.sin(px*.045+py*.027))continue;
 const sz=.74+Q()*.20,rot=Q()*TAU;
 if(k%3===0)pus(c,px,py,sz,rot,k);else detailedNeutrophil(c,px,py,{lobes:2+k%3,rot,sz},1);k++;
 }
 c.restore();
}
if(mode==='compare'){
 c.save();c.beginPath();c.ellipse(103,60,120,100,0,0,TAU);c.clip();const g=c.createRadialGradient(103,60,50,103,60,120);g.addColorStop(0,'#F8ECF1');g.addColorStop(.7,'#F8ECF1');g.addColorStop(1,'rgba(248,236,241,0)');c.fillStyle=g;c.fillRect(-20,-50,250,220);
 detailedNeutrophil(c,65,55,{lobes:3,rot:.4,sz:1.65},1);
 pus(c,105,36,1.5,0,0);pus(c,132,60,1.5,.4,1);
 c.save();c.filter='blur(2.5px)';c.fillStyle='rgba(222,167,192,.42)';c.beginPath();c.ellipse(104,88,17,14,.3,0,TAU);c.fill();c.fillStyle='rgba(108,71,125,.25)';for(let j=0;j<4;j++){c.beginPath();c.arc(100+j*3,87+(j%2)*4,2,0,TAU);c.fill();}c.restore();c.restore();
}
// Use the S08 polar atlas method, preserving its shared cell drawing vocabulary.
const im=c.getImageData(0,0,1680,1580);atlas=document.createElement('canvas');atlas.width=6800;atlas.height=4800;const ac=atlas.getContext('2d'),out=ac.createImageData(6800,4800),co=Math.cos(.4),si=Math.sin(.4),pixels=new Uint32Array(im.data.buffer),target=new Uint32Array(out.data.buffer);
for(let j=0;j<4800;j++)for(let i=0;i<6800;i++){const u=i/2-1700,v=j/2-1200,x=(u*co+v*si)/1.6,y=-u*si+v*co,a=Math.atan2(y,x),fy=Math.hypot(x,y)-640-12*Math.sin(a*3)-9*Math.sin(a*5);if(fy< -500||fy>=280)continue;let fx=((a+Math.PI/2)*620+420)%840;if(fx<0)fx+=840;const q=(Math.floor((fy+500)*2)*1680+Math.floor(fx*2))*4,n=(j*6800+i)*4;target[n/4]=pixels[q/4];}ac.putImageData(out,0,0);return atlas;
}
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export default {prepare(){for(const [key,col] of [['s10.fluid','#F5DFE8'],['s10.exudate','#E9B4B7']])bake(key,(b,P)=>P.fill(b,P.blob(0,0,230,24,.3,83),col,85,.65),{seed:83,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});atlas=build();const base=atlas;lowAtlas=build("low");pusAtlas=build("pus");compareAtlas=build("compare");atlas=base;},draw(c,t,T){
const extended=typeof T.has==='function'&&T.has(46);const ids=extended?[37,38,39,40,41,42,43,44,45,46]:[37,38,39,40,41,42],id=ids.find(n=>t<T.end(n))||ids.at(-1);
const muscle=point(-160,95),dense=point(-180,60),lumen=point(0,-305),edema=point(280,100),compare=point(102,60);
const keys=[[0,[120,120,.50]],[T.frac(37,.7),[120,120,.50]],[T.frac(38,.28),[...muscle,1.15]],[T.end(38),[...muscle,1.15]],[T.frac(39,.3),[...dense,2.7]],[T.end(39),[...dense,2.7]],[T.frac(40,.3),[...lumen,2.7]],[T.end(40),[...lumen,2.7]],[T.frac(41,.3),[...edema,1.8]],[T.end(41),[...edema,1.8]],[T.frac(42,.3),[...compare,3.4]],[T.end(42)+.8,[...compare,3.4]]];if(extended){keys.pop();keys.push([T.end(42),[...compare,3.4]],[T.frac(43,.23),[...point(80,341),3.4]],[T.end(45),[...point(80,341),3.4]],[T.frac(46,.7),[...point(80,265),1.25]],[T.end(46)+.8,[...point(80,265),1.25]]);}let v=keys[0][1];for(let i=1;i<keys.length;i++){if(t>=keys[i][0]){v=keys[i][1];continue;}const a=keys[i-1],b=keys[i],f=smooth((t-a[0])/(b[0]-a[0]));v=a[1].map((q,j)=>q+(b[1][j]-q)*f);break;}const [x,y,z]=v;
c.setTransform(1,0,0,1,0,0);c.fillStyle='#111114';c.fillRect(0,0,1920,1080);c.save();c.beginPath();c.arc(1110,475,425,0,TAU);c.clip();c.fillStyle='#F6EEF0';c.fill();c.translate(1110,475);c.scale(z,z);c.translate(-x,-y);c.drawImage(atlas,-1700,-1200,3400,2400);
const variant=z<.65?lowAtlas:id===40?pusAtlas:(id===42||(extended&&id===43))?compareAtlas:null;
if(variant){c.globalAlpha=extended&&id===43?1:z<.65?Math.max(0,Math.min(1,(.65-z)/.1)):smooth((t-T.at(id))/(T.frac(id,.3)-T.at(id)));c.drawImage(variant,-1700,-1200,3400,2400);c.globalAlpha=1;}
if(extended&&t>=T.end(42))drawExudate(c,t,T,id);
c.restore();c.strokeStyle='#4C4555';c.lineWidth=1.6;c.beginPath();c.arc(1110,475,431,0,TAU);c.stroke();c.fillStyle='#E8DDE9';c.font='500 30px MixSans';c.fillText(z<.65?'低倍':z<2.2?'中倍':'高倍',1030,35);
const text={37:['第二幕 黄'],38:['化脓性阑尾炎','（蜂窝织炎性阑尾炎）'],39:['中性粒细胞浸润','部分变性坏死'],40:['脓液','脓细胞','组织碎屑','渗出液'],41:['渗出伴随局部肿胀'],42:['脓细胞','变性坏死的中性粒细胞'],43:['纤维蛋白原','凝成纤维素网'],44:['纤维脓性渗出物'],45:['纤维素：部分','脓细胞：主要'],46:['浆膜面：','纤维素性脓性渗出','（含脓细胞）']};const phase=(t-T.at(id))/(T.end(id)-T.at(id)),alpha=Math.max(0,Math.min(1,phase/.10,id===42||id===46?1:(1-phase)/.10));c.save();c.globalAlpha=alpha;text[id].forEach((s,i)=>{c.font=`${i?400:700} ${i?27:36}px MixSans`;c.fillText(s,75,320+i*56);});c.strokeStyle='#BFA9CB';c.lineWidth=1.6;c.beginPath();c.moveTo(475,410);c.lineTo(630,410);c.lineTo(id===42?720:900,id===42?350:475);c.stroke();
if(id===46){const lead=(label,a,b,tx,ty)=>{const p=point(a,b);c.fillStyle='#51336F';c.font='400 27px MixSans';c.fillText(label,tx,ty);c.beginPath();c.moveTo(tx+35,ty+8);c.lineTo(1110+(p[0]-x)*z,475+(p[1]-y)*z);c.stroke();};lead('浆膜',80,275,960,580);lead('纤维素性脓性渗出',80,325,1100,300);}
if(id===42&&t>=T.frac(42,.3)){
 const screen=(a,b)=>{const p=point(a,b);return [1110+(p[0]-x)*z,475+(p[1]-y)*z];};
 const lead=(a,b,tx,ty)=>{const [sx,sy]=screen(a,b);c.beginPath();c.moveTo(tx,ty);c.lineTo(sx,sy);c.stroke();};
 c.fillStyle='#51336F';c.font='400 27px MixSans';c.fillText('中性粒细胞',835,270);lead(65,55,990,285);
 c.fillText('脓细胞',1230,700);for(const p of [[105,36],[132,60],[104,88]])lead(...p,1240,665);
}c.restore();}};

// Deterministic irregular serosal exudate, attached to the same polar wall.
function drawExudate(c,t,T,id){
 const Q=rng(114346),growth=smooth((t-T.frac(43,.23))/(T.end(43)-T.frac(43,.23))),cells=smooth((t-T.at(44))/(T.frac(44,.35)-T.at(44))),second=id===45&&t>=T.frac(45,.5);
 const netAlpha=id===45?(second?.25:1):.75,cellAlpha=id===45?(second?1:.22):cells;
 c.save();
 for(let i=0;i<580;i++){
  const xx=-260+Q()*680,yy=284+Q()*(95+22*Math.sin(xx*.025)),p=point(xx,yy),len=(Q()-.5)*62;
  c.globalAlpha=netAlpha;c.strokeStyle=i%4?'#D78EA8':'#E9B4C5';c.lineWidth=.35+Q()*1.3;c.lineCap='round';
  const bend=(Q()-.5)*65,bendMid=(Q()-.5)*18;
  if(growth>i/580){const g=Math.min(1,(growth-i/580)*12),p2=point(xx+len*g,yy+bend*g),pm=point(xx+len*g*.5,yy+bendMid);c.beginPath();c.moveTo(...p);c.quadraticCurveTo(...pm,...p2);c.stroke();}
  c.globalAlpha=.35;c.fillStyle='#DCA3BB';c.beginPath();c.ellipse(...p,.5+Q()*1.4,.4+Q(),Q()*TAU,0,TAU);c.fill();
 }
 c.globalAlpha=cellAlpha;
 for(let i=0;i<560;i++){const xx=-250+Q()*650,yy=285+Q()*(75+20*Math.sin(xx*.025)),p=point(xx,yy),sz=.65+Q()*.25,rot=Q()*TAU;if(i%3!==0)pus(c,...p,sz,rot,i);else detailedNeutrophil(c,...p,{lobes:2+i%3,rot,sz},1);}
 c.globalAlpha=.3*cells;c.fillStyle='#BC8AAB';for(let i=0;i<260;i++){const p=point(-250+Q()*650,287+Q()*94);c.beginPath();c.ellipse(...p,1+Q()*3,.5+Q(),Q()*TAU,0,TAU);c.fill();}c.restore();
}
