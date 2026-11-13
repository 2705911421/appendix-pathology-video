// Bake the approved r8 library first, with the reference brush scale. Restore the
// initial scale so all following background / H&E recipes retain their pixels.
import {prepare as bakeGross} from './gross_appendix.js';
export * from './gross_appendix.js';
let ready=false;
export function prepare(){if(ready)return;bakeGross();brush.scaleBrushes(1/2.4);ready=true;}
