// Placeholder. Replace with Grok Bot's production module after narration timing arrives.
import {FONT,SAFE,TYPE,C} from './tokens.js';
export function drawSubtitles(ctx,row,fraction){
 const zh=row.zh.replace(/\[\d+\]/g,''),en=row.englishCards[Math.min(row.englishCards.length-1,Math.floor(fraction*row.englishCards.length))];
 ctx.save();ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.lineJoin='round';
 for(const [text,size,y] of [[zh,TYPE.zh,SAFE.zhBaseline],[en,TYPE.en,SAFE.enBaseline]]){
 ctx.font=`500 ${size}px ${FONT}`;const m=ctx.measureText(text);if(m.width>1820||y-m.actualBoundingBoxAscent-3<810||y+m.actualBoundingBoxDescent+3>1080)throw Error(`Subtitle overflow: ${text}`);
 ctx.strokeStyle=C.paper;ctx.lineWidth=6;ctx.strokeText(text,960,y);ctx.fillStyle=C.ink;ctx.fillText(text,960,y);
 }ctx.restore();
}
