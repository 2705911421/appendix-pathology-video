import path from 'node:path';
import {loadChromium,launch,serve,openPage} from '/workspace/garden-skills/skills/motion-showreel/scripts/lib/browser.mjs';
const root=path.resolve('film'),{server,port}=await serve(root);
const browser=await launch(await loadChromium(root));
try {
 const page=await openPage(browser,{port,rel:'index.html',w:1920,h:1080,query:'scene=gross_test'});
 await page.evaluate(()=>{
  window.textBoxes=[];
  const orig=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){
   if(this.canvas.id==='c') {
    const m=this.measureText(text),tr=this.getTransform();
    const a=this.textAlign==='right'||this.textAlign==='end'?m.width:this.textAlign==='center'?m.width/2:0;
    const p=tr.transformPoint({x:x-a,y:y-m.actualBoundingBoxAscent}),q=tr.transformPoint({x:x-a+m.width,y:y+m.actualBoundingBoxDescent});
    window.textBoxes.push({text,x0:p.x,y0:p.y,x1:q.x,y1:q.y});
   }
   return orig.call(this,text,x,y,...rest);
  };
 });
 for(let stage=0;stage<4;stage++) {
  const boxes=await page.evaluate(t=>{window.textBoxes=[];window.render(t);return window.textBoxes;},stage);
  for(const b of boxes)if(/[0-9]/.test(b.text)||b.y1>=950||b.x0<0||b.x1>1920)throw Error('invalid text '+JSON.stringify(b));
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
   const a=boxes[i],b=boxes[j];
   if(a.text!==b.text&&Math.min(a.x1,b.x1)>Math.max(a.x0,b.x0)&&Math.min(a.y1,b.y1)>Math.max(a.y0,b.y0))throw Error('overlap '+a.text+' / '+b.text);
  }
  console.log('PASS stage',stage,':',boxes.length,'text boxes; no overlap or digits; max y',Math.max(...boxes.map(b=>b.y1)).toFixed(1));
 }
} finally {await browser.close();server.close();}
