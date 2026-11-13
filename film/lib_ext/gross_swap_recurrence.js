import {prepare,drawAppendix,tubeOutline} from './gross_swap_canonical.js';
export const prepareAppendix=prepare;
const pts=tubeOutline(1,0),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
const cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
export function drawRecurrenceAppendix(c,x,y,sc,rot,{flash=0,floor=0}={}){
 const stage=Math.max(0,Math.min(1,Math.max(floor,flash)));
 c.save();c.translate(x,y);c.rotate(rot);c.scale(sc,sc);c.translate(-cx,-cy);
 drawAppendix(c,stage,{x:0,y:0,sc:1,rot:0});c.restore();
}
