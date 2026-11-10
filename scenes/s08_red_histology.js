import {microscopeScene} from '../lib/microscope_zoom.js';
export const config={from:'31',mode:'simple',path:[
 {id:'32',fraction:0,arrive:.30,y:-690,label:'黏膜下层：小血管充血'},
 {id:'32',fraction:.60,arrive:.84,y:-925,label:'肌层：零星中性粒细胞'},
 {id:'33',fraction:0,arrive:.30,y:-1135,label:'浆膜：干净、轻度充血'},
 {id:'34',fraction:0,arrive:.30,y:-390,label:'局部上皮缺损脱落'}]};
const s=microscopeScene(config,{'31':'黏膜固有层\n分叶核中性粒细胞','33':'变质\n变性、坏死','34':'局灶上皮损伤'});
export const {bake,renderMain,renderAnnotations,sidebarState,exitState}=s;
