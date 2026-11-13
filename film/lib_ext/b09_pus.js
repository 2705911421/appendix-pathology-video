// S10/S11 tissue plate. Drawing is the b09/b10 (s08.js) vocabulary.
// Default buildSource / mapSource / escapedPus / ulcerDetail match s08.js.
// fullWall / pus / fibrin only relax placement or call fibrinMesh. No new cell painter.
import {bake,drawWash} from '../lib/wash.js';
import {drawHE,CELLS} from '../lib/he.js';
import {detailedNeutrophil,fibrinMesh} from '../lib/he_detail.js';
import {rng} from '../lib/motion.js';
import {drawHE as drawMucosa} from '../lib_ext/he_mucosa.js';
import {columnar,erythrocyte,cell,follicle} from '../lib_ext/cells_ext.js';

const TAU=Math.PI*2;
export const SEROSA_DX=60, SEROSA_DY=680;

export function point(x,y){const a=x/620-Math.PI/2,r=620+y+12*Math.sin(a*3)+9*Math.sin(a*5),u=1.6*Math.cos(a)*r,v=Math.sin(a)*r;return [u*Math.cos(.14)-v*Math.sin(.14),u*Math.sin(.14)+v*Math.cos(.14)];}

export function jacGeo(x,y){
  const e=.5,p=point(x,y),px=point(x+e,y),py=point(x,y+e);
  const dx=Math.hypot(px[0]-p[0],px[1]-p[1])/e, dy=Math.hypot(py[0]-p[0],py[1]-p[1])/e;
  return Math.sqrt(dx*dy);
}
export function screenOf(fx,fy,camX,camY,z){
  const p=point(fx,fy);
  return [1110+(p[0]-camX)*z, 475+(p[1]-camY)*z];
}
export function bodyPx(fx,fy,sz,z){return 20.4*(sz||1)*z*jacGeo(fx,fy);}

// Same cytoplasm / karyorrhectic fragments as escapedPus i%3===1. E is the caller's rng.
export function drawDegenerate(c,x,y,sz,rot,E){
  c.save();c.translate(x,y);c.rotate(rot);c.scale(sz,sz);
  c.filter='blur(1px)';c.beginPath();c.ellipse(0,0,10.2,9.6,0,0,TAU);c.fillStyle='rgba(226,170,200,.44)';c.fill();c.filter='none';
  for(let j=0;j<4;j++){c.beginPath();c.ellipse(-4+j*2.6,(j%2?2:-2)+E()*2,1.1+E()*.7,1.5+E(),j*.7,0,TAU);c.fillStyle=j%2?'#50345F':'#64416E';c.fill();}
  c.restore();
}

export function bakeS08Washes(){
  bake('s08.congestion',(b,P)=>{P.fill(b,P.blob(0,0,75,18,.3,47),'#C86A87',130,.2);},{seed:47,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});
  bake('s08.lumen', (b,P)=>{P.fill(b,P.blob(0,0,300,22,.2,43),'#DCA4B2',200,.15);},{seed:43,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});
  bake('s08.pus.escape',(b,P)=>{const fan=[[-75,150],[-100,90],[-165,22],[-222,-60],[-255,-145],[-184,-210],[-130,-185],[-65,-245],[8,-213],[75,-250],[145,-190],[227,-162],[185,-82],[140,-25],[111,52],[68,130],[38,180],[-15,198]];P.fill(b,fan,'#E9B4B7',85,.65);P.fill(b,fan.map(([x,y])=>[x*.72+12,y*.82+28]),'#E7C5A4',70,.7);},{seed:40720,hd:true,soft:true,grain:.12,edge:.18,bleed:.85});
}

// Verbatim s08.js buildSource. Do not add branches here.
function buildSourceVerbatim(mode){const source=document.createElement('canvas');source.width=840;source.height=620;const c=source.getContext('2d'),R=rng(40802);c.translate(420,320);(mode==='original'?drawHE:drawMucosa)(c,{ulcer:.16,neut:0,fibrin:0,t:0,detail:1,crypts:mode!=='low',gap:mode==='ulcer'?[-25,45]:null});
const copy=document.createElement('canvas');copy.width=840;copy.height=620;copy.getContext('2d').drawImage(source,0,0);
c.drawImage(copy,0,155,840,18,-420,140,840,90);c.drawImage(copy,0,330,840,5,-420,-153,840,5);
for(let i=0;i<150;i++){const x=-410+R()*820,y=-280+R()*120,sz=.7+R()*.2,rot=R()*TAU;if(mode==='ulcer'&&x>-31&&x<51&&y<-273)continue;cell(c,x,y,i%7?'lymph':'plasma',sz,rot,i);}
[-390,40,360].forEach(x=>{c.save();c.translate(x,-55);c.scale(.78,.78);follicle(c,0,0);c.restore();});for(let i=0;i<85;i++)cell(c,-410+R()*820,148+R()*76,'dot',.9,R()*TAU,i);for(let i=0;i<62;i++)cell(c,-414+i*13.5,274+Math.sin(i*.4)*2,'meso',.8,0,i);
let n=0;for(const p of CELLS){if(p.kind!=='inf'||p.y>138||p.y<-290)continue;if(mode==='ulcer'&&p.x>-31&&p.x<51&&p.y<-273)continue;if(p.y>0&&n++%35!==0)continue;if(p.y<0&&n++%4!==0)continue;detailedNeutrophil(c,p.x,p.y,p,1);}for(let i=0;i<7;i++)detailedNeutrophil(c,-270+Math.cos(i*.55)*(26+i*3),-80+Math.sin(i*.55)*(23+i*3),{lobes:2+i%4,rot:i*.8,sz:.9},1);
if(mode==='ulcer'){const extended=document.createElement('canvas');extended.width=840;extended.height=750;const e=extended.getContext('2d');e.drawImage(source,0,130);e.translate(420,450);escapedPus(e);ulcerDetail(e);return extended;}return source;}

export const wallRoster=[];

function buildSourceTuned(mode, opt){
  const fullWall=!!opt.fullWall, pus=!!opt.pus, fibrinK=+opt.fibrin||0;
  const source=document.createElement('canvas');source.width=840;source.height=620;const c=source.getContext('2d'),R=rng(40802);c.translate(420,320);(mode==='original'?drawHE:drawMucosa)(c,{ulcer:.16,neut:0,fibrin:0,t:0,detail:1,crypts:mode!=='low',gap:mode==='ulcer'?[-25,45]:null});
  const copy=document.createElement('canvas');copy.width=840;copy.height=620;copy.getContext('2d').drawImage(source,0,0);
  c.drawImage(copy,0,155,840,18,-420,140,840,90);c.drawImage(copy,0,330,840,5,-420,-153,840,5);
  for(let i=0;i<150;i++){const x=-410+R()*820,y=-280+R()*120,sz=.7+R()*.2,rot=R()*TAU;if(mode==='ulcer'&&x>-31&&x<51&&y<-273)continue;cell(c,x,y,i%7?'lymph':'plasma',sz,rot,i);}
  [-390,40,360].forEach(x=>{c.save();c.translate(x,-55);c.scale(.78,.78);follicle(c,0,0);c.restore();});
  for(let i=0;i<85;i++)cell(c,-410+R()*820,148+R()*76,'dot',.9,R()*TAU,i);
  for(let i=0;i<62;i++)cell(c,-414+i*13.5,274+Math.sin(i*.4)*2,'meso',.8,0,i);
  if(fullWall){
    const E=rng(40722);let n=0;
    for(const p of CELLS){
      if(p.kind!=='inf')continue;
      if((mode==='ulcer'||pus)&&p.x>-31&&p.x<51&&p.y<-273)continue;
      // Right muscularis: leave interfascicular gaps for the edema in sentence 41.
      if(p.x>160&&p.y>8&&p.y<220&&Math.abs(p.x-250)<100&&Math.abs((p.y-28)-Math.round((p.y-28)/42)*42)<16)continue;
      const sz=p.sz||1, deg=n++%3===1;
      if(deg)drawDegenerate(c,p.x,p.y,sz,p.rot||0,E);
      else detailedNeutrophil(c,p.x,p.y,p,1);
      wallRoster.push({x:p.x,y:p.y,sz,deg,src:'wall'});
    }
  }else{
    let n=0;for(const p of CELLS){if(p.kind!=='inf'||p.y>138||p.y<-290)continue;if(mode==='ulcer'&&p.x>-31&&p.x<51&&p.y<-273)continue;if(p.y>0&&n++%35!==0)continue;if(p.y<0&&n++%4!==0)continue;detailedNeutrophil(c,p.x,p.y,p,1);}
  }
  for(let i=0;i<7;i++){
    const x=-270+Math.cos(i*.55)*(26+i*3), y=-80+Math.sin(i*.55)*(23+i*3);
    detailedNeutrophil(c,x,y,{lobes:2+i%4,rot:i*.8,sz:.9},1);
    if(fullWall)wallRoster.push({x,y,sz:.9,deg:false,src:'rim'});
  }
  if(fullWall){
    // Pale fluid on top of the opened gaps. Local to the right muscle, not a field grade.
    c.save();c.fillStyle='rgba(248,240,244,.9)';
    for(let j=0;j<5;j++){const yy=28+j*42;c.beginPath();c.ellipse(250,yy,108,13,.05,0,TAU);c.fill();}
    c.restore();
  }
  if(fibrinK)fibrinMesh(c,fibrinK);
  if(mode==='ulcer'||pus){
    const extended=document.createElement('canvas');extended.width=840;extended.height=750;const e=extended.getContext('2d');e.drawImage(source,0,130);e.translate(420,450);escapedPus(e);if(mode==='ulcer')ulcerDetail(e);return extended;
  }
  return source;
}

export function buildSource(mode, opt){
  if(!opt||(!opt.fullWall&&!opt.pus&&!opt.fibrin))return buildSourceVerbatim(mode);
  return buildSourceTuned(mode, opt);
}

export function mapSource(src, opt){
  const im=src.getContext('2d').getImageData(0,0,840,src.height);
  const top=opt&&opt.top!=null?opt.top:(src.height===750?450:320);
  const outer=opt&&opt.outer!=null?opt.outer:280;
  const result=document.createElement('canvas');result.width=3200;result.height=2100;
  const mc=result.getContext('2d'),out=mc.createImageData(3200,2100);
  const src32=new Uint32Array(im.data.buffer,im.data.byteOffset,im.data.byteLength>>2);
  const dst32=new Uint32Array(out.data.buffer);
  const co=Math.cos(.14),si=Math.sin(.14);
  for(let j=0;j<2100;j++){
    const row=j*3200;
    const v=j-1050;
    for(let i=0;i<3200;i++){
      const u=i-1600,x=(u*co+v*si)/1.6,y=-u*si+v*co,a=Math.atan2(y,x),fy=Math.hypot(x,y)-620-12*Math.sin(a*3)-9*Math.sin(a*5);
      if(fy<-top||fy>=outer)continue;
      let fx=((a+Math.PI/2)*620+420)%840;if(fx<0)fx+=840;
      const siPx=Math.floor(fy+top)*840+Math.floor(fx);
      if(siPx<0||siPx>=src32.length)continue;
      dst32[row+i]=src32[siPx];
    }
  }
  mc.putImageData(out,0,0);return result;
}

function ulcerDetail(c){
 const U=rng(40712);
 for(const [x,sign] of [[-27,1],[47,-1]])for(let j=0;j<3;j++)columnar(c,x+sign*(j*1.8),-290-j*3.5,.48+U()*.15,sign*(.4+j*.28),j,'fray');
 drawWash(c,'s08.congestion',10,-266,115,{alpha:.55});
 for(let i=0;i<13;i++){const x=-18+U()*55,y=-278+U()*20,rot=U()*TAU;erythrocyte(c,x,y,.65,rot,i);if(ulcerDetail.log)ulcerDetail.log.push({x,y,sz:.65,rbc:true,src:'rbc'});}
 c.strokeStyle='rgba(213,153,174,.55)';c.lineWidth=.42;
 for(let i=0;i<52;i++){const x=-24+U()*62,y=-294+U()*4;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+5,y-3,x+5+U()*7,y+U()*4-1);c.stroke();}
 c.strokeStyle='rgba(221,166,185,.30)';c.lineWidth=.32;
 for(let i=0;i<58;i++){const x=-33+U()*88,y=-337+U()*36;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+4,y-4,x+8+U()*5,y+5);c.stroke();}
 const exudate=[[-39,-303],[-23,-302],[-10,-300],[4,-301],[19,-300],[34,-302],[51,-304],
 [-29,-314],[-15,-313],[0,-312],[14,-314],[29,-312],[44,-314],
 [-20,-327],[-4,-326],[12,-328],[27,-326],[5,-341],[-48,-316],[61,-317]];
 for(let i=0;i<exudate.length;i++){const [x,y]=exudate[i],rot=U()*TAU,sz=.80+U()*.08;if(ulcerDetail.log)ulcerDetail.log.push({x,y,sz,rot,deg:false,src:'ulcer'});detailedNeutrophil(c,x,y,{lobes:2+i%4,rot,sz},1);}
}
ulcerDetail.log=null;

function escapedPus(c){
 const E=rng(40721);
 c.save();c.translate(0,-340);c.scale(1.18,.62);c.translate(0,340);drawWash(c,'s08.pus.escape',12,-372,340,{alpha:.68,soft:.8});c.restore();
 const pts=[[-53,-344],[-34,-348],[-12,-350],[12,-351],[35,-346],[57,-345],[77,-349],[-67,-360],[-45,-367],[-23,-363],[0,-370],[23,-368],[47,-364],[70,-369],[-76,-382],[-51,-383],[-26,-386],[4,-386],[32,-384],[62,-389],[87,-380],[-62,-401],[-34,-408],[-4,-405],[27,-409],[55,-406],[-81,-417],[-42,-428],[3,-424],[41,-429],[-14,-441],[67,-438]];
 const log=escapedPus.log;
 for(let i=0;i<pts.length;i++){
  const x=pts[i][0]*1.18+(E()-.5)*7,y=-340+(pts[i][1]+340)*.62+(E()-.5)*5,d=Math.max(0,(-y-342)/65),sz=.70-d*.31,rot=E()*TAU;
  if(log)log.push({x,y,sz,rot,deg:i%3===1,i,src:'pus'});
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
 for(let i=0;i<27;i++){const y=-345-E()*52,x=12+(E()-.5)*(140+(-y-345)*.9);if(log)log.push({x,y,kind:'fibre',i,src:'fibre'});c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+6,y-3,x-3,y-7,x+7,y-12);c.stroke();}
 for(const [i,x,y] of [[0,-57,-353],[1,48,-365],[2,-26,-379],[3,88,-382]]){c.save();c.globalAlpha=.45;erythrocyte(c,x,y,.38,E()*TAU,i);c.restore();}
}
escapedPus.log=null;

export const serosaSurface=[];
function buildSerosaSource(){
  const extended=document.createElement('canvas');extended.width=840;extended.height=1100;
  const e=extended.getContext('2d');e.translate(420,450);
  // Readable pus cells sitting in the serosal fibrin band. Same two painters as escapedPus.
  const E=rng(40724);serosaSurface.length=0;
  for(let i=0;i<48;i++){
    const x=-200+(i%8)*52+(i%3)*7, y=296+(i%4)*14, sz=.90+(i%4)*.025, rot=((i*5)%11)*.35, deg=i%3===1;
    if(deg)drawDegenerate(e,x,y,sz,rot,E);
    else detailedNeutrophil(e,x,y,{lobes:2+(i%4),rot,sz},1);
    serosaSurface.push({x,y,sz,rot,deg,src:'surface'});
  }
  e.translate(SEROSA_DX,SEROSA_DY);escapedPus(e);return extended;
}
function buildFibrinSource(){
  const extended=document.createElement('canvas');extended.width=840;extended.height=1100;
  const e=extended.getContext('2d');e.translate(420,450);fibrinMesh(e,1);return extended;
}

export let wallMap=null,fibrinMap=null,serosaMap=null,lumenLog=[],lumenFibres=[],serosaLog=[],ulcerLog=[];
let refMap=null,refUlcer=null;

export function prepareScene(){
  console.log('b09 prepare scene');
  bakeS08Washes();
  wallRoster.length=0;
  escapedPus.log=[];
  ulcerDetail.log=[];
  const src=buildSource('ulcer',{fullWall:true,pus:true});
  lumenLog=escapedPus.log.filter(p=>p.src==='pus');
  lumenFibres=escapedPus.log.filter(p=>p.src==='fibre');
  ulcerLog=ulcerDetail.log.slice();
  ulcerDetail.log=null;
  wallMap=mapSource(src);
  escapedPus.log=[];
  const ser=buildSerosaSource();
  serosaLog=serosaSurface.concat(escapedPus.log.filter(p=>p.src==='pus').map(p=>({...p,x:p.x+SEROSA_DX,y:p.y+SEROSA_DY})));
  serosaMap=mapSource(ser,{top:450,outer:520});
  fibrinMap=mapSource(buildFibrinSource(),{top:450,outer:520});
  escapedPus.log=null;
  console.log('b09 scene ready', wallRoster.length, lumenLog.length, serosaLog.length);
}

export function prepareReference(){
  bakeS08Washes();
  escapedPus.log=null;
  const source=buildSource('original');
  buildSource('low');
  const ulcer=buildSource('ulcer');
  refUlcer=mapSource(ulcer);
  refMap=mapSource(source);
}

export function renderReference(c,t,T){
  c.setTransform(1,0,0,1,0,0);c.fillStyle='#111114';c.fillRect(0,0,1920,1080);
  const id=Math.min(34,29+Math.floor(t/(T.end(29)-T.at(29))));
  const targets={30:[-270,-80],31:[-200,-226],32:[-170,70],33:[-65,-215],34:[10,-285]};
  const keys=[[T.at(29),[0,0,.48]],[T.frac(29,.28),[0,0,.48]],[T.frac(29,.64),[...point(-90,-5),.82]],[T.end(29),[...point(...targets[30]),2.7]]];
  for(let s=30;s<=34;s++)keys.push([T.frac(s,.32),[...point(...targets[s]),2.7]],[T.end(s),[...point(...targets[s]),2.7]]);
  let v=keys[0][1];
  for(let i=1;i<keys.length;i++){if(t>=keys[i][0]){v=keys[i][1];continue;}const a=keys[i-1],b=keys[i],k=Math.max(0,(t-a[0])/(b[0]-a[0]));v=a[1].map((x,j)=>x+(b[1][j]-x)*k);break;}
  const [x,y,z]=v;
  c.save();c.beginPath();c.arc(1110,475,425,0,TAU);c.clip();c.fillStyle='#F6EEF0';c.fill();c.translate(1110,475);c.scale(z,z);c.translate(-x,-y);
  c.drawImage(id===34?refUlcer:refMap,-1600,-1050);c.restore();
  c.strokeStyle='#4C4555';c.lineWidth=1.6;c.beginPath();c.arc(1110,475,431,0,TAU);c.stroke();
  c.fillStyle='#E8DDE9';c.font='500 30px MixSans';c.fillText(t<T.frac(29,.32)?'低倍':t<T.frac(29,.86)?'中倍':'高倍',1030,35);
  const text={29:['正常阑尾参照','隐窝 · 固有层','黏膜肌层 · 淋巴滤泡','内环肌 / 外纵肌 · 浆膜'],30:['黏膜下层','血管扩张、充血','中性粒细胞沿血管壁游出'],31:['黏膜与固有层','中性粒细胞浸润','淋巴细胞与浆细胞参照'],32:['固有肌层','内环行肌：长梭形核','外纵行肌：圆点核','中性粒细胞仅少量'],33:['返回黏膜','经过受损的隐窝与上皮'],34:['局灶上皮缺损','结构连续性中断','病变以黏膜、黏膜下层为主']};
  const phase=(t-T.at(id))/(T.end(id)-T.at(id));
  c.save();c.globalAlpha=Math.max(0,Math.min(1,phase/.1,(1-phase)/.1));
  text[id].forEach((s,i)=>{c.font=`${i?400:700} ${i?27:36}px MixSans`;c.fillText(s,75,320+i*56);});
  c.strokeStyle='#BFA9CB';c.lineWidth=1.6;c.beginPath();c.moveTo(475,410);c.lineTo(630,410);
  const target=id===29?[-90,-55]:targets[id];
  const tip=point(...target);
  c.lineTo(1110+(tip[0]-x)*z,475+(tip[1]-y)*z);c.stroke();c.restore();
}
