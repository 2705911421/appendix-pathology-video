import fs from 'node:fs';import {spawn} from 'node:child_process';import {once} from 'node:events';
import {loadChromium,launch,serve,resolveTarget,openPage} from '/workspace/garden-skills/skills/motion-showreel/scripts/lib/browser.mjs';
const P='qa/v6/h06_adv',target=resolveTarget('film');const chromium=await loadChromium(target.root),{server,port}=await serve(target.root),browser=await launch(chromium);
try{for(const scene of (process.argv[2]?[process.argv[2]]:['s06','s07'])){
 const dir=P+'/'+scene;fs.mkdirSync(dir,{recursive:true});const page=await openPage(browser,{port,rel:target.rel,w:1920,h:1080,dpr:1,query:'scene='+scene});const k=JSON.parse(fs.readFileSync(P+'/'+scene+'_keyframes.json'));
 const shot=async t=>Buffer.from(await page.evaluate(t=>{window.render(t);return document.getElementById('c').toDataURL('image/png').split(',')[1]},t),'base64');
 for(const p of k.picks)fs.writeFileSync(dir+'/'+p.name+'.png',await shot(p.t));
 const det=[];for(const p of [...k.picks].reverse()){const b=await shot(p.t);const equal=b.equals(fs.readFileSync(dir+'/'+p.name+'.png'));det.push({name:p.name,equal});fs.writeFileSync(dir+'/'+p.name+'_reverse.png',b);}fs.writeFileSync(dir+'/determinism.json',JSON.stringify(det,null,2));
 const dur=await page.evaluate(()=>window.DUR),n=Math.round(dur*30);const ff=spawn('ffmpeg',['-v','error','-y','-f','image2pipe','-vcodec','png','-r','30','-i','-','-an','-c:v','libx264','-crf','16','-preset','veryfast','-pix_fmt','yuv420p','-threads','1',dir+'/'+scene.toUpperCase()+'.mp4'],{stdio:['pipe','inherit','inherit']});const done=once(ff,'exit');
 for(let i=0;i<n;i++){if(!ff.stdin.write(await shot(i/30)))await once(ff.stdin,'drain');if(i%15===0)console.log(scene+' '+i+'/'+n);}ff.stdin.end();const [code]=await done;if(code)throw Error('ffmpeg '+code);await page.close();
}}finally{await browser.close();server.close();}
