import fs from 'node:fs';import {execFileSync as run} from 'node:child_process';import {createCanvas,loadImage,GlobalFonts,Path2D} from '@napi-rs/canvas';
globalThis.Path2D=Path2D;globalThis.document={createElement:()=>createCanvas(1,1)};
const scene=process.argv[2]||'s02';const ranges={s02:[6,10],s03:[11,13],s16:[60,62]};
const {forScene}=await import('../../../film/timeline.js');const clock=forScene(...ranges[scene],0),T=clock.T;
const P=`qa/v6/clin/${scene.toUpperCase()}`;fs.mkdirSync(P,{recursive:true});
const picks=clock.rows.flatMap(r=>[.22,.86].map(f=>({name:`s${String(r.n).padStart(2,'0')}_${f===.22?'early':'late'}`,t:T.frac(r.n,f)})));

picks.sort((a,b)=>a.t-b.t);
fs.writeFileSync(P+'/keyframes.json',JSON.stringify({source:'/workspace/病理科普视频/配音/全稿_v3/timeline.json',origin:clock.origin,duration:clock.duration,rows:clock.rows,picks},null,2));
const tool='/workspace/garden-skills/skills/motion-showreel/scripts/render.mjs';
function render(args){if(process.env.REUSE==='1')return;run('node',[tool,'film','--q',`scene=${scene}`,...args],{stdio:'inherit'});}
render(['--still',picks.map(p=>p.t.toFixed(6)).join(','),'--out',P+'/stills']);
const files=fs.readdirSync(P+'/stills').filter(s=>s.endsWith('.png')).sort();
const sheet=createCanvas(960,Math.ceil(picks.length/2)*300),sc=sheet.getContext('2d');sc.fillStyle='#F4EFE6';sc.fillRect(0,0,sheet.width,sheet.height);
for(let i=0;i<files.length;i++){const img=await loadImage(P+'/stills/'+files[i]);const path=P+'/'+picks[i].name+'.png';fs.copyFileSync(P+'/stills/'+files[i],path);const crop=createCanvas(1200,1000),cc=crop.getContext('2d');const id=Number(picks[i].name.slice(1,3));const cropX=scene==='s02'?(id===8?1290:id===9?1220:1150):scene==='s03'?(id===11?760:1200):(id===62?760:1100);cc.drawImage(img,cropX,190,600,500,0,0,1200,1000);fs.writeFileSync(P+'/'+picks[i].name+'_200pct.png',crop.toBuffer('image/png'));if(scene==='s02'&&id===6){const hand=createCanvas(1200,1000),hc=hand.getContext('2d');hc.drawImage(img,760,190,600,500,0,0,1200,1000);fs.writeFileSync(P+'/'+picks[i].name+'_hand_200pct.png',hand.toBuffer('image/png'));}sc.drawImage(img,(i%2)*480,Math.floor(i/2)*300,480,270);sc.fillStyle='#2A2A35';sc.font='20px sans-serif';sc.fillText(picks[i].name,(i%2)*480+15,Math.floor(i/2)*300+292);}
fs.writeFileSync(P+'/review_sheet.png',sheet.toBuffer('image/png'));
render(['--determinism']);
if(process.env.STILLS_ONLY!=='1'){
render(['--out',P+'/'+scene.toUpperCase()+'.mp4','--crf','16','--fps','30','--workers','1']);
if(process.env.REUSE!=='1')run('ffmpeg',['-y','-i',P+'/'+scene.toUpperCase()+'.mp4','-ss',String(clock.origin),'-i','/workspace/病理科普视频/配音/全稿_v3/旁白_v3.wav','-map','0:v:0','-map','1:a:0','-t',String(clock.duration),'-vf','scale=1280:720','-c:v','libx264','-crf','16','-preset','fast','-c:a','aac','-b:a','192k','-movflags','+faststart',P+'/'+scene.toUpperCase()+'_带配音_720p.mp4'],{stdio:'inherit'});
}

const audit={scene,range:ranges[scene],origin:clock.origin,duration:clock.duration,blankBelow810:true};
for(const pick of picks){const im=await loadImage(P+'/'+pick.name+'.png');const ca=createCanvas(1920,1080),cx=ca.getContext('2d');cx.drawImage(im,0,0);const data=cx.getImageData(0,810,1920,270).data;for(let j=0;j<data.length;j+=4)if(data[j]!==244||data[j+1]!==239||data[j+2]!==230){audit.blankBelow810=false;break;}}
const px=async name=>{const im=await loadImage(P+'/'+name+'.png');const cv=createCanvas(1920,1080),g=cv.getContext('2d');g.drawImage(im,0,0);return g.getImageData(0,0,1920,1080).data;};
const cropOf=id=>scene==='s02'?(id===8?1290:id===9?1220:1150):scene==='s03'?(id===11?760:1200):(id===62?760:1100);
audit.earlyLateMeanDiff={};audit.earlyLateCropDiff={};
for(const r of clock.rows){const n=String(r.n).padStart(2,'0'),A=await px('s'+n+'_early'),B=await px('s'+n+'_late');let s=0,cnt=0;for(let k=0;k<A.length;k+=4){s+=Math.abs(A[k]-B[k])+Math.abs(A[k+1]-B[k+1])+Math.abs(A[k+2]-B[k+2]);cnt+=3;}audit.earlyLateMeanDiff['s'+n]=+(s/cnt).toFixed(2);
 const cx=cropOf(r.n);let cs=0,cc=0;for(let y=190;y<690;y++)for(let x=cx;x<cx+600;x++){const k=(y*1920+x)*4;cs+=Math.abs(A[k]-B[k])+Math.abs(A[k+1]-B[k+1])+Math.abs(A[k+2]-B[k+2]);cc+=3;}audit.earlyLateCropDiff['s'+n]=+(cs/cc).toFixed(2);}
if(process.env.STILLS_ONLY!=='1'){audit.video=JSON.parse(run('ffprobe',['-v','quiet','-show_streams','-show_format','-of','json',P+'/'+scene.toUpperCase()+'_带配音_720p.mp4'],{encoding:'utf8'}));}
fs.writeFileSync(P+'/verification.json',JSON.stringify(audit,null,2));if(!audit.blankBelow810)throw Error('Content below y810');
const mustMove={s02:[6,8,10],s03:[11]}[scene]||[];
for(const n of mustMove){const key='s'+String(n).padStart(2,'0'),v=audit.earlyLateMeanDiff[key],cv=audit.earlyLateCropDiff[key];if(!(v>2))throw Error(`${key} early/late mean diff ${v} (crop ${cv}) <= 2/255`);}
console.log('meanDiff',JSON.stringify(audit.earlyLateMeanDiff),'cropDiff',JSON.stringify(audit.earlyLateCropDiff));
