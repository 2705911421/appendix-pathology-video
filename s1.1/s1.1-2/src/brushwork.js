import * as brush from 'p5.brush/standalone';
import { getStroke } from 'perfect-freehand';
import rough from 'roughjs';
import {
  HEIGHT, WIDTH, clamp, closedCurve, mulberry32, samplePath,
} from '../../shared/canvasCore.js';
import { createRaster, drawRasterCrop, logicalContext, rasterScale, setLogicalSize } from '../../shared/detail/raster.js';
import { displayDensity } from '../../shared/renderProfile.js';

export const calls = {
  fill: 0, fillBleed: 0, fillTexture: 0, set: 0,
  getStroke: 0, rough: 0, interpolate: 0, toCircle: 0,
};

let brushCanvas;
const roughGenerator = rough.generator();

function paintPoints(d, crop, spacing) {
  const [x, y] = crop;
  return samplePath(d, spacing, 240).slice(0, -1).map(([px, py]) =>
    [(px - x) * 2 - WIDTH / 2, (py - y) * 2 - HEIGHT / 2]);
}

// Rasterize brush marks on live, transparent canvases at twice the local drawing resolution.
export function watercolor(crop, seed, paint) {
  if (!brushCanvas) {
    brushCanvas = setLogicalSize(brush.createCanvas(WIDTH, HEIGHT, { parent: null, pixelDensity: displayDensity() }), WIDTH, HEIGHT);
  }
  brush.load(brushCanvas);
  brush.angleMode(brush.DEGREES);
  brush.clear();
  brush.seed(seed);
  brush.noiseSeed(seed);
  brush.noField();
  const wash = (d, color, strength, bleed, texture = .69, border = .53) => {
    brush.noStroke();
    brush.fill(color, strength);
    brush.fillBleed(bleed, 'out', 25);
    brush.fillTexture(texture, border, true, .23);
    brush.polygon(paintPoints(d, crop, 6));
    calls.fill++;
    calls.fillBleed++;
    calls.fillTexture++;
  };
  const charcoal = (d, color, weight = .45) => {
    brush.noFill();
    brush.set('charcoal', color, weight);
    brush.hatchStyle('charcoal', color, weight);
    brush.noStroke();
    brush.hatch(9, 48, { rand: .34, continuous: false, gradient: .26 });
    brush.polygon(paintPoints(d, crop, 5));
    brush.noHatch();
    calls.set++;
  };
  paint(wash, charcoal);
  brush.render();
  const [, , width, height] = crop;
  const canvas = createRaster(width, height, Math.max(2, displayDensity()));
  const ctx = logicalContext(canvas, { willReadFrequently: true });
  drawRasterCrop(ctx, brushCanvas, 0, 0, width * 2, height * 2, 0, 0, width, height);
  // The brush framebuffer is white. Remove its paper matte while retaining the pigment neutrals.
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = pixels;
  for (let i = 0; i < data.length; i += 4) {
    const amount = 255 - Math.min(data[i], data[i + 1], data[i + 2]);
    if (amount <= 1) {
      data[i + 3] = 0;
      continue;
    }
    const alpha = Math.min(1, amount / 121);
    for (let channel = i; channel < i + 3; channel++) {
      data[channel] = 255 - (255 - data[channel]) / alpha;
    }
    data[i + 3] *= alpha;
  }
  ctx.putImageData(pixels, 0, 0);
  return { canvas, crop };
}

export function glaze(ctx, { canvas, crop }) {
  ctx.drawImage(canvas, ...crop);
}

export function liveLayer(crop) {
  const [x, y, width, height] = crop;
  const canvas = createRaster(width, height, Math.max(2, displayDensity()));
  const scale = rasterScale(canvas);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scale.x, 0, 0, scale.y, -x * scale.x, -y * scale.y);
  return { canvas, crop, ctx };
}

export const trace = points => `M${points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}`;

export function fill(ctx, d, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.fill(typeof d === 'string' ? new Path2D(d) : d);
  ctx.restore();
}

export function stroke(ctx, d, color, width, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(typeof d === 'string' ? new Path2D(d) : d);
  ctx.restore();
}

function pathWithLength(d) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  return path;
}

function strokePoints(d, progress) {
  if (progress >= 1) return samplePath(d, 2.9);
  const path = pathWithLength(d);
  const length = path.getTotalLength();
  const stop = length * progress;
  const spacing = length / Math.max(2, Math.min(240, Math.ceil(length / 2.9)));
  const distances = Array.from({ length: Math.ceil(stop / spacing) }, (_, i) => i * spacing);
  return [...distances, stop].map(distance => {
    const { x, y } = path.getPointAtLength(distance);
    return [x, y];
  });
}

export function pressured(d, size, seed = 31, progress = 1) {
  const rand = mulberry32(seed);
  const points = strokePoints(d, progress).map(([x, y], i) =>
    [x, y, clamp(.62 + .21 * Math.sin(i * .24 + seed) + .18 * (rand() - .5))]);
  const outline = getStroke(points, {
    size, thinning: .65, smoothing: .58, streamline: .24, simulatePressure: false, last: true,
    start: { taper: size * 1.8 }, end: { taper: size * 2.4 },
  });
  calls.getStroke++;
  return new Path2D(closedCurve(outline));
}

export function ink(ctx, d, color, size, alpha = 1, seed) {
  fill(ctx, pressured(d, size, seed), color, alpha);
}

export function inkReveal(ctx, d, color, size, progress, alpha = 1, seed) {
  if (progress <= 0 || alpha <= 0) return;
  fill(ctx, pressured(d, size, seed, progress), color, alpha);
}

export function dotted(ctx, d, color, size, dash = 11, gap = 7, progress = 1) {
  if (progress <= 0) return;
  const path = pathWithLength(d);
  const length = path.getTotalLength() * progress;
  for (let from = 0; from < length - 2; from += dash + gap) {
    const points = Array.from({ length: 4 }, (_, i) => {
      const { x, y } = path.getPointAtLength(Math.min(length, from + i * dash / 3));
      return [x, y];
    });
    ink(ctx, trace(points), color, size, 1, 31 + Math.round(from));
  }
}

export function roughCircle(ctx, x, y, diameter, color, weight, seed) {
  const drawable = roughGenerator.circle(x, y, diameter, {
    stroke: color, strokeWidth: weight, roughness: .52, bowing: .45, disableMultiStroke: true, seed,
  });
  for (const path of roughGenerator.toPaths(drawable)) stroke(ctx, path.d, path.stroke, path.strokeWidth);
  calls.rough++;
}

export function circle(ctx, x, y, rx, ry, color, opacity = 1, angle = 0) {
  const path = new Path2D();
  path.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
  fill(ctx, path, color, opacity);
}
