// Lane card: paper cards, narrative navigation and non-probabilistic branches.
import {ink} from '../lib/ink.js';
// Figures come from the clinical lane's shared library (same drawing as S02/S03/S16).
// clin_draw.js is a byte-for-byte copy; its figure geometry is not modified here.
import {prepare as prepareClin,person as clinPerson} from './clin_draw.js';
export const colors=['#D6453A','#A28A53','#41343F'];
export const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function text(c,s,x,y,size=36,color='#2A2A35',weight=500){c.fillStyle=color;c.font=`${weight} ${size}px MixSans`;c.fillText(s,x,y);}
export function line(c,pts,key,color='#A38AB5',k=1){ink(c,'card.'+key,'curve',[pts],{fill:'none',stroke:color,strokeWidth:1.6,seed:41,boil:false},{k,fill:false});}
export function paper(c){c.setTransform(1,0,0,1,0,0);c.fillStyle='#F4EFE6';c.fillRect(0,0,1920,1080);}
export function nav(c,x=85,y=120,active=-1){['红','黄','黑'].forEach((s,i)=>{c.save();c.globalAlpha=active<0||i===active?1:.35;text(c,s,x+i*115,y,38,colors[i],700);c.restore();if(i<2)text(c,'→',x+53+i*115,y,30,'#AC98B7');});}
export function card(c,heading,rows,{x=85,y=250,w=410,tone='#6B4C9A',rowSize=38}={}){text(c,heading,x,y,46,tone,700);line(c,[[x,y+27],[x+w*.51,y+29],[x+w,y+26]],'underline'+x+y,'#C9B9CA');rows.forEach((s,i)=>text(c,s,x,y+105+i*58,rowSize));}
export function label(c,s,x,y,px,py){text(c,s,x,y,32,'#A38AB5');line(c,[[px,py],[x+28,y+13],[x+180,y+13]],'label'+s+x);}
export function path(c,branch=0,active=2){
 const ys=[285,435,640];const names=[['单纯性'],['化脓性','（蜂窝织炎性）'],['坏疽性']];
 names.forEach((rows,i)=>{c.save();c.globalAlpha=i<=active?1:.3;rows.forEach((s,j)=>text(c,s,115,ys[i]+j*51,j?34:43,colors[i],700));if(i<2){const end=ys[i]+(i?130:110);line(c,[[130,ys[i]+(i?85:40)],[130,end]],'chain'+i,'#AD9BAF');line(c,[[123,end-10],[130,end],[137,end-10]],'chainTip'+i,'#AD9BAF');}c.restore();});
 if(branch>0){c.save();c.globalAlpha=branch;line(c,[[342,285],[487,325],[558,435]],'branch0');line(c,[[342,435],[478,502],[558,570]],'branch1');text(c,'…',560,454,40,'#A38AB5');text(c,'…',560,589,40,'#A38AB5');text(c,'非固定路径',115,805,36,'#6B4C9A');c.restore();}}
// Aligned with the clinical lane: light-wash figures with Rough outlines, full body.
// GROUND is the shared implied floor line; every figure in a frame is placed by its feet.
export const GROUND=780;
const FIG_H=620; // clin_draw person local height (top 0 → sole 618)
export function prepareFigures(){prepareClin();}
function doctorDetails(c,x,top,s){
 c.save();c.translate(x,top);c.scale(s,s);
 // Short grey hair under a clipped head so the doctor never reads as the patient.
 const head=new Path2D('M -43 38 Q -39 3 0 6 Q 39 5 43 39 L 39 83 Q 32 118 0 128 Q -31 118 -39 85 Z');
 c.save();c.clip(head);
 c.fillStyle='#EDE7DC';c.beginPath();
 c.moveTo(-52,64);c.quadraticCurveTo(-58,12,-14,3);c.quadraticCurveTo(30,-8,48,28);
 c.lineTo(48,52);c.quadraticCurveTo(16,26,-8,28);c.quadraticCurveTo(-28,34,-34,64);c.closePath();c.fill();
 c.strokeStyle='#C9BFB0';c.lineWidth=1.4;
 for(let i=0;i<7;i++){c.beginPath();c.moveTo(-30+i*10,10+i*3);c.quadraticCurveTo(-24+i*10,26+i*3,-20+i*9,40);c.stroke();}
 c.restore();
 c.strokeStyle='#2A2A35';c.lineWidth=2.2;
 c.beginPath();c.arc(-18,68,11,0,Math.PI*2);c.stroke();
 c.beginPath();c.arc(19,68,11,0,Math.PI*2);c.stroke();
 c.beginPath();c.moveTo(-7,68);c.lineTo(8,68);c.stroke();
 c.restore();
}
// One figure with both soles on `ground`. Returns anchor points for labels/arrows.
export function personAt(c,{x=1040,ground=GROUND,scale=.92,doctor=false,face='calm',arm='rest',alpha=1}={}){
 const top=ground-FIG_H*scale;
 c.save();c.globalAlpha*=alpha;clinPerson(c,{x,y:top,scale,doctor,face,arm});if(doctor)doctorDetails(c,x,top,scale);c.restore();
 return {x,top,ground,scale,chest:[x,top+175*scale],handR:[x+100*scale,top+382*scale],handL:[x-100*scale,top+382*scale]};
}
export function people(c,{pain=0,alpha=1,x=1040,ground=GROUND,scale=.92}={}){
 return personAt(c,{x,ground,scale,face:pain?'pain':'calm',arm:pain?'pain':'rest',alpha});}
export function doctor(c,x=1400,ground=GROUND,scale=.92){return personAt(c,{x,ground,scale,doctor:true,face:'calm'});}
// Records/lab slips fly one by one from the patient's side to the doctor (sentence 64).
function records(c,px,dx,ground,sc,p){
 for(let i=0;i<3;i++){
  const k=Math.max(0,Math.min(1,(p-i*.2)/.55));if(k<=0)continue;
  const e=ease(k),sx=px+96+i*14,sy=ground-250-i*30,ex=dx-58+(i-1)*10,ey=ground-322+i*24;
  const x=sx+(ex-sx)*e,y=sy+(ey-sy)*e-Math.sin(Math.PI*e)*52;
  c.save();c.globalAlpha*=Math.min(1,k*2.2);c.translate(x,y);c.rotate((i-1)*.1*(1-e));
  ink(c,'card.form'+i,'polygon',[[[-42,-52],[42,-52],[42,52],[-42,52]]],{fill:'#FBF7F0',fillStyle:'solid',stroke:'#AC98B7',strokeWidth:1.5,seed:90+i},{fill:true});
  line(c,[[-30,-28],[-2,-28]],'formline'+i);line(c,[[-30,-6],[22,-6]],'formlineB'+i);line(c,[[-30,16],[10,16]],'formlineC'+i);
  c.restore();}
}
// o: px/dx place patient and doctor on GROUND; records fly between them (sentence 64).
export function assess(c,p=1,o={}){const px=o.px??1010,dx=o.dx??1430,g=o.ground??GROUND,sc=o.scale??.92;
 if(o.patient!==false)people(c,{x:px,ground:g,scale:sc,pain:o.pain?1:0});
 doctor(c,dx,g,sc);
 if(p>0)records(c,px,dx,g,sc,p);
}
// One treatment-situation window: open paper frame + heading + full figure standing inside.
export function situation(c,{x,y,w,h,heading,pain=0,alpha=1,rise=0,scale=.44},
 {textSize=56}={}){c.save();c.globalAlpha*=alpha;c.translate(0,rise);
 ink(c,'card.win'+heading,'polygon',[[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]],{fill:'#F9F4EC',fillStyle:'solid',stroke:'#D8C9D5',strokeWidth:1.6,roughness:1.2,seed:120},{fill:true});
 text(c,heading,x+64,y+h/2+textSize*.36,textSize,'#6B4C9A',700);
 personAt(c,{x:x+w-150,ground:y+h-26,scale,face:pain?'pain':'calm',arm:pain?'pain':'rest'});
 c.restore();}
// Evidence values are exact strings from the storyboard; reject unknown keys.
export const evidence={ct:{title:'增强螺旋CT',rows:['2023','8篇、1602人','敏感度95%','特异度94%','[1]']},boundary:{title:'并非三型分型准确度',rows:['仍需结合临床']},surgery:{title:'条件性推荐',rows:['具体时机结合临床评估','[5]']},literature:{title:'文献提示',rows:['2023、2026','[3][4]']}};
export function evidenceCard(c,key,options){if(!evidence[key])throw Error('Unknown evidence key');const d=evidence[key];card(c,d.title,d.rows,options);}
