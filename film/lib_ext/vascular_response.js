// Paper teaching diagram. No leukocytes, extravasation, arrows or quantitative encoding.
import {bake,get} from '../lib/wash.js';
import {rng} from '../lib/motion.js';
const cells=[];
export function prepareVascular(){
 const r=rng(62324);for(let i=0;i<88;i++)cells.push({x:r(),y:r(),a:r()*Math.PI,rx:17+r()*4,ry:11+r()*3});
 bake('s06.vascular',(b,P)=>{P.fill(b,P.blob(0,0,340,36,.18,623),'#D98BA8',45,.4,[.3,.4]);P.fill(b,P.blob(0,0,240,36,.18,624),'#C9455A',35,.4,[.3,.4]);},{seed:623,scale:1,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});
}
export function drawVascular(c,p){
 const left=820,right=1660,cy=502,h=64+68*p;
 const y=(x,side)=>cy+side*h+Math.sin((x-left)/170)*7;
 function path(inset=0){c.beginPath();c.moveTo(left,y(left,-1)+inset);c.bezierCurveTo(1060,cy-h-15+inset,1390,cy-h+12+inset,right,y(right,-1)+inset);c.lineTo(right,y(right,1)-inset);c.bezierCurveTo(1390,cy+h+12-inset,1060,cy+h-15-inset,left,y(left,1)-inset);c.closePath();}
 c.save();path(-13);c.fillStyle='#EBC3D0';c.fill();c.strokeStyle='#A883A2';c.lineWidth=1.5;c.stroke();path();c.fillStyle='#F6DEDC';c.fill();c.save();c.clip();c.globalAlpha=.34;c.drawImage(get('s06.vascular'),left-40,cy-h-80,920,2*h+160);c.globalAlpha=1;
 for(let i=0;i<cells.length;i++){const d=cells[i],a=i<25?1:Math.max(0,Math.min(1,p*1.5-(i-25)/95));if(!a)continue;const x=left+27+d.x*(right-left-54),yy=cy+(d.y*2-1)*(h-22);c.save();c.globalAlpha=a*.88;c.translate(x,yy);c.rotate(d.a);const g=c.createRadialGradient(-3,-2,2,0,0,d.rx);g.addColorStop(0,'#DAB3AD');g.addColorStop(.4,'#C98B87');g.addColorStop(.72,'#B4555A');g.addColorStop(1,'#A8404E');c.fillStyle=g;c.beginPath();c.ellipse(0,0,d.rx,d.ry,0,0,Math.PI*2);c.fill();c.strokeStyle='rgba(126,42,56,.55)';c.lineWidth=.65;c.stroke();c.fillStyle='rgba(235,198,187,.55)';c.beginPath();c.ellipse(-2,-1,d.rx*.42,d.ry*.38,0,0,Math.PI*2);c.fill();c.restore();}
 c.restore();
 for(const side of [-1,1])for(let i=0;i<9;i++){const x=left+36+i*94;c.fillStyle='#947995';c.beginPath();c.ellipse(x,y(x,side)+side*6,12,3.4,.03*Math.sin(i),0,Math.PI*2);c.fill();}
 c.restore();
}
