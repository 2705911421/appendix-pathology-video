import fs from 'node:fs';import {execFileSync as run} from 'node:child_process';import {createCanvas,Path2D} from '@napi-rs/canvas';
globalThis.Path2D=Path2D;globalThis.document={createElement:()=>createCanvas(1,1)};
const {forScene}=await import('../../../film/timeline.js');const clock=forScene(23,24,0),T=clock.T;
const P='qa/v6/h01_s06',tool='/workspace/garden-skills/skills/motion-showreel/scripts/render.mjs';
const picks=[['s23_start',T.frac(23,.03)],['s23_transition',T.frac(23,.42)],['s23_red',T.frac(23,.88)],['s24_anchor',T.frac(24,.25)],['s24_before',T.frac(24,.32)],['s24_after',T.frac(24,.88)]].map(([name,t])=>({name,t}));
fs.writeFileSync(P+'/keyframes.json',JSON.stringify({origin:clock.origin,duration:clock.duration,picks},null,2));
function render(args){run('node',[tool,'film',...args],{stdio:'inherit'});}
render(['--q','scene=s06','--still',picks.map(p=>p.t.toFixed(6)).join(','),'--out',P+'/stills']);
render(['--q','scene=s06','--determinism']);
render(['--q','scene=s06','--out',P+'/S06.mp4','--crf','16','--fps','30','--workers','1']);
