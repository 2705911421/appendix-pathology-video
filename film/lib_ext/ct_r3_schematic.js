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
  // Wide is the S04 single window: larger axial slice plus a lens that still sits in the lower-right of the panel.
  const R=wide?Math.min(w*.26,h*.40):Math.min(w*.35,h*.31);
  const cx=wide?x+w*.32:x+w*.48;
  const cy=wide?y+h*.46:y+h*.34;
  const lr=wide?Math.min(w*.12,h*.19):Math.min(w*.27,h*.23);
  const lx=wide?x+w*.762:x+w*.66;
  const ly=wide?y+h*.70:y+h*.71;
  return {x,y,w,h,R,cx,cy,lens:lens?{x:lx,y:ly,r:lr}:null,appendix:{x:cx-R*.50,y:cy+R*.12},wide};
}

function drawBody(c,g,seed=11){
  const {cx,cy,R}=g;
  // skin rim, then a darker subcutaneous-fat band, then muscle, then darker mesenteric fat.
  // Fat sits darker than muscle so the abdominal-wall fat layer reads on a soft-tissue gray scale.
  ePath(c,cx,cy,R,R*.90,seed,.026);c.fillStyle='#C8C3BA';c.fill();
  c.strokeStyle='#E6E0D4';c.lineWidth=1.5;c.stroke();
  ePath(c,cx,cy,R*.965,R*.855,seed+1,.024);c.fillStyle='#5E5B56';c.fill();
  mottle(c,cx,cy,R*.96,R*.85,seed+2,70,'#7A756E',.07,22);
  mottle(c,cx,cy,R*.96,R*.85,seed+3,50,'#3E3C39',.06,18);
  ePath(c,cx,cy,R*.84,R*.73,seed+4,.02);c.fillStyle='#908C86';c.fill();
  mottle(c,cx,cy,R*.83,R*.72,seed+5,40,'#6E6B66',.05,20);
  // rectus muscles + linea alba, sitting in the anterior wall
  for(const s of [-1,1]){
    blob(c,cx+s*R*.18,cy-R*.58,R*.09,R*.12,seed+21+s,.04,'#A09B94');
    strokeBlob(c,cx+s*R*.18,cy-R*.58,R*.09,R*.12,seed+21+s,.04,'#C2BDB2',1.15);
  }
  c.strokeStyle='rgba(214,208,196,.55)';c.lineWidth=1.5;
  c.beginPath();c.moveTo(cx,cy-R*.70);c.lineTo(cx,cy-R*.50);c.stroke();
  // intraperitoneal fat
  ePath(c,cx,cy,R*.76,R*.64,seed+6,.02);c.fillStyle='#64615C';c.fill();
  mottle(c,cx,cy,R*.75,R*.63,seed+7,90,'#7E7A73',.06,26);
  mottle(c,cx,cy,R*.75,R*.63,seed+8,70,'#4A4844',.06,22);
  // mesenteric strands
  const r=rand(seed+9);
  c.save();ePath(c,cx,cy,R*.75,R*.63,seed+6,.014);c.clip();
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
    blob(c,cx+s*R*.40,cy+R*.36,R*.16,R*.22,seed+s,.03,'#9A968F');
    strokeBlob(c,cx+s*R*.40,cy+R*.36,R*.16,R*.22,seed+s,.03,'#C8C3B8',1.5);
    const r=rand(seed+7+s);
    c.save();ePath(c,cx+s*R*.40,cy+R*.36,R*.15,R*.21,seed+s,.03);c.clip();
    for(let i=0;i<22;i++){c.strokeStyle=`rgba(210,204,194,${.12+r()*.16})`;c.lineWidth=1;c.beginPath();const yy=cy+R*.36-R*.20+i*R*.018;c.moveTo(cx+s*R*.54,yy);c.lineTo(cx+s*R*.26,yy+3);c.stroke();}
    c.restore();
  }
  // iliac bones (bright cortical crescents, lateral and posterior)
  for(const s of [-1,1]){
    c.save();c.strokeStyle='#E4DFD4';c.lineWidth=Math.max(7,R*.075);c.lineCap='round';
    c.beginPath();c.moveTo(cx+s*R*.52,cy+R*.02);c.quadraticCurveTo(cx+s*R*.86,cy+R*.18,cx+s*R*.68,cy+R*.42);c.stroke();
    c.strokeStyle='#B7B2A6';c.lineWidth=Math.max(3,R*.032);
    c.beginPath();c.moveTo(cx+s*R*.54,cy+R*.08);c.quadraticCurveTo(cx+s*R*.78,cy+R*.20,cx+s*R*.66,cy+R*.36);c.stroke();
    c.restore();
  }
  // vertebral body, canal and process
  blob(c,cx,cy+R*.58,R*.165,R*.135,seed+3,.024,'#A6A29A');
  strokeBlob(c,cx,cy+R*.58,R*.165,R*.135,seed+3,.024,'#DED9CE',2.4);
  blob(c,cx,cy+R*.70,R*.062,R*.058,seed+4,.02,'#3B3C40');
  strokeBlob(c,cx,cy+R*.70,R*.062,R*.058,seed+4,.02,'#CFCABF',1.8);
  blob(c,cx,cy+R*.78,R*.050,R*.040,seed+5,.03,'#B9B4AA');
}

function drawLoop(c,cx,cy,rx,ry,rot,seed,type){
  c.save();c.translate(cx,cy);c.rotate(rot);
  blob(c,0,0,rx,ry,seed,.045,'#A7A299');
  strokeBlob(c,0,0,rx,ry,seed,.045,'#D0CBC0',1.4);
  const lumen=type==='gas'?'#1A1C20':'#8C8881';
  blob(c,0,0,rx*.82,ry*.80,seed+1,.055,lumen);
  strokeBlob(c,0,0,rx*.82,ry*.80,seed+1,.055,type==='gas'?'#DDD7C8':'#C8C2B4',1.5);
  if(type!=='gas'){
    const r=rand(seed+4);
    c.save();ePath(c,0,0,rx*.82,ry*.80,seed+1,.055);c.clip();
    const folds=rx/ry>2.2?2:4;
    for(let i=0;i<folds;i++){
      c.strokeStyle=`rgba(186,180,168,${.28+r()*.28})`;c.lineWidth=1.15+r()*1.1;
      const a=-.7+i*(1.1/folds);
      c.beginPath();c.moveTo(-rx*.65,Math.sin(a)*ry*.45);c.quadraticCurveTo(0,Math.sin(a)*ry*.9,rx*.62,Math.sin(a)*ry*.35);c.stroke();
    }
    c.restore();
  }
  if(type==='mixed'){
    // Supine air-fluid level: gas is anterior (up on the axial image), interface stays horizontal.
    c.save();
    ePath(c,0,0,rx*.82,ry*.80,seed+1,.055);c.clip();
    c.setTransform(1,0,0,1,0,0);
    const rad=Math.max(rx,ry)+4;
    const level=cy-ry*.10;
    c.fillStyle='#16181C';c.fillRect(cx-rad,cy-rad,rad*2,level-(cy-rad));
    c.strokeStyle='rgba(236,230,216,.8)';c.lineWidth=1.35;
    c.beginPath();c.moveTo(cx-rad,level);c.lineTo(cx+rad,level);c.stroke();
    c.restore();
  }
  c.restore();
}

function drawBowel(c,g,seed=51){
  const {cx,cy,R}=g;
  // Ileocecal level: one large cecum, then loops that differ in size, elongation and contents.
  // Kept anterior to the psoas/vertebra and clear of the appendix anchor (-0.50R, +0.12R).
  const loops=[
    [-.28,-.36,.25,.16,-.22,'mixed',1],
    [.08,-.42,.17,.12,.40,'gas',2],
    [-.50,-.44,.13,.048,.62,'fluid',3],
    [.24,-.18,.115,.085,-.18,'fluid',4],
    [.42,-.32,.095,.034,1.1,'fluid',5],
    [-.06,-.16,.07,.055,.45,'gas',6],
    [.38,-.06,.10,.08,.25,'mixed',7],
    [.06,.00,.052,.04,-.4,'fluid',8],
    [-.14,.00,.09,.036,.28,'fluid',9]
  ];
  for(const [ux,uy,vx,vy,rot,t,s] of loops){
    drawLoop(c,cx+ux*R,cy+uy*R,vx*R,vy*R,rot,seed+s*7,t);
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
  const base=g.R*.105;
  const outer=stage===1?base*1.18:stage===2?base*1.46:base*1.50;
  return {outer,wall:outer*(stage===1?.34:stage===2?.42:.44)};
}
function drawAppendixAxial(c,g,stage){
  const {x,y}=g.appendix,{outer,wall}=appendixRadii(g,stage);
  // fat halo (solid lobes, avoids gradient dithering)
  c.save();c.globalAlpha=.18;c.fillStyle='#BEB9AD';
  for(const [aa,dd,rr] of [[-.6,1.25,1.15],[.9,1.20,1.0],[2.2,1.35,.9]]){
    c.beginPath();c.ellipse(x+Math.cos(aa)*outer*dd,y+Math.sin(aa)*outer*dd,outer*rr,outer*rr*.75,aa,0,TAU);c.fill();
  }
  c.restore();
  blob(c,x,y,outer,outer*.94,401,.05,'#B9B4AA');
  ring(c,x,y,outer-wall,outer*.96,'#9A968E',402,.04);
  ring(c,x,y,outer*.46,outer-wall,'#716E68',403,.05);
  ring(c,x,y,outer*.22,outer*.46,stage===1?'#CCC5B7':'#F5EFDF',404,.05);
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
  // flat fat base with a few large solid lobes (no gradient dithering)
  c.fillStyle='#6C6963';c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
  const rb=rand(706);
  for(let i=0;i<16;i++){
    const a=rb()*TAU,d=Math.sqrt(rb())*(r-22);
    c.globalAlpha=.03+rb()*.04;c.fillStyle=rb()>.5?'#76726B':'#605D58';
    c.beginPath();c.ellipse(x+Math.cos(a)*d,y+Math.sin(a)*d,18+rb()*38,12+rb()*26,rb()*TAU,0,TAU);c.fill();
  }
  c.globalAlpha=1;
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
  // Native-resolution baked grey pigment: fine grain and soft wash, never colored dots.
  for(const region of [{x:g.cx,y:g.cy,rx:g.R,ry:g.R*.9},...(g.lens?[{x:g.lens.x,y:g.lens.y,rx:g.lens.r,ry:g.lens.r}]:[])]){
    const q=rand(844);c.save();ePath(c,region.x,region.y,region.rx,region.ry,11,.015);c.clip();
    for(let i=0;i<170;i++){c.globalAlpha=.018;c.filter='blur(5px)';blob(c,region.x+(q()-.5)*region.rx*2,region.y+(q()-.5)*region.ry*2,8+q()*35,5+q()*22,i,.2,i%2?'#FAF6EB':'#393733');}
    c.filter='none';for(let i=0;i<22000;i++){c.globalAlpha=.025+q()*.06;c.fillStyle=i%2?'#F8F3E9':'#34312E';c.fillRect(region.x+(q()-.5)*region.rx*2,region.y+(q()-.5)*region.ry*2,.5+q(),.5+q());}c.restore();
  }
  // leader from appendix to loupe
  if(g.lens){
    const ax=g.appendix.x,ay=g.appendix.y,lx=g.lens.x,ly=g.lens.y;
    const box=appendixRadii(g,stage).outer*2.9;
    c.strokeStyle=lavD;c.lineWidth=1.3;c.strokeRect(ax-box/2,ay-box/2,box,box);
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
  if(aEnh>0){c.save();c.globalAlpha=aEnh;c.strokeStyle='#F6EFDD';c.lineWidth=outer*.16;c.beginPath();c.arc(x,y,outer*.54,0,TAU);c.stroke();c.restore();}
  if(aDefect>0){c.save();c.globalAlpha=aDefect;sectorPath(c,x,y,outer*.24,outer*.91,-1.35,-.40,840,.03);c.fillStyle='#68645E';c.fill();c.restore();}
  if(aAbscess>0){c.save();c.globalAlpha=aAbscess;blob(c,x-outer*.85,y+outer*1.9,outer*.75,outer*.57,838,.08,'#605E58');strokeBlob(c,x-outer*.85,y+outer*1.9,outer*.75,outer*.57,838,.08,'#E1DACB',2.5);c.restore();}
  // axial fat stranding (small)
  strands(c,x,y,outer*1.15,outer*2.2,811,10,aFat*.85,1.2);
  if(stage>=2)strands(c,x,y,outer*1.15,outer*3.0,812,32,aExud,1.4);
  if(aGas>0){
    c.save();c.globalAlpha=clamp(aGas);
    for(const [aa,dd,rr] of [[2.4,1.8,.11],[2.9,2.15,.08],[1.9,2.3,.07]]){
      const gx=x+Math.cos(aa)*outer*dd,gy=y+Math.sin(aa)*outer*dd;
      c.fillStyle='#141619';c.beginPath();c.arc(gx,gy,outer*rr*1.8,0,TAU);c.fill();
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
      strands(c,L.x,L.y,ar*1.08,ar*1.58,821,stage===1?14:48,Math.max(aFat*.9,aExud),stage===1?1.8:2.2);
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
  const CX=x+w*.02, CY=y+h*1.35;
  const R0=h*.45, R1=h*.67, R2=h*.86, R3=h*1.04, R4=h*1.20, R5=h*1.25, R6=h*1.75;
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

// Baked at native resolution: translucent pigment, dry edges, crypt epithelium and muscle.
export function drawTissueStatic(c,x,y,w,h,{stage=1}={}){
 const g=tissueGeom(x,y,w,h),q=rand(930+stage),{CX,CY,a0,a1}=g;
 const dead=(a,rad)=>stage===3&&Math.abs(a-(a0+(a1-a0)*.62))<.105&&rad<g.R5&&rad>g.R0;
 c.save();c.beginPath();c.roundRect(x,y,w,h,20);c.clip();c.fillStyle='#F6EEF0';c.fillRect(x,y,w,h);
 const layers=[[g.R5,g.R6,'#F3E7E6'],[g.R4,g.R5,'#E6BCCB'],[g.R3,g.R4,'#D995AE'],[g.R2,g.R3,'#DDA4B7'],[g.R1,g.R2,'#F0D7E0'],[g.R0,g.R1,'#DEAABD']];
 for(const [lo,hi,col] of layers){
  c.save();sectorPath(c,CX,CY,lo,hi,a0,a1,701,.006);c.clip();c.fillStyle=col;c.fill();
  // Soft irregular overlapping pigment blooms, clipped to the anatomical layer.
  for(let i=0;i<340;i++){let a=a0+q()*(a1-a0),r=lo+q()*(hi-lo);c.globalAlpha=.015+q()*.045;c.fillStyle=i%3?'#B06491':'#FFFFFF';c.filter='blur(4px)';blob(c,CX+Math.cos(a)*r,CY+Math.sin(a)*r,8+q()*42,4+q()*19,i,.18,c.fillStyle);}
  c.filter='none';c.globalAlpha=1;
  c.strokeStyle='rgba(143,83,118,.20)';c.lineWidth=1.1;sectorPath(c,CX,CY,lo+1,hi-1,a0,a1,701,.006);c.stroke();c.restore();
 }
 adipocytes(c,g,711);
 if(stage===1){for(let i=0;i<26;i++){const a=a0+q()*(a1-a0),r=g.R1+q()*(g.R2-g.R1);c.save();c.globalAlpha=.50;c.filter='blur(2px)';blob(c,CX+Math.cos(a)*r,CY+Math.sin(a)*r,8+q()*22,4+q()*10,i,.15,'#FAF4F4');c.restore();}}
 // Collagen and muscle fibers, following local wall curvature.
 for(let i=0;i<1600;i++){
  const a=a0+q()*(a1-a0),r=g.R1+q()*(g.R5-g.R1);if(dead(a,r))continue;
  const xx=CX+Math.cos(a)*r,yy=CY+Math.sin(a)*r;
  c.strokeStyle=i%3?'rgba(169,91,132,.19)':'rgba(255,247,249,.50)';c.lineWidth=.5+q()*1.2;
  c.beginPath();c.moveTo(xx,yy);c.quadraticCurveTo(xx+10,yy-3,xx+22+q()*20,yy+q()*8);c.stroke();
 }
 // Tubular crypts with continuous columnar epithelial nuclei and pale goblet cells.
 for(let i=0;i<22;i++){
  const a=a0+(i+.5)/22*(a1-a0),rad=(g.R0+g.R1)/2;if(dead(a,rad))continue;
  c.save();c.translate(CX+Math.cos(a)*rad,CY+Math.sin(a)*rad);c.rotate(a+Math.PI/2);
  const len=(g.R1-g.R0)*.72;c.fillStyle='rgba(247,232,239,.93)';c.strokeStyle='rgba(139,82,135,.40)';c.lineWidth=5;
  c.beginPath();c.ellipse(0,0,9,len/2,0,0,TAU);c.fill();c.stroke();
  for(let j=0;j<20;j++){let z=-len*.44+j*len*.045;for(const side of [-1,1]){c.fillStyle='#6B4C9A';c.globalAlpha=.55+q()*.2;c.beginPath();c.ellipse(side*(11+q()*3),z,2,3.4,side*.15,0,TAU);c.fill();if(j%4===0){c.globalAlpha=.9;c.fillStyle='#F8F0F3';c.beginPath();c.ellipse(side*7,z,3,4,0,0,TAU);c.fill();}}}c.restore();
 }
 // Stromal, inner circular and outer longitudinal muscle nuclei.
 for(let i=0;i<1000;i++){
  const a=a0+q()*(a1-a0),r=g.R0+q()*(g.R5-g.R0);if(dead(a,r))continue;
  c.fillStyle='rgba(91,57,128,.52)';c.beginPath();c.ellipse(CX+Math.cos(a)*r,CY+Math.sin(a)*r,r>g.R3?4.3:2.1,r>g.R3?1.2:1.7,a+Math.PI/2,0,TAU);c.fill();
 }
 // Multilobed neutrophils; stage 2 involves all layers, viable border in stage 3.
 for(let i=0;i<(stage===1?130:1200);i++){
  const a=a0+q()*(a1-a0),r=g.R0+q()*(g.R5-g.R0);if(dead(a,r))continue;
  const xx=CX+Math.cos(a)*r,yy=CY+Math.sin(a)*r;
  c.fillStyle='rgba(226,170,200,.55)';c.beginPath();c.ellipse(xx,yy,5.1,4.7,0,0,TAU);c.fill();
  const lobes=2+Math.floor(q()*4);c.strokeStyle='#9273A5';c.lineWidth=.6;c.beginPath();
  for(let j=0;j<lobes;j++){const aa=j/lobes*TAU,px=xx+Math.cos(aa)*2.1,py=yy+Math.sin(aa)*2;j?c.lineTo(px,py):c.moveTo(px,py);}c.stroke();
  for(let j=0;j<lobes;j++){const aa=j/lobes*TAU;c.fillStyle='rgba(81,51,111,.80)';c.beginPath();c.ellipse(xx+Math.cos(aa)*2.1,yy+Math.sin(aa)*2,1.7,1.3,aa,0,TAU);c.fill();}
 }
 if(stage===3){
  const na=a0+(a1-a0)*.62;c.save();sectorPath(c,CX,CY,g.R0,g.R5,na-.105,na+.105,718,.008);c.clip();c.fillStyle='rgba(239,215,224,.91)';c.fill();
  for(let i=0;i<240;i++){const a=na+(q()-.5)*.21,r=g.R0+q()*(g.R5-g.R0);c.strokeStyle='rgba(193,141,161,.22)';c.lineWidth=.8;c.beginPath();c.ellipse(CX+Math.cos(a)*r,CY+Math.sin(a)*r,6+q()*12,2+q()*3,a,0,TAU);c.stroke();}c.restore();
 }
 // Fine paper/pigment grain, not colored confetti. Fixed seed, baked once.
 for(let i=0;i<65000;i++){c.globalAlpha=.025+q()*.065;c.fillStyle=i%2?'#FFFFFF':'#895B85';c.fillRect(x+q()*w,y+q()*h,.5+q()*1.3,.5+q()*1.1);}c.restore();
 c.strokeStyle='rgba(140,86,108,.20)';c.lineWidth=1.3;c.beginPath();c.roundRect(x+1,y+1,w-2,h-2,20);c.stroke();return g;
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

// Short dashed arc on one wall band. No box. Returns the midpoint for a leader.
export function drawTissueMark(c,x,y,w,h,kind,alpha){
  if(alpha<=.001)return null;
  const g=tissueGeom(x,y,w,h);
  const span=g.a1-g.a0;
  let a0=g.a0+span*.50,a1=g.a0+span*.68,rad=(g.R1+g.R2)/2;
  if(kind==='wall')rad=(g.R2+g.R3)/2;
  else if(kind==='fat'){rad=g.R5+g.h*.07;a0=g.a0+span*.52;a1=g.a0+span*.66;}
  else if(kind==='serosa')rad=(g.R4+g.R5)/2+2;
  else if(kind==='necrosis'){const mid=g.a0+span*.62;a0=mid-span*.07;a1=mid+span*.07;rad=(g.R1+g.R3)/2;}
  const am=(a0+a1)/2;
  c.save();
  c.beginPath();c.roundRect(g.x,g.y,g.w,g.h,22);c.clip();
  c.globalAlpha=clamp(alpha)*.9;c.strokeStyle='#A88DBD';c.lineWidth=1.6;c.setLineDash([6,5]);c.lineCap='round';
  c.beginPath();
  for(let i=0;i<=24;i++){const a=a0+(a1-a0)*i/24,xx=g.CX+Math.cos(a)*rad,yy=g.CY+Math.sin(a)*rad;i?c.lineTo(xx,yy):c.moveTo(xx,yy);}
  c.stroke();
  c.restore();
  return {x:g.CX+Math.cos(am)*rad,y:g.CY+Math.sin(am)*rad};
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
