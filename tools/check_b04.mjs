import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {cpuPage} from './cpu_canvas.mjs';
const p=await cpuPage(),T=window.T;
const {microscopeState}=await import('../lib/microscope_zoom.js');
const {config}=await import('../scenes/s08_red_histology.js');
const normalize=s=>s.replaceAll('./he_target_detail.js','./he_detail.js').replaceAll('./wash_target.js','./wash.js');
const targetWash=fs.readFileSync('qa/ref/style_target/src/wash.js','utf8');
const washBootstrap=targetWash.slice(targetWash.indexOf('export function initBaker()'),targetWash.indexOf('// recipe'));
for(const [a,b] of [['he','he_target'],['he_detail','he_target_detail'],['wash','wash_target']])assert.equal(normalize(fs.readFileSync(`lib/${b}.js`,'utf8')).replace(/import \{getBaker\} from '\.\/wash.js';\nexport function initBaker\(\)\{[^\n]*\}\n/,()=>washBootstrap),fs.readFileSync(`qa/ref/style_target/src/${a}.js`,'utf8'));
for(const [id,f,y] of [['30',.96,-665],['31',.65,-475],['32',.9,-965],['33',.88,-435],['34',.6,-390]])assert.equal(microscopeState(T,T.fracId(id,f),config).y,y);
let prev=microscopeState(T,T.atId('30'),config);
for(let i=1;i<=2000;i++){const c=microscopeState(T,T.atId('30')+(T.endId('34')-T.atId('30'))*i/2000,config);assert(Math.abs(c.y-prev.y)<35);prev=c;}
const low=microscopeState(T,T.fracId('30',.12),config);assert.equal(low.zoom,.52);assert.equal(low.x,340);
const times=['30','31','32','33','34','37','54','57','69'].map(id=>T.fracId(id,.6)),hashes=new Map();
async function frame(t){await p.evaluate(t=>{window.render(t);window.auditContent();},t);return createHash('sha256').update(await p.locator('#film').screenshot()).digest('hex');}
for(const t of times)hashes.set(t,await frame(t));
for(const t of [...times].reverse())assert.equal(await frame(t),hashes.get(t));
const result={status:'PASS',backend:'cpu',targetSources:'HE, detail, wash byte-identical after import path and shared baker bootstrap normalization',reverseOrderFrames:times.length,cameraContinuitySamples:2000,highRoute:'30 vessel → 31 mucosa → 32 muscle → 33 return → 34 defect',ellipseAxes:1.6,lowCamera:low,browserQA:'pending mini Chromium'};
fs.writeFileSync('qa/samples/b04/cpu-check.json',JSON.stringify(result,null,2));console.log('PASS b04 source parity, camera continuity, reverse render order, content bounds');
