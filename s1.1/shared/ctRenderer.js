import { clamp, closedCurve, lerp, mulberry32, organic, scopeSvg, svgId } from './detail/geometry.js';
import { CT, axialFilm } from './detail/ct.js';
import { makeCanvas, retainedCanvas } from './anatomyWatercolor.js';
import { drawRaster, logicalContext, logicalSize, rasterScale } from './detail/raster.js';
import { SANS_FONT } from './fonts.js';

export const CT_ZOOM = 2.4;
export const CT_ROI = Object.freeze({ x: 103, y: 179, width: 151, height: 127 });
export const CT_DISPLAY_PALETTE = Object.freeze({
  gas:'#000000', fat:'#1C2026', fluid:'#2B323D', muscle:'#525B68',
  enhancement:'#8C98A8', thickWall:'#CAD5E3', calcium:'#F2F6FA',
});
const TAU=2*Math.PI;
const width=Math.round(CT_ROI.width*CT_ZOOM), height=Math.round(CT_ROI.height*CT_ZOOM);
const pad=19;
const focus={x:182,y:146};
const gangrenousGas = [[216,129,3.9],[236,135,5.7],[256,149,4.3],[243,170,2.7]];
const vermilion='#C9473B';
const stageNames=['simple','phlegmon','gangrene'];
const cache=new Map();
const smooth = v => { const u=clamp(v); return u*u*(3-2*u); };
let regionalBackdrop;
let preparingBackdrop;

export function prepareCTBackdrop() {
  if (preparingBackdrop) return preparingBackdrop;
  preparingBackdrop = (async () => {
    const native = makeCanvas(width+2*pad,height+2*pad);
    const ratioX=CT_ROI.width/width, ratioY=CT_ROI.height/height;
    const viewBox = [CT_ROI.x-pad*ratioX,CT_ROI.y-pad*ratioY,(width+2*pad)*ratioX,(height+2*pad)*ratioY].join(' ');
    const source=`<svg xmlns="http://www.w3.org/2000/svg" width="${native.width}" height="${native.height}"
      viewBox="${viewBox}" preserveAspectRatio="none">${scopeSvg(axialFilm(''),'regional-tissue')}</svg>`;
    const url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml;charset=utf-8'}));
    try {
      const anatomy=new Image();
      anatomy.src=url;
      await anatomy.decode();
      native.getContext('2d').drawImage(anatomy,0,0);
      regionalBackdrop=native;
      cache.clear();
    } finally {
      URL.revokeObjectURL(url);
    }
  })();
  return preparingBackdrop;
}

function form(ctx, path, color, alpha=1) {
  ctx.save();
  ctx.globalAlpha*=alpha;
  ctx.fillStyle=color;
  ctx.fill(typeof path==='string'?new Path2D(path):path);
  ctx.restore();
}

function contextualFossa(ctx) {
  if (!regionalBackdrop) {
    tissueAtFossa(ctx,68030);
    return;
  }
  drawRaster(ctx,regionalBackdrop,-pad,-pad);
  const size=logicalSize(ctx.canvas);
  const local=makeCanvas(size.width,size.height);
  const scale=rasterScale(local);
  const layer=logicalContext(local,{willReadFrequently:true});
  layer.translate(pad,pad);
  tissueAtFossa(layer,68030);
  const samples=layer.getImageData(0,0,local.width,local.height);
  for(let j=0;j<local.height;j++)for(let i=0;i<local.width;i++){
    const x=i/scale.x-pad,y=j/scale.y-pad,p=(j*local.width+i)*4;
    const radius=Math.hypot((x-184)/166,(y-149)/158);
    const nearerCecum=.69*Math.hypot((x-111)/118,(y-68)/119)+.32;
    const distance=Math.min(radius,nearerCecum);
    samples.data[p+3] *= 1-smooth((distance-.56)/.52);
  }
  layer.putImageData(samples,0,0);
  drawRaster(ctx,local,-pad,-pad);
}

function line(ctx,path,color,width,opacity=1){
  ctx.save();
  ctx.globalAlpha*=opacity;
  ctx.strokeStyle=color;
  ctx.lineWidth=width;
  ctx.stroke(typeof path==='string'?new Path2D(path):path);
  ctx.restore();
}

function dot(ctx,x,y,rx,ry,color,opacity=1,angle=0){
  const path=new Path2D();
  path.ellipse(x,y,rx,ry,angle,0,TAU);
  form(ctx,path,color,opacity);
}

function swatch(ctx,stops,x0,y0,x1,y1) {
  const grad=ctx.createLinearGradient(x0,y0,x1,y1);
  stops.forEach(([at,color])=>grad.addColorStop(at,color));
  return grad;
}

function tissueAtFossa(ctx,seed) {
  const rand=mulberry32(seed);
  const CTU=CT_DISPLAY_PALETTE;
  ctx.fillStyle=CTU.fat;
  ctx.fillRect(-pad,-pad,width+2*pad,height+2*pad);

  const septum='M-36 64 C17 36 35 51 66 81 C93 112 125 129 162 135 C131 154 117 145 107 176 C96 202 86 233 151 283 L68 328 L-39 188Z';
  form(ctx,septum,swatch(ctx,[[0,'#3F474E'],[.54,'#252B33'],[1,'#2F363F']],0,102,103,298),.69);

  // Right cecum abuts the appendiceal base. A dependent fluid level lies below the gas cap.
  const cecalWall='M-39 7 C10 -16 51 -29 93 -13 C133 1 149 13 160 40 C170 69 159 88 173 105 C176 126 160 139 146 140 C112 142 101 125 85 124 C54 123 28 116 7 89 C-18 60 -41 58 -39 7Z';
  const bowelLumen='M-33 14 C12 -7 56 -19 92 -5 C127 8 142 22 151 46 C161 67 151 86 164 106 C165 122 148 132 133 129 C110 129 101 119 85 116 C50 118 34 104 14 82 C-7 55 -38 52 -33 14Z';
  form(ctx,cecalWall,swatch(ctx,[[0,'#424A57'],[.53,CTU.muscle],[1,'#68717D']],44,-20,139,144));
  line(ctx,cecalWall,'#818D9C',2.1,.61);
  form(ctx,bowelLumen,CTU.gas);
  ctx.save();
  ctx.clip(new Path2D(bowelLumen));
  ctx.fillStyle=swatch(ctx,[[0,'#383E48'],[.28,'#353D47'],[1,'#414853']],0,56,0,138);
  ctx.fillRect(-45,56,240,106);
  line(ctx,'M-31 56 H159','#7B828A',1.15,.56);
  for(let i=0;i<22;i++){
    const x=7+rand()*155,y=61+rand()*76;
    dot(ctx,x,y,1.75+rand()*4.2,1.07+rand()*1.75,i%4?'#62676D':'#14171B',.22+rand()*.31,rand()*3.2);
  }
  ctx.restore();
  for(const p of ['M25 14 C39 20 46 35 48 53','M73 5 Q86 21 76 39',
    'M139 76 Q136 100 149 109','M110 111 Q115 124 134 128']) line(ctx,p,'#5C6471',2.3,.60);

  const adjacentLoop='M189 -21 C223 -35 282 -17 302 6 C318 28 309 52 276 57 C249 61 247 86 221 84 C201 80 198 52 192 27 C179 14 175 3 189 -21Z';
  const adjacentInner='M199 -16 C235 -27 273 -12 291 4 C303 21 297 42 269 48 C233 52 245 73 222 72 C207 70 211 39 201 24 C190 10 190 0 199 -16Z';
  form(ctx,adjacentLoop,'#555D68',.92);
  form(ctx,adjacentInner,'#292F38');
  form(ctx,organic(269,17,18,14,seed+61,.44,.55,18),'#12161B');
  line(ctx,'M228 9 Q212 25 221 50','#59626B',2.4,.67);

  const iliac='M-43 129 C4 136 16 174 42 212 C66 248 95 258 132 295 C147 310 157 328 174 347 L120 359 C101 316 70 306 44 274 C7 239 -20 219 -45 198Z';
  const marrow='M-39 151 C-6 153 6 193 36 229 C60 258 96 280 120 308 C132 326 139 343 151 355 L134 359 C107 326 82 308 55 285 C26 260 7 237 -22 215 L-49 185Z';
  form(ctx,iliac,CTU.calcium);
  form(ctx,marrow,swatch(ctx,[[0,'#777B83'],[.54,'#8D8B8D'],[1,'#6C7280']],-4,185,136,314));
  ctx.save();
  ctx.clip(new Path2D(marrow));
  for(let i=0;i<103;i++){
    const x=-22+rand()*174,y=153+rand()*187;
    dot(ctx,x,y,1.28+rand()*2.71,.78+rand()*1.4,i%3?'#B6B7BC':'#4A505B',.26+rand()*.43,rand()*TAU);
  }
  ctx.restore();
  line(ctx,iliac,'#C9D1DD',1.1,.49);

  const iliacus='M-29 111 C23 127 46 166 64 197 C77 221 100 245 116 262 Q88 259 74 244 C51 217 26 203 15 177 C-5 146 -17 155 -29 147Z';
  form(ctx,iliacus,swatch(ctx,[[0,'#3D4551'],[.55,CTU.muscle],[1,'#494F59']],-9,128,125,268),.88);
  line(ctx,'M-6 133 C23 146 43 193 65 221 Q84 245 105 256','#69737E',1.65,.59);

  const psoas='M444 191 C399 159 374 147 332 157 C299 164 282 189 276 223 C263 263 265 311 301 343 C334 366 402 365 439 326Z';
  form(ctx,psoas,swatch(ctx,[[0,'#404853'],[.48,CTU.muscle],[1,'#636975']],265,193,398,308));
  line(ctx,psoas,'#77818E',2,.61);
  ctx.save();
  ctx.clip(new Path2D(psoas));
  for(let i=0;i<49;i++){
    const x=278+rand()*127,y=168+rand()*161,l=9+rand()*45;
    line(ctx,`M${x} ${y} q-4 ${l*.53} -1 ${l}`,i%3?'#666D78':'#424953',.7+rand()*1.0,.23+rand()*.28);
  }
  ctx.restore();
}

function valueNoise(seed) {
  function at(x,y) {
    let hash = Math.imul(x+517,1597334677) ^ Math.imul(y+771,3812015801) ^ seed;
    hash = Math.imul(hash ^ (hash>>>16),2246822519);
    hash = Math.imul(hash ^ (hash>>>13),3266489917);
    return ((hash ^ (hash>>>16))>>>0)/4294967295;
  }
  return (x,y) => {
    const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);
    return lerp(lerp(at(ix,iy),at(ix+1,iy),fx),lerp(at(ix,iy+1),at(ix+1,iy+1),fx),fy);
  };
}

function fatCloud(ctx,seed,stage) {
  const val=valueNoise(seed);
  const octaves=3,side=122,half=side>>1;
  const layer=makeCanvas(side,side), temp=layer.getContext('2d');
  const n=layer.width, scale=n/side;
  const image=temp.createImageData(n,n);
  const alpha=new Float32Array(n*n);
  const asym=(x,y) => .96*Math.exp(-((x-36)**2/950+(y-15)**2/526))
    + .48*Math.exp(-((x+24)**2/530+(y-7)**2/500))
    + .51*Math.exp(-((x-12)**2/620+(y-38)**2/435));
  let voxels=0;
  for(let j=0;j<n;j++) for(let i=0;i<n;i++){
    const x=i/scale-half,y=j/scale-half,r=Math.hypot(x,y);
    if(r<12||r>58)continue;
    const fib=.56*val(x*.049+31,y*.062+17)
      + .29*val(x*.098+84,y*.124-8)
      + .15*val(x*.196-6,y*.248+63);
    const thickness = smooth((r-12)/6)*smooth((58-r)/12);
    const lobe = clamp(asym(x,y)*1.43);
    const a=thickness*(.28+.43*fib)*smooth((lobe-.10)/.67)*smooth((fib-.18)/.27)*(stage==='gangrene'?.82:1.0);
    if(a<.012)continue;
    const index=j*n+i,p=index*4;
    alpha[index]=a;
    const attenuation = lerp(81,130,fib);
    image.data[p]=image.data[p+1]=image.data[p+2]=attenuation;
    image.data[p+3]=255*a;
    voxels++;
  }
  let opposed=0,total=0;
  for(let j=1;j<n-1;j++)for(let i=1;i<n-1;i++){
    const p=j*n+i,q=(n-j)*n+(n-i);
    if(alpha[p]===0&&alpha[q]===0)continue;
    opposed+=Math.abs(alpha[p]-alpha[q]);
    total++;
  }
  temp.putImageData(image,0,0);
  drawRaster(ctx,layer,focus.x-half,focus.y-half);

  const rand=mulberry32(seed+173);
  const startPoints=[[137,153],[144,163],[153,184],[165,124],[184,177],[199,188],
                     [210,160],[214,181],[217,191],[229,149],[229,163],[224,178],[243,159],[241,185],[239,178]];
  const traces=[];
  for(const [i,[x,y]] of startPoints.entries()) {
    const x0=x+(rand()-.50)*5, y0=y+(rand()-.50)*5;
    const a=(rand()-.50)*2.44+(i%3===0?.84:-.48);
    const l=9+rand()*20;
    const ux=Math.cos(a),uy=Math.sin(a);
    const bend=(rand()-.51)*11;
    const path=`M${x0} ${y0} q${l*ux*.32-bend*uy} ${l*uy*.32+bend*ux} ${l*ux*.63} ${l*uy*.63}
      m${l*ux*.11} ${l*uy*.11} q${l*ux*.14} ${l*uy*.19-bend*.20} ${l*ux*.35} ${l*uy*.32}`;
    ctx.save();
    ctx.filter='blur(.62px)';
    line(ctx,path,'#919191',1.35+rand()*.98,.39+rand()*.25);
    ctx.restore();
    traces.push([x0,y0,a]);
  }
  return {
    octaves, voxels, oppositeDelta:opposed/total, strands:traces.length,
    radialPaths:traces.filter(([x,y,a])=>Math.hypot(x-focus.x,y-focus.y)<5 && Number.isFinite(a)).length,
  };
}

function shapeRing(cx,cy,rx,ry,seed,outerRadius,innerRadius,gap=0) {
  const wobble=a=>1+.038*Math.sin(3*a+seed)+.024*Math.sin(7*a+seed*.15)+.016*Math.cos(a*12+.3);
  const begin=gap ? .19+gap*.5 : 0;
  const extent=TAU-gap;
  const points=(radius,flip)=>Array.from({length:115},(_,j)=>{
    const index=flip?114-j:j;
    const a=begin+extent*index/114;
    const r=radius*(wobble(a)+(gap&&(index<3||index>111)?(index%3-1)*.032:0));
    return [cx+Math.cos(a)*rx*r,cy+Math.sin(a)*ry*r];
  });
  const d = 'M'+points(outerRadius,false).join('L')+'L'+points(innerRadius,true).join('L')+'Z';
  return new Path2D(d);
}

function simpleAppendix(ctx) {
  const tube='M153 117 C164 117 172 123 177 137 C187 154 197 163 213 166 Q226 168 238 158';
  ctx.save();
  ctx.filter='blur(1.25px)';
  line(ctx,tube,'#607080',27.0,.70);
  ctx.restore();
  ctx.save();
  ctx.filter='blur(.51px)';
  line(ctx,tube,'#8E9AA8',26);
  line(ctx,tube,'#2D3440',19.1);
  line(ctx,'M173 133 C184 151 199 162 217 164','#424A58',5.3,.64);
  ctx.restore();
}

function swollenAppendix(ctx,stage,seed){
  const {x,y}=focus;
  const necrotic=stage==='gangrene';
  const gap=necrotic?57*Math.PI/180:0;
  const stalk='M151 117 Q163 119 174 125 L177 127';
  const gapAngle=gap*180/Math.PI;
  const stranding=fatCloud(ctx,seed,stage);
  if(necrotic){
    const pool='M201 139 C187 134 189 121 204 119 C215 117 219 125 226 127 C240 120 249 130 251 139 C262 144 271 142 273 156 C284 168 274 181 261 176 C249 198 240 180 232 177 C219 183 204 176 205 166 C194 157 197 145 201 139Z';
    ctx.save();
    ctx.filter='blur(2px)';
    line(ctx,pool,'#9F9F9F',4.2,.76);
    ctx.restore();
    form(ctx,pool,'#272E39');
    form(ctx,organic(240,155,28,16,seed+94,.39,.2,22),'#303846',.42);
    line(ctx,pool,'#858585',1.5,.58);
  }
  ctx.save();
  ctx.filter='blur(.58px)';
  line(ctx,stalk,'#788694',22.0,.87);
  line(ctx,stalk,CT_DISPLAY_PALETTE.fluid,14.1,.97);
  dot(ctx,x,y,22,19.2,necrotic?'#2A313C':CT_DISPLAY_PALETTE.fluid);
  for(const [outside,inside,a] of [[1,.822,'#B8C5D4'],[.832,.572,'#6E7A8A'],[.582,.38,'#D0DBE8']]){
    form(ctx,shapeRing(x,y,22,19.2,seed%31,outside,inside,gap),a);
  }
  ctx.restore();
  if(!necrotic){
    dot(ctx,x+2.8,y-1.7,5.1,3.57,'#DCE3EE',.64,-.47);
    dot(ctx,x+2.8,y-1.7,3.88,2.68,'#F8FBFF',1,-.47);
  }
  return {stranding,gapAngle};
}

function exposePixels(ctx,seed) {
  const w=ctx.canvas.width,h=ctx.canvas.height;
  const scale=rasterScale(ctx.canvas);
  const image=ctx.getImageData(0,0,w,h);
  const rand=mulberry32(seed);
  let total=0, squares=0, appliedTotal=0, appliedSquares=0, n=0, applied=0;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const p=(j*w+i)*4;
    const noise=5.5*Math.sqrt(-2*Math.log(Math.max(rand(),1e-12)))*Math.cos(TAU*rand());
    const before=Math.round(.2126*image.data[p]+.7152*image.data[p+1]+.0722*image.data[p+2]);
    image.data[p]=image.data[p+1]=image.data[p+2]=before+noise;
    if(i/scale.x>=pad&&i/scale.x<pad+width&&j/scale.y>=pad&&j/scale.y<pad+height){
      total+=noise; squares+=noise*noise; n++;
      const diff=image.data[p+1]-before;
      appliedTotal+=diff; appliedSquares+=diff*diff; applied++;
    }
  }
  ctx.putImageData(image,0,0);
  return {
    sigma:Math.sqrt(squares/n-(total/n)**2),
    effectiveSigma:Math.sqrt(appliedSquares/applied-(appliedTotal/applied)**2),
    samples:n,
  };
}

function regionField(stage){
  if(cache.has(stage))return cache.get(stage);
  const seed=stage==='simple'?5091:stage==='phlegmon'?7367:11737;
  const field=makeCanvas(width+2*pad,height+2*pad);
  const ctx=logicalContext(field,{alpha:true,willReadFrequently:true});
  const scale=rasterScale(field);
  ctx.translate(pad,pad);
  ctx.lineCap='round';
  ctx.lineJoin='round';
  contextualFossa(ctx);
  let pathology={stranding:null,gapAngle:0};
  if(stage==='simple')simpleAppendix(ctx);
  else pathology=swollenAppendix(ctx,stage,seed);
  const noise=exposePixels(ctx,seed+5303);
  const air = stage === 'gangrene' ? gangrenousGas : [];
  // Preserve sharp black extraluminal air in the final CT window.
  for(const [i,[x,y,r]] of air.entries())dot(ctx,x,y,r,r*(.87+i*.031),CT_DISPLAY_PALETTE.gas,1,i*.43);
  const view=makeCanvas(width,height);
  const viewContext=view.getContext('2d',{willReadFrequently:true});
  const left=Math.round(pad*scale.x), top=Math.round(pad*scale.y);
  viewContext.drawImage(field,left,top,view.width,view.height,0,0,view.width,view.height);

  const pixels=ctx.getImageData(0,0,field.width,field.height);
  for(let j=0;j<field.height;j++)for(let i=0;i<field.width;i++){
    const a=smooth(Math.min(i/scale.x,j/scale.y,(field.width-1-i)/scale.x,(field.height-1-j)/scale.y)/(pad-1));
    pixels.data[(j*field.width+i)*4+3]*=a;
  }
  ctx.putImageData(pixels,0,0);
  const mainCrop=ctx.getImageData(left,top,view.width,view.height).data;
  const zoomCrop=viewContext.getImageData(0,0,view.width,view.height).data;
  const sameSource=mainCrop.every((value,i)=>value===zoomCrop[i]);
  const result={field,view,audit:{...pathology,gasBubbles:air.length,airCenters:air.map(([x,y])=>[x,y]),
    noise,multiplier:CT_ZOOM,sameSource}};
  cache.set(stage,result);
  return result;
}

/** The crop and the bridge into the main view use the same synthesized pixel field. */
export function createCTAsset({id,stage='simple',x=0,y=0,scale=1}={}){
  id=svgId('ct-asset',id);
  if(!stageNames.includes(stage))throw new RangeError('Unknown CT stage');
  if(![x,y,scale].every(Number.isFinite)||scale<=0)throw new RangeError('Invalid CT asset placement');
  const roi=CT_ROI, fossa=regionField(stage);
  const zoom={x:CT.width+35,y:83,width:roi.width*CT_ZOOM,height:roi.height*CT_ZOOM};
  const trace=`M${roi.x+roi.width} ${roi.y+roi.height} L${CT.width-88} ${zoom.y+zoom.height+32} H${CT.width+10} L${zoom.x} ${zoom.y+zoom.height-13}`;
  const source=retainedCanvas(`${id}-fossa`,fossa.field,{
    x:roi.x-pad*roi.width/width,y:roi.y-pad*roi.height/height,
    width:roi.width*(width+2*pad)/width,height:roi.height*(height+2*pad)/height,
  });
  const view=retainedCanvas(`${id}-zoom`,fossa.view,zoom);
  const paint=`<g transform="translate(${x} ${y}) scale(${scale})">
    ${scopeSvg(axialFilm(''),id)}${source.markup}
    <rect x="${roi.x}" y="${roi.y}" width="${roi.width}" height="${roi.height}" fill="none" stroke="${vermilion}" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="8 6"/>
    <path d="${trace}" fill="none" stroke="${vermilion}" stroke-width="2.4" stroke-dasharray="7 5" opacity=".87"/>
    ${view.markup}
    <rect x="${zoom.x}" y="${zoom.y}" width="${zoom.width}" height="${zoom.height}" fill="none" stroke="${vermilion}" stroke-width="3.0"/>
  </g>`;
  const size=Math.max(16,29*scale), markerY=y+16+size*.77;
  const lettering=`<g fill="#FFFDF9" font-family="${SANS_FONT}" font-size="${size}" font-weight="720">
    <text x="${x+16}" y="${markerY}">R</text>
    <text x="${x+CT.width*scale-16}" y="${markerY}" text-anchor="end">L</text>
  </g>
  <text x="${x+(zoom.x+zoom.width/2)*scale}" y="${y+zoom.y*scale-11}" text-anchor="middle" class="ct-magnification">右髂窝 · 2.4×</text>`;
  return {
    paint,lettering,audit:fossa.audit,zoomFactor:CT_ZOOM,
    appendix:{x:x+(roi.x+focus.x/CT_ZOOM)*scale,y:y+(roi.y+focus.y/CT_ZOOM)*scale},
    main:{x,y,width:CT.width*scale,height:CT.height*scale},
    zoom:{x:x+zoom.x*scale,y:y+zoom.y*scale,width:zoom.width*scale,height:zoom.height*scale},
    mount(svg){source.mount(svg);view.mount(svg);},
  };
}
