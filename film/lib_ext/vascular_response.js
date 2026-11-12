// Paper inset: a single intramural vessel; no leukocytes or extravasation.
import {bake,get} from '../lib/wash.js';
import {rng} from '../lib/motion.js';
const cells=[];
export function prepareVascular(){
 cells.length=0;const r=rng(62324);
 for(let i=0;i<104;i++)cells.push({x:r(),y:r(),a:(r()-.5)*1.6,rx:23+r()*6,ry:16+r()*5});
 bake('s06.vascular',(b,P)=>{P.fill(b,P.blob(0,0,340,36,.18,623),'#D98BA8',45,.4,[.3,.4]);P.fill(b,P.blob(0,0,240,36,.18,624),'#C9455A',35,.4,[.3,.4]);},{seed:623,scale:1,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});
}
export function drawVascular(c,p){
 const left=-405,right=405,h=43+130*p,wall=14-6*p;
 const y=(x,s)=>s*h+7*Math.sin(x/150);
 function path(extra=0){c.beginPath();c.moveTo(left,y(left,-1)-extra);c.bezierCurveTo(-130,-h-12-extra,170,-h+12-extra,right,y(right,-1)-extra);c.lineTo(right,y(right,1)+extra);c.bezierCurveTo(170,h+12+extra,-130,h-12+extra,left,y(left,1)+extra);c.closePath();}
 c.save();path(wall);c.fillStyle='#EBC3D0';c.fill();c.strokeStyle='#A883A2';c.lineWidth=1.6;c.stroke();path();c.fillStyle=`rgb(246,${225-12*p},${220-10*p})`;c.fill();c.save();c.clip();c.globalAlpha=.27+.13*p;c.drawImage(get('s06.vascular'),-460,-h-65,920,2*h+130);c.globalAlpha=1;
 for(let i=0;i<cells.length;i++){
  const d=cells[i],base=i<9,a=base?1:Math.max(0,Math.min(1,(p-.04-d.x*.28)*2.8));if(!a)continue;
  const x=base?(-335+i*83)*(1-p)+(-335+d.x*670)*p:-355+d.x*710;
  const yy=base?(d.y-.5)*7*(1-p)+(d.y*2-1)*(h-26)*p:(d.y*2-1)*(h-26);
  c.save();c.globalAlpha=a*.9;c.translate(x,yy);c.rotate(d.a*(.2+.8*p));
  c.beginPath();for(let j=0;j<=48;j++){const th=j/48*Math.PI*2,k=1+.035*Math.sin(th*5+i);const xx=Math.cos(th)*d.rx*k,yyy=Math.sin(th)*d.ry*k;j?c.lineTo(xx,yyy):c.moveTo(xx,yyy);}c.closePath();
  const g=c.createRadialGradient(-3,-2,2,0,0,d.rx);g.addColorStop(0,'#D9B8B4');g.addColorStop(.42,'#C9A8AE');g.addColorStop(.7,'#B66670');g.addColorStop(1,'#A8404E');c.fillStyle=g;c.fill();c.strokeStyle='rgba(126,42,56,.52)';c.lineWidth=.8;c.stroke();
  c.save();c.clip();c.globalAlpha*=.24;c.drawImage(get('s06.vascular'),-d.rx,-d.ry,d.rx*2,d.ry*2);c.restore();
  c.fillStyle='rgba(232,203,197,.6)';c.beginPath();c.ellipse(-2,-1,d.rx*.46,d.ry*.38,0,0,Math.PI*2);c.fill();c.restore();
 }
 c.restore();
 for(const s of [-1,1])for(let i=0;i<8;i++){const x=-365+i*104;c.fillStyle='#947995';c.beginPath();c.ellipse(x,y(x,s)+s*wall*.5,14,3.5-.7*p,.04*Math.sin(i),0,Math.PI*2);c.fill();}
 c.restore();
}
