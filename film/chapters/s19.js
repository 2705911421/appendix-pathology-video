import {prepareChronic,focus,plasmaLeader} from '../lib_ext/s19_fix11_chronic.js';
let map;const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
export default {prepare(){map=prepareChronic();},draw(c,t,T){
 c.setTransform(1,0,0,1,0,0);c.fillStyle='#111114';c.fillRect(0,0,1920,1080);
 const keys=[[T.at(69),[0,0,.49]],[T.frac(69,.18),[0,0,.49]],[T.frac(69,.64),[...focus.fib,1.62]],[T.end(69),[...focus.fib,1.62]],[T.frac(70,.27),[...focus.lymph,4.8]],[T.frac(70,.48),[...focus.lymph,4.8]],[T.frac(70,.75),[...focus.plasma,22]],[T.end(70),[...focus.plasma,22]]];
 let v=keys[0][1];for(let i=1;i<keys.length;i++){if(t>=keys[i][0]){v=keys[i][1];continue;}const a=keys[i-1],b=keys[i],k=ease((t-a[0])/(b[0]-a[0]));v=a[1].map((x,j)=>x+(b[1][j]-x)*k);break;}
 const [x,y,z]=v;c.save();c.beginPath();c.arc(1110,475,425,0,Math.PI*2);c.clip();c.fillStyle='#F6EEF0';c.fill();c.translate(1110,475);c.scale(z,z);c.translate(-x,-y);map.forEach(tile=>c.drawImage(tile.canvas,tile.x,tile.y,tile.w,tile.h));c.restore();c.strokeStyle='#4C4555';c.lineWidth=1.6;c.beginPath();c.arc(1110,475,431,0,Math.PI*2);c.stroke();c.fillStyle='#E8DDE9';c.font='500 30px MixSans';c.fillText(t<T.frac(69,.32)?'低倍':t<T.frac(70,.18)?'中倍':'高倍',1030,35);
 c.font='700 36px MixSans';c.fillText('阑尾壁',75,320);c.font='400 27px MixSans';c.fillText('纤维组织增生、纤维化',75,376);
 if(t>=T.at(70)){c.globalAlpha=ease((t-T.at(70))/(T.frac(70,.16)-T.at(70)));c.fillText('慢性炎细胞：',75,470);c.fillText('淋巴细胞、浆细胞',75,526);c.globalAlpha=1;}
 let label=null,target=null,a=1;
 if(t>T.frac(69,.65)&&t<T.end(69)){label='纤维组织增生';target=focus.fib;a=Math.min(ease((t-T.frac(69,.65))/(T.frac(69,.78)-T.frac(69,.65))),ease((T.end(69)-t)/(T.end(69)-T.frac(69,.92))));}
 if(t>T.frac(70,.28)&&t<T.frac(70,.49)){label='淋巴细胞';target=focus.lymph;a=Math.min(ease((t-T.frac(70,.28))/(T.frac(70,.34)-T.frac(70,.28))),ease((T.frac(70,.49)-t)/(T.frac(70,.49)-T.frac(70,.45))));}
 if(t>T.frac(70,.77)){label='浆细胞';target=plasmaLeader;a=ease((t-T.frac(70,.77))/(T.frac(70,.84)-T.frac(70,.77)));}
 if(label){c.save();c.globalAlpha=a;c.font='400 27px MixSans';c.fillStyle='#D8C5E7';c.fillText(label,1555,275);c.strokeStyle='#B8A1C8';c.lineWidth=1.2;c.beginPath();c.moveTo(1550,287);c.lineTo(1488,310);c.lineTo(1110+(target[0]-x)*z,475+(target[1]-y)*z);c.stroke();c.restore();}
}};
