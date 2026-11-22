import * as brush from 'p5.brush/standalone';
import { HEIGHT, WIDTH, createRaster, rasterScale, samplePath, setLogicalSize } from '../../shared/canvasCore.js';
import { liftWhiteMatte } from '../../shared/detail/raster.js';
import { displayDensity } from '../../shared/renderProfile.js';

let target;
const washes = new Map();
const painted = new WeakSet();
export const brushCalls = { fill: 0, fillBleed: 0, fillTexture: 0, set: 0 };

function brushTarget() {
  if (!target) {
    target = setLogicalSize(brush.createCanvas(WIDTH, HEIGHT, { pixelDensity: displayDensity(), parent: null }), WIDTH, HEIGHT);
  }
  return target;
}

// p5.brush standalone works around the center of its WebGL target.
function points(d, spacing, max) {
  return samplePath(d, spacing, max).slice(0, -1)
    .map(([x, y]) => [x - WIDTH / 2, y - HEIGHT / 2]);
}

export function pigment(d, color, opacity, {
  bleed = .14, direction = 'out', angle = 22, texture = .69, border = .53, split = .24,
} = {}) {
  brush.noStroke();
  brush.fill(color, opacity);
  brush.fillBleed(bleed, direction, angle);
  brush.fillTexture(texture, border, true, split);
  brush.polygon(points(d, 10, 210));
  brushCalls.fill++;
  brushCalls.fillBleed++;
  brushCalls.fillTexture++;
}

export function pencil(d, name, color, { distance = 5.4, angle = 38, weight = .56 } = {}) {
  brush.noFill();
  brush.set(name, color, weight);
  brush.hatchStyle(name, color, weight);
  brush.noStroke();
  brush.hatch(distance, angle, { rand: .22, continuous: false, gradient: .18 });
  brush.polygon(points(d, 7));
  brush.noHatch();
  brushCalls.set++;
}

export function paintWash(canvas, seed, draw, [x, y, width, height]) {
  const source = brushTarget();
  brush.load(source);
  brush.angleMode(brush.DEGREES);
  brush.clear();
  brush.seed(seed);
  brush.noiseSeed(seed);
  brush.noField();
  draw();
  brush.render();
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const scale = rasterScale(source);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, x * scale.x, y * scale.y, width * scale.x, height * scale.y,
    0, 0, canvas.width, canvas.height);
  liftWhiteMatte(context);
}

// Shared wash producers paint into WebGL. Keep the wet pigment in live canvases.
export function washLayer(seed, draw, blend = 'normal', crop = [0, 0, WIDTH, HEIGHT]) {
  const [x, y, width, height] = crop;
  const cache = createRaster(width, height);
  paintWash(cache, seed, draw, crop);
  const key = washes.size;
  washes.set(key, cache);
  return `<foreignObject x="${x}" y="${y}" width="${width}" height="${height}">
    <canvas xmlns="http://www.w3.org/1999/xhtml" width="${cache.width}" height="${cache.height}"
      style="display:block;width:100%;height:100%;background:transparent;mix-blend-mode:${blend}" data-wash="${key}"></canvas></foreignObject>`;
}

export async function waitForWashes(root = document) {
  for (const canvas of root.querySelectorAll('canvas[data-wash]')) {
    if (painted.has(canvas)) continue;
    canvas.getContext('2d').drawImage(washes.get(Number(canvas.dataset.wash)), 0, 0);
    painted.add(canvas);
  }
}
