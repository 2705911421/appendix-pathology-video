import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=path.dirname(fileURLToPath(import.meta.url));
const parity=process.argv.includes('--parity');
if(!parity && !process.argv.includes('--samples')) throw Error('Use --parity or --samples');
if(!parity){
 const result=JSON.parse(fs.readFileSync(path.join(root,'qa/v6/parity/metrics.json')));
 if(!result.passed) throw Error('Parity gate failed: S08 is not implemented; see qa/v6/自检.md');
 throw Error('S08 has not been implemented');
}
const out=path.join(root,'qa/v6/parity');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.woff2':'font/woff2','.json':'application/json','.tsv':'text/plain'};
const server=http.createServer((req,res)=>{let rel=decodeURIComponent(new URL(req.url,'http://local').pathname);if(rel.endsWith('/'))rel+='index.html';const f=path.resolve(root,'parity_runtime','.'+rel);if(!f.startsWith(path.join(root,'parity_runtime')+path.sep)){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--font-render-hinting=none','--force-color-profile=srgb','--hide-scrollbars']});
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.waitForFunction(()=>window.READY===true,null,{timeout:240000});
 for(const t of [89.73,99.22]){
 await page.evaluate(t=>window.render(t),t);
 const data=await page.locator('#c').evaluate(c=>c.toDataURL());
 fs.writeFileSync(path.join(out,`render_${t.toFixed(2)}.png`),Buffer.from(data.split(',')[1],'base64'));
 }
 fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({browser:await browser.version(),backend:'Chromium Canvas2D + SwiftShader WebGL (CPU software rasterizer)',errors},null,2));
}finally{await browser?.close();server.close();}
await import('./tools/compare-parity.mjs');
if(!JSON.parse(fs.readFileSync(path.join(out,'metrics.json'))).passed)process.exitCode=2;
