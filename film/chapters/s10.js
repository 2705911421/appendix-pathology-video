// S10/S11 (sentences 37–46). Tissue is b09_pus (b10 drawing). Camera z is the real-magnification pass.
import {drawDegenerate,point,screenOf,bodyPx,wallRoster,lumenLog,lumenFibres,serosaLog,ulcerLog,wallMap,fibrinMap,serosaMap,prepareScene,prepareReference,renderReference} from '../lib_ext/b09_pus.js';
import {detailedNeutrophil} from '../lib/he_detail.js';
import {rng} from '../lib/motion.js';

const TAU=Math.PI*2;
const params=new URLSearchParams(location.search);
const faith=params.get('faith');
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const NOM_UM=11; // nominal neutrophil diameter used to turn a measured body into px/µm

// Starting zooms. Probe rewrites these only by editing this table after a measurement pass.
const Z={
  wide:0.226,
  mid:0.40,
  hi:0.85,
  hiLumen:0.85,
  oil:2.45,
  hiSerosa:0.78,
  midSerosa:0.40,
};

const TEXT={
  37:['第二幕 黄'],
  38:['化脓性阑尾炎','（蜂窝织炎性阑尾炎）'],
  39:['中性粒细胞浸润','部分变性坏死'],
  40:['脓液','脓细胞','组织碎屑','渗出液'],
  41:['渗出伴随局部肿胀'],
  42:['脓细胞','变性坏死的中性粒细胞'],
  43:['纤维蛋白原','凝成纤维素网'],
  44:['纤维脓性渗出物'],
  45:['纤维素：部分','脓细胞：主要'],
  46:['浆膜面：','纤维素性脓性渗出','（含脓细胞）'],
};

function magName(pxPerUm, oil){
  if(oil)return '油镜';
  if(pxPerUm<0.6)return '低倍';
  if(pxPerUm<=1.23)return '中倍';
  return '高倍';
}
function median(a){
  if(!a.length)return null;
  const s=a.slice().sort((p,q)=>p-q);
  const m=s.length>>1;
  return s.length%2?s[m]:(s[m-1]+s[m])/2;
}
function inside(sx,sy,r=405){return (sx-1110)*(sx-1110)+(sy-475)*(sy-475)<r*r;}

function collect(camX,camY,z, oilCells, withSerosa){
  const px=[], flags=[];
  const add=(fx,fy,sz,deg,mode)=>{
    if(mode!=='oil'&&(fy>275||fy<-445))return;
    const s=screenOf(fx,fy,camX,camY,z);
    if(!inside(s[0],s[1]))return;
    const d=mode==='oil'?20.4*sz*z:bodyPx(fx,fy,sz,z);
    px.push(d); flags.push(!!deg);
  };
  if(oilCells){
    for(const q of oilCells)add(q.fx,q.fy,q.sz,q.deg,'oil');
  }else{
    for(const q of wallRoster)add(q.x,q.y,q.sz,q.deg);
    for(const q of lumenLog)add(q.x,q.y,q.sz,q.deg);
    for(const q of ulcerLog)if(!q.rbc)add(q.x,q.y,q.sz,q.deg);
    if(withSerosa)for(const q of serosaLog)add(q.x,q.y,q.sz,q.deg);
  }
  const med=median(px);
  let deg=0; for(const f of flags)if(f)deg++;
  const pxPerUm=med==null?null:med/NOM_UM;
  const fov=pxPerUm==null?475:pxPerUm>1.23?475:pxPerUm>=0.6?1000:2000;
  return {n:px.length, medianPx:med, pxPerUm, fov, impliedUm:med==null?null:med/(850/fov), deg, degRatio:px.length?deg/px.length:null};
}

let anchors=null;
function buildAnchors(){
  const cells=lumenLog;
  let best=cells[0], bd=1e9;
  for(const q of cells){const d=(q.x-8)**2+(q.y+370)**2; if(d<bd){bd=d; best=q;}}
  // 组织碎屑 = the torn epithelial shreds at the ulcer edge (real tissue debris),
  // not a fibrin fibre: the shred at field (47,-290) renders at screen (1146,468)
  // with visible nuclear material.
  const debris={x:47,y:-290};
  const fluid={x:150,y:-330};
  const fan={x:12,y:-375};
  // serosaLine: field y=265 is mid-serosa band [230,280], visually clear of muscularis.
  // exudate: y=315 is in fibrin/exudate band above serosa surface.
  anchors={pusCell:best, debris, fluid, fan, serosaLine:{x:80,y:265}, exudate:{x:80,y:315}};
}

const OIL=[{fx:65,fy:55,sz:1,deg:false,lobes:3,rot:.4},{fx:105,fy:36,sz:.96,deg:true,rot:.15},{fx:132,fy:60,sz:.93,deg:true,rot:.55},{fx:104,fy:88,sz:.90,deg:true,rot:1.1}];

export default {prepare(){
  if(faith){prepareReference();return;}
  prepareScene();
  buildAnchors();
},draw(c,t,T){
  if(faith){
    const legacy={at:id=>(id-29)*6,end:id=>(id-28)*6,frac:(id,f)=>(id-29+f)*6};
    renderReference(c, faith==='s34'?33:15, legacy);
    window.__metrics={faith, t:faith==='s34'?33:15};
    return;
  }
  const ids=[37,38,39,40,41,42,43,44,45,46];
  const id=ids.find(n=>t<T.end(n))||46;
  const muscle=point(-160,95), dense=point(-180,60), lumen=point(0,-305), edema=point(280,100), compare=point(102,60), serosa=point(80,300);
  const keys=[
    [0,[120,120,Z.wide]],
    [T.frac(37,.55),[120,120,Z.wide]],
    [T.frac(38,.28),[...muscle,Z.mid]],
    [T.end(38),[...muscle,Z.mid]],
    [T.frac(39,.28),[...dense,Z.hi]],
    [T.end(39),[...dense,Z.hi]],
    [T.frac(40,.28),[...lumen,Z.hiLumen]],
    [T.end(40),[...lumen,Z.hiLumen]],
    [T.frac(41,.28),[...edema,Z.mid]],
    [T.end(41),[...edema,Z.mid]],
    [T.frac(42,.28),[...compare,Z.oil]],
    [T.end(42),[...compare,Z.oil]],
    [T.frac(43,.23),[...serosa,Z.hiSerosa]],
    [T.end(45),[...serosa,Z.hiSerosa]],
    [T.frac(46,.4),[...serosa,Z.midSerosa]],
    [T.end(46)+1,[...serosa,Z.midSerosa]],
  ];
  let v=keys[0][1];
  for(let i=1;i<keys.length;i++){
    if(t>=keys[i][0]){v=keys[i][1];continue;}
    const a=keys[i-1],b=keys[i],f=smooth((t-a[0])/Math.max(1e-6,b[0]-a[0]));
    v=a[1].map((q,j)=>q+(b[1][j]-q)*f);break;
  }
  const [x,y,z]=v;
  const growth=smooth((t-T.frac(43,.23))/Math.max(1e-6,T.end(43)-T.frac(43,.23)));
  const cellsIn=smooth((t-T.at(44))/Math.max(1e-6,T.frac(44,.35)-T.at(44)));
  const second=id===45&&t>=T.frac(45,.5);
  const netAlpha=t<T.frac(43,.23)?0:id===45?(second?.25:1):Math.min(1,growth);
  const cellAlpha=t<T.at(44)?0:id===45?(second?1:.22):Math.min(1,cellsIn);

  c.setTransform(1,0,0,1,0,0);c.fillStyle='#111114';c.fillRect(0,0,1920,1080);
  c.save();c.beginPath();c.arc(1110,475,425,0,TAU);c.clip();c.fillStyle='#F6EEF0';c.fill();
  c.translate(1110,475);c.scale(z,z);c.translate(-x,-y);
  c.drawImage(wallMap,-1600,-1050);
  if(netAlpha>0.001){c.save();c.globalAlpha=netAlpha;c.drawImage(fibrinMap,-1600,-1050);c.restore();}
  if(cellAlpha>0.001){c.save();c.globalAlpha=cellAlpha;c.drawImage(serosaMap,-1600,-1050);c.restore();}
  let oilScreen=null;
  if(id===42){
    const fade=smooth((t-T.at(42))/Math.max(1e-6,T.frac(42,.22)-T.at(42)));
    c.save();c.globalAlpha=fade;
    // No hub ellipse (it mapped to a large atlas-coord blob at z=2.45).
    // A subtle brightening is added via a screen-space radial after restore.
    const E=rng(40723);
    oilScreen=[];
    for(const q of OIL){
      const p=point(q.fx,q.fy);
      if(q.deg)drawDegenerate(c,p[0],p[1],q.sz,q.rot,E);
      else detailedNeutrophil(c,p[0],p[1],{lobes:q.lobes,rot:q.rot,sz:q.sz},1);
      oilScreen.push({...q, sx:1110+(p[0]-x)*z, sy:475+(p[1]-y)*z});
    }
    c.restore();
  }
  c.restore();
  c.strokeStyle='#4C4555';c.lineWidth=1.6;c.beginPath();c.arc(1110,475,431,0,TAU);c.stroke();

  const oil=id===42;
  const stats=collect(x,y,z,oil?OIL:null,cellAlpha>0.15);
  const pxPerUm=stats.pxPerUm==null?0:stats.pxPerUm;
  if(oil && stats.medianPx!=null){stats.fov=190;stats.impliedUm=stats.medianPx/(850/190);}
  const mag=magName(pxPerUm, oil);
  c.fillStyle='#E8DDE9';c.font='500 36px MixSans';c.fillText(mag,1030,36);

  const phase=(t-T.at(id))/Math.max(1e-6,T.end(id)-T.at(id));
  const alpha=Math.max(0,Math.min(1,phase/.10,id===42||id===46?1:(1-phase)/.10));
  const lines=TEXT[id];
  const leaders=[];
  c.save();c.globalAlpha=alpha;c.fillStyle='#E8DDE9';c.textBaseline='alphabetic';
  lines.forEach((s,i)=>{c.font=`${i?400:700} ${i?36:44}px MixSans`;c.fillText(s,75,320+i*56);});
  c.strokeStyle='#BFA9CB';c.lineWidth=1.15;c.lineCap='round';
  const lead=(name,tx,ty,fx,fy,color)=>{
    const [sx,sy]=screenOf(fx,fy,x,y,z);
    c.beginPath();c.moveTo(tx,ty);c.lineTo(sx,sy);c.stroke();
    leaders.push({name,label:[tx,ty],target:[+sx.toFixed(2),+sy.toFixed(2)],field:[fx,fy],dist:0});
    return [sx,sy];
  };
  if(id===40 && anchors){
    c.font='400 36px MixSans';
    const rows=[['脓液',anchors.fan],['脓细胞',anchors.pusCell],['组织碎屑',anchors.debris],['渗出液',anchors.fluid]];
    rows.forEach((row,i)=>{
      const label=row[0], target=row[1];
      c.font=`${i?400:700} ${i?36:44}px MixSans`;
      const w=c.measureText(label).width;
      lead(label, 75+w+12, 320+i*56-10, target.x, target.y);
    });
  }
  if(id===42 && oilScreen && t>=T.frac(42,.2)){
    c.fillStyle='#51336F';c.font='400 36px MixSans';
    c.fillText('中性粒细胞',835,270);
    const intact=oilScreen[0];
    c.beginPath();c.moveTo(990,278);c.lineTo(intact.sx,intact.sy);c.stroke();
    leaders.push({name:'中性粒细胞',label:[835,270],from:[990,278],target:[+intact.sx.toFixed(2),+intact.sy.toFixed(2)],dist:0});
    c.fillText('脓细胞',1230,700);
    oilScreen.slice(1).forEach(q=>{
      c.beginPath();c.moveTo(1248,688);c.lineTo(q.sx,q.sy);c.stroke();
      leaders.push({name:'脓细胞',label:[1230,700],from:[1248,688],target:[+q.sx.toFixed(2),+q.sy.toFixed(2)],dist:0});
    });
  }
  if(id===46 && anchors){
    c.fillStyle='#51336F';c.font='400 36px MixSans';
    c.fillText('浆膜',960,580);
    lead('浆膜',995,572,anchors.serosaLine.x,anchors.serosaLine.y);
    c.fillStyle='#51336F';
    c.fillText('纤维素性脓性渗出',1100,300);
    lead('纤维素性脓性渗出',1240,308,anchors.exudate.x,anchors.exudate.y);
  }
  c.restore();

  window.__T=T;
  window.__metrics={
    id,t:+t.toFixed(4),z:+z.toFixed(4),mag,pxPerUm,fov:stats.fov,n:stats.n,
    medianPx:stats.medianPx,impliedUm:stats.impliedUm,deg:stats.deg,degRatio:stats.degRatio,
    netAlpha,cellAlpha,leaders,
    sentence:{start:T.at(id),end:T.end(id)},
  };
}};
