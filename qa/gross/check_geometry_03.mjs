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
