import {loadChromium,launch,serve,resolveTarget,openPage} from '/workspace/garden-skills/skills/motion-showreel/scripts/lib/browser.mjs';
const target=resolveTarget('film');const chromium=await loadChromium(target.root);const {server,port}=await serve(target.root);const browser=await launch(chromium);
try{
 const page=await openPage(browser,{port,rel:target.rel,w:1920,h:1080,dpr:1,query:'scene=s11'});
 await page.waitForFunction(()=>window.READY===true);
 const out=await page.evaluate(async()=>{
  const B=await import('./lib_ext/b09_pus.js');
  const {point,screenOf}=B;
  const cam=[...point(0,-305),0.85];
  const scr=(x,y)=>screenOf(x,y,...cam).map(v=>+v.toFixed(1));
  // epithelial shreds (fray) = tissue debris at the ulcer edges
  const frays=[];
  for(const [x,sign] of [[-27,1],[47,-1]])for(let j=0;j<3;j++)frays.push({x:+(x+sign*(j*1.8)).toFixed(1),y:-290-j*3.5});
  // ulcer log entries (pus cells near ulcer) and fibres
  const ulc=B.ulcerLog.filter(q=>!q.rbc).slice(0,40);
  return {
    frays:frays.map(q=>({...q,s:scr(q.x,q.y),in:(()=>{const s=scr(q.x,q.y);return Math.hypot(s[0]-1110,s[1]-475)<400})()})),
    ulcerLog:ulc.map(q=>({x:+q.x.toFixed(1),y:+q.y.toFixed(1),s:scr(q.x,q.y)})),
    ulcerSrcCounts:B.ulcerLog.reduce((a,q)=>(a[q.src]=(a[q.src]||0)+1,a),{}),
    fibreSample:B.lumenFibres.slice(0,8).map(q=>({x:+q.x.toFixed(1),y:+q.y.toFixed(1),s:scr(q.x,q.y)})),
  };
 });
 console.log(JSON.stringify(out,null,1));
}finally{await browser.close();server.close();}
