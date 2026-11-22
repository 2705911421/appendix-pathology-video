import * as brush from 'p5.brush/standalone';
import { HEIGHT, WIDTH, samplePath } from '../../shared/canvasCore.js';
import { createRaster, drawRasterCrop, logicalContext, logicalSize, setLogicalSize } from '../../shared/detail/raster.js';
import { displayDensity } from '../../shared/renderProfile.js';

let target;
let nextWash = 0;
const washes = new Map();

function brushTarget() {
  if (!target) {
    target = setLogicalSize(brush.createCanvas(WIDTH, HEIGHT, { parent: null, pixelDensity: displayDensity() }), WIDTH, HEIGHT);
  }
  return target;
}

function brushPoints(path, spacing, limit) {
  return samplePath(path, spacing, limit).slice(0, -1)
    .map(([x, y]) => [x - WIDTH / 2, y - HEIGHT / 2]);
}

export function pigment(path, color, opacity, {
  bleed = .14, direction = 'out', angle = 22, texture = .69, border = .53, split = .24,
} = {}) {
  brush.noStroke();
  brush.fill(color, opacity);
  brush.fillBleed(bleed, direction, angle);
  brush.fillTexture(texture, border, true, split);
  brush.polygon(brushPoints(path, 10, 210));
}

export function pencil(path, preset, color, { distance = 5.4, angle = 38, weight = .56 } = {}) {
  brush.noFill();
  brush.set(preset, color, weight);
  brush.hatchStyle(preset, color, weight);
  brush.noStroke();
  brush.hatch(distance, angle, { rand: .22, continuous: false, gradient: .18 });
  brush.polygon(brushPoints(path, 7));
  brush.noHatch();
}

function liftPaper(ctx, width, height) {
  const pixels = ctx.getImageData(0, 0, width, height);
  const rgba = pixels.data;
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] === 0) continue;
    const darkest = Math.min(rgba[i], rgba[i + 1], rgba[i + 2]);
    const pigmentDepth = (255 - darkest - 3) / 252;
    if (pigmentDepth <= 0) {
      rgba[i + 3] = 0;
      continue;
    }
    // Convert the brush's white substrate into coverage while keeping the pigment hue.
    const coverage = pigmentDepth ** .72;
    for (let c = 0; c < 3; c++) rgba[i + c] = 255 - Math.max(0, 252 - rgba[i + c]) / coverage;
    rgba[i + 3] *= coverage;
  }
  ctx.putImageData(pixels, 0, 0);
}

// Generate pigment into a scratch WebGL canvas, then keep a cropped Canvas 2D layer.
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
  liftPaper(ctx, canvas.width, canvas.height);
  const slot = String(++nextWash);
  washes.set(slot, canvas);
  return `<foreignObject x="${x}" y="${y}" width="${width}" height="${height}"
    data-brush-slot="${slot}" style="mix-blend-mode:${blend};pointer-events:none"></foreignObject>`;
}

export async function waitForWashes() {
  for (const slot of document.querySelectorAll('foreignObject[data-brush-slot]')) {
    if (slot.firstChild) continue;
    const source = washes.get(slot.dataset.brushSlot);
    const { width, height } = logicalSize(source);
    const canvas = createRaster(width, height);
    canvas.style.display = 'block';
    canvas.getContext('2d').drawImage(source, 0, 0);
    slot.append(canvas);
  }
}
