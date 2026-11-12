import {paper,text,drawCT} from '../lib_ext/ct_schematic.js';
export default {prepare(){},draw(c){paper(c);text(c,'CT表现示意',70,75,46,'#6B4C9A',700);const names=['管径增粗、壁增厚','壁增厚强化、周围渗出明显','壁强化缺损、腔外气体、脓肿'];for(let i=0;i<3;i++){drawCT(c,50+i*635,155,600,610,{stage:i+1,around:true,complication:i===2});text(c,names[i],50+i*635,825,i===2?29:33);}}};
