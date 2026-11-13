// S18 acute side: one straight H&E wall cross-section for the acute/chronic compare.
// Drawing vocabulary is copied from the approved S10/S11 segment (tag v6-s10-final):
// he_mucosa.drawHE base field + the same pus (degenerating neutrophil) symbol and
// detailedNeutrophil. No new cell morphology, no numbers.
import {drawHE} from './he_mucosa.js';
import {detailedNeutrophil} from '../lib/he_detail.js';
import {cell,columnar,erythrocyte} from './cells_ext.js';
import {rng} from '../lib/motion.js';
import {drawWash} from '../lib/wash.js';
const TAU=Math.PI*2;
// Degenerating neutrophil: blurred pale cytoplasm, pyknotic / fragmented purple nucleus.
function pus(c,x,y,sz,rot,key){c.save();c.translate(x,y);c.rotate(rot);c.scale(sz,sz);c.filter='blur(1px)';c.beginPath();c.ellipse(0,0,10.2,9.6,0,0,TAU);c.fillStyle='rgba(226,170,200,.44)';c.fill();c.filter='none';c.fillStyle='#50345F';for(let j=0;j<(key%2?4:1);j++){c.beginPath();c.ellipse(key%2?-4+j*2.6:0,key%2?(j%2?2:-2):0,key%2?1.5:3.3,key%2?2:3.8,j*.7,0,TAU);c.fill();}c.restore();}
export function prepareAcute(){
 // 1120 x 960 field units at 2x: y -480 (lumen) .. 480 (serosa).
 const cv=document.createElement('canvas');cv.width=2240;cv.height=1920;
 const c=cv.getContext('2d');c.scale(2,2);c.translate(560,480);
 drawHE(c,{ulcer:.92,neut:.74,fibrin:.5,t:0,detail:1,gap:[-62,72]});
 const R=rng(51818);
 // Edema separates the muscle bundles (exudate fluid, not a tinted field).
 for(let j=0;j<9;j++){const y=40+j*24;c.save();c.globalAlpha=.55;drawWash(c,'chron.edema',-40,y,430,{alpha:.30});c.restore();}
 // Necrotic mucosa around the ulcer: faded ground, nuclear dust, frayed epithelium.
 c.save();const g=c.createRadialGradient(0,-268,10,0,-268,108);g.addColorStop(0,'rgba(136,113,127,.26)');g.addColorStop(.65,'rgba(136,113,127,.12)');g.addColorStop(1,'rgba(136,113,127,0)');c.fillStyle=g;c.beginPath();c.ellipse(0,-268,118,62,0,0,TAU);c.fill();c.restore();
 for(let i=0;i<120;i++){const x=(R()-.5)*200,y=-300+R()*72;c.fillStyle=i%3?'rgba(72,47,92,.34)':'rgba(110,75,124,.26)';c.beginPath();c.ellipse(x,y,.5+R()*1.5,.4+R()*1.1,R()*TAU,0,TAU);c.fill();}
 for(const side of [-1,1])for(let j=0;j<4;j++)columnar(c,side*(64+j*4),-292-j*3,.48,side*.55,j,'fray');
 // Exudate at the ulcer base: pus cells, a few intact neutrophils, shreds and red cells.
 for(let i=0;i<58;i++){const x=-58+R()*128,y=-300+R()*62,sz=.66+R()*.14;if(i%3===0)pus(c,x,y,sz,R()*TAU,i);else detailedNeutrophil(c,x,y,{lobes:2+i%4,rot:R()*TAU,sz},1);}
 for(let i=0;i<9;i++)erythrocyte(c,-40+R()*80,-296+R()*36,.5,R()*TAU,i);
 c.strokeStyle='rgba(204,158,180,.35)';c.lineWidth=.4;
 for(let i=0;i<46;i++){const x=(R()-.5)*190,y=-300+R()*62;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+5,y-3,x+9,y+4);c.stroke();}
 // Pus tracks through the submucosa; the deep muscle keeps only scattered cells.
 for(let i=0;i<30;i++){const x=-150+R()*300,y=-150+R()*130;pus(c,x,y,.62+R()*.16,R()*TAU,i);}
 // Small mucosal lymphoid aggregate is left intact as a reference, not as the lesion.
 for(let i=0;i<26;i++){const a=R()*TAU,r=Math.sqrt(R())*26;cell(c,-330+Math.cos(a)*r,-210+Math.sin(a)*r*.7,i%5?'lymph':'plasma',.62+R()*.16,R()*TAU,i);}
 return cv;
}
export const ACUTE_RECT=[-560,-480,1120,960];
