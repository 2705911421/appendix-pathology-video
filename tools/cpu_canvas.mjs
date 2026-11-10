// DOM adapter for the same Canvas2D scene modules on machines where Chromium cannot launch.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let api;
for(const name of ['@napi-rs/canvas',process.env.CANVAS_MODULE,'/opt/sand/sand-host/node_modules/@napi-rs/canvas/index.js'].filter(Boolean)){try{api=await import(name);break;}catch{}}
if(!api)throw Error('CPU renderer requires @napi-rs/canvas or CANVAS_MODULE');
const {createCanvas,Path2D,Image,GlobalFonts}=api;
const {installCPUBrush}=await import('./cpu_brush.mjs');installCPUBrush(createCanvas);
GlobalFonts.registerFromPath(path.join(root,'assets/fonts/v5-CJK-Regular.woff2'),'MixSans');
GlobalFonts.registerFromPath(path.join(root,'assets/fonts/v5-CJK-Bold.woff2'),'MixSans');
globalThis.Path2D=Path2D;globalThis.Image=Image;globalThis.window=globalThis;
vm.runInThisContext(await fs.readFile(path.join(root,'vendor/rough.js'),'utf8'));
globalThis.fetch=async url=>{const filename=path.resolve(root,url);if(!filename.startsWith(root+path.sep))throw Error('Outside root');try{const b=await fs.readFile(filename);return {ok:true,json:async()=>JSON.parse(b)};}catch{return {ok:false};}};
let count=0;
export async function cpuPage(){
 const canvas=createCanvas(1920,1080);
 const doc={createElement:tag=>{if(tag==='div')return {};if(tag!=='canvas')throw Error(`CPU DOM unsupported: ${tag}`);return createCanvas(1,1);},getElementById:id=>{if(id!=='film')throw Error('Unknown canvas');return canvas;},fonts:{load:async()=>[],ready:Promise.resolve()}};
 globalThis.document=doc;delete globalThis.LOAD_ERROR;
 await import('../main.js?cpu='+count++);
 if(globalThis.LOAD_ERROR)throw Error(globalThis.LOAD_ERROR);
 const state={};for(const k of ['render','renderCrop','auditContent','FRAME_INFO','T','DUR','READY','manifest'])state[k]=globalThis[k];
 function activate(){globalThis.document=doc;Object.assign(globalThis,state);}
 return {evaluate:async(fn,arg)=>{activate();const v=await fn(arg);state.FRAME_INFO=globalThis.FRAME_INFO;return v;},locator:()=>({screenshot:async()=>{activate();return canvas.toBuffer('image/png');}}),close:async()=>{}};
}
