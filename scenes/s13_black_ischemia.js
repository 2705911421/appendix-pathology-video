import {microscopeScene} from '../lib/microscope_zoom.js';
import {bakeGross,drawGross} from '../lib/gross_appendix.js';
import {label} from '../lib/ann.js';
const s=microscopeScene({from:'50',mode:'gangrene',path:[{id:'51',x:-90,y:-694,label:'分层血栓 · 出血与坏死'}]});
export async function bake(){await bakeGross();await s.bake();}
export function renderMain(c,state){if(state.id==='49'){drawGross(c,900,470,'black');label(c,'腔内压力升高',1120,350,{size:38});}else return s.renderMain(c,state);}
export const {renderAnnotations,sidebarState,exitState}=s;
