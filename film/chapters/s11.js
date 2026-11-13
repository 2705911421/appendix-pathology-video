import microscope from './s10.js';
import {prepare as prepareGross,drawAppendix,frameAt,toScreen} from '../lib_ext/gross_swap_canonical.js';
const POSE={x:1110,y:475,sc:3.0,rot:-1.2};
let plate;
export default {
 prepare(){microscope.prepare();prepareGross();plate=document.createElement('canvas');plate.width=1920;plate.height=1080;const c=plate.getContext('2d');c.beginPath();c.arc(1110,475,425,0,Math.PI*2);c.clip();c.fillStyle='#F4EFE6';c.fillRect(685,50,850,850);const q=frameAt(.42).p; c.save();c.translate(1110,475);c.rotate(POSE.rot);c.scale(POSE.sc,POSE.sc);c.translate(-q[0],-q[1]);drawAppendix(c,'yellow',{x:0,y:0,sc:1,rot:0});c.restore();},
 draw(c,t,T){if(t<T.at(46)){microscope.draw(c,t,T);return;}
 c.setTransform(1,0,0,1,0,0);c.fillStyle='#111114';c.fillRect(0,0,1920,1080);c.drawImage(plate,0,0);
 c.strokeStyle='#4C4555';c.lineWidth=1.6;c.beginPath();c.arc(1110,475,431,0,Math.PI*2);c.stroke();
 const p=Math.max(0,Math.min(1,(t-T.at(46))/(T.frac(46,.1)-T.at(46))));c.save();c.globalAlpha=p;c.fillStyle='#E8DDE9';
 ['浆膜面：','纤维素性脓性渗出','（含脓细胞）'].forEach((s,i)=>{c.font=`${i?400:700} 36px MixSans`;c.fillText(s,75,320+i*56);});
 c.strokeStyle='#BFA9CB';c.lineWidth=1.6;c.beginPath();c.moveTo(475,410);c.lineTo(630,410);c.lineTo(1010,475);c.stroke();c.restore();
 }};
