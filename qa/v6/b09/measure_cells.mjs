import fs from 'node:fs';
import {loadChromium,launch,serve,resolveTarget,openPage} from '/workspace/garden-skills/skills/motion-showreel/scripts/lib/browser.mjs';
const target=resolveTarget('film'),chromium=await loadChromium(target.root),{server,port}=await serve(target.root),browser=await launch(chromium);
try{
 const page=await browser.newPage();await page.route('**/chapters/s08.js',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text())+'\nexport {mapSource};'});});
 await page.goto(`http://localhost:${port}/${target.rel}`);await page.waitForFunction(()=>window.READY===true);
 const data=await page.evaluate(async()=>{
 const {mapSource,point}=await import('./chapters/s08.js'),{detailedNeutrophil}=await import('./lib/he_detail.js'),{CELLS}=await import('./lib/he.js'),{rng}=await import('./lib/motion.js');
 const U=rng(40712);for(let i=0;i<6;i++)U();for(let i=0;i<13*3;i++)U();for(let i=0;i<52*4;i++)U();for(let i=0;i<58*3;i++)U();
 const positions=[[-39,-303],[-23,-302],[-10,-300],[4,-301],[19,-300],[34,-302],[51,-304],[-29,-314],[-15,-313],[0,-312],[14,-314],[29,-312],[44,-314],[-20,-327],[-4,-326],[12,-328],[27,-326],[5,-341],[-48,-316],[61,-317]];
 // Actual parameters are captured directly from the rendering function below instead of RNG replay.
 function measure(x,y,p,target){const src=document.createElement('canvas');src.width=840;src.height=660;const g=src.getContext('2d');g.translate(420,360);detailedNeutrophil(g,x,y,p,1);const mapped=mapSource(src),c=document.createElement('canvas');c.width=1920;c.height=1080;const ctx=c.getContext('2d');const center=point(...target);ctx.translate(1110,475);ctx.scale(2.7,2.7);ctx.translate(-center[0],-center[1]);ctx.drawImage(mapped,-1600,-1050);const a=ctx.getImageData(0,0,1920,1080).data;let l=1920,r=0,t=1080,b=0;for(let y=0;y<1080;y++)for(let x=0;x<1920;x++)if(a[(y*1920+x)*4+3]>32){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}return {x,y,sz:p.sz,width:r-l+1,height:b-t+1};}
 // Reproduce ulcerDetail RNG consumption exactly: shreds, erythrocytes, old and new fibres.
 const R=rng(40712);for(let i=0;i<6+13*3+52*4+58*3;i++)R();
 const exudate=positions.map(([x,y],i)=>{const rot=R()*Math.PI*2,sz=.80+R()*.08;return measure(x,y,{lobes:2+i%4,rot,sz},[10,-285]);});
 let n=0;const candidates=[];for(const p of CELLS){if(p.kind!=='inf'||p.y>138||p.y< -290)continue;if(p.y>0&&n++%35!==0)continue;if(p.y<0&&n++%4!==0)continue;candidates.push(p);}
 const reference={};for(const [name,target] of [['s31',[-200,-226]],['s32',[-170,70]]]){reference[name]=candidates.filter(p=>Math.hypot(...point(p.x,p.y).map((v,i)=>v-point(...target)[i]))<95).slice(0,8).map(p=>measure(p.x,p.y,p,target));}
 return {threshold:'isolated rendered cell alpha >32/255; mapped raster at 1920x1080, 2.7 camera',exudate,reference};
 });fs.writeFileSync('qa/v6/b09/cell_sizes.json',JSON.stringify(data,null,2));
}finally{await browser.close();server.close();}
