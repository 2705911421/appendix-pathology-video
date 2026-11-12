import {prepareGangreneMap,focus,perforation} from '../lib_ext/he_gangrene.js';
let map;const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
export default {prepare(){map=prepareGangreneMap();},draw(c,t,T){
 c.setTransform(1,0,0,1,0,0);c.fillStyle='#111114';c.fillRect(0,0,1920,1080);
 const keys=[[T.at(54),[0,0,.49]],[T.frac(54,.18),[0,0,.49]],[T.frac(54,.7),[...focus.overview,1.55]],[T.end(54),[...focus.overview,1.55]],[T.frac(55,.35),[...focus.edge,3.1]],[T.end(55),[...focus.exudate,3.1]],[T.frac(56,.4),[...focus.overview,1.25]],[T.end(56),[...focus.overview,1.25]],[T.frac(57,.33),[...focus.hole,2.5]],[T.end(57),[...focus.hole,2.5]]];
 let v=keys[0][1];for(let i=1;i<keys.length;i++){if(t>=keys[i][0]){v=keys[i][1];continue;}const a=keys[i-1],b=keys[i],k=ease((t-a[0])/(b[0]-a[0]));v=a[1].map((x,j)=>x+(b[1][j]-x)*k);break;}
 const [x,y,z]=v;c.save();c.beginPath();c.arc(1110,475,425,0,Math.PI*2);c.clip();c.fillStyle='#F6EEF0';c.fill();c.translate(1110,475);c.scale(z,z);c.translate(-x,-y);c.drawImage(map,-1700,-1250,3400,2500);if(t>=T.at(57))perforation(c,ease((t-T.frac(57,.3))/(T.frac(57,.6)-T.frac(57,.3))));c.restore();c.strokeStyle='#4C4555';c.lineWidth=1.6;c.beginPath();c.arc(1110,475,431,0,Math.PI*2);c.stroke();
 c.fillStyle='#E8DDE9';c.font='500 30px MixSans';c.fillText(t<T.frac(54,.33)?'低倍':t<T.frac(55,.22)?'中倍':t<T.at(56)?'高倍':t<T.frac(57,.25)?'中倍':'高倍',1030,35);
 c.font='400 29px MixSans';c.globalAlpha=t>=T.at(56)?.48:1;c.fillText('变质：大片组织坏死',75,350);if(t>=T.at(55))c.fillText('渗出：脓细胞、纤维素',75,410);c.globalAlpha=1;
 if(t>=T.at(56)){c.fillStyle='#DDD8DE';c.font='700 37px MixSans';c.fillText('坏疽性阑尾炎',75,270);c.fillStyle='#2A2A35';c.fillRect(75,287,290,5);}
 if(t>=T.at(57)){c.strokeStyle='#AC98B7';c.lineWidth=1.5;c.setLineDash([6,6]);c.strokeRect(73,480,112,49);c.setLineDash([]);c.fillStyle='#E8DDE9';c.font='400 27px MixSans';c.fillText('可能',99,514);c.fillText('可能穿孔：',75,585);c.fillText('感染扩散至腹腔',75,632);}
 function label(txt,p,lx,ly,a=1){c.save();c.globalAlpha=a;c.font='400 27px MixSans';c.fillStyle='#604177';c.fillText(txt,lx,ly);c.strokeStyle='#81628F';c.lineWidth=1.6;c.beginPath();c.moveTo(lx+12,ly+12);c.lineTo(lx+32,ly+35);c.lineTo(1110+(p[0]-x)*z,475+(p[1]-y)*z);c.stroke();c.restore();}
 if(t<T.end(54)&&t>T.frac(54,.7)){const a=Math.min(1,(T.end(54)-t)/(T.end(54)-T.frac(54,.92)));label('坏死区',focus.dead,1040,380,a);label('出血',focus.blood,820,255,a);}
 if(t>T.frac(55,.36)&&t<T.frac(55,.94)){label('脓细胞',focus.exudate,1160,260);label('坏死边缘',focus.edge,820,690);}
 if(t>T.frac(57,.63))label('局灶缺损',focus.hole,1190,260);
}};
