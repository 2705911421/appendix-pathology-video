import {bake,drawWash} from '../lib/wash.js';
import {drawHE,CELLS} from '../lib/he.js';
import {detailedNeutrophil} from '../lib/he_detail.js';
import {rng,noise2} from '../lib/motion.js';
import {cell,follicle,cryptNucleus,columnar,erythrocyte} from '../lib_ext/cells_ext.js';
const R=rng(40802),TAU=Math.PI*2;let map,source,beforeCells;
export function point(x,y){const a=x/620-Math.PI/2,r=620+y+12*Math.sin(a*3)+9*Math.sin(a*5),u=1.6*Math.cos(a)*r,v=Math.sin(a)*r;return [u*Math.cos(.14)-v*Math.sin(.14),u*Math.sin(.14)+v*Math.cos(.14)];}
export default {prepare(){bake('s08.lumen', (b,P)=>{P.fill(b,P.blob(0,0,300,22,.2,43),'#DCA4B2',200,.15);},{seed:43,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});source=document.createElement('canvas');source.width=840;source.height=620;const c=source.getContext('2d');c.translate(420,320);drawHE(c,{ulcer:.16,neut:0,fibrin:0,t:0,detail:1});
const copy=document.createElement('canvas');copy.width=840;copy.height=620;copy.getContext('2d').drawImage(source,0,0);
c.drawImage(copy,0,155,840,18,-420,140,840,90);c.drawImage(copy,0,330,840,5,-420,-153,840,5);
beforeCells=document.createElement('canvas');beforeCells.width=840;beforeCells.height=620;beforeCells.getContext('2d').drawImage(source,0,0);
for(let i=0;i<150;i++)cell(c,-410+R()*820,-280+R()*120,i%7?'lymph':'plasma',.7+R()*.2,R()*TAU,i);
[-390,40,360].forEach(x=>{c.save();c.translate(x,-55);c.scale(.78,.78);follicle(c,0,0);c.restore();});for(let i=0;i<85;i++)cell(c,-410+R()*820,148+R()*76,'dot',.9,R()*TAU,i);for(let i=0;i<62;i++)cell(c,-414+i*13.5,274+Math.sin(i*.4)*2,'meso',.8,0,i);
let n=0;for(const p of CELLS){if(p.kind!=='inf'||p.y>138||p.y< -290)continue;if(p.y>0&&n++%35!==0)continue;if(p.y<0&&n++%4!==0)continue;detailedNeutrophil(c,p.x,p.y,p,1);}for(let i=0;i<7;i++)detailedNeutrophil(c,-270+Math.cos(i*.55)*(26+i*3),-80+Math.sin(i*.55)*(23+i*3),{lobes:2+i%4,rot:i*.8,sz:.9},1);
const im=c.getImageData(0,0,840,620);map=document.createElement('canvas');map.width=3200;map.height=2100;const mc=map.getContext('2d'),out=mc.createImageData(3200,2100);for(let j=0;j<2100;j++)for(let i=0;i<3200;i++){const u=i-1600,v=j-1050,x=(u*Math.cos(.14)+v*Math.sin(.14))/1.6,y=-u*Math.sin(.14)+v*Math.cos(.14),a=Math.atan2(y,x),fy=Math.hypot(x,y)-620-12*Math.sin(a*3)-9*Math.sin(a*5);if(fy< -320||fy>=280)continue;let fx=((a+Math.PI/2)*620+420)%840;if(fx<0)fx+=840;const si=(Math.floor(fy+320)*840+Math.floor(fx))*4,di=(j*3200+i)*4;out.data.set(im.data.subarray(si,si+4),di);}mc.putImageData(out,0,0);
bake('s08.congestion', (b,P)=>{P.fill(b,P.blob(0,0,300,22,.2,43),'#C9455A',200,.15);},{seed:43,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});
bake('s08.exudate', (b,P)=>{P.fill(b,P.blob(0,0,330,26,.5,44),'#F0C4D2',170,.3,[.6,.5]);},{seed:44,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});
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
let lowSource, lowCells, lowCache, lumenMask, lumenFill, cryptClear, cryptFill;
function lowMaterial() {
  const w=840,h=620,im=source.getContext('2d').getImageData(0,0,w,h);
  const d=im.data,pristine=new Uint8ClampedArray(d),mask=new Uint8Array(w*h),seen=new Uint8Array(w*h);
  const bd=beforeCells.getContext('2d').getImageData(0,0,w,h).data;
  const wasDark=i=>bd[i*4]<155&&bd[i*4+1]<125&&bd[i*4+2]>bd[i*4+1]*1.08;
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
    let pre=0;for(const n of queue)if(wasDark(n))pre++;
    const fyC=(y0+y1)/2-320;
    const cellRec={tile,x:(x0+x1)/2-420,y:fyC,crypt:pre>=queue.length*.45&&fyC>-305&&fyC<-142,pre,n:queue.length};
    lowCells.push(cellRec);
    // Inpaint only the small local crop; preserve the original baked wash.
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++) {
      if(!coverage.has(y*w+x))continue;
      let best=-1,dist=1e9;
      for(let dy=-6;dy<=6;dy+=2)for(let dx=-6;dx<=6;dx+=2){const xx=Math.max(0,Math.min(w-1,x+dx)),yy=Math.max(0,Math.min(h-1,y+dy)),q=yy*w+xx;if(!mask[q]&&!coverage.has(q)&&dx*dx+dy*dy<dist){best=q;dist=dx*dx+dy*dy;}}
      if(best>=0)for(let ch=0;ch<3;ch++)d[(y*w+x)*4+ch]=pristine[best*4+ch];
    }
  }
  const built=buildLumen(d,w,h);lumenMask=built.mask;lumenFill=built.fill;
  const cleared=buildCryptClear(d,w,h,wasDark,lumenMask);cryptClear=cleared.mask;cryptFill=cleared.fill;
  lowSource=im;
  if(typeof window!=='undefined'){
    const band=lowCells.filter(p=>p.y>-270&&p.y<-160);
    const bucket=a=>{const h=[0,0,0,0,0];for(const p of a){const r=p.pre/Math.max(1,p.n);h[Math.min(4,Math.floor(r*5))]++;}return h;};
    window.__g02={band:band.length,crypt:band.filter(p=>p.crypt).length,keep:band.filter(p=>!p.crypt).length,
      cryptRatio:bucket(band.filter(p=>p.crypt)),keepRatio:bucket(band.filter(p=>!p.crypt)),
      keepSample:band.filter(p=>!p.crypt).slice(0,12).map(p=>({x:Math.round(p.x),y:Math.round(p.y),pre:p.pre,n:p.n,w:p.tile.width,h:p.tile.height}))};
  }
}
// White crypt lumens in the mucosa band, filled from the surrounding pale wash.
// Only the low-power warp reads this; the high-power map stays on `source`.
function buildLumen(d,w,h){
  const n=w*h,mask=new Uint8Array(n),y0=-286+320,y1=-152+320;
  for(let y=y0;y<=y1;y++)for(let x=0;x<w;x++){const i=y*w+x,r=d[i*4],g=d[i*4+1],b=d[i*4+2];if(r>242&&g>226&&b>230&&r-g<24)mask[i]=1;}
  const dil=mask.slice();
  for(let y=y0;y<=y1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(mask[i])continue;if(!(mask[i-1]||mask[i+1]||mask[i-w]||mask[i+w]))continue;const r=d[i*4],g=d[i*4+1];if(r>232&&r-g<28)dil[i]=1;}
  const col=new Uint8ClampedArray(n*3),known=new Uint8Array(n);
  for(let y=y0;y<=y1;y++)for(let x=0;x<w;x++){const i=y*w+x;if(dil[i])continue;const r=d[i*4],g=d[i*4+1];if(r<170&&g<140)continue;known[i]=1;col[i*3]=r;col[i*3+1]=g;col[i*3+2]=d[i*4+2];}
  const nxt=new Uint8ClampedArray(n*3),nk=new Uint8Array(n);
  for(let pass=0;pass<32;pass++){let filled=0;nk.set(known);nxt.set(col);
    for(let y=y0;y<=y1;y++)for(let x=0;x<w;x++){const i=y*w+x;if(known[i]||!dil[i])continue;let rs=0,gs=0,bs=0,c=0;
      for(const q of [i-1,i+1,i-w,i+w,i-w-1,i-w+1,i+w-1,i+w+1]){if(q<0||q>=n||!known[q])continue;rs+=col[q*3];gs+=col[q*3+1];bs+=col[q*3+2];c++;}
      if(!c)continue;nxt[i*3]=rs/c;nxt[i*3+1]=gs/c;nxt[i*3+2]=bs/c;nk[i]=1;filled++;}
    col.set(nxt);known.set(nk);if(!filled)break;}
  const fill=new Uint8ClampedArray(n*3);
  for(let i=0;i<n;i++)if(dil[i]){if(!known[i]){fill[i*3]=236;fill[i*3+1]=208;fill[i*3+2]=216;}else{fill[i*3]=col[i*3];fill[i*3+1]=col[i*3+1];fill[i*3+2]=col[i*3+2];}}
  return {mask:dil,fill};
}
// Spoke crypts that stayed in the raster (chains taller than the tile cutoff).
// Surface epithelium (field y near -290) is left alone. LP cells are not in beforeCells, so they stay.
function buildCryptClear(d,w,h,wasDark,lumen){
  const n=w*h,mask=new Uint8Array(n),y0=-276+320,y1=-148+320;
  for(let y=y0;y<=y1;y++)for(let x=0;x<w;x++){const i=y*w+x;if(wasDark(i))mask[i]=1;}
  const col=new Uint8ClampedArray(n*3),known=new Uint8Array(n);
  for(let y=y0-1;y<=y1+1;y++){if(y<0||y>=h)continue;for(let x=0;x<w;x++){const i=y*w+x;if(mask[i]||lumen[i])continue;const r=d[i*4],g=d[i*4+1];if(r<165&&g<130)continue;known[i]=1;col[i*3]=r;col[i*3+1]=g;col[i*3+2]=d[i*4+2];}}
  const nxt=new Uint8ClampedArray(n*3),nk=new Uint8Array(n);
  for(let pass=0;pass<36;pass++){let filled=0;nk.set(known);nxt.set(col);
    for(let y=y0;y<=y1;y++)for(let x=0;x<w;x++){const i=y*w+x;if(known[i]||!mask[i])continue;let rs=0,gs=0,bs=0,c=0;
      for(const q of [i-1,i+1,i-w,i+w,i-w-1,i-w+1,i+w-1,i+w+1]){if(q<0||q>=n||!known[q])continue;rs+=col[q*3];gs+=col[q*3+1];bs+=col[q*3+2];c++;}
      if(!c)continue;nxt[i*3]=rs/c;nxt[i*3+1]=gs/c;nxt[i*3+2]=bs/c;nk[i]=1;filled++;}
    col.set(nxt);known.set(nk);if(!filled)break;}
  const fill=new Uint8ClampedArray(n*3);
  for(let i=0;i<n;i++)if(mask[i]){if(!known[i]){fill[i*3]=236;fill[i*3+1]=208;fill[i*3+2]=216;}else{fill[i*3]=col[i*3];fill[i*3+1]=col[i*3+1];fill[i*3+2]=col[i*3+2];}}
  return {mask,fill};
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
    // 1 at low power, 0 once the push-in has mostly restored the b05 spokes.
    const show=Math.max(0,1-k*1.35);
    const sample=(qi,ch)=>{if(ch===3)return src[qi+ch];const i=qi>>2;let v=src[qi+ch];
      if(show&&cryptClear[i])v=src[qi+ch]*(1-show)+cryptFill[i*3+ch]*show;
      if(show&&lumenMask[i])v=v*(1-show)+lumenFill[i*3+ch]*show;
      return v;};
    for(let j=0;j<2100;j++)for(let i=0;i<3200;i++) {
      const u=i-1600,v=j-1050,x=(u*co+v*si)/1.6,y=-u*si+v*co,a=Math.atan2(y,x);
      const fy=lowInverse(Math.hypot(x,y)-lowGeometry(a,k).wobble,k);
      if(fy< -320||fy>=280)continue;
      // Five complete repeats; 140px smooth overlap makes every layer periodic.
      let fx=((a+Math.PI/2)/TAU*3500+420)%700;if(fx<0)fx+=700;
      const row=Math.floor(fy+320)*840,q=(row+Math.floor(fx))*4,n=(j*3200+i)*4;
      let seam=Math.max(0,1-fx/140);seam=seam*seam*(3-2*seam);
      const q2=(row+Math.floor(fx+700))*4;
      for(let ch=0;ch<4;ch++)d[n+ch]=sample(q,ch)*(1-seam)+(seam?sample(q2,ch)*seam:0);
    }
    ctx.putImageData(out,0,0);
    if(show>0.004){ctx.save();ctx.globalAlpha=show;paintGlands(ctx,k,'lumen');ctx.restore();}
    // Repeat the identical source population around the wall as in b02b.
    for(let turn=-3;turn<=3;turn++)for(const p of lowCells) {
      const sx=p.x+420;
      let opacity=1;if(sx<140){let w=1-sx/140;opacity=1-w*w*(3-2*w);}else if(sx>=700){let w=1-(sx-700)/140;opacity=w*w*(3-2*w);}
      if(p.crypt)opacity*=1-show;
      if(opacity<0.004)continue;
      const x=(p.x+turn*700)*TAU*620/3500,a=x/620-Math.PI/2;if(a< -Math.PI||a>=Math.PI)continue;
      const centre=lowPoint(x,p.y,k),dx=lowPoint(x+.5,p.y,k),dy=lowPoint(x,p.y+.5,k);
      const angle=Math.atan2(dx[1]-centre[1],dx[0]-centre[0]);
      ctx.save();ctx.globalAlpha=opacity;ctx.translate(1600+centre[0],1050+centre[1]);
      // Local rigid frame at low power; approach the original map Jacobian.
      ctx.transform((1-k)*Math.cos(angle)+k*2*(dx[0]-centre[0]),(1-k)*Math.sin(angle)+k*2*(dx[1]-centre[1]),
        (1-k)*Math.sin(angle)+k*2*(dy[0]-centre[0]),-(1-k)*Math.cos(angle)+k*2*(dy[1]-centre[1]),0,0);
      ctx.drawImage(p.tile,-p.tile.width/2,-p.tile.height/2);ctx.restore();
    }
    if(show>0.004){ctx.save();ctx.globalAlpha=show;paintGlands(ctx,k,'nuclei');paintMuscularis(ctx,k);ctx.restore();}
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

// Low-power glands. Separate RNG; never touches R (the b05 map). Widths are map
// pixels: field-x is squeezed on the annulus, so a field-space circle becomes a spoke.
// About one third are cross (round) or oblique (short ellipse) profiles.
const GR=rng(40921);
const GLANDS=(()=>{const out=[];const x0=-Math.PI*620,x1=Math.PI*620;let x=x0+40+GR()*70;
  while(x<x1-36){const roll=GR(),kind=roll<.15?'cross':roll<.34?'oblique':'tube';
    if(kind==='tube'){let y0=-274+GR()*34,len=34+GR()*72;if(y0+len>-156)len=Math.max(28,-156-y0);
      out.push({kind,x:x+(GR()-.5)*18,y0,len,w:12+GR()*8,curve:(GR()-.5)*62,tilt:(GR()-.5)*.5,phase:GR()*TAU,nuc:6+Math.floor(GR()*5),ns:1.15+GR()*.4,alpha:.46+GR()*.18});}
    else{let y=-258+GR()*78;y=Math.max(-272,Math.min(-168,y));
      out.push({kind,x:x+(GR()-.5)*22,y,rad:kind==='cross'?16+GR()*12:20+GR()*12,flat:kind==='cross'?.86+GR()*.14:.4+GR()*.22,rot:GR()*Math.PI,phase:GR()*TAU,nuc:8+Math.floor(GR()*4),ns:1.1+GR()*.35,alpha:.48+GR()*.16});}
    x+=160+GR()*150;}
  return out;})();
const tubeAt=(g,t)=>[g.x+g.tilt*t*g.len+Math.sin(t*Math.PI)*g.curve+Math.sin(t*2.2*Math.PI)*g.curve*.22,g.y0+t*g.len];
// Half-width in map pixels. Stays open at the ends so the tube does not taper into a spoke.
const tubeW=(g,t)=>{const env=.78+.22*Math.sin(Math.min(t,.97)/.97*Math.PI),wob=1+.11*Math.sin(t*5.2+g.phase)+.06*Math.sin(t*2.1+g.phase*3);return Math.max(8,g.w*env*wob);};
function paintGlands(ctx,k,part){for(const g of GLANDS){if(g.kind==='tube')paintTube(ctx,g,k,part);else paintProfile(ctx,g,k,part);}}
function tubeSide(g,t,k){const [fx,fy]=tubeAt(g,t),p=lowPoint(fx,fy,k),q=lowPoint(...tubeAt(g,Math.min(1,t+.045)),k),prv=lowPoint(...tubeAt(g,Math.max(0,t-.045)),k);
  let tx=q[0]-prv[0],ty=q[1]-prv[1];const L=Math.hypot(tx,ty)||1;tx/=L;ty/=L;return {p,nx:-ty,ny:tx,hw:tubeW(g,t)};}
function paintTube(ctx,g,k,part){
  const steps=14,left=[],right=[];
  for(let i=0;i<=steps;i++){const s=tubeSide(g,i/steps,k);left.push([s.p[0]+s.nx*s.hw,s.p[1]+s.ny*s.hw]);right.push([s.p[0]-s.nx*s.hw,s.p[1]-s.ny*s.hw]);}
  if(part==='lumen'){ctx.beginPath();left.forEach((p,i)=>i?ctx.lineTo(1600+p[0],1050+p[1]):ctx.moveTo(1600+p[0],1050+p[1]));for(let i=right.length-1;i>=0;i--)ctx.lineTo(1600+right[i][0],1050+right[i][1]);ctx.closePath();ctx.fillStyle=`rgba(255,248,250,${g.alpha.toFixed(3)})`;ctx.fill();return;}
  for(const side of [-1,1])for(let i=0;i<g.nuc;i++){const t=(i+.35)/(g.nuc-.2);if(t>.9)continue;const s=tubeSide(g,t,k),j=1.4*Math.sin(i*2.3+g.phase+side);
    ctx.save();ctx.translate(1600+s.p[0]+s.nx*side*(s.hw+3.4+j),1050+s.p[1]+s.ny*side*(s.hw+3.4+j));ctx.rotate(Math.atan2(s.ny*side,s.nx*side));cryptNucleus(ctx,0,0,g.ns*(.88+.16*Math.sin(i+g.phase)),0,i*5+side+3);ctx.restore();}
}
function paintProfile(ctx,g,k,part){
  const c0=lowPoint(g.x,g.y,k),px=lowPoint(g.x+1,g.y,k),py=lowPoint(g.x,g.y+1,k);
  let tx=px[0]-c0[0],ty=px[1]-c0[1],L=Math.hypot(tx,ty)||1;tx/=L;ty/=L;
  let nx=py[0]-c0[0],ny=py[1]-c0[1],M=Math.hypot(nx,ny)||1;nx/=M;ny/=M;
  const at=(a,rad,flat)=>{const ca=Math.cos(a),sa=Math.sin(a),lx=ca*rad,ly=sa*rad*flat;return [c0[0]+lx*tx+ly*nx,c0[1]+lx*ty+ly*ny];};
  if(part==='lumen'){ctx.beginPath();for(let i=0;i<=28;i++){const a=i/28*TAU+g.rot,f=1+.07*Math.sin(3*a+g.phase),p=at(a,g.rad*f,g.flat);i?ctx.lineTo(1600+p[0],1050+p[1]):ctx.moveTo(1600+p[0],1050+p[1]);}ctx.closePath();ctx.fillStyle=`rgba(255,248,250,${g.alpha.toFixed(3)})`;ctx.fill();return;}
  for(let i=0;i<g.nuc;i++){const a=i/g.nuc*TAU+g.rot+g.phase*.1,f=1+.05*Math.sin(3*a+g.phase),j=.7*Math.sin(i*2.2+g.phase),p=at(a,(g.rad+3.6+j)*f,g.flat);
    ctx.save();ctx.translate(1600+p[0],1050+p[1]);cryptNucleus(ctx,0,0,g.ns*(.9+.14*Math.sin(i+g.phase)),a,i);ctx.restore();}
}
// Thin pink muscularis mucosae. A wide faint stroke keeps it from reading as a hard edge.
function paintMuscularis(ctx,k){ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();const N=240;
  for(let i=0;i<=N;i++){const x=(i/N-.5)*2*Math.PI*620,y=-150.5+1.6*Math.sin(x*.012)+.8*Math.sin(x*.031),p=lowPoint(x,y,k);i?ctx.lineTo(1600+p[0],1050+p[1]):ctx.moveTo(1600+p[0],1050+p[1]);}
  ctx.strokeStyle='rgba(214,160,180,.2)';ctx.lineWidth=12;ctx.stroke();ctx.strokeStyle='rgba(214,136,164,.4)';ctx.lineWidth=2.3;ctx.stroke();ctx.restore();}

// s34 focal epithelial defect. Field x is centered on the card target (10, -285).
// Width 64 is about 18% of the high-power field. Smaller field y is the lumen.
// Only id>=34 draws this; the card leader stays on targets[34].
const epiY=x=>-290+5*Math.sin(x*.05)+4*(noise2(x/40,2)-.5);
const GAP_L=-22,GAP_R=42;
const DEFECT=(()=>{const D=rng(40933),lum=[],mid=[],deep=[],edge=[],fibrin=[],neuts=[],rbcs=[];
  const N=46;
  for(let i=0;i<=N;i++){const t=i/N,x=GAP_L+(GAP_R-GAP_L)*t,y=epiY(x),end=Math.min(t,1-t),ragged=end<0.14;
    const j=ragged?(D()-.5)*4.6:(D()-.5)*.7,xj=ragged?(D()-.5)*2.8:0;
    lum.push([x+xj,y-(ragged?2.8+D()*3.6:3.5)+j]);
    mid.push([x+xj*.3,y+j*.12]);
    deep.push([x+xj*.5,y+(ragged?2.6+D()*3.2:3.3)+j*.3]);}
  // Torn stumps only. Most shreds hang into the gap; a few stay on the intact side so the cut is not a straight edge.
  for(const [xEdge,sign] of [[GAP_L,1],[GAP_R,-1]])for(let i=0;i<6;i++){const into=i<4?D()*8:-D()*4,along=xEdge+sign*into;
    edge.push({x:along,y:epiY(along)+(D()-.5)*4.5,s:.42+D()*.26,rot:(sign>0?-.35:.35)+(D()-.5)*1.35,key:i+(sign<0?20:0),kind:D()<.72?'fray':'nuc'});}
  for(let i=0;i<26;i++){const x=GAP_L+4+D()*(GAP_R-GAP_L-8),along=D()<.72;
    fibrin.push({x,y:epiY(x)-1.2-D()*4.5,a:along?(D()-.5)*.7:(D()-.5)*2.2,l:9+D()*16,b:(D()-.5)*4,w:1.15+D()*1.35});}
  [-20,-8,4,16,28].forEach((dx,i)=>{const x=10+dx+(D()-.5)*3;neuts.push({x,y:epiY(x)-4.5-D()*5.5,lobes:2+(i%4),rot:D()*TAU,sz:.72+D()*.26});});
  for(let i=0;i<8;i++){const x=GAP_L+6+D()*(GAP_R-GAP_L-12);rbcs.push({x,y:epiY(x)+11+D()*16,s:.8+D()*.4,rot:D()*TAU,key:i});}
  return {lum,mid,deep,edge,fibrin,neuts,rbcs};})();
function fieldSprite(ctx,fx,fy,draw){const o=point(fx,fy),px=point(fx+1,fy),py=point(fx,fy+1);ctx.save();ctx.translate(o[0],o[1]);ctx.transform(px[0]-o[0],px[1]-o[1],py[0]-o[0],py[1]-o[1],0,0);draw(ctx);ctx.restore();}
function fillBand(c,a,b,color){c.beginPath();a.forEach((p,i)=>{const q=point(p[0],p[1]);i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]);});for(let i=b.length-1;i>=0;i--){const q=point(b[i][0],b[i][1]);c.lineTo(q[0],q[1]);}c.closePath();c.fillStyle=color;c.fill();}
function drawDefect(c){
  // Congested lamina propria, deep to the break. Washes use the 04.js thromb recipe baked above.
  for(const [x,dy,sz,a] of [[6,16,52,.34],[-10,22,36,.22],[22,18,32,.2]]){const p=point(x,epiY(x)+dy);drawWash(c,'s08.congestion',p[0],p[1],sz,{alpha:a,blend:'multiply'});}
  for(const r of DEFECT.rbcs)fieldSprite(c,r.x,r.y,ctx=>erythrocyte(ctx,0,0,r.s,r.rot,r.key));
  // Lift only the epithelial stroke. Luminal side opens onto the lumen; the deep side stays pink.
  fillBand(c,DEFECT.lum,DEFECT.mid,'#F6EEF0');
  fillBand(c,DEFECT.mid,DEFECT.deep,'#E7B6C8');
  for(const e of DEFECT.edge)fieldSprite(c,e.x,e.y,ctx=>{if(e.kind==='fray')columnar(ctx,0,0,e.s,e.rot,e.key,'fray');else cryptNucleus(ctx,0,0,e.s*1.15,e.rot,e.key);});
  const blush=point(10,epiY(10)-4);drawWash(c,'s08.exudate',blush[0],blush[1],58,{alpha:.28,blend:'multiply'});
  c.strokeStyle='rgba(236,196,210,.9)';c.lineCap='round';
  for(const f of DEFECT.fibrin){const p0=point(f.x,f.y),p1=point(f.x+Math.cos(f.a)*f.l*.5,f.y+Math.sin(f.a)*f.l*.35+f.b*.15),p2=point(f.x+Math.cos(f.a)*f.l,f.y+Math.sin(f.a)*f.l*.2-1.2);
    c.lineWidth=f.w;c.beginPath();c.moveTo(p0[0],p0[1]);c.quadraticCurveTo(p1[0],p1[1],p2[0],p2[1]);c.stroke();
    if(f.w>1.8){const q0=point(f.x,f.y-1.4),q1=point(f.x+Math.cos(f.a+1.2)*f.l*.45,f.y-2.2),q2=point(f.x+Math.cos(f.a)*f.l*.7,f.y+Math.sin(f.a)*f.l*.12-2.2);
      c.lineWidth=f.w*.45;c.beginPath();c.moveTo(q0[0],q0[1]);c.quadraticCurveTo(q1[0],q1[1],q2[0],q2[1]);c.stroke();}}
  for(const n of DEFECT.neuts)fieldSprite(c,n.x,n.y,ctx=>detailedNeutrophil(ctx,0,0,n,1));
}
