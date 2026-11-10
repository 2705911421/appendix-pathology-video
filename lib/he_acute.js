// Annular anatomy adapter. Cell morphology, vessel walls and pigment engines remain legacy code.
import {drawHE} from './he.js';
import {ink} from './ink.js';
import {rng} from './motion.js';
import {chromatin,detailedNeutrophil,fibrinMesh,tissueTexture} from './he_detail.js';
import {drawVessels} from './he_guide.js';
import {pigment,stain} from './watercolor.js';
const TAU=Math.PI*2;
export const RADII={lumen:390,mucosa:540,mm:552,submucosa:805,circular:990,longitudinal:1105,serosa:1140};
const wave=a=>12*Math.sin(a*7)+7*Math.sin(a*13+.6);
export const polar=(a,r)=>[Math.sin(a)*(r+wave(a)), -Math.cos(a)*(r+wave(a))];
const R=rng(82024),crypts=[],lymph=[],neuts=[],muscle=[],follicles=[];
for(let i=0;i<56;i++)crypts.push({a:i/56*TAU+(R()-.5)*.025,r:435+R()*28,h:37+R()*26,w:10+R()*7,tilt:(R()-.5)*.45});
for(let i=0;i<13;i++)follicles.push({a:i/13*TAU+.08,r:665+R()*44,rx:75+R()*20,ry:73+R()*24});
for(let i=0;i<6200;i++)lymph.push({a:R()*TAU,r:398+R()*400,sz:1.9+R()*1.2,plasma:i%9===0});
// Separated cells, deterministically spaced; high power resolves individual lobes.
for(let row=0;row<15;row++){const r=410+row*25,n=Math.floor(TAU*r/34);for(let j=0;j<n;j++){const u=R();neuts.push({a:j/n*TAU+(R()-.5)*.012,r:r+(R()-.5)*7,lobes:u<.15?2:u<.6?3:u<.9?4:5,rot:R()*TAU,sz:.92});}}
for(let i=0;i<5;i++)neuts.push({a:(i-2)*.13,r:840+i*45,lobes:3,rot:R()*TAU,sz:.92,muscle:true});
for(let i=0;i<3000;i++)muscle.push({a:R()*TAU,r:810+R()*290,l:4+R()*5});
export async function bakeAcute(){for(const [key,col,seed] of [['mucosa','#D98BA8',801],['sub','#EBC3D0',802],['muscle','#D98BA8',803],['serosa','#EBC3D0',804]])pigment('acute.'+key,col,seed);}
function ring(c,r){const p=new Path2D();for(let i=0;i<=360;i++){const a=i/360*TAU,[x,y]=polar(a,r);i?p.lineTo(x,y):p.moveTo(x,y);}p.closePath();return p;}
function oval(c,x,y,rx,ry,col,a=0){c.beginPath();c.ellipse(x,y,rx,ry,a,0,TAU);c.fillStyle=col;c.fill();}
function nuc(c,x,y,rx,ry,a=0){oval(c,x,y,rx,ry,'#6B4C9A',a);chromatin(c,x,y,rx,ry,a);}
function local(c,a,r,fn){const p=polar(a,r);c.save();c.translate(...p);c.rotate(a);fn();c.restore();}
export function plasma(c,x,y){oval(c,x,y,6.5,8,'#EBC3D0');oval(c,x+1,y-2,2.7,3,'#F6EEF0');oval(c,x-1.8,y+3,3.5,3.7,'#6B4C9A');for(let j=0;j<7;j++){const a=j/7*TAU;oval(c,x-1.8+Math.cos(a)*2.4,y+3+Math.sin(a)*2.5,.85,.9,'#3F2A66');}}
const vesselSites=[[-.12,670,34],[.21,740,29],[.04,1120,16]];
export function drawAcute(c,{mode='simple',zoom=.35,focus={x:0,y:0}}={}){
 let visibleNeutrophils=0;
 const visible=(x,y,margin=110)=>Math.hypot(x-focus.x,y-focus.y)<460/zoom+margin;
 c.fillStyle='#F6EEF0';c.fillRect(-1700,-1700,3400,3400);
 // Ordered rings preserve one physical section from overview through cellular inspection.
 for(const [r,key] of [[1140,'serosa'],[1105,'muscle'],[805,'sub'],[552,'muscle'],[540,'mucosa']]){c.save();c.clip(ring(c,r));c.fillStyle=key==='muscle'?'#EBC3D0':'#F6EEF0';c.fillRect(-1200,-1200,2400,2400);for(let i=0;i<12;i++){const a=i/12*TAU;stain(c,'acute.'+key,...polar(a,r-65),900,.48);}c.restore();}
 c.fillStyle='#F6EEF0';c.fill(ring(c,390));
 // Muscularis mucosae is a thin, separate smooth muscle layer.
 for(const r of [540,552,805,990,1105,1140]){c.strokeStyle=r===990?'#B97898':'rgba(156,99,136,.5)';c.lineWidth=r===990?1.4:.8;c.stroke(ring(c,r));}
 for(const f of follicles){local(c,f.a,f.r,()=>{oval(c,0,0,f.rx,f.ry,'#D6C5DF');oval(c,-5,-4,f.rx*.57,f.ry*.55,'#EEE2EC',.1);const F=rng(Math.floor(f.a*1000)+23);for(let j=0;j<280;j++){const a=F()*TAU,r=Math.sqrt(F()),edge=1+.07*Math.sin(a*5);const x=Math.cos(a)*f.rx*r*edge,y=Math.sin(a)*f.ry*r*edge;if(r<.56&&F()<.78){if(F()<.3)nuc(c,x,y,3.6,4);continue;}nuc(c,x,y,2.6,3.1);} });}
 for(const l of lymph){const [x,y]=polar(l.a,l.r);if(!visible(x,y))continue;if(l.r>=540&&l.r<=552)continue;if(crypts.some(g=>{const da=Math.atan2(Math.sin(l.a-g.a),Math.cos(l.a-g.a));return (da*l.r/g.w)**2+((l.r-g.r)/g.h)**2<1;}))continue;if(l.r>550&&follicles.some(f=>{const da=Math.atan2(Math.sin(f.a-l.a),Math.cos(f.a-l.a));return (da*l.r/f.rx)**2+((l.r-f.r)/f.ry)**2<1.15;}))continue;if(l.plasma&&zoom>.6)plasma(c,x,y);else oval(c,x,y,l.sz,l.sz*1.13,'#6B4C9A');}
 for(const g of crypts){if((mode==='simple'||mode==='suppurative')&&Math.abs(g.a)<.085)continue;local(c,g.a,g.r,()=>{c.rotate(g.tilt);c.beginPath();c.ellipse(0,0,g.w+7,g.h+6,0,0,TAU);c.fillStyle='#D98BA8';c.fill();ink(c,'crypt.'+g.a,'ellipse',[0,0,(g.w+7)*2,(g.h+6)*2],{stroke:'#A66F97',strokeWidth:1.4,roughness:.55,boil:false},{fill:false});oval(c,0,0,g.w,g.h,'#F6EEF0');for(let i=0;i<26;i++){const a=i/26*TAU,x=Math.cos(a)*(g.w+4),y=Math.sin(a)*(g.h+3);if(i%5===0)oval(c,x,y,3.4,5.3,'#F6EEF0',a);else nuc(c,x,y,2.4,4,a+Math.PI/2);}});}
 for(let i=0;i<390;i++){const a=i/390*TAU;if((mode==='simple'||mode==='suppurative')&&(a<.08||a>TAU-.08))continue;local(c,a,390,()=>{oval(c,0,0,4,8,'#D98BA8');if(i%6===0)oval(c,0,0,3.5,6,'#F6EEF0');else nuc(c,0,0,2.1,4);});}
 for(let i=0;i<12;i++)local(c,i/12*TAU,1020,()=>{c.beginPath();c.rect(-265,-30,530,260);c.clip();tissueTexture(c,.7);});
 for(let i=0;i<230;i++){const a=i/230*TAU;local(c,a,546,()=>nuc(c,0,0,4,1.1));}
 for(const m of muscle){const [x,y]=polar(m.a,m.r);if(!visible(x,y))continue;local(c,m.a,m.r,()=>{c.strokeStyle='rgba(177,84,124,.35)';c.lineWidth=.65;c.beginPath();c.moveTo(-20,0);c.bezierCurveTo(-7,-3,12,3,30,0);c.stroke();nuc(c,0,0,m.r<990?2.4:m.l,m.r<990?2.2:1.5);});}
 for(let i=0;i<180;i++){const a=i/180*TAU;local(c,a,1140,()=>nuc(c,0,0,5,1.2));}
 for(const [a,r,size] of vesselSites)local(c,a,r,()=>{c.save();c.scale(size/34,size/34);drawVessels(c,[[0,0,34]]);c.restore();const V=rng(Math.round(r));for(let row=-1;row<=1;row++)for(let col=-3;col<=3;col++){const x=col*7+(V()-.5)*2,y=row*6+(V()-.5)*2;if((x/(size*.67))**2+(y/(size*.50))**2>.86)continue;const a=V()*3;oval(c,x,y,5,3,'#A8404E',a);c.strokeStyle='#7E2A38';c.lineWidth=.28;c.stroke();oval(c,x,y,5*.46,3*.38,'#C9A8AE',a);}});
 if(mode!=='chronic')for(const n of neuts){if(n.muscle===true&&mode==='simple'||!n.muscle){const [x,y]=polar(n.a,n.r);if(!visible(x,y,25))continue;if(n.r>552&&follicles.some(f=>{const da=Math.atan2(Math.sin(f.a-n.a),Math.cos(f.a-n.a));return (da*n.r/f.rx)**2+((n.r-f.r)/f.ry)**2<1.18;}))continue;if(n.r<540&&crypts.some(g=>{const da=Math.atan2(Math.sin(n.a-g.a),Math.cos(n.a-g.a));return (da*n.r/(g.w+10))**2+((n.r-g.r)/(g.h+10))**2<1.1;}))continue;if(Math.hypot(x-focus.x,y-focus.y)<445/zoom)visibleNeutrophils++;if(zoom<.65)oval(c,x,y,3,3,'#6B4C9A');else detailedNeutrophil(c,x,y,n,1);}}
 if(mode==='suppurative'){
 const F=rng(10037);for(let i=0;i<7400;i++){const a=F()*TAU,r=100+F()*1060,[x,y]=polar(a,r);if(!visible(x,y,25))continue;const cell={lobes:2+Math.floor(F()*4),rot:F()*TAU,sz:.92};if(i%5===0){oval(c,x,y,7,6,'#EBC3D0');for(let j=0;j<4;j++)oval(c,x+(F()-.5)*9,y+(F()-.5)*8,1.3,1.5,'#3F2A66');}else detailedNeutrophil(c,x,y,cell,1);}
 for(let i=0;i<12;i++)local(c,i/12*TAU,1150,()=>{c.translate(0,-270);c.scale(.9,.9);c.beginPath();c.rect(-430,280,860,140);c.clip();drawHE(c,{style:'ch04',detail:1,neut:0,ulcer:0,fibrin:1,t:0});});
 }
 if(mode==='chronic'){const F=rng(1969);for(let i=0;i<2600;i++){const a=F()*TAU,r=560+F()*520,[x,y]=polar(a,r);if(!visible(x,y))continue;c.strokeStyle='#D98BA8';c.lineWidth=.65;c.beginPath();c.moveTo(x-24,y);c.bezierCurveTo(x-8,y-6,x+12,y+5,x+32,y);c.stroke();if(i%3===0)plasma(c,x,y);else nuc(c,x,y,2.8,3);}}
 // Focal ragged epithelial loss, with a few shed cells in the lumen.
 if(mode==='simple'||mode==='suppurative'){const F=rng(834);for(let i=0;i<25;i++){const x=(F()-.5)*59,y=-386+F()*14;oval(c,x,y,3+F()*4,2,'#EBC3D0',F()*3);}for(let i=0;i<6;i++)nuc(c,-24+i*10,-363+(i%2)*8,2.6,4,i*.7);}
 return {visibleNeutrophils,muscleNeutrophilsOnPlate:mode==='simple'?5:undefined};
}
export const muscleCells=neuts.filter(n=>n.muscle);
