#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { launchBrowser } from './browser.mjs';
import { ffmpegPath, ffprobeOptional } from './bin.mjs';
import { serveFilm } from './server.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scenes = JSON.parse(fs.readFileSync(new URL('./scenes.json', import.meta.url)));
function options(argv) {
  const opt = { mode:'samples', scene:'S08', workers:Math.min(3,os.cpus().length || 1), fps:30, crf:18, voice:process.env.VOICE_WAV };
  if (argv[0] && !argv[0].startsWith('--')) opt.mode = argv.shift();
  for (let i=0;i<argv.length;i++) {
    const key = argv[i];
    if (['--help','--all','--full'].includes(key)) { opt[key.slice(2)]=true; continue; }
    if (!['--scene','--out','--workers','--fps','--crf','--times','--sentences','--voice'].includes(key)) throw Error('未知参数：'+key);
    if (!argv[i+1] || argv[i+1].startsWith('--')) throw Error('缺少参数值：'+key);
    opt[key.slice(2)] = argv[++i];
  }
  if (opt.help) return opt;
  opt.scene=opt.scene.toUpperCase();
  if (!scenes.some(s=>s.name===opt.scene)) throw Error('场景仅支持 S08/S10/S11/S14/S19');
  if (!['samples','preview'].includes(opt.mode)) throw Error('请选择 samples 或 preview');
  for (const k of ['workers','fps','crf']) opt[k]=Number(opt[k]);
  if (!Number.isInteger(opt.workers) || opt.workers<1 || !Number.isFinite(opt.fps) || opt.fps<=0 || !Number.isFinite(opt.crf) || opt.crf<0 || opt.crf>51) throw Error('workers 必须为正整数，fps 必须为正数，crf 范围为 0–51');
  if (opt.all && opt.mode!=='samples') throw Error('--all 仅适用于样张');
  return opt;
}
function processRun(binary,args,input=false, stderr=false) {
  const proc=spawn(binary,args,{stdio:[input?'pipe':'ignore','pipe','pipe']});
  let out='',err='';
  proc.stdout.on('data',d=>{out+=d;}); proc.stderr.on('data',d=>{err=(err+d).slice(-8000);});
  const done=new Promise((resolve,reject)=>{proc.once('error',reject);proc.once('close',code=>code===0?resolve(stderr?err:out):reject(Error('编码或校验失败：'+err)));});
  // Register immediately: encoders can fail while the page is rendering.
  done.catch(()=>{});
  proc.stdin?.on('error',()=>{});
  return {proc,done};
}
async function main() {
  const opt=options(process.argv.slice(2));
  if (opt.help) { console.log(`用法：npm run samples -- --scene S08 [参数]\n      npm run preview -- --scene S08 [参数]\n场景：S08/S10/S11/S14/S19（默认 S08，不分大小写）\n--out 目录  --workers N（默认最多 3） --fps 30 --crf 18\n--times 1.5,3.2：场景内秒数；--sentences 31,34：句子中点\n--voice "旁白.wav"：从场景起点截取配音，也可设置 VOICE_WAV\n--full：1080p（预览默认 720p）；--all：依次渲染全部场景样张\n默认输出：out/samples/<场景>/ 和 out/preview/`); return; }
  const timeline=JSON.parse(await fsp.readFile(path.join(root,'data/narration/timeline.json'),'utf8')).lines;
  const selected=opt.all?scenes:scenes.filter(s=>s.name===opt.scene);
  const tmp=await fsp.mkdtemp(path.join(os.tmpdir(),'pathology-'));
  let browser,server;
  const children=new Set();
  const stop=()=>{for(const p of children)p.kill();};
  const interrupt=()=>{stop(); process.exitCode=130; void browser?.close(); server?.close();};
  process.once('SIGINT',interrupt); process.once('SIGTERM',interrupt);
  try {
    const service=await serveFilm(); server=service.server;
    browser=await launchBrowser();
    for (const scene of selected) {
      const origin=timeline.find(s=>s.n===scene.firstSentence)?.start;
      if (!Number.isFinite(origin)) throw Error('时间轴缺少场景首句');
      let fatal;
      let fail;
      const failure=new Promise((_,reject)=>{fail=reject;}); failure.catch(()=>{});
      const guarded=promise=>Promise.race([promise,failure]);
      async function pageReady() {
        const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
        const report=e=>{fatal=e instanceof Error?e:Error(String(e));fail(fatal);};
        page.on('pageerror',report);
        page.on('console',m=>{if(m.type()==='error')console.error('页面错误：'+m.text());});
        page.on('response',r=>{if(r.status()>=400){const message=`资源请求失败 ${r.status()}：${r.url()}`;if(['script','document'].includes(r.request().resourceType()))report(Error(message));else console.warn(message);}});
        page.on('requestfailed',r=>{if(['script','document'].includes(r.resourceType()))report(Error('资源加载失败：'+r.url()));});
        await guarded(page.goto(`${service.url}/index.html?scene=${scene.tag}&w=1920&h=1080&render=1`));
        console.log(`${scene.name} 正在烘焙画面，首次约需 30–120 秒…`);
        await guarded(page.waitForFunction(()=>window.READY===true,null,{timeout:300000}));
        return page;
      }
      const first=await pageReady();
      const duration=await guarded(first.evaluate(()=>window.DUR));
      if (!Number.isFinite(duration) || duration<=0) throw Error('页面 DUR 无效');
      async function shot(page,t,type) {
        if (fatal) throw fatal;
        await guarded(page.evaluate(t=>window.render(t),t));
        return guarded(page.screenshot({type,...(type==='jpeg'?{quality:95}:{}),clip:{x:0,y:0,width:1920,height:1080}}));
      }
      if (opt.mode==='samples') {
        let samples=scene.samples;
        if (opt.times || opt.sentences) {
          samples=[];
          if(opt.times) samples.push(...opt.times.split(',').map((v,i)=>({name:`${scene.name}_${i+1}`,t:Number(v)})));
          if(opt.sentences) samples.push(...opt.sentences.split(',').map(v=>{const row=timeline.find(s=>s.n===Number(v));if(!row)throw Error('句号不存在：'+v);return {name:`${scene.name}_s${row.n}`,t:(row.start+row.end)/2-origin};}));
        }
        const dest=path.resolve(opt.out || path.join(root,'out/samples'),scene.name);
        if(samples.some(s=>!Number.isFinite(s.t)||s.t<0||s.t>=duration))throw Error('样张时间必须位于当前场景时长之内');
        await fsp.mkdir(dest,{recursive:true});
        for(const sample of samples){const file=path.join(dest,`${sample.name}_t${sample.t.toFixed(2)}.png`);await fsp.writeFile(file,await shot(first,sample.t,'png'));console.log('已输出 '+path.relative(root,file));}
      } else {
        const binary=await ffmpegPath(), probe=await ffprobeOptional();
        const frames=Math.round(duration*opt.fps);
        const workers=Math.min(opt.workers,frames);
        const dest=path.resolve(opt.out || path.join(root,'out/preview'));
        await fsp.mkdir(dest,{recursive:true});
        const pages=[first];
        for(let i=1;i<workers;i++)pages.push(await pageReady());
        const segments=Array.from({length:workers},(_,i)=>`seg_${i}.mp4`);
        const jobs=pages.map(async(page,k)=>{
          const start=Math.floor(k*frames/workers),end=Math.floor((k+1)*frames/workers);
          const vf=opt.full?'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p':'scale=1280:720:flags=lanczos:out_color_matrix=bt709:out_range=tv,format=yuv420p';
          const {proc,done}=processRun(binary,['-y','-hide_banner','-loglevel','error','-f','image2pipe','-c:v','mjpeg','-framerate',String(opt.fps),'-i','-','-an','-c:v','libx264','-preset','medium','-crf',String(opt.crf),'-vf',vf,'-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv','-map_metadata','-1',path.join(tmp,segments[k])],true);
          children.add(proc);
          try {
            for(let frame=start;frame<end;frame++){
              const data=await shot(page,frame/opt.fps,'jpeg');
              await Promise.race([new Promise((resolve,reject)=>proc.stdin.write(data,e=>e?reject(e):resolve())),done.then(()=>{throw Error('编码器提前结束');})]);
              if((frame-start)%30===0)console.log(`${scene.name} 工作进程 ${k+1}：${frame-start+1}/${end-start} 帧`);
            }
            proc.stdin.end(); await done;
          } finally {if(proc.exitCode===null)proc.kill();children.delete(proc);}
        });
        try {await guarded(Promise.all(jobs));} catch(e){stop();await Promise.allSettled(jobs);throw e;}
        await fsp.writeFile(path.join(tmp,'list.txt'),segments.map(s=>`file '${s}'`).join('\n')+'\n');
        const output=path.join(dest,`${scene.name}_${opt.full?'1080p':'720p'}.mp4`);
        let voice=opt.voice;
        if(voice){try{if(!(await fsp.stat(voice)).isFile())throw Error();}catch{console.warn('未找到配音文件，将静音渲染。');voice=null;}}
        else console.log('未提供配音，正在生成静音预览。');
        const audio=voice?['-ss',String(origin),'-t',String(duration),'-i',path.resolve(voice),'-map','0:v:0','-map','1:a:0','-c:a','aac','-b:a','192k','-af','apad']:['-an'];
        await processRun(binary,['-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',path.join(tmp,'list.txt'),...audio,'-c:v','copy','-t',String(frames/opt.fps),'-map_metadata','-1','-movflags','+faststart',output]).done;
        let actual;
        if (probe) {
        const raw=await processRun(probe,['-v','error','-select_streams','v:0','-count_frames','-show_entries','stream=nb_read_frames','-of','json',output]).done;
        actual=Number(JSON.parse(raw).streams[0]?.nb_read_frames);
        } else {
          const log=await processRun(binary,['-hide_banner','-nostdin','-i',output,'-map','0:v:0','-an','-f','null','-'],false,true).done;
          const counts=[...log.matchAll(/frame=\s*(\d+)/g)];
          actual=counts.length ? Number(counts.at(-1)[1]) : NaN;
        }
        if(!Number.isFinite(actual)||Math.abs(actual-frames)>1)throw Error(`帧数校验失败：预期 ${frames}，实际 ${actual}`);
        console.log(`已输出 ${path.relative(root,output)}，帧数校验通过（${actual} 帧）。`);
        for(const page of pages.slice(1))await page.close();
      }
      await first.close();
    }
  } finally {
    stop(); await browser?.close(); if(server)await new Promise(resolve=>server.close(resolve));
    await fsp.rm(tmp,{recursive:true,force:true});
    process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);
  }
}
await main().catch(e=>{console.error('渲染失败：'+e.message);process.exitCode=1;});
