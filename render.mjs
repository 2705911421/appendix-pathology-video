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
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.woff2':'font/woff2','.png':'image/png'};
let browser,backend='browser',cpuPage;
try{
 if(getArg('--backend')!=='cpu'&&chromium){try{browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--font-render-hinting=none','--force-color-profile=srgb']});}catch(e){console.log('Chromium unavailable; falling back to CPU Canvas2D:',e.message.split('\n')[0]);}}
 if(!browser){backend='cpu';({cpuPage}=await import('./tools/cpu_canvas.mjs'));console.log('Renderer: CPU Canvas2D (same scene modules; browser QA pending)');}

 const errors=[];
 async function page(){if(backend==='cpu')return cpuPage();const p=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',async r=>{try{const u=new URL(r.request().url());if(u.origin!=='http://v5.local')throw Error('External network blocked');const f=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!f.startsWith(root+path.sep))throw Error('Outside root');await r.fulfill({status:200,contentType:mime[path.extname(f)]||'application/octet-stream',body:await fs.readFile(f)});}catch{await r.fulfill({status:404,body:''});}});await p.goto('http://v5.local/');await p.waitForFunction(()=>window.READY||window.LOAD_ERROR,{},{timeout:90000});const err=await p.evaluate(()=>window.LOAD_ERROR);if(err)throw Error(err);return p;}
 const p=await page(),out=path.join(root,'qa/samples');await fs.mkdir(out,{recursive:true});
 const sampleTimes=await p.evaluate(()=>[T.fracId('04',.5),T.fracId('30',.50)]);
 const audit=[];
 async function frame(page,t){const info=await page.evaluate(t=>{window.render(t);return {...window.FRAME_INFO,pixelBounds:window.auditContent()};},t);audit.push({time:t,...info});return page.locator('#film').screenshot();}
 if(args.includes('--still')){const t=Number(getArg('--still'));const png=await frame(p,t);const dest=path.resolve(root,getArg('--out')||`qa/samples/still_${t}.png`);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,png);console.log(dest);}
 if(args.includes('--samples')){
 const b03=path.join(out,'b04');await fs.mkdir(b03,{recursive:true});
 const b03Stages=await p.evaluate(()=>[
 ['s08_low',T.fracId('30',.12)],['s08_mid',T.fracId('30',.50)],
 ['s08_high_s30',T.fracId('30',.96)],['s08_high_s31',T.fracId('31',.65)],
 ['s08_high_s32',T.fracId('32',.90)],['s08_high_s33',T.fracId('33',.88)],
 ['s08_high_s34_defect',T.fracId('34',.60)],['s10_mid',T.fracId('37',.50)],['s14_mid',T.fracId('54',.50)],['s14_perforation',T.fracId('57',.80)]]);
 for(const [name,t] of b03Stages)await fs.writeFile(path.join(b03,name+'.png'),await frame(p,t));
 const b03Crops=await p.evaluate(()=>[
 {name:'s08_mucosal_defect_200',t:T.fracId('34',.6),x:780,y:340,w:300,h:260},
 {name:'s08_muscle_200',t:T.fracId('32',.9),x:760,y:110,w:300,h:610}
 ].map(s=>({...s,scale:2,method:'scene re-render at 2x; no raster upscaling',png:window.renderCrop(s)})));
 for(const z of b03Crops)await fs.writeFile(path.join(b03,z.name+'.png'),Buffer.from(z.png,'base64'));
 await fs.writeFile(path.join(b03,'crop-metadata.json'),JSON.stringify(b03Crops.map(({png,...x})=>x),null,2));

 let canvasAPI;for(const name of ['@napi-rs/canvas',process.env.CANVAS_MODULE,'/opt/sand/sand-host/node_modules/@napi-rs/canvas/index.js'].filter(Boolean)){try{canvasAPI=await import(name);break;}catch{}}const {createCanvas,loadImage}=canvasAPI;
 const compare=createCanvas(1600,1600),cc=compare.getContext('2d');cc.fillStyle='#111114';cc.fillRect(0,0,1600,1600);
 for(const [row,ref,name,crop] of [[0,'t_089.73.png','s10_mid',[310,140,680,680]],[1,'t_099.22.png','s14_perforation',[257,140,725,660]]]){
 const target=await loadImage(path.join(root,'qa/ref/style_target',ref));const actual=await loadImage(path.join(b03,name+'.png'));
 cc.drawImage(target,...crop,0,row*800,800,800);cc.drawImage(actual,455,30,890,890,800,row*800,800,800);
 }
 await fs.writeFile(path.join(b03,'对比_目标vs_b04.png'),compare.toBuffer('image/png'));
 for(let i=0;i<2;i++)await fs.writeFile(path.join(out,['s01_key.png','s08_key.png'][i]),await frame(p,sampleTimes[i]));
 const stages=await p.evaluate(()=>[
 ['s08_low',T.fracId('30',.12)],['s08_mid',T.fracId('30',.50)],
 ['s08_high',T.fracId('30',.96)],['s08_zoom_transition',T.fracId('30',.33)],
 ['s08_high_pan',T.fracId('32',.15)],['s08_high_defect',T.fracId('34',.60)],
 ...[['s10','37','39'],['s13','50','51'],['s14','54','55'],['s19','69','70']].flatMap(([s,id,high])=>[[s+'_low',T.fracId(id,.12)],[s+'_mid',T.fracId(id,.5)],[s+'_high',T.fracId(high,.6)]])]);
 for(const [name,t] of stages)await fs.writeFile(path.join(out,name+'.png'),await frame(p,t));
 const crops=await p.evaluate(()=>[
 {name:'s08_mucosal_defect_200',t:T.fracId('34',.6),x:780,y:340,w:300,h:260},
 {name:'s08_muscle_200',t:T.fracId('30',.5),x:720,y:110,w:350,h:350}
 ].map(s=>({...s,scale:2,method:'scene re-render at 2x; no raster upscaling',png:window.renderCrop(s)})));
 for(const z of crops)await fs.writeFile(path.join(out,z.name+'.png'),Buffer.from(z.png,'base64'));
 await fs.writeFile(path.join(out,'crop-metadata.json'),JSON.stringify(crops.map(({png,...x})=>x),null,2));
 const phone=await p.evaluate(()=>{window.render(T.fracId('30',.5));const cv=document.createElement('canvas');cv.width=390;cv.height=844;const c=cv.getContext('2d');c.fillStyle='#111114';c.fillRect(0,0,390,844);c.drawImage(document.getElementById('film'),0,(844-1080*390/1920)/2,390,1080*390/1920);return cv.toDataURL().split(',')[1];});
 await fs.writeFile(path.join(out,'s08_phone_390pt.png'),Buffer.from(phone,'base64'));
 const comparison=await p.evaluate(async()=>{window.render(T.fracId('30',.5));const ref=new Image();ref.src='./qa/samples/ref04.png';await new Promise((resolve,reject)=>{ref.onload=resolve;ref.onerror=reject;});const cv=document.createElement('canvas');cv.width=3840;cv.height=1080;const c=cv.getContext('2d');c.drawImage(ref,0,0,1920,1080);c.drawImage(document.getElementById('film'),1920,0);return cv.toDataURL().split(',')[1];});
 await fs.writeFile(path.join(out,'对比_ref04_vs_s08.png'),Buffer.from(comparison,'base64'));

 }
 if(args.includes('--determinism')){
 const times=await p.evaluate(()=>['01','02','03','04','05','30','31','32','33','34','37','38','39','40','41','42','54','55','56','57','69','70'].flatMap(id=>[T.atId(id),T.fracId(id,.5),T.endId(id)-.001]));
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
 console.log('PASS content pixel bounds and registered boxes: y < 950');
}finally{await browser?.close();}
