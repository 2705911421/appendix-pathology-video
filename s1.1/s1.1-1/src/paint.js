import {
  HEIGHT, PAPER, WIDTH, clamp, createRaster, drawRasterCrop, inkOutline, logicalContext, mulberry32, organic, pencil, pigment, roughProp,
} from '../../shared/canvasCore.js';
import { displayDensity } from '../../shared/renderProfile.js';
import { paintWash } from './watercolorCanvas.js';

const outlines = new Map();
const paths = new Map();

export function pathOf(data) {
  if (!paths.has(data)) paths.set(data, new Path2D(data));
  return paths.get(data);
}

export function fill(ctx, data, color) {
  ctx.fillStyle = color;
  ctx.fill(typeof data === 'string' ? pathOf(data) : data);
}

export function stroke(ctx, data, color, width = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke(typeof data === 'string' ? pathOf(data) : data);
}

export function ink(ctx, data, color, size, seed = 19) {
  const key = [data, size, seed].join('|');
  if (!outlines.has(key)) outlines.set(key, new Path2D(inkOutline(data, { size, seed })));
  fill(ctx, outlines.get(key), color);
}

export function roughPath(data, seed, color, width) {
  const holder = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  holder.innerHTML = roughProp('path', [data], seed, color, width);
  const lines = Array.from(holder.querySelectorAll('path'), element => new Path2D(element.getAttribute('d')));
  return ctx => {
    for (const line of lines) stroke(ctx, line, color, width);
  };
}

export function dot(ctx, x, y, rx, ry, color) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

export function letter(ctx, line, x, y, {
  size = 28, weight = 500, color = '#433C36', align = 'left', font = 'KaiTi, STKaiti, "Microsoft YaHei", serif',
} = {}) {
  ctx.font = weight + ' ' + size + 'px ' + font;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(line, x, y);
}

export function fade(ctx, opacity, draw) {
  if (opacity <= .001) return;
  ctx.save();
  ctx.globalAlpha *= clamp(opacity);
  draw();
  ctx.restore();
}

export function makePaper() {
  const canvas = createRaster(WIDTH, HEIGHT, displayDensity() > 1 ? displayDensity() : .5);
  const ctx = logicalContext(canvas);
  const paper = ctx.createImageData(canvas.width, canvas.height);
  const noise = mulberry32(22251);
  for (let i = 0; i < paper.data.length; i += 4) {
    const drift = (noise() + noise() - 1) * 4.3;
    paper.data[i] = 245 + drift;
    paper.data[i + 1] = 241 + drift;
    paper.data[i + 2] = 233 + drift;
    paper.data[i + 3] = 255;
  }
  ctx.putImageData(paper, 0, 0);
  ctx.strokeStyle = '#BDB19D17';
  ctx.lineWidth = 1.1;
  for (let x = 25; x < WIDTH; x += 52) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 25; y < HEIGHT; y += 52) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  return canvas;
}

// All the sheets are painted once by p5.brush. Animation moves, clips and scales the wet marks.
export function makePigments() {
  const palette = [
    ['linen', '#AC8457', 120, .3], ['skin', '#AC6C5B', 140, .29], ['trouser', '#343D4B', 165, .26],
    ['rose', '#C43428', 113, .65], ['scarlet', '#B42D27', 236, .38], ['pelvis', '#768FA3', 133, .36],
    ['pink', '#F2B8B0', 234, .39], ['red', '#C93430', 213, .37], ['yellow', '#DFB848', 213, .34],
    ['black', '#1C1719', 184, .36], ['stone', '#A79B8D', 188, .26], ['wood', '#B48358', 161, .33],
    ['sky', '#8EADC7', 157, .31], ['dusk', '#677B97', 188, .36], ['night', '#28344A', 228, .41],
    ['sun', '#DC674C', 181, .42], ['ochre', '#DAB16E', 157, .44], ['glass', '#83A6A9', 132, .27],
  ];
  const atlas = createRaster(WIDTH, HEIGHT);
  const cells = new Map();
  paintWash(atlas, 8103, () => {
    palette.forEach(([name, color, opacity, bleed], index) => {
      const x = (index % 6) * 320;
      const y = Math.floor(index / 6) * 360;
      cells.set(name, { x: x + 13, y: y + 34, width: 294, height: 288 });
      pigment(organic(x + 160, y + 180, 128, 108, 900 + index * 83, .18, -.09, 19),
        color, opacity, { bleed, texture: .57, border: .52 });
      pigment(organic(x + 140, y + 164, 95, 74, 753 + index * 41, .21, .1, 17),
        color, opacity * .56, { bleed: bleed * .70, texture: .64, border: .31 });
      if (name === 'linen') {
        pencil(organic(x + 154, y + 173, 87, 65, 612), 'HB', '#8F735C', { weight: .26, distance: 8 });
      }
    });
  }, [0, 0, WIDTH, HEIGHT]);
  return (ctx, name, x, y, width, height) => {
    const cell = cells.get(name);
    drawRasterCrop(ctx, atlas, cell.x, cell.y, cell.width, cell.height, x, y, width, height);
  };
}

export function captionPaper(ctx) {
  const wash = ctx.createLinearGradient(0, 867, 0, 934);
  wash.addColorStop(0, '#F5F1E900');
  wash.addColorStop(1, PAPER);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 867, WIDTH, HEIGHT - 867);
}
