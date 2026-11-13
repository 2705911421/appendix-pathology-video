import fs from 'node:fs';
import {loadChromium,launch,serve,resolveTarget,openPage} from '/workspace/garden-skills/skills/motion-showreel/scripts/lib/browser.mjs';
const target=resolveTarget('film');const chromium=await loadChromium(target.root);const {server,port}=await serve(target.root);const browser=await launch(chromium);
try{
 const page=await openPage(browser,{port,rel:target.rel,w:1920,h:1080,dpr:1,query:'scene=s11'});
 await page.waitForFunction(()=>window.READY===true);
 const out=await page.evaluate(async()=>{
  const B=await import('./lib_ext/b09_pus.js');
  const {point,screenOf}=B;

  // --- ISSUE 1: serosa leader anchor ---
  // S46 uses midSerosa z=0.4, center=point(80,300)
  const cam46=[...point(80,300),0.4];
  const scr46=(x,y)=>screenOf(x,y,...cam46);
  // The BANDS say serosa is [230,280]. Check a few y values.
  const bandCheck=[220,230,240,250,260,270,280,290,300].map(y=>({y,s:scr46(80,y).map(v=>+v.toFixed(1))}));
  // serosaLog covers y=277-338. At s46 midSerosa, what is the y range?
  const serosaScreenY=B.serosaLog.map(q=>scr46(q.x,q.y)[1]);
  const serosaIn=B.serosaLog.filter(q=>{const s=scr46(q.x,q.y);return Math.hypot(s[0]-1110,s[1]-475)<425;});

  // --- ISSUE 2: serosaMap outer clipping ---
  // mapSource called with top=450, outer=520 for serosaSource (height=1100).
  // serosaSurface y=277-310 → at z=0.78 (s43hi) where do they appear?
  const cam43=[...point(80,300),0.78];
  const scr43=(x,y)=>screenOf(x,y,...cam43);
  const serosaIn43=B.serosaLog.filter(q=>{const s=scr43(q.x,q.y);return Math.hypot(s[0]-1110,s[1]-475)<425;});
  const surfIn43=serosaIn43.filter(q=>q.src==='surface');

  // --- ISSUE 3: oil view hub ellipse size ---
  // hub = point(102,60) with z=2.45
  const camOil=[...point(102,60),2.45];
  const hub=point(102,60);
  // The ellipse is drawn at hub[0],hub[1] in atlas coords, 96×74 px
  // screen: 1110+(hub[0]-camOil[0])*z, 475+(hub[1]-camOil[1])*z
  const hubS=[1110+(hub[0]-camOil[0])*2.45, 475+(hub[1]-camOil[1])*2.45];
  // OIL cells screen positions
  const OIL=[{fx:65,fy:55},{fx:105,fy:36},{fx:132,fy:60},{fx:104,fy:88}];
  const oilScr=OIL.map(q=>screenOf(q.fx,q.fy,...camOil));

  return {
   bandCheck,
   serosaIn46:{n:serosaIn.length, yRange:[Math.min(...serosaScreenY),Math.max(...serosaScreenY)]},
   serosaIn43:{total:serosaIn43.length, surface:surfIn43.length, surfY:[Math.min(...surfIn43.map(q=>scr43(q.x,q.y)[1])),Math.max(...surfIn43.map(q=>scr43(q.x,q.y)[1]))]},
   oilHub:{hubScreen:hubS.map(v=>+v.toFixed(1)), oilCellsScreen:oilScr.map(s=>s.map(v=>+v.toFixed(1)))},
  };
 });
 console.log(JSON.stringify(out,null,2));
}finally{await browser.close();server.close();}
