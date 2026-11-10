import {bakeAcute,drawAcute,drawAcuteAnnotations} from '../lib/he_acute.js';
export const bake=bakeAcute;
export const renderMain=drawAcute;
export const renderAnnotations=drawAcuteAnnotations;
export const sidebarState=()=>({heading:'单纯性阑尾炎',card:{type:'definition',text:'黏膜\n黏膜下层\n中性粒细胞主要在此\n\n肌层：仅散在\n浆膜：干净、轻充血'},source:'局部黏膜上皮受损脱落'});
export const exitState=()=>({state:'simple-focal-epithelial-defect'});
