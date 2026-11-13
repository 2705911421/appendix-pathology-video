import {text} from './ct_r3_schematic.js';
export {loadCT,files} from './ct_real_images.js';
const crops=[[20,155,472,280],[0,0,512,695],[0,75,512,390],[20,90,472,310],[0,0,512,512],[0,70,512,350]];
const closeups=[crops[0],[50,280,350,315],[40,115,420,300],[35,105,420,280],[45,150,365,335],[35,115,365,275]];
// Zoom and translation only. Source JPEGs and grayscale values remain unchanged.
export function realCT(c,im,i,box,rid,progress=0){
 const u=Math.max(0,Math.min(1,progress)),a=crops[i],b=closeups[i];
 const [sx,sy,sw,sh]=a.map((v,j)=>v+(b[j]-v)*u);
 const small=box.w<600,foot=small?100:78;
 const k=Math.min(box.w/sw,(box.h-foot)/sh),w=sw*k,h=sh*k;
 const x=box.x+(box.w-w)/2,y=box.y+38+(box.h-foot-h)/2;
 c.drawImage(im,sx,sy,sw,sh,x,y,w,h);
 text(c,'典型病例',box.x+14,box.y+27,26,'#6B4C9A',500);
 if(small){
  text(c,`Radiopaedia.org rID ${rid}`,box.x+14,box.y+box.h-40,26,'#6B4C9A',500);
  text(c,'CC BY-NC-SA 3.0',box.x+14,box.y+box.h-9,26,'#6B4C9A',500);
 }else text(c,`Radiopaedia.org rID ${rid} · CC BY-NC-SA 3.0`,box.x+14,box.y+box.h-9,26,'#6B4C9A',500);
 return {point:(px,py)=>({x:x+(px-sx)*k,y:y+(py-sy)*k}),k,bounds:{x,y,w,h}};
}
export function mark(c,g,p,r,label,alpha=1){
 if(alpha<=0)return;
 const q=g.point(...p),R=r*g.k;
 const tx=Math.min(1830-label.length*32,q.x+R+34),ty=Math.max(175,q.y-R-20);
 const angle=Math.atan2(ty-q.y,tx-q.x),ax=q.x+Math.cos(angle)*R,ay=q.y+Math.sin(angle)*R;
 c.save();c.globalAlpha*=alpha;c.lineCap='round';c.lineJoin='round';
 const ring=()=>{c.beginPath();c.arc(q.x,q.y,R,0,Math.PI*2);};
 // Contrast underlay is confined to annotation edges, with no fill or filter on CT.
 ring();c.strokeStyle='rgba(34,24,46,.65)';c.lineWidth=6.4;c.stroke();
 ring();c.strokeStyle='#DCC9EF';c.lineWidth=3.2;c.stroke();
 const lead=()=>{c.beginPath();c.moveTo(ax,ay);c.lineTo(tx-10,ty+6);c.lineTo(tx+34,ty+6);};
 lead();c.strokeStyle='rgba(34,24,46,.7)';c.lineWidth=4.4;c.stroke();
 lead();c.strokeStyle='#DCC9EF';c.lineWidth=2.2;c.stroke();
 c.font='500 32px MixSans';c.strokeStyle='#241B2E';c.lineWidth=5;
 c.strokeText(label,tx,ty);c.fillStyle='#DCC9EF';c.fillText(label,tx,ty);
 c.restore();
}
