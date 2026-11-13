// Copied from clin_draw.js for identity parity; source worktree untouched.
import {ink} from '../lib/ink.js';
const C={ink:'#2A2A35',red:'#D6453A',purple:'#A38AB5',skin:'#DBB8A2',blue:'#9AAEB0',coat:'#E5E2DB',pants:'#8D919E',hair:'#5C5966'};
const textures=new Map();
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function prepare(){if(textures.size)return;for(const [i,color] of Object.values(C).entries()){const b=document.createElement('canvas');b.width=b.height=768;const c=b.getContext('2d'),r=rng(771+i);c.fillStyle=color;c.globalAlpha=.45;c.fillRect(0,0,768,768);for(let k=0;k<2300;k++){c.globalAlpha=.008+r()*.018;c.fillStyle=k%3?'#F4EFE6':color;c.beginPath();c.ellipse(r()*768,r()*768,10+r()*90,8+r()*55,r()*3,0,7);c.fill();}for(let k=0;k<35000;k++){c.globalAlpha=.025+r()*.065;c.fillStyle=r()>.5?'#FFFFFF':color;c.fillRect(r()*768,r()*768,.6+r()*2,.6+r()*2);}textures.set(color,b);}}
export function text(c,s,x,y,size=36,color=C.ink,weight=500){c.font=`${weight} ${size}px MixSans`;c.fillStyle=color;c.fillText(s,x,y);}
function path(c,key,d,color){const p=new Path2D(d);if(color){c.save();c.fillStyle=c.createPattern(textures.get(color),'repeat');c.fill(p);c.restore();}ink(c,'clin.'+key,'path',[d],{fill:'none',stroke:C.ink,strokeWidth:2.6,roughness:.9,bowing:.8,seed:23},{fill:false});}
function line(c,key,pts,color=C.ink,width=2.6){ink(c,'clin.'+key,'curve',[pts],{fill:'none',stroke:color,strokeWidth:width,seed:12},{fill:false});}
export function person(c,{x=1000,y=120,scale=1,doctor=false,side=false,face='neutral',arm='rest',lift=1}={}){c.save();c.translate(x,y);c.scale(scale,scale);
 const k=(doctor?'doc':'pat')+(side?'side':'front');
 // Adult proportions; local top 0, bottom 620. No identifying traits.
 // The doctor is broader at the shoulder line, narrower at the waist and dark-haired,
 // so the two roles stay distinguishable at a glance (reused by the card line).
 path(c,k+'legs',side?'M -28 377 L 35 377 L 48 604 L 16 610 L 0 458 L -3 607 L -36 609 Z':doctor?'M -58 380 L 60 380 L 71 606 Q 49 618 19 608 L 0 452 L -18 607 Q -48 618 -72 605 Z':'M -62 377 L 64 377 L 78 604 Q 53 618 21 607 L 0 449 L -20 607 Q -52 618 -77 604 Z',C.pants);
 path(c,k+'neck','M -23 112 L -23 149 Q 0 169 25 149 L 22 110 Z',C.skin);
 path(c,k+'body',side?'M -16 142 Q -44 157 -47 182 L -36 389 Q 6 403 48 388 L 40 186 Q 30 154 18 143 Z':doctor?'M -26 142 Q -71 144 -99 164 L -117 283 L -82 293 L -66 236 L -62 401 Q 0 421 63 401 L 65 236 L 82 293 L 118 281 L 99 166 Q 64 144 26 142 Q 0 162 -26 142 Z':'M -26 142 Q -67 145 -93 166 L -109 288 L -76 297 L -64 233 L -66 390 Q 0 409 67 390 L 63 233 L 77 297 L 111 286 L 94 168 Q 62 146 26 142 Q 0 164 -26 142 Z',doctor?C.coat:C.blue);
 if(doctor&&side){line(c,k+'lapelSide',[[18,146],[32,193],[19,225],[27,390]],C.ink,3.2);line(c,k+'pocketSide',[[20,259],[38,259],[38,292],[22,292]]);line(c,k+'pocketSideFlap',[[20,270],[38,270]]);}
 else if(doctor){line(c,k+'lapel1',[[-24,145],[-45,197],[-18,224],[0,310]],C.ink,3.2);line(c,k+'lapel2',[[25,145],[45,197],[18,224],[0,310]],C.ink,3.2);
  line(c,k+'collar1',[[-24,145],[-31,161],[-10,176]],C.ink,2.2);line(c,k+'collar2',[[25,145],[32,161],[10,176]],C.ink,2.2);
  line(c,k+'hem',[[0,310],[0,401]],C.ink,3);line(c,k+'pocketR',[[22,252],[55,252],[53,292],[24,292]]);line(c,k+'pocketRflap',[[22,265],[55,265]]);
  line(c,k+'pocketL',[[-58,316],[-24,316],[-24,352],[-58,352]]);line(c,k+'pocketLflap',[[-58,329],[-24,329]]);
  // Stethoscope around the neck, chest piece on the sternum: the clearest role cue at small scale.
  line(c,k+'stethL',[[-23,150],[-32,196],[-23,231],[-8,244]],'#5B5480',3.4);line(c,k+'stethR',[[23,150],[32,196],[23,231],[8,244]],'#5B5480',3.4);
  c.save();c.fillStyle='#5B5480';c.beginPath();c.arc(-23,150,3.6,0,7);c.arc(23,150,3.6,0,7);c.fill();
  c.strokeStyle=C.ink;c.lineWidth=2.6;c.beginPath();c.arc(0,259,12,0,7);c.fill();c.stroke();
  c.fillStyle='#D9D2C6';c.beginPath();c.arc(0,259,4.5,0,7);c.fill();c.restore();}
 path(c,k+'head',side?'M -37 31 Q -17 -3 17 10 Q 45 25 38 58 L 53 76 L 38 82 Q 38 112 19 124 L -12 118 Q -38 101 -39 72 Z':'M -43 38 Q -39 3 0 6 Q 39 5 43 39 L 39 83 Q 32 118 0 128 Q -31 118 -39 85 Z',C.skin);
 path(c,k+'hair',side?'M -39 65 Q -52 21 -22 5 Q 19 -12 38 20 L 40 49 Q 10 39 0 22 Q -26 46 -30 73 Z':doctor?'M -41 60 Q -44 20 -21 7 Q 7 -6 37 11 L 43 38 L 33 31 Q 15 18 -3 19 Q -23 23 -31 41 L -33 63 Z':'M -43 65 Q -55 18 -19 4 Q 23 -9 42 24 L 44 58 L 30 39 Q 2 42 -14 25 Q -23 42 -36 45 L -38 70 Z',doctor?C.hair:C.pants);
 if(doctor&&!side){line(c,k+'part',[[-8,9],[5,30]],C.ink,1.6);
  line(c,k+'glassesL',[[-36,56],[-12,53],[-10,76],[-34,79],[-36,56]],C.ink,1.8);line(c,k+'glassesR',[[10,53],[34,56],[36,79],[12,76],[10,53]],C.ink,1.8);
  line(c,k+'bridge',[[-10,64],[10,64]],C.ink,1.8);line(c,k+'templeL',[[-36,61],[-45,58]],C.ink,1.8);line(c,k+'templeR',[[36,61],[45,58]],C.ink,1.8);}
 if(doctor&&side){line(c,k+'glassesSide',[[24,57],[42,58],[41,75],[25,74],[24,57]],C.ink,1.8);line(c,k+'templeSide',[[42,62],[52,66]],C.ink,1.8);}
 if(side){line(c,k+'eye',[[22,59],[29,59]]);line(c,k+'nose',[[31,65],[34,77],[40,77]]);}else{line(c,k+'eyeL'+face,[[-27,66],[-18,face==='pain'?62:65],[-10,66]]);line(c,k+'eyeR'+face,[[10,66],[18,face==='pain'?62:65],[27,66]]);line(c,k+'nose',[[0,68],[-3,86],[3,87]]);}
 line(c,k+'mouth'+face,[[-10,102],[0,face==='pain'?98:103],[12,102]]);
 if(side){path(c,k+'armSide','M -20 178 Q -38 202 -21 295 L -10 378 Q -7 398 8 392 L 16 372 L 5 292 L 10 190 Z',C.skin);}else if(arm==='exam'){path(c,k+'examarm','M -109 282 L -77 286 L -99 313 L -214 338 Q -242 346 -246 334 Q -245 322 -223 319 L -124 294 Z',C.skin);}else if(arm==='pain'){path(c,k+'painarm','M -108 282 L -79 282 L -68 321 L -15 331 Q 2 335 -5 346 Q -13 352 -30 347 L -91 343 Q -110 325 -108 282 Z',C.skin); }else if(arm==='reach'){
  // Hand travels from the hanging rest pose up to the upper abdomen (lift 0→1).
  // Two capsules (upper arm + forearm) keep a readable elbow and stay joined to the sleeve.
  const p=Math.max(0,Math.min(1,lift)),L=(a,b)=>a+(b-a)*p;
  const S=[-96,306],E=[L(-112,-100),L(330,350)],H=[L(-100,-30),L(382,300)];
  const cap=(A,B,w)=>{c.beginPath();c.moveTo(A[0],A[1]);c.lineTo(B[0],B[1]);c.lineCap='round';c.strokeStyle=C.ink;c.lineWidth=w+5;c.stroke();c.strokeStyle=c.createPattern(textures.get(C.skin),'repeat');c.lineWidth=w;c.stroke();};
  c.save();cap(S,E,33);cap(E,H,29);
  c.fillStyle=c.createPattern(textures.get(C.skin),'repeat');c.strokeStyle=C.ink;c.lineWidth=2.6;
  c.beginPath();c.ellipse(H[0],H[1],13,16,Math.atan2(H[1]-E[1],H[0]-E[0])-Math.PI/2,0,7);c.fill();c.stroke();
  c.restore();
 }else{path(c,k+'armleft','M -109 282 L -77 286 L -81 365 Q -78 391 -92 394 Q -108 392 -108 371 Z',C.skin);}
 if(!side)path(c,k+'armright','M 78 285 L 110 282 L 113 365 Q 114 393 100 394 Q 85 394 85 368 Z',C.skin);
 // Hair and trousers use quiet, sparse hand hatching.
 c.save();c.globalAlpha*=.25;for(let i=0;i<(side?0:7);i++)line(c,k+'hatch'+i,[[-64+i*3,450+i*13],[-39+i*3,433+i*13]],C.ink,1.1);c.restore();
 c.restore();}
