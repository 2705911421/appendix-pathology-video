import {pigment,stain} from './watercolor.js';
import {rng} from './motion.js';
import {ink} from './ink.js';
import {box} from './layout.js';
const outline='M -73 -225 C -76 -145,-32 -95,-55 -14 C -78 60,-71 144,-17 205 C 9 234,58 217,64 188 C 70 155,27 116,31 54 C 35 -20,79 -78,51 -154 L 35 -225 C 2 -242,-38 -242,-73 -225 Z';
const P=new Path2D(outline);
export async function bakeGross(){for(const [s,c,i] of [['red','#D6918D',111],['yellow','#DAB4A0',112],['black','#BF8989',113]])pigment('v5.gross.'+s,c,i);}
export function drawGross(ctx,cx,cy,state){box('gross:'+state,cx-115,cy-250,240,505);ctx.save();ctx.translate(cx,cy);
 ctx.scale(state==='red'?1:1.34,1);
 ctx.save();ctx.clip(P);ctx.fillStyle={red:'#D98F91',yellow:'#D98BA8',black:'#A8404E'}[state];ctx.fillRect(-140,-255,300,520);stain(ctx,'v5.gross.'+state,0,0,560,.8);
 const R=rng(881);
 const pool=(x,y,rx,ry,color)=>{ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);const g=ctx.createRadialGradient(0,0,.05,0,0,1);g.addColorStop(0,color);g.addColorStop(.65,color.replace(/,[.0-9]+\)$/,',.05)'));g.addColorStop(1,'rgba(100,50,60,0)');ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();};
 for(let i=0;i<160;i++){let x=(R()-.5)*170,y=-218+R()*430;pool(x,y,14+R()*29,12+R()*32,i%2?'rgba(150,55,65,.08)':'rgba(248,215,208,.13)');}
 if(state==='yellow'){
  for(let i=0;i<210;i++){const x=(R()-.5)*140,y=-180+R()*390,rx=4+R()*19,ry=3+R()*15;pool(x,y,rx,ry,'rgba(180,166,125,.34)');ctx.beginPath();for(let k=0;k<11;k++){const a=k/10*6.283,r=.65+R()*.35,px=x+Math.cos(a)*rx*r,py=y+Math.sin(a)*ry*r;k?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fillStyle=i%2?'rgba(205,185,138,.32)':'rgba(226,213,174,.29)';ctx.fill();}
 }
 if(state==='black'){
  pool(10,142,87,108,'rgba(61,35,49,.94)');pool(14,153,64,79,'rgba(64,36,53,.95)');pool(-9,103,49,59,'rgba(115,40,57,.70)');
  for(let i=0;i<290;i++){const x=8+(R()-.5)*120,y=65+R()*142,r=.4+R()*2.7;ctx.beginPath();ctx.ellipse(x,y,r,r*.65,R()*3,0,6.283);ctx.fillStyle=i%2?'rgba(93,37,55,.24)':'rgba(48,33,43,.21)';ctx.fill();}
 }
 ctx.strokeStyle='rgba(157,58,66,.65)';ctx.lineWidth=1.8;ctx.lineCap='round';for(let i=0;i<9;i++){let x=-45+i*11,y=-185+i*34;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+18,y+22,x-20,y+47,x-12,y+67);ctx.stroke();ctx.lineWidth=.85;ctx.beginPath();ctx.moveTo(x+1,y+30);ctx.quadraticCurveTo(x+30,y+24,x+34,y+8);ctx.stroke();ctx.lineWidth=1.8;}ctx.restore();
 ink(ctx,'v5.gross.outline.'+state,'path',[outline],{stroke:'#74555A',strokeWidth:2.6,roughness:.9,bowing:.8,seed:8,boil:false},{fill:false});
 ctx.beginPath();ctx.ellipse(-18,-226,53,11,.02,0,6.283);ctx.fillStyle='#C68A89';ctx.fill();ctx.strokeStyle='#8D5D68';ctx.lineWidth=1.4;ctx.stroke();ctx.restore();}
