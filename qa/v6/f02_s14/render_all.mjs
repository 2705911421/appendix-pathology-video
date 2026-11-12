import fs from 'node:fs';import {execFileSync as run} from 'node:child_process';import {timing} from '../../../film/timing_snapshot.js';
const P='qa/v6/f02_s14',tool='/workspace/garden-skills/skills/motion-showreel/scripts/render.mjs',origin=timing.find(s=>s.n===54).start;
const at=(n,f)=>{const s=timing.find(s=>s.n===n);return s.start-origin+(s.end-s.start)*f;};
const picks=[{name:'s54_low',t:at(54,.12)},{name:'s54_middle',t:at(54,.82)},{name:'s55',t:at(55,.7)},{name:'s56',t:at(56,.7)},{name:'s57',t:at(57,.84)}];fs.writeFileSync(P+'/keyframes.json',JSON.stringify({origin,duration:at(57,1),picks},null,2));
function render(args){for(let attempt=0;;attempt++){try{run('node',[tool,'film',...args],{stdio:'inherit'});return;}catch(e){if(attempt>=2)throw e;console.log('Retrying renderer after transient failure',attempt+1);}}}
if(!process.argv.includes('--resume-checks'))render(['--q','scene=s14','--still',picks.map(p=>p.t.toFixed(6)).join(','),'--out',P+'/stills']);if(!process.argv.includes('--resume-checks'))render(['--q','scene=s14','--determinism']);
for(const [scene,source] of [['s08','c03_s10'],['s10','c03_s10'],['s11','d01_s11'],['s19','e02_s19']]){const times=scene==='s08'?JSON.parse(fs.readFileSync('qa/v6/c03_s10/s08_times.json')):JSON.parse(fs.readFileSync(`qa/v6/${source}/keyframes.json`)).picks.map(p=>p.t);render(['--q','scene='+scene,'--still',times.map(t=>t.toFixed(scene==='s08'?9:6)).join(','),'--out',P+'/'+scene+'_parity']);}
render(['--q','scene=s14','--out',P+'/S14.mp4','--crf','16','--fps','30','--workers','3']);
