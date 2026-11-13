import {text} from './ct_schematic.js';
const ink='#5C5364';
function line(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=ink;c.lineWidth=2.6;c.lineJoin='round';c.stroke();}
export function doctor(c,x,y,scale=1){c.save();c.translate(x,y);c.scale(scale,scale);
 const wash=c.createRadialGradient(-25,15,8,0,40,180);wash.addColorStop(0,'#FAF6EF');wash.addColorStop(.7,'#E8E4E4');wash.addColorStop(1,'#D4CAD2');
 c.beginPath();c.moveTo(-48,-3);c.bezierCurveTo(-115,5,-133,61,-142,242);c.quadraticCurveTo(0,263,142,242);c.bezierCurveTo(130,72,122,12,48,-3);c.closePath();c.fillStyle=wash;c.fill();c.strokeStyle=ink;c.lineWidth=2.6;c.stroke();
 c.fillStyle='#DDC1B1';c.beginPath();c.ellipse(0,-73,58,75,-.04,0,Math.PI*2);c.fill();c.stroke();
 c.fillStyle='#675B60';c.beginPath();c.moveTo(-57,-88);c.bezierCurveTo(-69,-170,67,-168,59,-80);c.quadraticCurveTo(20,-124,-57,-88);c.fill();
 line(c,[[-24,-70],[-16,-71]]);line(c,[[20,-70],[28,-69]]);line(c,[[-10,-36],[13,-35]]);
 line(c,[[-44,0],[-70,49],[-22,77],[0,37],[28,77],[70,49],[46,0]]);line(c,[[0,38],[0,249]]);
 line(c,[[-65,36],[-65,117],[-36,144],[-12,119],[-12,84]]);c.beginPath();c.arc(-12,82,9,0,Math.PI*2);c.stroke();
 c.fillStyle='#E7E0D7';c.save();c.translate(91,112);c.rotate(-.15);c.fillRect(-52,-58,104,139);c.strokeRect(-52,-58,104,139);line(c,[[-32,-32],[32,-32]]);line(c,[[-32,-5],[22,-5]]);line(c,[[-32,22],[30,22]]);c.restore();
 c.save();c.globalAlpha=.08;c.strokeStyle='#9C819A';c.lineWidth=4;for(let i=0;i<17;i++){const xx=-117+i*14;c.beginPath();c.moveTo(xx,145+(i%3)*13);c.lineTo(xx+7,220-(i%4)*11);c.stroke();}c.restore();
 c.restore();}

export function choice(c,alpha=1){
 if(alpha<=0)return;c.save();c.globalAlpha=alpha;
 // arrows from the clinician's assessment
 c.strokeStyle='#A38AB5';c.lineWidth=1.7;c.lineCap='round';
 c.beginPath();c.moveTo(1210,520);c.quadraticCurveTo(1325,455,1430,402);c.stroke();
 c.beginPath();c.moveTo(1210,520);c.quadraticCurveTo(1330,610,1440,642);c.stroke();
 text(c,'超声',1488,292,42,'#6B4C9A',700);
 c.strokeStyle='#827985';c.lineWidth=3;
 c.beginPath();c.roundRect(1445,315,220,152,14);c.stroke();
 // simplified ultrasound fan, no numbers
 c.strokeStyle='rgba(130,121,133,.55)';c.lineWidth=1.6;
 for(let i=0;i<3;i++){c.beginPath();c.arc(1555,470,26+i*20,-2.35,-.8);c.stroke();}
 text(c,'CT',1548,788,46,'#6B4C9A',700);
 c.strokeStyle='#827985';c.lineWidth=3;
 c.beginPath();c.arc(1580,645,86,0,Math.PI*2);c.stroke();
 c.beginPath();c.arc(1580,645,58,0,Math.PI*2);c.stroke();
 c.strokeStyle='rgba(130,121,133,.45)';c.lineWidth=1.2;
 c.beginPath();c.arc(1580,645,40,0,Math.PI*2);c.stroke();
 c.restore();
}

export function slide(c,x,y,w=220,h=300){
 c.save();c.translate(x,y);c.rotate(-.10);
 c.fillStyle='#F3E7EC';c.fillRect(-w/2,-h/2,w,h);
 c.strokeStyle='#AE8CA9';c.lineWidth=2;c.strokeRect(-w/2,-h/2,w,h);
 c.fillStyle='rgba(216,165,188,.85)';c.beginPath();c.ellipse(0,4,w*.33,h*.29,.18,0,Math.PI*2);c.fill();
 c.strokeStyle='rgba(150,105,160,.55)';c.lineWidth=1.2;c.stroke();
 for(let i=0;i<38;i++){c.fillStyle='rgba(149,116,164,.65)';c.beginPath();c.ellipse(Math.sin(i*4.1)*w*.27,4+Math.cos(i*2.3)*h*.24,2.6,1.8,0,0,Math.PI*2);c.fill();}
 c.restore();
}

export function evidenceBase(c){
 doctor(c,760,455,1.12);
 slide(c,1660,500,206,268);
 const y=868;
 text(c,'临床',722,y+40,38,'#6B4C9A',700);
 text(c,'影像',1238,y+40,38,'#6B4C9A',700);
 text(c,'病理',1622,y+40,38,'#6B4C9A',700);
 c.strokeStyle='#A38AB5';c.lineWidth=1.6;
 c.beginPath();c.moveTo(740,y);c.lineTo(1660,y);c.stroke();
 // stems start below each symbol so the line does not cut the coat, the CT window, or the slide
 for(const [x,top] of [[760,768],[1276,718],[1660,648]]){
   c.beginPath();c.moveTo(x,top);c.lineTo(x,y);c.stroke();
 }
 for(const x of [760,1276,1660]){c.fillStyle='#A38AB5';c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill();}
}
