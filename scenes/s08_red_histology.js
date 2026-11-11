import {microscopeScene} from '../lib/microscope_zoom.js';
// S07 owns sentence 30; both scenes share this physical slide and camera clock.
export const config={from:'30',mode:'simple',initial:{x:-80,y:-665},path:[
 {id:'31',fraction:0,arrive:.32,x:-30,y:-475,label:'固有层：中性粒细胞聚集'},
 {id:'32',fraction:0,arrive:.75,x:0,y:-965,label:'肌层：零星中性粒细胞'},
 {id:'33',fraction:0,arrive:.72,x:65,y:-435,label:'变质：胞质淡染、核固缩'},
 {id:'34',fraction:0,arrive:.24,x:0,y:-390,label:'局部上皮缺损脱落'}]};
const s=microscopeScene(config,{'31':'分叶核中性粒细胞\n伴淋巴细胞、浆细胞','33':'变质\n变性、坏死','34':'局灶上皮损伤'});
export const {bake,renderMain,renderAnnotations,sidebarState,exitState}=s;
