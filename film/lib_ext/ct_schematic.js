// Original deterministic teaching drawings. Fixed radiological axial orientation:
// patient right is image left; appendix remains at (-.52,.25) in every preset.
const ink='#2A2A35',purple='#A38AB5';
export function text(c,s,x,y,size=36,color=ink,weight=500){c.fillStyle=color;c.font=`${weight} ${size}px MixSans`;c.fillText(s,x,y);}
function ellipse(c,x,y,rx,ry,color,seed=1){c.beginPath();for(let i=0;i<=100;i++){const a=i/100*Math.PI*2,r=1+.015*Math.sin(a*7+seed)+.012*Math.sin(a*13+seed);const xx=x+Math.cos(a)*rx*r,yy=y+Math.sin(a)*ry*r;i?c.lineTo(xx,yy):c.moveTo(xx,yy);}c.closePath();c.fillStyle=color;c.fill();}
function rand(seed){let a=seed;return ()=>{a=(a*1664525+1013904223)>>>0;return a/4294967296;};}
function grain(c,x,y,rx,ry,seed,count=1600,color='255,255,255'){let r=rand(seed);c.save();c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.clip();for(let i=0;i<count;i++){c.globalAlpha=.02+r()*.065;c.fillStyle=`rgb(${color})`;c.beginPath();c.ellipse(x+(r()*2-1)*rx,y+(r()*2-1)*ry,2+r()*12,1+r()*7,r()*6,0,Math.PI*2);c.fill();}c.restore();}
export function leader(c,s,x,y,px,py){text(c,s,x,y,28,purple);c.strokeStyle=purple;c.lineWidth=1.5;c.beginPath();c.moveTo(x,y+10);c.lineTo(x+55,y+10);c.lineTo(px,py);c.stroke();}
export function focus(c,x,y,r){c.strokeStyle=purple;c.lineWidth=2;c.setLineDash([7,6]);c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();c.setLineDash([]);}
export function drawCT(c,x,y,w,h,{stage=0,around=false,complication=false,highlight=true}={}){
 c.save();c.translate(x,y);c.fillStyle='#26272B';c.beginPath();c.roundRect(0,0,w,h,24);c.fill();text(c,'CT表现示意',22,42,28,'#E6DEDA');
 c.save();c.translate(w*.5,h*.5+20);const sx=w/620,sy=h/600;c.scale(sx,sy);
 ellipse(c,0,0,278,231,'#A29F9B');ellipse(c,0,0,262,215,'#514F4E');ellipse(c,0,-3,240,194,'#67645F');grain(c,0,0,274,230,12,2200);
 // abdominal wall, posterior muscles and vertebral body
 for(const side of [-1,1]){ellipse(c,side*86,132,37,56,'#91908C');ellipse(c,side*207,87,33,66,'#7D7C79');}ellipse(c,0,148,37,31,'#D3D0C8');ellipse(c,0,148,21,16,'#9E9B95');ellipse(c,0,191,11,30,'#C4C1B8');
 const loops=[[-149,-65,48,36],[120,-80,43,31],[56,-15,37,29],[-40,-99,32,25],[141,20,45,35],[-36,47,38,29],[50,93,38,30],[-167,11,45,35]];
 for(const [a,b,rx,ry] of loops){ellipse(c,a,b,rx,ry,'#AAA6A0',a);ellipse(c,a,b,rx-8,ry-8,'#403F3E',a);ellipse(c,a-9,b-6,rx*.33,ry*.27,'#1F2123',a);}
 const ax=-145,ay=72;
 if(around||stage>1){for(let i=0;i<18;i++){const a=i*2.4,r=45+(i%5)*9;c.strokeStyle=`rgba(190,185,173,${stage===1?.16:.4})`;c.lineWidth=2+i%3;c.beginPath();c.moveTo(ax+Math.cos(a)*26,ay+Math.sin(a)*24);c.quadraticCurveTo(ax+Math.cos(a+.2)*r,ay+Math.sin(a+.2)*r,ax+Math.cos(a)*r*1.3,ay+Math.sin(a)*r);c.stroke();}}
 if(stage>=2){ellipse(c,ax+5,ay+24,58,21,'rgba(168,164,154,.45)');}
 const rr=stage===0?15:stage===1?25:30;ellipse(c,ax,ay,rr,rr*.86,stage>=2?'#E0DCD0':'#C8C4B9');ellipse(c,ax,ay,stage===0?10:15,stage===0?8:12,'#363739');
 if(stage===3){c.strokeStyle='#65625D';c.lineWidth=14;c.beginPath();c.ellipse(ax,ay,25,21,0,-.6,.35);c.stroke();}
 if(complication){ellipse(c,ax+70,ay+28,34,29,'#CEC7B6');ellipse(c,ax+70,ay+28,26,21,'#77756F');for(const [a,b,r] of [[-107,54,6],[-91,89,5],[-73,98,4]])ellipse(c,a,b,r,r,'#191B1E');}
 grain(c,ax,ay,rr,rr,42,100);
 if(highlight){if(stage===3&&!complication)focus(c,ax+25,ay-3,16);else focus(c,ax,ay,around?69:40);}
 c.restore();c.restore();return [x+w*.5-145*w/620,y+h*.5+20+72*h/600];
}
export function drawTissue(c,x,y,w,h,{stage=1,around=false,complication=false}={}){
 c.save();c.beginPath();c.roundRect(x,y,w,h,22);c.clip();c.fillStyle='#EDDFDF';c.fillRect(x,y,w,h);
 // A deliberately simplified wall section, no claim to a full diagnostic HE field.
 const bands=[['#EEE4DF',70,70],['#DFA6B8',145,95],['#ECD1DB',245,105],['#CE8EA6',355,105],['#E4B5C5',465,44]];
 for(const [col,base,wide] of bands){c.beginPath();for(let i=0;i<=60;i++){let xx=x+i*w/60,yy=y+base+14*Math.sin(i/10);i?c.lineTo(xx,yy):c.moveTo(xx,yy);}for(let i=60;i>=0;i--)c.lineTo(x+i*w/60,y+base+wide+14*Math.sin(i/10));c.closePath();c.fillStyle=col;c.fill();}
 grain(c,x+w/2,y+h/2,w/2,h/2,81,2400,'134,82,126');
 const r=rand(49);for(let i=0;i<230;i++){const xx=x+22+r()*(w-44),yy=y+140+r()*360;if(stage===3&&xx>x+w*.43&&xx<x+w*.73)continue;c.fillStyle='rgba(106,72,135,.42)';c.beginPath();c.ellipse(xx,yy,3+r()*4,2+r()*2,-.3,0,Math.PI*2);c.fill();}
 if(stage===1){for(let i=0;i<9;i++)ellipse(c,x+35+i*61,y+288+Math.sin(i)*15,24,11,'rgba(250,244,241,.75)');}
 if(stage>=2){const q=rand(91);for(let i=0;i<180;i++){let xx=x+25+q()*(w-50),yy=y+150+q()*345;if(stage===3&&xx>x+w*.43&&xx<x+w*.73)continue;ellipse(c,xx,yy,5,4,'#78558F',i);}}
 if(stage===3){ellipse(c,x+w*.58,y+335,88,181,'rgba(194,152,165,.85)');grain(c,x+w*.58,y+335,85,175,32,300,'117,65,103');for(let i=0;i<32;i++){const a=i*2.4;ellipse(c,x+w*.58+Math.cos(a)*65,y+335+Math.sin(a)*160,2,2,'#8A667B');}}
 if(around||stage>=2){for(let i=0;i<12;i++)ellipse(c,x+30+i*47,y+535+Math.sin(i)*13,23,13,stage===1?'#E9DBDF':'#DABAC8');}
 if(complication){c.fillStyle='#EDE0DD';c.beginPath();c.moveTo(x+w*.53,y+220);c.lineTo(x+w*.62,y+530);c.lineTo(x+w*.56,y+530);c.closePath();c.fill();ellipse(c,x+w*.62,y+552,52,25,'#D6C6BD');}
 c.restore();leader(c,stage===1?'壁水肿':stage===2?'全层炎症':'壁病变',x+32,y+65,x+w*.6,y+300);focus(c,x+w*.58,y+320,around?125:83);
}
export function paper(c){c.setTransform(1,0,0,1,0,0);c.fillStyle='#F4EFE6';c.fillRect(0,0,1920,1080);}
