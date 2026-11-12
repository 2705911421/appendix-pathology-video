import {paper,nav,card,text,prepareFigures,assess,people,doctor,ease,GROUND} from '../lib_ext/card_library.js';
import {prepareGross as prepare,gross} from '../lib_ext/card_gross_cache.js';
const G=GROUND;
function chip(c,{x,y,w,h,label,on=0,alpha=1}){
 c.save();c.globalAlpha*=alpha;
 const d=`M ${x} ${y} L ${x+w} ${y} L ${x+w} ${y+h} L ${x} ${y+h} Z`;
 c.fillStyle=on?'#EFE4F2':'#FBF7F0';c.fill(new Path2D(d));
 c.strokeStyle=on?'#8E6FA8':'#D3C3CF';c.lineWidth=on?2.2:1.4;c.stroke(new Path2D(d));
 text(c,label,x+34,y+h/2+16,44,on?'#6B4C9A':'#594A57',on?700:500);
 c.restore();}
export default {async prepare(){prepareFigures();await prepare();},draw(c,t,T){
 paper(c);nav(c);
 if(t<T.at(64)){
  card(c,'手术切除',['蜂窝织炎性','坏疽性']);
  text(c,'条件性推荐 [5]',85,650,32,'#6B4C9A');
  text(c,'具体时机结合临床评估',85,706,30,'#6B4C9A');
  people(c,{x:890,ground:G,pain:1,scale:.92});
  doctor(c,1190,G,.92);
  const p=ease((t-T.at(63))/(T.frac(63,.8)-T.at(63)));
  gross(c,2,{x:1580,y:430,scale:.3,alpha:p});
  c.save();c.globalAlpha=p;text(c,'手术切除',1508,780,36,'#A38AB5');c.restore();
  return;
 }
 const px=850,dx=1400;
 if(t<T.at(65)){
  // 64: records/lab slips leave the patient one by one and settle in the doctor's hands.
  card(c,'具体方案',['结合患者的','具体情况']);
  const p=ease((t-T.at(64))/(T.frac(64,.8)-T.at(64)));
  assess(c,p,{px,dx,ground:G,scale:.92,pain:1});
  return;
 }
 // 65: two option windows open below the doctor; which one is highlighted switches once.
 card(c,'具体方案',['结合患者的','具体情况','是否马上手术','由医生评估决定']);
 people(c,{x:px,ground:G,pain:1,scale:.92});doctor(c,dx,G,.92);
 const a=ease((t-T.at(65))/(T.frac(65,.35)-T.at(65)));
 const sw=ease((t-T.frac(65,.5))/(T.frac(65,.82)-T.frac(65,.5)));
 const y=806,h=112;
 chip(c,{x:1000,y,w:400,h,label:'马上手术',on:a*(1-sw),alpha:a});
 chip(c,{x:1440,y,w:400,h,label:'观察后择期',on:a*sw,alpha:a});
}};
