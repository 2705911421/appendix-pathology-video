import {bake,drawWash} from '../lib/wash.js';
import {drawHE,CELLS} from '../lib/he.js';
import {detailedNeutrophil as drawNeutrophil} from '../lib/he_detail.js';
import {rng} from '../lib/motion.js';
import {drawHE as drawMucosa} from '../lib_ext/he_mucosa.js';
import {cryptNucleus,columnar,erythrocyte,cell,follicle} from '../lib_ext/cells_ext.js';

const TAU=Math.PI*2;
export function point(x,y){const a=x/620-Math.PI/2,r=620+y+12*Math.sin(a*3)+9*Math.sin(a*5),u=1.6*Math.cos(a)*r,v=Math.sin(a)*r;return [u*Math.cos(.14)-v*Math.sin(.14),u*Math.sin(.14)+v*Math.cos(.14)];}
function buildSource(mode){const source=document.createElement('canvas');source.width=840;source.height=620;const c=source.getContext('2d'),R=rng(40802);c.translate(420,320);(mode==='original'?drawHE:drawMucosa)(c,{ulcer:.16,neut:0,fibrin:0,t:0,detail:1,crypts:mode!=='low',gap:mode==='ulcer'?[-25,45]:null});
const copy=document.createElement('canvas');copy.width=840;copy.height=620;copy.getContext('2d').drawImage(source,0,0);
c.drawImage(copy,0,155,840,18,-420,140,840,90);c.drawImage(copy,0,330,840,5,-420,-153,840,5);
for(let i=0;i<150;i++){const x=-410+R()*820,y=-280+R()*120,sz=.7+R()*.2,rot=R()*TAU;if(mode==='ulcer'&&x>-31&&x<51&&y<-273)continue;cell(c,x,y,i%7?'lymph':'plasma',sz,rot,i);}
[-390,40,360].forEach(x=>{c.save();c.translate(x,-55);c.scale(.78,.78);follicle(c,0,0);c.restore();});for(let i=0;i<85;i++)cell(c,-410+R()*820,148+R()*76,'dot',.9,R()*TAU,i);for(let i=0;i<62;i++)cell(c,-414+i*13.5,274+Math.sin(i*.4)*2,'meso',.8,0,i);
let n=0;for(const p of CELLS){if(p.kind!=='inf'||p.y>138||p.y< -290)continue;if(mode==='ulcer'&&p.x>-31&&p.x<51&&p.y<-273)continue;if(p.y>0&&n++%35!==0)continue;if(p.y<0&&n++%4!==0)continue;detailedNeutrophil(c,p.x,p.y,p,1);}for(let i=0;i<7;i++)detailedNeutrophil(c,-270+Math.cos(i*.55)*(26+i*3),-80+Math.sin(i*.55)*(23+i*3),{lobes:2+i%4,rot:i*.8,sz:.9},1);
if(mode==='ulcer'){const extended=document.createElement('canvas');extended.width=840;extended.height=750;const e=extended.getContext('2d');e.drawImage(source,0,130);e.translate(420,450);escapedPus(e);ulcerDetail(e);return extended;}return source;}

function mapSource(src){const c=src.getContext('2d');const im=c.getImageData(0,0,840,src.height);const top=src.height===750?450:320;const result=document.createElement('canvas');result.width=3200;result.height=2100;const mc=result.getContext('2d'),out=mc.createImageData(3200,2100);for(let j=0;j<2100;j++)for(let i=0;i<3200;i++){const u=i-1600,v=j-1050,x=(u*Math.cos(.14)+v*Math.sin(.14))/1.6,y=-u*Math.sin(.14)+v*Math.cos(.14),a=Math.atan2(y,x),fy=Math.hypot(x,y)-620-12*Math.sin(a*3)-9*Math.sin(a*5);if(fy< -top||fy>=280)continue;let fx=((a+Math.PI/2)*620+420)%840;if(fx<0)fx+=840;const si=(Math.floor(fy+top)*840+Math.floor(fx))*4,di=(j*3200+i)*4;out.data.set(im.data.subarray(si,si+4),di);}mc.putImageData(out,0,0);return result;}

function escapedPus(c){
 const E=rng(40721);
 c.save();c.translate(0,-340);c.scale(1.18,.62);c.translate(0,340);drawWash(c,'s08.pus.escape',12,-372,340,{alpha:.68,soft:.8});c.restore();
 const pts=[[-53,-344],[-34,-348],[-12,-350],[12,-351],[35,-346],[57,-345],[77,-349],[-67,-360],[-45,-367],[-23,-363],[0,-370],[23,-368],[47,-364],[70,-369],[-76,-382],[-51,-383],[-26,-386],[4,-386],[32,-384],[62,-389],[87,-380],[-62,-401],[-34,-408],[-4,-405],[27,-409],[55,-406],[-81,-417],[-42,-428],[3,-424],[41,-429],[-14,-441],[67,-438]];
 for(let i=0;i<pts.length;i++){
  const x=pts[i][0]*1.18+(E()-.5)*7,y=-340+(pts[i][1]+340)*.62+(E()-.5)*5,d=Math.max(0,(-y-342)/65),sz=.70-d*.31,rot=E()*TAU;
  c.save();c.globalAlpha=.9-d*.3;
  if(i%3!==1)detailedNeutrophil(c,x,y,{lobes:2+i%4,rot,sz},1);
  else {
   c.save();c.translate(x,y);c.rotate(rot);c.scale(sz,sz);
   c.filter='blur(1px)';c.beginPath();c.ellipse(0,0,10.2,9.6,0,0,TAU);c.fillStyle='rgba(226,170,200,.44)';c.fill();c.filter='none';
   for(let j=0;j<4;j++){c.beginPath();c.ellipse(-4+j*2.6,(j%2?2:-2)+E()*2,1.1+E()*.7,1.5+E(),j*.7,0,TAU);c.fillStyle=j%2?'#50345F':'#64416E';c.fill();}
   c.restore();
  }c.restore();
 }
 c.strokeStyle='rgba(223,173,186,.25)';c.lineWidth=.32;
 for(let i=0;i<27;i++){const y=-345-E()*52,x=12+(E()-.5)*(140+(-y-345)*.9);c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+6,y-3,x-3,y-7,x+7,y-12);c.stroke();}
 for(const [i,x,y] of [[0,-57,-353],[1,48,-365],[2,-26,-379],[3,88,-382]]){c.save();c.globalAlpha=.45;erythrocyte(c,x,y,.38,E()*TAU,i);c.restore();}
}

function ulcerDetail(c){
 const U=rng(40712);
 // Three unequal lifted shreds per end, outside the skipped surface interval.
 for(const [x,sign] of [[-27,1],[47,-1]])for(let j=0;j<3;j++)columnar(c,x+sign*(j*1.8),-290-j*3.5,.48+U()*.15,sign*(.4+j*.28),j,'fray');
 drawWash(c,'s08.congestion',10,-266,115,{alpha:.55});
 for(let i=0;i<13;i++)erythrocyte(c,-18+U()*55,-278+U()*20,.65,U()*TAU,i);
 c.strokeStyle='rgba(213,153,174,.55)';c.lineWidth=.42;
 for(let i=0;i<52;i++){const x=-24+U()*62,y=-294+U()*4;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+5,y-3,x+5+U()*7,y+U()*4-1);c.stroke();}
 // Staggered central cluster, sparse shoulders, and three lumenward emigrants.
 c.strokeStyle='rgba(221,166,185,.30)';c.lineWidth=.32;
 for(let i=0;i<58;i++){const x=-33+U()*88,y=-337+U()*36;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+4,y-4,x+8+U()*5,y+5);c.stroke();}
 const exudate=[[-39,-303],[-23,-302],[-10,-300],[4,-301],[19,-300],[34,-302],[51,-304],
 [-29,-314],[-15,-313],[0,-312],[14,-314],[29,-312],[44,-314],
 [-20,-327],[-4,-326],[12,-328],[27,-326],[5,-341],[-48,-316],[61,-317]];
 for(let i=0;i<exudate.length;i++){const [x,y]=exudate[i];detailedNeutrophil(c,x,y,{lobes:2+i%4,rot:U()*TAU,sz:.80+U()*.08},1);}
}
export function prepareAcute(){acutePopulation.length=0;bake('s08.congestion',(b,P)=>{P.fill(b,P.blob(0,0,75,18,.3,47),'#C86A87',130,.2);},{seed:47,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});bake('s08.lumen', (b,P)=>{P.fill(b,P.blob(0,0,300,22,.2,43),'#DCA4B2',200,.15);},{seed:43,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});bake('s08.pus.escape',(b,P)=>{const fan=[[-75,150],[-100,90],[-165,22],[-222,-60],[-255,-145],[-184,-210],[-130,-185],[-65,-245],[8,-213],[75,-250],[145,-190],[227,-162],[185,-82],[140,-25],[111,52],[68,130],[38,180],[-15,198]];P.fill(b,fan,'#E9B4B7',85,.65);P.fill(b,fan.map(([x,y])=>[x*.72+12,y*.82+28]),'#E7C5A4',70,.7);},{seed:40720,hd:true,soft:true,grain:.12,edge:.18,bleed:.85});return mapSource(buildSource('ulcer'));}

// Read-only draw audit: same function, arguments and canvas state; record every call.
export const acutePopulation=[];
function detailedNeutrophil(c,x,y,p,k){const m=c.getTransform(),xx=m.a*x+m.c*y+m.e-420,yy=m.b*x+m.d*y+m.f-(c.canvas.height===750?450:320);acutePopulation.push({x:xx,y:yy,sz:(p.sz||1)*k,rot:p.rot,lobes:p.lobes});return drawNeutrophil(c,x,y,p,k);}
export function measureAcute(center,z,r=425,origin=[1110,475]){const samples=[];for(const p of acutePopulation){for(let turn=-2;turn<=2;turn++){const x=p.x+turn*840,a=point(x,p.y),dx=point(x+.01,p.y),dy=point(x,p.y+.01);const sx=origin[0]+(a[0]-center[0])*z,sy=origin[1]+(a[1]-center[1])*z;if(Math.hypot(sx-origin[0],sy-origin[1])>r-22)continue;const J=[(dx[0]-a[0])*100,(dy[0]-a[0])*100,(dx[1]-a[1])*100,(dy[1]-a[1])*100];const diameter=Math.sqrt(20.4*19.2*Math.abs(J[0]*J[3]-J[1]*J[2]))*(p.sz||1)*z;samples.push({...p,x,screen:[sx,sy],body_diameter_px:diameter,jacobian:J});}}return samples;}
