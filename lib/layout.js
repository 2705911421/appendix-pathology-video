import {FONT,C} from './tokens.js';
export const bounds=[];
export function resetBounds(){bounds.length=0;}
export function box(name,x,y,w,h){const b={name,x,y,w,h};if(![x,y,w,h].every(Number.isFinite)||w<0||h<0||x<0||x+w>1920||y<0||y+h>=950)throw Error(`Unsafe box ${JSON.stringify(b)}`);bounds.push(b);return b;}
export function font(ctx,size,weight=500){ctx.font=`${weight} ${size}px ${FONT}`;}
export function wrap(ctx,text,width){const out=[];for(const para of text.split('\n')){let line='';for(const ch of para){if(ctx.measureText(line+ch).width>width&&line){out.push(line);line='';}line+=ch;}out.push(line);}return out;}
export function measureBlock(ctx,text,{size=38,weight=500,width=412,lineHeight=size*1.4}={}){font(ctx,size,weight);const lines=wrap(ctx,text,width);return {lines,size,weight,lineHeight,h:lines.length*lineHeight,width};}
export function drawBlock(ctx,block,x,y,color=C.ink){font(ctx,block.size,block.weight);ctx.fillStyle=color;ctx.textAlign='left';ctx.textBaseline='alphabetic';block.lines.forEach((line,i)=>{const baseline=y+block.size+i*block.lineHeight,m=ctx.measureText(line);box('text:'+line,x-m.actualBoundingBoxLeft,baseline-m.actualBoundingBoxAscent,m.actualBoundingBoxLeft+m.actualBoundingBoxRight,m.actualBoundingBoxAscent+m.actualBoundingBoxDescent);ctx.fillText(line,x,baseline);});}
