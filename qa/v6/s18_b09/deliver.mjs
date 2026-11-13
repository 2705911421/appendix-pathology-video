import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {loadChromium,launch,serve,openPage} from '/workspace/garden-skills/skills/motion-showreel/scripts/lib/browser.mjs';
const root=process.cwd(),P='qa/v6/s18_b09';
const {server,port}=await serve(root);
const browser=await launch(await loadChromium(root));
const md5=b=>createHash('md5').update(b).digest('hex');
try{
 const page=await openPage(browser,{port,rel:'film/s18_b09_qa.html',w:1920,h:1080,dpr:1});
 const meta=await page.evaluate(()=>{
  const T=window.QA.clock.T,snap=t=>JSON.parse(JSON.stringify(window.QA.state(t)));
  const picks={s66_loop:T.frac(66,.8),s67_mid:T.frac(67,.24),s67_high:T.frac(67,.80),s68_compare:T.frac(68,.34),s68_end:T.end(68)};
  const states={}; for(const [k,t] of Object.entries(picks)) states[k]=snap(t);
  const measure={mid:window.QA.measure(picks.s67_mid),high:window.QA.measure(picks.s67_high)};
  return {duration:window.DUR,origin:window.QA.clock.origin,picks,states,measure,Z_HI:window.QA.Z_HI,Z_MID:window.QA.Z_MID,Z_END:window.QA.Z_END};
 });
 fs.mkdirSync(P+'/keyframes',{recursive:true});
 fs.mkdirSync(P+'/repeat',{recursive:true});
 const hashes={};
 for(const dir of ['keyframes','repeat']){
  for(const [name,t] of Object.entries(meta.picks)){
    await page.evaluate(t=>window.render(t),t);
    const buf=await page.screenshot({type:'png',clip:{x:0,y:0,width:1920,height:1080}});
    const file=`${P}/${dir}/${name}.png`;
    fs.writeFileSync(file,buf);
    (hashes[name]??=[]).push(md5(buf));
    console.log(dir,name,hashes[name].at(-1));
  }
 }
 fs.writeFileSync(P+'/frame_audit.json',JSON.stringify({duration:meta.duration,origin:meta.origin,picks:meta.picks,states:meta.states,measure:meta.measure,md5:hashes},null,2));
 const dur=meta.duration,FPS=30,TOTAL=Math.round(dur*FPS);
 console.log('video frames',TOTAL,'dur',dur);
 const ff=spawn('ffmpeg',['-v','error','-y','-f','image2pipe','-c:v','mjpeg','-framerate',String(FPS),'-i','-','-vf','setpts=N/(30*TB),scale=out_color_matrix=bt709:out_range=tv,format=yuv420p','-r','30','-c:v','libx264','-preset','medium','-crf','16','-threads','1','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709',P+'/S18.mp4'],{stdio:['pipe','inherit','inherit']});
 const closed=new Promise((res,rej)=>ff.on('close',c=>c?rej(new Error('ffmpeg '+c)):res()));
 for(let f=0;f<TOTAL;f++){
  const t=f/FPS;
  await page.evaluate(t=>window.render(t),t);
  const buf=await page.screenshot({type:'jpeg',quality:95,clip:{x:0,y:0,width:1920,height:1080}});
  if(!ff.stdin.write(buf)) await new Promise(r=>ff.stdin.once('drain',r));
  if(f%30===0) console.log('frame',f);
 }
 ff.stdin.end();
 await closed;
 console.log('video done');
 await page.close();
}finally{await browser.close();server.close();}
