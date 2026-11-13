import fs from 'node:fs';
import {loadChromium,launch,serve,resolveTarget,openPage} from '../e04_s19/renderer/lib/browser.mjs';
const base='/workspace/病理科普视频/';const configs=[];
for(const n of ['02','03','04','06','07','08','09','10','11','12','13','14','15','16','19']){
 const scene='s'+n;let dir,key;
 if(['04','09','12','15'].includes(n))dir=base+'v5_ct_dev/qa/v6/ct_real_adv01/S'+n;
 else if(['02','03','16'].includes(n))dir=base+'v5_clin_dev/qa/v6/clin/S'+n;
 else if(n==='13')dir=base+'v5_mech_dev/qa/v6/mech/s13_adv01';
 else dir='qa/v6/'+({'06':'h06_adv/s06','07':'h06_adv/s07','08':'b10','10':'c03_s10','11':'d01_s11','14':'f03_s14','19':'e12_s19'}[n]);
 key=['06','07'].includes(n)?JSON.parse(fs.readFileSync('qa/v6/h06_adv/'+scene+'_keyframes.json')):n==='08'?{picks:JSON.parse(fs.readFileSync('qa/v6/c03_s10/s08_times.json')).map((t,i)=>({t,name:['s08_low','s08_mid','s08_high_s30','s08_high_s31','s08_high_s32','s08_high_s33','s08_high_s34'][i]}))}:JSON.parse(fs.readFileSync(dir+'/keyframes.json'));
 configs.push({scene,dir,key});
}
fs.writeFileSync('qa/v6/a02/configs.json',JSON.stringify(configs,null,2));
const target=resolveTarget('film'),chromium=await loadChromium(target.root),{server,port}=await serve(target.root),browser=await launch(chromium);
try{for(const {scene,key} of configs.filter(c=>!process.argv[2]||c.scene===process.argv[2])){const out='qa/v6/a02/'+scene;fs.mkdirSync(out,{recursive:true});const page=await openPage(browser,{port,rel:target.rel,w:1920,h:1080,dpr:1,query:'scene='+scene});for(const p of key.picks){const t=['s06','s07','s08'].includes(scene)?p.t:Number(p.t.toFixed(6));const b=await page.evaluate(t=>{window.render(t);return document.getElementById('c').toDataURL().split(',')[1]},t);fs.writeFileSync(out+'/'+p.name+'.png',Buffer.from(b,'base64'));}console.log(scene+' done');await page.close();}}finally{await browser.close();server.close();}
