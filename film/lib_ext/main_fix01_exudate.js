// main_fix01: exudation visual vocabulary for S07, drawn to match the refined
// H&E sample (pale lavender neutrophil cytoplasm + clustered round lobed nuclei,
// pink collagen stroma with spindle fibroblasts).
import {bake,get} from '../lib/wash.js';
import {rng} from '../lib/motion.js';
const TAU=Math.PI*2;
const clamp=x=>Math.max(0,Math.min(1,x));
const mix=(a,b,p)=>a+(b-a)*p;

const fibers=[],dots=[],fibro=[],inflam=[];
function blob(c,x,y,rx,ry,seed,fill,alpha=1){c.save();c.globalAlpha*=alpha;c.beginPath();for(let i=0;i<=64;i++){const a=i/64*TAU,k=1+.055*Math.sin(a*5+seed)+.035*Math.cos(a*3+seed);const xx=x+Math.cos(a)*rx*k,yy=y+Math.sin(a)*ry*k;i?c.lineTo(xx,yy):c.moveTo(xx,yy);}c.closePath();c.fillStyle=fill;c.fill();c.restore();}

export function prepareExudate(){
 const r=rng(72530);fibers.length=dots.length=fibro.length=inflam.length=0;
 for(let i=0;i<118;i++)fibers.push({x:-470+r()*940,y:12+r()*330,l:26+r()*128,a:r()*8,w:1+r()*1.7,s:r()>.5?1:-1});
 for(let i=0;i<18;i++)fibro.push({x:-390+r()*780,y:24+r()*300,rot:(r()-.5)*1.25,l:16+r()*13,c:r()});
 for(let i=0;i<9;i++)inflam.push({x:-400+r()*800,y:60+r()*280,r:8+r()*5,s:r()});
 for(let i=0;i<96;i++)dots.push({x:-285+r()*570,y:r(),s:1.6+r()*2.0,ph:r()*TAU});
 // Pale blue interstitial water: irregular soft blooms, not a flat rectangle.
 bake('s07.fluid',(b,P)=>{
  P.fill(b,P.blob(0,10,300,64,.22,731),'#93C2D6',50,.5,[.3,.5]);
  P.fill(b,P.blob(-110,46,170,54,.3,732),'#A5CEDE',36,.5,[.3,.5]);
  P.fill(b,P.blob(138,-18,150,48,.3,733),'#B4D8E4',32,.5,[.3,.5]);
 },{seed:731,hd:true,soft:true,grain:.1,edge:.24,bleed:.6});
}

// Base interstitium: warm pink ground, dense collagen fibres, spindle fibroblasts,
// a few resident inflammatory cells. Denser and more saturated than the old白底.
export function drawInterstitium(c,wallY,wet,z){
 if(z<=0)return;
 c.save();c.globalAlpha=z;
 const g=c.createLinearGradient(0,wallY,0,wallY+360);
 g.addColorStop(0,'rgba(241,214,221,.60)');
 g.addColorStop(.45,'rgba(233,199,211,.72)');
 g.addColorStop(1,'rgba(226,187,201,.80)');
 c.fillStyle=g;c.fillRect(-500,wallY-4,1000,430);
 c.save();c.globalAlpha=z*.16;c.drawImage(get('s06.vascular'),-500,wallY-4,1000,430);c.restore();
 // Watercolour mottling so the ground is not a flat fill.
 for(let i=0;i<11;i++){const x=-430+i*86,y=wallY+40+((i*53)%250);blob(c,x,y,90+i%3*22,50+i%4*14,i*1.7,'rgba(214,166,181,.20)');}
 // Collagen: long wavy bundles, pale pink (H&E eosin); separated by edema.
 for(let i=0;i<fibers.length;i++){
  const f=fibers[i],spread=1+wet*.20;
  const y=wallY+18+(f.y)*(spread);
  c.strokeStyle=i%4===0?'rgba(183,120,145,.46)':i%3===0?'rgba(201,146,166,.34)':'rgba(190,132,154,.40)';
  c.lineWidth=f.w*(i%5===0?1.25:1);
  c.beginPath();c.moveTo(f.x,y);c.bezierCurveTo(f.x+f.l*.3,y-9*f.s,f.x+f.l*.68,y+10*f.s,f.x+f.l,y-2*f.s);c.stroke();
  if(i%7===0){c.strokeStyle='rgba(206,156,175,.26)';c.lineWidth=.9;c.beginPath();c.moveTo(f.x+8,y+5);c.bezierCurveTo(f.x+f.l*.4,y+12,f.x+f.l*.7,y+2,f.x+f.l*.92,y+7);c.stroke();}
 }
 // Spindle fibroblast nuclei (dark violet, elongated) with faint cytoplasm.
 for(let i=0;i<fibro.length;i++){
  const f=fibro[i],push=1+wet*.22;
  const x=f.x*(1+wet*.05),y=wallY+30+f.y*push;
  c.save();c.translate(x,y);c.rotate(f.rot);
  c.fillStyle='rgba(224,192,208,.55)';c.beginPath();c.ellipse(0,0,f.l*.95,6,0,0,TAU);c.fill();
  c.strokeStyle='rgba(190,148,170,.45)';c.lineWidth=.7;c.beginPath();c.moveTo(-f.l,0);c.lineTo(-f.l*.62,0);c.moveTo(f.l*.62,0);c.lineTo(f.l,0);c.stroke();
  c.fillStyle='#7A5590';c.beginPath();c.ellipse(0,0,f.l*.60,2.9,0,0,TAU);c.fill();
  c.fillStyle='rgba(156,122,175,.55)';c.beginPath();c.ellipse(-f.l*.2,-.5,f.l*.22,1.2,0,0,TAU);c.fill();
  c.restore();
 }
 // A few mononuclear inflammatory cells (round, not the polymorphs in the vessel).
 for(let i=0;i<inflam.length;i++){
  const d=inflam[i],push=1+wet*.26;
  const x=d.x*(1+wet*.04),y=wallY+44+d.y*push;
  c.fillStyle='rgba(225,200,224,.95)';c.beginPath();c.ellipse(x,y,d.r,d.r*.92,.2,0,TAU);c.fill();
  c.strokeStyle='rgba(150,112,160,.40)';c.lineWidth=.8;c.stroke();
  c.fillStyle='#6B4A85';c.beginPath();c.ellipse(x+1,y-1,d.r*.60,d.r*.54,.3,0,TAU);c.fill();
  c.fillStyle='rgba(158,122,175,.45)';c.beginPath();c.ellipse(x-1.5,y-2.5,d.r*.24,d.r*.20,0,0,TAU);c.fill();
 }
 c.restore();
}

// Water leaking from the endothelium downward; grows sentence by sentence.
export function drawFluid(c,wallY,wet,z){
 if(z<=0||wet<=0)return;
 c.save();c.globalAlpha=z;
 c.beginPath();c.rect(-520,wallY-2,1040,470);c.clip();
 // Broad translucent aqueous halo, independent of the baked pigment's opacity.
 const depth=65+wet*230,half=145+wet*235;
 c.save();c.translate(0,wallY+depth*.48);c.scale(1,depth/half);
 const water=c.createRadialGradient(0,0,5,0,0,half);
 water.addColorStop(0,'rgba(127,190,219,'+(.14+wet*.38)+')');
 water.addColorStop(.65,'rgba(151,204,226,'+(.10+wet*.30)+')');
 water.addColorStop(1,'rgba(177,218,233,0)');
 c.fillStyle=water;c.fillRect(-half,-half,half*2,half*2);c.restore();
 const img=get('s07.fluid');
 if(img){
 const w=430+wet*520,h=150+wet*360;
 c.globalAlpha=z*(.30+.50*wet);
 c.drawImage(img,-w/2,wallY-8,w,h);
 }
 // A thin wet front and a few ripples keep the bloom reading as fluid.
 c.globalAlpha=z*(.20+.26*wet);
 c.strokeStyle='rgba(126,172,192,.55)';c.lineWidth=1.2;
 c.beginPath();c.ellipse(0,wallY+50+wet*90,150+wet*190,44+wet*70,0,.12,Math.PI-.12);c.stroke();
 for(let i=0;i<5;i++){const x=-170+i*86,w=30+i%3*22;
  c.strokeStyle='rgba(139,183,201,.34)';c.lineWidth=1.1;
  c.beginPath();c.moveTo(x,wallY+70+i*23+wet*46);c.quadraticCurveTo(x+w*.5,wallY+64+i*23+wet*46,x+w,wallY+72+i*23+wet*46);c.stroke();}
 c.restore();
}

// Protein particles drift out with the fluid; 96 seeded, so always >=80 visible.
export function drawProtein(c,wallY,protein,wet,z){
 if(z<=0||protein<=0)return;
 c.save();c.globalAlpha=z;
 for(let i=0;i<dots.length;i++){
  const d=dots[i],p=clamp(protein*1.55-d.y*.60);if(p<=.02)continue;
  const x=d.x+Math.sin(i*1.7+d.ph)*p*22+wet*Math.sin(d.ph)*10;
  const y=mix(wallY-30,wallY+36+d.y*150,p);
  const a=Math.min(1,p*5.5);
  c.globalAlpha=z*a*.9;
  c.fillStyle='rgba(157,125,171,.30)';c.beginPath();c.arc(x,y,d.s*1.9,0,TAU);c.fill();
  c.fillStyle='#8A6C9C';c.beginPath();c.arc(x,y,d.s,0,TAU);c.fill();
  c.fillStyle='rgba(214,196,223,.55)';c.beginPath();c.arc(x-d.s*.3,y-d.s*.35,d.s*.36,0,TAU);c.fill();
 }
 c.restore();
}

// Neutrophil: pale lavender cytoplasm, 3-4 small round lobed nuclei in a flower
// cluster. sq>0 stretches the body vertically and spreads the lobes; the waist is
// pinned to wallY so the cell reads as half inside / half outside the endothelium.
export function drawCrossingNeutrophil(c,x,y,wallY,sq){
 c.save();c.translate(x,y);
 const sy=1+.62*sq;
 c.beginPath();
 for(let j=0;j<=96;j++){
  const th=j/96*TAU,yy=Math.sin(th)*27*sy;
  const waist=Math.exp(-Math.pow((yy+y-wallY)/13,2));
  const xx=Math.cos(th)*26*(1-.55*sq*waist);
  j?c.lineTo(xx,yy):c.moveTo(xx,yy);
 }
 c.closePath();
 const g=c.createRadialGradient(-4,-6,3,0,0,33*sy);
 g.addColorStop(0,'#F4E7F1');g.addColorStop(.55,'#E3CEE5');g.addColorStop(.86,'#D0B7D8');g.addColorStop(1,'#B99FC8');
 c.fillStyle=g;c.fill();c.strokeStyle='rgba(126,92,148,.60)';c.lineWidth=1.1;c.stroke();c.clip();
 // Granules.
 c.fillStyle='rgba(150,110,164,.30)';
 for(let i=0;i<24;i++){const gx=Math.sin(i*4.7)*17*(1-.15*sq),gy=Math.cos(i*2.3)*17*sy;c.beginPath();c.arc(gx,gy,.9,0,TAU);c.fill();}
 // Lobed nucleus: 4 round lobes joined into a loose flower cluster (sample left figure).
 const lobes=[[-8,-7],[7,-6.5],[7.5,6.5],[-6.5,7]];
 const sx=1-.26*sq,spy=1+.55*sq,lr=6.5*(1-.10*sq);
 const pts=lobes.map(([px,py])=>[px*sx,py*spy]);
 c.strokeStyle='#6B4A85';c.lineWidth=1.8;c.lineCap='round';
 for(const [px,py] of pts){c.beginPath();c.moveTo(0,0);c.lineTo(px*.62,py*.62);c.stroke();}
 for(let i=0;i<pts.length;i++){
  const [px,py]=pts[i];
  c.fillStyle='#6B4A85';c.beginPath();
  for(let k=0;k<=40;k++){const a=k/40*TAU,rr=lr*(1+.07*Math.sin(a*3+i));const xx2=px+Math.cos(a)*rr,yy2=py+Math.sin(a)*rr;k?c.lineTo(xx2,yy2):c.moveTo(xx2,yy2);}
  c.closePath();c.fill();
  c.fillStyle='rgba(150,116,170,.28)';c.beginPath();c.arc(px-lr*.24,py-lr*.26,lr*.34,0,TAU);c.fill();
  for(let m=0;m<5;m++){c.fillStyle='rgba(66,40,92,.36)';c.beginPath();c.arc(px+Math.cos(m*2.4+i)*lr*.52,py+Math.sin(m*2.1+i)*lr*.5,.65,0,TAU);c.fill();}
 }
 c.restore();
}
