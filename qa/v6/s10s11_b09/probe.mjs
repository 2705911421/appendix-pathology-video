// Probe the S10/S11 scene: dump window.__metrics at chosen scene times.
import fs from 'node:fs';
import {loadChromium,launch,serve,resolveTarget,openPage} from '/workspace/garden-skills/skills/motion-showreel/scripts/lib/browser.mjs';
const target=resolveTarget('film');const chromium=await loadChromium(target.root);const {server,port}=await serve(target.root);const browser=await launch(chromium);
try{
 const page=await openPage(browser,{port,rel:target.rel,w:1920,h:1080,dpr:1,query:'scene=s11'});
 await page.waitForFunction(()=>window.READY===true);
 const times=JSON.parse(fs.readFileSync(process.argv[2]||'qa/v6/s10s11_b09/probe_times.json','utf8'));
 const out=[];
 for(const t of times){
  await page.evaluate(t=>window.render(t),t);
  const m=await page.evaluate(()=>window.__metrics);
  out.push({t,...m});
  console.log(JSON.stringify({t,...m}));
 }
 fs.writeFileSync('qa/v6/s10s11_b09/probe_metrics.json',JSON.stringify(out,null,2));
}finally{await browser.close();server.close();}
