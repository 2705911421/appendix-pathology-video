import * as brush from 'p5.brush/standalone';
import { HEIGHT, WIDTH, samplePath } from '../../shared/canvasCore.js';
import { createRaster, drawRasterCrop, logicalContext, setLogicalSize } from '../../shared/detail/raster.js';
import { displayDensity } from '../../shared/renderProfile.js';

// Shared artwork supplies the paths and brush instructions. This adapter keeps their
// pigment on live canvases so it can be clipped, transformed and blended with the ink.
const washes = new Map();
let target;

function brushTarget() {
  if (!target) {
    target = setLogicalSize(brush.createCanvas(WIDTH, HEIGHT, { parent: null, pixelDensity: displayDensity() }), WIDTH, HEIGHT);
  }
  return target;
}

function brushPoints(d, spacing, limit) {
  return samplePath(d, spacing, limit).slice(0, -1).map(([x, y]) => [x - WIDTH / 2, y - HEIGHT / 2]);
}

export function pigment(d, color, opacity, {
  bleed = .14, direction = 'out', angle = 22, texture = .69, border = .53, split = .24,
} = {}) {
  brush.noStroke();
  brush.fill(color, opacity);
  brush.fillBleed(bleed, direction, angle);
  brush.fillTexture(texture, border, true, split);
  brush.polygon(brushPoints(d, 10, 210));
}

export function pencil(d, name, color, { distance = 5.4, angle = 38, weight = .56 } = {}) {
  brush.noFill();
  brush.set(name, color, weight);
  brush.hatchStyle(name, color, weight);
  brush.noStroke();
  brush.hatch(distance, angle, { rand: .22, continuous: false, gradient: .18 });
  brush.polygon(brushPoints(d, 7));
  brush.noHatch();
}

function clearPaperMatte(ctx, width, height) {
  const pixels = ctx.getImageData(0, 0, width, height);
  const { data } = pixels;
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue;
    const paper = Math.min(data[i], data[i + 1], data[i + 2]);
    if (paper >= 253) {
      data[i + 3] = 0;
      continue;
    }
    // Factor the white brush substrate out of the RGB and into transparency.
    const pigment = 1 - paper / 255;
    data[i] = (data[i] - paper) / pigment;
    data[i + 1] = (data[i + 1] - paper) / pigment;
    data[i + 2] = (data[i + 2] - paper) / pigment;
    data[i + 3] *= pigment;
  }
  ctx.putImageData(pixels, 0, 0);
}

export function washLayer(seed, draw, blend = 'normal', crop = [0, 0, WIDTH, HEIGHT]) {
  const source = brushTarget();
  brush.load(source);
  brush.angleMode(brush.DEGREES);
  brush.clear();
  brush.seed(seed);
  brush.noiseSeed(seed);
  brush.noField();
  draw();
  brush.render();

  const [x, y, width, height] = crop;
  const canvas = createRaster(width, height);
  const ctx = logicalContext(canvas, { willReadFrequently: true });
  drawRasterCrop(ctx, source, x, y, width, height, 0, 0, width, height);
  clearPaperMatte(ctx, canvas.width, canvas.height);
  const key = String(washes.size);
  washes.set(key, canvas);
  return `<foreignObject x="${x}" y="${y}" width="${width}" height="${height}" style="mix-blend-mode:${blend}">
    <canvas xmlns="http://www.w3.org/1999/xhtml" width="${canvas.width}" height="${canvas.height}"
      style="display:block;width:100%;height:100%" data-wash="${key}"></canvas>
  </foreignObject>`;
}

export function mountWashes(art) {
  for (const canvas of art.querySelectorAll('canvas[data-wash]')) {
    canvas.getContext('2d').drawImage(washes.get(canvas.dataset.wash), 0, 0);
  }
}

// Brush draws synchronously and all destinations have been mounted before this resolves.
export const waitForWashes = () => Promise.resolve();
