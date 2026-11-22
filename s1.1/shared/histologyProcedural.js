import { brace, clamp, closedCurve, lerp, mulberry32, organic, round, roughProp, svgId } from './canvasCore.js';
import { makeCanvas, paintWatercolor, retainedCanvas } from './anatomyWatercolor.js';
import { drawRaster, logicalContext, rasterScale } from './detail/raster.js';

export const HISTOLOGY_DIAMETER = 520;
const D = HISTOLOGY_DIAMETER, R = D / 2, TAU = 2 * Math.PI;
const WHITE = '#FDF9FB';
const TISSUE = '#F1D8E5';
const MATRIX = 'rgba(232,168,196,0.14)';
const MUSCLE = 'rgba(218,118,158,0.22)';
const PURE_NUCLEUS = '#361366';
const hematoxylin = '#4A1F85';
export const SIMPLE_MUSCLE_NEUTROPHILS = Object.freeze([[143,349],[226,401],[319,363],[390,433]].map(Object.freeze));
const presets = {
  normal: { crypts: 44, follicles: 7, vessels: 11, muscleStrokes: 90, muscleNuclei: 180 },
  simple: { crypts: 14, vessels: 8, shallow: 228, muscle: SIMPLE_MUSCLE_NEUTROPHILS.length, muscleStrokes: 65, muscleNuclei: 150 },
  phlegmon: { crypts: 5, vessels: 9, shallow: 550, muscle: 400, freePus: 25, serosalPus: 190, fibrin: 68 },
  gangrene: { crypts: 0, clouds: 21, ghostField: 408, thrombosed: 6, fissurePus: 132, fissureRedCells: 102 },
  chronic: { crypts: 7, bundles: 26, fibroblasts: 100, clusters: 6, vessels: 4,
    lymphocytes: 206, plasmaCells: 50, laminaNuclei: 108, serosalVessels: 2, serosalLymphocytes: 14 },
};
export function histologyRecipe(stage) {
  if (!Object.hasOwn(presets, stage)) throw new RangeError('Unknown histology stage');
  return { ...presets[stage] };
}

function ell(ctx, x, y, rx, ry, color, alpha = 1, angle = 0, rim) {
  const previous = ctx.globalAlpha;
  ctx.globalAlpha = previous * alpha;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, angle, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
  if (rim) {
    ctx.strokeStyle = rim;
    ctx.lineWidth = .5;
    ctx.stroke();
  }
  ctx.globalAlpha = previous;
}

function area(ctx, path, color, alpha = 1, rule = 'nonzero') {
  const previous = ctx.globalAlpha;
  ctx.globalAlpha = previous * alpha;
  ctx.fillStyle = color;
  ctx.fill(typeof path === 'string' ? new Path2D(path) : path, rule);
  ctx.globalAlpha = previous;
}

function trace(ctx, path, color, width, alpha = 1) {
  const previous = ctx.globalAlpha;
  ctx.globalAlpha = previous * alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke(typeof path === 'string' ? new Path2D(path) : path);
  ctx.globalAlpha = previous;
}

function around(cx, cy, rx, ry, p) {
  const path = new Path2D();
  path.ellipse(cx, cy, rx, ry, p ?? 0, 0, TAU);
  return path;
}

const spiral = (theta, scale, fn, count = 110) => Array.from({ length: count }, (_, i) => fn(theta + i / count * TAU, scale));
const inside = (x,y, pad=0) => (x-R)**2 + (y-R)**2 <= (R-pad)**2;

/** Clock the epithelial beads by arc length with a seeded displacement of at most half a pixel. */
export function drawCryptBeadRing(ctx, cx, cy, rx, ry, angle, seed, { atrophic = false } = {}) {
  const rand = mulberry32(seed);
  const bend = (rand() - .5) * rx * .41;
  const centre = t => [rx * Math.cos(t) + bend * Math.sin(t) ** 3, ry * Math.sin(t)];
  const ring = closedCurve(spiral(0, 1, t => centre(t), 88));
  const cavity = closedCurve(spiral(0, 1, t => {
    const [x,y] = centre(t);
    return [x * (atrophic ? .57 : .77), y * (atrophic ? .81 : .950)];
  }, 88));
  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(angle);
  area(ctx, ring, '#DD9EBF', atrophic ? .46 : .31);
  trace(ctx, ring, '#A5689E', .75, atrophic ? .27 : .45);
  area(ctx, cavity, atrophic ? 'rgba(247,223,236,.46)' : 'rgba(255,253,254,.88)');
  const n = 4 + Math.floor(rand() * 5);
  for (let i = 0; i < n; i++) {
    const t = (i + .24 + rand() * .45) / n * TAU;
    const [x,y] = centre(t);
    const scale = atrophic ? .59 : 1;
    ell(ctx, x * .64, y * .83, scale * (1.57 + rand() * .93), scale * (1.57 + rand() * 1.14),
      'rgba(242,246,252,.90)', 1, -.23 + rand() * .55, '#AD91C2');
  }
  const intervals = [{ theta: 0, length: 0 }];
  let prev = centre(0);
  for (let i = 1; i <= 160; i++) {
    const theta = i * TAU / 160;
    const next = centre(theta);
    intervals.push({ theta, length: intervals.at(-1).length + Math.hypot(next[0] - prev[0], next[1] - prev[1]) });
    prev = next;
  }
  let cursor = 1;
  for (let p = rand() * 2.8; p < intervals.at(-1).length; p += (atrophic ? 2.18 : 3) + rand() * .6) {
    while (intervals[cursor].length < p) cursor++;
    const a = intervals[cursor - 1], b = intervals[cursor];
    const [x,y] = centre(lerp(a.theta,b.theta,(p-a.length)/(b.length-a.length)));
    ell(ctx, x + (rand() - .5), y + (rand() - .5), 1.0, .70, '#441B7A', .88, Math.atan2(-y,-x));
  }
  ctx.restore();
}

export function drawLymphoidFollicleCloud(ctx, cx, cy, baseR, seed) {
  const rand = mulberry32(seed);
  const [a,b,c] = [rand()*TAU,rand()*TAU,rand()*TAU];
  const edge = t => baseR * (1 + .14*Math.sin(2*t+a) + .09*Math.cos(3*t+b) + .06*Math.sin(5*t+c));
  const n = 160 + Math.floor(rand()*61);
  const mantle = Math.round(.72*n);
  area(ctx, closedCurve(spiral(0,1,t => [cx+Math.cos(t)*edge(t),cy+Math.sin(t)*edge(t)])), 'rgba(120,82,165,.10)');
  for (let i=0; i<n; i++) {
    let t, fraction;
    do {
      t = rand()*TAU;
      fraction = i < mantle ? .52 + rand()*.50 : .519*Math.sqrt(rand());
    } while (i < mantle && fraction > .90 && rand() < (fraction-.90)*6.2);
    const radius = fraction * edge(t);
    const size = i < mantle ? .75 + rand()*.30 : 1 + rand()*.30;
    ell(ctx,cx+Math.cos(t)*radius,cy+Math.sin(t)*radius,size,size,
      i<mantle ? '#2F105C' : '#6F4B9E', i<mantle ? .85+rand()*.13 : .45+rand()*.23);
  }
  return n;
}

export function drawMicroNeutrophil(ctx, x, y, seed, opts = {}) {
  const { alpha = 1, karyorrhexis = false, color = '#351264', scale = 1 } = typeof opts === 'number'
    ? { scale: opts } : opts;
  const rand = mulberry32(seed);
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(rand()*TAU);
  ctx.scale(scale,scale);
  ctx.globalAlpha *= alpha;
  if (karyorrhexis) {
    ell(ctx,0,0,5.2,4.96,'rgba(245,240,224,.48)');
    const count = 4 + Math.floor(rand()*3);
    for(let i=0; i<count; i++) {
      const a = (i + rand()*.62) * TAU / count;
      const r = 1.51 + rand()*1.66;
      const s = .45 + rand()*.25;
      ell(ctx, Math.cos(a)*r, Math.sin(a)*r, s, s*(.85+rand()*.15), '#2B123E', .91, rand()*TAU);
    }
  } else {
    ell(ctx,0,0,4,3.78,'rgba(232,206,238,.26)');
    const plan = rand() < .53 ? [[-1.83,.46],[-.10,-1.61],[1.85,.31]] :
      [[-1.88,.57],[-.79,-1.56],[1.07,-1.55],[1.88,.71]];
    const points = plan.map(([x,y]) => [x + (rand()-.5)*.26,y + (rand()-.5)*.25]);
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for(let i=1; i<points.length; i++) {
      const a=points[i-1], b=points[i];
      ctx.quadraticCurveTo((a[0]+b[0])/2,(a[1]+b[1])/2+.35,b[0],b[1]);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = .65;
    ctx.stroke();
    for(const [x,y] of points) ell(ctx,x,y,.75+rand()*.20,.75+rand()*.20,color,.96,rand()*2.3);
  }
  ctx.restore();
}

function redCell(ctx,x,y,angle,shade,opacity=1) {
  ell(ctx,x,y,2.6,1.9,shade,opacity,angle);
  ell(ctx,x,y,1.03,.64,'#F69B9B',.69*opacity,angle);
}

export function drawCongestedVessel(ctx,x,y,rx,ry,angle,seed) {
  const rand = mulberry32(seed);
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(angle);
  const body = new Path2D(organic(0,0,rx,ry,seed,.15,.09,22));
  area(ctx,body,'#F4C3CF',.86);
  trace(ctx,body,'#CE6884',1.4);
  ctx.save();
  ctx.clip(body);
  const n = 6+Math.floor(rand()*13);
  const a = rand()*TAU;
  for(let i=0; i<n; i++) {
    const t = 2.399963*i+a;
    const r = Math.sqrt((i+.22)/n) * .88;
    redCell(ctx,Math.cos(t)*rx*r,Math.sin(t)*ry*r,rand()*Math.PI,
      i%3 === 0 ? '#EC747C' : '#DC4C58',.94);
  }
  ctx.restore();
  const endothelium = 2+Math.floor(rand()*3);
  for(let i=0;i<endothelium;i++){
    const a=i*TAU/endothelium + rand()*.37;
    ell(ctx,Math.cos(a)*rx*.93,Math.sin(a)*ry*.87,2.5,.67,'#4C216B',.92,a+Math.PI/2);
  }
  ctx.restore();
}

export function drawLymphocyte(ctx,x,y,seed,{ chronic = false }={}) {
  const rand = mulberry32(seed);
  const r = (chronic ? 1.6 : 2) + rand()*.4;
  ell(ctx,x,y,r+.6,r+.6,'#C8D1E6',.33);
  ell(ctx,x,y,r,r,chronic ? '#2B0E56' : '#280C52',.96);
}

export function drawPlasmaCell(ctx,x,y,seed,{ chronic = false }={}) {
  const rand = mulberry32(seed);
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(rand()*TAU);
  if (chronic) ctx.scale(.79,.79);
  ell(ctx,0,0,4.5,6,'rgba(174,153,195,.83)');
  area(ctx,'M-2.92 1.91 C-3.30 -.34 -1.14 -2.47 2.21 -.89 C.44 -.92 -.81 .34 -.89 2.1 Q-1.88 2.32 -2.92 1.91Z','#FFF8FA',.96);
  ell(ctx,1.02,2.12,2.46,2.46,'#84599F');
  for(let i=0;i<6;i++){
    const a=i*TAU/6+.37;
    ell(ctx,1.02+1.71*Math.cos(a),2.12+1.71*Math.sin(a),.82,.51,'#341259',1,a+Math.PI/2);
  }
  ell(ctx,1.02,2.12,.45,.45,'#422066',.83);
  ctx.restore();
}

function spindle(ctx,x,y,angle,seed,{ color='#4A2278', length=10, width=1.6, alpha=.90 }={}) {
  const rand = mulberry32(seed);
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(angle + (rand()-.5)*.08);
  ctx.scale(length/2,width/2);
  area(ctx,'M-1 0 C-.76 -1.22 .60 -1.33 1 0 C.60 1.30 -.76 1.25 -1 0Z',color,alpha);
  ctx.restore();
}

const grid = fn => Array.from({length:131},(_,i)=>fn((D+12)*i/130-6));
const band = (upper,lower) => closedCurve([...grid(x=>[x,upper(x)]),...grid(x=>[x,lower(x)]).reverse()]);
const rectified = n => () => n;
const layers = {
  simple:[.14,.38,.60,.88],
  phlegmon:[.14,.37,.58,.83],
  chronic:[.13,.26,.56,.83],
};
const ripple = (x,i) => 4.4*Math.sin(x/39+i*.69) + 2.1*Math.sin(x/20-i*1.20);
function boundaries(stage) {
  return [rectified(0), ...layers[stage].map((h,i) => x => h*D + ripple(x,i)
    + (i===0 && stage==='simple' ? 17*Math.exp(-((x-D*.670)**2)/700) * (.81+.19*Math.sin(x/2.6))
      : i===0 && stage==='phlegmon' ? 71*Math.exp(-((x-D*.566)**2)/6300) * (.89+.11*Math.sin(x/7.3)) : 0)),
  rectified(D+5)];
}

function deposit(count, sample, paint, valid) {
  let done = 0;
  for (let i=0; i<count*145 && done<count; i++) {
    const [x,y,detail] = sample();
    if (valid(x,y)) paint(x,y,done++,detail);
  }
  if (done !== count) throw new Error(`Histology allocation incomplete (${done}/${count})`);
}
const gaussish = rand => (rand()+rand()+rand()+rand()-2)*1.72;
const spectral = (a,b,v) => 'rgb('+a.map((n,i)=>Math.round(lerp(n,b[i],v))).join(',')+')';
const roundSample = rand => [rand()*D,rand()*D];
const between = (levels,first,last,pad=0) => (x,y) =>
  inside(x,y,pad) && y >= levels[first](x) + pad && y <= levels[last](x) - pad;

function profilePath(fn) {
  return 'M'+grid(x=>[round(x),round(fn(x))]).join('L');
}

function matrixThreads(ctx,seed,levels) {
  const rand = mulberry32(seed);
  const sub = between(levels,1,3,0);
  // Thin eosin and stromal nuclei in the pale matrix, dispersed in small coherent fields.
  ctx.save();
  ctx.clip(new Path2D(band(levels[1],levels[3])));
  for(let i=0;i<286;i++){
    const x=rand()*D, y=lerp(levels[1](x)+5,levels[3](x),rand());
    const length=8+rand()*29;
    const dy=(rand()-.5)*23;
    trace(ctx,`M${x} ${y} q${length*.53} ${(rand()-.46)*13} ${length} ${dy}`,
      i%5===0 ? '#CF7EA9' : '#DF9BB8', .57+rand()*1.36,.33+rand()*.35);
  }
  deposit(1500,()=>roundSample(rand),(x,y,i) => {
    const h = i%4===0;
    ell(ctx,x,y,h ? 1.20+rand()*.62 : .59+rand()*.40,h ? .54+rand()*.32 : .57+rand()*.42,
      h ? '#8D629A' : '#98729D', .27+rand()*.36, -.64+rand()*1.4);
  },sub);
  ctx.restore();
}

function wallBase(ctx,stage,levels,seed) {
  const serosaBase=stage==='phlegmon'?'rgba(230,161,182,.34)':'rgba(222,138,173,.17)';
  for(const [i,color] of [[1,MATRIX],[2,MATRIX],[3,MUSCLE],[4,serosaBase]]){
    area(ctx,band(levels[i],levels[i+1]),color);
  }
  for(let i=1;i<=4;i++) trace(ctx,profilePath(levels[i]),i===1?'#AE648A':'#C087A4',i===1?1.42:1.02,i===1?.56:.38);
  if(stage==='phlegmon') {
    const deposit=makeCanvas(D,D);
    const coating=logicalContext(deposit,{willReadFrequently:true});
    paintWatercolor(coating,seed+457,wash=>{
      for(let j=0;j<8;j++){
        const x=24+j*(D/8), y=levels[4](x)+27+8*Math.sin(j*1.83);
        wash(organic(x,y,41+6*Math.sin(j),17+j%3*8,seed+j*251,.27,-.08,18),j%3?'#DFC474':'#E8CE88',121,
          {bleed:.23,edge:.25});
      }
    },{blend:'source-over'});
    // Flatten the brush buffer before clipping and constrain this fibrin glaze to its golden pigments.
    const pixels=coating.getImageData(0,0,deposit.width,deposit.height);
    const {data}=pixels;
    for(let i=0;i<data.length;i+=4){
      if(data[i+3]&&data[i+2]>data[i+1]+4){
        data[i]=223;
        data[i+1]=196;
        data[i+2]=116;
      }
    }
    coating.putImageData(pixels,0,0);
    ctx.save();
    ctx.clip(new Path2D(band(levels[4],levels[5])));
    ctx.globalAlpha*=.27;
    ctx.globalCompositeOperation='multiply';
    drawRaster(ctx,deposit);
    ctx.restore();
  } else {
    const rand=mulberry32(seed+643);
    const fits=between(levels,4,5,2);
    deposit(82,()=>roundSample(rand),(x,y,i)=>{
      spindle(ctx,x,y,(rand()-.5)*.8,seed+i*191,{color:'#9B688E',length:3.4+rand()*4,width:.9,alpha:.59});
      if(i%3===0)trace(ctx,`M${x-8} ${y+2} q8 -5 17 -2`,'#C882A4',.81,.36);
    },fits);
  }
  matrixThreads(ctx,seed+104,levels);
}

function polarNormal(ctx,seed,metrics,recipe) {
  const rand=mulberry32(seed);
  ctx.fillStyle=TISSUE;
  ctx.fillRect(0,0,D,D);
  area(ctx,around(R,R,R*.761,R*.761),MATRIX);
  const annulus=around(R,R,R+1,R+1);
  annulus.addPath(around(R,R,R*.76,R*.76));
  area(ctx,annulus,MUSCLE,1,'evenodd');
  for(let i=0;i<recipe.muscleStrokes;i++){
    const a=rand()*TAU, radius=(.766+rand()*.226)*R;
    const length=.33+rand()*.90;
    const pts=Array.from({length:57},(_,j)=>{
      const t=a+length*j/56;
      const q=radius+1.62*Math.sin(t*8+i)+1.20*Math.cos(t*15+i);
      return [round(R+Math.cos(t)*q),round(R+Math.sin(t)*q)];
    });
    trace(ctx,'M'+pts.join('L'),'rgba(206,98,142,.16)',1.5+rand()*2);
    metrics.muscleStrokes++;
  }
  for(let i=0;i<256;i++){
    const t=rand()*TAU, q=R*(.56+rand()*.192), len=.046+rand()*.10;
    const p=(a,r)=>[round(R+Math.cos(a)*r),round(R+Math.sin(a)*r)];
    trace(ctx,`M${p(t,q)} Q${p(t+len*.45,q+3*Math.cos(i))} ${p(t+len,q-2)}`,'#D989AD',.55+rand()*.76,.29+rand()*.23);
  }
  for(let i=0;i<recipe.muscleNuclei;i++){
    const a=rand()*TAU,r=R*(.772+rand()*.20);
    spindle(ctx,R+Math.cos(a)*r,R+Math.sin(a)*r,a+Math.PI/2,seed+i*711);
    metrics.muscleNuclei++;
  }

  const cells=380;
  for(let i=0;i<cells;i++){
    const a=rand()*TAU,r=R*(.258+rand()*.31);
    ell(ctx,R+Math.cos(a)*r,R+Math.sin(a)*r,.60,.57,'#8962AA',.55);
  }
  const lumenRadius=a=>R*.215*(1+.17*Math.cos(3*a+.53)+.082*Math.sin(5*a-.63)+.047*Math.cos(2*a-.61)+.035*Math.sin(a*4));
  const rim=theta=>[R+Math.cos(theta)*lumenRadius(theta),R+Math.sin(theta)*lumenRadius(theta)];
  const lumen=closedCurve(spiral(0,1,t=>rim(t),145));
  area(ctx,lumen,'#FFFFFF');
  trace(ctx,lumen,'#6D4289',1.30,.80);
  const n=285;
  for(let i=0;i<n;i++){
    const a=(i+rand()*.52)*TAU/n;
    const [x,y]=rim(a);
    ell(ctx,x+Math.cos(a)*1.4,y+Math.sin(a)*1.4,.71,1.08,PURE_NUCLEUS,.91,a+Math.PI/2);
  }
  for(let i=0;i<recipe.crypts;i++){
    const row=i<22 ? 0 : 1;
    const a=((i%22)+(row===1?.53:0)+(rand()-.50)*.48)*TAU/22;
    const r=R*(row===0 ? .330+rand()*.046 : .482+rand()*.043);
    drawCryptBeadRing(ctx,R+Math.cos(a)*r,R+Math.sin(a)*r,5.7+rand()*2.9,9.4+rand()*(row?9.2:6.7),
      a+Math.PI/2+(rand()-.5)*.37,seed+i*79);
    metrics.crypts++;
  }
  [ .25,1.15,2.05,3.15,4.10,5.20,5.85 ].forEach((a,i)=>{
    const r=R*(.605+rand()*.102);
    drawLymphoidFollicleCloud(ctx,R+Math.cos(a)*r,R+Math.sin(a)*r,26+rand()*12,seed+i*151+17);
    metrics.follicles++;
  });
  [.55,.84,1.63,2.46,2.77,3.55,3.91,4.54,4.87,5.53,6.09].forEach((a,i)=>{
    const r=R*(.568+rand()*.143);
    drawCongestedVessel(ctx,R+Math.cos(a)*r,R+Math.sin(a)*r,6.1+rand()*4.5,3.8+rand()*2.7,a+.7,seed+941*i);
    metrics.vessels++;
  });
  trace(ctx,around(R,R,R-1.8,R-1.9),'#D58AA9',1.8,.46);
}

function muscleChannel(lines,x,lane) {
  return lerp(lines[3](x),lines[4](x),lane)+4.01*Math.sin(x/42+lane*6)+1.6*Math.sin(x/20+lane*10);
}

function muscleStrands(ctx,stage,lines,seed,metrics,{strokes,nuclei}) {
  const rand=mulberry32(seed);
  ctx.save();
  ctx.clip(new Path2D(band(lines[3],lines[4])));
  const phleg=stage==='phlegmon';
  for(let i=0;i<strokes;i++){
    const lane = phleg ? .105+(i%6)*.158 + (rand()-.5)*.084 : .036+(i+rand()*.58)/strokes*.92;
    const x0 = -30 + rand() * 193 - (i % 3 === 0 ? 103 : 0);
    const end = phleg ? 155+rand()*352 : 127+rand()*328;
    const pts=Array.from({length:46},(_,j)=>{
      const x=x0+end*j/45;
      return [round(x),round(muscleChannel(lines,x,lane)+.89*Math.sin(x/11+i))];
    });
    const opacity=phleg ? .16+rand()*.12 : .22;
    trace(ctx,'M'+pts.join('L'),`rgba(204,86,134,${opacity})`,1.25+rand()*(phleg?3.85:1.81));
    metrics.muscleStrokes++;
  }
  deposit(nuclei,()=>roundSample(rand),(x,y,i)=>{
    const a=(phleg?.105:.052)*Math.cos(x/41)+.057*Math.sin(y/11);
    spindle(ctx,x,y,a,seed+i*103,{color:i%4===0?'#361366':'#4B2475',length:9+rand()*4,width:1.6+rand()*.6,alpha:.90});
    metrics.muscleNuclei++;
  },between(lines,3,4,5));
  ctx.restore();
}

function glands(ctx,stage,lines,seed,metrics) {
  const rand=mulberry32(seed);
  const columns = stage==='simple' ? Array.from({length:16},(_,i)=>58+i*27.0).filter((_x,i)=>i!==10&&i!==11) :
    stage==='phlegmon' ? [71,118,178,394,450] : [83,151,231,306,378,446];
  const horizontalJitter = stage==='chronic' ? 20 : 8;
  ctx.save();
  ctx.clip(new Path2D(band(lines[1],lines[2])));
  for(let i=0;i<columns.length;i++){
    const x=columns[i]+(rand()-.50)*horizontalJitter;
    const top=lines[1](x),bottom=lines[2](x);
    const height = (bottom-top) * (stage==='chronic' ? .41+rand()*.25 : stage==='phlegmon' ? .39+rand()*.26 : .57+rand()*.29);
    const y = top+height*.5+7+rand()*(stage==='simple'?11:7);
    const short = i%5===2&&stage==='simple';
    const sy=height*(short?.33:.50);
    ctx.globalAlpha=stage==='phlegmon' ? .77 : 1;
    drawCryptBeadRing(ctx,x,y+Number(short)*9,6.9+rand()*3.35,sy,(rand()-.50)*(short?1.11:.55),seed+i*129);
    metrics.crypts++;
  }
  ctx.restore();
  for(let i=0;i<240;i++){
    const x=2+i*2.167;
    if ((stage==='simple'&&x>D*.604&&x<D*.735) || (stage==='phlegmon'&&x>187&&x<398)) continue;
    const y=lines[1](x);
    ell(ctx,x,y+2.7,.72,1.06,PURE_NUCLEUS,.91,(rand()-.5)*.30);
  }
  if(stage==='simple'){
    for(let i=0;i<34;i++){
      const x=D*(.602+rand()*.139), y=lines[1](x)+(rand()-.47)*15;
      const length=1.9+rand()*8;
      trace(ctx,`M${x} ${y} q${length*.5} -2 ${length} ${(rand()-.5)*6}`,'#D76F8F',.73+rand()*.91,.52);
      if(i%3===0) ell(ctx,x,y,1.19,1.04,'#572475',.88,rand()*TAU);
    }
  }
}

function clusterSample(rand, centres) {
  return () => {
    const [x,y,rx,ry] = centres[Math.floor(rand()*centres.length)];
    return [x+gaussish(rand)*rx, y+gaussish(rand)*ry];
  };
}

function drawWallVessels(ctx,stage,seed,metrics) {
  const sites = stage==='simple'
    ? [[115,231,12,7], [160,276,15,9], [220,238,13,8], [267,280,14,8],
      [311,224,12,8], [346,268,16,8.7], [397,227,14,7], [430,279,13,8]]
    : [[78,246,16,9], [139,274,18,11], [192,232,17,10], [241,273,22,10], [287,234,20,10],
       [332,274,19,10], [377,223,17,8], [423,267,22,11], [457,234,15,8]];
  const rand=mulberry32(seed);
  sites.forEach(([x,y,rx,ry],i)=>{
    drawCongestedVessel(ctx,x,y,rx,ry,(rand()-.5)*.9,seed+i*243);
    metrics.vessels++;
  });
}

function serosalNet(ctx,lines,seed,metrics,recipe) {
  const rand=mulberry32(seed);
  ctx.save();
  ctx.clip(new Path2D(band(lines[4],lines[5])));
  for(let i=0;i<recipe.fibrin;i++){
    const x = 79 + rand()*(D-158);
    const y = lines[4](x)+5+rand()*(D-lines[4](x)-9);
    const length = 28 + rand()*145;
    const dy=(rand()-.5)*57;
    trace(ctx,`M${x} ${y} C${x+length*.35} ${y+dy*.26-16} ${x+length*.53} ${y+dy*.78+15} ${x+length} ${y+dy}`,
      i%3 ? '#C98C26' : '#D48086', .8+rand()*.8, .50+rand()*.28);
    metrics.fibrin++;
  }
  const sample=clusterSample(rand,[[126,474,31,17],[191,472,37,19],[260,484,47,16],[334,477,45,17],[398,460,34,17]]);
  deposit(recipe.serosalPus,sample,(x,y,i)=>{
    drawMicroNeutrophil(ctx,x,y,seed+i*141,{karyorrhexis:true});
    metrics.serosalPus++;
  },between(lines,4,5,5));
  ctx.restore();
}

function phlegmonCells(ctx,lines,seed,metrics,recipe) {
  const rand=mulberry32(seed);
  const lumps = [[129,139,38,29],[166,179,48,25],[230,201,45,29],[285,224,38,37],
    [352,199,45,32],[402,150,40,27],[411,242,33,28],[121,240,38,32],[281,259,40,24]];
  deposit(recipe.shallow,clusterSample(rand,lumps),(x,y,i)=>{
    drawMicroNeutrophil(ctx,x,y,seed+i*103);
    metrics.shallow++;
  },between(lines,1,3,4));
  const streaks = [[81,46,.18],[171,67,.34],[290,97,.50],
    [382,55,.66],[254,81,.82],[151,64,.94]];
  for (const [j,[cx,spread,lane]] of streaks.entries()) {
    const sample=()=>{
      const x = cx+gaussish(rand)*spread;
      const y = muscleChannel(lines,x,lane) + gaussish(rand)*3.4;
      return [x,y];
    };
    const n = Math.floor(recipe.muscle * (j + 1) / streaks.length)
      - Math.floor(recipe.muscle * j / streaks.length);
    deposit(n,sample,(x,y,i)=>{
      drawMicroNeutrophil(ctx,x,y,seed+i*71+j*1859);
      metrics.muscle++;
    },between(lines,3,4,5));
  }
  for(let i=0;i<28;i++){
    const x=155+rand()*247, y=lines[1](x)-13-rand()*35;
    area(ctx,organic(x,y,2.2+rand()*7.2,1+rand()*3.4,seed+i*379,.46,rand()*3.4,7),
      i%4 ? '#E7A2B5' : '#AB527B',.50+rand()*.28);
  }
  deposit(recipe.freePus,clusterSample(rand,[[215,92,26,20],[278,111,44,23],[321,95,28,17]]),(x,y,i)=>{
    drawMicroNeutrophil(ctx,x,y,seed+i*155,{karyorrhexis:true,alpha:.86});
    metrics.freePus++;
  },between(lines,0,1,5));
}

function simpleCells(ctx,lines,seed,metrics,recipe) {
  const rand=mulberry32(seed);
  const patches=[[350,120,34,19],[367,153,38,24],[333,198,37,27],[366,238,49,24],
    [306,251,42,19],[426,231,40,23],[214,230,27,23]];
  deposit(recipe.shallow,clusterSample(rand,patches),(x,y,i)=>{
    drawMicroNeutrophil(ctx,x,y,seed+i*113);
    metrics.shallow++;
  },between(lines,1,3,4));
  const fits=between(lines,3,4,6);
  SIMPLE_MUSCLE_NEUTROPHILS.forEach(([x,y],i)=>{
    if (!fits(x,y)) throw new Error('The scattered simple-stage cell left the muscle layer');
    drawMicroNeutrophil(ctx,x,y,seed+i*719+50027);
    metrics.muscle++;
  });
}

function chronicMucosa(ctx, lines, seed, metrics, recipe) {
  const rand = mulberry32(seed);
  const [, surface, basement] = lines;
  const lamina = band(surface, basement);
  area(ctx, lamina, 'rgba(232,174,200,.16)');
  area(ctx, lamina, 'rgba(227,155,189,.12)');
  area(ctx, band(surface, x => surface(x) + 8.7 + .62 * Math.sin(x / 16)), 'rgba(225,165,192,.24)');
  trace(ctx, profilePath(surface), '#B36C9B', .78, .40);
  for (let x = 1; x < D; x += 1.90 + rand() * .53) {
    const tilt = Math.atan2(surface(x + 2) - surface(x - 2), 4);
    ell(ctx, x, surface(x) + 3.7 + rand() * 2.1, .7, 1.21 + rand() * .43, '#441B7A', .86, tilt);
  }
  const fits = between(lines, 1, 2, 2);
  const inLamina = (x, y) => fits(x, y) && y > surface(x) + 10;
  deposit(176, () => roundSample(rand), (x, y) => {
    const length = 3.7 + rand() * 9;
    trace(ctx, `M${x} ${y} q${length * .41} ${(rand() - .5) * 5} ${length} ${(rand() - .5) * 4}`,
      '#BF83A8', .58 + rand() * .37, .14 + rand() * .20);
  }, inLamina);
  deposit(recipe.laminaNuclei, () => roundSample(rand), (x, y) => {
    ell(ctx, x, y, .6, .76 + .31 * rand(), '#6D4289', .45, rand() * TAU);
  }, inLamina);
  metrics.laminaNuclei = recipe.laminaNuclei;

  const glands = [
    [69, .68, 4.1, 9.1, -.35], [119, .24, 5.6, 8.6, .35], [192, .78, 4.4, 10.6, -.21],
    [247, .48, 6.5, 9.5, .23], [318, .30, 4.9, 7.7, -.40], [364, .71, 4.3, 11.6, .28],
    [448, .56, 5.8, 8.1, -.33],
  ];
  ctx.save();
  ctx.clip(new Path2D(lamina));
  for (const [i, [column, depth, rx, ry, tilt]] of glands.entries()) {
    const x = column + (rand() - .5) * 14;
    const y = lerp(surface(x) + 11, basement(x) - 11, depth + (rand() - .5) * .091);
    ell(ctx, x, y, rx + 3.9, ry + 3.2, '#E8B1CE', .27, tilt);
    drawCryptBeadRing(ctx, x, y, rx, ry, tilt, seed + i * 719, { atrophic: true });
    metrics.crypts++;
  }
  ctx.restore();
  area(ctx, band(x => basement(x) - 3.5, x => basement(x) + 1.5), 'rgba(204,92,138,.32)');
}

function chronicFibrePath(cx, cy, length, angle, rand) {
  const [cos, sin, shift] = [Math.cos(angle), Math.sin(angle), rand() * TAU];
  const height = 3.4 + rand() * 4.3;
  const curl = 1.0 + rand() * 2.1;
  return (t, offset = 0) => {
    const u = length * (t - .5);
    const v = offset + height * Math.sin(u / 24 + shift) + curl * Math.sin(u / 11 + shift * .65);
    return [cx + cos * u - sin * v, cy + sin * u + cos * v];
  };
}

function chronicFibrils(ctx, point, rand, colour = '#D66090') {
  const count = 8 + Math.floor(rand() * 7);
  const separation = 1.04 + rand() * 1.09;
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) * .5) * separation;
    const start = rand() * .15;
    const finish = 1 - rand() * .14;
    const tremor = rand() * TAU;
    const path = new Path2D();
    path.moveTo(...point(start, offset));
    for (let j = 1; j <= 30; j++) {
      const t = lerp(start, finish, j / 30);
      path.lineTo(...point(t, offset + .67 * Math.sin(t * 14 + tremor) + .25 * Math.sin(t * 33 + i)));
    }
    trace(ctx, path, colour, .8 + rand(), .22 + rand() * .16);
  }
}

function chronicVessel(ctx, [x, y, rx, ry, angle], seed) {
  const rand = mulberry32(seed);
  const wall = organic(x, y, rx, ry, seed, .12, angle, 22);
  const lumen = organic(x + .45, y - .15, rx * .63, ry * .56, seed + 6, .13, angle, 20);
  area(ctx, wall, '#E1A0B5', .88);
  trace(ctx, wall, '#B76791', .88, .54);
  area(ctx, lumen, '#F6D3DC', .93);
  trace(ctx, lumen, '#C57598', .67, .55);
  for (let i = 0; i < 8; i++) {
    const t = i * TAU / 8 + rand() * .31;
    const u = rx * .84 * Math.cos(t), v = ry * .81 * Math.sin(t);
    ell(ctx, x + Math.cos(angle) * u - Math.sin(angle) * v, y + Math.sin(angle) * u + Math.cos(angle) * v,
      1.72, .60, '#76508D', .62, t + angle + Math.PI / 2);
  }
  ell(ctx, x + rx * .19, y + ry * .07, rx * .20, ry * .19, '#DF8FA4', .74, angle);
  ell(ctx, x - rx * .21, y - ry * .13, rx * .15, ry * .18, '#EFABB5', .78, angle);
}

function chronicSubmucosa(ctx, lines, seed, metrics, recipe, vessels) {
  const rand = mulberry32(seed);
  const submucosa = new Path2D(band(lines[2], lines[3]));
  const stain = ctx.createLinearGradient(8, 144, 511, 296);
  stain.addColorStop(0, 'rgba(235,169,198,.39)');
  stain.addColorStop(.42, 'rgba(231,162,193,.49)');
  stain.addColorStop(.69, 'rgba(236,183,208,.34)');
  stain.addColorStop(1, 'rgba(228,161,190,.45)');
  area(ctx, submucosa, stain);
  ctx.save();
  ctx.clip(submucosa);
  const axes = Array.from({ length: recipe.bundles }, (_, i) => {
    const x = 43 + 105 * (i % 5) + (rand() - .5) * 85;
    const level = .09 + .17 * Math.floor(i / 5) + (rand() - .5) * .23;
    const y = lerp(lines[2](x) + 3, lines[3](x) - 1, level);
    const angle = .27 * Math.sin(i * 1.53) + (rand() - .5) * .37;
    const axis = chronicFibrePath(x, y, 96 + rand() * 99, angle, rand);
    chronicFibrils(ctx, axis, rand);
    return axis;
  });
  metrics.bundles = axes.length;
  deposit(recipe.fibroblasts, () => {
    const axis = axes[Math.floor(rand() * axes.length)];
    const t = .07 + rand() * .86;
    const offset = (rand() - .5) * 22;
    const [x, y] = axis(t, offset);
    const a = axis(t - .01, offset), b = axis(t + .01, offset);
    return [x, y, Math.atan2(b[1] - a[1], b[0] - a[0])];
  }, (x, y, i, angle) => {
    spindle(ctx, x, y, angle, seed + i * 773, { color: '#5D3B86', length: 8 + rand() * 3,
      width: 1.2 + rand() * .3, alpha: .68 });
    metrics.fibroblasts++;
  }, between(lines, 2, 3, 3));
  for (const [i, vessel] of vessels.entries()) {
    chronicVessel(ctx, vessel, seed + 4007 + i * 673);
    metrics.vessels++;
  }
  ctx.restore();
}

function chronicMuscularis(ctx, lines, seed, metrics) {
  const rand = mulberry32(seed);
  const muscle = new Path2D(band(lines[3], lines[4]));
  area(ctx, muscle, 'rgba(228,162,192,.34)');
  ctx.save();
  ctx.clip(muscle);
  const islands = [
    [78, 318, 53, 16, .047], [184, 328, 48, 14, -.09], [276, 315, 48, 13, .15],
    [385, 326, 46, 17, -.15], [465, 345, 38, 15, .11], [116, 366, 57, 17, -.10],
    [227, 373, 51, 18, .07], [335, 361, 44, 18, -.064], [404, 394, 51, 19, .13],
    [164, 418, 63, 14, .065], [285, 412, 45, 13, -.14], [337, 432, 36, 11, .05],
  ];
  for (const [i, [x, y, rx, ry, tilt]] of islands.entries()) {
    const fragment = new Path2D(organic(x, y, rx, ry, seed + i * 337, .22, tilt, 27));
    area(ctx, fragment, 'rgba(196,74,122,.21)');
    ctx.save();
    ctx.clip(fragment);
    for (let j = 0; j < 20; j++) {
      const sx = x + (rand() - .5) * rx * 1.96;
      const sy = y + (sx - x) * tilt + (rand() - .5) * ry * 1.64;
      const length = 10 + rand() * 23;
      trace(ctx, `M${sx} ${sy} q${length * .51} -1.7 ${length} ${length * tilt + (rand() - .5) * 4}`,
        '#C46DA0', .52 + rand() * .73, .20 + rand() * .18);
      metrics.muscleStrokes++;
      if (j % 3 !== 0) {
        spindle(ctx, sx, sy + .9, tilt, seed + i * 1271 + j * 39, { color: '#4C2678', length: 7.4 + rand() * 4.7,
          width: 1.25 + rand() * .48, alpha: .58 + rand() * .19 });
        metrics.muscleNuclei++;
      }
    }
    ctx.restore();
  }
  for (let i = 0; i < 20; i++) {
    const x = 32 + i % 5 * 108 + rand() * 23;
    const y = lerp(lines[3](x) + 7, lines[4](x) - 3, .12 + .23 * Math.floor(i / 5) + rand() * .08);
    const direction = i % 3 === 0 ? -.57 : .39 + rand() * .27;
    chronicFibrils(ctx, chronicFibrePath(x, y, 65 + rand() * 82, direction, rand), rand, '#D57EA5');
  }
  ctx.restore();
}

function chronicSerosa(ctx, lines, seed, metrics, recipe) {
  const rand = mulberry32(seed);
  const serosa = new Path2D(band(lines[4], lines[5]));
  area(ctx, serosa, 'rgba(222,134,168,.24)');
  trace(ctx, profilePath(lines[4]), '#BF80A7', .91, .39);
  ctx.save();
  ctx.clip(serosa);
  for (let i = 0; i < 21; i++) {
    const x = 87 + rand() * 346;
    const y = lines[4](x) + 5 + rand() * (D - lines[4](x) - 2);
    chronicFibrils(ctx, chronicFibrePath(x, y, 41 + rand() * 102, (rand() - .5) * .43, rand), rand,
      i % 4 === 0 ? '#D986AA' : '#E2A0B8');
  }
  const fits = between(lines, 4, 5, 3);
  deposit(21, () => roundSample(rand), (x, y, i) => {
    spindle(ctx, x, y, (rand() - .5) * .50, seed + i * 127, { color: '#684587', length: 6.8 + rand() * 3.2,
      width: 1.2 + rand() * .22, alpha: .52 });
  }, fits);
  for (const [i, vessel] of [[198, 475, 6.9, 4.6, -.19], [314, 488, 7.4, 4.4, .31]].entries()) {
    chronicVessel(ctx, vessel, seed + 9211 + i * 177);
    metrics.serosalVessels = i + 1;
  }
  deposit(recipe.serosalLymphocytes, () => roundSample(rand), (x, y, i) => {
    drawLymphocyte(ctx, x, y, seed + 55 + i * 131, { chronic: true });
    metrics.lymphocytes++;
  }, fits);
  ctx.restore();
}

function chronicInfiltration(ctx, lines, seed, metrics, recipe, vessels) {
  const rand = mulberry32(seed);
  const stands = [
    [116, 210, 66, -.34, 30, 8], [231, 248, 58, .40, 28, 7], [351, 213, 69, -.26, 27, 7],
    [426, 268, 62, -.59, 30, 8], [168, 354, 78, .26, 29, 7], [315, 388, 87, -.43, 28, 7],
  ];
  const inStroma = between(lines, 2, 4, 4);
  const clearOfLumens = (x, y) => inStroma(x, y) && !vessels.some(([vx, vy, rx, ry, angle]) => {
    const dx = x - vx, dy = y - vy;
    const u = Math.cos(angle) * dx + Math.sin(angle) * dy;
    const v = -Math.sin(angle) * dx + Math.cos(angle) * dy;
    return (u / (rx + 3)) ** 2 + (v / (ry + 2)) ** 2 < 1;
  });
  let salt = 0;
  const lymphocyte = (x, y) => {
    drawLymphocyte(ctx, x, y, seed + (++salt) * 113, { chronic: true });
    metrics.lymphocytes++;
  };
  const plasma = (x, y) => {
    drawPlasmaCell(ctx, x, y, seed + (++salt) * 193, { chronic: true });
    metrics.plasmaCells++;
  };
  for (const [i, [x, y, length, angle, lymphCount, plasmaCount]] of stands.entries()) {
    const axis = chronicFibrePath(x, y, length, angle, rand);
    const sample = () => {
      const t = (rand() + rand()) / 2;
      const width = 3 + 3 * (1 + Math.sin(t * 14 + i));
      const distance = gaussish(rand) * width;
      return axis(t, distance);
    };
    deposit(lymphCount, sample, lymphocyte, clearOfLumens);
    deposit(plasmaCount, sample, plasma, clearOfLumens);
    metrics.clusters++;
  }
  deposit(recipe.lymphocytes - metrics.lymphocytes, () => roundSample(rand), lymphocyte, clearOfLumens);
  deposit(recipe.plasmaCells - metrics.plasmaCells, () => roundSample(rand), plasma, clearOfLumens);
}

function chronicMicroscopy(ctx, lines, seed, metrics, recipe) {
  const vessels = [[110, 189, 13, 8, -.24], [211, 235, 10, 7, .29],
    [334, 193, 14, 8, -.42], [441, 245, 10, 7, -.33]];
  chronicMucosa(ctx, lines, seed + 118, metrics, recipe);
  chronicSubmucosa(ctx, lines, seed + 643, metrics, recipe, vessels);
  chronicMuscularis(ctx, lines, seed + 1823, metrics);
  chronicSerosa(ctx, lines, seed + 4731, metrics, recipe);
  chronicInfiltration(ctx, lines, seed + 7534, metrics, recipe, vessels);
}

function thrombosedVessel(ctx,x,y,rx,ry,seed) {
  const rand=mulberry32(seed);
  const shape=new Path2D(organic(x,y,rx,ry,seed,.115,.15,26));
  area(ctx,shape,'#A97178',.85);
  trace(ctx,shape,'#F4E2E6',2.2,.80);
  const thrombus=new Path2D(organic(x+.42,y+.60,rx*.79,ry*.73,seed+3,.25,.3,22));
  area(ctx,thrombus,'#4A111A');
  ctx.save();
  ctx.clip(thrombus);
  for(let i=0;i<16;i++){
    const a=x-rx*.64+rand()*rx*1.3,b=y-ry*.57+rand()*ry*1.19;
    trace(ctx,`M${a} ${b} q3 -3 8 -1`,i%3?'#CB7781':'#E2A1A5',.72+rand()*.68,.45+rand()*.24);
  }
  ctx.restore();
}

function tornChannel(seed) {
  const rand=mulberry32(seed);
  const rows=[];
  let drift=0;
  for(let i=0;i<=130;i++){
    const t=i/130;
    drift=clamp(.73*drift+(rand()-.50)*8.7,-16,16);
    const x=.52*D+9*Math.sin(t*14.3)+12*Math.sin(t*6.2)+drift;
    const y=t*(D+3);
    const w=lerp(7,17,t)+(t===0||t===1?0:2.1*Math.sin(i*1.70)+1.9*Math.cos(i*2.6));
    rows.push({x,y,w});
  }
  const shape=offset=>{
    const edge=s=>rows.map(({x,y,w})=>[round(x+s*(w+offset)),round(y)]);
    return 'M'+[...edge(-1),...edge(1).reverse()].join('L')+'Z';
  };
  return { rows, shape };
}

function necroticField(ctx,seed,metrics,recipe) {
  const rand=mulberry32(seed);
  const ground=ctx.createLinearGradient(122,40,380,490);
  ground.addColorStop(0,'#925F61');
  ground.addColorStop(.53,'#692F35');
  ground.addColorStop(1,'#9A6265');
  ctx.fillStyle=ground;
  ctx.fillRect(0,0,D,D);
  const pigmentPalette=['#561923','#8B3A35','#471A24','#75474C'];
  for(let depth=0;depth<3;depth++){
    const depositCanvas=makeCanvas(D,D);
    const depositCtx=logicalContext(depositCanvas,{willReadFrequently:true});
    paintWatercolor(depositCtx,seed+917+depth*719,wash=>{
      for(let j=0;j<recipe.clouds/3;j++){
        const i=j+depth*7;
        const x=260+gaussish(rand)*(114-depth*18), y=246+gaussish(rand)*(98-depth*13);
        wash(organic(x,y,102-depth*18+rand()*54,93-depth*19+rand()*49,seed+i*133,.21+depth*.04,rand()*.9,29),
          pigmentPalette[(depth*3+j)%4],82+rand()*47,{bleed:.32,edge:.14,texture:.84});
        metrics.clouds++;
      }
    },{blend:'source-over'});
    const pigment=depositCtx.getImageData(0,0,depositCanvas.width,depositCanvas.height);
    for(let p=0;p<pigment.data.length;p+=4){
      const [r,g,b]=[pigment.data[p],pigment.data[p+1],pigment.data[p+2]];
      const luma=.2126*r+.7152*g+.0722*b;
      pigment.data[p+3]*=clamp((238-luma)/126);
      pigment.data[p]=Math.min(r,153-depth*12);
      pigment.data[p+1]=Math.min(g,97-depth*15);
      pigment.data[p+2]=Math.min(b,107-depth*13);
    }
    depositCtx.putImageData(pigment,0,0);
    ctx.save();
    ctx.filter=`blur(${[7.5,4.7,2.7][depth]*rasterScale(ctx.canvas).x}px)`;
    ctx.globalAlpha=[.53,.65,.72][depth];
    drawRaster(ctx,depositCanvas);
    ctx.restore();
  }
  for(let i=0;i<80;i++){
    const x=rand()*D,y=86+rand()*428, length=11+rand()*72, tilt=(rand()-.5)*37;
    trace(ctx,`M${x} ${y} q${length*.31} ${tilt*.38} ${length*.64} ${tilt*.77} t${length*.36} ${tilt*.23}`,
      i%4?'#A4656D':'#C38D8B',.8+rand()*3.3,.09+rand()*.17);
  }
  deposit(recipe.ghostField,()=>roundSample(rand),(x,y,i)=>{
    const distance=Math.hypot((x-296)*1.02,(y-283)*.92);
    const alpha=clamp(.045+.72*(distance/R)**1.7,.045,.85);
    const grey=spectral([164,121,128],[50,20,67],clamp(.08+distance/R*.76));
    if(i%4<2) drawMicroNeutrophil(ctx,x,y,seed+i*79,{alpha,color:grey});
    else ell(ctx,x,y,1.1+rand()*1.42,.71+rand()*.61,grey,alpha,rand()*TAU);
    metrics.ghostField++;
  },(x,y)=>inside(x,y,5));
  const hemorrhage=clusterSample(rand,[[181,185,64,44],[302,258,83,64],[342,342,52,57],[243,365,84,62]]);
  deposit(537,hemorrhage,(x,y,i)=>{
    redCell(ctx,x,y,rand()*Math.PI,i%4?'#9E3039':'#CC5562',.48+rand()*.44);
    metrics.extravascularReds++;
  },(x,y)=>inside(x,y,4));
  [[143,151,15.4,12.5],[92,255,15.9,12.0],[149,342,16.5,13.1],
    [374,113,14.5,11.9],[414,240,16.2,12.1],[384,374,16.3,12.9]].forEach(([x,y,rx,ry],i)=>{
    thrombosedVessel(ctx,x,y,rx,ry,seed+i*311+5001);
    metrics.thrombosed++;
  });
  const tear=tornChannel(seed+90);
  area(ctx,tear.shape(4.1),'#501824',.84);
  trace(ctx,tear.shape(3.4),'#974653',2.4,.81);
  const slit = new Path2D(tear.shape(0));
  area(ctx,slit,'#DAB872');
  ctx.save();
  ctx.clip(slit);
  const stain = makeCanvas(D,D);
  const stainCtx = logicalContext(stain, { willReadFrequently: true });
  paintWatercolor(stainCtx,seed+164,wash=>{
    for(let i=0;i<17;i++){
      const {x,y,w}=tear.rows[i*7+4];
      wash(organic(x+(rand()-.5)*7,y,w*.81+4,17+rand()*20,seed+i*115,.24,.06),i%3?'#DEC66C':'#B98757',
        112+rand()*39,{bleed:.15,edge:.24});
    }
  },{blend:'source-over'});
  const gold=stainCtx.getImageData(0,0,stain.width,stain.height);
  for(let i=0;i<gold.data.length;i+=4){
    if (gold.data[i+3] && gold.data[i+2] > gold.data[i+1]+3) {
      gold.data[i]=208;
      gold.data[i+1]=176;
      gold.data[i+2]=97;
    }
  }
  stainCtx.putImageData(gold,0,0);
  ctx.globalAlpha=.62;
  drawRaster(ctx,stain);
  ctx.globalAlpha=1;
  const sample=()=>{
    const {x,y,w}=tear.rows[3+Math.floor(rand()*125)];
    return [x+(rand()-.5)*Math.max(2,w*1.40), y-1.6+rand()*3.1];
  };
  deposit(recipe.fissurePus,sample,(x,y,i)=>{
    drawMicroNeutrophil(ctx,x,y,seed+8401+i*47,{karyorrhexis:true});
    metrics.fissurePus++;
  },(x,y)=>inside(x,y,5));
  deposit(recipe.fissureRedCells,sample,(x,y,i)=>{
    redCell(ctx,x,y,rand()*Math.PI,i%3?'#A33541':'#BD4B52',.95);
    metrics.fissureRedCells++;
  },(x,y)=>inside(x,y,3));
  ctx.restore();
  const last=tear.rows[124];
  ctx.save();
  const wash=ctx.createRadialGradient(last.x,last.y+11,1,last.x,last.y+11,36);
  wash.addColorStop(0,'rgba(235,211,124,.57)');
  wash.addColorStop(.51,'rgba(222,198,108,.32)');
  wash.addColorStop(1,'rgba(222,198,108,0)');
  area(ctx,organic(last.x,last.y+11,33,16,seed+15,.24,.10,19),wash);
  ctx.restore();
}

const cached = new Map();
function bake(stage,seed) {
  const key=`${stage}:${seed}`;
  if(cached.has(key)) return cached.get(key);
  const canvas=makeCanvas(D,D);
  const ctx=logicalContext(canvas);
  const recipe=histologyRecipe(stage);
  const metrics=Object.fromEntries([
    'crypts','follicles','vessels','muscleStrokes','muscleNuclei','shallow','muscle','freePus','serosalPus',
    'fibrin','clouds','ghostField','extravascularReds','thrombosed','fissurePus','fissureRedCells',
    'bundles','fibroblasts','clusters','lymphocytes','plasmaCells',
  ].map(key=>[key,0]));
  ctx.lineJoin='round';
  ctx.lineCap='round';
  ctx.save();
  ctx.clip(around(R,R,R,R));
  ctx.fillStyle=WHITE;
  ctx.fillRect(0,0,D,D);
  let levels=[];
  if(stage==='normal') polarNormal(ctx,seed,metrics,recipe);
  else if(stage==='gangrene') necroticField(ctx,seed,metrics,recipe);
  else {
    levels=boundaries(stage);
    area(ctx,band(levels[1],levels[5]),TISSUE);
    if(stage==='chronic'){
      chronicMicroscopy(ctx,levels,seed+5050,metrics,recipe);
    } else {
      wallBase(ctx,stage,levels,seed+21);
      glands(ctx,stage,levels,seed+107,metrics);
      muscleStrands(ctx,stage,levels,seed+216,metrics,{
        strokes:stage==='simple'?recipe.muscleStrokes:56,
        nuclei:stage==='simple'?recipe.muscleNuclei:155,
      });
      if(stage==='simple') simpleCells(ctx,levels,seed+1015,metrics,recipe);
      else {
        phlegmonCells(ctx,levels,seed+1815,metrics,recipe);
        serosalNet(ctx,levels,seed+991,metrics,recipe);
      }
      drawWallVessels(ctx,stage,seed+705,metrics);
    }
  }
  ctx.restore();
  const result={canvas,levels,metrics:Object.freeze(metrics)};
  cached.set(key,result);
  return result;
}

const layerNames=['管腔','黏膜','黏膜下','肌层','浆膜'];
function atLeft(fn) {
  let y=fn(0);
  for(let i=0;i<16;i++) y=fn(R-Math.sqrt(Math.max(0,R**2-(R-y)**2)));
  return round(y);
}

// Other callers can still await this compatibility point while live canvases attach.
export const waitForHistologyTextures = () => Promise.resolve();

export function createHistologyAsset({
  id, stage='simple', seed=8053, x=0, y=0, scale=1, showLayers=false,
}={}) {
  id=svgId('micro-slide',id);
  if(![x,y,seed,scale].every(Number.isFinite)||scale<=0)throw new RangeError('Invalid histology placement');
  const {canvas,levels,metrics}=bake(stage,seed);
  const surface=retainedCanvas(`${id}-field`,canvas);
  const metal=roughProp('circle',[R,R,D+11],17057,'#483536',3,.41)
    +roughProp('circle',[R,R,D+3.5],19933,'#A88660',2.0,.40);
  const layerBounds=levels.length?[0,...levels.slice(1,5).map(atLeft),D]:[];
  const locate=`translate(${x} ${y}) scale(${scale})`;
  const lettering = showLayers && layerBounds.length
    ? `<g transform="${locate}">${layerNames.map((name,i)=>{
      const a=layerBounds[i],b=layerBounds[i+1];
      return brace(-24,a+1.9,b-1.9,'#715A4C')
        +`<text x="-34" y="${(a+b)/2+8}" class="micro-layer" text-anchor="end">${name}</text>`;
    }).join('')}</g>` : '';
  return {
    paint:`<g transform="${locate}">${surface.markup}${metal}</g>`,lettering,recipe:histologyRecipe(stage),
    lens:{x:x+R*scale,y:y+R*scale,diameter:D*scale},layers:layerBounds,audit:metrics,
    mount:surface.mount,
  };
}
