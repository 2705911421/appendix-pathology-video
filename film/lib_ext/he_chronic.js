import {rng} from '../lib/motion.js';
import {columnar} from './cells_ext.js';
import {bake,drawWash} from '../lib/wash.js';
const TAU=Math.PI*2;
export function point(a,r){const u=Math.cos(a)*r*1.5,v=Math.sin(a)*r;return [u*Math.cos(.3)-v*Math.sin(.3),u*Math.sin(.3)+v*Math.cos(.3)];}
export const focus={fib:point(-1.58,688),lymph:point(-1.72,650),plasma:point(-1.43,665)};
// S19-only morphology. Independent seeds make every cell repeatable at all powers.
function outline(c,rx,ry,phase,x=0,y=0,amp=.045,seg=72){
 c.beginPath();for(let j=0;j<=seg;j++){const a=j/seg*TAU,f=1+amp*Math.sin(3*a+phase)+amp*.45*Math.sin(5*a-phase)+amp*.22*Math.sin(9*a+phase*1.7);const px=x+Math.cos(a)*rx*f,py=y+Math.sin(a)*ry*f;j?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();
}
// Ellipse minus ellipse (evenodd) — used for the perinuclear hof crescent.
function crescent(c,cx,cy,ox,oy,ro,ro2,ri,ri2){
 c.beginPath();c.ellipse(cx+ox,cy+oy,ro,ro2,0,0,TAU);c.ellipse(cx,cy,ri,ri2,0,0,TAU);c.fill('evenodd');
}
function chronicCell(c,x,y,type,s=1,rot=0,key=0){
 const tr=c.getTransform(),px=x*tr.a+tr.e,py=y*tr.d+tr.f;if(px< -60||py< -60||px>c.canvas.width+60||py>c.canvas.height+60)return;
 const R=rng(8719+key*7919),pl=type==='plasma',ph=R()*TAU;
 // Plasma cells stay 1.5–1.8 x a lymphocyte on the same mother plate; both vary in size and aspect.
 const rx=pl?7.1+R()*1.5:3.8+R()*1.1,ry=pl?rx*(.58+R()*.18):rx*(.80+R()*.16);
 c.save();c.translate(x,y);c.rotate(rot);c.scale(s*.16,s*.16);
 outline(c,rx,ry,ph,0,0,pl?.05:.11);
 const g=c.createLinearGradient(-rx,-ry*.4,rx,ry*.5);
 if(pl){g.addColorStop(0,'#AC7099');g.addColorStop(.5,'#BC82A8');g.addColorStop(1,'#C99BB9');}
 else{g.addColorStop(0,'#C6A2C5');g.addColorStop(1,'#D6B8D0');}
 c.fillStyle=g;c.fill();
 c.save();c.clip();
 if(pl){
  const nx=-rx*.40,ny=(R()-.5)*.5,nrx=2.75+R()*.42,nry=nrx*(.84+R()*.12),nph=R()*TAU;
  // Hof: a narrow crescent between the nucleus and the cell centre, pinker than the cytoplasm, never white.
  
  // Translucent pigment blooms: uneven basophilia, never a flat disc.
  for(let j=0;j<10;j++){const xx=(R()-.5)*rx*1.9,yy=(R()-.5)*ry*1.9,rr=1.1+R()*3.2;const q=c.createRadialGradient(xx,yy,0,xx,yy,rr);q.addColorStop(0,j%2?'rgba(133,76,145,.28)':'rgba(224,180,206,.24)');q.addColorStop(1,'rgba(196,143,179,0)');c.fillStyle=q;c.fillRect(xx-rr,yy-rr,rr*2,rr*2);}
  for(let j=0;j<120;j++){const a=R()*TAU,rr=Math.sqrt(R());c.fillStyle=j%3?'rgba(105,58,126,.26)':'rgba(232,194,216,.26)';c.beginPath();c.ellipse(Math.cos(a)*rx*rr,Math.sin(a)*ry*rr,.13+R()*.34,.1+R()*.26,R()*TAU,0,TAU);c.fill();}
  // Hof drawn last so it reads as a distinct pale crescent beside the nucleus.
  for(let k=0;k<3;k++){const o=.6+k*.3;c.fillStyle=['rgba(228,197,213,.42)','rgba(230,201,216,.24)','rgba(233,206,219,.13)'][k];crescent(c,nx,ny,1.6,0,nrx+o,nry+o,nrx-.2,nry-.16);}
  // Slightly deeper basophilia at the periphery, inside a fine dark membrane.
  outline(c,rx*.9,ry*.9,ph,0,0,pl?.05:.11);c.strokeStyle='rgba(118,66,124,.22)';c.lineWidth=1.3;c.stroke();
  c.restore();
  // Eccentric, slightly flattened nucleus.
  outline(c,nrx,nry,nph,nx,ny,.04);
  c.fillStyle='#573870';c.fill();c.save();c.clip();
  // Dense chromatin: unequal peripheral clumps hugging the membrane, gaps, interior mottling, one central clump.
  for(let j=0;j<9;j++){const a=j*.7+R()*.62,rad=.68+R()*.12,t=R()*TAU;c.fillStyle=j%2?'#3E2459':'#472B62';c.beginPath();c.ellipse(nx+Math.cos(a)*nrx*rad,ny+Math.sin(a)*nry*rad,.5+R()*.62,.3+R()*.34,t,0,TAU);c.fill();}
  for(let j=0;j<30;j++){const a=R()*TAU,rr=.2+R()*.72;c.fillStyle=j%5?'rgba(52,31,76,.55)':'rgba(139,104,158,.42)';c.beginPath();c.ellipse(nx+Math.cos(a)*nrx*rr,ny+Math.sin(a)*nry*rr,.1+R()*.3,.08+R()*.24,R()*TAU,0,TAU);c.fill();}
  c.fillStyle='#4A2C67';c.beginPath();c.ellipse(nx+.25,ny-.15,.5,.62,.35,0,TAU);c.fill();
  c.restore();
  outline(c,nrx,nry,nph,nx,ny,.04);c.strokeStyle='#3B2353';c.lineWidth=.3;c.stroke();
  outline(c,rx,ry,ph,0,0,pl?.05:.11);c.strokeStyle='rgba(104,58,112,.92)';c.lineWidth=.34;c.stroke();
 }else{
  // Lymphocyte: nucleus fills the cell, narrow rim of cytoplasm shows on one side.
  for(let j=0;j<44;j++){const a=R()*TAU,rr=Math.sqrt(R());c.fillStyle=j%3?'rgba(104,64,126,.25)':'rgba(236,203,222,.3)';c.beginPath();c.ellipse(Math.cos(a)*rx*rr,Math.sin(a)*ry*rr,.08+R()*.17,.08+R()*.15,R()*TAU,0,TAU);c.fill();}
  c.restore();
  const nx=(R()-.5)*.5,ny=(R()-.5)*.4,nrx=rx*(.84+R()*.06),nry=ry*(.84+R()*.05),nph=R()*TAU;
  outline(c,nrx,nry,nph,nx,ny,.13,12);
  c.fillStyle='#55356F';c.fill();c.save();c.clip();
  // Coarse, dense chromatin; the interior is mottled, not a flat dot.
  for(let j=0;j<12;j++){const a=(j*.62+R()*.5),rad=.72+R()*.1;c.fillStyle='rgba(37,22,63,.82)';c.beginPath();c.ellipse(nx+Math.cos(a)*nrx*rad,ny+Math.sin(a)*nry*rad,.3+R()*.42,.26+R()*.36,a,0,TAU);c.fill();}
  for(let j=0;j<46;j++){const a=R()*TAU,rr=Math.sqrt(R());c.fillStyle=j%3?'rgba(40,24,66,.55)':'rgba(120,92,146,.42)';c.beginPath();c.ellipse(nx+Math.cos(a)*nrx*rr,ny+Math.sin(a)*nry*rr,.07+R()*.2,.06+R()*.17,R()*TAU,0,TAU);c.fill();}
  c.restore();
  outline(c,nrx,nry,nph,nx,ny,.13,12);c.strokeStyle='#33204F';c.lineWidth=.18;c.stroke();
  outline(c,rx,ry,ph,0,0,.03);c.strokeStyle='rgba(112,72,126,.42)';c.lineWidth=.14;c.stroke();
 }
 c.restore();
}
// Tapered, wavy, semi-transparent collagen ribbon with a soft dry edge.
function ribbon(c,len,w,phase,bend,color,alpha){
 const N=22,pts=[];
 for(let i=0;i<=N;i++){const t=i/N,q=(t-.5)*len;pts.push([q,Math.sin(q/3+phase)*.16+Math.sin(q/1.5+phase*1.6)*.09+bend*(q*q)/(len*len)]);}
 const hw=t=>w*(.22+.78*Math.pow(Math.sin(Math.PI*t),.62));
 c.beginPath();
 for(let i=0;i<=N;i++){const t=i/N;i?c.lineTo(pts[i][0],pts[i][1]-hw(t)):c.moveTo(pts[i][0],pts[i][1]-hw(t));}
 for(let i=N;i>=0;i--){const t=i/N;c.lineTo(pts[i][0],pts[i][1]+hw(t));}
 c.closePath();c.globalAlpha=alpha;c.fillStyle=color;c.fill();
 // Two dry striations along the same centreline.
 for(let k=0;k<2;k++){const off=(k?1:-1)*w*.32;c.beginPath();for(let i=0;i<=N;i++){const t=i/N;i?c.lineTo(pts[i][0],pts[i][1]+off*(.4+.6*Math.sin(Math.PI*t))):c.moveTo(pts[i][0],pts[i][1]+off*.4);}c.strokeStyle=color;c.globalAlpha=alpha*.5;c.lineWidth=.18;c.stroke();}
 c.globalAlpha=1;return pts;
}
function buildCells(){
 const cells=[],occ=[],R=rng(69070);
 function add(x,y,type,scale,rot){const rad=(type==='plasma'?7.2:3.9)*scale*.16,gap=-.1;if(occ.some(q=>Math.hypot(x-q.x,y-q.y)<rad+q.r+gap))return false;occ.push({x,y,r:rad});cells.push({x,y,type,s:scale,rot,key:cells.length+1});return true;}
 // Highlighted teaching cells: a few neighbours within the high-power field, mostly separated by collagen.
 add(...focus.plasma,'plasma',1,-.55);add(...focus.lymph,'lymph',1,.2);
 for(let i=0;i<4;i++){const a=R()*TAU,r=20+R()*38;add(focus.plasma[0]+Math.cos(a)*r,focus.plasma[1]+Math.sin(a)*r,'plasma',.86+R()*.26,R()*TAU);}
 for(let i=0;i<9;i++){const a=R()*TAU,r=24+R()*66;add(focus.plasma[0]+Math.cos(a)*r,focus.plasma[1]+Math.sin(a)*r,'lymph',.84+R()*.28,R()*TAU);}
 for(let i=0;i<7;i++){const a=R()*TAU,r=14+R()*54;add(focus.lymph[0]+Math.cos(a)*r,focus.lymph[1]+Math.sin(a)*r,'lymph',.84+R()*.26,R()*TAU);}
 add(focus.lymph[0]-18,focus.lymph[1]+12,'plasma',.9,-.2);
 // Compact small-nuclear islands, with open collagen between islands.
 const centres=[focus.lymph];
 for(let k=0;k<210;k++){const a=-1.58+(R()-.5)*2.1,r=520+R()*300;centres.push(point(a,r));}
 for(const cp of centres){
  if(Math.hypot(cp[0]-focus.fib[0],cp[1]-focus.fib[1])<110)continue;
  const radius=5+R()*7,n=35+Math.floor(R()*65);
  for(let i=0;i<n;i++){const a=R()*TAU,d=Math.sqrt(R())*radius;add(cp[0]+Math.cos(a)*d,cp[1]+Math.sin(a)*d,'lymph',.86+R()*.28,R()*TAU);}
  if(R()<.4)add(cp[0]+radius,cp[1],'plasma',.9,R()*TAU);
 }
 for(let i=0;i<320;i++){const a=-1.58+(R()-.5)*2.7,r=510+R()*335,p=point(a,r);add(...p,'lymph',.8+R()*.3,R()*TAU);}
 return cells;
}
export function prepareChronic(){
 bake('chronic.collagen',(b,P)=>{P.fill(b,P.blob(0,0,80,8,.22,719),'#DF9CB3',100,.35);},{seed:719,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});
 const cells=buildCells();
 function drawPlate(c){const R=rng(69070);
 function visible(p){const t=c.getTransform(),x=p[0]*t.a+t.e,y=p[1]*t.d+t.f;return x>-650&&y>-650&&x<c.canvas.width+650&&y<c.canvas.height+650;}

 // One oblique wall, shared by every magnification. No acute-cell assets.
 for(const [r,color] of [[885,'#EAD0D8'],[830,'#E2B1C2'],[740,'#E9C4D0'],[570,'#EAD5E0'],[390,'#D6BCD5'],[290,'#F6EEF0']]){c.beginPath();for(let i=0;i<=360;i++){const a=i/360*TAU,p=point(a,r+8*Math.sin(a*7)+5*Math.sin(a*11));i?c.lineTo(...p):c.moveTo(...p);}c.closePath();c.fillStyle=color;c.fill();}
 for(let i=0;i<155;i++){const a=i/155*TAU,p=point(a,342);c.save();c.translate(...p);c.rotate(a+.3);c.fillStyle='#F7EDF1';c.beginPath();c.ellipse(0,0,32,12,0,0,TAU);c.fill();for(let j=0;j<18;j++){const q=j/18*TAU;columnar(c,Math.cos(q)*35,Math.sin(q)*15,.65,q+Math.PI/2,i+j);}c.restore();}
 // Muscle fascicles with interspersed collagen; retain a recognisable muscular wall.
 for(let i=0;i<2900;i++){const a=R()*TAU,r=745+R()*105,p=point(a,r);c.save();c.translate(...p);c.rotate(a+Math.PI/2+.3);c.fillStyle='rgba(185,101,144,.17)';c.beginPath();c.ellipse(0,0,20+R()*20,3+R()*3,0,0,TAU);c.fill();c.fillStyle='rgba(94,55,111,.6)';c.beginPath();c.ellipse(0,0,7,1.4,0,0,TAU);c.fill();c.restore();}
 // Loose serosal connective tissue beyond the wall: the field fades out instead of ending on a flat band.
 for(let i=0;i<150;i++){const a=R()*TAU,r=890+R()*170,p=point(a,r);c.save();c.translate(...p);c.rotate(a+.3+(R()-.5)*1.2);drawWash(c,'chronic.collagen',0,0,45+R()*60,{alpha:.05+R()*.05});c.restore();}
 for(let i=0;i<450;i++){const a=R()*TAU,r=890+R()*150,p=point(a,r);c.save();c.translate(...p);c.rotate(a+.3+(R()-.5)*1.3);ribbon(c,14+R()*46,.25+R()*.55,R()*TAU,(R()-.5)*4,'#D9A0B6',.05+R()*.05);c.restore();}
 // Ground substance: pale washes so the band is continuous with the surrounding stroma.
 for(let i=0;i<1500;i++){const a=-1.58+(R()-.5)*3.0,r=500+R()*360,p=point(a,r);c.save();c.translate(...p);c.rotate(a+Math.PI/2+.3+(R()-.5)*.6);drawWash(c,'chronic.collagen',0,0,75+R()*55,{alpha:.075+R()*.075});c.restore();}
 // Broad collagen bundles follow the submucosal and intermuscular arcs, with irregular gaps and bends.
 for(let i=0;i<520;i++){
  const a=-1.58+(R()-.5)*2.5,r=510+R()*330,p=point(a,r),len=12+R()*32,w=1+R()*3.5;
  if(R()>1.12*Math.exp(-Math.pow((a+1.58)/.82,2)))continue; // density tapers along the layer
  if(Math.sin(a*7.3+r*.017)+Math.sin(a*17.1)*.7>1.15)continue; //疏松间隙
  c.save();c.translate(...p);c.rotate(a+Math.PI/2+.3+(R()-.5)*.85);
  ribbon(c,len,w,R()*TAU,(R()-.5)*16,i%3?'#C8759A':'#BC648E',.14+R()*.11);
  c.restore();
 }
 // Fine fibres fill between the bundles; their ends dissolve into the stroma.
 for(let i=0;i<1500;i++){
  const a=-1.58+(R()-.5)*2.8,r=500+R()*365,p=point(a,r),len=3+R()*12,w=.3+R()*1.15;
  if(R()>1.1*Math.exp(-Math.pow((a+1.58)/.95,2)))continue;
  c.save();c.translate(...p);c.rotate(a+Math.PI/2+.3+(R()-.5)*1.15);
  if(R()<.07){const pts=ribbon(c,len*.55,w*.8,R()*TAU,(R()-.5)*6,'#D08DA8',.08+R()*.06);const q=pts[pts.length-1];c.beginPath();c.moveTo(q[0],q[1]);c.bezierCurveTo(q[0]+len*.25,q[1]-6,q[0]+len*.4,q[1]-10,q[0]+len*.5,q[1]-14-R()*8);c.strokeStyle='rgba(196,110,148,'+(.10+R()*.06)+')';c.lineWidth=w*.7;c.stroke();}
  else ribbon(c,len,w,R()*TAU,(R()-.5)*7,i%2?'#CE86A3':'#C2779A',.09+R()*.11);
  // Spindle fibrocytes lie along the fibres, dark violet and slender.
  if(R()<.1){const sx=(R()-.5)*len*.5;c.fillStyle='rgba(97,58,120,.82)';c.beginPath();c.ellipse(sx,0,4.4+R()*3.4,.62+R()*.3,0,0,TAU);c.fill();c.fillStyle='rgba(60,34,86,.3)';c.beginPath();c.ellipse(sx,0,3,.22,0,0,TAU);c.fill();}
  c.restore();
 }
 // Dense eosinophilic stroma, baked once into the existing mother-plate tiles.
 // Independent seed preserves every approved cell's morphology and chromatin.
 for(let i=0;i<120000;i++){
  const F=rng(70419+i*7919);
  const a=-1.58+(F()-.5)*2.8,r=500+F()*365,p=point(a,r);
  if(F()>Math.exp(-Math.pow((a+1.58)/1.05,2))||!visible(p))continue;
  c.save();c.translate(...p);c.rotate(a+Math.PI/2+.3+(F()-.5)*.26);
  const fibZone=Math.hypot(p[0]-focus.fib[0],p[1]-focus.fib[1])<145;
  const len=fibZone?5+F()*13:1.4+F()*7,w=fibZone?.2+F()*.3:.09+F()*.21,ph=F()*TAU;
  ribbon(c,len,w,ph,(F()-.5)*3,i%3?'#BA6B91':'#E2A0B4',.24+F()*.3);
  // Small broken pigment deposits give each fibre irregular longitudinal staining.
  for(let j=0;j<8;j++){c.fillStyle=j%2?'rgba(158,74,119,.16)':'rgba(245,206,213,.3)';c.beginPath();c.ellipse((F()-.5)*len,(F()-.5)*2,.08+F()*.35,.06+F()*.15,0,0,TAU);c.fill();}
  c.restore();
 }
 for(let i=0;i<1900;i++){
  const F=rng(80419+i*7919);
  const a=-1.58+(F()-.5)*2.65,r=510+F()*335,p=point(a,r);
  if(!visible(p)||Math.hypot(p[0]-focus.plasma[0],p[1]-focus.plasma[1])<5)continue;
  c.save();c.translate(...p);c.rotate(a+Math.PI/2+.3+(F()-.5)*.34);
  const l=1.7+F()*1.9,w=.32+F()*.35;
  c.beginPath();c.moveTo(-l,0);c.bezierCurveTo(-l*.36,-w*1.1,l*.42,-w,l,0);c.bezierCurveTo(l*.36,w*.95,-l*.4,w,-l,0);c.fillStyle=i%3?'#674078':'#845787';c.fill();
  c.strokeStyle='rgba(48,27,76,.6)';c.lineWidth=.17;c.stroke();
  for(let j=0;j<10;j++){c.fillStyle=j%3?'rgba(44,25,70,.48)':'rgba(159,122,170,.5)';c.beginPath();c.ellipse((F()-.5)*l*1.45,(F()-.5)*w,.12+F()*.33,.12+F()*.22,0,0,TAU);c.fill();}
  c.restore();
 }
 for(const q of cells)chronicCell(c,q.x,q.y,q.type,q.s,q.rot,q.key);
 }
 // Render native high-resolution tiles with a small bleed so joins are invisible.
 const TILE=1700,TILEH=1250,B=4,SC=3;
 const tiles=[];for(let j=0;j<2;j++)for(let i=0;i<2;i++){const tile=document.createElement('canvas');tile.width=(TILE+2*B)*SC;tile.height=(TILEH+2*B)*SC;const c=tile.getContext('2d',{willReadFrequently:true});c.scale(SC,SC);c.translate(TILE+B-i*TILE,TILEH+B-j*TILEH);drawPlate(c);tiles.push({canvas:tile,x:-TILE-B+i*TILE,y:-TILEH-B+j*TILEH,w:TILE+2*B,h:TILEH+2*B});}
 // Native detail patches of the SAME mother plate preserve subpixel chromatin.
 for(const [centre,size,res] of [[focus.lymph,220,12],[focus.plasma,90,24]]){
  const tile=document.createElement('canvas');tile.width=tile.height=size*res;
  const c=tile.getContext('2d');c.scale(res,res);c.translate(size/2-centre[0],size/2-centre[1]);drawPlate(c);
  tiles.push({canvas:tile,x:centre[0]-size/2,y:centre[1]-size/2,w:size,h:size});
 }
 return tiles;
}
