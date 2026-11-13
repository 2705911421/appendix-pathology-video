import fs from 'node:fs';
import {loadChromium,launch,serve,resolveTarget,openPage} from '/workspace/garden-skills/skills/motion-showreel/scripts/lib/browser.mjs';
const target=resolveTarget('film');const chromium=await loadChromium(target.root);const {server,port}=await serve(target.root);const browser=await launch(chromium);
try{
 const page=await openPage(browser,{port,rel:target.rel,w:1920,h:1080,dpr:1,query:'scene=s11'});
 await page.waitForFunction(()=>window.READY===true);
 const out=await page.evaluate(async()=>{
  const B=await import('./lib_ext/b09_pus.js');
  const {point,screenOf}=B;
  const cams={serosaHi:[...point(80,300),.78],serosaMid:[...point(80,300),.4],lumen:[...point(0,-305),.85],compare:[...point(102,60),2.45]};
  const scr=(x,y)=>screenOf(x,y,cams.serosaHi[0],cams.serosaHi[1],cams.serosaHi[2]);
  const inCircle=(s,r=425)=>Math.hypot(s[0]-1110,s[1]-475)<r;
  return {
   serosaSurface:B.serosaLog.map(q=>({...q,s:scr(q.x,q.y),in:inCircle(scr(q.x,q.y))})),
   serosaLogCount:B.serosaLog.length,
   lumenSample:B.lumenLog.slice(0,6),
   lumenCount:B.lumenLog.length,
   fieldRange:{
     serosaSurfaceY:[Math.min(...B.serosaLog.map(q=>q.y)),Math.max(...B.serosaLog.map(q=>q.y))],
     lumenY:[Math.min(...B.lumenLog.map(q=>q.y)),Math.max(...B.lumenLog.map(q=>q.y))],
   },
   serosaLinePoint:scr(80,248), serosa278:scr(80,278), serosa290:scr(80,290),
   camSer:point(80,300),
  };
 });
 console.log(JSON.stringify(out,null,1));
}finally{await browser.close();server.close();}
