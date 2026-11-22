import { HEIGHT, WIDTH, ease } from '../../shared/canvasCore.js';
import { createRaster, rasterScale } from '../../shared/detail/raster.js';

function hash(x, y) {
  let n = Math.imul(x + 173, 374761393) ^ Math.imul(y + 91, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 0x100000000;
}

export function addPaperGrain(layer) {
  const canvas = createRaster(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const scale = rasterScale(canvas);
  const pixels = ctx.createImageData(width, height);
  const { data } = pixels;
  for (let y = 0; y < height; y++) {
    const logicalY = y / scale.y;
    const caption = 1 - .87 * ease((logicalY - 887) / 33);
    const fibreRow = Math.floor(logicalY * .68);
    for (let x = 0; x < width; x++) {
      const fibre = hash(Math.floor((x / scale.x + logicalY * .24) / 3.8), fibreRow);
      const grain = .78 * (hash(x, y) - .5) + .22 * (fibre - .5);
      const i = (y * width + x) * 4;
      data[i] = grain < 0 ? 84 : 255;
      data[i + 1] = grain < 0 ? 66 : 251;
      data[i + 2] = grain < 0 ? 51 : 241;
      data[i + 3] = Math.round(255 * Math.min(.034, Math.abs(grain) * .071) * caption);
    }
  }
  ctx.putImageData(pixels, 0, 0);
  layer.append(canvas);
}
