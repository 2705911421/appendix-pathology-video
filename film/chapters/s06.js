import {prepare,drawAppendix,frameAt,toScreen} from '../lib_ext/gross_appendix.js';
import {prepareVascular,drawVascular} from '../lib_ext/vascular_response.js';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const pose={x:1210,y:390,sc:1.23,rot:-.12};
function label(c,text,x,y,px,py,a=1){c.save();c.globalAlpha=a;c.font='500 29px MixSans';c.fillStyle='#A38AB5';c.fillText(text,x,y);c.strokeStyle='#AC98B7';c.lineWidth=1.6;c.beginPath();c.moveTo(x+8,y+12);c.lineTo(x+45,y+12);c.lineTo(px,py);c.stroke();c.restore();}
export default {prepare(){prepare();prepareVascular();},draw(c,t,T){
 c.setTransform(1,0,0,1,0,0);c.fillStyle='#F4EFE6';c.fillRect(0,0,1920,1080);
 c.fillStyle='#D6453A';c.font='700 56px MixSans';c.fillText('第一幕红',85,258);c.fillStyle='#2A2A35';c.font='800 47px MixSans';c.fillText('单纯性阑尾炎',85,337);c.font='500 31px MixSans';c.fillText('充血、轻度肿胀',85,409);
 const red=smooth((t-T.frac(23,.12))/(T.frac(23,.72)-T.frac(23,.12)));
 const zoom=smooth((t-T.at(24))/(T.frac(24,.24)-T.at(24)));
 const dilation=smooth((t-T.frac(24,.32))/(T.frac(24,.8)-T.frac(24,.32)));
 // Same surface site persists across the gross-to-wall transition.
 const f=frameAt(.56),anchor=toScreen(pose,[f.p[0]-f.nx*26,f.p[1]-f.ny*26]);
 c.save();if(zoom>0){c.translate(0,-155*zoom);}drawAppendix(c,red,pose);c.restore();
 if(t<T.at(24))label(c,'充血',1420,230,...anchor,smooth((t-T.frac(23,.65))/(T.frac(23,.12))));
 if(zoom>0){const ax=anchor[0],ay=anchor[1]-155*zoom;c.strokeStyle='#AC98B7';c.lineWidth=1.6;c.beginPath();c.arc(ax,ay,28,0,Math.PI*2);c.stroke();c.save();c.globalAlpha=zoom;c.beginPath();c.moveTo(ax-20,ay+20);c.lineTo(825,347);c.moveTo(ax+20,ay+20);c.lineTo(1655,347);c.stroke();c.fillStyle='#F4EFE6';c.fillRect(784,338,917,335);drawVascular(c,dilation);label(c,'血管扩张',1430,734,1470,502+64+68*dilation);c.restore();}
}};
