import {prepareChronic} from '../lib_ext/he_chronic.js';
let tissue;
import {paper,nav,card,text,prepareFigures,assess,people,label,line,ease,situation,GROUND} from '../lib_ext/card_library.js';
export default {prepare(){prepareFigures();tissue=prepareChronic();},draw(c,t,T){
 const A=T.at(71),B=T.at(72),C=T.at(73),D=T.at(74);paper(c);nav(c);
 const G=GROUND;
 if(t<C+.05){
  // 71–72: 慢性组织淡出 → 间歇疼痛的患者 → 病历资料汇入医生评估
  const aOut=Math.min(1,Math.max(0,1-(t-(C-.5))/.5));c.save();c.globalAlpha=aOut;
  const ta=1-ease((t-A)/(T.frac(71,.5)-A));
  if(ta>0){c.save();c.globalAlpha*=ta;c.beginPath();c.arc(1250,470,380,0,Math.PI*2);c.clip();c.fillStyle='#F6EEF0';c.fill();c.drawImage(tissue,734,90,1033,760);c.restore();}
  card(c,'正规评估',['疼痛即便','时轻时重',...(t>=B?['也应接受正规评估']:[])]);
  const px=1030,dx=1450;
  people(c,{x:px,ground:G,scale:.92,pain:t<B?1:0});
  const ring=t<B?1:Math.max(0,1-(t-B)/.8);
  if(ring>0){c.save();c.globalAlpha=ring*(.5+.4*Math.sin(Math.PI*((t-A)/(B-A))*2)**2);c.strokeStyle='#D6453A';c.lineWidth=3;c.beginPath();c.arc(px-46,G-620*.92+308*.92,34,0,Math.PI*2);c.stroke();c.restore();}
  const da=ease((t-B)/(T.frac(72,.4)-B));
  if(da>0){c.save();c.globalAlpha*=da;assess(c,da,{px,dx,ground:G,scale:.92,patient:false});c.restore();}
  c.restore();
  if(t>=B+.5){c.save();c.globalAlpha=Math.min(1,(t-B-.5)/.4);label(c,'医生评估',1568,700,1504,624);c.restore();}
 }else{
  // 73–74: 两个治疗情境窗依次展开，不同时抢字幕
  const a1=ease((t-C)/(T.frac(73,.5)-C)),a2=ease((t-D)/(T.frac(74,.5)-D));
  text(c,'一旦确诊',85,250,46,'#6B4C9A',700);line(c,[[85,277],[295,279],[410,276]],'once');
  text(c,'症状缓解期',85,340,38,'#41343F',700);
  if(t>=D){c.save();c.globalAlpha=a2;text(c,'急性发作期',85,710,38,'#41343F',700);c.restore();}
  line(c,[[300,332],[520,340],[722,356]],'toW1','#A38AB5',a1);
  if(a2>0)line(c,[[300,702],[520,712],[722,724]],'toW2','#A38AB5',a2);
  situation(c,{x:730,y:190,w:1070,h:330,heading:'择期切除',pain:0,alpha:a1*(1-.45*a2),rise:(1-a1)*26,scale:.46});
  const u=ease((t-T.frac(73,.55))/(T.frac(73,.9)-T.frac(73,.55)));
  if(u>0)line(c,[[794,404],[794+232*u,402]],'w1u','#C9AECD',u);
  if(a2>0)situation(c,{x:730,y:560,w:1070,h:330,heading:'视情况急诊手术',pain:1,alpha:a2,rise:(1-a2)*26,scale:.46});
 }
}};
