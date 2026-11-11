import {createCanvas,loadImage} from '@napi-rs/canvas';
import fs from 'node:fs';
const dir='qa/v6/parity';const frames=[];
for(const t of ['89.73','99.22']){
 const ref=await loadImage(`qa/ref/style_target/t_0${t}.png`),actual=await loadImage(`${dir}/render_${t}.png`);
 if(ref.width!==actual.width||ref.height!==actual.height)throw Error('Image dimension mismatch');
 const w=ref.width,h=ref.height;const c=createCanvas(w,h),ctx=c.getContext('2d');ctx.drawImage(ref,0,0);const a=ctx.getImageData(0,0,w,h);ctx.clearRect(0,0,w,h);ctx.drawImage(actual,0,0);const b=ctx.getImageData(0,0,w,h),diff=ctx.createImageData(w,h);
 let sum=0,sq=0,changed=0,over16=0,max=0,lensSum=0,lensN=0;
 for(let p=0;p<w*h;p++){let dmax=0;for(let k=0;k<3;k++){const d=Math.abs(a.data[p*4+k]-b.data[p*4+k]);sum+=d;sq+=d*d;max=Math.max(max,d);dmax=Math.max(dmax,d);diff.data[p*4+k]=Math.min(255,d*4);if(Math.hypot(p%w-640,Math.floor(p/w)-480)<330){lensSum+=d;lensN++;}}diff.data[p*4+3]=255;changed+=dmax>0;over16+=dmax>16;}
 ctx.putImageData(diff,0,0);fs.writeFileSync(`${dir}/diff_${t}_x4.png`,c.toBuffer('image/png'));
 const sheet=createCanvas(w*3,h+50),sc=sheet.getContext('2d');sc.fillStyle='#18181c';sc.fillRect(0,0,w*3,h+50);sc.fillStyle='white';sc.font='26px sans-serif';for(const [i,label]of ['REFERENCE','ENGINE RENDER','ABS DIFF x4'].entries())sc.fillText(label,i*w+20,34);sc.drawImage(ref,0,50);sc.drawImage(actual,w,50);sc.drawImage(c,w*2,50);fs.writeFileSync(`${dir}/compare_${t}.png`,sheet.toBuffer('image/png'));
 frames.push({t:Number(t),width:w,height:h,MAE_RGB:sum/(w*h*3),RMSE_RGB:Math.sqrt(sq/(w*h*3)),max_channel_difference:max,changed_pixel_percent:changed/(w*h)*100,pixels_over_16_percent:over16/(w*h)*100,lens_MAE_RGB:lensSum/lensN});
}
// Strict near-identity gate; broad visible differences must block S08.
const passed=frames.every(f=>f.MAE_RGB<=1&&f.pixels_over_16_percent<=1&&f.lens_MAE_RGB<=1);
fs.writeFileSync(`${dir}/metrics.json`,JSON.stringify({passed,threshold:{MAE_RGB:1,pixels_over_16_percent:1,lens_MAE_RGB:1},frames},null,2)+'\n');console.log(JSON.stringify({passed,frames},null,2));
