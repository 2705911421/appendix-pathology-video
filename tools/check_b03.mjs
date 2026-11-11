import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {cpuPage} from './cpu_canvas.mjs';
const p=await cpuPage(),T=window.T;
const {microscopeState}=await import('../lib/microscope_zoom.js');
const {config}=await import('../scenes/s08_red_histology.js');
const old=JSON.parse(fs.readFileSync('qa/samples/旧库校验.json'));
for(const n of Object.keys(old))assert.deepEqual(fs.readFileSync(`lib/${n}.js`),fs.readFileSync(`/workspace/病理科普视频/v4_mix/film/lib/${n}.js`));
for(const [id,f,y] of [['30',.96,-665],['31',.65,-475],['32',.9,-965],['33',.88,-435],['34',.6,-390]])assert.equal(microscopeState(T,T.fracId(id,f),config).y,y);
const before=microscopeState(T,T.endId('30')-1e-6,config),after=microscopeState(T,T.atId('31'),config);
assert(Math.abs(before.y-after.y)<1e-5&&before.zoom===after.zoom);
let previous=microscopeState(T,T.atId('30'),config);
for(let i=1;i<=2000;i++){const cam=microscopeState(T,T.atId('30')+(T.endId('34')-T.atId('30'))*i/2000,config);assert(Math.abs(cam.y-previous.y)<35);previous=cam;}
const times=[T.fracId('30',.12),T.fracId('30',.5),T.fracId('30',.96),...['31','32','33','34'].map(id=>T.fracId(id,.9)),T.endId('30')-.001,T.atId('31')];
const hashes=new Map();const hash=b=>createHash('sha256').update(b).digest('hex');
async function frame(t){await p.evaluate(t=>{window.render(t);window.auditContent();},t);return hash(await p.locator('#film').screenshot());}
for(const t of times)hashes.set(t,await frame(t));
for(const t of [...times].reverse())assert.equal(await frame(t),hashes.get(t));
// Observe actual text operations at fade-out: each line is filled once, never stroked.
const {drawNotes}=await import('../lib/notes.js');const {sidebarState}=await import('../scenes/s08_red_histology.js');
const c=document.createElement('canvas').getContext('2d'),filled=[],stroked=[];
c.fillText=(s)=>filled.push(s);c.strokeText=(s)=>stroked.push(s);
drawNotes(c,sidebarState(),{id:'31',fraction:.95});assert.equal(filled.length,2);assert.equal(stroked.length,0);
const result={status:'PASS',backend:'cpu',legacyLibraries:Object.keys(old).length,reverseOrderFrames:times.length,cameraContinuitySamples:2000,handoff:'continuous at sentence 31',noteFade:'one fill per line, no stroke',browserQA:'pending mini Chromium'};
fs.writeFileSync('qa/samples/b03/cpu-check.json',JSON.stringify(result,null,2));console.log(result);
