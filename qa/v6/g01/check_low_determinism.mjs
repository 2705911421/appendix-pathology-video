import fs from 'node:fs';
import {loadChromium,launch,serve,resolveTarget,openPage} from '/workspace/garden-skills/skills/motion-showreel/scripts/lib/browser.mjs';
const target=resolveTarget('film');const chromium=await loadChromium(target.root);const {server,port}=await serve(target.root);const browser=await launch(chromium);
try{const page=await openPage(browser,{port,rel:target.rel,w:1920,h:1080,dpr:1,query:''});const refs=new Map();
 for(const t of [1,3.8,9,1,33,3.8,9,33]){await page.evaluate(t=>window.render(t),t);const buf=await page.screenshot({type:'png'});if(refs.has(t)&&!refs.get(t).equals(buf))throw Error(`Mismatch at ${t}`);refs.set(t,buf);}
 fs.writeFileSync('qa/v6/g01/determinism_low.log','PASS: 1, 3.8, 9, 33 s repeated in different orders: byte-identical PNGs\n');
}finally{await browser.close();server.close();}
