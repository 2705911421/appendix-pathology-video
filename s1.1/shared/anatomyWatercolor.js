import * as brush from 'p5.brush/standalone';
import { clamp, closedCurve, inkOutline, lerp, mulberry32, organic, round, samplePath, svgId } from './canvasCore.js';
import { createRaster, drawRaster, logicalContext, logicalSize, rasterScale, setLogicalSize } from './detail/raster.js';
import { displayDensity } from './renderProfile.js';

export {
  createIleocecal, appendixAxis, appendixOutline, appendixRadius, appendixRibbon, APPENDIX_TO_CECUM, CECUM_WIDTH,
} from './detail/ileocecalLegacy.js';

export const ILEOCECAL_BOX = Object.freeze({ width: 640, height: 520, cecum: 150, ileum: 63 });
const valve = [245, 250];
const root = [228, 308];
const ileumCurve = [[520, 315], [400, 295], [320, 265], valve];
const acute = [
  [root, [242, 345], [259, 380], [285, 395]],
  [[285, 395], [324, 417.5], [377, 436], [410, 415]],
];
const chronic = [
  [root, [241, 341], [254, 372], [278, 388]],
  [[278, 388], [302, 404], [347, 428], [383, 418]],
];
const colors = Object.freeze({
  normal:   { ratio: .11, base: '#F3C4B8', tint: '#D9887C' },
  simple:   { ratio: .17, base: '#DD7B78', tint: '#C42B2B' },
  phlegmon: { ratio: .25, base: '#C86862', tint: '#AC3B3D' },
  gangrene: { ratio: .27, base: '#923F49', tint: '#6E1822' },
  chronic:  { ratio: .16, base: '#E3C4BC', tint: '#BC9695' },
});

function bezier(points, u) {
  const v = 1 - u;
  const coordinates = [0, 1].map(i => {
    const [a, b, c, d] = points.map(p => p[i]);
    return [v ** 3 * a + 3 * v * u * (v * b + u * c) + u ** 3 * d,
      v ** 2 * (b - a) + 2 * v * u * (c - b) + u ** 2 * (d - c)];
  });
  return [coordinates[0][0], coordinates[1][0], Math.atan2(coordinates[1][1], coordinates[0][1])];
}

function centreline(stage, u) {
  const parts = stage === 'chronic' ? chronic : acute;
  return u < .47 ? bezier(parts[0], u / .47) : bezier(parts[1], (u - .47) / .53);
}

export function ileocecalDimensions(stage) {
  if (!Object.hasOwn(colors, stage)) throw new RangeError('Unknown appendiceal stage');
  let length = 0;
  let previous = root;
  for (let i = 1; i <= 350; i++) {
    const next = centreline(stage, i / 350);
    length += Math.hypot(next[0] - previous[0], next[1] - previous[1]);
    previous = next;
  }
  return { cecum: ILEOCECAL_BOX.cecum, ileum: ILEOCECAL_BOX.ileum,
    appendix: round(ILEOCECAL_BOX.cecum * colors[stage].ratio), length: round(length) };
}

function offset([x, y, a], distance) {
  return [x - Math.sin(a) * distance, y + Math.cos(a) * distance];
}

function ribbon(axis, low, high, { from = 0, to = 1, steps = 55 } = {}) {
  const side = distance => Array.from({ length: steps + 1 }, (_, i) => {
    const u = lerp(from, to, i / steps);
    return offset(axis(u), distance(u, i / steps));
  });
  return closedCurve([...side(low), ...side(high).reverse()]);
}

function axisPath(axis, from, to, shift, count = 32) {
  return 'M' + Array.from({ length: count + 1 }, (_, i) => {
    const u = lerp(from, to, i / count);
    return offset(axis(u), shift(u)).map(round).join(' ');
  }).join('L');
}

function haustra() {
  const swell = y => 59 + 16 * Math.abs(Math.sin(y * .032));
  const wall = side => Array.from({ length: 56 }, (_, i) => {
    const y = lerp(36, 320, i / 55);
    return [185 + side * swell(y), y];
  });
  return closedCurve([...wall(-1), [123, 341], [147, 364], [177, 373],
    [204, 370], [232, 359], [248, 336], ...wall(1).reverse()]);
}

const cecum = haustra();
const ileum = ribbon(u => bezier(ileumCurve, u), () => -31.5, () => 31.5);
const band = 'M178 35 C186 92 177 132 183 188 C186 242 191 272 208 296 Q218 307 228 308 Q231 306 227 302 C221 298 217 287 211 271 C201 246 202 208 199 184 C194 128 202 76 195 35Z';
const meso = 'M251 267 C279 266 296 280 323 288 C354 297 385 302 405 318 C399 330 385 333 382 350 C380 373 399 388 410 407 C391 414 368 412 349 409 C324 405 301 400 281 388 C265 377 252 354 239 329 C235 306 245 283 251 267Z';

const vein = [[271, 282], [281, 353], [332, 400], [397, 406]];
const artery = [[283, 288], [290, 355], [340, 393], [393, 402]];
const branchSites = [.17, .30, .39, .56, .65, .81, .91];
const thrombus = bezier(vein, .54);
const TAU = Math.PI * 2;

export const makeCanvas = createRaster;

// SVG placement retains the actual Canvas surface, with no encoded image source.
export function retainedCanvas(id, canvas, { x = 0, y = 0, width, height } = {}) {
  const size = logicalSize(canvas);
  width ??= size.width;
  height ??= size.height;
  const markup = `<foreignObject id="${id}" x="${x}" y="${y}" width="${width}" height="${height}">
    <canvas xmlns="http://www.w3.org/1999/xhtml" width="${canvas.width}" height="${canvas.height}"
      style="display:block;width:100%;height:100%"></canvas></foreignObject>`;
  function mount(root) {
    const panel = root.querySelector(`#${id}`);
    if (!panel) return null;
    const displayed = panel.firstElementChild;
    if (!panel.hasAttribute('data-drawn')) {
      setLogicalSize(displayed, size.width, size.height);
      displayed.getContext('2d').drawImage(canvas, 0, 0);
      panel.setAttribute('data-drawn', '');
    }
    return displayed;
  }
  queueMicrotask(() => mount(document));
  return { markup, mount };
}

let brushSurface;
export function paintWatercolor(ctx, seed, draw, { opacity = 1, blend = 'multiply' } = {}) {
  brushSurface ??= brush.createCanvas(640, 560, { parent: null, pixelDensity: displayDensity() });
  brush.load(brushSurface);
  brush.angleMode(brush.DEGREES);
  brush.clear();
  brush.seed(seed);
  brush.noiseSeed(seed);
  brush.noField();
  draw((path, color, strength, { bleed = .14, texture = .78, edge = .39, direction = 'out' } = {}) => {
    brush.noStroke();
    brush.fill(color, strength);
    brush.fillBleed(bleed, direction, 48);
    brush.fillTexture(texture, edge, true, .23);
    const points = samplePath(path, 5, 235).slice(0, -1);
    brush.polygon(points.map(([x, y]) => [x - 320, y - 280]));
  });
  brush.render();
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.globalCompositeOperation = blend;
  drawRaster(ctx, brushSurface, 0, 0, 640, 560);
  ctx.restore();
}

function fill(ctx, d, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.fill(new Path2D(d));
  ctx.restore();
}

function line(ctx, d, color, width, opacity = 1) {
  fill(ctx, inkOutline(d, { size: width, taperStart: 4, taperEnd: 6 }), color, opacity);
}

function cxOfBox() {
  const canvas = makeCanvas(ILEOCECAL_BOX.width, ILEOCECAL_BOX.height);
  const ctx = logicalContext(canvas);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  return ctx;
}

function feather(ctx, start, end, vertical = false) {
  const mask = vertical ? ctx.createLinearGradient(0, start, 0, end) : ctx.createLinearGradient(start, 0, end, 0);
  mask.addColorStop(0, 'rgba(0,0,0,0)');
  mask.addColorStop(.47, 'rgba(0,0,0,.46)');
  mask.addColorStop(1, '#000');
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = mask;
  const { width, height } = logicalSize(ctx.canvas);
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

const recesses = [77, 169, 267, 319].flatMap((y, i) => [
  `M${122 + i % 2 * 3} ${y + 1} Q145 ${y - 12} 180 ${y + 9} Q154 ${y + 37} 129 ${y + 27}Z`,
  `M202 ${y + 8} Q229 ${y - 8} 247 ${y + 5} Q242 ${y + 36} 208 ${y + 29}Z`,
]);

let shared;
function foundations() {
  if (shared) return shared;
  const c = cxOfBox();
  fill(c, cecum, '#F2BFB0');
  fill(c, band, '#F8D8BA', .80);
  c.save();
  c.clip(new Path2D(cecum));
  paintWatercolor(c, 11790, wash => {
    wash(cecum, '#E0A192', 116, { bleed: .10, direction: 'in', edge: .54 });
    wash('M117 40 Q137 57 138 96 C147 142 129 185 146 243 C139 286 145 326 179 366 C142 367 119 344 119 301 C130 235 110 215 125 147 Q113 92 117 40Z', '#AD6761', 64);
    wash('M215 43 C241 71 247 129 234 155 C222 186 252 214 242 249 Q267 315 229 353 C235 320 215 279 222 250 C217 217 205 176 222 151Z', '#C77B71', 78);
    recesses.forEach(d => wash(d, '#FBE2CC', 95, { edge: .32 }));
    wash(band, '#F5D0AD', 118, { texture: .61 });
  });
  c.restore();
  line(c, cecum, '#794A43', 2.55, .81);
  line(c, 'M187 44 C194 155 182 241 207 287 Q216 302 228 308', '#FCE3BA', 2.2, .93);
  for (const y of [76, 168, 264, 321]) {
    line(c, `M125 ${y + 3} Q145 ${y - 9} 173 ${y + 4}`, '#9B5B56', 2.25, .70);
    line(c, `M206 ${y + 3} Q230 ${y - 6} 246 ${y + 6}`, '#9B5B56', 2.25, .70);
  }
  feather(c, 81, 35, true);

  const i = cxOfBox();
  fill(i, ileum, '#EEBCAC');
  i.save();
  i.clip(new Path2D(ileum));
  paintWatercolor(i, 4973, wash => {
    wash(ileum, '#D99584', 118, { bleed: .09, direction: 'in', edge: .45 });
    wash(ribbon(u => bezier(ileumCurve, u), () => -26, () => -7, { from: .02, to: .96 }),
      '#BD756B', 59, { bleed: .17 });
  });
  i.restore();
  line(i, ileum, '#82534C', 2.4, .77);
  line(i, axisPath(u => bezier(ileumCurve, u), .12, .89, u => 8 + 3 * Math.sin(u * 6)), '#F5D9B8', 2.5, .85);
  for (const d of ['M279 234 Q284 241 280 254', 'M305 240 Q311 260 300 270',
    'M352 258 Q356 266 350 276', 'M398 273 Q405 289 396 298']) line(i, d, '#A5675D', 1.5, .36);
  feather(i, 520 - .22 * (520 - valve[0]), 520);

  const m = cxOfBox();
  fill(m, meso, 'rgba(228,210,174,.38)');
  m.save();
  m.clip(new Path2D(meso));
  const rand = mulberry32(52377);
  const lobules = Array.from({ length: 23 }, (_, i) => {
    const x = 246 + rand() * 168;
    const y = lerp(281 + (x - 249) * .24, 377 + (x - 249) * .19, rand());
    return organic(x, y, 6 + rand() * 14, 4 + rand() * 8, 86 + i * 11, .25, -.2);
  });
  for (const d of lobules) fill(m, d, 'rgba(240,224,178,.34)');
  paintWatercolor(m, 68090, wash => {
    wash(meso, '#C7A46C', 54, { bleed: .17, edge: .27 });
    lobules.forEach((d, i) => wash(d, i % 4 ? '#F0E0B2' : '#D8BE8C', 46, { bleed: .13, edge: .21 }));
  });
  m.restore();
  line(m, meso, '#AA8A66', 1.4, .34);
  shared = { colon: c.canvas, ileum: i.canvas, mesentery: m.canvas };
  return shared;
}

function vessels(ctx, stage, diameter, showThrombus) {
  const shortened = stage === 'chronic' ? .88 : 1;
  ctx.save();
  ctx.clip(new Path2D(meso));
  for (const [curve, color, width] of [[vein, '#2F5D7C', 4.0], [artery, '#B83030', 3.1]]) {
    line(ctx, axisPath(t => bezier(curve, t), 0, shortened, () => 0), color, width, .93);
    for (const [i, site] of branchSites.entries()) {
      const u = site + (width > 3.5 ? [0,.038,-.020,.035,-.03,.017,-.013][i] : 0);
      const [x, y] = bezier(curve, u * shortened);
      const p = .29 + u * .66;
      const [tx, ty] = offset(centreline(stage, p), -diameter * .42);
      const bend = (i % 3 - 1) * 5.0;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x - 6 + bend, y + (ty - y) * .33, tx + 9 + bend, ty - 7 - bend, tx, ty);
      ctx.strokeStyle = color;
      ctx.globalAlpha = width > 3.5 ? .70 : .87;
      ctx.lineWidth = (i === 0 ? 1.62 : 1.18) * (width > 3.5 ? 1.05 : 1);
      ctx.stroke();
      if (i === 1 || i === 4 || i === 5) {
        ctx.beginPath();
        ctx.moveTo((x + tx) * .5 + bend, (y + ty) * .50 + 1);
        ctx.bezierCurveTo(tx + 5, ty - 8, tx + 11, ty - 1, tx + 10, ty + 2.5);
        ctx.lineWidth = .80;
        ctx.stroke();
      }
    }
  }
  if (showThrombus) {
    const [x, y, angle] = thrombus;
    ctx.translate(x, y);
    ctx.rotate(angle);
    fill(ctx, organic(0, 0, 11.2, 3.25, 402, .19), '#582138');
    line(ctx, 'M-8 0 Q-2 -2 6 -.8', '#A9556F', 1.1, .84);
  }
  ctx.restore();
}

function radius(stage, diameter, u) {
  const end = clamp((u - .91) / .09);
  const crest = .90 + .10 * Math.sin(Math.PI * u);
  const irregular = stage === 'gangrene' && u > .52 ? .94 + .06 * Math.sin(u * 95) : 1;
  return diameter / 2 * crest * irregular * Math.sqrt(1 - end * end);
}

function arcParameter(stage) {
  const table = [{ u: 0, length: 0 }];
  let previous = centreline(stage, 0);
  for (let i = 1; i <= 512; i++) {
    const u = i / 512;
    const next = centreline(stage, u);
    table.push({ u, length: table.at(-1).length + Math.hypot(next[0] - previous[0], next[1] - previous[1]) });
    previous = next;
  }
  return fraction => {
    const wanted = table.at(-1).length * fraction;
    const n = table.findIndex(({ length }) => length >= wanted);
    if (n <= 0) return table[0].u;
    const a = table[n - 1];
    const b = table[n];
    return lerp(a.u, b.u, (wanted - a.length) / (b.length - a.length));
  };
}

function phlegmonWindow(ctx, axis, r, parameter) {
  const from = parameter(.215);
  const to = parameter(.735);
  const lip = (u, t) => r(u) * Math.min(1, t * 10, (1 - t) * 10) ** .58;
  const border = ribbon(axis, (u,t) => -lip(u,t), lip, { from, to });
  const lumen = ribbon(axis, (u,t) => -.40 * lip(u,t), (u,t) => .40 * lip(u,t), { from, to });
  fill(ctx, border, '#87313C');
  paintWatercolor(ctx, 53561, wash => {
    wash(border, '#A34A53', 109, { bleed: .075, direction: 'in', edge: .50 });
  }, { opacity: .65 });
  fill(ctx, lumen, '#DDA44D');
  ctx.save();
  ctx.clip(new Path2D(lumen));
  paintWatercolor(ctx, 53617, wash => {
    wash(lumen, '#F2CB67', 177, { bleed: .09, texture: .87, edge: .57 });
    wash(ribbon(axis, (u,t) => (-.32 + .10 * Math.sin(u * 75)) * lip(u,t),
      (u,t) => (-.10 + .13 * Math.cos(u * 87)) * lip(u,t), { from, to }), '#B77137', 112);
  });
  const r0 = mulberry32(55127);
  for (let j = 0; j < 16; j++) {
    const u = lerp(from + .016, to - .013, j / 16);
    const [x, y, a] = axis(u);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    const wide = 3.1 + r0() * 5.2;
    line(ctx, `M${-wide} ${(r0() - .5) * 11} C-1 -5 3 6 ${wide} -1 Q${wide - 2} -4 1 0`,
      j % 3 ? '#F7D988' : '#9F4A33', 1.24, .66);
    ctx.restore();
  }
  const [x, y, a] = axis(parameter(.280));
  ctx.translate(x, y);
  ctx.rotate(a);
  const stone = organic(0, 0, 9.9, 6.0, 74, .17);
  fill(ctx, stone, '#4F2B21');
  fill(ctx, organic(-.75, -.37, 7.44, 4.25, 761, .20), '#846041');
  fill(ctx, organic(-1.2, -.58, 4.67, 2.70, 781, .25), '#62422C');
  line(ctx, 'M-6 .2 Q-3 -4 4 -1.4', '#D7A86B', .93, .85);
  line(ctx, 'M-4 1 Q-1 -1 3 .9', '#B88C51', .82, .79);
  ctx.restore();
  line(ctx, border, '#652C34', 1.75, .79);
  line(ctx, lumen, '#923C35', 1.25, .69);
  return { wallFraction: .30, cavityFraction: .40, lengthFraction: .52 };
}

function chronicSection(ctx, parameter) {
  const [px, py] = centreline('chronic', parameter(.50));
  const [x, y] = [px + 125, py + 75];
  const r = 39;
  ctx.save();
  ctx.strokeStyle = '#84675D';
  ctx.globalAlpha = .74;
  ctx.lineWidth = 1.22;
  ctx.setLineDash([4, 3.9]);
  ctx.beginPath();
  ctx.moveTo(px + 4, py + 7);
  ctx.quadraticCurveTo(px + 44, py + 49, x - r * .79, y - r * .57);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fillStyle = '#A66775';
  ctx.fill();
  ctx.clip();
  fill(ctx, organic(0, 0, r * .97, r * .97, 4609, .052), '#D9A4AC');
  fill(ctx, organic(-.5, .4, r * .945, r * .946, 4619, .038), '#F0D9D5');
  for (let i = 0; i < 12; i++) {
    const rr = 8.6 + i * 2.45;
    const offset = Math.sin(i * .82) * 1.25;
    line(ctx, organic(offset, -.4 + offset * .3, rr, rr * .94, 9115 + i * 31, .103, .13, 21),
      i % 3 ? '#CA969D' : '#A96E7E', .87 + .22 * (i % 3), .38 + .13 * (i % 3));
  }
  const contours = [1, .43, 1, .55, 1, .38, .85, .45, .93, .51];
  const lumen = contours.map((v, i) => {
    const a = i / contours.length * TAU + .14;
    return [r * .20 * Math.cos(a) * v, r * .20 * Math.sin(a) * v];
  });
  fill(ctx, closedCurve(lumen), '#633844');
  ctx.restore();
  return { diameter: 2 * r, centre: [x,y], anchor: [px,py] };
}

function gangrenousPlume(distal) {
  const [x, y] = distal;
  const layers = Array.from({ length: 3 }, (_, i) => {
    const ctx = cxOfBox();
    const cx = x + 6 + i * 10, cy = y + 8 + i * 13.5;
    const rx = 9.8 + i * 6.4, ry = 11.5 + i * 6.1;
    paintWatercolor(ctx, 35882 + i * 33, wash => {
      wash(organic(cx, cy, rx, ry, 810 + i, .36, -.55, 18), '#CAA844', 167,
        { bleed: .37, texture: .66, edge: .26 });
      wash(organic(cx - 1, cy - 1, rx * .58, ry * .69, 911 + i, .32, -.75), '#E7CC75', 133,
        { bleed: .28, texture: .78 });
    });
    // The watercolor density tints the transparent plume, including its feathered exterior.
    const left=Math.floor(cx-rx*1.58), top=Math.floor(cy-ry*1.54);
    const density=rasterScale(ctx.canvas), size=logicalSize(ctx.canvas);
    const w=Math.ceil(rx*3.25*density.x), h=Math.ceil(ry*3.14*density.y);
    const x0=Math.round(left*density.x), y0=Math.round(top*density.y);
    const wet=ctx.getImageData(x0,y0,w,h);
    ctx.clearRect(0,0,size.width,size.height);
    for(let sy=0;sy<h;sy++)for(let sx=0;sx<w;sx++){
      const j=(sy*w+sx)*4;
      const shade=.213*wet.data[j]+.715*wet.data[j+1]+.072*wet.data[j+2];
      const distance=Math.hypot(((x0+sx)/density.x-cx)/(rx*1.50),((y0+sy)/density.y-cy)/(ry*1.44));
      const edge=clamp((1-distance)/.68);
      const pigmentDensity=clamp((247-shade)/64);
      wet.data[j+3]*=.42*pigmentDensity*edge*edge*(3-2*edge);
      wet.data[j]=202; wet.data[j+1]=168; wet.data[j+2]=68;
    }
    ctx.putImageData(wet,x0,y0);
    return ctx.canvas;
  });
  const rand = mulberry32(6411);
  const drops = Array.from({ length: 15 }, (_, i) => [i / 15, 4 + rand() * 22, .81 + rand() * 1.26]);
  return { layers, drops, distal };
}

function perforation(ctx, distal, a) {
  const [x,y] = distal;
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(a);
  const edges = 'M-8 2 L-6 -.5 -7 -3 -3 -2 -1 -5 2 -2 4 -4 7 -.9 8 1 5 3.5 3 2.5 1 5 -2 3.2 -4 4Z';
  fill(ctx, edges, '#561C27');
  fill(ctx, 'M-6 .8 L-3 -1 -1 -3.2 2 -.7 4 -2.3 6 .4 3 2.5 1 3.8 -1 .8 -4 2.1Z', '#22161B');
  line(ctx, 'M-8 2 L-6 -.5 -7 -3 -3 -2 -1 -5 2 -2 4 -4 7 -.9 8 1', '#984345', 1.43, .90);
  ctx.restore();
}

function staticSpecimen(stage, cutaway, showThrombus) {
  const base = foundations();
  const ctx = cxOfBox();
  const diameter = ileocecalDimensions(stage).appendix;
  const parameter = arcParameter(stage);
  const axis = u => centreline(stage, u);
  const r = u => radius(stage, diameter, u);
  const outer = ribbon(axis, u => -r(u), r);
  const distalU = .87;
  const distal = offset(axis(distalU), r(distalU) * .90);
  drawRaster(ctx, base.mesentery);
  vessels(ctx, stage, diameter, showThrombus);
  drawRaster(ctx, base.ileum);
  fill(ctx, outer, colors[stage].base);
  ctx.save();
  ctx.clip(new Path2D(outer));
  const coating=stage==='phlegmon' ? ribbon(axis,u=>(-.88+.11*Math.sin(u*48))*r(u),
    u=>(.84+.12*Math.cos(u*41))*r(u),{from:.12,to:.986}) : null;
  paintWatercolor(ctx, 10401, wash => {
    wash(outer, colors[stage].tint, stage === 'normal' ? 114 : 151, { bleed: .075, direction: 'in', edge: .54 });
    wash(ribbon(axis, u => -.80 * r(u), u => -.19 * r(u), { from: .04, to: .98 }),
      stage === 'chronic' ? '#F1DED8' : '#F6B59C', 103, { bleed: .14, edge: .30 });
    if (stage === 'gangrene') {
      wash(ribbon(axis, u => -.96 * r(u), u => .95 * r(u), { from: .36, to: 1 }),
        '#1E1719', 240, { bleed: .14, direction: 'in', texture: .95, edge: .77 });
      wash(ribbon(axis, u => (-.54 + .24 * Math.sin(u * 87)) * r(u), u => .18 * r(u), { from: .48, to: .985 }),
        '#6E1822', 149, { bleed: .22, edge: .58 });
    }
  });
  if(coating) {
    fill(ctx,coating,'#D0BC83',.73);
    paintWatercolor(ctx,11471, wash=>{
      wash(coating,'#DFB848',136,{bleed:.18,texture:.91,edge:.47});
      wash(ribbon(axis,u=>.14*r(u),u=>.74*r(u),{from:.44,to:.98}),'#BBB187',84,
        {bleed:.22,texture:.63,edge:.25});
    },{opacity:.61});
  }
  if (stage === 'simple') {
    line(ctx, axisPath(axis, .07, .93, u => -.34 * r(u) + 1.5 * Math.sin(u * 59)), '#901D38', 1.9, .89);
    for (let i = 0; i < 13; i++) {
      const u = .09 + i * .062;
      const [x,y] = offset(axis(u), -.34 * r(u));
      const [ex,ey] = offset(axis(u + .033), (i % 2 ? .71 : -.84) * r(u));
      line(ctx, `M${x} ${y} q${(ex-x)*.27} ${(ey-y)*.83} ${ex-x} ${ey-y}`, '#992934', 1.16, .81);
    }
  }
  if (stage === 'phlegmon' && !cutaway) {
    for (const p of [-.47, -.25, .13, .45, .65]) {
      line(ctx, axisPath(axis, .17, .96, u => (p + .13 * Math.sin(u * 81 + p)) * r(u)), '#FFF0BD', 1.03, .65);
    }
  }
  const window = stage === 'phlegmon' && cutaway ? phlegmonWindow(ctx, axis, r, parameter) : null;
  ctx.restore();
  line(ctx, outer, stage === 'gangrene' ? '#513038' : '#84454A', 1.92, .85);
  if (stage === 'gangrene') perforation(ctx, distal, axis(distalU)[2]);
  drawRaster(ctx, base.colon);
  line(ctx, 'M247 224 C260 235 261 254 244 271', '#A8685D', 1.65, .59);
  line(ctx, 'M251 227 Q265 247 250 271', '#A8685D', 1.60, .50);
  const crossSection = stage === 'chronic' ? chronicSection(ctx, parameter) : null;
  return { canvas: ctx.canvas, window, crossSection, distal };
}

const finished = new Map();
function anatomySurface(stage, cutaway, showThrombus) {
  const key = `${stage}:${Boolean(cutaway)}:${Boolean(showThrombus)}`;
  if (!finished.has(key)) finished.set(key, staticSpecimen(stage, cutaway, showThrombus));
  return finished.get(key);
}

function validateExudateBoost(value) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError('exudateBoost must be finite and non-negative');
}

export function createIleocecalAsset({
  id, stage = 'normal', x = 0, y = 0, scale = 1, cutaway = false, showThrombus = false, exudateBoost = 1,
} = {}) {
  id = svgId('cecal-asset', id);
  if (![x,y,scale].every(Number.isFinite) || scale <= 0) throw new RangeError('Invalid specimen placement');
  validateExudateBoost(exudateBoost);
  const dimensions = ileocecalDimensions(stage);
  const art = anatomySurface(stage, cutaway, showThrombus);
  const skin = retainedCanvas(`${id}-body`, art.canvas);
  const gas = stage === 'gangrene' ? gangrenousPlume(art.distal) : null;
  const haze = gas ? retainedCanvas(`${id}-bleed`, makeCanvas(640,520)) : null;
  const position = ([u,v]) => ({ x:x+u*scale, y:y+v*scale });
  const clot = position(thrombus);
  const paint = `<g id="${id}" transform="translate(${x} ${y}) scale(${scale})">${skin.markup}${haze?.markup ?? ''}</g>`;
  return {
    paint, dimensions, valve: position(valve), appendixBase: position(root), appendixTip: position(centreline(stage,1)),
    thrombusX:clot.x,thrombusY:clot.y,
    audit: { crossSection:art.crossSection, cutaway:art.window, smokeLayers:gas?.layers.length ?? 0, drops:gas?.drops.length ?? 0 },
    mount(svg) { skin.mount(svg); haze?.mount(svg); },
    update(svg, { time=0, cutaway:opening=cutaway, showThrombus:clotVisible=showThrombus, exudateBoost:boost=exudateBoost } = {}) {
      if (!Number.isFinite(time)) throw new TypeError('Expected a finite asset time');
      validateExudateBoost(boost);
      const body = logicalContext(skin.mount(svg));
      if (Boolean(opening) !== Boolean(cutaway) || Boolean(clotVisible) !== Boolean(showThrombus)) {
        body.clearRect(0,0,640,520);
        drawRaster(body, anatomySurface(stage,opening,clotVisible).canvas);
      } else {
        body.clearRect(0,0,640,520);
        drawRaster(body, art.canvas);
      }
      if (gas) {
        const ctx = logicalContext(haze.mount(svg));
        ctx.clearRect(0,0,640,520);
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        for (const [i, layer] of gas.layers.entries()) {
          ctx.globalAlpha = clamp((.78 - i * .12 + .07 * Math.sin(time * .85 + i * 1.7)) * boost);
          drawRaster(ctx, layer, Math.sin(time * .96 + i * .46) * (2.0 + i), Math.sin(time * .72 + i * 1.3) * (1.1 + i));
        }
        ctx.restore();
        for (const [phase, distance, r] of gas.drops) {
          const u = ((time * .36 + phase) % 1 + 1) % 1;
          const xx = gas.distal[0] + u * distance + 2.5 * Math.sin(phase * 14);
          const yy = gas.distal[1] + 5 + u * (34 + distance * .83);
          ctx.globalAlpha = .71 * Math.sin(Math.PI*u) ** .65;
          ctx.beginPath();
          ctx.ellipse(xx, yy, r, r * 1.27, -.30, 0, TAU);
          ctx.fillStyle = phase > .5 ? '#BF943A' : '#D9B758';
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      return { thrombusX:clot.x,thrombusY:clot.y };
    },
  };
}
