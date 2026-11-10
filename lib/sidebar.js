import {C,LAYOUT} from './tokens.js';
import {box,measureBlock,drawBlock} from './layout.js';
const types=new Set(['definition','path','research','compare','timing','source']);
export function measureSidebar(ctx,state,evidence={}){
 const L=LAYOUT.sidebar,parts=[];let y=L.y;
 const add=(text,size,weight,gap=20)=>{const block=measureBlock(ctx,text,{size,weight,width:L.w-L.pad*2});parts.push({block,x:L.x+L.pad,y});y+=block.h+gap;};
 if(state.heading)add(state.heading,state.title?52:48,700,28);
 if(state.card){if(!types.has(state.card.type))throw Error('Unknown sidebar card type');if(state.card.type==='research'){const record=evidence[state.card.evidenceKey];if(!record)throw Error('Research card requires evidence');const allowed=record.values.flatMap(v=>v.match(/\d+(?:\.\d+)?/g)||[]);for(const n of state.card.text.match(/\d+(?:\.\d+)?/g)||[])if(!allowed.includes(n))throw Error('Research value not in approved evidence: '+n);}add(state.card.text,38,500,20);}
 if(state.source)add(state.source,32,500,12);
 if(state.navigation)y+=62;
 if(y>L.bottom)throw Error('Sidebar overflow: split into continuation cards');
 return {parts,bottom:y};
}
export function drawSidebar(ctx,state,evidence={}){
 if(!state)return;
 state=paginateSidebar(ctx,state,evidence)[state.pageIndex??0];if(!state)throw Error('Sidebar continuation page out of range');
 const measured=measureSidebar(ctx,state,evidence),L=LAYOUT.sidebar;
 box('sidebar',L.x,L.y,L.w,measured.bottom-L.y);
 ctx.save();ctx.strokeStyle='rgba(42,42,53,.18)';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(520,60);ctx.lineTo(520,760);ctx.stroke();
 measured.parts.forEach(p=>drawBlock(ctx,p.block,p.x,p.y));
 if(state.navigation){const y=measured.bottom-40;[C.red,'#CDB98A','#53404B'].forEach((c,i)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(98+i*142,y,10,0,Math.PI*2);ctx.fill();drawBlock(ctx,measureBlock(ctx,['红','黄','黑'][i],{size:32,width:70}),120+i*142,y-23);});}
 ctx.restore();
}
// Future long cards may be passed as whole semantic paragraphs; keep font size and paginate.
export function paginateSidebar(ctx,state,evidence={}){
 if(!state.card)return [state];
 const empty={...state,card:{...state.card,text:''}},L=LAYOUT.sidebar;
 const fixed=measureSidebar(ctx,empty,evidence).bottom;
 const lineHeight=38*1.4,available=L.bottom-fixed+lineHeight;
 const maxLines=Math.floor(available/lineHeight);
 if(maxLines<1)throw Error('Heading/source leave no room for a readable card');
 const lines=measureBlock(ctx,state.card.text,{size:38,width:L.w-L.pad*2}).lines,pages=[];
 for(let i=0;i<lines.length;i+=maxLines)pages.push({...state,card:{...state.card,text:lines.slice(i,i+maxLines).join('\n')}});
 pages.forEach(p=>measureSidebar(ctx,p,evidence));return pages;
}
