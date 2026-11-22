import { HEIGHT, INK, WIDTH, createRaster, drawPreparedStorySubtitles, drawSubtitlePaper } from '../../shared/canvasCore.js';
import { createStoryPaperSurface } from '../../shared/detail/transitionPaper.js';
import { SERIF_FONT } from '../../shared/fonts.js';
import { paintSurfaces } from './brush.mjs';

const paths = new WeakMap();

function shape(node) {
  const d = node.getAttribute('d');
  const recent = paths.get(node);
  if (recent?.d === d) return recent.path;
  const num = name => Number(node.getAttribute(name));
  let path;
  if (node.localName === 'path' && d) {
    path = new Path2D(d);
  } else if (node.localName === 'ellipse') {
    path = new Path2D();
    path.ellipse(num('cx'), num('cy'), num('rx'), num('ry'), 0, 0, Math.PI * 2);
  } else if (node.localName === 'circle') {
    path = new Path2D();
    path.arc(num('cx'), num('cy'), num('r'), 0, Math.PI * 2);
  } else if (node.localName === 'rect') {
    path = new Path2D();
    path.rect(num('x'), num('y'), num('width'), num('height'));
  }
  if (!['circle', 'rect'].includes(node.localName)) paths.set(node, { d, path });
  return path;
}

function transform(node) {
  return node.transform?.baseVal.consolidate()?.matrix;
}

function clip(ctx, root, value) {
  const id = value.slice('url(#'.length, -1);
  const definition = root.querySelector(`#${id}`);
  const path = new Path2D();
  for (const child of definition.children) {
    const matrix = transform(child);
    path.addPath(shape(child), matrix ? new DOMMatrix([matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]) : undefined);
  }
  ctx.clip(path);
}

function paintText(ctx, node) {
  const weight = node.classList.contains('title') ? 740 : 600;
  const fontSize = Number(node.getAttribute('font-size') ?? (node.classList.contains('micro-layer') ? 26 : 32));
  const fill = node.getAttribute('fill') ?? INK;
  const text = [...node.childNodes].map(child => ({
    text: child.textContent,
    fill: child.getAttribute?.('fill') ?? fill,
    size: Number(child.getAttribute?.('font-size') ?? fontSize),
    opacity: Number(child.getAttribute?.('opacity') ?? 1),
  }));
  const font = size => `${weight} ${size}px ${SERIF_FONT}`;
  const widths = text.map(item => {
    ctx.font = font(item.size);
    return ctx.measureText(item.text).width;
  });
  const total = widths.reduce((sum, width) => sum + width, 0);
  const anchor = node.getAttribute('text-anchor');
  const left = anchor === 'end' ? total : anchor === 'middle' ? total * .5 : 0;
  let x = Number(node.getAttribute('x')) - left;
  const y = Number(node.getAttribute('y'));
  const opacity = ctx.globalAlpha;
  for (const [i, item] of text.entries()) {
    ctx.font = font(item.size);
    ctx.fillStyle = item.fill;
    ctx.globalAlpha = opacity * item.opacity;
    if (item.opacity > 0) ctx.fillText(item.text, x, y);
    x += widths[i];
  }
  ctx.globalAlpha = opacity;
}

const artworkCache = new WeakMap();

function paintNode(ctx, root, node, pixelScale) {
  if (node.localName === 'defs' || node.hasAttribute('hidden')) return;
  const opacity = Number(node.getAttribute('opacity') ?? 1);
  if (opacity === 0) return;
  ctx.save();
  const matrix = transform(node);
  if (matrix) ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
  ctx.globalAlpha *= opacity;
  const clipping = node.getAttribute('clip-path');
  if (clipping) clip(ctx, root, clipping);

  if (node.hasAttribute('data-paint-cache')) {
    let baked = artworkCache.get(node);
    if (!baked) {
      baked = document.createElement('canvas');
      baked.width = WIDTH * pixelScale;
      baked.height = HEIGHT * pixelScale;
      const offscreen = baked.getContext('2d', { willReadFrequently: true });
      offscreen.scale(pixelScale, pixelScale);
      for (const child of node.children) paintNode(offscreen, root, child, pixelScale);
      artworkCache.set(node, baked);
    }
    ctx.drawImage(baked, 0, 0, WIDTH, HEIGHT);
    ctx.restore();
    return;
  }
  if (node.localName === 'foreignObject') {
    const live = node.querySelector('canvas');
    if (!live) throw new Error('Shared procedural canvas failed to mount');
    const x = Number(node.getAttribute('x') ?? 0);
    const y = Number(node.getAttribute('y') ?? 0);
    const width = Number(node.getAttribute('width') ?? live.width);
    const height = Number(node.getAttribute('height') ?? live.height);
    ctx.drawImage(live, x, y, width, height);
    ctx.restore();
    return;
  }
  const source = paintSurfaces.get(node);
  if (source) ctx.drawImage(source, 0, 0, WIDTH, HEIGHT);
  if (node.localName === 'text') paintText(ctx, node);
  const path = shape(node);
  if (path) {
    const fill = node.getAttribute('fill') ?? '#000';
    const stroke = node.getAttribute('stroke');
    if (fill !== 'none') {
      ctx.fillStyle = fill;
      ctx.fill(path);
    }
    if (stroke && stroke !== 'none') {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Number(node.getAttribute('stroke-width') ?? 1);
      ctx.lineCap = node.getAttribute('stroke-linecap') ?? 'butt';
      ctx.lineJoin = node.getAttribute('stroke-linejoin') ?? 'miter';
      const dash = node.getAttribute('stroke-dasharray');
      if (dash) ctx.setLineDash(dash.split(/[ ,]+/).map(Number));
      ctx.lineDashOffset = Number(node.getAttribute('stroke-dashoffset') ?? 0);
      ctx.stroke(path);
    }
  }
  for (const child of node.children) paintNode(ctx, root, child, pixelScale);
  ctx.restore();
}

export function createArtSurface(layer, pixelScale = 1) {
  const canvas = createRaster(WIDTH, HEIGHT, pixelScale);
  canvas.style.display = 'block';
  layer.append(canvas);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const paperTexture = createStoryPaperSurface(pixelScale);
  return (layers, subtitles, p) => {
    ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
    ctx.drawImage(paperTexture, 0, 0, WIDTH, HEIGHT);
    for (const { art, lettering, opacity = 1, scale = 1, dx = 0, dy = 0 } of layers) {
      if (opacity <= 0) continue;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.transform(scale, 0, 0, scale, WIDTH / 2 * (1 - scale) + dx, 465 * (1 - scale) + dy);
      for (const root of [art, lettering]) {
        for (const child of root.children) paintNode(ctx, root, child, pixelScale);
      }
      ctx.restore();
    }
    if (subtitles) {
      drawSubtitlePaper(ctx);
      drawPreparedStorySubtitles(ctx, subtitles, p);
    }
  };
}
