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
 // Stable dry-brush variation on the coat, no surface animation.
 c.save();c.globalAlpha=.08;c.strokeStyle='#9C819A';c.lineWidth=4;for(let i=0;i<17;i++){const xx=-117+i*14;c.beginPath();c.moveTo(xx,145+(i%3)*13);c.lineTo(xx+7,220-(i%4)*11);c.stroke();}c.restore();
 c.restore();}
export function choice(c){text(c,'超声',1510,315,42,'#6B4C9A',700);text(c,'CT',1530,610,46,'#6B4C9A',700);
 c.strokeStyle='#A38AB5';c.lineWidth=1.6;for(const y of [290,580]){c.beginPath();c.moveTo(1280,440);c.lineTo(1410,y);c.lineTo(1480,y);c.stroke();}
 c.strokeStyle='#827985';c.lineWidth=3;c.beginPath();c.roundRect(1510,340,150,92,13);c.stroke();c.beginPath();c.arc(1585,578,72,0,Math.PI*2);c.stroke();c.beginPath();c.arc(1585,578,46,0,Math.PI*2);c.stroke();}
export function evidence(c){doctor(c,820,420,.7);text(c,'临床',775,690,39,'#6B4C9A',700);text(c,'影像',1200,690,39,'#6B4C9A',700);text(c,'病理',1640,690,39,'#6B4C9A',700);
 c.strokeStyle='#A38AB5';c.lineWidth=1.6;for(const xx of [820,1245,1685]){c.beginPath();c.moveTo(xx,710);c.lineTo(1245,770);c.stroke();}
 c.save();c.translate(1680,440);c.rotate(-.15);c.fillStyle='#E8D1DB';c.fillRect(-105,-130,210,260);c.strokeStyle='#AE8CA9';c.strokeRect(-105,-130,210,260);c.fillStyle='#D8A5BC';c.beginPath();c.ellipse(0,0,75,100,.2,0,Math.PI*2);c.fill();for(let i=0;i<31;i++){c.fillStyle='#9574A4';c.beginPath();c.ellipse(Math.sin(i*4.1)*53,Math.cos(i*2.3)*83,3,2,0,0,Math.PI*2);c.fill();}c.restore();}
