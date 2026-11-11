import {drawHE,CELLS} from '../lib/he.js';
import {detailedNeutrophil} from '../lib/he_detail.js';
import {rng} from '../lib/motion.js';
import {cell,follicle} from '../lib_ext/cells_ext.js';
const R=rng(40802),TAU=Math.PI*2;let map,source;
export function point(x,y){const a=x/620-Math.PI/2,r=620+y+12*Math.sin(a*3)+9*Math.sin(a*5),u=1.6*Math.cos(a)*r,v=Math.sin(a)*r;return [u*Math.cos(.14)-v*Math.sin(.14),u*Math.sin(.14)+v*Math.cos(.14)];}
export default {prepare(){source=document.createElement('canvas');source.width=840;source.height=620;const c=source.getContext('2d');c.translate(420,320);drawHE(c,{ulcer:.16,neut:0,fibrin:0,t:0,detail:1});
const copy=document.createElement('canvas');copy.width=840;copy.height=620;copy.getContext('2d').drawImage(source,0,0);
c.drawImage(copy,0,155,840,18,-420,140,840,90);c.drawImage(copy,0,330,840,5,-420,-153,840,5);
for(let i=0;i<150;i++)cell(c,-410+R()*820,-280+R()*120,i%7?'lymph':'plasma',.7+R()*.2,R()*TAU,i);
[-390,40,360].forEach(x=>{c.save();c.translate(x,-55);c.scale(.78,.78);follicle(c,0,0);c.restore();});for(let i=0;i<85;i++)cell(c,-410+R()*820,148+R()*76,'dot',.9,R()*TAU,i);for(let i=0;i<62;i++)cell(c,-414+i*13.5,274+Math.sin(i*.4)*2,'meso',.8,0,i);
let n=0;for(const p of CELLS){if(p.kind!=='inf'||p.y>138||p.y< -290)continue;if(p.y>0&&n++%35!==0)continue;if(p.y<0&&n++%4!==0)continue;detailedNeutrophil(c,p.x,p.y,p,1);}for(let i=0;i<7;i++)detailedNeutrophil(c,-270+Math.cos(i*.55)*(26+i*3),-80+Math.sin(i*.55)*(23+i*3),{lobes:2+i%4,rot:i*.8,sz:.9},1);
const im=c.getImageData(0,0,840,620);map=document.createElement('canvas');map.width=3200;map.height=2100;const mc=map.getContext('2d'),out=mc.createImageData(3200,2100);for(let j=0;j<2100;j++)for(let i=0;i<3200;i++){const u=i-1600,v=j-1050,x=(u*Math.cos(.14)+v*Math.sin(.14))/1.6,y=-u*Math.sin(.14)+v*Math.cos(.14),a=Math.atan2(y,x),fy=Math.hypot(x,y)-620-12*Math.sin(a*3)-9*Math.sin(a*5);if(fy< -320||fy>=280)continue;let fx=((a+Math.PI/2)*620+420)%840;if(fx<0)fx+=840;const si=(Math.floor(fy+320)*840+Math.floor(fx))*4,di=(j*3200+i)*4;out.data.set(im.data.subarray(si,si+4),di);}mc.putImageData(out,0,0);
},draw(c,t,T){c.setTransform(1,0,0,1,0,0);c.fillStyle='#111114';c.fillRect(0,0,1920,1080);const id=Math.min(34,29+Math.floor(t/(T.end(29)-T.at(29))));const targets={30:[-270,-80],31:[-200,-226],32:[-170,70],33:[-65,-215],34:[10,-285]};const keys=[[T.at(29),[0,0,.48]],[T.frac(29,.28),[0,0,.48]],[T.frac(29,.64),[...point(-90,-5),.82]],[T.end(29),[...point(...targets[30]),2.7]]];for(let s=30;s<=34;s++){keys.push([T.frac(s,.32),[...point(...targets[s]),2.7]],[T.end(s),[...point(...targets[s]),2.7]]);}let v=keys[0][1];for(let i=1;i<keys.length;i++){if(t>=keys[i][0]){v=keys[i][1];continue;}const a=keys[i-1],b=keys[i],k=Math.max(0,(t-a[0])/(b[0]-a[0]));v=a[1].map((x,j)=>x+(b[1][j]-x)*k);break;}const [x,y,z]=v;c.save();c.beginPath();c.arc(1110,475,425,0,TAU);c.clip();c.fillStyle='#F6EEF0';c.fill();c.translate(1110,475);c.scale(z,z);c.translate(-x,-y);if(t<T.frac(29,.63)) drawLow(c,t,T); else c.drawImage(map,-1600,-1050);c.restore();c.strokeStyle='#4C4555';c.lineWidth=1.6;c.beginPath();c.arc(1110,475,431,0,TAU);c.stroke();c.fillStyle='#E8DDE9';c.font='500 30px MixSans';c.fillText(t<T.frac(29,.32)?'低倍':t<T.frac(29,.86)?'中倍':'高倍',1030,35);
const text={29:['正常阑尾参照','隐窝 · 固有层','黏膜肌层 · 淋巴滤泡','内环肌 / 外纵肌 · 浆膜'],30:['黏膜下层','血管扩张、充血','中性粒细胞沿血管壁游出'],31:['黏膜与固有层','中性粒细胞浸润','淋巴细胞与浆细胞参照'],32:['固有肌层','内环行肌：长梭形核','外纵行肌：圆点核','中性粒细胞仅少量'],33:['返回黏膜','经过受损的隐窝与上皮'],34:['局灶上皮缺损','结构连续性中断','病变以黏膜、黏膜下层为主']};const phase=(t-T.at(id))/(T.end(id)-T.at(id));c.save();c.globalAlpha=Math.max(0,Math.min(1,phase/.1,(1-phase)/.1));text[id].forEach((s,i)=>{c.font=`${i?400:700} ${i?27:36}px MixSans`;c.fillText(s,75,320+i*56);});c.strokeStyle='#BFA9CB';c.lineWidth=1.6;c.beginPath();c.moveTo(475,410);c.lineTo(630,410);c.stroke();c.restore();
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
function lowPoint(x,y,k) {
  const a=x/620-Math.PI/2,{rot,wobble}=lowGeometry(a,k),r=620+y+wobble;
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
      const fy=Math.hypot(x,y)-620-lowGeometry(a,k).wobble;
      if(fy< -320||fy>=280)continue;
      let fx=((a+Math.PI/2)*620+420)%840;if(fx<0)fx+=840;
      const q=(Math.floor(fy+320)*840+Math.floor(fx))*4,n=(j*3200+i)*4;
      d[n]=src[q];d[n+1]=src[q+1];d[n+2]=src[q+2];d[n+3]=src[q+3];
    }
    ctx.putImageData(out,0,0);
    // Repeat the identical source population around the wall as in b02b.
    for(let turn=-3;turn<=3;turn++)for(const p of lowCells) {
      const x=p.x+turn*840,a=x/620-Math.PI/2;if(a< -Math.PI||a>=Math.PI)continue;
      const centre=lowPoint(x,p.y,k),dx=lowPoint(x+.5,p.y,k),dy=lowPoint(x,p.y+.5,k);
      const angle=Math.atan2(dx[1]-centre[1],dx[0]-centre[0]);
      ctx.save();ctx.translate(1600+centre[0],1050+centre[1]);
      // Local rigid frame at low power; approach the original map Jacobian.
      ctx.transform((1-k)*Math.cos(angle)+k*2*(dx[0]-centre[0]),(1-k)*Math.sin(angle)+k*2*(dx[1]-centre[1]),
        (1-k)*Math.sin(angle)+k*2*(dy[0]-centre[0]),-(1-k)*Math.cos(angle)+k*2*(dy[1]-centre[1]),0,0);
      ctx.drawImage(p.tile,-p.tile.width/2,-p.tile.height/2);ctx.restore();
    }
    lowCache={k,canvas};
  }
  // Same wall segment as the original camera; affine recentering keeps the
  // selected patch registered while the oblique section turns into b02b.
  const anchor=point(-90,-5),moved=lowPoint(-90,-5,k),scale=1+.2*(1-k);
  c.save();
  c.translate(anchor[0]*(1-scale)*k,anchor[1]*(1-scale)*k);
  c.scale(scale,scale);c.translate((anchor[0]-moved[0])*k,(anchor[1]-moved[1])*k);
  c.drawImage(lowCache.canvas,-1600,-1050);
  c.restore();
  if(k>0){c.save();c.globalAlpha=k*k*k*k;c.drawImage(map,-1600,-1050);c.restore();}
}
