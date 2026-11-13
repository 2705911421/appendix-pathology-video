import {paper,text,ramp} from './ct_r3_schematic.js';
import {loadCT,realCT,mark} from './ct_real_adv01_images.js';
const PUR='#6B4C9A';
function sidebar(c,stage,alpha,second){
  const t=(s,y,size,color,weight=500,a=1)=>text(c,s,70,y,size,color,weight,alpha*a);
  if(stage===1){
    t('CT与组织变化对应',200,42,PUR,700);
    t('管径增粗',300,36,'#2A2A35');
    t('壁增厚',372,36,'#2A2A35');
    t('周围脂肪轻度模糊',448,36,'#2A2A35',500,second);
  }else if(stage===2){
    t('壁增厚强化',210,44,PUR,700);
    t('周围渗出明显',294,39,'#2A2A35',500,second);
  }else{
    t('壁强化缺损：',190,42,PUR,700);
    t('警惕坏死',260,38,'#2A2A35');
    t('腔外气体、脓肿：',380,38,PUR,700,second);
    t('警惕穿孔 [3]',450,38,'#2A2A35',500,second);
  }
}


export function compareScene(first,last,stage){
 let images;
 return {async prepare(){images=await Promise.all((stage===1?[1,2]:stage===2?[3,4]:[5]).map(loadCT));},
 draw(c,t,T){paper(c);
 const next=ramp(t,T.at(last),.7),intro=ramp(t,T.at(first),.7);
 const ex=stage===2?ramp(t,T.frac(first,.42),.7):next;
 sidebar(c,stage,intro,stage===2?ex:next);
 const index=stage===1?(t>=T.at(last)?2:1):stage===2?(t>=T.at(last)?4:3):5;
 c.save();c.globalAlpha=intro;
 const im=images[stage===3?0:index===(stage===1?1:3)?0:1];
 const zoom=ramp(t,T.at(first),T.frac(first,.6)-T.at(first));
 const box={x:610,y:92,w:1260,h:770},rid=stage===1?'30389':stage===2?'197370':'242634';
 if(stage!==3&&t>=T.at(last)&&next<1){c.globalAlpha=intro*(1-next);realCT(c,images[0],stage===1?1:3,box,rid,zoom);}
 c.globalAlpha=intro*(stage!==3&&t>=T.at(last)?next:1);
 const g=realCT(c,im,index,box,rid,zoom);c.globalAlpha=intro;
 // Coordinates refer directly to the approved source pixels, before crop and scale.
 if(stage===1){if(index===1)mark(c,g,[153,423],26,'管径增粗、壁增厚',intro);else mark(c,g,[137,252],29,'周围脂肪轻度模糊',next);}
 if(stage===2){if(index===3){if(ex<.5)mark(c,g,[148,223],24,'壁增厚强化',1-ex);else mark(c,g,[162,218],48,'周围渗出明显',ex);}else mark(c,g,[193,293],49,'周围渗出明显',next);}
 if(stage===3){if(t<T.at(last))mark(c,g,[112,236],16,'壁强化缺损',intro);else mark(c,g,[111,229],31,'腔外气体、脓肿',next);}
 c.restore();}};
}
