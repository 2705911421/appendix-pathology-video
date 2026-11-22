import { HEIGHT, WIDTH, mulberry32 } from './geometry.js';
import { createRaster, rasterScale } from './raster.js';

// Reuse the third act's blank paper at each cut, including its grain and grid.
export function createStoryPaperSurface(density) {
  const canvas = createRaster(WIDTH, HEIGHT, density);
  const ctx = canvas.getContext('2d');
  const texture = ctx.createImageData(canvas.width, canvas.height);
  const scale = rasterScale(canvas);
  const rand = mulberry32(12762);
  for (let y = 0; y < canvas.height; y++) {
    let fibre = 0;
    for (let x = 0; x < canvas.width; x++) {
      if ((x + y) % 4 === 0) fibre = (rand() - .5) * 2.6;
      const grain = (rand() - .5) * 4.9 + fibre;
      const grid = (Math.floor(x / scale.x) % 42 === 15 ? 5.6 : 0) + (Math.floor(y / scale.y) % 42 === 11 ? 5.6 : 0);
      const i = (y * canvas.width + x) * 4;
      texture.data[i] = 245 + grain - grid;
      texture.data[i + 1] = 241 + grain - grid;
      texture.data[i + 2] = 233 + grain - grid;
      texture.data[i + 3] = 255;
    }
  }
  ctx.putImageData(texture, 0, 0);
  return canvas;
}

export function mountPaperBridge(root, density) {
  const grain = root.querySelector(':scope > .story-grain');
  const halo = root.querySelector(':scope > .story-caption-halo');
  let paper;
  return (opacity, existingPaperOpacity = 1) => {
    const original = String((1 - opacity) * existingPaperOpacity);
    if (grain) grain.style.opacity = original;
    if (halo) halo.style.opacity = original;
    if (!paper && opacity === 0) return;
    if (!paper) {
      paper = createStoryPaperSurface(density);
      paper.dataset.bridgePaper = '';
      paper.setAttribute('aria-hidden', 'true');
      Object.assign(paper.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
      root.prepend(paper);
    }
    paper.style.opacity = String(opacity);
    paper.hidden = opacity === 0;
  };
}
