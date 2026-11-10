import {measureBlock,drawBlock} from '../lib/layout.js';
export function placeholder(ctx,id){drawBlock(ctx,measureBlock(ctx,id,{size:52,width:500}),1000,360);}
