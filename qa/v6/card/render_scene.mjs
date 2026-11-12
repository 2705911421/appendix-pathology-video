import fs from 'node:fs';import {execFileSync as run} from 'node:child_process';
import {timing} from '../../../film/timing_snapshot.js';
const scene=process.argv[2];const ranges={s05:[20,22],s17:[63,65],s20:[71,74]};const [first,last]=ranges[scene];
const rows=timing.filter(s=>s.n>=first&&s.n<=last),origin=rows[0].start,duration=rows.at(-1).end-origin;
const P=`qa/v6/card/${scene.toUpperCase()}`;fs.mkdirSync(P,{recursive:true});
const picks=rows.flatMap(s=>(s.n===20?[.12,.45,.88]:s.n===22?[.2,.85]:[.3,.85]).map((f,i)=>({name:`s${s.n}_${i+1}`,t:s.start-origin+(s.end-s.start)*f})));
fs.writeFileSync(P+'/keyframes.json',JSON.stringify({origin,duration,rows,picks},null,2));
const tool='/workspace/garden-skills/skills/motion-showreel/scripts/render.mjs';
function render(args){run('node',[tool,'film','--q',`scene=${scene}`,...args],{stdio:'inherit'});}
if(!process.argv.includes('--video-only')){render(['--still',picks.map(p=>p.t.toFixed(6)).join(','),'--out',P+'/stills']);
for(const p of picks)fs.copyFileSync(`${P}/stills/t_${p.t.toFixed(2).padStart(6,'0')}.png`,`${P}/${p.name}.png`);
run('python3',['qa/v6/card/sheet.py',P],{stdio:'inherit'});
render(['--determinism']);}
render(['--out',P+`/${scene.toUpperCase()}_verified.mp4`,'--crf','16','--fps','30','--workers','1']);
fs.renameSync(P+`/${scene.toUpperCase()}_verified.mp4`,P+`/${scene.toUpperCase()}.mp4`);
run('ffmpeg',['-v','error','-y','-i',P+`/${scene.toUpperCase()}.mp4`,'-ss',String(origin),'-i','/workspace/病理科普视频/配音/全稿_v3/旁白_v3.wav','-map','0:v','-map','1:a','-vf','scale=1280:720','-c:v','libx264','-crf','16','-c:a','aac','-b:a','192k','-t',String(duration),'-movflags','+faststart',P+`/${scene.toUpperCase()}_带配音_720p.mp4`],{stdio:'inherit'});
