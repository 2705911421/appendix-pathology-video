import fs from 'node:fs';
import {execFileSync as run} from 'node:child_process';
const P='qa/v6/s19_b09_fix01';
const tool='/workspace/garden-skills/skills/motion-showreel/scripts/render.mjs';
const rows=JSON.parse(fs.readFileSync(P+'/timing.json'));
const origin=rows[0].start,duration=rows.at(-1).end-origin;
const at=(n,f)=>{const s=rows.find(s=>s.n===n);return s.start-origin+(s.end-s.start)*f;};
const picks=[{name:'s69_overview',t:at(69,.1)},{name:'s69_fibrosis',t:at(69,.84)},{name:'s70_lymph',t:at(70,.4)},{name:'s70_plasma',t:at(70,.94)}];
fs.writeFileSync(P+'/keyframes.json',JSON.stringify({origin,duration,picks},null,2));
const events=[];
for(const [n,name,f] of [[69,'overview_start',0],[69,'push_start',.18],[69,'push_end',.64],[69,'fib_label_start',.65],[69,'fib_label_full',.78],[69,'fib_label_fade',.92],[69,'fib_label_end',1],[70,'sidebar_start',0],[70,'sidebar_full',.16],[70,'lymph_pan_start',.27],[70,'lymph_pan_end',.48],[70,'lymph_label_start',.28],[70,'lymph_label_full',.34],[70,'lymph_label_fade',.45],[70,'lymph_label_end',.49],[70,'oil_pan_start',.75],[70,'plasma_label_start',.77],[70,'plasma_label_full',.84],[70,'oil_pan_end',.87]])
  events.push({n,event:name,fraction:f,local:+at(n,f).toFixed(6),absolute:+(origin+at(n,f)).toFixed(6),timeline_s:+(origin+at(n,f)).toFixed(6),error_s:0});
fs.writeFileSync(P+'/events.json',JSON.stringify({origin,duration,events},null,2));
const render=args=>run('node',[tool,'film/s19_b09_qa.html','--workers','1',...args],{stdio:'inherit'});
const arg=process.argv[2]||'--stills';
if(arg==='--fidelity')render(['--q','mode=faithful','--still','0','--out',P+'/fidelity']);
else if(arg==='--video')render(['--out',P+'/S19.mp4','--fps','30','--crf','16']);
else if(arg==='--repeat')render(['--still',picks.map(p=>p.t.toFixed(6)).join(','),'--out',P+'/repeat']);
else render(['--still',picks.map(p=>p.t.toFixed(6)).join(','),'--out',P+'/stills']);
