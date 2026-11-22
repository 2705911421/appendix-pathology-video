import { HEIGHT, INK, PAPER, RED, WIDTH, createRaster, lerp, mulberry32, rasterScale, storySubtitleAt } from '../../shared/canvasCore.js';
import { paintSurfaces } from './brush.mjs';
import { ramp } from './geometry.mjs';

const paths = new WeakMap();
const noteFont = '"Noto Serif SC", "KaiTi", serif';
const captionFont = '"Noto Sans SC", "Microsoft YaHei", sans-serif';

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
  const font = size => `${weight} ${size}px ${noteFont}`;
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

function paperSurface(pixelScale) {
  const canvas = createRaster(WIDTH, HEIGHT, pixelScale);
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

function captions(ctx, subtitles, p) {
  const shade = ctx.createLinearGradient(0, 867, 0, 922);
  shade.addColorStop(0, 'rgba(245, 241, 233, 0)');
  shade.addColorStop(1, PAPER);
  ctx.fillStyle = shade;
  ctx.fillRect(0, 867, WIDTH, HEIGHT - 867);

  const { page, opacity } = storySubtitleAt(subtitles, p);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.font = `750 42px ${captionFont}`;
  const widths = page.zh.map(({ text }) => ctx.measureText(text).width);
  const total = widths.reduce((sum, width) => sum + width, 0);
  const scale = Math.min(1, (WIDTH - 124) / total);
  ctx.save();
  ctx.translate(WIDTH / 2, 963);
  ctx.scale(scale, 1);
  let left = -total / 2;
  for (const [i, { text, highlight }] of page.zh.entries()) {
    ctx.fillStyle = highlight ? RED : '#1F1C19';
    ctx.fillText(text, left, 0);
    left += widths[i];
  }
  ctx.restore();
  ctx.font = `500 24px ${captionFont}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#5C564E';
  ctx.fillText(page.en, WIDTH / 2, 1008, WIDTH - 124);
  ctx.restore();
}

export function createArtSurface(layer, pixelScale = 1) {
  const canvas = createRaster(WIDTH, HEIGHT, pixelScale);
  canvas.style.display = 'block';
  layer.append(canvas);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const paperTexture = paperSurface(pixelScale);
  const sceneArt = (context, root) => {
    for (const child of root.children) paintNode(context, root, child, pixelScale);
  };
  function draw(root, lettering, id, p, subtitles, prior) {
    ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    if (prior) {
      ctx.save();
      ctx.globalAlpha = prior.opacity;
      ctx.drawImage(prior.canvas, 0, 0, WIDTH, HEIGHT);
      ctx.restore();
    }
    sceneArt(ctx, root);
    if (id === 'S11' && p < .18) {
      const width = lerp(1, 2200, ramp(p, 0, .18));
      const left = (WIDTH - width) / 2;
      const right = left + width;
      const paper = ctx.createLinearGradient(left, 0, right, 0);
      paper.addColorStop(0, '#0000');
      paper.addColorStop(.065, '#000');
      paper.addColorStop(.935, '#000');
      paper.addColorStop(1, '#0000');
      ctx.save();
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.restore();
    }
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.drawImage(paperTexture, 0, 0, WIDTH, HEIGHT);
    ctx.restore();
    const graphicOpacity = ramp(p, .08, .13) * (1 - ramp(p, .88, 1));
    if (graphicOpacity > 0) {
      ctx.save();
      ctx.globalAlpha = graphicOpacity;
      sceneArt(ctx, lettering);
      ctx.restore();
    }
    captions(ctx, subtitles, p);
  }
  draw.bake = root => {
    const baked = document.createElement('canvas');
    baked.width = canvas.width;
    baked.height = canvas.height;
    const context = baked.getContext('2d', { willReadFrequently: true });
    context.scale(pixelScale, pixelScale);
    sceneArt(context, root);
    return baked;
  };
  return draw;
}
