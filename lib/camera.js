import {LAYOUT} from './tokens.js';
const V=LAYOUT.main;
export function apply(ctx,{x=V.x+V.w/2,y=V.y+V.h/2,scale=1}={}) {ctx.translate(V.x+V.w/2,V.y+V.h/2);ctx.scale(scale,scale);ctx.translate(-x,-y);}
export function toScreen(p,c={}){const x=c.x??V.x+V.w/2,y=c.y??V.y+V.h/2,k=c.scale??1;return [V.x+V.w/2+(p[0]-x)*k,V.y+V.h/2+(p[1]-y)*k];}
export function toWorld(p,c={}){const x=c.x??V.x+V.w/2,y=c.y??V.y+V.h/2,k=c.scale??1;return [x+(p[0]-V.x-V.w/2)/k,y+(p[1]-V.y-V.h/2)/k];}
