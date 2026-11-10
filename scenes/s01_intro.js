import {bakeGross,drawGross} from '../lib/gross_appendix.js';
import {drawBlock,measureBlock} from '../lib/layout.js';
export const bake=bakeGross;
export function renderMain(ctx){['red','yellow','black'].forEach((s,i)=>{drawGross(ctx,790+i*410,410,s);drawBlock(ctx,measureBlock(ctx,['充血 · 轻肿','灰黄色脓苔','局部暗红发黑'][i],{size:32,width:360}),650+i*410,697);});}
export const renderAnnotations=()=>{};
export const sidebarState=()=>({title:true,heading:'一根“香肠”的\n变质日记：\n阑尾的\n红→黄→黑',card:{type:'path',text:'颜色，是观察线索\n并非人人必经'},navigation:true});
export const exitState=()=>({state:'three-gross-parallel'});
