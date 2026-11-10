import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createTimeline} from '../lib/timeline.js';
import {cpuPage} from './cpu_canvas.mjs';
import {measureSidebar,paginateSidebar} from '../lib/sidebar.js';
import {drawSubtitles} from '../lib/subtitle_bilingual.js';
const script=JSON.parse(fs.readFileSync(new URL('../data/script.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('../data/timeline.preview.json',import.meta.url)));
const T=createTimeline(script,data);assert.equal(T.atId('01'),0);assert.equal(T.fracId('77',1),T.endId('77'));assert.throws(()=>T.atId(1));
for(const mutate of [d=>d.sentences.pop(),d=>d.sentences[1].id='01',d=>d.sentences[2].start=-1,d=>d.sentences[2].end=d.sentences[2].start,d=>d.sentences[2].zh+='改',d=>d.sentences[3].start=0]){const bad=structuredClone(data);mutate(bad);assert.throws(()=>createTimeline(script,bad));}
await cpuPage();const c=document.createElement('canvas').getContext('2d');
for(const type of ['definition','path','research','compare','timing','source']){const s={heading:'层次说明',card:{type,text:'黏膜与黏膜下层\n中性粒细胞主要在此',evidenceKey:'approved'}};assert.ok(measureSidebar(c,s,{approved:{values:[]}}).bottom<=770);}
assert.throws(()=>measureSidebar(c,{card:{type:'research',text:'95%'}}));
assert.throws(()=>measureSidebar(c,{card:{type:'research',text:'99%',evidenceKey:'e'}},{e:{values:['95%']}}));
const long={heading:'化脓性\n（蜂窝织炎性）\n阑尾炎',card:{type:'definition',text:'黏膜及黏膜下层\n'.repeat(20)}};
const pages=paginateSidebar(c,long);assert.ok(pages.length>1);pages.forEach(p=>assert.ok(measureSidebar(c,p).bottom<=770));
for(const row of script.sentences)for(let i=0;i<row.englishCards.length;i++)drawSubtitles(c,row,(i+.25)/row.englishCards.length);
console.log('PASS: timeline validation, all six sidebar types, continuation cards, evidence gate, all 136 English cards and 77 Chinese subtitles');

const {drawFigure,drawInsitu,painPt}=await import('../lib/figure.js');
const {iconHospital,iconThermo}=await import('../lib/icons.js');
assert.throws(()=>drawFigure(c));drawFigure(c,{viewport:{x:700,y:60,w:500,h:700}});drawInsitu(c,{viewport:{x:700,y:60,w:500,h:700}});assert.ok(painPt(.5)[1]<1000);
iconHospital(c,1100,400);iconThermo(c,1300,400);
console.log('PASS migrated figure viewport adapters and clinical icons');
