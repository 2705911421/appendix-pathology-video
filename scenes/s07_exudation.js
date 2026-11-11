import {placeholder} from './placeholder.js';
import {drawMicroscope,bakeMicroscope} from '../lib/microscope_zoom.js';
import {config} from './s08_red_histology.js';
export const renderMain=(c,state)=>state.id==='30'?drawMicroscope(c,state,config):placeholder(c,'S07');
export const sidebarState=()=>null;
export const bake=bakeMicroscope;
export const exitState=()=>({state:'slide',config});
export const renderAnnotations=()=>{};
