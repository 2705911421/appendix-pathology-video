// Card-local, deterministic drawing; all copy and layout live beside this module.
export const endcardData = await fetch(new URL('./data/endcard.json', import.meta.url)).then(r => { if (!r.ok) throw new Error('Cannot load endcard.json'); return r.json(); });
const D=endcardData,L=D.layout,C=D.colors;
export function bakeEndCard(bake) { /* No external washes or scene registration required. */ }
const smooth=(t,[a,b])=>{const v=Math.max(0,Math.min(1,(t-a)/(b-a)));return v*v*(3-2*v);};
function text(ctx,s,x,y,size,weight=400,alpha=1,align='left',col=C.ink) {
 ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=col;ctx.font=`${weight} ${size}px MixSans, "Noto Sans CJK SC", "Noto Sans SC", sans-serif`;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(s,x,y);ctx.restore();
}
function heading(ctx,s,y) {ctx.save();ctx.fillStyle=C.red;ctx.fillRect(L.x,y-24,32,4);ctx.restore();text(ctx,s,L.x+50,y,30,700,1,'left',C.red);}
function frame(ctx) {
 for (const [x,y,r] of [[175,95,255],[1735,800,210]]) {const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(214,69,58,.085)');g.addColorStop(.6,'rgba(214,69,58,.025)');g.addColorStop(1,'rgba(214,69,58,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
 const [x,y,w,h]=L.frame;globalThis.rough.canvas(ctx.canvas).rectangle(x,y,w,h,{seed:71,stroke:C.ink,strokeWidth:1.2,roughness:.65,bowing:.4});ctx.fillStyle=C.ink;
}
function cardA(ctx) {
 text(ctx,D.titleLines[0],960,L.titleY,L.titleSize,700,1,'center');text(ctx,D.titleLines[1],960,L.subtitleY,L.subtitleSize,500,.75,'center');
 ctx.save();ctx.strokeStyle=C.ink;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(360,L.subtitleY+28);ctx.lineTo(1560,L.subtitleY+28);ctx.stroke();ctx.restore();
 heading(ctx,D.creationHeading,L.aHeadingY);text(ctx,D.intro,L.x,L.introY,L.bodySize);
 let cellY=L.cellY;D.cells.forEach(lines=>{lines.forEach((s,j)=>text(ctx,s,L.x+(j?20:0),cellY+j*L.bodyLeading,L.bodySize));cellY+=L.cellRow+(lines.length-1)*L.bodyLeading;});
 D.notes.forEach((s,j)=>text(ctx,s,L.x,L.notesY+j*L.bodyLeading,25,400,.8));
}
function cardB(ctx) {
 heading(ctx,D.musicHeading,L.musicHeadingY);D.music.forEach((s,i)=>text(ctx,s,L.x,L.musicY+i*L.musicLeading,L.musicSize,400,i===1?.75:1));heading(ctx,D.refsHeading,L.refsHeadingY);
 let y=L.refsY;D.references.forEach((r,i)=>{r.lines.forEach((s,j)=>{text(ctx,s,L.x+(j?L.hanging:0),y,L.refSize);y+=L.refLeading;});if(i===1){text(ctx,D.pending,L.x+L.hanging,y,L.refSize,400,.75);y+=L.refLeading;}y+=L.refGap;});
}
export function drawEndCard(ctx,t,{start=0,duration=12}={}) {
 const u=(t-start)*12/duration;if(u<0||u>=12)return;
 ctx.save();ctx.textBaseline='alphabetic';frame(ctx);
 const a=smooth(u,D.timing.aIn)*(1-smooth(u,D.timing.aOut)),b=smooth(u,D.timing.bIn);
 ctx.save();ctx.globalAlpha*=a;cardA(ctx);ctx.restore();ctx.save();ctx.globalAlpha*=b;cardB(ctx);ctx.restore();ctx.restore();
}
