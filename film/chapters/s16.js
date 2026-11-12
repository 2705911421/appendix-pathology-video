import {prepare,base,person,lab,specimen,slide,scalpel,arrow,text,ct,progress} from '../lib_ext/clin_draw.js';
export default {prepare,draw(c,t,T){
 if(t<T.at(61)){const p=progress(t,T,60,.08,.8);base(c,'评估治疗紧迫性');person(c,{x:950,y:135,scale:1,face:'pain'});person(c,{x:1280,y:135,scale:1,doctor:true});c.save();c.globalAlpha=.35+.65*p;lab(c,1630,440,.85);c.restore();arrow(c,1420,440,1420+95*p,440);return;}
 if(t<T.at(62)){base(c,'切除后病理',['确认分型']);const p=progress(t,T,61,.05,.75);scalpel(c,795,430,1.4);text(c,'切除后',710,650,36,'#A38AB5');if(p>.08){specimen(c,1120,430,1.25);arrow(c,880,430,980,430);text(c,'送检',1080,650,36,'#A38AB5');}if(p>.44){slide(c,1540,430,1.35);arrow(c,1250,430,1370,430);text(c,'病理切片',1450,650,36,'#A38AB5');}return;}
 const p=progress(t,T,62,.05,.9),stage=p<.33?0:p<.66?1:2;
 base(c,'影像发现并发症',['坏疽、穿孔、脓肿']);text(c,'[3] 2023；[4] 2026',80,720,30,'#A38AB5');ct(c,stage);
}};
export const EXIT_S16=62;
