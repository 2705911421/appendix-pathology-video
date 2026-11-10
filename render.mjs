#!/usr/bin/env node
// Offline route fulfillment; no network, no dependency on a running HTTP server.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url)),args=process.argv.slice(2);
let chromium;
for(const name of ['playwright','playwright-core',process.env.PLAYWRIGHT_MODULE].filter(Boolean)){try{chromium=(await import(name)).chromium;break;}catch{}}

const getArg=k=>{const i=args.indexOf(k);return i<0?undefined:args[i+1];};
if(args.includes('--still')&&(!getArg('--still')||!Number.isFinite(Number(getArg('--still')))))throw Error('--still requires a finite time');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.woff2':'font/woff2'};
let browser,backend='browser',cpuPage;
try{
 if(getArg('--backend')!=='cpu'&&chromium){try{browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--font-render-hinting=none','--force-color-profile=srgb']});}catch(e){console.log('Chromium unavailable; falling back to CPU Canvas2D:',e.message.split('\n')[0]);}}
 if(!browser){backend='cpu';({cpuPage}=await import('./tools/cpu_canvas.mjs'));console.log('Renderer: CPU Canvas2D (same scene modules; browser QA pending)');}

 const errors=[];
 async function page(){if(backend==='cpu')return cpuPage();const p=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',async r=>{try{const u=new URL(r.request().url());if(u.origin!=='http://v5.local')throw Error('External network blocked');const f=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!f.startsWith(root+path.sep))throw Error('Outside root');await r.fulfill({status:200,contentType:mime[path.extname(f)]||'application/octet-stream',body:await fs.readFile(f)});}catch{await r.fulfill({status:404,body:''});}});await p.goto('http://v5.local/');await p.waitForFunction(()=>window.READY||window.LOAD_ERROR,{},{timeout:90000});const err=await p.evaluate(()=>window.LOAD_ERROR);if(err)throw Error(err);return p;}
 const p=await page(),out=path.join(root,'qa/samples');await fs.mkdir(out,{recursive:true});
 const sampleTimes=await p.evaluate(()=>[T.fracId('04',.5),T.fracId('34',.5)]);
 const audit=[];
 async function frame(page,t){const info=await page.evaluate(t=>{window.render(t);return {...window.FRAME_INFO,pixelBounds:window.auditContent()};},t);audit.push({time:t,...info});return page.locator('#film').screenshot();}
 if(args.includes('--still')){const t=Number(getArg('--still'));const png=await frame(p,t);const dest=path.resolve(root,getArg('--out')||`qa/samples/still_${t}.png`);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,png);console.log(dest);}
 if(args.includes('--samples')){
 for(let i=0;i<2;i++)await fs.writeFile(path.join(out,['s01_key.png','s08_key.png'][i]),await frame(p,sampleTimes[i]));
 // 200% crops of the final 1080p raster, useful for inspecting final-output cell shapes.
 const zoom=await p.evaluate(()=>{window.render(T.fracId('34',.5));const src=document.getElementById('film');const result=[];for(const [name,x,y,w,h] of [['s08_mucosal_defect_200',1010,145,260,220],['s08_muscle_200',900,487,420,170]]){const cv=document.createElement('canvas');cv.width=w*2;cv.height=h*2;const c=cv.getContext('2d');c.drawImage(src,x,y,w,h,0,0,w*2,h*2);result.push({name,png:cv.toDataURL().split(',')[1],source:[x,y,w,h],scale:2});}const phone=document.createElement('canvas');phone.width=390;phone.height=844;const c=phone.getContext('2d');c.fillStyle='#111114';c.fillRect(0,0,390,844);c.drawImage(src,0,(844-1080*390/1920)/2,390,1080*390/1920);result.push({name:'s08_phone_390pt',png:phone.toDataURL().split(',')[1]});return result;});
 for(const z of zoom)await fs.writeFile(path.join(out,z.name+'.png'),Buffer.from(z.png,'base64'));
 }
 if(args.includes('--determinism')){
 const times=await p.evaluate(()=>['01','02','03','04','05','31','32','33','34'].flatMap(id=>[T.atId(id),T.fracId(id,.5),T.endId(id)-.001]));
 const hashes=new Map(),hash=b=>createHash('sha256').update(b).digest('hex');
 for(const t of times)hashes.set(t,hash(await frame(p,t)));
 for(const t of [...times].reverse())if(hash(await frame(p,t))!==hashes.get(t))throw Error(`Render order dependence at ${t}`);
 const fresh=await page();for(const t of sampleTimes)if(hash(await frame(fresh,t))!==hash(await frame(p,t)))throw Error(`Reload mismatch ${t}`);await fresh.close();
 if(getArg('--reference')){
 const independent=JSON.parse(await fs.readFile(path.resolve(root,getArg('--reference')),'utf8'));
 for(let i=0;i<sampleTimes.length;i++)if(hash(await frame(p,sampleTimes[i]))!==independent[i])throw Error('Independent process render mismatch');
 }
 // All placeholders and subtitle cards; overflow throws during render.
 await p.evaluate(()=>{for(let i=1;i<=77;i++){const id=String(i).padStart(2,'0');for(const f of [.01,.75]){window.render(T.fracId(id,f));window.auditContent();}}});
 console.log(`PASS determinism: ${times.length} frames, reverse order + fresh page; 77 sentence layout states`);
 }
 if(errors.length)throw Error(errors.join('\n'));
 await fs.writeFile(path.join(root,'qa/render-check.json'),JSON.stringify({status:'PASS',backend,browserQA:backend==='browser'?'PASS':'PENDING: Chromium launch blocked',timeline:'preview',determinism:args.includes('--determinism'),independentProcessReference:!!getArg('--reference'),samples:args.includes('--samples'),frames:audit},null,2));
 console.log('PASS content pixel bounds and registered boxes: y < 810');
}finally{await browser?.close();}
