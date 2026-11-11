// Opt-in chapter 04 plate. All irregular geometry is seeded and cached in field coordinates.
import { rng } from './motion.js';
import { C } from './tokens.js';
import { drawWash } from './wash_target.js';
const R = rng(40417), TAU = Math.PI * 2;
const ellipse = (p,x,y,rx,ry,a=0) => { p.moveTo(x+Math.cos(a)*rx,y+Math.sin(a)*rx); p.ellipse(x,y,rx,ry,a,0,TAU); };
const speck = new Path2D();
for(let i=0;i<25;i++){const a=R()*TAU,r=Math.sqrt(R())*.86; ellipse(speck,Math.cos(a)*r,Math.sin(a)*r,.035+R()*.065,.04+R()*.08);}
export function chromatin(ctx,x,y,rx,ry,a){ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.scale(rx,ry);ctx.fillStyle='#38234F';ctx.fill(speck);ctx.restore();}
// Fine eosin bundles give the preserved wall a fibrous, ink-on-watercolour structure.
const muscleFibres = new Path2D(), collagen = new Path2D();
for(let i=0;i<280;i++){
 const x=-440+R()*880,y=-5+R()*230,l=22+R()*65;
 muscleFibres.moveTo(x-l,y);muscleFibres.bezierCurveTo(x-l*.4,y-5,x+l*.3,y-4,x+l,y);
 muscleFibres.bezierCurveTo(x+l*.2,y+5,x-l*.4,y+4,x-l,y);
}
for(let i=0;i<180;i++){
 const x=-430+R()*860,y=-145+R()*130,l=12+R()*50;
 collagen.moveTo(x,y);collagen.bezierCurveTo(x+l*.3,y-7,x+l*.6,y+8,x+l,y+2);
}
export function tissueTexture(ctx,k){ctx.save();ctx.globalAlpha*=k;ctx.strokeStyle='rgba(177,84,124,.3)';ctx.lineWidth=.65;ctx.stroke(muscleFibres);ctx.strokeStyle='rgba(189,106,147,.4)';ctx.stroke(collagen);ctx.restore();}
const NR=rng(40303);
// Kidney/sausage lobes, semi-axes 4.0×2.9. Centres are packed so neighbours keep ≥1.2 of pale cytoplasm.
const lobeOutline=(path,x,y,a,b,rot,phase,sign)=>{const N=36;for(let k=0;k<=N;k++){const t=k/N*TAU,f=1+.006*Math.sin(2*t+phase)+.004*Math.cos(3*t+phase*1.3),indent=1-.14*Math.exp(-(((t-sign*Math.PI/2)/.58)**2)),u=Math.cos(t)*a*f,v=Math.sin(t)*b*f*indent,px=x+u*Math.cos(rot)-v*Math.sin(rot),py=y+u*Math.sin(rot)+v*Math.cos(rot);k?path.lineTo(px,py):path.moveTo(px,py);}path.closePath();};
const lobeSets=[
[{x:-3.66,y:0.17,rot:1.50},{x:3.54,y:-0.18,rot:1.72}],
[{x:0,y:-4.50,rot:-0.22},{x:3.90,y:2.25,rot:1.87},{x:-3.90,y:2.25,rot:3.97}],
[{x:0,y:-5.85,rot:-0.07},{x:5.85,y:0,rot:1.50},{x:0,y:5.85,rot:3.07},{x:-5.85,y:0,rot:4.64}],
[{x:-6.12,y:-4.15,rot:5.28},{x:1.81,y:-5.72,rot:5.06},{x:7.65,y:-.2,rot:1.48},{x:2.21,y:5.59,rot:1.2},{x:-5.77,y:4.57,rot:4.07}],
];
const cellRadii=[[7.20,5.65],[8.05,7.55],[9.25,8.70],[10.625,10]];
const cells=lobeSets.map((chain,ci)=>{const lobes=new Path2D(),bridges=new Path2D(),granules=new Path2D(),clumps=new Path2D();let inward=0;for(const p of chain)inward+=Math.sin(p.rot)*p.x-Math.cos(p.rot)*p.y;const sign=inward>=0?1:-1;chain.forEach((p,i)=>{const ja=.997+NR()*.006,jb=.997+NR()*.006;lobeOutline(lobes,p.x,p.y,4*ja,2.9*jb,p.rot,i*1.7,sign);if(i){const q=chain[i-1],mx=(p.x+q.x)/2,my=(p.y+q.y)/2,ol=Math.hypot(mx,my)||1;bridges.moveTo(q.x,q.y);bridges.quadraticCurveTo(mx-my/ol*.65,my+mx/ol*.65,p.x,p.y);}for(let k=0;k<5;k++)ellipse(clumps,p.x+(R()-.5)*3.1,p.y+(R()-.5)*2.2,.35+R()*.4,.32);});const reach=cellRadii[ci][0]*.78;for(let i=0;i<22;i++){const a=R()*TAU,r=reach*Math.sqrt(R());ellipse(granules,Math.cos(a)*r,Math.sin(a)*r*.94,.22+R()*.22,.3);}return {lobes,bridges,granules,clumps};});
export function detailedNeutrophil(ctx,x,y,c,s){const p=cells[c.lobes-2],sc=s*(c.sz||1),rad=cellRadii[c.lobes-2];ctx.save();ctx.translate(x,y);ctx.rotate(c.rot);ctx.scale(sc,sc);ctx.beginPath();ctx.ellipse(0,0,rad[0],rad[1],0,0,TAU);ctx.fillStyle='rgba(226,170,200,.75)';ctx.fill();ctx.fillStyle='rgba(167,105,159,.38)';ctx.fill(p.granules);ctx.strokeStyle='#9273A5';ctx.lineWidth=.48/sc;ctx.lineCap='round';ctx.stroke(p.bridges);ctx.fillStyle='#51336F';ctx.fill(p.lobes);ctx.fillStyle='#3F2A66';ctx.fill(p.clumps);ctx.restore();}
const mesh=new Path2D();
for(let i=0;i<140;i++){const x=-430+R()*860,y=270+R()*110,l=20+R()*65,a=(R()-.5)*2.4;for(let w=0;w<3;w++){mesh.moveTo(x,y+w*1.5);mesh.bezierCurveTo(x+l*.3,y-12+w*2,x+l*.6,y+Math.sin(a)*l,x+l,y+Math.sin(a)*l+w*2);mesh.moveTo(x+l*.5,y+Math.sin(a)*l*.4);mesh.quadraticCurveTo(x+l*.7,y-12,x+l*.85,y-16-R()*15);}}
export function fibrinMesh(ctx,k){ctx.save();ctx.globalAlpha*=k;ctx.strokeStyle='#C66D92';ctx.lineWidth=.55;ctx.stroke(mesh);ctx.restore();}
// Cached territories, overlapping RBC discs, and torn tissue, all in field coordinates.
const territories=[],plugs=new Path2D(),blood=[],tractBlood=[],dust=new Path2D(),ghosts=new Path2D();
const BR=rng(40304), LR=rng(40533);
const disc=(out,x,y)=>{const rx=3.85*(.8+R()*.4),ry=rx*(.5+R()*.4),a=R()*TAU,p=new Path2D(),c=new Path2D();ellipse(p,x,y,rx,ry,a);ellipse(c,x,y,rx*.54,ry*.5,a);out.push({p,c,alpha:.7+BR()*.15,under:BR()<.45,lysed:LR()<.25});};
const heme=[], kary=new Path2D(), karyDark=new Path2D(), smudge=new Path2D(), KR=rng(40521);
function karyCluster(cx,cy){const n=3+Math.floor(KR()*6);for(let i=0;i<n;i++){const a=KR()*TAU,d=KR()*3.1,rx=.8+KR(),ry=.8+KR()*.9;ellipse(KR()<.5?karyDark:kary,cx+Math.cos(a)*d,cy+Math.sin(a)*d*.85,rx,Math.min(1.8,ry),KR()*TAU);}}
function smudgeAt(cx,cy,n){for(let j=0;j<n;j++)ellipse(smudge,cx+(KR()-.5)*14,cy+(KR()-.5)*11,2.4+KR()*6.5,2+KR()*4.5,KR()*TAU);}
let prepared=false;
export function prepareGangrene(vessels){
 if(prepared)return;prepared=true;
 for(const [vx,vy,vr] of vessels){
  ellipse(plugs,vx,vy,vr*.93,vr*.72,.12);
  for(let i=0;i<5;i++){const a=i*TAU/5+R()*.5,d=i?35+R()*70:0;territories.push({x:vx+Math.cos(a)*d,y:vy+Math.sin(a)*d*1.6,size:225+R()*160,rot:R()*TAU,key:i%4,alpha:.48+R()*.27});}
  // Compact asymmetric pools outside each vessel; leave the dark plug exposed.
  for(let j=0;j<3;j++){const a=R()*TAU,cx=vx+Math.cos(a)*(vr+19),cy=vy+Math.sin(a)*(vr+19);
   for(let i=0;i<65;i++){const b=R()*TAU,d=Math.sqrt(R()),x=cx+Math.cos(b)*d*29,y=cy+Math.sin(b)*d*22;if(Math.hypot(x-vx,(y-vy)/.8)>vr+4)disc(blood,x,y);}
  }
 }
 for(let i=0;i<1050;i++){const x=-420+R()*840,y=-286+R()*565;dust.moveTo(x,y);dust.lineTo(x+R()*2.4,y+R()*2.5);dust.lineTo(x-1,y+R()*3);dust.closePath();}
 const GR=rng(40519);
 for(let i=0;i<90;i++){let x=-410+GR()*820,y=-270+GR()*540;if(Math.abs(x-190)<26)x+=x<190?-40:40;ellipse(ghosts,x,y,4.3+GR()*2.4,3.9+GR()*2.1,GR()*TAU);}
 for(const [vx,vy] of vessels){
  for(let k=0;k<6;k++)karyCluster(vx+Math.cos(KR()*TAU)*(18+KR()*88),vy+Math.sin(KR()*TAU)*(16+KR()*78));
  for(let k=0;k<3;k++)smudgeAt(vx+Math.cos(KR()*TAU)*(10+KR()*70),vy+Math.sin(KR()*TAU)*(8+KR()*60),5+Math.floor(KR()*4));
 }
 // Five red-brown patches: three on vessels, two along the tear. Fresh seed.
 const HP=rng(40871), anchors=[[-270,-80,false],[-90,-55,false],[130,-90,false],[190,-30,true],[190,150,true]];
 for(const [ax,ay,tear] of anchors)heme.push({x:ax+(HP()-.5)*40,y:ay+(HP()-.5)*32,size:230+HP()*80,rot:HP()*TAU,alpha:.38+HP()*.14,tear});
 const VR=rng(40643);
 const ringAt=(cx,cy,rad,wob,ph)=>{const p=new Path2D(),N=30;for(let i=0;i<=N;i++){const a=i/N*TAU,f=1+wob*Math.sin(2*a+ph)+wob*.65*Math.sin(4*a+ph*1.3),px=cx+Math.cos(a)*rad*f,py=cy+Math.sin(a)*rad*.86*f;i?p.lineTo(px,py):p.moveTo(px,py);}p.closePath();return p;};
 for(const [vx,vy,vr] of vessels){
  const nuclei=new Path2D(),nn=4+Math.floor(VR()*3);
  for(let i=0;i<nn;i++){const a=VR()*TAU,rad=vr*(1.02+VR()*.06);ellipse(nuclei,vx+Math.cos(a)*rad,vy+Math.sin(a)*rad*.86,2.6,.65,a+1.57);}
  zahnWalls.push({outer:ringAt(vx,vy,vr*1.14,.04,VR()*4),inner:ringAt(vx,vy,vr*.92,.035,VR()*4),nuclei});
  const nB=3+Math.floor(VR()*3),bands=[],shift=VR()*TAU;
  for(let b=0;b<nB;b++){const rad=vr*(b?.28+b*(.55/nB):.16),ox=Math.cos(shift+b)*vr*.16,oy=Math.sin(shift+b*1.7)*vr*.12;bands.push({path:ringAt(vx+ox,vy+oy,rad,.16+VR()*.05,VR()*6),fill:!b,rbc:b%2===0,w:Math.max(1.35,vr*(.1+VR()*.04))});}
  zahnBands.push(bands);
  const arms=5+Math.floor(SR()*4);
  for(let a=0;a<arms;a++){let ang=SR()*TAU;const len=34+SR()*118,n=2+Math.floor(SR()*6),curl=(SR()-.5)*1.35;
   for(let i=0;i<n;i++){const t=(i+.35)/n;ang+=curl*.22+(SR()-.5)*.4;const along=vr+8+t*len,side=(SR()-.5)*(5+t*24),x=vx+Math.cos(ang)*along+Math.cos(ang+1.57)*side,y=vy+Math.sin(ang)*along+Math.sin(ang+1.57)*side;if(Math.hypot(x-vx,y-vy)<vr+3)continue;pushDisc(spray,x,y,SR);}}
 }
 // Extra discs so the spray sits inside the red-brown patches. New seed; SR/TS stay put.
 const RC=rng(40891);
 for(const h of heme){const n=22+Math.floor(RC()*16);for(let i=0;i<n;i++){const a=RC()*TAU,d=Math.sqrt(RC())*h.size*.2;pushDisc(spray,h.x+Math.cos(a)*d,h.y+Math.sin(a)*d*.75,RC);}}
}
const tear=new Path2D(),fray=new Path2D(),tags=new Path2D(),edgeDust=new Path2D(),debris=new Path2D();
const left=[],right=[];
for(let i=0;i<=80;i++){const y=-310+i*7.75,axis=190+Math.sin(i*.31)*8+Math.sin(i*.83)*4,width=12+R()*32;left.push([axis-width/2-R()*10,y]);right.push([axis+width/2+R()*10,y]);}
[...left,...right.slice().reverse()].forEach((p,i)=>i?tear.lineTo(...p):tear.moveTo(...p));tear.closePath();
// Separate rng: keeps the R/BR stream (tear, pus, vessel pools) while halving tract discs into rim clumps.
const clumpGate=(()=>{const G=rng(40311),m=Array(162).fill(false);let i=0;while(i<162){const width=2+Math.floor(G()*3);for(let k=0;k<width&&i<162;k++,i++)m[i]=true;i+=2+Math.floor(G()*3);}return m;})();
let edge=0;
for(const [side,sign] of [[left,1],[right,-1]])for(const [x,y] of side){
 const reach=4+R()*14;
 tags.moveTo(x-sign*3,y-4);tags.quadraticCurveTo(x+sign*reach*.6,y-3,x+sign*reach,y+3);tags.lineTo(x+sign*3,y+8);tags.closePath();
 for(let j=0;j<3;j++){fray.moveTo(x-sign*5,y+j);fray.quadraticCurveTo(x+sign*reach*.8,y+3,x+sign*(reach+R()*7),y+6+R()*9);}
 for(let j=0;j<9;j++)ellipse(edgeDust,x+(R()-.5)*13,y+(R()-.5)*12,.4+R()*1.2,.5+R());
 const gate=clumpGate[edge++],bloodPatch=BR()<.5;
 for(let j=0;j<5;j++){const u=R(),v=R();if(!bloodPatch)continue;if(!gate){R();R();R();BR();BR();continue;}disc(tractBlood,x-sign*(.4+u*3.5),y+(v-.5)*5);}
 ellipse(debris,x+sign*(5+R()*9),y+R()*5,1+R()*2,1+R()*3,R()*TAU);
}
const pus=new Path2D(),pusNuclei=new Path2D(),leakFibres=new Path2D();
for(let i=0;i<95;i++){const y=275+R()*115;ellipse(pus,190+(R()-.5)*(35+(y-275)*.8),y,3+R()*10,3+R()*9);}
for(let i=0;i<80;i++){const y=286+R()*94,x=190+(R()-.5)*(38+(y-275)*.8);ellipse(pusNuclei,x,y,1.3,1.8);ellipse(pusNuclei,x+3,y+2,1.2,1.6);if(i<35){leakFibres.moveTo(x,y-8);leakFibres.quadraticCurveTo(x-8,y+5,x+5,y+16);}}
for(let i=2;i<left.length;i+=3){karyCluster(left[i][0]-8-KR()*12,left[i][1]);karyCluster(right[i][0]+8+KR()*12,right[i][1]);if(i%6===2)smudgeAt((left[i][0]+right[i][0])/2,left[i][1],4);}
// Organic perforation. Fresh seed, so the tear/pus random stream stays put. Gap widens toward the serosa.
const TR=rng(40541), tearOrganic=new Path2D(), ragsBody=new Path2D(), ragsTip=new Path2D();
const smoothX=pts=>pts.map((p,i)=>{let s=0,w=0;for(let k=-3;k<=3;k++){const j=Math.max(0,Math.min(pts.length-1,i+k)),wk=4-Math.abs(k);s+=pts[j][0]*wk;w+=wk;}return s/w;});
const lS=smoothX(left), rS=smoothX(right), rimL=[], rimR=[];
const JN=rng(40821);
const notch=n=>{const a=Array(n).fill(0);for(let b=0;b<10;b++){const i=2+Math.floor(JN()*(n-4)),w=1+Math.floor(JN()*3),amp=(7+JN()*8)*(JN()<.42?1:-.65);for(let j=-w;j<=w;j++){const ii=i+j;if(ii<1||ii>=n-1)continue;const tent=1-Math.abs(j)/(w+.35);if(tent>0)a[ii]+=amp*tent;}}for(let i=1;i<n-1;i+=2)a[i]+=(JN()-.42)*8;for(let i=1;i<n-1;i++)a[i]+=(JN()-.5)*3.4;return a;};
const jL=notch(left.length), jR=notch(left.length);
for(let i=0;i<left.length;i++){
 const y=left[i][1],t=i/(left.length-1);
 const env=.46+t*t*.95+.22*Math.sin(i*.41)+.12*Math.sin(i*1.07+1.4)+(t>.84?(t-.84)*2.6:0);
 const mid=(lS[i]+rS[i])/2,half=Math.max(7,(rS[i]-lS[i])/2);
 const wave=Math.sin(i*.29)*9+Math.sin(i*.73+.8)*4.5+Math.sin(i*1.31)*2;
 const jagL=Math.sin(i*1.9)*3.1+Math.sin(i*3.7+.5)*1.6, jagR=Math.sin(i*2.15+1.2)*3.4+Math.sin(i*4.1)*1.5;
 rimL.push([mid-half*env+wave*.28+jagL+jL[i],y]); rimR.push([mid+half*env+wave*.28+jagR-jR[i],y]);
}
tearOrganic.moveTo(rimL[0][0],rimL[0][1]);
for(let i=1;i<rimL.length;i++)tearOrganic.lineTo(rimL[i][0],rimL[i][1]);
for(let i=rimR.length-1;i>=0;i--)tearOrganic.lineTo(rimR[i][0],rimR[i][1]);
tearOrganic.closePath();
function rag(x,y,ang,len,w){const dx=Math.cos(ang),dy=Math.sin(ang),px=-dy,py=dx,bow=(TR()-.5)*len*.45,tip=.7,bx=x+dx*len*tip,by=y+dy*len*tip;
 ragsBody.moveTo(x+px*w,y+py*w);ragsBody.bezierCurveTo(x+dx*len*.28+px*(w*.4+bow),y+dy*len*.28+py*(w*.4+bow),bx+px*w*.4,by+py*w*.4,bx+px*w*.2,by+py*w*.2);ragsBody.lineTo(bx-px*w*.2,by-py*w*.2);ragsBody.bezierCurveTo(x+dx*len*.22-px*w*.45,y+dy*len*.22-py*w*.45,x-px*w*.55,y-py*w*.55,x-px*w*.15,y-py*w*.15);ragsBody.closePath();
 ragsTip.moveTo(bx+px*w*.2,by+py*w*.2);ragsTip.bezierCurveTo(x+dx*len*.86+px*w*.05,y+dy*len*.86+py*w*.05,x+dx*len*.95,y+dy*len*.95,x+dx*len,y+dy*len);ragsTip.bezierCurveTo(x+dx*len*.88-px*w*.04,y+dy*len*.88-py*w*.04,bx-px*w*.08,by-py*w*.08,bx-px*w*.2,by-py*w*.2);ragsTip.closePath();}
function dress(wall,other){for(let i=1;i<wall.length-1;){const [x,y]=wall[i],[ox,oy]=other[Math.min(i,other.length-1)],inward=Math.atan2(oy-y,ox-x),half=Math.hypot(ox-x,oy-y)*.5,roll=TR();if(roll<.42){i+=3+Math.floor(TR()*6);continue;}const len=Math.min(half*.78,roll<.62?4+TR()*9:roll<.84?12+TR()*16:24+TR()*26),ang=inward+(TR()-.5)*2.5,w=.55+TR()*2.4;rag(x,y,ang,len,w);if(TR()<.18)rag(x,y,inward+(TR()-.5)*2.7,Math.min(half*.5,5+TR()*14),.45+TR()*1.4);i+=3+Math.floor(TR()*5);}}
dress(rimL,rimR);dress(rimR,rimL);
const ST=rng(40847), stumpBody=new Path2D(), stumpTip=new Path2D(), stumpFib=new Path2D();
function addStump(x,y,ang,len,bw){const dx=Math.cos(ang),dy=Math.sin(ang),px=-dy,py=dx,bow=(ST()-.5)*len*.65,kink=(ST()-.5)*.55,ax=Math.cos(ang+kink),ay=Math.sin(ang+kink),tx=x+ax*len,ty=y+ay*len,mx=x+dx*len*.4+px*bow,my=y+dy*len*.4+py*bow,bw2=Math.max(.7,bw*(.28+ST()*.2));stumpBody.moveTo(x+px*bw,y+py*bw);stumpBody.quadraticCurveTo(mx+px*bw*.55,my+py*bw*.55,tx+px*bw2,ty+py*bw2);stumpBody.lineTo(tx-px*bw2,ty-py*bw2);stumpBody.quadraticCurveTo(mx-px*bw*.4,my-py*bw*.4,x-px*bw*.85,y-py*bw*.85);stumpBody.closePath();const s=.55,sx=x+ax*len*s,sy_=y+ay*len*s,tw=bw*(.34+ST()*.12);stumpTip.moveTo(sx+px*tw,sy_+py*tw);stumpTip.quadraticCurveTo(tx+px*bw2,ty+py*bw2,tx+(ST()-.5)*1.6,ty+(ST()-.5)*1.6);stumpTip.quadraticCurveTo(tx-px*bw2,ty-py*bw2,sx-px*tw,sy_-py*tw);stumpTip.closePath();if(ST()<.5){const fl=4+ST()*8;stumpFib.moveTo(tx,ty);stumpFib.quadraticCurveTo(tx+ax*fl*.6+px*(ST()-.5)*6,ty+ay*fl*.6,tx+ax*fl,ty+ay*fl);}}
function stud(wall,other){const n=8+Math.floor(ST()*7),used=new Set();let guard=0;while(used.size<n&&guard++<80){const i=2+Math.floor(ST()*(wall.length-4));if(used.has(i))continue;used.add(i);const [x,y]=wall[i],[ox,oy]=other[i],inward=Math.atan2(oy-y,ox-x),len=5+ST()*9,ang=inward+(ST()-.5)*.7,bw=2.1+ST()*3.2;addStump(x,y,ang,len,bw);if(ST()<.35)addStump(x+(ST()-.5)*3,y+(ST()-.5)*2.5,ang+(ST()-.5)*.5,4+ST()*6,bw*.55);}}
stud(rimL,rimR);stud(rimR,rimL);
const zahnWalls=[],zahnBands=[],spray=[];
const SR=rng(40661);
function pushDisc(out,x,y,rnd){const rx=3.1*(.72+rnd()*.6),ry=rx*(.36+rnd()*.4),a=rnd()*TAU,p=new Path2D(),c=new Path2D();ellipse(p,x,y,rx,ry,a);ellipse(c,x,y,rx*.46,ry*.38,a);out.push({p,c,alpha:.48+rnd()*.45,under:false,lysed:rnd()<.25});}
const TS=rng(40677);
for(let i=2;i<rimL.length-2;i+=3){const gate=TS();if(gate<.4)continue;const wall=TS()<.5?rimL[i]:rimR[i],other=wall===rimL[i]?rimR[i]:rimL[i],inward=Math.atan2(other[1]-wall[1],other[0]-wall[0]);let ang=inward+Math.PI+(TS()-.5)*1.05;const n=gate>.84?4:gate>.64?2:1;for(let k=0;k<n;k++){ang+=(TS()-.5)*.65;const d=7+k*(7+TS()*6)+TS()*5;pushDisc(spray,wall[0]+Math.cos(ang)*d+(TS()-.5)*4,wall[1]+Math.sin(ang)*d+(TS()-.5)*4,TS);}}
const cellGhosts=new Path2D(),cellGhostOpen=new Path2D(),CG=rng(40601);
for(let i=0;i<52;i++){const x=-390+CG()*780,y=-265+CG()*545,sc=.8+CG()*.4,rx=9.2*sc*(.82+CG()*.36),ry=7.4*sc*(.75+CG()*.4),rot=CG()*TAU,ph=CG()*6.2,broken=CG()<.38,N=28,path=broken?cellGhostOpen:cellGhosts,k0=broken?1+Math.floor(CG()*6):0,k1=broken?N-3-Math.floor(CG()*8):N;for(let k=k0;k<=k1;k++){const a=k/N*TAU;let f=1+.22*Math.sin(2*a+ph)+.15*Math.sin(3*a+ph*1.3)+.1*Math.sin(5*a+ph*.55)+(CG()-.5)*.18;if((k-k0)%11===4)f-=.28;const u=Math.cos(a)*rx*f,v=Math.sin(a)*ry*f,px=x+u*Math.cos(rot)-v*Math.sin(rot),py=y+u*Math.sin(rot)+v*Math.cos(rot);k===k0?path.moveTo(px,py):path.lineTo(px,py);}if(!broken)path.closePath();}
const gapFib=new Path2D(),gapFibFine=new Path2D(),FR=rng(40691);
for(let n=0;n<64;n++){const i=1+Math.floor(FR()*(rimL.length-2)),t=.18+FR()*.64,x=rimL[i][0]*(1-t)+rimR[i][0]*t,y=rimL[i][1]*(1-t)+rimR[i][1]*t,len=16+FR()*48,lean=(FR()-.5)*22,bow=(FR()-.5)*14,path=FR()<.35?gapFibFine:gapFib;path.moveTo(x,y);path.bezierCurveTo(x+bow,y+len*.34,x+lean*.4,y+len*.68,x+lean,y+len);}
let gapArea=0;for(let i=1;i<rimL.length;i++){const w0=rimR[i-1][0]-rimL[i-1][0],w1=rimR[i][0]-rimL[i][0];gapArea+=Math.abs((w0+w1)*.5*(rimL[i][1]-rimL[i-1][1]));}
const gapCells=[],PR=rng(40707),nGap=Math.max(8,Math.round(gapArea/400));
for(let n=0;n<nGap;n++){const i=1+Math.floor(PR()*(rimL.length-2)),t=.16+PR()*.68;gapCells.push({x:rimL[i][0]*(1-t)+rimR[i][0]*t+(PR()-.5)*4,y:rimL[i][1]*(1-t)+rimR[i][1]*t+(PR()-.5)*5,lobes:2+Math.floor(PR()*4),rot:PR()*TAU,sz:.72+PR()*.36,fade:PR()<.5?.3+PR()*.22:.58+PR()*.32});}
const halo=[];
for(let i=3;i<rimL.length;i+=8){for(const pair of [[rimL[i],rimR[i]],[rimR[i],rimL[i]]]){const wall=pair[0],other=pair[1],ang=Math.atan2(wall[1]-other[1],wall[0]-other[0]);halo.push([wall[0]+Math.cos(ang)*20,wall[1]+Math.sin(ang)*14]);}}
function drawBlood(ctx,pool){ctx.save();const alpha=ctx.globalAlpha;for(const d of pool){if(d.lysed){ctx.globalAlpha=alpha*d.alpha*.28;ctx.fillStyle='#C9A4AC';ctx.fill(d.p);continue;}ctx.globalAlpha=alpha*d.alpha;ctx.fillStyle='#A8404E';ctx.fill(d.p);ctx.strokeStyle='#7E2A38';ctx.lineWidth=.28;ctx.stroke(d.p);ctx.fillStyle='#C9A8AE';ctx.fill(d.c);}ctx.restore();}
function drawZahn(ctx,kv){ctx.save();ctx.globalAlpha*=kv;ctx.lineJoin='round';ctx.lineCap='round';for(let i=0;i<zahnWalls.length;i++){for(const b of zahnBands[i]){if(b.fill){ctx.fillStyle=b.rbc?'#8E3A3E':'#F0D4DC';ctx.fill(b.path);}else{ctx.strokeStyle=b.rbc?'#A8404E':'#F3D5DE';ctx.lineWidth=b.w;ctx.stroke(b.path);}}const w=zahnWalls[i];ctx.strokeStyle='#EBC3D0';ctx.lineWidth=1.45;ctx.stroke(w.outer);ctx.strokeStyle='#D98BA8';ctx.lineWidth=.85;ctx.stroke(w.inner);ctx.fillStyle='#6B4C9A';ctx.fill(w.nuclei);}ctx.restore();}
export function gangrene(ctx,{kv,kn,kp,ko}){
 for(const h of heme){const g=h.tear?Math.min(kv,kp):kv;if(!(g>0))continue;const a=Math.min(.55,Math.max(.35,h.alpha))*g;drawWash(ctx,'c04.heme',h.x,h.y,h.size,{alpha:a,grow:g,rot:h.rot,blend:'source-over',soft:.82});}
 for(const p of territories)if(kn>0)drawWash(ctx,`c04.necro.${p.key}`,p.x,p.y,p.size*.62,{alpha:kn*.2,grow:kn,rot:p.rot,soft:.72,blend:'source-over'});
 if(kn>0){ctx.save();ctx.globalAlpha*=kn;ctx.fillStyle='rgba(236,214,218,.15)';ctx.fill(cellGhosts);ctx.strokeStyle='rgba(176,132,148,.32)';ctx.lineWidth=.65;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke(cellGhosts);ctx.stroke(cellGhostOpen);ctx.fillStyle='#3F2A66';ctx.globalAlpha*=.85;ctx.fill(dust);ctx.globalAlpha/=.85;ctx.fillStyle='rgba(217,163,184,.3)';ctx.fill(smudge);ctx.fillStyle='#3F2A66';ctx.fill(kary);ctx.fillStyle='#2E1F45';ctx.fill(karyDark);ctx.restore();}
 if(kv>0){ctx.save();ctx.globalAlpha*=kv*.92;drawBlood(ctx,spray);ctx.restore();drawZahn(ctx,kv);}
 if(kp>0){ctx.save();ctx.beginPath();ctx.rect(42,-336,312,700*kp);ctx.clip();
  ctx.fillStyle='#E9DDB0';ctx.fill(tearOrganic);
  ctx.save();ctx.clip(tearOrganic);ctx.lineCap='round';ctx.strokeStyle='#D98BA8';ctx.lineWidth=.75;ctx.stroke(gapFib);ctx.strokeStyle='#E7B4C4';ctx.lineWidth=.45;ctx.stroke(gapFibFine);
  for(const c of gapCells){ctx.save();ctx.globalAlpha*=c.fade*kp;detailedNeutrophil(ctx,c.x,c.y,c,1);ctx.restore();}
  ctx.restore();
  ctx.fillStyle='#D98BA8';ctx.fill(stumpBody);ctx.fillStyle='#6E2C34';ctx.fill(stumpTip);ctx.strokeStyle='#8E3A3E';ctx.lineWidth=.7;ctx.lineCap='round';ctx.stroke(stumpFib);
  ctx.restore();}
 if(ko>0){ctx.save();ctx.globalAlpha*=ko;ctx.fillStyle=C.pus;ctx.fill(pus);ctx.fillStyle='#6B4C9A';ctx.fill(pusNuclei);ctx.strokeStyle='#D98BA8';ctx.lineWidth=.6;ctx.stroke(leakFibres);ctx.restore();}
}
