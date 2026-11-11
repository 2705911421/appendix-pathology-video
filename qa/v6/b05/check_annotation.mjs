import fs from 'node:fs';
import {loadChromium,launch,serve,resolveTarget,openPage} from '/workspace/garden-skills/skills/motion-showreel/scripts/lib/browser.mjs';
const target=resolveTarget('film'), chromium=await loadChromium(target.root),{server,port}=await serve(target.root),browser=await launch(chromium);
try {
 const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 await context.route('**/chapters/s08.js',async route=>{let s=fs.readFileSync('film/chapters/s08.js','utf8');s=s.replace(/const target=id===29\?[\s\S]*?c\.lineTo\(1110\+\(tip\[0\]-x\)\*z,475\+\(tip\[1\]-y\)\*z\);/,'');await route.fulfill({contentType:'text/javascript',body:s});});
 const page=await context.newPage();await page.goto(`http://127.0.0.1:${port}/`);await page.waitForFunction(()=>window.READY===true,null,{timeout:240000});
 for(const t of [3.8,9,15,21,27,33]){await page.evaluate(t=>window.render(t),t);await page.screenshot({path:`qa/v6/b05/no_leader_${t}.png`});}
}finally{await browser.close();server.close();}
