import {prepare,base,person,abdomen,lab,leader,text,arrow,progress} from '../lib_ext/clin_draw.js';
export default {prepare,draw(c,t,T){
 if(t<T.at(12)){base(c,'典型／非典型');
  for(let i=0;i<2;i++){
   const x=900+i*600,p=progress(t,T,11,i?.52:.04,i?.94:.50);
   c.save();c.globalAlpha=p;c.translate((1-p)*(i?26:-26),(1-p)*26);
   text(c,i?'非典型':'典型',x-70,140,42,'#6B4C9A',700);
   person(c,{x:x-110,y:215,scale:.75,face:i?'neutral':'pain'});
   abdomen(c,x+95,450,.63,1,i?'atypical':false);
   c.restore();
  }
  return;}
 const isLab=t>=T.at(13),exam=progress(t,T,12,.40,.70);
 base(c,'寻找线索',['问诊',...(exam>.05?['查体']:[]),...(isLab?['化验']:[])]);
 person(c,{x:920,y:140,scale:.98,face:'pain'});person(c,{x:1150,y:140,scale:.98,doctor:true,arm:exam>.5?'exam':'rest'});
 if(!isLab){if(exam<.5){leader(c,'问诊',1440,250,1280,245);}else{abdomen(c,1620,450,.73,1);leader(c,'查体',1500,180,1573,522);}}
 else{const p=progress(t,T,13,.05,.3);c.save();c.globalAlpha=p;lab(c,1630,440,1.1);arrow(c,1360,440,1460,440);c.restore();}
}};
export const EXIT_S03=13;
