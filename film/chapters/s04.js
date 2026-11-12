import {paper,text,drawCT,leader} from '../lib_ext/ct_schematic.js';
import {doctor,choice,evidence} from '../lib_ext/ct_clinical.js';
const cache=new Map();
export default {prepare(){cache.clear();},draw(c,t,T){const n=[14,15,16,17,18,19].filter(n=>t>=T.at(n)).at(-1)||14;
 const options=n===15||t>=T.frac(14,.55),more=t>=T.frac(16,.5),specific=t>=T.frac(17,.5);const key=[n,options,more,specific].join();if(cache.has(key)){c.setTransform(1,0,0,1,0,0);c.drawImage(cache.get(key),0,0);return;}paper(c);
 if(n<=15){text(c,'CT是辅助工具',70,240,44,'#6B4C9A',700);if(n===15)text(c,'并非人人必须',70,320,43);doctor(c,1100,380,1.15);text(c,'医生评估',1000,760,40,'#6B4C9A',700);if(options)choice(c);}
 else if(n<=17){text(c,'增强螺旋CT',70,205,43,'#6B4C9A',700);text(c,'2023',70,300,40);text(c,'8篇',70,380,40);if(more||n===17)text(c,'1602人',70,460,40);if(n===17){text(c,'敏感度95%',70,555,40);if(specific)text(c,'特异度94%',70,630,40);text(c,'[1]',70,710,30,'#6B4C9A');}drawCT(c,820,120,1030,620,{stage:1,around:true});}
 else if(n===18){['并非三型','分型准确度','仍需结合临床'].forEach((s,i)=>text(c,s,70,235+i*80,i===2?36:42,i===0?'#6B4C9A':'#2A2A35',i===0?700:500));const a=drawCT(c,820,120,1030,620,{stage:1,around:true});leader(c,'管径增粗、壁增厚',1050,775,...a);}
 else {text(c,'仍需结合临床',70,240,43,'#6B4C9A',700);text(c,'判断病情轻重',70,320,40);evidence(c);drawCT(c,1050,225,390,370,{stage:1,around:true});}
 const frame=document.createElement('canvas');frame.width=1920;frame.height=1080;frame.getContext('2d').drawImage(c.canvas,0,0);cache.set(key,frame);
}};
