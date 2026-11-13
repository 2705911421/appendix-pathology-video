// Lane open: pale, textured building; screen-space lines match clin figures.
import {ink} from '../lib/ink.js';
let tile;
export function prepareHospital() {
  if (tile) return;
  tile = document.createElement('canvas'); tile.width = tile.height = 512;
  const c = tile.getContext('2d'); let seed = 914;
  const r = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  c.fillStyle = '#E6DFD2'; c.fillRect(0,0,512,512);
  for(let i=0;i<1500;i++) {c.globalAlpha=.015+r()*.04;c.fillStyle=i%3?'#F4EFE6':'#AEB9B4';c.beginPath();c.ellipse(r()*512,r()*512,8+r()*50,6+r()*40,r()*3,0,7);c.fill();}
  for(let i=0;i<18000;i++){c.globalAlpha=.06;c.fillStyle=i%2?'#FFFFFF':'#BEB6A8';c.fillRect(r()*512,r()*512,1,1);}
}
export function hospital(c,x,y) {
  c.save(); c.translate(x,y);
  const d='M -193 132 L -193 -36 L -108 -36 L -108 -142 L 105 -142 L 105 -36 L 192 -36 L 192 132 Z';
  c.fillStyle=c.createPattern(tile,'repeat');c.fill(new Path2D(d));
  ink(c,'open.hospital.body','path',[d],{fill:'none',stroke:'#777381',strokeWidth:2.8,roughness:.9,bowing:.8,seed:914},{fill:false});
  const line=(key,pts,col='#85818E',w=2.4)=>ink(c,'open.hospital.'+key,'curve',[pts],{fill:'none',stroke:col,strokeWidth:w,roughness:.7,bowing:.8,seed:915},{fill:false});
  c.fillStyle='#C3CFCC88';
  for(const [i,wx] of [-150,-58,46,138].entries()) {
    c.fillRect(wx-17,3,34,36); line('window'+i,[[wx-17,39],[wx-17,3],[wx+17,3],[wx+17,39]],'#9698A0',1.8);
  }
  c.fillStyle='#AEB9B366';c.fillRect(-36,70,72,62);
  line('door',[[-36,132],[-36,70],[36,70],[36,132]]);line('seam',[[0,72],[0,132]],'#9698A0',1.6);
  line('roof',[[-116,-146],[113,-146]],'#96908C',2.4);
  line('crossH',[[-28,-88],[28,-88]],'#D6453A',7);line('crossV',[[0,-116],[0,-60]],'#D6453A',7);
  c.restore();
}
