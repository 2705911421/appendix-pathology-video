import fs from 'node:fs';import {execFileSync as run} from 'node:child_process';import {timing} from '../../../film/timing_snapshot.js';
const P='qa/v6/e07_s19',tool='qa/v6/e04_s19/renderer/render.mjs',origin=timing.find(s=>s.n===69).start;
const at=(n,f)=>{const s=timing.find(s=>s.n===n);return s.start-origin+(s.end-s.start)*f;};
const picks=[{name:'s69_low',t:at(69,.1)},{name:'s69_middle',t:at(69,.65)},{name:'s69_fibrosis',t:at(69,.84)},{name:'s70_lymph',t:at(70,.4)},{name:'s70_plasma',t:at(70,.9)}];fs.writeFileSync(P+'/keyframes.json',JSON.stringify({origin,duration:at(70,1),picks},null,2));
function render(args){run('node',[tool,'film',...args],{stdio:'inherit'});}
render(['--q','scene=s19','--still',picks.map(p=>p.t.toFixed(6)).join(','),'--out',P+'/stills']);{const r=run('node',[tool,'film','--q','scene=s19','--determinism'],{encoding:'utf8'});fs.writeFileSync(P+'/determinism.log',r);process.stdout.write(r);}
for(const [scene,source] of [['s08','c03_s10'],['s10','c03_s10'],['s11','d01_s11']]){const times=scene==='s08'?JSON.parse(fs.readFileSync('qa/v6/c03_s10/s08_times.json')):JSON.parse(fs.readFileSync(`qa/v6/${source}/keyframes.json`)).picks.map(p=>p.t);render(['--q','scene='+scene,'--still',times.map(t=>t.toFixed(scene==='s08'?9:6)).join(','),'--out',P+'/'+scene+'_parity']);}
render(['--q','scene=s19','--out',P+'/S19_scene.mp4','--crf','16','--fps','30','--workers','1']);
