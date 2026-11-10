import {bakeGross,drawGross} from '../lib/gross_appendix.js';
import {label} from '../lib/ann.js';
export const bake=bakeGross;
export function renderMain(c,{T,t}){['red','yellow','black'].forEach((s,i)=>{drawGross(c,480+i*475,480,s);label(c,['红 · 充血轻肿','黄 · 灰黄色脓苔','黑 · 远端局部发黑'][i],480+i*475,780,{size:34,align:'center',col:i===1?'#B39459':undefined});});const a=t<T.endId('04')?1:Math.max(0,1-(t-T.atId('05'))/(T.endId('05')-T.atId('05')));label(c,'一根“香肠”的变质日记：阑尾的红→黄→黑',960,98,{size:52,w:700,align:'center',alpha:a});}
export const renderAnnotations=()=>{};
export const sidebarState=()=>({position:{x:65,y:350,w:280},notes:{'02':'颜色是线索\n并非人人必经'}});
export const exitState=()=>({state:'three-gross-parallel'});
