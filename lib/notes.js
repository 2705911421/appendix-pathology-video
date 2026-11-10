import {box} from './layout.js';
import {label} from './ann.js';
import {pigment,stain} from './watercolor.js';
export function bakeNotes(){pigment('notes.paper','#CDB98A',802);}
// Each card belongs to one spoken sentence and leaves before its boundary.
export function drawNotes(c,state,{id,fraction}){if(!state||!state.notes)return;const note=state.notes[id];if(!note)return;const a=Math.max(0,Math.min(1,fraction/.14,(1-fraction)/.18));c.save();c.globalAlpha*=a;const {x=1440,y=420,w=400}=state.position||{};box('process note',x-45,y-45,w+65,145);c.save();c.beginPath();c.moveTo(x-30,y-35);c.lineTo(x+w,y-40);c.lineTo(x+w+15,y+90);c.lineTo(x-35,y+95);c.closePath();c.fillStyle='rgba(244,239,230,.92)';c.fill();c.restore();stain(c,'notes.paper',x+w/2,y+40,w+90,.48);for(const [i,s] of note.split('\n').entries())label(c,s,x,y+i*52,{size:36,col:'#2A2A35',halo:true,haloCol:'#F4EFE6'});c.restore();}
