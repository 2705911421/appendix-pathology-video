import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createTimeline} from '../lib/timeline.js';
import {cpuPage} from './cpu_canvas.mjs';
const script=JSON.parse(fs.readFileSync(new URL('../data/script.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('../data/timeline.preview.json',import.meta.url)));
const T=createTimeline(script,data);assert.equal(T.atId('01'),0);assert.equal(T.fracId('77',1),T.endId('77'));assert.throws(()=>T.atId(1));
for(const mutate of [d=>d.sentences.pop(),d=>d.sentences[1].id='01',d=>d.sentences[2].start=-1,d=>d.sentences[2].end=d.sentences[2].start,d=>d.sentences[2].zh+='改',d=>d.sentences[3].start=0]){const bad=structuredClone(data);mutate(bad);assert.throws(()=>createTimeline(script,bad));}
const files=JSON.parse(fs.readFileSync(new URL('../qa/samples/旧库校验.json',import.meta.url)));
for(const n of Object.keys(files)){assert.deepEqual(fs.readFileSync(new URL('../lib/'+n+'.js',import.meta.url)),fs.readFileSync('/workspace/病理科普视频/v4_mix/film/lib/'+n+'.js'));}
const p=await cpuPage();
const {microscopeState}=await import('../lib/microscope_zoom.js');
const {config}=await import('../scenes/s08_red_histology.js');
for(const [id,fraction,y] of [['30',.96,-665],['31',.65,-475],['32',.9,-965],['33',.88,-435],['34',.5,-390]])assert.equal(microscopeState(T,T.fracId(id,fraction),config).y,y);
const {drawSubtitles}=await import('../lib/subtitle_bilingual.js');
const c=document.createElement('canvas').getContext('2d');for(const row of script.sentences)drawSubtitles(c,row,.5);
for(const id of ['31','32','33','34','37','38','39','40','41','42','54','55','56','57','69','70'])for(const f of [.01,.15,.5,.85,.99])await p.evaluate(({id,f})=>{window.render(T.fracId(id,f));window.auditContent();},{id,f});
console.log('PASS: original libraries byte-identical; timeline validation; all bilingual sentences; stage stops; microscopy content safe area');
