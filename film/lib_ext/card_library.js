// Lane card: paper cards, narrative navigation and non-probabilistic branches.
import {ink} from '../lib/ink.js';
import {drawFigure,drawArmR} from './card_figure.js';
export const colors=['#D6453A','#A28A53','#41343F'];
export const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function text(c,s,x,y,size=36,color='#2A2A35',weight=500){c.fillStyle=color;c.font=`${weight} ${size}px MixSans`;c.fillText(s,x,y);}
export function line(c,pts,key,color='#A38AB5',k=1){ink(c,'card.'+key,'curve',[pts],{fill:'none',stroke:color,strokeWidth:1.6,seed:41,boil:false},{k,fill:false});}
export function paper(c){c.setTransform(1,0,0,1,0,0);c.fillStyle='#F4EFE6';c.fillRect(0,0,1920,1080);}
export function nav(c,x=85,y=120,active=-1){['红','黄','黑'].forEach((s,i)=>{c.save();c.globalAlpha=active<0||i===active?1:.35;text(c,s,x+i*115,y,38,colors[i],700);c.restore();if(i<2)text(c,'→',x+53+i*115,y,30,'#AC98B7');});}
export function card(c,heading,rows,{x=85,y=250,w=410,tone='#6B4C9A'}={}){text(c,heading,x,y,46,tone,700);line(c,[[x,y+27],[x+w*.51,y+29],[x+w,y+26]],'underline'+x+y,'#C9B9CA');rows.forEach((s,i)=>text(c,s,x,y+105+i*58,36));}
export function label(c,s,x,y,px,py){text(c,s,x,y,32,'#A38AB5');line(c,[[px,py],[x+28,y+13],[x+180,y+13]],'label'+s+x);}
export function path(c,branch=0,active=2){
 const ys=[285,435,640];const names=[['单纯性'],['化脓性','（蜂窝织炎性）'],['坏疽性']];
 names.forEach((rows,i)=>{c.save();c.globalAlpha=i<=active?1:.3;rows.forEach((s,j)=>text(c,s,115,ys[i]+j*51,j?34:43,colors[i],700));if(i<2){const end=ys[i]+(i?130:110);line(c,[[130,ys[i]+(i?85:40)],[130,end]],'chain'+i,'#AD9BAF');line(c,[[123,end-10],[130,end],[137,end-10]],'chainTip'+i,'#AD9BAF');}c.restore();});
 if(branch>0){c.save();c.globalAlpha=branch;line(c,[[342,285],[487,325],[558,435]],'branch0');line(c,[[342,435],[478,502],[558,570]],'branch1');text(c,'…',560,454,40,'#A38AB5');text(c,'…',560,589,40,'#A38AB5');text(c,'非固定路径',115,805,36,'#6B4C9A');c.restore();}}
let figureWash;
export function prepareFigures(){if(figureWash)return;figureWash=document.createElement('canvas');figureWash.width=420;figureWash.height=560;const g=figureWash.getContext('2d');let seed=511;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<650;i++){const x=rand()*420,y=rand()*560,r=8+rand()*32;const grad=g.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,i%3?'rgba(177,150,185,.025)':'rgba(207,169,151,.035)');grad.addColorStop(1,'rgba(207,169,151,0)');g.fillStyle=grad;g.fillRect(x-r,y-r,r*2,r*2);}}
export function people(c,{pain=0,alpha=1,x=1160,y=510,scale=.7}={}){c.save();c.globalAlpha*=alpha;c.translate(x,y);c.scale(scale,scale);c.translate(-960,-610);if(figureWash){c.save();c.beginPath();c.moveTo(805,372);c.lineTo(905,342);c.lineTo(1015,342);c.lineTo(1115,372);c.lineTo(1098,830);c.lineTo(822,830);c.closePath();c.clip();c.drawImage(figureWash,770,330,400,510);c.restore();}drawFigure(c,{face:pain?'pain':'calm',hatch:.6});drawArmR(c,{pose:pain?'clutch':'rest'});c.restore();}
// White-coat edges follow the shirt hem (local y≈210) instead of cutting across the torso.
export function doctor(c,x=1510,y=510,scale=.7){people(c,{x,y,scale});c.save();c.translate(x,y);c.scale(scale,scale);
 ink(c,'card.coatL','linearPath',[[[-52,-252],[-6,-152],[-58,210]]],{stroke:'#A38AB5',strokeWidth:1.7,seed:71},{fill:false});
 ink(c,'card.coatR','linearPath',[[[52,-252],[6,-152],[58,210]]],{stroke:'#A38AB5',strokeWidth:1.7,seed:72},{fill:false});
 ink(c,'card.clipboard','polygon',[[[-190,25],[-85,25],[-85,160],[-190,160]]],{fill:'#F9F4EC',fillStyle:'solid',stroke:'#AC98B7',strokeWidth:1.6,seed:73},{fill:true});
 line(c,[[-172,58],[-103,58]],'cb1');line(c,[[-172,80],[-118,80]],'cb2');line(c,[[-172,102],[-130,102]],'cb3');c.restore();}
// o: px/dx/cy/scale place patient and doctor; forms sit between them, label under the doctor's feet.
export function assess(c,p=1,o={}){const px=o.px??1050,dx=o.dx??1510,cy=o.cy??490,sc=o.scale??.7;
 if(o.patient!==false)people(c,{x:px,y:cy,pain:0,scale:sc});doctor(c,dx,cy,sc);
 for(let i=0;i<3;i++){const x=px+150+i*50,y=cy-130+i*45;c.save();c.globalAlpha*=p;ink(c,'card.form'+i,'polygon',[[[x,y],[x+62,y-2],[x+64,y+81],[x,y+79]]],{fill:'#F4EFE6',fillStyle:'solid',stroke:'#AC98B7',seed:90+i});line(c,[[x+13,y+24],[x+48,y+24]],'formline'+i);line(c,[[x+13,y+43],[x+40,y+43]],'formlineB'+i);c.restore();}
 line(c,[[px+110,cy+80],[px+220,cy+45],[dx-135,cy+70]],'assess'+px+dx,'#A38AB5',p);
 if(o.label!==false)label(c,'医生评估',dx-60,908,dx+110,cy+358);}
// One treatment-situation window: open paper frame + heading + figure.
export function situation(c,{x,y,w,h,heading,pain=0,alpha=1,rise=0}){c.save();c.globalAlpha*=alpha;c.translate(0,rise);
 ink(c,'card.win'+heading,'polygon',[[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]],{fill:'#F9F4EC',fillStyle:'solid',stroke:'#D8C9D5',strokeWidth:1.6,roughness:1.2,seed:120},{fill:true});
 text(c,heading,x+70,y+h/2+18,50,'#6B4C9A',700);people(c,{x:x+w-200,y:y+h/2+10,scale:.27,pain});c.restore();}
// Evidence values are exact strings from the storyboard; reject unknown keys.
export const evidence={ct:{title:'增强螺旋CT',rows:['2023','8篇、1602人','敏感度95%','特异度94%','[1]']},boundary:{title:'并非三型分型准确度',rows:['仍需结合临床']},surgery:{title:'条件性推荐',rows:['具体时机结合临床评估','[5]']},literature:{title:'文献提示',rows:['2023、2026','[3][4]']}};
export function evidenceCard(c,key,options){if(!evidence[key])throw Error('Unknown evidence key');const d=evidence[key];card(c,d.title,d.rows,options);}
