// S18 subtitle band: transparent PNG sequence for the local dubbed 720p clip.
// Reuses the approved subtitle page (assembly/subtitle) so typography, halo and
// dark-mode colours match the film. Times are shifted by sentence 66's start.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {timing} from '../../../film/timing_snapshot.js';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const sub=path.join(root,'assembly/subtitle');
const req=createRequire(import.meta.url);
let chromium;try{({chromium}=req('playwright'));}catch{({chromium}=createRequire('/workspace/病理科普视频/v5/package.json')('playwright'));}
const s66=timing.find(s=>s.n===66),s67=timing.find(s=>s.n===67),s68=timing.find(s=>s.n===68);
const origin=s66.start,duration=s68.end-origin+.8,FPS=30,N=Math.ceil(duration*FPS);
const cues=JSON.parse(fs.readFileSync(path.join(root,'qa/v6/animatic/cues_real.json'),'utf8')).cues
  .filter(c=>+c.id>=66&&+c.id<=68)
  .map(c=>({...c,start:c.start-origin,end:c.end-origin}));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.woff2':'font/woff2'};
const outDir=path.join(here,'subtitles');fs.rmSync(outDir,{recursive:true,force:true});fs.mkdirSync(outDir,{recursive:true});
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const enterStart=s67.start-origin-.45,enterEnd=s67.start-origin+.25;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--font-render-hinting=none','--force-color-profile=srgb']});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 page.on('pageerror',e=>console.error('[pageerror]',e.message));
 const http=await import('node:http');
 const server=http.createServer((req,res)=>{
  try{
   let rel=decodeURIComponent(new URL(req.url,'http://x').pathname);if(rel.endsWith('/'))rel+='index.html';
   const file=path.resolve(sub,'.'+rel);
   if(!file.startsWith(sub)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
   res.writeHead(200,{'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});
   fs.createReadStream(file).pipe(res);
  }catch(e){console.error('serve',e.message);res.writeHead(500);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const port=server.address().port;
 await page.goto(`http://127.0.0.1:${port}/index.html`);
 await page.waitForFunction(()=>window.READY===true);
 await page.evaluate(c=>{window.CUES=c;},cues);
 for(let n=0;n<N;n++){
  const t=n/FPS,dark=smooth((t-enterStart)/(enterEnd-enterStart));
  const url=await page.evaluate(({t,dark})=>{window.DARK=dark;window.renderOverlay(t);return document.querySelector('canvas').toDataURL('image/png');},{t,dark});
  fs.writeFileSync(path.join(outDir,`f_${String(n).padStart(5,'0')}.png`),Buffer.from(url.split(',')[1],'base64'));
 }
 console.log(JSON.stringify({origin,duration,frames:N,enterStart,enterEnd},null,2));
 server.close();
}finally{await browser.close();}
