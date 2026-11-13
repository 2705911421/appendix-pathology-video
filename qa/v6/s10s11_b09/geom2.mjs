import fs from 'node:fs';
import {loadChromium,launch,serve,resolveTarget,openPage} from '/workspace/garden-skills/skills/motion-showreel/scripts/lib/browser.mjs';
const target=resolveTarget('film');const chromium=await loadChromium(target.root);const {server,port}=await serve(target.root);const browser=await launch(chromium);
try{
 const page=await openPage(browser,{port,rel:target.rel,w:1920,h:1080,dpr:1,query:'scene=s11'});
 await page.waitForFunction(()=>window.READY===true);
 const out=await page.evaluate(async()=>{
  const B=await import('./lib_ext/b09_pus.js');
  const {point,screenOf}=B;
  const res={};
  const mk=(name,cx,cy,z)=>{
    const scr=(x,y)=>screenOf(x,y,cx,cy,z);
    const inC=(s,r=425)=>Math.hypot(s[0]-1110,s[1]-475)<r;
    const surf=B.serosaLog.map(q=>({x:q.x,y:q.y,sz:q.sz,deg:q.deg,src:q.src,s:scr(q.x,q.y).map(v=>+v.toFixed(1)),in:inC(scr(q.x,q.y))}));
    return {cam:[+cx.toFixed(1),+cy.toFixed(1),z],n:surf.length,inCircle:surf.filter(q=>q.in).length,
      inCircleSrc:surf.filter(q=>q.in).reduce((a,q)=>(a[q.src]=(a[q.src]||0)+1,a),{}),
      sample:surf.filter(q=>q.in).slice(0,10),
      yRange:[Math.min(...surf.map(q=>q.s[1])),Math.max(...surf.map(q=>q.s[1]))]};
  };
  res.s46mid=mk('s46',...point(80,300),0.4);
  res.s43hi=mk('s43',...point(80,300),0.78);
  res.s40=mk('s40',...point(0,-305),0.85);
  // serosa candidates
  const cam=point(80,300);
  res.serosaCands=[240,250,260,270,275,280,290,300].map(y=>{const s=screenOf(80,y,cam[0],cam[1],0.4);return {y,s:s.map(v=>+v.toFixed(1))};});
  res.lumenCands=[-400,-380,-360,-343,-320].map(y=>{const s=screenOf(0,y,...point(0,-305),0.85);return {y,s:s.map(v=>+v.toFixed(1))};});
  return res;
 });
 console.log(JSON.stringify(out,null,1));
}finally{await browser.close();server.close();}
