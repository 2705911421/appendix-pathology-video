// Original deterministic teaching drawings for the CT line (round 2).
// Radiological axial orientation: patient right is image left.
// The appendix keeps the same local anchor in every preset: (-.50R, +.12R).
const TAU=Math.PI*2, ink='#2A2A35', purple='#6B4C9A', lav='#B9A6CC', lavD='#D3C2E0';
const PAPER='#F4EFE6';

export function paper(c){c.setTransform(1,0,0,1,0,0);c.fillStyle=PAPER;c.fillRect(0,0,1920,1080);}
export function text(c,s,x,y,size=36,color=ink,weight=500,alpha=1){
  if(alpha<=0)return;c.save();c.globalAlpha*=alpha;c.fillStyle=color;c.font=`${weight} ${size}px MixSans`;c.fillText(s,x,y);c.restore();
}
function clamp(v,a=0,b=1){return Math.max(a,Math.min(b,v));}
function smooth(t){t=clamp(t);return t*t*(3-2*t);}
export function ramp(t,start,dur=.7){return smooth((t-start)/dur);}
function rand(seed){let a=seed>>>0;return()=>{a=(a*1664525+1013904223)>>>0;return a/4294967296;};}

function ePath(c,cx,cy,rx,ry,seed,amp=.012,n=96){
  c.beginPath();
  for(let i=0;i<=n;i++){const a=i/n*TAU,r=1+amp*Math.sin(a*3+seed)+amp*.6*Math.sin(a*7+seed*1.7)+amp*.4*Math.sin(a*11+seed*.31);const x=cx+Math.cos(a)*rx*r,y=cy+Math.sin(a)*ry*r;i?c.lineTo(x,y):c.moveTo(x,y);}
  c.closePath();
}
function blob(c,cx,cy,rx,ry,seed,amp,color){ePath(c,cx,cy,rx,ry,seed,amp);c.fillStyle=color;c.fill();}
function strokeBlob(c,cx,cy,rx,ry,seed,amp,color,lw){ePath(c,cx,cy,rx,ry,seed,amp);c.strokeStyle=color;c.lineWidth=lw;c.stroke();}

function speckle(c,cx,cy,rx,ry,seed,count,color,amin=.02,amax=.07,maxR=11){
  const r=rand(seed);c.save();ePath(c,cx,cy,rx,ry,seed,.02);c.clip();
  for(let i=0;i<count;i++){
    c.globalAlpha=amin+r()*(amax-amin);
    c.fillStyle=color;
    const rr=1+r()*maxR, a=r()*TAU, d=Math.sqrt(r());
    c.beginPath();c.ellipse(cx+Math.cos(a)*rx*d,cy+Math.sin(a)*ry*d,rr,rr*(.35+r()*.55),a,0,TAU);c.fill();
  }
  c.restore();
}

function mottle(c,cx,cy,rx,ry,seed,count,color,alphaMax=.055,maxR=28){
  const r=rand(seed);c.save();ePath(c,cx,cy,rx,ry,seed,.02);c.clip();
  for(let i=0;i<count;i++){
    const a=r()*TAU,d=Math.sqrt(r());
    c.globalAlpha=.02+r()*alphaMax;c.fillStyle=color;
    c.beginPath();c.ellipse(cx+Math.cos(a)*rx*d,cy+Math.sin(a)*ry*d,8+r()*maxR,5+r()*maxR*.6,r()*TAU,0,TAU);c.fill();
  }
  c.globalAlpha=1;c.restore();
}
function ring(c,cx,cy,r0,r1,color,seed=1,amp=.012){
  const n=90;c.beginPath();
  for(let i=0;i<=n;i++){const a=i/n*TAU,r=r1*(1+amp*Math.sin(a*4+seed));const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y);}
  for(let i=n;i>=0;i--){const a=i/n*TAU,r=r0*(1+amp*Math.sin(a*4+seed));c.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}
  c.closePath();c.fillStyle=color;c.fill();
}

function sectorPath(c,CX,CY,r0,r1,a0,a1,seed=1,amp=.003){
  const n=70;c.beginPath();
  for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n,r=r1*(1+amp*Math.sin(a*5+seed));const x=CX+Math.cos(a)*r,y=CY+Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y);}
  for(let i=n;i>=0;i--){const a=a0+(a1-a0)*i/n,r=r0*(1+amp*Math.sin(a*5+seed));c.lineTo(CX+Math.cos(a)*r,CY+Math.sin(a)*r);}
  c.closePath();
}

// ── axial geometry ────────────────────────────────────────────────────────────
export function ctGeom(x,y,w,h,{lens=true,compact=false}={}){
  if(compact){
    const R=Math.min(w*.37,h*.33);
    return {x,y,w,h,R,cx:x+w*.5,cy:y+h*.46,lens:null,appendix:{x:x+w*.5-R*.50,y:y+h*.46+R*.12},compact:true};
  }
  const wide=w/h>1.05;
  const R=wide?Math.min(w*.23,h*.34):Math.min(w*.35,h*.31);
  const cx=wide?x+w*.30:x+w*.47;
  const cy=y+h*.38;
  const lr=wide?Math.min(w*.14,h*.19):Math.min(w*.20,h*.18);
  const lx=wide?x+w*.75:x+w*.77;
  const ly=wide?y+h*.72:y+h*.79;
  return {x,y,w,h,R,cx,cy,lens:lens?{x:lx,y:ly,r:lr}:null,appendix:{x:cx-R*.50,y:cy+R*.12},wide};
}

function drawBody(c,g,seed=11){
  const {cx,cy,R}=g;
  // skin + subcutaneous fat (lobulated, not a smooth ring)
  ePath(c,cx,cy,R,R*.86,seed,.026);c.fillStyle='#BAB5AD';c.fill();
  c.strokeStyle='#E8E2D7';c.lineWidth=1.6;c.stroke();
  mottle(c,cx,cy,R*.97,R*.83,seed+2,80,'#8F8B84',.05,26);
  mottle(c,cx,cy,R*.97,R*.83,seed+3,60,'#E4DED3',.05,22);
  // abdominal wall muscle
  ePath(c,cx,cy,R*.92,R*.78,seed+4,.022);c.fillStyle='#8B8882';c.fill();
  mottle(c,cx,cy,R*.91,R*.77,seed+5,52,'#6F6C67',.05,24);
  // rectus muscles + linea alba
  for(const s of [-1,1]){
    blob(c,cx+s*R*.20,cy-R*.60,R*.085,R*.105,seed+21+s,.04,'#96928B');
    strokeBlob(c,cx+s*R*.20,cy-R*.60,R*.085,R*.105,seed+21+s,.04,'#B6B1A7',1.1);
  }
  c.strokeStyle='rgba(190,185,175,.45)';c.lineWidth=1.4;
  c.beginPath();c.moveTo(cx,cy-R*.70);c.lineTo(cx,cy-R*.53);c.stroke();
  // intra-abdominal fat
  ePath(c,cx,cy,R*.85,R*.70,seed+6,.02);c.fillStyle='#6D6A65';c.fill();
  mottle(c,cx,cy,R*.84,R*.69,seed+7,110,'#8E8A83',.05,30);
  mottle(c,cx,cy,R*.84,R*.69,seed+8,80,'#55534F',.05,26);
  // mesenteric strands
  const r=rand(seed+9);
  c.save();ePath(c,cx,cy,R*.83,R*.68,seed+6,.014);c.clip();
  for(let i=0;i<46;i++){
    const a=r()*TAU,d=.25+r()*.7;
    const x1=cx+Math.cos(a)*R*d,y1=cy+Math.sin(a)*R*d*.82;
    const x2=x1+(r()*2-1)*R*.22,y2=y1+(r()*2-1)*R*.16;
    c.strokeStyle=`rgba(178,173,163,${.10+r()*.16})`;c.lineWidth=1+r()*1.6;
    c.beginPath();c.moveTo(x1,y1);c.quadraticCurveTo((x1+x2)/2+(r()*2-1)*18,(y1+y2)/2+(r()*2-1)*12,x2,y2);c.stroke();
  }
  c.restore();
}

function drawPosterior(c,g,seed=31){
  const {cx,cy,R}=g;
  // psoas muscles
  for(const s of [-1,1]){
    blob(c,cx+s*R*.40,cy+R*.37,R*.145,R*.205,seed+s,.03,'#918E87');
    strokeBlob(c,cx+s*R*.40,cy+R*.37,R*.145,R*.205,seed+s,.03,'#B7B2A8',1.2);
    const r=rand(seed+7+s);
    c.save();ePath(c,cx+s*R*.40,cy+R*.37,R*.14,R*.20,seed+s,.03);c.clip();
    for(let i=0;i<22;i++){c.strokeStyle=`rgba(198,193,183,${.10+r()*.14})`;c.lineWidth=1;c.beginPath();const yy=cy+R*.37-R*.19+i*R*.017;c.moveTo(cx+s*R*.52,yy);c.lineTo(cx+s*R*.28,yy+3);c.stroke();}
    c.restore();
  }
  // iliac bones (bright cortical crescents)
  for(const s of [-1,1]){
    c.save();c.strokeStyle='#D9D4C9';c.lineWidth=R*.052;c.lineCap='round';
    c.beginPath();c.moveTo(cx+s*R*.56,cy+R*.05);c.quadraticCurveTo(cx+s*R*.79,cy+R*.16,cx+s*R*.70,cy+R*.35);c.stroke();
    c.strokeStyle='#A7A39A';c.lineWidth=R*.026;
    c.beginPath();c.moveTo(cx+s*R*.58,cy+R*.08);c.quadraticCurveTo(cx+s*R*.74,cy+R*.17,cx+s*R*.67,cy+R*.31);c.stroke();
    c.restore();
  }
  // vertebral body, canal and process
  blob(c,cx,cy+R*.58,R*.165,R*.135,seed+3,.024,'#A6A29A');
  strokeBlob(c,cx,cy+R*.58,R*.165,R*.135,seed+3,.024,'#DED9CE',2.4);
  blob(c,cx,cy+R*.70,R*.062,R*.058,seed+4,.02,'#3B3C40');
  strokeBlob(c,cx,cy+R*.70,R*.062,R*.058,seed+4,.02,'#CFCABF',1.8);
  blob(c,cx,cy+R*.78,R*.050,R*.040,seed+5,.03,'#B9B4AA');
}

function loopStyle(type){
  if(type==='gas')return {lumen:'#23252A',rim:'#C9C4B7',fold:null};
  if(type==='mixed')return {lumen:'#6E6B66',rim:'#BCB7AC',fold:'#9C978E'};
  return {lumen:'#76726C',rim:'#BEB9AE',fold:'#9F9A91'};
}
function drawLoop(c,cx,cy,rx,ry,seed,type){
  blob(c,cx,cy,rx,ry,seed,.035,'#A9A49D');
  strokeBlob(c,cx,cy,rx,ry,seed,.035,'#C6C1B6',1.3);
  const st=loopStyle(type);
  blob(c,cx,cy,rx*.86,ry*.84,seed+1,.045,st.lumen);
  // mucosal rim
  strokeBlob(c,cx,cy,rx*.86,ry*.84,seed+1,.045,st.rim,1.5);
  if(type!=='gas'){
    const r=rand(seed+4);
    c.save();ePath(c,cx,cy,rx*.86,ry*.84,seed+1,.045);c.clip();
    for(let i=0;i<5;i++){
      c.strokeStyle=`rgba(169,163,153,${.22+r()*.22})`;c.lineWidth=1.1+r();
      const a=-.9+i*.42;c.beginPath();c.moveTo(cx-rx*.7,cy+Math.sin(a)*ry*.55);c.quadraticCurveTo(cx,cy+Math.sin(a)*ry*.9,cx+rx*.7,cy+Math.sin(a)*ry*.55);c.stroke();
    }
    c.restore();
  }
  if(type==='mixed'){
    const a=-1.2;blob(c,cx+Math.cos(a)*rx*.30,cy+Math.sin(a)*ry*.30,rx*.46,ry*.34,seed+6,.05,'#26282C');
    strokeBlob(c,cx+Math.cos(a)*rx*.30,cy+Math.sin(a)*ry*.30,rx*.46,ry*.34,seed+6,.05,'#C9C4B7',1.2);
  }
}

function drawBowel(c,g,seed=51){
  const {cx,cy,R}=g;
  const loops=[
    [-.55,-.30,.175,.135,'fluid',1],
    [-.18,-.38,.155,.118,'gas',2],
    [.17,-.32,.192,.142,'fluid',3],
    [.50,-.19,.150,.180,'gas',4],
    [-.23,.06,.170,.132,'mixed',5],
    [.16,.03,.162,.128,'fluid',6],
    [.48,.13,.138,.155,'fluid',7],
    [-.15,.38,.140,.112,'fluid',8],
    [.20,.36,.150,.115,'gas',9]
  ];
  for(const [ux,uy,vx,vy,t,s] of loops){
    drawLoop(c,cx+ux*R,cy+uy*R,vx*R,vy*R,seed+s*7,t);
  }
  // a few small vessels in the mesentery
  const r=rand(seed+99);
  for(let i=0;i<10;i++){
    const a=r()*TAU,d=.18+r()*.55;
    c.fillStyle='#D8D3C8';c.beginPath();c.arc(cx+Math.cos(a)*R*d,cy+Math.sin(a)*R*d*.8,1.6+r()*2.2,0,TAU);c.fill();
  }
}

// Appendix at fixed anchor. stage 1/2/3 changes calibre and wall.
export function appendixRadii(g,stage){
  const base=g.R*.086;
  const outer=stage===1?base*1.18:stage===2?base*1.46:base*1.50;
  return {outer,wall:outer*(stage===1?.34:stage===2?.42:.44)};
}
function drawAppendixAxial(c,g,stage){
  const {x,y}=g.appendix,{outer,wall}=appendixRadii(g,stage);
  // fat halo
  const gr=c.createRadialGradient(x,y,outer*.8,x,y,outer*2.3);
  gr.addColorStop(0,'rgba(190,185,173,.28)');gr.addColorStop(1,'rgba(190,185,173,0)');
  c.fillStyle=gr;c.beginPath();c.arc(x,y,outer*2.3,0,TAU);c.fill();
  blob(c,x,y,outer,outer*.94,401,.05,'#B9B4AA');
  ring(c,x,y,outer-wall,outer*.96,'#9A968E',402,.04);
  ring(c,x,y,outer*.46,outer-wall,'#716E68',403,.05);
  ring(c,x,y,outer*.22,outer*.46,'#DDD7C9',404,.05);
  blob(c,x,y,outer*.22,outer*.20,405,.05,'#4E4E4C');
  // tiny gas bubble in lumen
  blob(c,x+outer*.06,y-outer*.05,outer*.075,outer*.065,406,.04,'#1E2023');
}

function lensLayers(g,stage){
  const ar=g.lens.r*(stage===1?.52:.63);
  return {ar,ux:g.lens.x+ar*.18,uy:g.lens.y-ar*.10};
}
function drawLensBase(c,g,stage){
  const {x,y,r}=g.lens,L=lensLayers(g,stage),ar=L.ar;
  c.save();
  c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle='#6C6963';c.fill();
  c.save();c.beginPath();c.arc(x,y,r,0,TAU);c.clip();
  // periappendiceal fat lobules and septa
  // smooth fat gradient; the wispy strands carry the texture
  const gr=c.createRadialGradient(x-r*.32,y-r*.28,12,x,y,r);
  gr.addColorStop(0,'#78746D');gr.addColorStop(.62,'#6C6963');gr.addColorStop(1,'#5E5B56');
  c.fillStyle=gr;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
  const rr=rand(703);
  for(let i=0;i<26;i++){
    const a=rr()*TAU,d=ar*(1.12+rr()*(r/ar-1.1));
    const x1=x+Math.cos(a)*d,y1=y+Math.sin(a)*d;
    c.strokeStyle=`rgba(174,169,158,${.14+rr()*.20})`;c.lineWidth=.8+rr()*1.1;
    c.beginPath();c.moveTo(x1,y1);c.quadraticCurveTo(x1+(rr()*2-1)*16,y1+(rr()*2-1)*12,x1+(rr()*2-1)*26,y1+(rr()*2-1)*18);c.stroke();
  }
  const rv=rand(704);
  for(let i=0;i<9;i++){
    const a=rv()*TAU,d=ar*(1.25+rv()*.55);
    c.fillStyle='rgba(226,220,207,.75)';c.beginPath();c.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,1.6+rv()*2.4,0,TAU);c.fill();
  }
  // asymmetric, hand-drawn wall layers (inner rings shift toward upper right)
  ePath(c,x,y,ar,ar*.98,705,.07);c.fillStyle='#C3BDB1';c.fill();
  c.strokeStyle='rgba(205,199,187,.45)';c.lineWidth=1;c.stroke();
  ePath(c,x+ar*.10,y-ar*.04,ar*.90,ar*.86,706,.06);c.fillStyle='#918D85';c.fill();
  // muscle striations confined to the muscularis band
  const rm=rand(709);c.save();ePath(c,x+ar*.10,y-ar*.04,ar*.90,ar*.86,706,.06);c.clip();
  for(let i=0;i<34;i++){
    const a=rm()*TAU;
    c.strokeStyle=`rgba(208,202,189,${.10+rm()*.16})`;c.lineWidth=1;
    c.beginPath();c.arc(x+ar*.10,y-ar*.04,ar*(.76+rm()*.13),a,a+.10);c.stroke();
  }
  c.restore();
  ePath(c,x+ar*.16,y-ar*.07,ar*.74,ar*.70,707,.055);c.fillStyle='#64615D';c.fill();
  ePath(c,x+ar*.20,y-ar*.09,ar*.57,ar*.54,708,.05);c.fillStyle=stage===2?'#F3EDDF':'#DED8C9';c.fill();
  // lumen: irregular, fluid with a small air pocket
  ePath(c,L.ux,L.uy,ar*.30,ar*.255,711,.10);c.fillStyle='#4E4D4A';c.fill();
  c.strokeStyle='rgba(238,232,220,.45)';c.lineWidth=1.2;c.stroke();
  c.save();ePath(c,L.ux,L.uy,ar*.30,ar*.255,711,.10);c.clip();
  speckle(c,L.ux,L.uy,ar*.30,ar*.255,712,70,'#78746D',.05,.11,4);
  c.fillStyle='#202226';c.beginPath();c.ellipse(L.ux+ar*.09,L.uy-ar*.07,ar*.11,ar*.075,-.4,0,TAU);c.fill();
  c.restore();
  // bright mucosal rim, slightly broken
  c.strokeStyle=stage===2?'rgba(255,250,239,.85)':'rgba(243,237,222,.65)';c.lineWidth=stage===2?3.2:2.2;
  c.beginPath();c.arc(L.ux,L.uy,ar*.55,-2.7,2.0);c.stroke();
  c.restore();
  // lens edge
  c.beginPath();c.arc(x,y,r-3,0,TAU);c.strokeStyle='#191A1E';c.lineWidth=8;c.stroke();
  c.beginPath();c.arc(x,y,r-8,0,TAU);c.strokeStyle='rgba(220,212,198,.55)';c.lineWidth=1.3;c.stroke();
  c.restore();
}

export function drawCTStatic(c,x,y,w,h,{stage=1,lens=true,compact=false}={}){
  c.save();
  // window
  c.fillStyle='#24252A';c.beginPath();c.roundRect(x,y,w,h,22);c.fill();
  c.strokeStyle='rgba(255,255,255,.06)';c.lineWidth=1;c.stroke();
  if(!compact)text(c,'CT表现示意',x+24,y+40,28,'#E6DEDA',500);
  else text(c,'CT表现示意',x+16,y+28,20,'#E6DEDA',500);
  const g=ctGeom(x,y,w,h,{lens,compact});
  drawBody(c,g,11);
  drawPosterior(c,g,31);
  drawBowel(c,g,51);
  drawAppendixAxial(c,g,stage);
  if(g.lens)drawLensBase(c,g,stage);
  // leader from appendix to loupe
  if(g.lens){
    const ax=g.appendix.x,ay=g.appendix.y,lx=g.lens.x,ly=g.lens.y;
    const d=Math.hypot(lx-ax,ly-ay);
    c.strokeStyle='rgba(198,181,216,.75)';c.lineWidth=1.2;c.beginPath();c.moveTo(ax,ay);c.lineTo(lx-(lx-ax)/d*(g.lens.r+5),ly-(ly-ay)/d*(g.lens.r+5));c.stroke();
    c.fillStyle=lavD;c.beginPath();c.arc(ax,ay,2.6,0,TAU);c.fill();
  }
  c.restore();
  return g;
}

// ── stage changes (drawn every frame, alpha-driven) ───────────────────────────
function strands(c,cx,cy,r0,r1,seed,count,alpha,width){
  if(alpha<=.001)return;const r=rand(seed);
  c.save();c.globalAlpha=alpha;c.lineCap='round';
  for(let i=0;i<count;i++){
    const a=r()*TAU,s0=r0*(.95+r()*.55),s1=s0+(r1-r0)*(.30+r()*.85);
    const a1=a+(r()-.5)*.85;
    const x1=cx+Math.cos(a)*s0,y1=cy+Math.sin(a)*s0;
    const x2=cx+Math.cos(a1)*s1,y2=cy+Math.sin(a1)*s1;
    const mx=(x1+x2)/2+(r()*2-1)*(r1-r0)*.18,my=(y1+y2)/2+(r()*2-1)*(r1-r0)*.18;
    c.strokeStyle=`rgba(205,199,187,${.26+r()*.38})`;c.lineWidth=width*(.55+r()*.9);
    c.beginPath();c.moveTo(x1,y1);c.quadraticCurveTo(mx,my,x2,y2);c.stroke();
  }
  c.restore();
}
function haze(c,cx,cy,r0,r1,alpha){
  if(alpha<=.001)return;
  // solid translucent lobes instead of a gradient: avoids canvas gradient dithering
  const r=rand(807);
  c.save();c.globalAlpha=alpha*.16;c.fillStyle='#D8D1C4';c.filter='blur(7px)';
  for(let i=0;i<7;i++){
    const a=r()*TAU,d=r0*(.95+r()*.55);
    c.beginPath();c.ellipse(cx+Math.cos(a)*d,cy+Math.sin(a)*d,(r1-r0)*(.55+r()*.45),(r1-r0)*(.32+r()*.30),a,0,TAU);c.fill();
  }
  c.restore();
}
export function drawCTChanges(c,g,{stage=1,aFat=0,aExud=0,aDefect=0,aGas=0,aAbscess=0,aEnh=0,glow=0}={}){
  const {x,y}=g.appendix,{outer}=appendixRadii(g,stage);
  // axial fat stranding (small)
  strands(c,x,y,outer*1.15,outer*2.2,811,10,aFat*.85,1.2);
  if(stage>=2)strands(c,x,y,outer*1.15,outer*2.4,812,14,aExud,1.4);
  if(aGas>0){
    c.save();c.globalAlpha=clamp(aGas);
    for(const [aa,dd,rr] of [[2.4,1.8,.11],[2.9,2.15,.08],[1.9,2.3,.07]]){
      const gx=x+Math.cos(aa)*outer*dd,gy=y+Math.sin(aa)*outer*dd;
      c.fillStyle='#141619';c.beginPath();c.arc(gx,gy,outer*rr,0,TAU);c.fill();
      c.strokeStyle='rgba(238,232,218,.8)';c.lineWidth=1;c.stroke();
    }
    c.restore();
  }
  // lens
  if(g.lens){
    const L=g.lens,{ar,ux,uy}=lensLayers(g,stage);
    c.save();c.beginPath();c.arc(L.x,L.y,L.r-7,0,TAU);c.clip();
    if(aFat>0||aExud>0){
      haze(c,L.x,L.y,ar*.9,ar*1.75,Math.max(aFat*.7,aExud));
      strands(c,L.x,L.y,ar*1.08,ar*1.58,821,stage===1?14:20,Math.max(aFat*.9,aExud),stage===1?1.8:2.2);
    }
    c.restore();
    // brighter enhancing mucosa
    if(aEnh>0){
      c.save();c.globalAlpha=clamp(aEnh);c.beginPath();c.arc(ux,uy,ar*.56,0,TAU);c.strokeStyle='rgba(255,250,239,.85)';c.lineWidth=ar*.10;c.stroke();
      c.globalAlpha=clamp(aEnh)*.35;c.beginPath();c.arc(ux,uy,ar*.63,0,TAU);c.strokeStyle='rgba(255,250,239,.8)';c.lineWidth=ar*.14;c.stroke();c.restore();
    }
    // enhancement defect: a non-enhancing wedge through the bright mucosa
    if(aDefect>0){
      c.save();c.globalAlpha=clamp(aDefect);
      sectorPath(c,ux,uy,ar*.27,ar*.60,-1.22,-.52,841,.055);
      c.fillStyle='rgba(72,70,66,.97)';c.fill();
      sectorPath(c,ux,uy,ar*.27,ar*.58,-1.16,-.58,842,.075);
      c.strokeStyle='rgba(226,220,207,.30)';c.lineWidth=1.2;c.stroke();
      c.restore();
    }
    // extraluminal gas bubbles
    if(aGas>0){
      c.save();c.globalAlpha=clamp(aGas);
      const bubbles=[[-.58,.50,.095],[-.48,.68,.060],[-.74,.40,.050]];
      for(const [ux,uy,ur] of bubbles){
        c.beginPath();c.arc(L.x+ux*L.r,L.y+uy*L.r,ur*L.r,0,TAU);c.fillStyle='#141619';c.fill();
        c.strokeStyle='rgba(238,232,218,.85)';c.lineWidth=1.4;c.stroke();
      }
      c.restore();
    }
    // abscess: rim-enhancing fluid collection
    if(aAbscess>0){
      c.save();c.globalAlpha=clamp(aAbscess);
      const ax=L.x+L.r*.42,ay=L.y+L.r*.55,arx=L.r*.215,ary=L.r*.165;
      blob(c,ax,ay,arx,ary,831,.055,'#6D6A64');
      c.strokeStyle='rgba(238,232,218,.9)';c.lineWidth=2.2;ePath(c,ax,ay,arx,ary,831,.055);c.stroke();
      c.save();ePath(c,ax,ay,arx,ary,831,.055);c.clip();
      speckle(c,ax,ay,arx,ary,832,90,'#8C8880',.05,.12,4);
      c.restore();
      c.restore();
    }
    if(glow>0){
      c.save();c.globalAlpha=clamp(glow)*.45;c.strokeStyle=lav;c.lineWidth=2;
      c.beginPath();c.arc(L.x,L.y,ar*(1.05+.05*glow),0,TAU);c.stroke();c.restore();
    }
  }
}

export function drawFocus(c,x,y,r,alpha=1,dash=[8,7],lw=2,color=lav){
  if(alpha<=0)return;
  c.save();c.globalAlpha=clamp(alpha);c.strokeStyle=color;c.lineWidth=lw;c.setLineDash(dash);
  c.beginPath();c.arc(x,y,r,0,TAU);c.stroke();c.setLineDash([]);
  c.globalAlpha=clamp(alpha)*.35;c.lineWidth=lw*2.2;c.strokeStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.stroke();
  c.restore();
}

// ── tissue window: curved H&E wall section ────────────────────────────────────
function tissueGeom(x,y,w,h){
  const CX=x+w*.02, CY=y+h*1.56;
  const R0=h*.84, R1=h*.98, R2=h*1.10, R3=h*1.24, R4=h*1.33, R5=h*1.36, R6=h*1.75;
  return {x,y,w,h,CX,CY,a0:-1.60,a1:-.86,R0,R1,R2,R3,R4,R5,R6};
}
function adipocytes(c,g,seed){
  const r=rand(seed);const {CX,CY,a0,a1,R5,R6}=g;
  c.save();
  for(let i=0;i<120;i++){
    const a=a0+r()*(a1-a0), rad=R5+r()*(R6-R5);
    const x=CX+Math.cos(a)*rad,y=CY+Math.sin(a)*rad;
    const rr=4+r()*11;
    c.fillStyle=`rgba(250,243,240,${.30+r()*.30})`;c.beginPath();c.ellipse(x,y,rr,rr*.72,a,0,TAU);c.fill();
    c.strokeStyle=`rgba(214,172,184,${.20+r()*.20})`;c.lineWidth=.8;c.stroke();
  }
  c.restore();
}

export function drawTissueStatic(c,x,y,w,h,{stage=1}={}){
  const g=tissueGeom(x,y,w,h);
  c.save();
  c.beginPath();c.roundRect(x,y,w,h,22);c.clip();
  c.fillStyle='#F6EEF0';c.fillRect(x,y,w,h);
  const bands=[
    [g.R5,g.R6,'#F5E9E6'],
    [g.R4,g.R5,'#E7B9C8'],
    [g.R3,g.R4,'#D08EA6'],
    [g.R2,g.R3,'#DB9DB3'],
    [g.R1,g.R2,'#F3E2E6'],
    [g.R0,g.R1,'#CE8FA6'],
    [0,g.R0,'#F8F1F2']
  ];
  for(const [r0,r1,col] of bands){sectorPath(c,g.CX,g.CY,r0,r1,g.a0,g.a1,701,.0025);c.fillStyle=col;c.fill();}
  // wavy layer seams
  for(const [rad,col] of [[g.R1,'rgba(174,116,140,.45)'],[g.R2,'rgba(174,116,140,.40)'],[g.R3,'rgba(150,96,120,.35)'],[g.R4,'rgba(174,116,140,.40)'],[g.R5,'rgba(174,116,140,.35)']]){
    c.beginPath();for(let i=0;i<=60;i++){const a=g.a0+(g.a1-g.a0)*i/60,r=rad*(1+.006*Math.sin(a*9+2));const xx=g.CX+Math.cos(a)*r,yy=g.CY+Math.sin(a)*r;i?c.lineTo(xx,yy):c.moveTo(xx,yy);}c.strokeStyle=col;c.lineWidth=1.2;c.stroke();
  }
  adipocytes(c,g,711);
  // submucosa edema lakes (stage 1 prominent)
  const r=rand(712);
  const lakes=stage===1?18:stage===2?10:6;
  for(let i=0;i<lakes;i++){
    const a=g.a0+r()*(g.a1-g.a0),rad=g.R1+r()*(g.R2-g.R1);
    const xx=g.CX+Math.cos(a)*rad,yy=g.CY+Math.sin(a)*rad;
    c.fillStyle=`rgba(253,247,245,${.55+r()*.30})`;c.beginPath();c.ellipse(xx,yy,10+r()*26,6+r()*12,a,0,TAU);c.fill();
    c.strokeStyle='rgba(214,166,180,.35)';c.lineWidth=1;c.stroke();
  }
  // mucosal glands: transverse profiles with a pale lumen and purple lining
  c.save();sectorPath(c,g.CX,g.CY,g.R0,g.R1,g.a0,g.a1,713,.0025);c.clip();
  const q=rand(714);
  for(let i=0;i<34;i++){
    const a=g.a0+(.03+q()*.94)*(g.a1-g.a0),rad=g.R0+g.h*(.018+q()*.075);
    const xx=g.CX+Math.cos(a)*rad,yy=g.CY+Math.sin(a)*rad;
    const rx=3.4+q()*4.6,ry=2.6+q()*3.4;
    c.fillStyle='rgba(250,232,239,.92)';c.beginPath();c.ellipse(xx,yy,rx,ry,a+q(),0,TAU);c.fill();
    c.strokeStyle='rgba(112,70,138,.62)';c.lineWidth=1.1;c.stroke();
    for(let j=0;j<4;j++){
      const aa=j/4*TAU+q();
      c.fillStyle='rgba(100,65,135,.55)';c.beginPath();c.arc(xx+Math.cos(aa)*rx,yy+Math.sin(aa)*ry,1.3,0,TAU);c.fill();
    }
  }
  // wavy mucosal surface with epithelial nuclei
  c.beginPath();for(let i=0;i<=70;i++){const a=g.a0+(g.a1-g.a0)*i/70,r=g.R0*(1+.006*Math.sin(a*11+1));const xx=g.CX+Math.cos(a)*r,yy=g.CY+Math.sin(a)*r;i?c.lineTo(xx,yy):c.moveTo(xx,yy);}
  c.strokeStyle='rgba(140,84,116,.55)';c.lineWidth=1.4;c.stroke();
  for(let i=0;i<46;i++){const a=g.a0+q()*(g.a1-g.a0),r=g.R0+g.h*.006;c.fillStyle='rgba(104,68,140,.55)';c.beginPath();c.ellipse(g.CX+Math.cos(a)*r,g.CY+Math.sin(a)*r,2.1,1.4,a,0,TAU);c.fill();}
  c.restore();
  // muscle nuclei (tangential)
  const m=rand(715);
  for(let i=0;i<110;i++){
    const a=g.a0+m()*(g.a1-g.a0),rad=g.R2+m()*(g.R4-g.R2);
    const xx=g.CX+Math.cos(a)*rad,yy=g.CY+Math.sin(a)*rad;
    c.fillStyle=`rgba(92,62,122,${.25+m()*.30})`;c.beginPath();c.ellipse(xx,yy,4.2,1.9,a+Math.PI/2,0,TAU);c.fill();
  }
  // general nuclei in mucosa / submucosa
  const n=rand(716);
  for(let i=0;i<150;i++){
    const a=g.a0+n()*(g.a1-g.a0),rad=g.R0+n()*(g.R2-g.R0);
    const xx=g.CX+Math.cos(a)*rad,yy=g.CY+Math.sin(a)*rad;
    c.fillStyle=`rgba(103,70,139,${.25+n()*.35})`;c.beginPath();c.ellipse(xx,yy,2.4+n()*2,1.6+n()*1.2,a,0,TAU);c.fill();
  }
  // full-thickness infiltrate for stages 2/3
  if(stage>=2){
    const p=rand(717);
    for(let i=0;i<420;i++){
      const a=g.a0+p()*(g.a1-g.a0),rad=g.R0+p()*(g.R5-g.R0);
      const xx=g.CX+Math.cos(a)*rad,yy=g.CY+Math.sin(a)*rad;
      c.fillStyle='rgba(83,51,111,.66)';c.beginPath();c.arc(xx,yy,1.5+p()*1.7,0,TAU);c.fill();
    }
  }
  // focal necrosis for stage 3
  if(stage===3){
    const na=g.a0+(g.a1-g.a0)*.62, span=.19;
    const z=rand(719);
    c.save();sectorPath(c,g.CX,g.CY,g.R0,g.R4,na-span/2,na+span/2,718,.010);c.clip();
    c.fillStyle='rgba(244,229,233,.55)';c.fill();
    for(let i=0;i<5;i++){
      const a=na+(z()-.5)*span*.8,rad=g.R0+z()*(g.R4-g.R0)*.85;
      c.fillStyle=`rgba(250,238,240,${.18+z()*.22})`;
      c.beginPath();c.ellipse(g.CX+Math.cos(a)*rad,g.CY+Math.sin(a)*rad,g.h*(.035+z()*.05),g.h*(.015+z()*.025),a,0,TAU);c.fill();
    }
    for(let i=0;i<120;i++){
      const a=na-span/2+z()*span,rad=g.R0+z()*(g.R4-g.R0);
      const xx=g.CX+Math.cos(a)*rad,yy=g.CY+Math.sin(a)*rad;
      c.fillStyle=`rgba(70,45,88,${.18+z()*.42})`;c.beginPath();c.arc(xx,yy,.6+z()*1.6,0,TAU);c.fill();
    }
    c.restore();
    // inflammatory border at the edge of the necrotic focus
    c.save();c.strokeStyle='rgba(120,74,140,.32)';c.lineWidth=1;c.setLineDash([3,5]);
    for(const aa of [na-span*.52,na+span*.52]){
      c.beginPath();for(let i=0;i<=30;i++){const rad=g.R0+(g.R4-g.R0)*i/30;c.lineTo(g.CX+Math.cos(aa)*rad,g.CY+Math.sin(aa)*rad);}c.stroke();
    }
    c.setLineDash([]);c.restore();
  }
  // wash texture
  c.save();c.globalAlpha=.10;
  const wsh=rand(720);
  for(let i=0;i<700;i++){c.fillStyle=wsh()>.5?'#FFFFFF':'#B87E95';c.beginPath();c.ellipse(x+wsh()*w,y+wsh()*h,2+wsh()*12,1+wsh()*6,wsh()*6,0,TAU);c.fill();}
  c.restore();
  c.restore();
  // window edge
  c.strokeStyle='rgba(140,86,108,.20)';c.lineWidth=1.5;c.beginPath();c.roundRect(x+1,y+1,w-2,h-2,21);c.stroke();
  return g;
}

export function drawTissueChanges(c,g,{stage=1,aExud=0,aDefect=0,agitate=0}={}){
  const {CX,CY}=g;
  c.save();c.beginPath();c.roundRect(g.x,g.y,g.w,g.h,22);c.clip();
  // serosal exudate film for stage 2
  if(aExud>0){
    c.save();c.globalAlpha=clamp(aExud)*.55;
    sectorPath(c,CX,CY,g.R4,g.R5+8,g.a0+.05,g.a1-.05,731,.003);
    c.fillStyle='rgba(226,170,200,.55)';c.fill();
    const r=rand(732);
    for(let i=0;i<70;i++){
      const a=g.a0+.05+r()*(g.a1-g.a0-.10),rad=g.R4+r()*(g.R5-g.R4+8);
      const xx=CX+Math.cos(a)*rad,yy=CY+Math.sin(a)*rad;
      c.fillStyle='rgba(107,76,154,.55)';c.beginPath();c.arc(xx,yy,1.4+r()*1.6,0,TAU);c.fill();
    }
    c.restore();
  }
  // transmural defect only when the perforation branch appears
  if(aDefect>0){
    c.save();c.globalAlpha=clamp(aDefect);
    const a=g.a0+(g.a1-g.a0)*.66;
    const pts=[];
    for(let i=0;i<=6;i++){const rr=g.R0+(g.R5-g.R0)*i/6,aa=a+.010*Math.sin(i*2.3);pts.push([CX+Math.cos(aa)*rr,CY+Math.sin(aa)*rr]);}
    c.lineCap='round';c.lineJoin='round';
    c.strokeStyle='rgba(171,120,143,.34)';c.lineWidth=16;
    c.beginPath();pts.forEach(([xx,yy],i)=>i?c.lineTo(xx,yy):c.moveTo(xx,yy));c.stroke();
    c.strokeStyle='rgba(246,236,238,.96)';c.lineWidth=7;
    c.beginPath();pts.forEach(([xx,yy],i)=>i?c.lineTo(xx,yy):c.moveTo(xx,yy));c.stroke();
    c.strokeStyle='rgba(112,70,138,.50)';c.lineWidth=1.6;
    c.beginPath();pts.forEach(([xx,yy],i)=>i?c.lineTo(xx,yy):c.moveTo(xx,yy));c.stroke();
    c.restore();
  }
  c.restore();
}

export function tissueFocus(x,y,w,h){
  const g=tissueGeom(x,y,w,h);const a=g.a0+(g.a1-g.a0)*.58,rad=(g.R1+g.R2)/2;
  return {x:g.CX+Math.cos(a)*rad,y:g.CY+Math.sin(a)*rad,a,rad};
}

// ── labels ───────────────────────────────────────────────────────────────────
export function labelTo(c,s,tx,ty,ax,ay,{size=26,color=lav,alpha=1,weight=500,right=false}={}){
  if(alpha<=0)return;
  c.save();c.globalAlpha=clamp(alpha);
  c.font=`${weight} ${size}px MixSans`;const tw=c.measureText(s).width;
  const sx=right?tx-tw:tx;
  c.fillStyle=color;c.fillText(s,sx,ty);
  c.strokeStyle=color;c.globalAlpha=clamp(alpha)*.85;c.lineWidth=1.3;c.lineCap='round';
  const x0=right?sx-8:sx+tw+8, y0=ty-size*.32;
  c.beginPath();c.moveTo(x0,y0);
  const mx=sx+(right?-14:tw+18), my=(y0+ay)/2;
  c.lineTo(mx,my);c.lineTo(ax,ay);c.stroke();
  c.globalAlpha=clamp(alpha);c.fillStyle=color;c.beginPath();c.arc(ax,ay,2.4,0,TAU);c.fill();
  c.restore();
}

export function drawConnector(c,x1,y1,x2,y2,alpha=.55){
  if(alpha<=0)return;c.save();c.globalAlpha=clamp(alpha);c.strokeStyle=lav;c.lineWidth=1.2;c.setLineDash([6,6]);
  c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.setLineDash([]);c.restore();
}
