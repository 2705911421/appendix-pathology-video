// New v5 simple-appendicitis geometry. No old full-wall cell plate is used.
import {rng} from './motion.js';
import {chromatin,detailedNeutrophil} from './he_detail.js';
import {bakePigment} from './pigment.js';
import {box,drawBlock,measureBlock} from './layout.js';
export const FIELD={x:620,y:140,w:1100,h:590};
export const muscleCells=[[740,523],[957,575],[1195,536],[1414,605],[1608,557]];
const wave=x=>5*Math.sin(x/79)+3*Math.sin(x/31);
function oval(c,x,y,rx,ry,color,a=0){c.beginPath();c.ellipse(x,y,rx,ry,a,0,Math.PI*2);c.fillStyle=color;c.fill();}
function nucleus(c,x,y,rx,ry,a=0){oval(c,x,y,rx,ry,'#806495',a);chromatin(c,x,y,rx,ry,a);}
export async function bakeAcute(){bakePigment('v5.he.mucosa','#E8C4D2',801);bakePigment('v5.he.submucosa','#EFE0E6',802);bakePigment('v5.he.muscle','#E1AEC2',803);bakePigment('v5.he.serosa','#EDCCD7',804);}
function band(c,y,h,key){c.save();c.beginPath();c.moveTo(620,y+wave(620));for(let x=620;x<=1720;x+=10)c.lineTo(x,y+wave(x));for(let x=1720;x>=620;x-=10)c.lineTo(x,y+h+wave(x));c.closePath();c.clip();c.drawImage(bakePigment('v5.he.'+key,'#F6EEF0',800),620,y-12,1100,h+26);c.restore();}
function vessel(c,x,y,rx,ry,R){oval(c,x,y,rx+3,ry+3,'#DDA0B8');oval(c,x,y,rx,ry,'#FAE9E9');c.strokeStyle='#B7759B';c.lineWidth=1.2;c.beginPath();c.ellipse(x,y,rx+3,ry+3,0,0,6.283);c.stroke();for(let i=0;i<Math.floor(rx*ry/38);i++){const a=R()*6.283,r=Math.sqrt(R())*.76,xx=x+Math.cos(a)*rx*r,yy=y+Math.sin(a)*ry*r,rr=5*(.85+R()*.25);oval(c,xx,yy,rr,rr*.64,'#A8404E',a);oval(c,xx,yy,rr*.46,rr*.25,'#C9A8AE',a);}for(let i=0;i<5;i++){let a=i/5*6.283;nucleus(c,x+Math.cos(a)*(rx+2),y+Math.sin(a)*(ry+2),3.1,1.3,a+1.57);}}
export function drawAcute(c){box('HE field incl border',616,136,1108,598);c.save();c.beginPath();c.rect(620,140,1100,590);c.clip();c.fillStyle='#F6EEF0';c.fillRect(620,140,1100,590);
 band(c,203,157,'mucosa');band(c,360,126,'submucosa');band(c,486,171,'muscle');band(c,657,42,'serosa');
 const R=rng(81731);
 // Fine collagen and elongated eosin bundles, following tissue rather than hatching.
 c.lineWidth=.65;for(let i=0;i<650;i++){const x=620+R()*1100,y=360+R()*293,l=12+R()*57;c.strokeStyle=y<486?'rgba(189,106,147,.27)':'rgba(177,84,124,.33)';c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+l*.3,y-7,x+l*.65,y+6,x+l,y+R()*5);c.stroke();}
 // Tubular crypts lined with columnar epithelium and pale goblet cells.
 for(let x=652;x<1710;x+=66){const yy=208+wave(x),bottom=338+R()*10,w=15+R()*5;c.beginPath();c.moveTo(x-w,yy);c.bezierCurveTo(x-w-3,yy+55,x-w+1,bottom,x,bottom);c.bezierCurveTo(x+w+9,bottom,x+w,yy+55,x+w,yy);c.strokeStyle='#CB91B0';c.lineWidth=13;c.stroke();c.strokeStyle='#F9EAF0';c.lineWidth=6;c.stroke();for(let j=0;j<10;j++){const y=yy+12+j*11;for(const sign of [-1,1]){nucleus(c,x+sign*(w+2),y,2.8,4.2,sign*.12);if(j%3===1)oval(c,x+sign*(w-4),y-5,3.5,5,'#F8F0F2');}}}
 // Surface epithelium: only one local gap, not complete denudation.
 for(let x=621;x<1720;x+=9){if(x>1080&&x<1180)continue;const y=202+wave(x);oval(c,x,y,5,9,'#D2A1BE');nucleus(c,x,y-2,2.3,4.1);}
 // Defect has a ragged pale eosin bed and a few locally shed epithelial cells.
 for(let i=0;i<26;i++){let x=1085+R()*90,y=208+R()*16;oval(c,x,y,3+R()*5,1.5+R()*3,'rgba(203,139,171,.35)',R()*3);}
 for(let i=0;i<6;i++)nucleus(c,1090+R()*78,185+R()*11,2.1,3.1,R()*2);
 // Preserved lymphoid follicles, pale germinal centres; not labelled as chronic infiltration.
 for(const [x,y] of [[790,420],[1500,420]]){oval(c,x,y,48,35,'rgba(126,92,156,.14)');for(let i=0;i<125;i++){const a=R()*6.283,r=Math.sqrt(R());if(r<.46&&R()<.8)continue;nucleus(c,x+Math.cos(a)*46*r,y+Math.sin(a)*32*r,1.9,2.3);}oval(c,x-5,y-2,19,14,'rgba(244,231,239,.42)');}
 // Separate inner circular and outer longitudinal muscle nuclear texture.
 for(let i=0;i<235;i++){let x=625+R()*1090,y=495+R()*71;nucleus(c,x,y,2.4,2.1,R()*3);}
 for(let i=0;i<165;i++){let x=625+R()*1090,y=574+R()*75;nucleus(c,x,y,6.5,1.5,(R()-.5)*.25);}
 // Scattered normal stromal nuclei.
 for(let i=0;i<140;i++){let x=625+R()*1090,y=365+R()*112;nucleus(c,x,y,2.4,1.5,R()*3);}
 vessel(c,1020,411,33,13,R);vessel(c,1340,459,25,11,R);vessel(c,930,679,24,8,R);vessel(c,1560,680,21,7,R);
 const cell=(x,y)=>{const u=R(),lobes=u<.15?2:u<.6?3:u<.9?4:5;detailedNeutrophil(c,x,y,{lobes,rot:R()*6.283,sz:.92},1);};
 // Concentrate in intercrypt lamina propria and submucosa; no serosal neutrophils.
 for(let i=0;i<135;i++){const column=Math.floor(R()*16);cell(682+column*66+(R()-.5)*13,227+R()*120);}
 for(let i=0;i<90;i++){let x=640+R()*1050,y=371+R()*101;if(Math.hypot((x-790)/1.4,y-420)<37||Math.hypot((x-1500)/1.4,y-420)<37)continue;cell(x,y);}
 muscleCells.forEach(([x,y])=>cell(x,y));
 // Clean mesothelial surface.
 c.strokeStyle='#C48AA8';c.lineWidth=1.2;c.beginPath();for(let x=620;x<=1720;x+=8){let y=698+wave(x);x===620?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();for(let x=650;x<1710;x+=49)nucleus(c,x,698+wave(x),4,1.3);
 c.restore();c.strokeStyle='#B195A9';c.lineWidth=1.4;c.strokeRect(619,139,1102,592);
}
export function drawAcuteAnnotations(c){
 for(const [text,y] of [['黏膜',283],['黏膜下层',420],['肌层',570],['浆膜',688]]){c.strokeStyle='#826A82';c.lineWidth=1.6;c.beginPath();c.moveTo(1702,y);c.lineTo(1738,y);c.stroke();drawBlock(c,measureBlock(c,text,{size:27,width:140}),1746,y-24);}
 drawBlock(c,measureBlock(c,'HE 染色 · 阑尾壁',{size:32,width:700}),650,67);
 // No pointer across the section: a fine local bracket identifies the defect.
 c.strokeStyle='#8E677F';c.lineWidth=1.6;c.beginPath();c.moveTo(1077,177);c.lineTo(1077,163);c.lineTo(1184,163);c.lineTo(1184,177);c.stroke();
 drawBlock(c,measureBlock(c,'局部上皮缺损',{size:27,width:260}),1016,112);
 box('layer leaders',1700,275,42,417);box('defect bracket',1076,162,110,17);
}
