import {C} from './lib/tokens.js';
import {loadTimeline} from './lib/timeline.js';
import {scenes} from './scenes/index.js';
import {initBaker} from './lib/wash.js';
import {bakeNotes} from './lib/notes.js';
import {drawNotes} from './lib/notes.js';
import {grid} from './lib/ink.js';
import {moodAt} from './lib/mood.js';
import {drawSubtitles} from './lib/subtitle_bilingual.js';
import {resetBounds,bounds} from './lib/layout.js';
import {setDark} from './lib/ann.js';
import {setBoil} from './lib/ink.js';
window.READY=false;
const canvas=document.getElementById('film'),ctx=canvas.getContext('2d');
const content=document.createElement('canvas');content.width=1920;content.height=1080;const cc=content.getContext('2d',{willReadFrequently:true});
const handoff=document.createElement('canvas');handoff.width=1920;handoff.height=1080;const hc=handoff.getContext('2d');
try {
 const get=async p=>{const r=await fetch(p);if(!r.ok)throw Error(`Missing ${p}`);return r.json();};
 const [script,manifest,evidence]=await Promise.all([get('./data/script.json'),get('./data/scene-manifest.json'),get('./data/evidence.json')]);
 const T=await loadTimeline(script);
 await initBaker();bakeNotes();
 await Promise.all([document.fonts.load('500 68px MixSans'),document.fonts.load('700 52px MixSans'),...Object.values(scenes).map(s=>s.bake())]);await document.fonts.ready;
 window.DUR=T.duration;window.T=T;window.TIMELINE_STATUS='preview';window.manifest=manifest;
 window.render=t=>{
 const e=T.sentenceAt(t),row=script.sentences[Number(e.id)-1],m=manifest.find(m=>e.id>=m.from&&e.id<=m.to),s=scenes[m.id];
 resetBounds();cc.resetTransform();cc.clearRect(0,0,1920,1080);setBoil(null);setDark(false);
 cc.save();cc.beginPath();cc.rect(0,0,1920,950);cc.clip();const sceneMetrics=s.renderMain(cc,{t,T,id:e.id,fraction:(t-e.start)/(e.end-e.start)});cc.restore();cc.save();s.renderAnnotations(cc,{t,T,id:e.id});cc.restore();cc.save();drawNotes(cc,s.sidebarState(),{id:e.id,fraction:(t-e.start)/(e.end-e.start)});cc.restore();
 // Freeze the previous scene at its last spoken frame for the handoff.
 const sceneIndex=manifest.indexOf(m),handoffEnd=T.fracId(m.from,.08);
 if(sceneIndex>0&&t<handoffEnd){hc.clearRect(0,0,1920,1080);hc.drawImage(content,0,0);cc.clearRect(0,0,1920,1080);const pm=manifest[sceneIndex-1],pt=T.endId(pm.to)-.001,ps=scenes[pm.id],pe=T.sentenceAt(pt),pf=(pt-pe.start)/(pe.end-pe.start);cc.save();cc.beginPath();cc.rect(0,0,1920,950);cc.clip();ps.renderMain(cc,{t:pt,T,id:pe.id,fraction:pf});ps.renderAnnotations(cc,{t:pt,T,id:pe.id});drawNotes(cc,ps.sidebarState(),{id:pe.id,fraction:pf});cc.restore();cc.save();const k=Math.max(0,Math.min(1,(t-T.atId(m.from))/(handoffEnd-T.atId(m.from))));cc.globalAlpha=k*k*(3-2*k);cc.drawImage(handoff,0,0);cc.restore();}
 ctx.resetTransform();ctx.globalAlpha=1;ctx.fillStyle=moodAt(t,{at:i=>T.atId(String(Math.min(77,i+1)).padStart(2,'0')),end:i=>T.endId(String(Math.min(77,i+1)).padStart(2,'0')),frac:(i,f)=>T.fracId(String(i+1).padStart(2,'0'),f),DUR_CONTENT:T.duration}).paper;ctx.fillRect(0,0,1920,1080);grid(ctx,0,0,1920,1080,48);ctx.drawImage(content,0,0);
 // Subtitle is the only layer allowed below y=950.
 if(m.implemented)drawSubtitles(ctx,row,Math.max(0,Math.min(.999,(t-e.start)/(e.end-e.start))));
 window.FRAME_INFO={scene:m.id,sentence:e.id,status:'preview',bounds:bounds.map(b=>({...b})),sceneMetrics,muscleNeutrophils:m.id==='S08'?5:undefined};
 return window.FRAME_INFO;
 };
 window.renderCrop=({t,x,y,w,h,scale=2})=>{const e=T.sentenceAt(t),m=manifest.find(m=>e.id>=m.from&&e.id<=m.to),s=scenes[m.id];const cv=document.createElement('canvas');cv.width=w*scale;cv.height=h*scale;const rc=cv.getContext('2d');rc.fillStyle='#F6EEF0';rc.fillRect(0,0,cv.width,cv.height);rc.scale(scale,scale);rc.translate(-x,-y);s.renderMain(rc,{t,T,id:e.id,fraction:(t-e.start)/(e.end-e.start)});return cv.toDataURL().split(',')[1];};
 window.auditContent=()=>{const p=cc.getImageData(0,0,1920,1080).data;let minY=1080,maxY=-1,minX=1920,maxX=-1;for(let y=0;y<1080;y++)for(let x=0;x<1920;x++)if(p[(y*1920+x)*4+3]){minY=Math.min(minY,y);maxY=Math.max(maxY,y);minX=Math.min(minX,x);maxX=Math.max(maxX,x);}if(maxY>=950)throw Error(`Content pixels exceed safe region: ${maxY}`);return {minX,maxX,minY,maxY,pass:true};};
 window.render(T.fracId('04',.5));window.READY=true;
}catch(e){window.LOAD_ERROR=e.stack;console.error(e);throw e;}
