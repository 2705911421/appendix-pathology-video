/** QA STATUS: FAILED medical acceptance. Preserved drawHE still renders lumen kind=pus and ulcer=.16 surface gap. See qa/v6/s19_b09/自检.md before reuse.
 * b09 mother-map copy. Exports: prepareChronic(opts={neutrophils:false,chronic:true}) -> canvas (3200x2100, draw at -1600,-1050); focus={fib,lymph,plasma} in map coordinates; cameraFor(z,center=focus.fib) -> [x,y,z]. point(x,y), populations for QA. No cell drawing functions modified. */
import {bake,drawWash} from '../lib/wash.js';
import {drawHE,CELLS} from '../lib/he.js';
import {detailedNeutrophil} from '../lib/he_detail.js';
import {rng} from '../lib/motion.js';
import {drawHE as drawMucosa} from '../lib_ext/he_mucosa.js';
import {cryptNucleus,columnar,erythrocyte,cell,follicle} from '../lib_ext/cells_ext.js';
const TAU=Math.PI*2;
export function point(x,y){const a=x/620-Math.PI/2,r=620+y+12*Math.sin(a*3)+9*Math.sin(a*5),u=1.6*Math.cos(a)*r,v=Math.sin(a)*r;return [u*Math.cos(.14)-v*Math.sin(.14),u*Math.sin(.14)+v*Math.cos(.14)];}
function buildSource(mode,opts={neutrophils:true,chronic:false}){const source=document.createElement('canvas');source.width=840;source.height=620;const c=source.getContext('2d'),R=rng(40802);c.translate(420,320);(mode==='original'?drawHE:drawMucosa)(c,{ulcer:.16,neut:0,fibrin:0,t:0,detail:1,crypts:mode!=='low',gap:mode==='ulcer'?[-25,45]:null});
const copy=document.createElement('canvas');copy.width=840;copy.height=620;copy.getContext('2d').drawImage(source,0,0);
c.drawImage(copy,0,155,840,18,-420,140,840,90);c.drawImage(copy,0,330,840,5,-420,-153,840,5);
for(let i=0;i<150;i++){const x=-410+R()*820,y=-280+R()*120,sz=.7+R()*.2,rot=R()*TAU;if(mode==='ulcer'&&x>-31&&x<51&&y<-273)continue;cell(c,x,y,i%7?'lymph':'plasma',sz,rot,i);}
[-390,40,360].forEach(x=>{c.save();c.translate(x,-55);c.scale(.78,.78);follicle(c,0,0);c.restore();});for(let i=0;i<85;i++)cell(c,-410+R()*820,148+R()*76,'dot',.9,R()*TAU,i);for(let i=0;i<62;i++)cell(c,-414+i*13.5,274+Math.sin(i*.4)*2,'meso',.8,0,i);
if(opts.neutrophils){let n=0;for(const p of CELLS){if(p.kind!=='inf'||p.y>138||p.y< -290)continue;if(mode==='ulcer'&&p.x>-31&&p.x<51&&p.y<-273)continue;if(p.y>0&&n++%35!==0)continue;if(p.y<0&&n++%4!==0)continue;detailedNeutrophil(c,p.x,p.y,p,1);}for(let i=0;i<7;i++)detailedNeutrophil(c,-270+Math.cos(i*.55)*(26+i*3),-80+Math.sin(i*.55)*(23+i*3),{lobes:2+i%4,rot:i*.8,sz:.9},1);
}if(opts.chronic) addChronic(c,opts);
if(mode==='ulcer'){const extended=document.createElement('canvas');extended.width=840;extended.height=750;const e=extended.getContext('2d');e.drawImage(source,0,130);e.translate(420,450);escapedPus(e);ulcerDetail(e);return extended;}return source;}

function mapSource(src){const c=src.getContext('2d');const im=c.getImageData(0,0,840,src.height);const top=src.height===750?450:320;const result=document.createElement('canvas');result.width=3200;result.height=2100;const mc=result.getContext('2d'),out=mc.createImageData(3200,2100);for(let j=0;j<2100;j++)for(let i=0;i<3200;i++){const u=i-1600,v=j-1050,x=(u*Math.cos(.14)+v*Math.sin(.14))/1.6,y=-u*Math.sin(.14)+v*Math.cos(.14),a=Math.atan2(y,x),fy=Math.hypot(x,y)-620-12*Math.sin(a*3)-9*Math.sin(a*5);if(fy< -top||fy>=280)continue;let fx=((a+Math.PI/2)*620+420)%840;if(fx<0)fx+=840;const si=(Math.floor(fy+top)*840+Math.floor(fx))*4,di=(j*3200+i)*4;out.data.set(im.data.subarray(si,si+4),di);}mc.putImageData(out,0,0);return result;}

export const populations=[];
const clusters=[[-205,-223],[-92,-177],[145,-238],[270,-178]];
const C=rng(51909);
for(let g=0;g<4;g++)for(let i=0;i<28;i++){const a=C()*TAU,r=Math.sqrt(C())*34;populations.push({type:'lymph',x:clusters[g][0]+Math.cos(a)*r,y:clusters[g][1]+Math.sin(a)*r*.63,sz:.7+C()*.2,rot:C()*TAU,key:i});}
for(let i=0;i<14;i++)populations.push({type:'plasma',x:clusters[i%4][0]+37+(C()-.5)*10,y:clusters[i%4][1]+(C()-.5)*34,sz:.7+C()*.2,rot:C()*TAU,key:i});
export const focus={fib:point(-160,-148),lymph:point(populations[0].x,populations[0].y),plasma:point(populations[112].x,populations[112].y)};
export const cameraFor=(z,center=focus.fib)=>[...center,z];
export function prepareChronic(opts={neutrophils:false,chronic:true}){
 if(opts.chronic)bake('b09chr.collagen',(b,P)=>{P.fill(b,P.blob(0,0,300,22,.2,43),'#E7B5C4',200,.15);P.fill(b,P.blob(0,0,230,14,.2,44),'#DCA4B2',200,.15);},{seed:43,hd:true,soft:true,grain:.12,edge:.3,bleed:.5});
 return mapSource(buildSource('original',opts));
}
export const collagenBands=[[-160,-148,130],[100,-120,105],[-205,-208,95]];
function addChronic(c,opts={}){
 const F=rng(51910);
 for(const [x,y,w] of (opts.layer==='cells'?[]:collagenBands)){drawWash(c,'b09chr.collagen',x,y,w,{alpha:.40});c.save();c.strokeStyle='#D78EA8';c.globalAlpha=.40;
 for(let i=0;i<80;i++){const xx=x+(F()-.5)*w,yy=y+(F()-.5)*15;c.lineWidth=.35+F()*.55;c.beginPath();c.moveTo(xx,yy);c.bezierCurveTo(xx+5,yy-2,xx+12,yy+2,xx+18,yy);c.stroke();}c.restore();}
 for(const p of (opts.layer==='collagen'?[]:populations))cell(c,p.x,p.y,p.type,p.sz,p.rot,p.key);
}

export const referencePopulations=[];{const R=rng(40802);for(let i=0;i<150;i++){const x=-410+R()*820,y=-280+R()*120,sz=.7+R()*.2,rot=R()*TAU;referencePopulations.push({type:i%7?'lymph':'plasma',x,y,sz,rot,key:i});}}
