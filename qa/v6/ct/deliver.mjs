import fs from 'node:fs';import {execFileSync as run} from 'node:child_process';
const scene=process.argv[2],ranges={S09:[35,36],S12:[47,48],S15:[58,59],S04:[14,19]},[first,last]=ranges[scene],P=`qa/v6/ct/${scene}`;
const rows=JSON.parse(fs.readFileSync('/workspace/病理科普视频/配音/全稿_v3/timeline.json')).lines.filter(s=>s.n>=first&&s.n<=last),origin=rows[0].start,duration=rows.at(-1).end-origin;
fs.mkdirSync(P,{recursive:true});const picks=rows.flatMap(s=>(scene==='S04'?(s.n===14?[.12,.8]:[16,17].includes(s.n)?[.3,.82]:[.72]):[.3,.82]).map(f=>({name:`s${s.n}_${Math.round(f*100)}`,t:s.start-origin+(s.end-s.start)*f})));
fs.writeFileSync(`${P}/keyframes.json`,JSON.stringify({origin,duration,picks},null,2));
const tool='/workspace/garden-skills/skills/motion-showreel/scripts/render.mjs';
function render(args){run('node',[tool,'film','--q',`scene=${scene.toLowerCase()}`,...args],{stdio:'inherit'});}
render(['--still',picks.map(p=>p.t.toFixed(6)).join(','),'--out',P+'/stills']);render(['--determinism']);
run('python3',['qa/v6/ct/review.py',scene],{stdio:'inherit'});
render(['--out',`${P}/${scene}.mp4`,'--fps','30','--workers','1','--crf','16']);
run('ffmpeg',['-y','-i',`${P}/${scene}.mp4`,'-ss',String(origin),'-t',String(duration),'-i','/workspace/病理科普视频/配音/全稿_v3/旁白_v3.wav','-map','0:v:0','-map','1:a:0','-vf','scale=1280:720','-c:v','libx264','-crf','16','-c:a','aac','-b:a','192k','-shortest',`${P}/${scene}_带配音_720p.mp4`],{stdio:'inherit'});
run('python3',['qa/v6/ct/check.py',scene],{stdio:'inherit'});
