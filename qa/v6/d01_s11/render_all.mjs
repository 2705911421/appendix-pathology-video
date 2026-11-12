import fs from 'node:fs';import {execFileSync as run} from 'node:child_process';
const P='qa/v6/d01_s11',tool='/workspace/garden-skills/skills/motion-showreel/scripts/render.mjs';
const rows=JSON.parse(fs.readFileSync('/workspace/病理科普视频/配音/全稿_v3/timeline.json')).lines,origin=rows.find(s=>s.n===37).start;
const at=(n,f)=>{const s=rows.find(s=>s.n===n);return s.start-origin+(s.end-s.start)*f;};
const picks=[{name:'s42_to_43',t:at(43,.1)},...[.25,.6,.95].map((f,i)=>({name:['s43_start','s43_middle','s43_end'][i],t:at(43,f)})),{name:'s44',t:at(44,.65)},{name:'s45_fibrin',t:at(45,.28)},{name:'s45_pus',t:at(45,.75)},{name:'s46',t:at(46,.85)}];
fs.writeFileSync(P+'/keyframes.json',JSON.stringify({origin,duration:at(46,1)+.8,picks},null,2));
function render(args){run('node',[tool,'film',...args],{stdio:'inherit'});}
render(['--q','scene=s11','--still',picks.map(p=>p.t.toFixed(6)).join(','),'--out',P+'/stills','--sheet']);
render(['--q','scene=s11','--determinism']);
render(['--q','scene=s11','--start','27.5','--duration','16','--determinism']);
const baseline=JSON.parse(fs.readFileSync('qa/v6/c03_s10/keyframes.json'));render(['--q','scene=s11','--still',baseline.picks.map(p=>p.t.toFixed(6)).join(','),'--out',P+'/s10_parity']);
const times=JSON.parse(fs.readFileSync('qa/v6/c03_s10/s08_times.json'));render(['--still',times.map(t=>t.toFixed(9)).join(','),'--out',P+'/s08_parity']);
render(['--q','scene=s11','--out',P+'/S10_S11.mp4','--crf','16','--fps','30','--workers','3']);
