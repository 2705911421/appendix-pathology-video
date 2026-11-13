import {prepareGangreneMap,drawGangreneDetails,focus,perforation,rimPoint} from '../lib_ext/he_gangrene.js';
let map;const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
export default {prepare(){map=prepareGangreneMap();},draw(c,t,T){
 c.setTransform(1,0,0,1,0,0);c.fillStyle='#111114';c.fillRect(0,0,1920,1080);
 const keys=[[T.at(54),[123,-516,.38]],[T.frac(54,.18),[130,-526,.42]],[T.frac(54,.7),[...focus.overview,.60]],[T.end(54),[...focus.overview,.60]],[T.frac(55,.35),[...focus.edge,1.2665]],[T.end(55),[...focus.exudate,1.2665]],[T.frac(56,.4),[...focus.overview,.60]],[T.end(56),[...focus.overview,.60]],[T.frac(57,.33),[...focus.hole,1.2665]],[T.end(57),[...focus.hole,1.2665]]];
 let v=keys[0][1];for(let i=1;i<keys.length;i++){if(t>=keys[i][0]){v=keys[i][1];continue;}const a=keys[i-1],b=keys[i],k=ease((t-a[0])/(b[0]-a[0]));v=a[1].map((x,j)=>x+(b[1][j]-x)*k);break;}
 const [x,y,z]=v;c.save();c.beginPath();c.arc(1110,475,425,0,Math.PI*2);c.clip();c.fillStyle='#F6EEF0';c.fill();c.translate(1110,475);c.scale(z,z);c.translate(-x,-y);c.drawImage(map,-1700,-1250,3400,2500);drawGangreneDetails(c,x,y,z);if(t>=T.at(57))perforation(c,ease((t-T.frac(57,.3))/(T.frac(57,.6)-T.frac(57,.3))));c.restore();c.strokeStyle='#4C4555';c.lineWidth=1.6;c.beginPath();c.arc(1110,475,431,0,Math.PI*2);c.stroke();
 c.fillStyle='#E8DDE9';c.font='500 36px MixSans';c.fillText(z*1.42<.6?'低倍':z*1.42<=1.23?'中倍':'高倍',1030,48);
 window.__rescaleCamera={x,y,z,cx:1110,cy:475,r:425,pxPerUm:z*1.42};
 c.font='500 36px MixSans';c.globalAlpha=1;c.fillText('变质：大片组织坏死',75,350);if(t>=T.at(55))c.fillText('渗出：脓细胞、纤维素',75,410);c.globalAlpha=1;
 if(t>=T.at(56)){c.fillStyle='#DDD8DE';c.font='700 48px MixSans';c.fillText('坏疽性阑尾炎',75,270);c.fillStyle='#2A2A35';c.fillRect(75,287,290,5);}
 if(t>=T.at(57)){c.strokeStyle='#AC98B7';c.lineWidth=1.5;c.setLineDash([6,6]);c.strokeRect(65,482,510,130);c.setLineDash([]);c.fillStyle='#E8DDE9';c.font='500 36px MixSans';c.fillText('可能穿孔：',75,531);c.fillText('感染扩散至腹腔',75,579);}
 function label(txt,p,lx,ly,a=1){c.save();c.globalAlpha=a;c.font='500 36px MixSans';c.fillStyle='#D8C5E7';c.fillText(txt,lx,ly);window.__rescaleLabels??=[];window.__rescaleLabels.push({text:txt,x:lx,y:ly,px:1110+(p[0]-x)*z,py:475+(p[1]-y)*z,target:p});c.strokeStyle='#A68AB7';c.lineWidth=1.6;c.beginPath();c.moveTo(lx+12,ly+12);c.lineTo(lx+32,ly+35);c.lineTo(1110+(p[0]-x)*z,475+(p[1]-y)*z);c.stroke();c.restore();}
 if(t<T.end(54)&&t>T.frac(54,.7)){const a=Math.min(1,(T.end(54)-t)/(T.end(54)-T.frac(54,.92)));label('坏死区',focus.dead,560,272,a);label('出血',focus.blood,560,212,a);}
 if(t>T.frac(55,.36)&&t<T.frac(55,.94)){label('脓细胞',focus.exudate,1572,246);label('坏死边缘',focus.edge,1572,684);}
 if(t>T.frac(57,.63))label('糜烂边缘',rimPoint,1572,300);
}};
