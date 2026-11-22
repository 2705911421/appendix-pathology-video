import { displayDensity } from '../renderProfile.js';

const logicalSizes = new WeakMap();

export function sizeRaster(canvas, width, height, density = displayDensity()) {
  canvas.width = Math.max(1, Math.round(width * density));
  canvas.height = Math.max(1, Math.round(height * density));
  setLogicalSize(canvas, width, height);
  if (canvas.style) {
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }
  return canvas;
}

export function createRaster(width, height, density = displayDensity()) {
  return sizeRaster(document.createElement('canvas'), width, height, density);
}

export function setLogicalSize(canvas, width, height) {
  logicalSizes.set(canvas, { width, height });
  return canvas;
}

export function logicalSize(canvas) {
  return logicalSizes.get(canvas) ?? { width: canvas.width, height: canvas.height };
}

export function rasterScale(canvas) {
  const { width, height } = logicalSize(canvas);
  return { x: canvas.width / width, y: canvas.height / height };
}

export function logicalContext(canvas, options) {
  const context = canvas.getContext('2d', options);
  const { x, y } = rasterScale(canvas);
  context.setTransform(x, 0, 0, y, 0, 0);
  return context;
}

export function drawRaster(context, source, x = 0, y = 0, width, height) {
  const size = logicalSize(source);
  context.drawImage(source, x, y, width ?? size.width, height ?? size.height);
}

export function drawRasterCrop(context, source, x, y, w, h, ...destination) {
  const scale = rasterScale(source);
  context.drawImage(source, x * scale.x, y * scale.y, w * scale.x, h * scale.y, ...destination);
}
