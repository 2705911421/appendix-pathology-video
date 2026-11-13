globalThis.document={createElement:()=>({getContext:()=>({})})};globalThis.rough={generator:()=>({})};
const g=await import('../../../film/lib_ext/gross_appendix.js');
const length=Array.from({length:900},(_,i)=>{const a=g.frameAt(i/1000).p,b=g.frameAt((i+1)/1000).p;return Math.hypot(a[0]-b[0],a[1]-b[1]);}).reduce((a,b)=>a+b,0);
const radii=Array.from({length:91},(_,i)=>g.tubeRadius(i/100,1));
const ratio=(length+35+35*.34)/(2*radii.reduce((a,b)=>a+b)/radii.length);
console.log(JSON.stringify({r4_reference_ratio:10.494,final_ratio:ratio,threshold:10.494*.9,states:Object.fromEntries([0,1,2,3].map(i=>[g.STATES[i],g.tubeOutline(g.swellAt(i),g.dentAt(i))])),focusPoint:g.frameAt(.42).p,reference_pose:{x:1210,y:390,sc:1.42,rot:-.16}},null,2));
