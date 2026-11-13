// Render b09_pus reference modes and compare vs b10 reference frames.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const tool='/workspace/garden-skills/skills/motion-showreel/scripts/render.mjs';
const run=(args)=>execFileSync('node',[tool,'film',...args],{stdio:'inherit'});
// Render s31-equivalent (faith=s31 → t=15, s08 high s31 camera)
run(['--q','scene=s10&faith=s31','--still','15','--out','qa/v6/s10s11_b09/faith']);
// Render s34-equivalent (faith=s34 → t=33)
run(['--q','scene=s10&faith=s34','--still','33','--out','qa/v6/s10s11_b09/faith']);
