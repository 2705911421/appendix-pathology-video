import fs from 'node:fs';import {rng} from '../../../film/lib/motion.js';
const P='qa/v6/e10_s19',g=JSON.parse(fs.readFileSync(P+'/cell_geometry.json')),cells=g.e10.cells,cp=g.e10.focus.fib,z=1.62,n=1350,F=rng(19606+n),kept=[];
for(let i=0;i<n;i++){
 const x=cp[0]+(F()-.5)*350,y=cp[1]+(F()-.5)*350;
 const p=g.e10.focus.plasma,h=g.e10.focus.lymph;
 if(Math.hypot(x-p[0],y-p[1])<52||Math.hypot(x-h[0],y-h[1])<45)continue;
 F();const l=(12+F()*4)/z,w=(1.8+F()*.8)/z;F();F();
 const blocked=kept.some(q=>Math.pow((x-q.x)/((l+q.l)*.82),2)+Math.pow((y-q.y)/((w+q.w)*1.6),2)<1)||cells.some(q=>Math.abs(x-q.x)<l*.87+q.rad&&Math.abs(y-q.y)<w*.9+q.rad);
 if(blocked)continue;kept.push({x,y,l,w});for(let j=0;j<10;j++){F();F();F();F();}
}
const roi=kept.filter(q=>Math.abs(q.x-cp[0])*z<150&&Math.abs(q.y-cp[1])*z<150);
const lymph=cells.filter(q=>q.type==='lymph'&&Math.abs(q.x-cp[0])*z<150&&Math.abs(q.y-cp[1])*z<150);
const median=a=>a.sort((a,b)=>a-b)[a.length>>1];
const diam=lymph.map(q=>{const R=rng(8719+q.key*7919);R();const rx=3.8+R()*1.1;R();return 2*rx*.85*q.s*.158*z;});
const d={roi:[960,350,1260,650],local_added_spindles:roi.length,lymphocytes:lymph.length,median_spindle_length_px:median(roi.map(q=>2*q.l*z)),estimated_median_lymph_nuclear_diameter_px:median(diam)};d.length_ratio=d.median_spindle_length_px/d.estimated_median_lymph_nuclear_diameter_px;fs.writeFileSync(P+'/spindle_geometry.json',JSON.stringify(d,null,2));console.log(d);
