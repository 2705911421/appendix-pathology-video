import {text,labelTo,drawFocus} from './ct_r3_schematic.js';
export const files=["S04_primary_rID197373_axial_s130_appendix-thick-wall_img67748644.jpeg", "S09_primary_rID30389_coronal_s024_key-coronal-mild-stranding_img7922572.jpg", "S09_primary_rID30389_axial_s058_appendix-near-cecum_img7922410.jpg", "S12_primary_rID197370_axial_s128_dilated-appendix-extensive-stranding_img67747991.jpeg", "S12_primary_rID197370_coronal_s065_coronal-extensive-fat-stranding_img67748143.jpeg", "S15_primary_rID242634_axial_s285_wall-enhancement-defect-and-gas-abscess_img75885695.jpg"];
export async function loadCT(i){const im=new Image();im.src=new URL('../assets/ct_real/'+files[i],import.meta.url);await im.decode();return im;}
// Source rectangles only remove empty margins / table; anatomical pixels are untouched.
export const crops=[[20,155,472,280],[0,0,512,695],[0,75,512,390],[20,90,472,310],[0,0,512,512],[0,70,512,350]];
export function realCT(c,im,i,box,rid){
 const [sx,sy,sw,sh]=crops[i],k=Math.min(box.w/sw,(box.h-78)/sh),w=sw*k,h=sh*k;
 const x=box.x+(box.w-w)/2,y=box.y+38+(box.h-78-h)/2;
 c.drawImage(im,sx,sy,sw,sh,x,y,w,h);
 text(c,'典型病例',box.x+14,box.y+27,26,'#6B4C9A',500);
 text(c,`Radiopaedia.org rID ${rid} · CC BY-NC-SA 3.0`,box.x+14,box.y+box.h-9,20,'#6B4C9A',500);
 return {point:(px,py)=>({x:x+(px-sx)*k,y:y+(py-sy)*k}),k};
}
export function mark(c,g,p,r,label,alpha=1){const q=g.point(...p);drawFocus(c,q.x,q.y,r*g.k,alpha,[7,6],1.6,'#C9B7DA');labelTo(c,label,650,898,q.x,q.y,{color:'#C9B7DA',alpha,size:28});}
