import {cpuPage} from './cpu_canvas.mjs';
import {createHash} from 'node:crypto';
const p=await cpuPage();const times=await p.evaluate(()=>[T.fracId('04',.5),T.fracId('34',.5)]);const out=[];
for(const t of times){await p.evaluate(t=>window.render(t),t);out.push(createHash('sha256').update(await p.locator('#film').screenshot()).digest('hex'));}
console.log(JSON.stringify(out));
