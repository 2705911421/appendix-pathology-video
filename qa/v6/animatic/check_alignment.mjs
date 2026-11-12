import fs from 'node:fs';
import {subtitleState} from '../../../assembly/subtitle/subtitle.js';
const root=new URL('./',import.meta.url);
const {cues}=JSON.parse(fs.readFileSync(new URL('cues_real.json',root)));
const result=[1,31,34,50,77].map(n=>{
 const cue=cues[n-1];let frame=Math.floor(cue.start*30);
 while(true){const s=subtitleState(frame/30,cues);if(s?.id===cue.id&&s.cnA>0&&s.enA>0)break;frame++;}
 return {n,start:cue.start,firstVisibleFrame:frame,appears:frame/30,delta:frame/30-cue.start,snapshotDelta:0,previous:subtitleState((frame-1)/30,cues),state:subtitleState(frame/30,cues)};
});
fs.writeFileSync(new URL('alignment.json',root),JSON.stringify(result,null,2));console.log(result.map(({n,start,appears,delta})=>({n,start,appears,delta})));
