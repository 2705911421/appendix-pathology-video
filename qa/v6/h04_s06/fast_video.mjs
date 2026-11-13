// Canvas-only export avoids browser screenshot compositor overhead; same render(t).
import fs from 'node:fs';import {spawn} from 'node:child_process';import {once} from 'node:events';
import {loadChromium,launch,serve,resolveTarget,openPage} from '/workspace/garden-skills/skills/motion-showreel/scripts/lib/browser.mjs';
const scene=process.argv[2],out=process.argv[3],target=resolveTarget('film');
const chromium=await loadChromium(target.root),{server,port}=await serve(target.root),browser=await launch(chromium);
try{const page=await openPage(browser,{port,rel:target.rel,w:1920,h:1080,dpr:1,query:'scene='+scene});const dur=await page.evaluate(()=>window.DUR),n=Math.round(dur*30);
const ff=spawn('ffmpeg',['-v','error','-y','-f','image2pipe','-vcodec','mjpeg','-r','30','-i','-','-an','-c:v','libx264','-crf','16','-preset','veryfast','-pix_fmt','yuv420p','-threads','2',out],{stdio:['pipe','inherit','inherit']});const done=once(ff,'exit');
for(let i=0;i<n;i++){const data=await page.evaluate(t=>{window.render(t);return document.getElementById('c').toDataURL('image/jpeg',.95).split(',')[1];},i/30);if(!ff.stdin.write(Buffer.from(data,'base64')))await once(ff.stdin,'drain');if(i%60===0)console.log(i+'/'+n);}
ff.stdin.end();const [code]=await done;if(code)throw Error('ffmpeg '+code);console.log('complete '+out);
}finally{await browser.close();server.close();}
