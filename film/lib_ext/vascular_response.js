// Shared paper-watercolour vessel: axial red-cell flow and marginating neutrophils.
import {bake,get} from '../lib/wash.js';
import {rng} from '../lib/motion.js';
const cells=[],fibers=[];const TAU=Math.PI*2;
export function prepareVascular(){
 cells.length=fibers.length=0;const r=rng(62324);
 for(let i=0;i<155;i++){const cluster=i>110,chain=i>=90&&i<110;cells.push({x:chain?-280+Math.floor((i-90)/5)*170+(i%5)*17:cluster?80+(r()-.5)*175:-365+r()*730,y:chain?-44+Math.floor((i-90)/5)*29:cluster?(r()-.5)*115:(r()+r()-1)*133,a:(r()-.5)*.65,sz:.9+r()*.2,view:r(),sat:r(),seed:r()*8});}
 for(let i=0;i<62;i++)fibers.push({x:-470+r()*920,y:192+r()*200,l:35+r()*110,s:r()>.5?1:-1});
 bake('s06.vascular',(b,P)=>{P.fill(b,P.blob(0,0,340,36,.18,623),'#D98BA8',45,.4,[.3,.4]);P.fill(b,P.blob(0,0,240,36,.18,624),'#C9455A',35,.4,[.3,.4]);},{seed:623,scale:1,hd:true,soft:true,grain:.22,edge:.4,bleed:.6});
}
export function drawNeutrophil(c,x,y,{sx=1,sy=1,rot=0,alpha=1}={}){
 c.save();c.globalAlpha*=alpha;c.translate(x,y);c.rotate(rot);c.scale(sx,sy);
 c.beginPath();for(let j=0;j<=64;j++){const a=j/64*TAU,k=1+.055*Math.sin(a*5);const xx=Math.cos(a)*31*k,yy=Math.sin(a)*28*k;j?c.lineTo(xx,yy):c.moveTo(xx,yy);}c.closePath();
 const g=c.createRadialGradient(-8,-9,2,0,0,34);g.addColorStop(0,'#F3E9EF');g.addColorStop(.8,'#E1D2E3');g.addColorStop(1,'#B9A1BF');c.fillStyle=g;c.fill();c.strokeStyle='rgba(128,94,145,.65)';c.lineWidth=1;c.stroke();
 c.strokeStyle='#94719E';c.lineWidth=2;c.beginPath();c.moveTo(-13,-5);c.bezierCurveTo(-7,16,9,15,15,-4);c.stroke();
 for(const [xx,yy,a] of [[-13,-5,-.4],[0,10,.3],[15,-4,.6]]){c.fillStyle='#92709F';c.beginPath();c.ellipse(xx,yy,7,10,a,0,TAU);c.fill();c.fillStyle='rgba(111,78,133,.35)';c.beginPath();c.ellipse(xx+2,yy,3,7,a,0,TAU);c.fill();}
 for(let i=0;i<22;i++){c.fillStyle='rgba(157,116,164,.24)';c.beginPath();c.arc(Math.sin(i*4.7)*24,Math.cos(i*2.3)*21,.8,0,TAU);c.fill();}c.restore();
}
export function drawVascular(c,p,{wbc=true,interstitium=true}={}){
 const left=-430,right=430,h=43+130*p,wall=15-5*p;
 const y=(x,s)=>s*h+7*Math.sin(x/150);
 function path(extra=0){c.beginPath();c.moveTo(left,y(left,-1)-extra);c.bezierCurveTo(-130,-h-12-extra,170,-h+12-extra,right,y(right,-1)-extra);c.lineTo(right,y(right,1)+extra);c.bezierCurveTo(170,h+12+extra,-130,h-12+extra,left,y(left,1)+extra);c.closePath();}
 c.save();
 if(interstitium){for(let i=0;i<fibers.length;i++){const f=fibers[i],yy=f.s*(f.y+p*(f.y-185)*.15);c.strokeStyle=`rgba(194,145,164,${.29-.10*p})`;c.lineWidth=1.3+i%3*.6;c.beginPath();c.moveTo(f.x,yy);c.bezierCurveTo(f.x+f.l*.3,yy-13,f.x+f.l*.7,yy+12,f.x+f.l,yy-2);c.stroke();if(i%12===0){c.fillStyle='#AD95B0';c.beginPath();c.ellipse(f.x+20,yy+12,11,2.6,-.25*f.s,0,TAU);c.fill();}}}
 path(wall+5);c.fillStyle='#E5CED9';c.fill();c.strokeStyle='rgba(171,134,161,.45)';c.lineWidth=2;c.stroke();path(wall);c.fillStyle='#DDB8CA';c.fill();path();c.fillStyle=`rgb(247,${229-12*p},${223-9*p})`;c.fill();c.save();c.clip();c.globalAlpha=.2;c.drawImage(get('s06.vascular'),-460,-h-50,920,2*h+100);c.globalAlpha=1;
 for(let i=0;i<8;i++){c.strokeStyle='rgba(205,149,145,.13)';c.lineWidth=2;c.beginPath();c.moveTo(-430,-h+15+i*h*.25);c.bezierCurveTo(-120,-h+5+i*h*.25,130,-h+25+i*h*.25,430,-h+15+i*h*.25);c.stroke();}
 for(let i=0;i<cells.length;i++){
 const d=cells[i],base=i<9,a=base?1:Math.max(0,Math.min(1,(p-.04-(i%13)/13*.28)*2.8));if(!a)continue;
 const x=base?(-335+i*83)*(1-p)+d.x*p:d.x,yy=base?(d.y/50)*(1-p)+d.y*p:d.y;
 c.save();c.globalAlpha=a*(.80+d.sat*.17);c.translate(x,yy);c.rotate(d.a);let rx=24*d.sz,ry=rx*(d.view<.22?.29:d.view<.55?.65:.91);const side=d.view<.22;
 c.beginPath();for(let j=0;j<=64;j++){const th=j/64*TAU,k=1+.045*Math.sin(th*3+d.seed)+.025*p*Math.cos(th*5+d.seed);const xx=Math.cos(th)*rx*k,yyy=Math.sin(th)*ry*k*(side?(1-.4*Math.cos(th)**2):1);j?c.lineTo(xx,yyy):c.moveTo(xx,yyy);}c.closePath();
 const off=d.view<.55?rx*.2:rx*.04,g=c.createRadialGradient(off,-1,1,0,0,rx);g.addColorStop(0,side?'#C77B81':'#DEB0AA');g.addColorStop(.33,'#CD9194');g.addColorStop(.76,d.sat>.5?'#BB5D69':'#C57378');g.addColorStop(1,'#A64D60');c.fillStyle=g;c.fill();c.strokeStyle=`rgba(131,48,68,${.25+d.sat*.25})`;c.lineWidth=.5+d.sat*.6;c.stroke();c.save();c.clip();c.globalAlpha*=.25;c.drawImage(get('s06.vascular'),-rx,-ry,rx*2,ry*2);c.restore();c.restore();
 }
 for(let i=0;i<13;i++){c.fillStyle='rgba(139,101,155,.65)';c.beginPath();c.ellipse(-355+i*59,Math.sin(i*9)*h*.78,2.6+i%2,1.9,i,0,TAU);c.fill();}
 c.restore();
 for(const s of [-1,1])for(let i=0;i<10;i++){const x=-408+i*91,yy=y(x,s);c.strokeStyle='rgba(150,113,153,.48)';c.lineWidth=1;c.beginPath();c.moveTo(x-43,yy+s*2);c.quadraticCurveTo(x,yy+s*(wall+4),x+43,yy+s*2);c.stroke();c.fillStyle='#927299';c.beginPath();c.ellipse(x,yy+s*wall*.5,16,3.2,.05*Math.sin(i),0,TAU);c.fill();}
 if(wbc&&p>.4){const a=Math.min(1,(p-.4)/.45);for(const [x,s] of [[-260,1],[205,-1],[310,1]])drawNeutrophil(c,x,y(x,s)-s*30,{alpha:a,rot:s*.2});}
 c.restore();
}
