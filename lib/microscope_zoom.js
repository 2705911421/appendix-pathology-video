// Shared physical slide coordinates; log zoom and eased stage moves use the legacy camera.
import {camAt} from './camera.js';
import {drawAcute,drawAcuteLandmarks,bakeAcute,polar} from './he_acute.js';
import {gangrene,prepareGangrene} from './he_target_detail.js';
import {bakeHE,drawHE,VESSELS} from './he_target.js';
import {bake,initBaker,drawWash} from './wash_target.js';
import {bakeTargetGangrene} from './he_target_bake.js';
import {label,leader,setDark} from './ann.js';
const L={x:900,y:475,r:445};
let baked=false;
export async function bakeMicroscope(){if(baked)return;baked=true;await initBaker();await bakeAcute();bakeTargetGangrene(bake);prepareGangrene(VESSELS);bakeHE((key,recipe,options)=>{bake(key,recipe,{...options,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});globalThis.brush.scaleBrushes(1/(options?.scale||2.4));});}
export function microscopeState(T,t,{from='31',path=[],mode,initial}={}){
 const configInitial=initial||{x:0,y:-470};
 const highZoom=mode==='gangrene'?1.5:2.15;
 const a=T.atId(from),lowEnd=T.fracId(from,.23),midStart=T.fracId(from,.42),midEnd=T.fracId(from,.60),high=T.fracId(from,.88);
 const keys=[[a,{x:340,y:-280,zoom:.52}],[lowEnd,{x:340,y:-280,zoom:.52}],[midStart,{x:0,y:-740,zoom:1.02}],[midEnd,{x:0,y:-740,zoom:1.02}],[high,{x:configInitial.x,y:configInitial.y,zoom:highZoom}]];
 for(const s of path){const start=T.fracId(s.id,s.fraction||0),end=T.fracId(s.id,s.arrive??.28);keys.push([start,{...keys.at(-1)[1]}],[end,{x:s.x||0,y:s.y,zoom:highZoom}]);}
 const cam=camAt(keys,t);return {...cam,level:t<midStart?'低倍':t<high?'中倍':'高倍',transition:t>lowEnd&&t<midStart||t>midEnd&&t<high,defocus:t>lowEnd&&t<midStart?.15*Math.sin(Math.PI*(t-lowEnd)/(midStart-lowEnd)):t>midEnd&&t<high?.15*Math.sin(Math.PI*(t-midEnd)/(high-midEnd)):0,keys};
}
export function drawMicroscope(c,{T,t},config){const cam=microscopeState(T,t,config);c.fillStyle='#111114';c.fillRect(0,0,1920,950);c.save();c.beginPath();c.arc(L.x,L.y,L.r,0,Math.PI*2);c.clip();c.translate(L.x,L.y);c.scale(cam.zoom,cam.zoom);c.translate(-cam.x,-cam.y);
 const metrics=drawAcute(c,{mode:config.mode,zoom:cam.zoom,focus:cam});
 if(cam.zoom>.65&&(config.mode==='gangrene'||config.mode==='suppurative')){
 c.save();c.globalAlpha*=Math.min(1,(cam.zoom-.65)/.25);c.translate(0,-772);c.scale(1,-1.04);
 drawHE(c,{detail:1,necrosis:config.mode==='gangrene'?1:0,neut:1,fibrin:1,ulcer:1,t:0,ox:cam.x,oy:-(cam.y+772)/1.04,vr:445/cam.zoom});
 if(config.mode==='gangrene'){
 // Dark infarct bed uses the target chapter's thrombosis pigment, beneath its debris and blood.
 for(const [x,y,size,alpha] of [[-140,-40,1500,.5],[230,30,1450,.55],[30,180,1300,.45]])drawWash(c,'c04.thromb',x,y,size,{alpha,grow:.999,soft:.85,blend:'multiply'});
 gangrene(c,{kv:1,kn:1,ko:config.perforation&&t>=T.atId(config.perforation)?1:0,kp:config.perforation&&t>=T.atId(config.perforation)?Math.min(1,(t-T.atId(config.perforation))/(T.fracId(config.perforation,.5)-T.atId(config.perforation))):0});}c.restore();drawAcuteLandmarks(c,{zoom:cam.zoom,focus:cam});}


 if(cam.zoom<.65){c.strokeStyle='#D6453A';c.lineWidth=1.6/cam.zoom;c.strokeRect(-210,-1150,420,800);}
 c.restore();if(cam.defocus>0){c.save();c.fillStyle=`rgba(246,238,240,${cam.defocus})`;c.beginPath();c.arc(L.x,L.y,L.r,0,Math.PI*2);c.fill();c.restore();}c.strokeStyle='#EFE8DC';c.lineWidth=5;c.beginPath();c.arc(L.x,L.y,L.r,0,Math.PI*2);c.stroke();c.lineWidth=1.5;c.beginPath();c.arc(L.x,L.y,L.r+8,0,Math.PI*2);c.stroke();
 setDark(1);label(c,cam.level,85,110,{size:40,w:700});label(c,'HE 染色 · 阑尾横断面',85,166,{size:26});
 const stations=config.path||[];const station=stations.filter(s=>t>=T.fracId(s.id,s.arrive??.28)).at(-1);const text=cam.level==='低倍'?'定位：斜切管腔与部分管壁':cam.level==='中倍'?'层次：黏膜至浆膜':station?.label||(config.initial?'黏膜下层：血管游出':'黏膜固有层：中性粒细胞');
 label(c,text,1395,cam.level==='中倍'?870:180,{size:28,halo:true});
 if(cam.level==='中倍')for(const [s,r] of [['黏膜',460],['黏膜肌层',546],['黏膜下层',680],['内环肌',900],['外纵肌',1040],['浆膜',1135]]){const y=L.y+(-r-cam.y)*cam.zoom;const anchor=s==='黏膜肌层'?polar(0,546):[280/cam.zoom,-r];const ay=L.y+(anchor[1]-cam.y)*cam.zoom;leader(c,[L.x+(anchor[0]-cam.x)*cam.zoom,ay],[1390,y],[1450,y],{endDot:false});label(c,s,1460,y,{size:26});}
 else if(cam.level==='高倍'){const target=config.initial?(t>=T.atId('34')?[0,-390]:t>=T.atId('33')?polar(.15,426):[cam.x,cam.y]):[cam.x+90/cam.zoom,cam.y];leader(c,[L.x+(target[0]-cam.x)*cam.zoom,L.y+(target[1]-cam.y)*cam.zoom],[1380,320],[1450,320],{elbow:true,endDot:false});}
 if(config.initial&&cam.level!=='高倍')label(c,'浆膜：干净、轻度充血',1395,cam.level==='中倍'?920:235,{size:26});
 setDark(false);return {...cam,metrics};
}
export function microscopeScene(config,notes={}){return {bake:bakeMicroscope,renderMain:(c,state)=>drawMicroscope(c,state,config),renderAnnotations:()=>{},sidebarState:()=>({notes,...(config.initial?{dark:true,position:{x:1395,y:520,w:440}}:{})}),exitState:()=>({state:'slide',config})};}
