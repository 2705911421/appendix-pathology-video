import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const all=JSON.parse(fs.readFileSync('/workspace/病理科普视频/配音/全稿_v3/timeline.json')).lines;
const rows=all.filter(s=>s.n>=37&&s.n<=42),origin=rows[0].start;
const picks=[{name:'s37_open_low',t:.35},{name:'low_to_mid',t:((rows[0].end-origin)*.7+(rows[1].start-origin+(rows[1].end-rows[1].start)*.28))/2},...rows.map(s=>({name:'s'+s.n,t:(s.start+s.end)/2-origin}))];
fs.writeFileSync('qa/v6/c01_s10/keyframes.json',JSON.stringify({origin,duration:rows.at(-1).end-origin+.8,picks},null,2));
const tool='/workspace/garden-skills/skills/motion-showreel/scripts/render.mjs';
execFileSync('node',[tool,'film','--q','scene=s10','--still',picks.map(p=>p.t.toFixed(6)).join(','),'--out','qa/v6/c01_s10/stills','--sheet'],{stdio:'inherit'});
execFileSync('node',[tool,'film','--q','scene=s10','--determinism'],{stdio:'inherit'});
// Map the approved seven legacy states back onto the real S08 sentence clock.
const s08=all.filter(s=>s.n>=29&&s.n<=34),o=s08[0].start;
const times=[1,3.8,9,15,21,27,33].map(t=>{const i=Math.floor(t/6),f=(t-i*6)/6;return s08[i].start-o+f*(s08[i].end-s08[i].start);});
fs.writeFileSync('qa/v6/c01_s10/s08_times.json',JSON.stringify(times));
execFileSync('node',[tool,'film','--still',times.map(t=>t.toFixed(9)).join(','),'--out','qa/v6/c01_s10/s08_parity'],{stdio:'inherit'});
execFileSync('node',[tool,'film','--q','scene=s10','--out','qa/v6/c01_s10/S10.mp4','--fps','30','--workers','3'],{stdio:'inherit'});
