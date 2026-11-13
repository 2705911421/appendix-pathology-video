import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {rng} from '../../../film/lib/motion.js';
const point=(a,r)=>{const u=Math.cos(a)*r*1.5,v=Math.sin(a)*r;return [u*Math.cos(.3)-v*Math.sin(.3),u*Math.sin(.3)+v*Math.cos(.3)];},focus={fib:point(-1.58,688),lymph:point(-1.72,650),plasma:point(-1.08,665)};
const results={};for(const version of ['e09','e10']){
const s=version==='e10'?fs.readFileSync('film/lib_ext/he_chronic.js','utf8'):execFileSync('git',['show','HEAD:film/lib_ext/he_chronic.js'],{encoding:'utf8'}),fn=s.slice(s.indexOf('function buildCells()'),s.indexOf('export function prepareChronic'));
const cells=new Function('rng','focus','point','TAU',fn+'; return buildCells();')(rng,focus,point,Math.PI*2);results[version]={focus,cells};
}fs.writeFileSync('qa/v6/e10_s19/cell_geometry.json',JSON.stringify(results,null,2));
