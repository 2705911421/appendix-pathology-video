// Cross-platform equivalent of blind_review.sh; no shell or Python required.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { ffmpegPath, ffprobePath } from '../../tools/bin.mjs';
async function run(binary,args){
  return new Promise((resolve,reject)=>{
    const p=spawn(binary,args,{stdio:['ignore','pipe','pipe']});let out='',err='';
    p.stdout.on('data',d=>{out+=d;});p.stderr.on('data',d=>{err+=d;});p.on('error',reject);
    p.on('close',code=>code===0?resolve(out):reject(Error(err)));
  });
}
async function main(){
  const [input,output,probeFile,stringsFile,...files]=process.argv.slice(2);
  if(!stringsFile)throw Error('用法：node blind_review.mjs 输入 输出 探测报告 字符串报告 [待扫描文件...]');
  const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'pathology-blind-'));
  try{
    const encoded=path.join(tmp,'blind.mp4');
    await run(await ffmpegPath(),['-y','-hide_banner','-loglevel','error','-i',input,'-map','0:v:0','-map','0:a:0?','-map_metadata','-1','-fflags','+bitexact','-flags:v','+bitexact','-flags:a','+bitexact','-c:v','libx264','-pix_fmt','yuv420p','-preset','veryfast','-crf','16','-bf','0','-g','30','-bsf:v','filter_units=remove_types=6','-c:a','aac','-b:a','160k','-ar','48000','-ac','2','-movflags','+faststart',encoded]);
    const data=await fs.readFile(encoded);let count=0;
    for(let i=0;(i=data.indexOf('avc1',i))!==-1;i+=4){
      if(i+10<=data.length&&data.subarray(i+4,i+10).every(b=>b===0)&&i+78<=data.length){data.fill(0,i+46,i+78);count++;}
    }
    if(!count)throw Error('未找到 avc1 视频样本描述');
    await fs.writeFile(output,data);
    const text=(await run(await ffprobePath(),['-hide_banner','-show_format','-show_streams',output])).split('\n').filter(l=>!l.startsWith('DISPOSITION:')).join('\n');
    const needles=['encoder','lavf','lavc','libx264','libfdk','handbrake','author','artist','title','comment','description','copyright','三峡','Sharpton','Gisele','导师','指导','x264'];
    const hits=needles.flatMap(n=>{const line=text.split('\n').find(l=>l.toLowerCase().includes(n.toLowerCase()));return line?[line]:[];});
    const probePass=text.includes('codec_name=')&&!hits.length;
    // ffprobe's filename field is diagnostic; store only a portable basename.
    await fs.writeFile(probeFile,text.replace(/^filename=.*$/m,'filename='+path.basename(output))+`\nRESULT: ${probePass?'PASS':'FAIL'}\n`+hits.map(h=>'HIT: '+h).join('\n'));
    const patterns=['三峡','Sharpton','Gisele','导师','指导'];const stringHits=[];let pending='not checked';
    for(const file of files){
      let raw;try{raw=await fs.readFile(file,'utf8');}catch{stringHits.push('MISSING '+path.basename(file));continue;}
      if(path.basename(file)==='endcard.json')pending=raw.includes('【待填】')?'yes':'NO — file was changed';
      raw.split('\n').forEach((line,i)=>{for(const p of patterns)if(line.includes(p))stringHits.push(`${path.basename(file)}:${i+1}: ${p}: ${line.trim().replaceAll('\t',' ').slice(0,200)}`);});
    }
    await fs.writeFile(stringsFile,`patterns: ${patterns.join(', ')}\nfiles:\n${files.map(f=>'  '+path.basename(f)).join('\n')}\n待填 in endcard.json: ${pending}\nhits: ${stringHits.length}\n${stringHits.join('\n')}\nRESULT: ${stringHits.length?'FAIL':'PASS'}\n`);
    if(!probePass||stringHits.length)throw Error('盲审失败，请查看探测和字符串报告');
    console.log('盲审通过');
  }finally{await fs.rm(tmp,{recursive:true,force:true});}
}
await main().catch(e=>{console.error(e.message);process.exitCode=1;});
