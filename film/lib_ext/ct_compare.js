import {paper,text,drawCT,drawTissue,leader} from './ct_schematic.js';
export function compareScene(first,last,stage){const cache=new Map();return {prepare(){},draw(c,t,T){const key=[t>=T.at(last),t>=T.frac(first,.45),t>=T.frac(last,.5)].join();if(cache.has(key)){c.setTransform(1,0,0,1,0,0);c.drawImage(cache.get(key),0,0);return;}paper(c);const p=Math.max(0,Math.min(1,(t-T.at(first))/(T.end(first)-T.at(first))));const around=t>=T.at(last),complication=stage===3&&around;
 const lines=stage===1?['CT与组织','变化对应','管径增粗','壁增厚',...(around?['周围脂肪','轻度模糊']:[])]:stage===2?['壁增厚强化','周围渗出明显']:['壁强化缺损：','警惕坏死',...(around?['腔外气体、脓肿：','警惕穿孔']:[])];
 lines.forEach((s,i)=>text(c,s,70,200+i*69,i<2?43:36,i===0?'#6B4C9A':'#2A2A35',i<2?700:500));
 const a=drawCT(c,570,120,620,620,{stage,around:stage===2?p>.45:around,complication});drawTissue(c,1230,120,620,620,{stage,around:stage===2?p>.45:around,complication});
 let label=stage===1?(around?'周围脂肪轻度模糊':'壁增厚'):stage===2?(p>.45?'周围渗出明显':'壁增厚强化'):(around?(t<T.frac(last,.5)?'腔外气体':'脓肿'):'壁强化缺损');let px=a[0],py=a[1];if(label.includes('脂肪')||label.includes('渗出')){px+=45;py+=30;}if(label==='脓肿'){px+=70;py+=28;}if(label==='腔外气体'){px+=38;py-=18;}leader(c,label,710,775,px,py);const frame=document.createElement('canvas');frame.width=1920;frame.height=1080;frame.getContext('2d').drawImage(c.canvas,0,0);cache.set(key,frame);
}};}
