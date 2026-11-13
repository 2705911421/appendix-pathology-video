// Geometry-only check: no rendering or engine mutation.
globalThis.document = {createElement: () => ({getContext: () => ({})})};
globalThis.rough = {generator: () => ({})};
const g = await import('../../film/lib_ext/gross_appendix.js');
const assert = (ok, msg) => {if (!ok) throw Error(msg)};
for (const t of [0,.5,1,1.5,2,2.5,3]) console.log('stage',t,'swell',g.swellAt(t),'dent',g.dentAt(t));
for (let k=0;k<=3000;k++) {
 const t=k/1000, pts=g.tubeOutline(g.swellAt(t),g.dentAt(t));
 assert(pts.every(p=>p.every(Number.isFinite)), 'non-finite contour');
 if(k) {
  const prev=g.tubeOutline(g.swellAt(t-.001),g.dentAt(t-.001));
  assert(pts.every((p,i)=>Math.hypot(p[0]-prev[i][0],p[1]-prev[i][1])<.1),'contour jump');
 }
}
assert(g.swellAt(0)<g.swellAt(1)&&g.swellAt(1)<g.swellAt(2)&&g.swellAt(3)>g.swellAt(1),'state widths');
console.log('PASS: 3001 contour samples, adjacent displacement < 0.1 local pixels; state widths ordered.');
let length=0;
for(let k=1;k<=900;k++) {
 const a=g.frameAt((k-1)/1000).p,b=g.frameAt(k/1000).p;
 length+=Math.hypot(b[0]-a[0],b[1]-a[1]);
}
const radii=Array.from({length:91},(_,k)=>g.tubeRadius(k/100,g.swellAt(0)));
const diameter=2*radii.reduce((a,b)=>a+b)/radii.length;
const ratio=(length+35+35*.34)/diameter;
assert(ratio>9.5&&ratio<11,'normal aspect ratio');
assert(Math.max(...radii)/Math.min(...radii)<1.05,'normal shaft uniformity');
for(let stage=0;stage<=3;stage+=.01) {
 const pts=g.tubeOutline(g.swellAt(stage),g.dentAt(stage));
 // Middle of the round cap is fixed at every stage (width may change).
 const tip=pts[47],base=g.frameAt(.9);
 assert(Math.hypot(tip[0]-base.p[0]-base.tx*35,tip[1]-base.p[1]-base.ty*35)<1e-8,'tip axial drift');
 assert((length+46.9)/(diameter*g.swellAt(stage))>6.5,'swollen tube must remain elongated');
}
assert(g.mesoHang(.88)>0,'mesentery must attach through the distal shaft');
console.log('PASS: normal arc-length/mean-diameter =',ratio.toFixed(3),'; radius max/min =',(Math.max(...radii)/Math.min(...radii)).toFixed(3),'; fixed blind tip across morph; distal mesentery attached.');
