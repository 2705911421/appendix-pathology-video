import {C} from './lib/tokens.js';
import {loadTimeline} from './lib/timeline.js';
import {scenes} from './scenes/index.js';
import {drawSidebar} from './lib/sidebar.js';
import {drawSubtitles} from './lib/subtitle_bilingual.js';
import {resetBounds,bounds} from './lib/layout.js';
import {setDark} from './lib/ann.js';
import {setBoil} from './lib/ink.js';
window.READY=false;
const canvas=document.getElementById('film'),ctx=canvas.getContext('2d');
const content=document.createElement('canvas');content.width=1920;content.height=1080;const cc=content.getContext('2d',{willReadFrequently:true});
try {
 const get=async p=>{const r=await fetch(p);if(!r.ok)throw Error(`Missing ${p}`);return r.json();};
 const [script,manifest,evidence]=await Promise.all([get('./data/script.json'),get('./data/scene-manifest.json'),get('./data/evidence.json')]);
 const T=await loadTimeline(script);
 await Promise.all([document.fonts.load('500 68px MixSans'),document.fonts.load('700 52px MixSans'),...Object.values(scenes).map(s=>s.bake())]);await document.fonts.ready;
 window.DUR=T.duration;window.T=T;window.TIMELINE_STATUS='preview';window.manifest=manifest;
 window.render=t=>{
 const e=T.sentenceAt(t),row=script.sentences[Number(e.id)-1],m=manifest.find(m=>e.id>=m.from&&e.id<=m.to),s=scenes[m.id];
 resetBounds();cc.resetTransform();cc.clearRect(0,0,1920,1080);setBoil(null);setDark(false);
 cc.save();s.renderMain(cc);cc.restore();cc.save();s.renderAnnotations(cc);cc.restore();cc.save();drawSidebar(cc,s.sidebarState(),evidence);cc.restore();
 ctx.resetTransform();ctx.globalAlpha=1;ctx.fillStyle=C.paper;ctx.fillRect(0,0,1920,1080);ctx.drawImage(content,0,0);
 // Subtitle is the only layer allowed below y=810.
 if(m.implemented)drawSubtitles(ctx,row,Math.max(0,Math.min(.999,(t-e.start)/(e.end-e.start))));
 window.FRAME_INFO={scene:m.id,sentence:e.id,status:'preview',bounds:bounds.map(b=>({...b})),muscleNeutrophils:m.id==='S08'?5:undefined};
 return window.FRAME_INFO;
 };
 window.auditContent=()=>{const p=cc.getImageData(0,0,1920,1080).data;let minY=1080,maxY=-1,minX=1920,maxX=-1;for(let y=0;y<1080;y++)for(let x=0;x<1920;x++)if(p[(y*1920+x)*4+3]){minY=Math.min(minY,y);maxY=Math.max(maxY,y);minX=Math.min(minX,x);maxX=Math.max(maxX,x);}if(maxY>=810)throw Error(`Content pixels exceed safe region: ${maxY}`);return {minX,maxX,minY,maxY,pass:true};};
 window.render(T.fracId('04',.5));window.READY=true;
}catch(e){window.LOAD_ERROR=e.stack;console.error(e);throw e;}
