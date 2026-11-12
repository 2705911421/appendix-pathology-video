import {rng} from '../lib/motion.js';
import {detailedNeutrophil} from '../lib/he_detail.js';
import {columnar,erythrocyte} from './cells_ext.js';
import {bake,drawWash} from '../lib/wash.js';
const TAU=Math.PI*2;
const TILT=.20;
export function point(a,r){const u=Math.cos(a)*r*1.5,v=Math.sin(a)*r,K=.3+TILT;return [u*Math.cos(K)-v*Math.sin(K),u*Math.sin(K)+v*Math.cos(K)];}
export const focus={edge:point(-1.35,650),exudate:point(-1.43,730),overview:point(-1.58,650),hole:point(-1.638,760),dead:point(-1.65,620),blood:point(-1.72,700)};
export const rimPoint=point(-1.665,760);
function pus(c,x,y,s,rot,key){c.save();c.translate(x,y);c.rotate(rot);c.scale(s,s);c.beginPath();c.ellipse(0,0,10.2,9.6,0,0,TAU);c.fillStyle='rgba(226,170,200,.44)';c.fill();c.fillStyle='#50345F';for(let j=0;j<(key%2?4:1);j++){c.beginPath();c.ellipse(key%2?-4+j*2.6:0,key%2?(j%2?2:-2):0,key%2?1.5:3.3,key%2?2:3.8,j*.7,0,TAU);c.fill();}c.restore();}
function oval(c,x,y,rx,ry,color,a=0){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,a,0,TAU);c.fill();}
export function prepareGangreneMap(){
 bake('s14.ghost',(b,P)=>P.fill(b,P.blob(0,0,90,25,.3,541),'#C7B0BE',90,.4),{seed:541,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});
 const canvas=document.createElement('canvas');canvas.width=6800;canvas.height=5000;const c=canvas.getContext('2d');c.save();c.scale(2,2);c.translate(1700,1250);const R=rng(54057);
 for(const [r,col] of [[885,'#E9CFD8'],[837,'#DFADBF'],[740,'#E9C2CF'],[570,'#EAD4DF'],[390,'#D8BCD4'],[290,'#F6EEF0']]){c.beginPath();for(let i=0;i<=360;i++){const a=i/360*TAU,p=point(a,r+6*Math.sin(a*11)+5*Math.sin(a*7));i?c.lineTo(...p):c.moveTo(...p);}c.closePath();c.fillStyle=col;c.fill();}
 // Layer interfaces: thin eosinophilic lines keep the wall architecture legible at low power.
 for(const [r,col] of [[838,'rgba(201,136,165,.30)'],[740,'rgba(194,118,150,.26)'],[570,'rgba(188,110,144,.22)'],[392,'rgba(158,92,138,.30)']]){
  c.beginPath();for(let i=0;i<=420;i++){const a=i/420*TAU,p=point(a,r+5*Math.sin(a*9)+3*Math.sin(a*17));i?c.lineTo(...p):c.moveTo(...p);}c.strokeStyle=col;c.lineWidth=1.5;c.stroke();
 }
 // Ulcerated mucosa: the necrotic sector loses the continuous purple mucosal band.
 // Its shoulders and base are irregular so the defect does not read as a drawn sector.
 const A0=r=>3.45+.030*Math.sin(r*.021)+.018*Math.sin(r*.079+1.7);
 const A1=r=>4.91+.034*Math.sin(r*.037+2.2)+.016*Math.sin(r*.13);
 const dead=(a,r)=>r>276+7*Math.sin(r*.55)&&a>A0(r)&&a<A1(r);
 c.beginPath();for(let i=0;i<=160;i++){const a=3.40+i/160*1.56,p=point(a,412+18*Math.sin(i*.47)+8*Math.sin(i*1.9));i?c.lineTo(...p):c.moveTo(...p);}
 for(let i=160;i>=0;i--){const a=3.40+i/160*1.56;c.lineTo(...point(a,281+4*Math.sin(i*.17)+2.5*Math.sin(i*.41)));}
 c.closePath();c.fillStyle='#E8CFDB';c.fill();
 // Slough islands and a few ruptured glands at the shoulders keep the edge crumbly.
 for(let i=0;i<80;i++){const a=3.42+R()*1.52,r=292+R()*130,p=point(a,r);oval(c,...p,3+R()*12,2+R()*6,i%3?'rgba(213,180,197,.30)':'rgba(190,148,173,.20)',R()*TAU);}
 for(let i=0;i<26;i++){const a=i<13?A0(360)-.035-R()*.05:A1(360)+.01+R()*.045,r=300+R()*105,p=point(a,r);c.save();c.translate(...p);c.rotate(a+.3);for(let j=0;j<9;j++){const q=j/9*TAU;columnar(c,Math.cos(q)*31,Math.sin(q)*13,.58,q+Math.PI/2,i+j);}c.restore();}
 // Fine eosinophilic striae: the wall reads as a tissue slice, not a flat tint.
 for(let i=0;i<4200;i++){const a=R()*TAU,r=315+R()*560,p=point(a,r),d=dead(a,r),len=6+R()*24,tilt=a+Math.PI/2+(R()-.5)*.85;
  c.strokeStyle=d?'rgba(191,153,175,.13)':'rgba(190,112,148,.18)';c.lineWidth=.45+R()*.35;
  c.beginPath();c.moveTo(...p);c.quadraticCurveTo(p[0]+Math.cos(tilt)*len*.5+(R()-.5)*4,p[1]+Math.sin(tilt)*len*.5+(R()-.5)*4,p[0]+Math.cos(tilt)*len,p[1]+Math.sin(tilt)*len);c.stroke();}
 for(let i=0;i<165;i++){const a=i/165*TAU,p=point(a,345);if(dead(a,345))continue;c.save();c.translate(...p);c.rotate(a+.3);oval(c,0,0,31,12,'#F6EAF0');for(let j=0;j<18;j++){const q=j/18*TAU;columnar(c,Math.cos(q)*35,Math.sin(q)*15,.65,q+Math.PI/2,i+j);}c.restore();}
 for(let i=0;i<12500;i++){const a=R()*TAU,r=410+R()*460,p=point(a,r),d=dead(a,r);c.save();c.translate(...p);c.rotate(a+Math.PI/2+.3);oval(c,0,0,14+R()*25,2+R()*4,d?'rgba(176,146,163,.15)':'rgba(183,96,139,.22)');if(!d)oval(c,0,1,5,1.3,'rgba(88,48,105,.62)');c.restore();}
 // Fine matrix stipple in the preserved wall: the sample's tissue is never flat.
 for(let i=0;i<7600;i++){const a=R()*TAU,r=360+R()*520,p=point(a,r);if(dead(a,r))continue;oval(c,...p,.32+R()*.55,.38+R()*.6,i%3?'rgba(122,88,120,.20)':'rgba(171,120,150,.24)',R()*TAU);}
 // Large regional loss of architecture; muted remnants preserve ghost layers.
 for(let i=0;i<1500;i++){const a=3.41+R()*1.55,r=340+R()*535,p=point(a,r);drawWash(c,'s14.ghost',...p,20+R()*42,{alpha:.075,rot:a});}
 for(let i=0;i<4300;i++){const a=3.41+R()*1.55,r=320+R()*555,p=point(a,r);if(i%3===0){c.strokeStyle='rgba(128,100,127,.20)';c.lineWidth=.8;c.beginPath();c.ellipse(...p,7+R()*11,3.5+R()*5,a,0,TAU);c.stroke();}else oval(c,...p,.6+R()*1.4,.7+R()*1.6,'rgba(74,45,85,.46)',R()*TAU);}
 // Ghost muscle bundles preserve the layered architecture even where nuclei are gone.
 for(let i=0;i<300;i++){const a=3.44+R()*1.44,r=420+R()*400,p=point(a,r);c.save();c.translate(...p);c.rotate(a+Math.PI/2+.3);oval(c,0,0,20+R()*46,4+R()*5.5,'rgba(199,166,183,.13)');c.strokeStyle='rgba(150,112,140,.10)';c.lineWidth=.6;c.stroke();c.restore();}
 // Ghost cell bodies and nuclear dust: necrotic tissue stays dense, just unstained.
 for(let i=0;i<680;i++){const a=3.42+R()*1.53,r=295+R()*575,p=point(a,r),rr=4.5+R()*8;c.fillStyle='rgba(205,171,189,.16)';c.beginPath();c.ellipse(...p,rr,rr*(.55+R()*.55),R()*TAU,0,TAU);c.fill();c.strokeStyle='rgba(139,102,132,.15)';c.lineWidth=.55;c.stroke();}
 for(let i=0;i<5200;i++){const a=3.42+R()*1.53,r=288+R()*588,p=point(a,r);oval(c,...p,.35+R()*.85,.4+R()*.9,i%4?'rgba(96,62,104,.26)':'rgba(159,118,145,.28)',R()*TAU);}
 for(let i=0;i<760;i++){const a=4.70+R()*.25,r=340+R()*520,p=point(a,r);const edge=4.91+.04*Math.sin(r*.04);if(Math.abs(a-edge)<.075||i<70){if(i%3===0)pus(c,...p,.55+R()*.25,R()*TAU,i);else detailedNeutrophil(c,...p,{lobes:2+i%4,sz:.6+R()*.2,rot:R()*TAU},1);}}
 for(let i=0;i<460;i++){const a=4.88+(R()-.5)*.10,r=320+R()*530,p=point(a,r);if(i%3===0)pus(c,...p,.65,R()*TAU,i);else detailedNeutrophil(c,...p,{lobes:2+i%4,sz:.65,rot:R()*TAU},1);}
 // Second inflammatory band on the opposite shoulder of the ulcer.
 for(let i=0;i<300;i++){const a=A0(560)+(R()-.5)*.13,r=400+R()*450,p=point(a,r);if(i%3===0)pus(c,...p,.55+R()*.2,R()*TAU,i);else detailedNeutrophil(c,...p,{lobes:2+i%4,sz:.6,rot:R()*TAU},1);}
 for(let i=0;i<1000;i++){const a=3.7+R()*.98,r=530+R()*230,p=point(a,r);erythrocyte(c,...p,.8+R()*.4,R()*TAU,i);}
 // Patchy fresh haemorrhage inside the necrotic field.
 for(let i=0;i<6;i++){const a=3.75+R()*.95,rr=470+R()*280,cx=point(a,rr);for(let j=0;j<55;j++){const b=R()*TAU,d=Math.sqrt(R());erythrocyte(c,cx[0]+Math.cos(b)*d*34,cx[1]+Math.sin(b)*d*26,.7+R()*.4,R()*TAU,i*9+j);}}
 for(let i=0;i<100;i++){const a=4.78+R()*.2,r=660+R()*150,p=point(a,r);c.strokeStyle='rgba(198,109,146,.65)';c.lineWidth=.75;c.beginPath();c.moveTo(...p);c.bezierCurveTo(p[0]+12,p[1]-8,p[0]+25,p[1]+12,p[0]+48,p[1]+4);c.stroke();if(i%3===0)pus(c,p[0]+14,p[1],.7,R()*TAU,i);}
 // Outer-wall necrotic focus: dense detritus and ghost bodies, not live inflammatory cells.
 for(let i=0;i<1700;i++){const a=4.30+R()*.55,r=650+R()*235,p=point(a,r);
 if(i%7===0)detailedNeutrophil(c,...p,{lobes:2+i%4,sz:.5+R()*.15,rot:R()*TAU},1);
 else if(i%4===0)erythrocyte(c,...p,.6+R()*.35,R()*TAU,i);
 else if(i%3===0){c.strokeStyle='rgba(139,102,134,.22)';c.lineWidth=.55;c.beginPath();c.ellipse(...p,5+R()*8,2.5+R()*4,R()*TAU,0,TAU);c.stroke();}
 else oval(c,...p,.45+R()*.9,.55+R()*1.2,'rgba(96,60,102,.34)',R()*TAU);
 }
 // Fibrin threads and serosal collagen in the same field.
 for(let i=0;i<150;i++){const a=4.32+R()*.5,r=670+R()*215,p=point(a,r);c.strokeStyle='rgba(197,118,150,.42)';c.lineWidth=.3+R()*.3;const len=12+R()*30,dy=(R()-.5)*26;c.beginPath();c.moveTo(...p);c.bezierCurveTo(p[0]+len*.3,p[1]+dy-5,p[0]+len*.7,p[1]-dy*.4,p[0]+len,p[1]+dy);c.stroke();}
 // Pus and debris pool in the lumen against the denuded surface; the lumen is not left blank.
 c.beginPath();for(let i=0;i<=360;i++){const a=i/360*TAU,p=point(a,299+5*Math.sin(a*11)+4*Math.sin(a*7));i?c.lineTo(...p):c.moveTo(...p);}c.closePath();c.fillStyle='rgba(243,225,233,.82)';c.fill();
 for(let i=0;i<700;i++){const a=3.25+R()*1.9,r=150+R()*150,p=point(a,r);oval(c,...p,.6+R()*2.6,.7+R()*2.4,i%3?'rgba(206,167,187,.26)':'rgba(240,229,235,.45)',R()*TAU);}
 for(let i=0;i<150;i++){const a=3.30+R()*1.8,r=210+R()*90,p=point(a,r);if(i%3===0)pus(c,...p,.42+R()*.2,R()*TAU,i);else if(i%3===1)erythrocyte(c,...p,.5+R()*.3,R()*TAU,i);else oval(c,...p,.5+R()*.6,.6+R()*.7,'rgba(92,58,102,.35)',R()*TAU);}
 c.restore();
 return canvas;
}
// Local full-thickness erosion: a ragged necrotic channel cut through the wall.
export function perforation(c,k){
 c.save();c.globalAlpha=k;const a=-1.72,R=rng(5754);
 // The channel widens toward the serosa, with two asymmetric bites and wobbling walls.
 const w=(side,r)=>{const t=Math.min(1,Math.max(0,(r-282)/643));return .015+.013*t+.0055*Math.sin(r*.083+side*1.9)+.0035*Math.sin(r*.21+side*.7)+(side<0&&r>432&&r<510?.011:0)+(side>0&&r>648&&r<732?.009:0);};
 const rim=(side,r)=>point(a+side*w(side,r),r);
 const pts=[];for(let r=282;r<=932;r+=4)pts.push(rim(-1,r));for(let r=932;r>=282;r-=4)pts.push(rim(1,r));
 c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();
 const g=c.createLinearGradient(...point(a,900),...point(a,290));
 g.addColorStop(0,'rgba(233,215,225,.95)');g.addColorStop(.55,'rgba(239,225,232,.88)');g.addColorStop(1,'rgba(243,232,237,.82)');
 c.fillStyle=g;c.fill();
 // Mottled detritus inside the channel, so it never reads as blank paper.
 for(let i=0;i<780;i++){const r=290+R()*630,p=point(a+(R()-.5)*.058,r);oval(c,...p,1.8+R()*8,1.2+R()*4.6,i%3?'rgba(201,164,183,.22)':'rgba(246,237,241,.30)',R()*TAU);}
 // Ghost bodies and nuclear dust: the torn edge is necrotic, not inflamed.
 for(let i=0;i<150;i++){const r=300+R()*610,p=point(a+(R()-.5)*.05,r),rr=3.5+R()*7;c.fillStyle='rgba(206,176,192,.20)';c.beginPath();c.ellipse(...p,rr,rr*(.6+R()*.5),R()*TAU,0,TAU);c.fill();c.strokeStyle='rgba(146,108,136,.26)';c.lineWidth=.55;c.stroke();}
 for(let i=0;i<520;i++){const r=292+R()*620,p=point(a+(R()-.5)*.05,r);oval(c,...p,.35+R()*.85,.45+R()*.95,'rgba(84,54,90,.36)',R()*TAU);}
 // Crumbling fragments overlap the rim so the defect has no continuous outline.
 for(let i=0;i<70;i++){const r=292+R()*615,side=i%2?1:-1,p=rim(side,r);oval(c,p[0]+(R()-.5)*10,p[1]+(R()-.5)*9,3+R()*7,2+R()*4.5,'rgba(203,166,185,.34)',R()*TAU);}
 // Ragged, frayed rim: overlapping debris and ghost fragments instead of a drawn contour.
 for(let i=0;i<240;i++){const r=290+R()*615,side=i%2?1:-1,p=rim(side,r);oval(c,p[0]+(R()-.5)*7,p[1]+(R()-.5)*6,1.4+R()*4.5,1+R()*3.2,i%3?'rgba(213,176,195,.40)':'rgba(176,128,158,.26)',R()*TAU);}
 for(let i=0;i<300;i++){const r=290+R()*615,side=i%2?1:-1,p=rim(side,r);oval(c,p[0]+(R()-.5)*6,p[1]+(R()-.5)*5,.4+R()*1.15,.5+R()*.95,i%2?'rgba(74,45,85,.46)':'rgba(118,72,114,.36)',R()*TAU);}
 // Small haemorrhagic remnants cling to the eroded rim.
 for(let i=0;i<62;i++){const r=310+R()*590,side=i%2?1:-1,p=rim(side,r);erythrocyte(c,p[0]+(R()-.5)*9,p[1]+(R()-.5)*8,.42+R()*.28,R()*TAU,i);}
 // Fine granular matrix between ghost cells, retaining the pale necrotic field.
 for(let i=0;i<850;i++){const r=300+R()*605,p=point(a+(R()-.5)*.10,r);oval(c,...p,.22+R()*.45,.28+R()*.5,'rgba(139,98,129,.20)',R()*TAU);}
 // Sparse pus and bacteria inside; fibrin threads bridge the gap.
 for(let i=0;i<26;i++){const r=305+R()*600,p=point(a+(R()-.5)*.042,r);if(i%2===0)pus(c,...p,.5+R()*.2,R()*TAU,i);else detailedNeutrophil(c,...p,{lobes:2+i%4,sz:.5+R()*.15,rot:R()*TAU},1);}
 for(let i=0;i<5;i++){const r=330+R()*570,p=point(a+(R()-.5)*.06,r);for(let j=0;j<10;j++)oval(c,p[0]+Math.sin(j*7+i)*6,p[1]+Math.cos(j*4+i)*5,.55+R()*.35,.8+R()*.4,'rgba(62,36,82,.66)',R()*TAU);}
 for(let i=0;i<22;i++){const r=340+R()*560,p=point(a+(R()-.5)*.07,r);c.strokeStyle='rgba(192,116,148,.4)';c.lineWidth=.28+R()*.3;const len=10+R()*26,dy=(R()-.5)*34;c.beginPath();c.moveTo(...p);c.bezierCurveTo(p[0]+len*.3,p[1]+dy-4,p[0]+len*.7,p[1]-dy*.4,p[0]+len,p[1]+dy);c.stroke();}
 // Serosal surface torn at the mouth; a thin fibrinopurulent cap sits outside it.
 for(const [s,e] of [[-.30,-.048],[.048,.30]]){
  c.beginPath();for(let i=0;i<=24;i++){const aa=a+s+(e-s)*i/24,p=point(aa,884+1.8*Math.sin(i*1.7));i?c.lineTo(...p):c.moveTo(...p);}c.strokeStyle='rgba(170,116,148,.5)';c.lineWidth=1.1;c.stroke();
  for(let i=0;i<7;i++){const aa=a+s+(e-s)*(i+.5)/7,p=point(aa,879);oval(c,...p,1.7,.7,'rgba(112,64,116,.42)',aa);}
 }
 for(let i=0;i<46;i++){const r=884+R()*62,p=point(a+(R()-.5)*.05,r);
  if(i%5===0)pus(c,...p,.45+R()*.15,R()*TAU,i);
  else if(i%5===1)oval(c,...p,2.5+R()*6,1.2+R()*2.6,'rgba(222,181,201,.20)',R()*TAU);
  else {c.strokeStyle='rgba(196,120,150,.28)';c.lineWidth=.3;const len=8+R()*18,dy=(R()-.5)*20;c.beginPath();c.moveTo(...p);c.bezierCurveTo(p[0]+len*.4,p[1]+dy,p[0]+len*.7,p[1]-dy*.5,p[0]+len,p[1]+dy*.6);c.stroke();}
 }
 c.restore();
}
