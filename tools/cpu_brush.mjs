// CPU preview only: Canvas2D recipe shim for p5/brush. Production uses real p5.brush.
// The legacy wash engine still performs all alpha conversion, bleed, dry edge, HD grain.
export function installCPUBrush(createCanvas){let c,ctx,col,alpha,seed=1,bleed=.5;
 globalThis.p5=class{constructor(fn){const p={WEBGL:'webgl',createCanvas(w,h){c=createCanvas(w,h);ctx=c.getContext('2d');p.canvas=c;},pixelDensity(){},noLoop(){},clear(){ctx.clearRect(0,0,c.width,c.height);},randomSeed(s){seed=s;},noiseSeed(){}};fn(p);p.setup();}};
 const R=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 globalThis.brush={instance(){},seed(s){seed=s;},scaleBrushes(){},noStroke(){},noFill(){},fill(v,a){col=v;alpha=a/255;},fillBleed(v){bleed=v;},fillTexture(){},reDraw(){},polygon(pts){ctx.save();ctx.translate(512,512);ctx.fillStyle=col;for(let k=0;k<9;k++){ctx.globalAlpha=alpha/7;ctx.beginPath();pts.forEach(([x,y],i)=>{x+=(R()-.5)*bleed*18;y+=(R()-.5)*bleed*18;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.fill();}ctx.restore();}};
}
