import {prepareChronic} from '../lib_ext/he_chronic.js';
let tissue;
import {paper,nav,card,text,prepareFigures,assess,people,label,line,ease,situation} from '../lib_ext/card_library.js';
export default {prepare(){prepareFigures();tissue=prepareChronic();},draw(c,t,T){
 const A=T.at(71),B=T.at(72),C=T.at(73),D=T.at(74);paper(c);nav(c);
 if(t<C+.05){
  // 71–72: 慢性组织淡出 → 间歇疼痛的患者 → 病历资料汇入医生评估
  const aOut=Math.min(1,Math.max(0,1-(t-(C-.5))/.5));c.save();c.globalAlpha=aOut;
  const ta=1-ease((t-A)/(T.frac(71,.28)-A));
  if(ta>0){c.save();c.globalAlpha*=ta;c.beginPath();c.arc(1250,475,380,0,Math.PI*2);c.clip();c.fillStyle='#F6EEF0';c.fill();c.drawImage(tissue,734,95,1033,760);c.restore();}
  card(c,'正规评估',['疼痛即便','时轻时重',...(t>=B?['也应接受正规评估']:[])]);
  people(c,{x:1120,y:520,scale:.66,pain:t<B?1:0});
  const ring=t<B?1:Math.max(0,1-(t-B)/.8);
  if(ring>0){c.save();c.globalAlpha=ring*(.5+.4*Math.sin(Math.PI*((t-A)/(B-A))*2)**2);c.strokeStyle='#D6453A';c.lineWidth=3;c.beginPath();c.arc(1063,633,34,0,Math.PI*2);c.stroke();c.restore();}
  const da=ease((t-B)/(T.frac(72,.4)-B));
  if(da>0){c.save();c.globalAlpha*=da;assess(c,da,{px:1120,dx:1600,cy:520,scale:.66,patient:false,label:false});c.restore();}
  if(t>=B+.5)label(c,'医生评估',1500,908,1710,878);
  c.restore();
 }else{
  // 73–74: 两个治疗情境窗依次展开，不同时抢字幕
  const a1=ease((t-C)/(T.frac(73,.5)-C)),a2=ease((t-D)/(T.frac(74,.5)-D));
  text(c,'一旦确诊',85,250,46,'#6B4C9A',700);line(c,[[85,277],[295,279],[410,276]],'once');
  text(c,'症状缓解期',85,368,38,'#41343F',700);
  if(t>=D){c.save();c.globalAlpha=a2;text(c,'急性发作期',85,556,38,'#41343F',700);c.restore();}
  line(c,[[300,360],[560,378],[696,404]],'toW1','#A38AB5',a1);
  if(a2>0)line(c,[[300,548],[560,600],[696,700]],'toW2','#A38AB5',a2);
  situation(c,{x:700,y:286,w:1060,h:290,heading:'择期切除',pain:0,alpha:a1*(1-.45*a2),rise:(1-a1)*26});
  if(a2>0)situation(c,{x:700,y:618,w:1060,h:290,heading:'视情况急诊手术',pain:1,alpha:a2,rise:(1-a2)*26});
 }
}};
