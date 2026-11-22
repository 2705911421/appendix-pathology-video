import * as brush from 'p5.brush/standalone';
import { WIDTH, HEIGHT, NS, samplePath } from '../../shared/canvasCore.js';
import { createRaster, drawRasterCrop, logicalContext, logicalSize, rasterScale, setLogicalSize } from '../../shared/detail/raster.js';
import { displayDensity } from '../../shared/renderProfile.js';

let target;
const targets = new Map();
const washes = [];
const libraries = new WeakMap();

function brushTarget([x, y, width, height]) {
  // All specimen washes fit the local plate. Reserve a full-stage buffer for larger crops.
  const local = displayDensity() !== 1 && x >= 0 && y >= 0 && x + width <= 640 && y + height <= 560;
  const w = local ? 640 : WIDTH;
  const h = local ? 560 : HEIGHT;
  if (!targets.has(local)) {
    targets.set(local, setLogicalSize(brush.createCanvas(w, h, { parent: null, pixelDensity: displayDensity() }), w, h));
  }
  target = targets.get(local);
  brush.load(target);
  brush.angleMode(brush.DEGREES);
  return target;
}

function brushPoints(d, spacing, max) {
  const { width, height } = logicalSize(target);
  return samplePath(d, spacing, max).slice(0, -1).map(([x, y]) => [x - width / 2, y - height / 2]);
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

function pigmentIndex(data, index, subtractive) {
  if (!data[index + 3]) return 0;
  const [red, green, blue] = [data[index], data[index + 1], data[index + 2]];
  // Subtractive washes carry paper in their lightest channel. That portion stays transparent.
  const paper = subtractive ? Math.min(red, green, blue) : 0;
  const opacity = Math.round(data[index + 3] * (255 - paper) / 4335);
  if (!opacity) return 0;
  const channel = color => Math.round((color - paper) * 31 / (255 - paper));
  return opacity << 15 | channel(red) << 10 | channel(green) << 5 | channel(blue);
}

function paintedSpans(pixels, x, y, scale, subtractive) {
  const { data, width, height } = pixels;
  const palette = new Map();
  for (let row = 0; row < height; row++) {
    let previous = 0;
    let start = 0;
    for (let column = 0; column <= width; column++) {
      const shade = column < width ? pigmentIndex(data, 4 * (row * width + column), subtractive) : 0;
      if (shade === previous) continue;
      if (previous) {
        const span = (column - start) / scale.x;
        if (!palette.has(previous)) palette.set(previous, []);
        palette.get(previous).push(`M${x + start / scale.x} ${y + row / scale.y}h${span}v${1 / scale.y}h${-span}z`);
      }
      previous = shade;
      start = column;
    }
  }
  return [...palette].map(([shade, spans]) => {
    const rgb = [10, 5, 0].map(shift => Math.round((shade >> shift & 31) * 255 / 31)).join(',');
    return `<path d="${spans.join('')}" fill="rgb(${rgb})" fill-opacity="${(shade >> 15) / 15}"/>`;
  }).join('');
}

// Transfer the live brush buffer into SVG spans so SVG clipping and multiply use the same paint stack.
export function washLayer(seed, draw, blend = 'normal', crop = [0, 0, WIDTH, HEIGHT]) {
  const webgl = brushTarget(crop);
  brush.clear();
  brush.seed(seed);
  brush.noiseSeed(seed);
  brush.noField();
  draw();
  brush.render();

  const [x, y, width, height] = crop;
  const buffer = createRaster(width, height);
  const context = logicalContext(buffer, { willReadFrequently: true });
  drawRasterCrop(context, webgl, x, y, width, height, 0, 0, width, height);
  const spans = paintedSpans(context.getImageData(0, 0, buffer.width, buffer.height), x, y, rasterScale(buffer), blend === 'multiply');
  const index = washes.push(spans) - 1;
  return `<g data-wash="${index}" style="mix-blend-mode:${blend}"/>`;
}

export function waitForWashes(root) {
  const owner = root.ownerDocument;
  if (!libraries.has(root)) {
    const library = owner.createElementNS(NS, 'svg');
    library.setAttribute('width', '0');
    library.setAttribute('height', '0');
    library.setAttribute('aria-hidden', 'true');
    library.style.position = 'absolute';
    const definitions = owner.createElementNS(NS, 'defs');
    library.append(definitions);
    root.prepend(library);
    libraries.set(root, { definitions, count: 0 });
  }
  const library = libraries.get(root);
  const name = index => `s114-wash-${index}`;
  library.definitions.insertAdjacentHTML('beforeend', washes.slice(library.count).map((spans, index) =>
    `<g id="${name(index + library.count)}" shape-rendering="crispEdges">${spans}</g>`).join(''));
  library.count = washes.length;
  for (const layer of root.querySelectorAll('[data-wash]')) {
    if (layer.firstElementChild) continue;
    const brushMarks = owner.createElementNS(NS, 'use');
    brushMarks.setAttribute('href', `#${name(Number(layer.dataset.wash))}`);
    layer.append(brushMarks);
  }
}
