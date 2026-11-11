import {bake,drawWash} from '../lib/wash.js';
import {drawHE,CELLS} from '../lib/he.js';
import {detailedNeutrophil} from '../lib/he_detail.js';
import {rng,noise2} from '../lib/motion.js';
import {cell,follicle,cryptNucleus} from '../lib_ext/cells_ext.js';
const R=rng(40802),TAU=Math.PI*2;let map,source;
export function point(x,y){const a=x/620-Math.PI/2,r=620+y+12*Math.sin(a*3)+9*Math.sin(a*5),u=1.6*Math.cos(a)*r,v=Math.sin(a)*r;return [u*Math.cos(.14)-v*Math.sin(.14),u*Math.sin(.14)+v*Math.cos(.14)];}
export default {prepare(){bake('s08.lumen', (b,P)=>{P.fill(b,P.blob(0,0,300,22,.2,43),'#DCA4B2',200,.15);},{seed:43,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});
bake('s08.congestion', (b,P)=>{P.fill(b,P.blob(0,0,300,22,.2,43),'#C9455A',200,.15);},{seed:43,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});
bake('s08.exudate', (b,P)=>{P.fill(b,P.blob(0,0,330,26,.5,44),'#E8A8BC',170,.3,[.6,.5]);},{seed:44,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});
source=document.createElement('canvas');source.width=840;source.height=620;const c=source.getContext('2d');c.translate(420,320);drawHE(c,{ulcer:.16,neut:0,fibrin:0,t:0,detail:1});
const copy=document.createElement('canvas');copy.width=840;copy.height=620;copy.getContext('2d').drawImage(source,0,0);
c.drawImage(copy,0,155,840,18,-420,140,840,90);c.drawImage(copy,0,330,840,5,-420,-153,840,5);
for(let i=0;i<150;i++)cell(c,-410+R()*820,-280+R()*120,i%7?'lymph':'plasma',.7+R()*.2,R()*TAU,i);
[-390,40,360].forEach(x=>{c.save();c.translate(x,-55);c.scale(.78,.78);follicle(c,0,0);c.restore();});for(let i=0;i<85;i++)cell(c,-410+R()*820,148+R()*76,'dot',.9,R()*TAU,i);for(let i=0;i<62;i++)cell(c,-414+i*13.5,274+Math.sin(i*.4)*2,'meso',.8,0,i);
let n=0;for(const p of CELLS){if(p.kind!=='inf'||p.y>138||p.y< -290)continue;if(p.y>0&&n++%35!==0)continue;if(p.y<0&&n++%4!==0)continue;detailedNeutrophil(c,p.x,p.y,p,1);}for(let i=0;i<7;i++)detailedNeutrophil(c,-270+Math.cos(i*.55)*(26+i*3),-80+Math.sin(i*.55)*(23+i*3),{lobes:2+i%4,rot:i*.8,sz:.9},1);
const im=c.getImageData(0,0,840,620);map=document.createElement('canvas');map.width=3200;map.height=2100;const mc=map.getContext('2d'),out=mc.createImageData(3200,2100);for(let j=0;j<2100;j++)for(let i=0;i<3200;i++){const u=i-1600,v=j-1050,x=(u*Math.cos(.14)+v*Math.sin(.14))/1.6,y=-u*Math.sin(.14)+v*Math.cos(.14),a=Math.atan2(y,x),fy=Math.hypot(x,y)-620-12*Math.sin(a*3)-9*Math.sin(a*5);if(fy< -320||fy>=280)continue;let fx=((a+Math.PI/2)*620+420)%840;if(fx<0)fx+=840;const si=(Math.floor(fy+320)*840+Math.floor(fx))*4,di=(j*3200+i)*4;out.data.set(im.data.subarray(si,si+4),di);}mc.putImageData(out,0,0);
},draw(c,t,T){c.setTransform(1,0,0,1,0,0);c.fillStyle='#111114';c.fillRect(0,0,1920,1080);const id=Math.min(34,29+Math.floor(t/(T.end(29)-T.at(29))));const targets={30:[-270,-80],31:[-200,-226],32:[-170,70],33:[-65,-215],34:[10,-285]};const keys=[[T.at(29),[0,0,.48]],[T.frac(29,.28),[0,0,.48]],[T.frac(29,.64),[...point(-90,-5),.82]],[T.end(29),[...point(...targets[30]),2.7]]];for(let s=30;s<=34;s++){keys.push([T.frac(s,.32),[...point(...targets[s]),2.7]],[T.end(s),[...point(...targets[s]),2.7]]);}let v=keys[0][1];for(let i=1;i<keys.length;i++){if(t>=keys[i][0]){v=keys[i][1];continue;}const a=keys[i-1],b=keys[i],k=Math.max(0,(t-a[0])/(b[0]-a[0]));v=a[1].map((x,j)=>x+(b[1][j]-x)*k);break;}const [x,y,z]=v;c.save();c.beginPath();c.arc(1110,475,425,0,TAU);c.clip();c.fillStyle='#F6EEF0';c.fill();c.translate(1110,475);c.scale(z,z);c.translate(-x,-y);if(t<T.frac(29,.63)) drawLow(c,t,T); else {c.drawImage(map,-1600,-1050);if(id>=34)drawDefect(c);}c.restore();c.strokeStyle='#4C4555';c.lineWidth=1.6;c.beginPath();c.arc(1110,475,431,0,TAU);c.stroke();c.fillStyle='#E8DDE9';c.font='500 30px MixSans';c.fillText(t<T.frac(29,.32)?'低倍':t<T.frac(29,.86)?'中倍':'高倍',1030,35);
const text={29:['正常阑尾参照','隐窝 · 固有层','黏膜肌层 · 淋巴滤泡','内环肌 / 外纵肌 · 浆膜'],30:['黏膜下层','血管扩张、充血','中性粒细胞沿血管壁游出'],31:['黏膜与固有层','中性粒细胞浸润','淋巴细胞与浆细胞参照'],32:['固有肌层','内环行肌：长梭形核','外纵行肌：圆点核','中性粒细胞仅少量'],33:['返回黏膜','经过受损的隐窝与上皮'],34:['局灶上皮缺损','结构连续性中断','病变以黏膜、黏膜下层为主']};const phase=(t-T.at(id))/(T.end(id)-T.at(id));c.save();c.globalAlpha=Math.max(0,Math.min(1,phase/.1,(1-phase)/.1));text[id].forEach((s,i)=>{c.font=`${i?400:700} ${i?27:36}px MixSans`;c.fillText(s,75,320+i*56);});c.strokeStyle='#BFA9CB';c.lineWidth=1.6;c.beginPath();c.moveTo(475,410);c.lineTo(630,410);
const target=id===29?[-90,-55]:targets[id];
let tip=point(...target);
if(t<T.frac(29,.63)) {let q=Math.max(0,Math.min(1,(t-T.frac(29,.28))/(T.frac(29,.63)-T.frac(29,.28))));q=q*q*(3-2*q);const a=point(-90,-5),m=lowPoint(-90,-5,q),sc=1+.2*(1-q),p=lowPoint(...target,q);tip=[sc*(p[0]+(a[0]-m[0])*q)+a[0]*(1-sc)*q,sc*(p[1]+(a[1]-m[1])*q)+a[1]*(1-sc)*q];}
c.lineTo(1110+(tip[0]-x)*z,475+(tip[1]-y)*z);c.stroke();c.restore();
if(new URLSearchParams(location.search).has('cells')){c.fillStyle='#F6EEF0';c.fillRect(0,0,1920,940);c.save();c.translate(180,220);c.scale(2,2);['lymph','plasma','dot','meso'].forEach((s,i)=>cell(c,i*130,0,s,1,0,i));detailedNeutrophil(c,520,0,{lobes:3,rot:0,sz:1},1);c.restore();c.fillStyle='#51336F';c.font='28px MixSans';['淋巴细胞','浆细胞','外纵行肌核','间皮','引擎中性粒细胞'].forEach((s,i)=>c.fillText(s,110+i*260,300));}}
};

// Low-only reconstruction. Dark connected components retain their own local
// coordinates; only their centres follow the annulus. No source RNG is consumed.
let lowSource, lowCells, lowCache;
function lowMaterial() {
  const w=840,h=620,im=source.getContext('2d').getImageData(0,0,w,h);
  const d=im.data,pristine=new Uint8ClampedArray(d),mask=new Uint8Array(w*h),seen=new Uint8Array(w*h);
  for(let i=0;i<mask.length;i++)mask[i]=d[i*4]<155 && d[i*4+1]<125 && d[i*4+2]>d[i*4+1]*1.08 ? 1:0;
  lowCells=[];
  for(let i=0;i<mask.length;i++) {
    if(!mask[i]||seen[i])continue;
    const queue=[i];seen[i]=1;let x0=w,y0=h,x1=0,y1=0;
    for(let k=0;k<queue.length;k++) {const n=queue[k],x=n%w,y=Math.floor(n/w);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
      for(const q of [n-1,n+1,n-w,n+w])if(q>=0&&q<w*h&&!seen[q]&&mask[q]&&Math.abs(q%w-x)<=1){seen[q]=1;queue.push(q);}}
    // Continuous epithelium and vessel contours remain structural paths.
    if(x1-x0>65||y1-y0>65||queue.length<2)continue;
    x0=Math.max(0,x0-2);y0=Math.max(0,y0-2);x1=Math.min(w-1,x1+2);y1=Math.min(h-1,y1+2);
    const tile=document.createElement('canvas');tile.width=x1-x0+1;tile.height=y1-y0+1;
    tile.getContext('2d').drawImage(source,x0,y0,tile.width,tile.height,0,0,tile.width,tile.height);
    const coverage=new Set();
    for(const n of queue)for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++) {
      const xx=n%w+dx,yy=Math.floor(n/w)+dy;
      if(xx>=x0&&xx<=x1&&yy>=y0&&yy<=y1&&dx*dx+dy*dy<=5)coverage.add(yy*w+xx);
    }
    const tc=tile.getContext('2d'),ti=tc.getImageData(0,0,tile.width,tile.height);
    for(let yy=0;yy<tile.height;yy++)for(let xx=0;xx<tile.width;xx++)if(!coverage.has((yy+y0)*w+xx+x0))ti.data[(yy*tile.width+xx)*4+3]=0;
    tc.putImageData(ti,0,0);
    lowCells.push({tile,x:(x0+x1)/2-420,y:(y0+y1)/2-320});
    // Inpaint only the small local crop; preserve the original baked wash.
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++) {
      if(!coverage.has(y*w+x))continue;
      let best=-1,dist=1e9;
      for(let dy=-6;dy<=6;dy+=2)for(let dx=-6;dx<=6;dx+=2){const xx=Math.max(0,Math.min(w-1,x+dx)),yy=Math.max(0,Math.min(h-1,y+dy)),q=yy*w+xx;if(!mask[q]&&!coverage.has(q)&&dx*dx+dy*dy<dist){best=q;dist=dx*dx+dy*dy;}}
      if(best>=0)for(let ch=0;ch<3;ch++)d[(y*w+x)*4+ch]=pristine[best*4+ch];
    }
  }
  lowSource=im;
}
function lowGeometry(a,k) {
  const rot=.14+(Math.PI/6-.14)*(1-k);
  // Extra lumen irregularity fades with depth, leaving the b02b target exact.
  const wobble=12*Math.sin(a*3)+9*Math.sin(a*5)+(1-k)*22*Math.sin(a*4+.7);
  return {rot,wobble};
}
// Continuous radial allocation: lumen 170; thick mucosa and submucosa.
function lowRadius(y,k) {
 const ys=[-320,-290,-150,-10,230,280],rs=[145,170,390,610,850,900];
 let i=0;while(i<4&&y>ys[i+1])i++;
 const r=rs[i]+(y-ys[i])/(ys[i+1]-ys[i])*(rs[i+1]-rs[i]);
 return r*(1-k)+(620+y)*k;
}
function lowInverse(r,k) {
 const ys=[-320,-290,-150,-10,230,280];let i=0;
 while(i<4&&r>lowRadius(ys[i+1],k))i++;
 return ys[i]+(r-lowRadius(ys[i],k))/(lowRadius(ys[i+1],k)-lowRadius(ys[i],k))*(ys[i+1]-ys[i]);
}
function lowPoint(x,y,k) {
  const a=x/620-Math.PI/2,{rot,wobble}=lowGeometry(a,k),r=lowRadius(y,k)+wobble;
  const u=1.6*Math.cos(a)*r,v=Math.sin(a)*r;
  return [u*Math.cos(rot)-v*Math.sin(rot),u*Math.sin(rot)+v*Math.cos(rot)];
}
function drawLow(c,t,T) {
  if(!lowSource)lowMaterial();
  let k=Math.max(0,Math.min(1,(t-T.frac(29,.28))/(T.frac(29,.63)-T.frac(29,.28))));
  k=k*k*(3-2*k);
  if(!lowCache||lowCache.k!==k) {
    const canvas=document.createElement('canvas');canvas.width=3200;canvas.height=2100;
    const ctx=canvas.getContext('2d'),out=ctx.createImageData(3200,2100),d=out.data,src=lowSource.data;
    const rot=.14+(Math.PI/6-.14)*(1-k),co=Math.cos(rot),si=Math.sin(rot);
    for(let j=0;j<2100;j++)for(let i=0;i<3200;i++) {
      const u=i-1600,v=j-1050,x=(u*co+v*si)/1.6,y=-u*si+v*co,a=Math.atan2(y,x);
      const fy=lowInverse(Math.hypot(x,y)-lowGeometry(a,k).wobble,k);
      if(fy< -320||fy>=280)continue;
      // Five complete repeats; 140px smooth overlap makes every layer periodic.
      let fx=((a+Math.PI/2)/TAU*3500+420)%700;if(fx<0)fx+=700;
      const row=Math.floor(fy+320)*840,q=(row+Math.floor(fx))*4,n=(j*3200+i)*4;
      let w=Math.max(0,1-fx/140);w=w*w*(3-2*w);
      const q2=(row+Math.floor(fx+700))*4;
      for(let ch=0;ch<4;ch++)d[n+ch]=src[q+ch]*(1-w)+(w?src[q2+ch]*w:0);
      if(fy>-292&&fy<-148){const lum=d[n]*.3+d[n+1]*.59+d[n+2]*.11;if(lum>208){const t=Math.min(1,(lum-208)/40)*.78;d[n]=d[n]*(1-t)+212*t;d[n+1]=d[n+1]*(1-t)+178*t;d[n+2]=d[n+2]*(1-t)+190*t;}}
    }
    ctx.putImageData(out,0,0);
    // Repeat the identical source population around the wall as in b02b.
    for(let turn=-3;turn<=3;turn++)for(const p of lowCells) {
      if(k<.72&&p.y>-310&&p.y<-148)continue;
      const sx=p.x+420;
      let opacity=1;if(sx<140){let w=1-sx/140;opacity=1-w*w*(3-2*w);}else if(sx>=700){let w=1-(sx-700)/140;opacity=w*w*(3-2*w);}
      const x=(p.x+turn*700)*TAU*620/3500,a=x/620-Math.PI/2;if(a< -Math.PI||a>=Math.PI)continue;
      const centre=lowPoint(x,p.y,k),dx=lowPoint(x+.5,p.y,k),dy=lowPoint(x,p.y+.5,k);
      const angle=Math.atan2(dx[1]-centre[1],dx[0]-centre[0]);
      ctx.save();ctx.globalAlpha=opacity;ctx.translate(1600+centre[0],1050+centre[1]);
      // Local rigid frame at low power; approach the original map Jacobian.
      ctx.transform((1-k)*Math.cos(angle)+k*2*(dx[0]-centre[0]),(1-k)*Math.sin(angle)+k*2*(dx[1]-centre[1]),
        (1-k)*Math.sin(angle)+k*2*(dy[0]-centre[0]),-(1-k)*Math.cos(angle)+k*2*(dy[1]-centre[1]),0,0);
      ctx.drawImage(p.tile,-p.tile.width/2,-p.tile.height/2);ctx.restore();
    }
    if(k<.98){ctx.save();ctx.globalAlpha=(1-k)*(1-k*.35);paintMucosa(ctx,k);ctx.restore();}
    lowCache={k,canvas};
  }
  // Same wall segment as the original camera; affine recentering keeps the
  // selected patch registered while the oblique section turns into b02b.
  const anchor=point(-90,-5),moved=lowPoint(-90,-5,k),scale=1+.2*(1-k);
  c.save();
  c.translate(anchor[0]*(1-scale)*k,anchor[1]*(1-scale)*k);
  c.scale(scale,scale);c.translate((anchor[0]-moved[0])*k,(anchor[1]-moved[1])*k);
  // Pale eosinophilic luminal debris, using the existing baked wash only.
  c.save();c.globalAlpha=1-k;c.rotate(Math.PI/6);drawWash(c,'s08.lumen',-35,5,155,{alpha:.32});drawWash(c,'s08.lumen',65,20,80,{alpha:.22});c.restore();
  c.drawImage(lowCache.canvas,-1600,-1050);
  c.restore();
  if(k>0){c.save();c.globalAlpha=k*k*k*k;c.drawImage(map,-1600,-1050);c.restore();}
}

// Low-power mucosa: a purple nuclear grain with mixed tubular / cross-cut crypts.
// Separate RNG; never touches R (source map cells).
const MR=rng(40901);
function cryptLine(g,t){return [g.x+g.tilt*t*g.len+Math.sin(t*Math.PI)*g.curve,g.y0+t*g.len];}
const CRYPTS_LOW=(()=>{const out=[];let x=-Math.PI*620;
  while(x<Math.PI*620){const gap=22+MR()*38,kind=MR(),g={x:x+(MR()-.5)*10,kind:kind<.42?'cross':kind<.62?'oblique':'long',len:28+MR()*52,w:3.2+MR()*3.4,curve:(MR()-.5)*48,tilt:(MR()-.5)*.7,y0:-286+MR()*18,yCross:-270+MR()*108,phase:MR()*TAU,n:9+Math.floor(MR()*7)};
    if(g.kind!=='long'){g.w=4.2+MR()*3.6;g.yCross=-268+MR()*110;}
    else {g.y0=-286+MR()*36;} // some long profiles sit deeper, not a full-thickness spoke
    out.push(g);x+=gap;}
  for(let i=0;i<48;i++)out.push({kind:MR()<.55?'cross':'oblique',x:(MR()-.5)*2*Math.PI*620,yCross:-250+MR()*92,w:3.8+MR()*3.8,n:8+Math.floor(MR()*7),phase:MR()*TAU,len:0,tilt:(MR()-.5)*.8,curve:0,y0:0});
  return out;})();
function insideCrypt(x,y){for(const g of CRYPTS_LOW){if(g.kind==='long'){for(let i=0;i<=6;i++){const p=cryptLine(g,i/6),dx=x-p[0],dy=y-p[1],r=g.w+4;if(dx*dx+dy*dy<r*r)return true;}}else{const dx=x-g.x,dy=y-g.yCross,r=g.w+5;if(dx*dx+dy*dy<r*r)return true;}}return false;}
const LP_DOTS=(()=>{const out=[];for(let i=0;i<2200;i++){const a=MR()*TAU,x=(a-Math.PI/2)*620+(MR()-.5)*18,y=-282+MR()*126;if(insideCrypt(x,y)&&MR()<.7)continue;out.push({x,y,s:.85+MR()*.5,rot:MR()*TAU,key:i});}return out;})();
const LP_CELLS=(()=>{const out=[];for(let i=0;i<340;i++){const a=MR()*TAU,x=(a-Math.PI/2)*620+(MR()-.5)*18,y=-276+MR()*118;if(insideCrypt(x,y))continue;out.push({x,y,type:i%5?'lymph':'plasma',s:.55+MR()*.32,rot:MR()*TAU,key:i});}return out;})();
function mucosaClip(ctx,k){ctx.beginPath();const N=168;for(let i=0;i<=N;i++){const x=(i/N-.5)*2*Math.PI*620,p=lowPoint(x,-150,k);i?ctx.lineTo(1600+p[0],1050+p[1]):ctx.moveTo(1600+p[0],1050+p[1]);}for(let i=N;i>=0;i--){const x=(i/N-.5)*2*Math.PI*620,p=lowPoint(x,-291,k);ctx.lineTo(1600+p[0],1050+p[1]);}ctx.closePath();ctx.clip();}
function placeRigid(ctx,fx,fy,k,draw){const c0=lowPoint(fx,fy,k),dx=lowPoint(fx+.5,fy,k),ang=Math.atan2(dx[1]-c0[1],dx[0]-c0[0]);ctx.save();ctx.translate(1600+c0[0],1050+c0[1]);ctx.rotate(ang);draw(ctx);ctx.restore();}
function paintLong(ctx,g,k){const steps=10,mid=[];for(let i=0;i<=steps;i++)mid.push(lowPoint(...cryptLine(g,i/steps),k));const left=[],right=[];for(let i=0;i<=steps;i++){const q=mid[Math.min(steps,i+1)],p0=mid[Math.max(0,i-1)];let tx=q[0]-p0[0],ty=q[1]-p0[1];const L=Math.hypot(tx,ty)||1;tx/=L;ty/=L;const nx=-ty,ny=tx,w=g.w*(1+.1*Math.sin(i*.9+g.phase)),p=mid[i];left.push([p[0]+nx*w,p[1]+ny*w]);right.push([p[0]-nx*w,p[1]-ny*w]);}
  ctx.beginPath();left.forEach((p,i)=>i?ctx.lineTo(1600+p[0],1050+p[1]):ctx.moveTo(1600+p[0],1050+p[1]));for(let i=right.length-1;i>=0;i--)ctx.lineTo(1600+right[i][0],1050+right[i][1]);ctx.closePath();ctx.fillStyle='rgba(232,206,214,.32)';ctx.fill();
  const n=Math.max(5,Math.floor(g.len/6.4));for(const side of [-1,1])for(let i=0;i<n;i++){const t=(i+.3+side*.1)/n,[fx,fy]=cryptLine(g,t),p=lowPoint(fx,fy,k),q=lowPoint(...cryptLine(g,Math.min(1,t+.07)),k),prv=lowPoint(...cryptLine(g,Math.max(0,t-.07)),k);let tx=q[0]-prv[0],ty=q[1]-prv[1];const L=Math.hypot(tx,ty)||1;tx/=L;ty/=L;const nx=-ty,ny=tx,ox=p[0]+nx*side*(g.w+2.8),oy=p[1]+ny*side*(g.w+2.8);
    ctx.save();ctx.translate(1600+ox,1050+oy);ctx.rotate(Math.atan2(ny*side,nx*side));cryptNucleus(ctx,0,0,1.05+.08*(g.w-3),0,i*3+side+2);ctx.restore();}}
function paintCross(ctx,g,k){const rx=g.kind==='oblique'?g.w*1.35:g.w*.95,ry=g.kind==='oblique'?g.w*.7:g.w*.9;
  placeRigid(ctx,g.x,g.yCross,k,c=>{c.rotate(g.tilt||0);c.beginPath();for(let i=0;i<=24;i++){const a=i/24*TAU,f=1+.08*Math.sin(3*a+g.phase);i?c.lineTo(Math.cos(a)*rx*f,Math.sin(a)*ry*f):c.moveTo(rx*f,0);}c.closePath();c.fillStyle='rgba(232,206,214,.34)';c.fill();
    for(let i=0;i<g.n;i++){const a=i/g.n*TAU+g.phase*.12,f=1+.08*Math.sin(3*a+g.phase)+.05*Math.sin(i*2.7+g.phase),j=.4*Math.sin(i*3.1+g.phase);cryptNucleus(c,Math.cos(a)*(rx+3.1+j)*f,Math.sin(a)*(ry+3.1-j*.5)*f,1.0+.22*Math.sin(i*1.7+g.phase),a,i);}});}
function paintMucosa(ctx,k){ctx.save();mucosaClip(ctx,k);ctx.fillStyle='rgba(206,168,186,.55)';ctx.fillRect(0,0,3200,2100);for(const p of LP_DOTS)placeRigid(ctx,p.x,p.y,k,c=>cryptNucleus(c,0,0,p.s,p.rot,p.key));for(const p of LP_CELLS)placeRigid(ctx,p.x,p.y,k,c=>cell(c,0,0,p.type,p.s,p.rot,p.key));for(const g of CRYPTS_LOW){if(g.kind==='long')paintLong(ctx,g,k);else paintCross(ctx,g,k);}ctx.restore();}

// s34: focal surface-epithelial defect. Field-local frame at the camera target.
const DEFECT=(()=>{const D=rng(40903),left=-38,right=34,mid=[],lip=[],floor=[],edgeN=[],fibrin=[],neuts=[],slough=[],lp=[];
  const epi=x=>5*Math.sin((x+10)*.05)+4*(noise2((x+10)/40,2)-.5);
  for(let x=left;x<=right;x+=.8){const u=(x-left)/(right-left),env=Math.pow(Math.sin(u*Math.PI),.7),e=epi(x);mid.push([x,e]);lip.push([x,e-5-env*2.2+(D()-.5)*1.8]);floor.push([x,e+env*(8+D()*7)+(D()-.5)*2.2]);}
  // Ragged remaining columnar nuclei at both shoulders, sitting on the original epithelial line.
  for(const [x0,sign] of [[left,-1],[right,1]])for(let i=0;i<18;i++){const u=i/17,along=x0-sign*(u*10)+(D()-.5)*1.4,e=epi(along),jag=(1-u)*(D()*5)+(D()-.5)*1.6,tilt=sign*(.2+D()*.8)*(1-u);edgeN.push({x:along,y:e+jag*.15,s:1.05+D()*.4,rot:tilt+(D()-.5)*.25,key:i+(sign>0?20:0)});}
  for(let i=0;i<48;i++){const x=left+4+D()*(right-left-8),e=epi(x),y=e-3+D()*10,a=(D()-.5)*2.2,l=8+D()*18;fibrin.push({x,y,a,l,b:(D()-.5)*7,w:.45+D()*.55});}
  // Spread neutrophils along the denuded surface; some drape toward the lumen.
  const nxs=[-12,-4,5,13,-8,8];
  for(let i=0;i<6;i++){const nx=nxs[i]+(D()-.5)*3;neuts.push({x:nx,y:epi(nx)+D()*4.5,lobes:2+(i+1)%4,rot:D()*TAU,sz:.58+D()*.14});}
  for(let i=0;i<10;i++){const sx=left+6+D()*(right-left-12);slough.push({x:sx,y:epi(sx)-4+D()*8,s:.75+D()*.45,rot:D()*TAU,key:i+40});}
  for(let i=0;i<16;i++){const lx=left+6+D()*(right-left-12);lp.push({x:lx,y:epi(lx)+9+D()*14,s:.65+D()*.35,rot:D()*TAU,key:i+50,type:i%4?'lymph':'plasma'});}
  return {left,right,mid,lip,floor,edgeN,fibrin,neuts,slough,lp};})();
function drawDefect(c){const ox=10,oy=-290,o=point(ox,oy),px=point(ox+1,oy),py=point(ox,oy+1);
  c.save();c.translate(o[0],o[1]);c.transform(px[0]-o[0],px[1]-o[1],py[0]-o[0],py[1]-o[1],0,0);
  drawWash(c,'s08.congestion',2,20,64,{alpha:.68,blend:'multiply'});drawWash(c,'s08.congestion',-14,26,40,{alpha:.48,blend:'multiply'});drawWash(c,'s08.congestion',16,24,36,{alpha:.42,blend:'multiply'});
  // Opaque cover of the original 7px epithelial stroke, plus an irregular crater.
  c.strokeStyle='#E4C4D0';c.lineWidth=11;c.lineCap='butt';c.lineJoin='round';c.beginPath();DEFECT.mid.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();
  c.beginPath();DEFECT.lip.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));for(let i=DEFECT.floor.length-1;i>=0;i--)c.lineTo(...DEFECT.floor[i]);c.closePath();c.fillStyle='#E4C4D0';c.fill();
  drawWash(c,'s08.exudate',0,4,70,{alpha:.52,blend:'multiply'});
  c.strokeStyle='rgba(214,138,166,.82)';c.lineCap='round';for(const f of DEFECT.fibrin){c.lineWidth=f.w;c.beginPath();c.moveTo(f.x,f.y);c.quadraticCurveTo(f.x+Math.cos(f.a)*f.l*.55,f.y+Math.sin(f.a)*f.l*.45+f.b,f.x+Math.cos(f.a)*f.l,f.y+Math.sin(f.a)*f.l*.5);c.stroke();
    if(f.w>.7){c.lineWidth=f.w*.55;c.beginPath();c.moveTo(f.x+1.2,f.y-1.4);c.quadraticCurveTo(f.x+Math.cos(f.a)*f.l*.4,f.y-3,f.x+Math.cos(f.a)*f.l*.85,f.y+Math.sin(f.a)*f.l*.3-2);c.stroke();}}
  for(const p of DEFECT.lp)cell(c,p.x,p.y,p.type,p.s,p.rot,p.key);
  for(const s of DEFECT.slough)cryptNucleus(c,s.x,s.y,s.s,s.rot,s.key);
  for(const n of DEFECT.neuts)detailedNeutrophil(c,n.x,n.y,n,1);
  for(const e of DEFECT.edgeN)cryptNucleus(c,e.x,e.y,e.s,e.rot,e.key);
  c.restore();
}
