import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {withPage,canvasPng} from '../../../../assembly/pipeline/browser.mjs';
const root=process.cwd(), out=root+'/qa/v6/animatic/v2/';
const old=out+'baseline_subtitle';fs.mkdirSync(old,{recursive:true});
for(const f of ['subtitle.js','config.js','index.html'])fs.writeFileSync(old+'/'+f,execFileSync('git',['show','HEAD:assembly/subtitle/'+f]));
if (!fs.existsSync(old+'/fonts')) fs.symlinkSync(root+'/assembly/subtitle/fonts',old+'/fonts','dir');
const cues=JSON.parse(fs.readFileSync(out+'../cues_real.json')).cues;
const times=[1,50,220];
for(const [dir,prefix] of [[old,'v1'],[root+'/assembly/subtitle','v2']])await withPage(dir,'http://paper.local',async page=>{
 await page.evaluate(c=>{window.CUES=c;window.AUTO_THEME=true;},cues);
 for(const t of times)fs.writeFileSync(out+`paper_${prefix}_${t}.png`,await canvasPng(page,t,'overlay'));
});
