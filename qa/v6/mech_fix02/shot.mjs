// Screenshot specific scene times from a given film/ root.
// usage: node shot.mjs <root> <scene> <outdir> <absT1,absT2,...> <origin>
import fs from 'node:fs';
import {loadChromium,launch,serve,openPage} from '/workspace/garden-skills/skills/motion-showreel/scripts/lib/browser.mjs';
const [root,scene,outdir,absList,originStr]=process.argv.slice(2);
const origin=Number(originStr);
const times=absList.split(',').map(Number);
fs.mkdirSync(outdir,{recursive:true});
const {server,port}=await serve(root+'/film');
const browser=await launch(await loadChromium(root));
try{
  const page=await openPage(browser,{port,rel:'index.html',w:1920,h:1080,query:'scene='+scene});
  for(const abs of times){
    const t=abs-origin;
    await page.evaluate(async t=>{window.render(t);await document.fonts.ready;window.render(t);},t);
    const file=outdir+'/t'+abs.toFixed(3)+'.png';
    await page.screenshot({path:file});
    console.log('shot',file);
  }
  await page.close();
}finally{await browser.close();server.close();}
