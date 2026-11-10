// CPU watercolor bake: fixed seed, pigment pooling and soft granulation, no frame-time random.
import {rng,fbm} from './motion.js';
const cache=new Map();
export function bakePigment(key,color,seed){if(cache.has(key))return cache.get(key);const c=document.createElement('canvas');c.width=c.height=2048;const x=c.getContext('2d'),R=rng(seed);x.fillStyle=color;x.fillRect(0,0,2048,2048);
 for(let i=0;i<150;i++){const px=R()*2048,py=R()*2048,r=50+R()*330,g=x.createRadialGradient(px,py,1,px,py,r);g.addColorStop(0,i%2?'rgba(255,245,247,.14)':'rgba(118,55,95,.045)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(px-r,py-r,2*r,2*r);}
 const im=x.getImageData(0,0,2048,2048);for(let i=0;i<im.data.length;i+=4){const grain=(R()-.5)*10;for(let k=0;k<3;k++)im.data[i+k]+=grain;}x.putImageData(im,0,0);cache.set(key,c);return c;}
