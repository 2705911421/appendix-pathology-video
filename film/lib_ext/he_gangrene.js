import {rng} from '../lib/motion.js';
import {detailedNeutrophil} from '../lib/he_detail.js';
import {columnar,erythrocyte} from './cells_ext.js';
import {bake,drawWash} from '../lib/wash.js';
const TAU=Math.PI*2;
export function point(a,r){const u=Math.cos(a)*r*1.5,v=Math.sin(a)*r;return [u*Math.cos(.3)-v*Math.sin(.3),u*Math.sin(.3)+v*Math.cos(.3)];}
export const focus={edge:point(-1.35,650),exudate:point(-1.43,730),overview:point(-1.58,650),hole:point(-1.72,858),dead:point(-1.65,620),blood:point(-1.72,700)};
function pus(c,x,y,s,rot,key){c.save();c.translate(x,y);c.rotate(rot);c.scale(s,s);c.beginPath();c.ellipse(0,0,10.2,9.6,0,0,TAU);c.fillStyle='rgba(226,170,200,.44)';c.fill();c.fillStyle='#50345F';for(let j=0;j<(key%2?4:1);j++){c.beginPath();c.ellipse(key%2?-4+j*2.6:0,key%2?(j%2?2:-2):0,key%2?1.5:3.3,key%2?2:3.8,j*.7,0,TAU);c.fill();}c.restore();}
function oval(c,x,y,rx,ry,color,a=0){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,a,0,TAU);c.fill();}
export function prepareGangreneMap(){
 bake('s14.ghost',(b,P)=>P.fill(b,P.blob(0,0,90,25,.3,541),'#C7B0BE',90,.4),{seed:541,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});
 const canvas=document.createElement('canvas');canvas.width=6800;canvas.height=5000;const c=canvas.getContext('2d');c.scale(2,2);c.translate(1700,1250);const R=rng(54057);
 for(const [r,col] of [[885,'#E9CFD8'],[837,'#DFADBF'],[740,'#E9C2CF'],[570,'#EAD4DF'],[390,'#D8BCD4'],[290,'#F6EEF0']]){c.beginPath();for(let i=0;i<=360;i++){const a=i/360*TAU,p=point(a,r+6*Math.sin(a*11)+5*Math.sin(a*7));i?c.lineTo(...p):c.moveTo(...p);}c.closePath();c.fillStyle=col;c.fill();}
 const dead=(a,r)=>a>4.03&&a<4.91+.04*Math.sin(r*.04)&&r>335;
 for(let i=0;i<165;i++){const a=i/165*TAU,p=point(a,345);c.save();c.translate(...p);c.rotate(a+.3);oval(c,0,0,31,12,'#F6EAF0');for(let j=0;j<18;j++){const q=j/18*TAU;columnar(c,Math.cos(q)*35,Math.sin(q)*15,.65,q+Math.PI/2,i+j);}c.restore();}
 for(let i=0;i<4600;i++){const a=R()*TAU,r=410+R()*460,p=point(a,r),d=dead(a,r);c.save();c.translate(...p);c.rotate(a+Math.PI/2+.3);oval(c,0,0,14+R()*25,2+R()*4,d?'rgba(174,145,161,.10)':'rgba(183,96,139,.22)');if(!d)oval(c,0,1,5,1.3,'rgba(88,48,105,.62)');c.restore();}
 // Large regional loss of architecture; muted remnants preserve ghost layers.
 for(let i=0;i<320;i++){const a=4.05+R()*.82,r=350+R()*525,p=point(a,r);drawWash(c,'s14.ghost',...p,65+R()*80,{alpha:.12,rot:a});}
 for(let i=0;i<850;i++){const a=4.05+R()*.80,r=345+R()*530,p=point(a,r);if(i%3===0){c.strokeStyle='rgba(128,100,127,.20)';c.lineWidth=.8;c.beginPath();c.ellipse(...p,8+R()*12,4+R()*5,a,0,TAU);c.stroke();}else oval(c,...p,.6+R()*1.4,.7+R()*1.6,'rgba(74,45,85,.48)',R()*TAU);}
 for(let i=0;i<720;i++){const a=4.04+R()*.9,r=375+R()*470,p=point(a,r);const edge=4.91+.04*Math.sin(r*.04);if(Math.abs(a-edge)<.13||i<240){if(i%3===0)pus(c,...p,.55+R()*.25,R()*TAU,i);else detailedNeutrophil(c,...p,{lobes:2+i%4,sz:.6+R()*.2,rot:R()*TAU},1);}}
 for(let i=0;i<460;i++){const a=4.88+(R()-.5)*.17,r=420+R()*445,p=point(a,r);if(i%3===0)pus(c,...p,.65,R()*TAU,i);else detailedNeutrophil(c,...p,{lobes:2+i%4,sz:.65,rot:R()*TAU},1);}
 for(let i=0;i<420;i++){const a=4.18+R()*.46,r=530+R()*230,p=point(a,r);erythrocyte(c,...p,.8+R()*.4,R()*TAU,i);}
 for(let i=0;i<100;i++){const a=4.78+R()*.2,r=660+R()*150,p=point(a,r);c.strokeStyle='rgba(198,109,146,.65)';c.lineWidth=.75;c.beginPath();c.moveTo(...p);c.bezierCurveTo(p[0]+12,p[1]-8,p[0]+25,p[1]+12,p[0]+48,p[1]+4);c.stroke();if(i%3===0)pus(c,p[0]+14,p[1],.7,R()*TAU,i);}
 return canvas;
}
export function perforation(c,k){c.save();c.globalAlpha=k;const a=-1.72;const pts=[];for(let i=0;i<=24;i++)pts.push(point(a-.025-.009*Math.sin(i*2),300+i*25));for(let i=24;i>=0;i--)pts.push(point(a+.025+.009*Math.cos(i*2),300+i*25));c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle='#F1E5EB';c.fill();c.strokeStyle='#B58DA9';c.lineWidth=2;c.stroke();for(let i=0;i<12;i++){const p=point(a+Math.sin(i*7.3)*.021,879+i*5+Math.cos(i*3)*7);pus(c,...p,.65,i,i);if(i%3===0)for(let j=0;j<6;j++)oval(c,p[0]+10+Math.sin(j*3)*4,p[1]+Math.cos(j*2)*4,.9,1.2,'#4C315D');}c.restore();}
