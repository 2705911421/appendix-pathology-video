import fs from 'node:fs';import {execFileSync as run} from 'node:child_process';import {createCanvas,Path2D} from '@napi-rs/canvas';
globalThis.Path2D=Path2D;globalThis.document={createElement:()=>createCanvas(1,1)};
const {forScene}=await import('../../../film/timeline.js');const clock=forScene(25,30,0),T=clock.T;
const P='qa/v6/h03_s07',tool='/workspace/garden-skills/skills/motion-showreel/scripts/render.mjs';
const picks=[['handoff_start',0],['handoff_mid',T.frac(25,.125)],['s25_fluid',T.frac(25,.8)],['s26_protein',T.frac(26,.8)],['s27_adhesion',T.frac(27,.26)],['s27_crossing',T.frac(27,.59)],['s27_exited',T.frac(27,.94)],['s28_defense',T.frac(28,.88)],['s29_injury',T.frac(29,.85)],['s30_exudation',T.frac(30,.88)]].map(([name,t])=>({name,t}));
fs.writeFileSync(P+'/keyframes.json',JSON.stringify({origin:clock.origin,duration:clock.duration,rows:clock.rows,picks},null,2));
const args=process.argv.slice(2);function render(a){run('node',[tool,'film','--q','scene=s07',...a],{stdio:'inherit'});}
if(args.includes('--video'))render(['--out',P+'/S07.mp4','--crf','16','--fps','30','--workers','1']);
else if(args.includes('--det'))render(['--determinism']);
else render(['--still',picks.map(p=>p.t.toFixed(6)).join(','),'--out',P+'/stills']);
