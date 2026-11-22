import * as brush from 'p5.brush/standalone';
import { WIDTH, HEIGHT, samplePath } from './geometry.js';
import { createRaster, drawRasterCrop, logicalContext, setLogicalSize } from './raster.js';
import { displayDensity } from '../renderProfile.js';

let target;
const pendingTextures = new Set();

function brushTarget() {
  if (!target) {
    target = setLogicalSize(brush.createCanvas(WIDTH, HEIGHT, { parent: null, pixelDensity: displayDensity() }), WIDTH, HEIGHT);
  }
  return target;
}

function brushPoints(d, spacing, max) {
  // The standalone WebGL target uses a centered origin.
  return samplePath(d, spacing, max).slice(0, -1).map(([x, y]) => [x - WIDTH / 2, y - HEIGHT / 2]);
}

export function pigment(d, color, opacity, {
  bleed = 0.14, direction = 'out', angle = 22, texture = 0.69, border = 0.53, split = 0.24,
} = {}) {
  brush.noStroke();
  brush.fill(color, opacity);
  brush.fillBleed(bleed, direction, angle);
  brush.fillTexture(texture, border, true, split);
  brush.polygon(brushPoints(d, 10, 210));
}

export function pencil(d, name, color, {
  distance = 5.4, angle = 38, weight = 0.56,
} = {}) {
  brush.noFill();
  brush.set(name, color, weight);
  brush.hatchStyle(name, color, weight);
  brush.noStroke();
  brush.hatch(distance, angle, { rand: 0.22, continuous: false, gradient: 0.18 });
  brush.polygon(brushPoints(d, 7));
  brush.noHatch();
}

export function washLayer(seed, draw, blend = 'normal', crop) {
  const canvas = brushTarget();
  brush.load(canvas);
  brush.angleMode(brush.DEGREES);
  brush.clear();
  brush.seed(seed);
  brush.noiseSeed(seed);
  brush.noField();
  draw();
  brush.render();
  const [x, y, width, height] = crop ?? [0, 0, WIDTH, HEIGHT];
  let output = canvas;
  if (crop) {
    output = createRaster(width, height);
    drawRasterCrop(logicalContext(output), canvas, x, y, width, height, 0, 0, width, height);
  }
  const source = output.toDataURL('image/png');
  const img = new Image();
  img.src = source;
  const ready = img.decode();
  pendingTextures.add(ready);
  ready.then(() => pendingTextures.delete(ready), () => {});
  const position = crop ? `x="${x}" y="${y}" ` : '';
  return `<image ${position}width="${width}" height="${height}" href="${source}" style="mix-blend-mode:${blend}"/>`;
}

export const waitForWashes = () => Promise.all(pendingTextures);
