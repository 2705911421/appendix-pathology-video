import {paper,nav,path,text,ease,label} from './card_library.js';
import {prepareGross as prepare,gross} from './card_gross_cache.js';
export default {prepare,draw(c,t,T){paper(c);nav(c);const p=ease((t-T.at(20))/(T.frac(20,.9)-T.at(20)));path(c,ease((t-T.at(22))/(T.frac(22,.55)-T.at(22))),Math.min(2,Math.floor(p*3)));const stage=1+2*p;gross(c,stage,{scale:.95});if(t>=T.at(21))text(c,'典型演变',1500,780,42,'#6B4C9A',700);label(c,['单纯性','化脓性','坏疽性'][Math.min(2,Math.floor(p*3))],1300,180,1250,360);}};
