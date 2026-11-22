import * as brush from 'p5.brush/standalone';
import { HEIGHT, WIDTH, createRaster, samplePath } from '../../shared/canvasCore.js';
import { displayDensity } from '../../shared/renderProfile.js';

const brushTargets = new Map();
let brushOrigin = [WIDTH / 2, HEIGHT / 2];
export const paintSurfaces = new WeakMap();

export function createSurface(pixelScale = displayDensity()) {
  return createRaster(WIDTH, HEIGHT, pixelScale);
}

function points(path, spacing, limit) {
  return samplePath(path, spacing, limit).slice(0, -1)
    .map(([x, y]) => [x - brushOrigin[0], y - brushOrigin[1]]);
}

export function wash(path, color, opacity, {
  bleed = .14, direction = 'out', angle = 22, texture = .69, border = .53, split = .24,
} = {}) {
  brush.noStroke();
  brush.fill(color, opacity);
  brush.fillBleed(bleed, direction, angle);
  brush.fillTexture(texture, border, true, split);
  brush.polygon(points(path, 8, 260));
}

export function graphite(path, color, { distance = 6, angle = 33, weight = .42 } = {}) {
  brush.noFill();
  brush.set('HB', color, weight);
  brush.hatchStyle('HB', color, weight);
  brush.noStroke();
  brush.hatch(distance, angle, { rand: .24, continuous: false, gradient: .2 });
  brush.polygon(points(path, 8, 180));
  brush.noHatch();
}

export function paintSurface(seed, paint, [x, y, width, height] = [0, 0, WIDTH, HEIGHT]) {
  const key = `${width}x${height}`;
  if (!brushTargets.has(key)) {
    brushTargets.set(key, brush.createCanvas(width, height, { pixelDensity: displayDensity(), parent: null }));
  }
  const brushTarget = brushTargets.get(key);
  brushOrigin = [x + width / 2, y + height / 2];
  brush.load(brushTarget);
  brush.angleMode(brush.DEGREES);
  brush.clear();
  brush.seed(seed);
  brush.noiseSeed(seed);
  brush.noField();
  paint();
  brush.render();
  const canvas = createRaster(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(brushTarget, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const rgba = pixels.data;
  for (let i = 0; i < rgba.length; i += 4) {
    // Fully white backing pixels in a brush tile represent exposed paper.
    if (rgba[i] === 255 && rgba[i + 1] === 255 && rgba[i + 2] === 255) rgba[i + 3] = 0;
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

export const canvasSlot = (id, attrs = '') =>
  `<g id="${id}" ${attrs}></g>`;

export function mountSurface(svg, id, canvas = createSurface()) {
  paintSurfaces.set(svg.querySelector(`#${id}`), canvas);
  return canvas;
}
