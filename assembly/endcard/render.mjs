#!/usr/bin/env node
// Standalone still renderer: npm install playwright, then node render.mjs.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
let chromium;
for(const name of ['playwright','playwright-core']){try{chromium=(await import(name)).chromium;break;}catch{}}
if(!chromium)throw new Error('Install Playwright: npm install playwright && npx playwright install chromium');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.woff2':'font/woff2'};
let browser;
try{
 const options={headless:true,args:['--no-sandbox','--font-render-hinting=none','--force-color-profile=srgb']};
 if(process.env.CHROME_PATH)browser=await chromium.launch({...options,executablePath:process.env.CHROME_PATH});
 else{try{browser=await chromium.launch(options);}catch{browser=await chromium.launch({...options,channel:'chrome'});}}
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 await page.route('http://endcard.local/**',async route=>{try{const rel=decodeURIComponent(new URL(route.request().url()).pathname);const file=path.resolve(root,'.'+(rel==='/'?'/index.html':rel));if(!file.startsWith(root+path.sep))throw new Error('outside root');await route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:await fs.readFile(file)});}catch{await route.fulfill({status:404,body:''});}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Measure actual painted text bounds, including descenders, in both cards.
 await page.addInitScript(()=>{window.__text=[];const orig=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(s,x,y,...args){if(this.globalAlpha>.01){const m=this.measureText(s);window.__text.push({text:s,x0:x-m.actualBoundingBoxLeft,x1:x+m.actualBoundingBoxRight,y0:y-m.actualBoundingBoxAscent,y1:y+m.actualBoundingBoxDescent,font:this.font});}return orig.call(this,s,x,y,...args);};});
 await page.goto('http://endcard.local/');await page.waitForFunction(()=>window.READY===true);
 const D=JSON.parse(await fs.readFile(path.join(root,'data/endcard.json'),'utf8'));
 const shots=[];
 for(const t of [3,9]){
  const bounds=await page.evaluate(t=>{window.__text=[];window.render(t);return window.__text;},t);
  for(const b of bounds)if(b.x0<190||b.x1>1720||b.y1>=810)throw new Error(`Text outside safe bounds at ${t}s: ${JSON.stringify(b)}`);
  if(t===9)console.log('Last reference:',JSON.stringify(bounds.at(-1)));
  shots.push(await page.locator('canvas').screenshot());
 }
 // Verify render-order independence, and all verbatim citations after joining wraps.
 for(const r of D.references)if(r.lines.join(' ')!==r.verbatim)throw new Error('Citation wrap changed text');
 await page.evaluate(()=>window.render(3));const repeat=await page.locator('canvas').screenshot();if(!repeat.equals(shots[0]))throw new Error('Non-deterministic frame');
 if(errors.length)throw new Error(errors.join('\n'));
 await page.setViewportSize({width:1920,height:2160});
 const png=await page.evaluate(async({shots,D})=>{
  const sheet=document.createElement('canvas');sheet.width=1920;sheet.height=2160;const ctx=sheet.getContext('2d');
  for(let i=0;i<2;i++){const img=new Image();img.src='data:image/png;base64,'+shots[i];await img.decode();ctx.drawImage(img,0,i*1080);ctx.fillStyle=D.colors.ink;ctx.globalAlpha=.65;ctx.font=`${D.layout.captionSize}px MixSans`;ctx.fillText(D.captions[i],D.layout.captionX,i*1080+D.layout.captionY);ctx.globalAlpha=1;}
  return sheet.toDataURL('image/png').split(',')[1];
 },{shots:shots.map(b=>b.toString('base64')),D});
 const output=path.join(root,'样帧_片尾.png');await fs.writeFile(output,Buffer.from(png,'base64'));console.log(`Created ${output} (1920×2160)`);
}finally{await browser?.close();}
