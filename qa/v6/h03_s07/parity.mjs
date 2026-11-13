import fs from 'node:fs';import {execFileSync as run} from 'node:child_process';
const P='qa/v6/h03_s07';
for(const [scene,source] of [['s08','c03_s10'],['s10','c03_s10'],['s11','d01_s11'],['s19','e02_s19'],['s14','f03_s14'],['s06','h04_s06']]){
 const times=scene==='s08'?JSON.parse(fs.readFileSync('qa/v6/c03_s10/s08_times.json')):JSON.parse(fs.readFileSync(`qa/v6/${source}/keyframes.json`)).picks.map(p=>p.t);
 if(process.argv.includes('--resume') && times.every(t=>fs.existsSync(`${P}/${scene}_parity/t_${t.toFixed(2).padStart(6,'0')}.png`)))continue;
 run('node',['/workspace/garden-skills/skills/motion-showreel/scripts/render.mjs','film','--q','scene='+scene,'--still',times.map(t=>t.toFixed(scene==='s08'?9:6)).join(','),'--out',P+'/'+scene+'_parity'],{stdio:'inherit'});
}
