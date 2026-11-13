import {prepare,drawAppendix,frameAt,toScreen} from './gross_swap_before_appendix.js';
import {prepareVascular,drawVascular} from './vascular_response.js';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const mix=(a,b,p)=>a+(b-a)*p;
function label(c,text,x,y,px,py,a=1){c.save();c.globalAlpha=a;c.font='500 40px MixSans';c.fillStyle='#9276A6';c.fillText(text,x,y);c.strokeStyle='#AC98B7';c.lineWidth=1.6;c.beginPath();c.moveTo(x+8,y+12);c.lineTo(x+65,y+12);c.lineTo(px,py);c.stroke();c.restore();}
export default {prepare(){prepare();prepareVascular();},draw(c,t,T){
 c.setTransform(1,0,0,1,0,0);c.fillStyle='#F4EFE6';c.fillRect(0,0,1920,1080);
 c.fillStyle='#D6453A';c.font='700 56px MixSans';c.fillText('第一幕红',85,258);c.fillStyle='#2A2A35';c.font='800 47px MixSans';c.fillText('单纯性阑尾炎',85,337);c.font='400 36px MixSans';c.fillText('充血、轻度肿胀',85,409);
 const red=smooth((t-T.frac(23,.12))/(T.frac(23,.72)-T.frac(23,.12)));
 const zoom=smooth((t-T.at(24))/(T.frac(24,.24)-T.at(24)));
 const dilation=smooth((t-T.frac(24,.34))/(T.frac(24,.82)-T.frac(24,.34)));
 const pose={x:mix(1220,815,zoom),y:mix(395,480,zoom),sc:mix(1.72,.83,zoom),rot:mix(-.65,-1.12,zoom)};
 drawAppendix(c,red,pose);
 const f=frameAt(.56),anchor=toScreen(pose,[f.p[0]-f.nx*26,f.p[1]-f.ny*26]);
 if(t<T.at(24))label(c,'充血',1280,125,...anchor,smooth((t-T.frac(23,.65))/(T.frac(23,.12))));
 if(zoom>0){const [ax,ay]=anchor,rr=30;const cx=mix(ax,1410,zoom),cy=mix(ay,490,zoom),r=mix(rr,390,zoom);
 c.strokeStyle='#AC98B7';c.lineWidth=1.6;c.beginPath();c.arc(ax,ay,rr,0,Math.PI*2);c.stroke();
 c.save();c.globalAlpha=zoom;c.beginPath();c.moveTo(ax+12,ay-27);c.lineTo(cx-r*.68,cy-r*.73);c.moveTo(ax+12,ay+27);c.lineTo(cx-r*.68,cy+r*.73);c.stroke();
 c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fillStyle='#F4EFE6';c.fill();c.save();c.clip();c.translate(cx,cy);c.scale(r/390,r/390);drawVascular(c,dilation);c.restore();c.strokeStyle='#C6B6C9';c.lineWidth=1.6;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.stroke();
 if(dilation>.65)label(c,'白细胞贴壁',1185,205,1150,490+173-30, smooth((dilation-.65)/.35));
 if(zoom>.95)label(c,'血管扩张',1430,815,1590,490+43+130*dilation,smooth((zoom-.95)/.05));c.restore();}
}};
