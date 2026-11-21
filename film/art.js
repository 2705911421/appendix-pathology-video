import {bake, drawWash, initBaker} from './lib/wash.js';

export const PAPER = '#F4EFE6';
export const INK = '#292326';
export const MUTED = '#443B3D';
export const COLORS = ['#F5D5D0', '#B82929', '#D8C27A', '#332E2E'];
export const STAGES = ['粉白', '暗红', '灰黄', '焦黑'];
export const clamp = (value, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, value));
export const ease = x => { const k = clamp(x); return k * k * (3 - 2 * k); };
export const mix = (a, b, t) => a + (b - a) * t;

export function prng(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function layer(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw?.(canvas.getContext('2d'), canvas);
  return canvas;
}

export function shape(g, data, fill, edge, width = 1) {
  const path = typeof data === 'string' ? new Path2D(data) : data;
  if (fill) { g.fillStyle = fill; g.fill(path); }
  if (edge) { g.strokeStyle = edge; g.lineWidth = width; g.stroke(path); }
  return path;
}

export function ellipse(g, x, y, rx, ry, fill, edge, width = 1, angle = 0) {
  const p = new Path2D();
  p.ellipse(x, y, rx, ry, angle, 0, 2 * Math.PI);
  return shape(g, p, fill, edge, width);
}

export function line(g, points, color, width = 2, dash = []) {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.setLineDash(dash);
  g.beginPath();
  for (const [i, point] of points.entries()) {
    if (i) g.lineTo(...point);
    else g.moveTo(...point);
  }
  g.stroke();
  g.restore();
}

export function box(g, x, y, width, height, r, fill, edge, thickness = 1) {
  const p = new Path2D();
  p.roundRect(x, y, width, height, r);
  return shape(g, p, fill, edge, thickness);
}

const paperTones = new Map();
let annotationObserver;

function linearChannel(component) {
  const c = component / 255;
  return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
}

function toneLuminance(rgb) {
  return rgb.map(linearChannel).reduce((sum, c, i) => sum + c * [.2126,.7152,.0722][i], 0);
}

const paperInkLimit = toneLuminance([74,74,74]);

function paperInk(color) {
  if (!paperTones.has(color)) {
    const rgb = color.match(/[a-f0-9]{2}/giu).map(value => parseInt(value, 16));
    let ink = rgb;
    while (toneLuminance(ink) > paperInkLimit) ink = ink.map(c => Math.floor(c * .94));
    paperTones.set(color, {value:`rgb(${ink.join(',')})`, luminance:toneLuminance(ink)});
  }
  return paperTones.get(color);
}

export function measureAnnotations(draw) {
  const annotations = [];
  annotationObserver = record => annotations.push(record);
  try { draw(); }
  finally { annotationObserver = undefined; }
  return annotations;
}

export function label(g, value, x, y, size = 30, color = INK, weight = 620, align = 'left', surface = 'paper') {
  const tone = surface === 'paper' ? paperInk(color) : {value:color, luminance:1};
  g.font = `${weight} ${size}px Notes, "Microsoft YaHei", sans-serif`;
  g.fillStyle = tone.value;
  g.textAlign = align;
  g.textBaseline = 'alphabetic';
  g.fillText(value, x, y);
  if (annotationObserver && g.globalAlpha > 0) {
    const matrix = g.getTransform();
    const ink = g.measureText(value);
    const corners = [x-ink.actualBoundingBoxLeft, x+ink.actualBoundingBoxRight].flatMap(px =>
      [y-ink.actualBoundingBoxAscent, y+ink.actualBoundingBoxDescent].map(py => matrix.transformPoint({x:px,y:py})));
    annotationObserver({value, size:size*Math.hypot(matrix.c,matrix.d), luminance:tone.luminance,
      contrastLimit:paperInkLimit, surface, alpha:g.globalAlpha,
      inkBounds:[Math.min(...corners.map(p=>p.x)),Math.min(...corners.map(p=>p.y)),
        Math.max(...corners.map(p=>p.x)),Math.max(...corners.map(p=>p.y))]});
  }
}

export function arrow(g, x1, y1, x2, y2, color = INK, width = 3) {
  const direction = Math.atan2(y2 - y1, x2 - x1);
  line(g, [[x1, y1], [x2, y2]], color, width);
  line(g, [[x2 - 15 * Math.cos(direction - .55), y2 - 15 * Math.sin(direction - .55)],
    [x2, y2], [x2 - 15 * Math.cos(direction + .55), y2 - 15 * Math.sin(direction + .55)]], color, width);
}

export function note(g, text, x, y, color = MUTED) {
  label(g, text, x, y, 28, color, 570);
}

export function roughShape(g, p, fill, stroke = '#382B2A', seed = 31, hachure = false) {
  rough.canvas(g.canvas).path(p, {
    fill, stroke, strokeWidth: 2.5, roughness: .63, bowing: .28, seed,
    fillStyle: hachure ? 'hachure' : 'solid', hachureAngle: -41, hachureGap: 5, fillWeight: 1.05,
    preserveVertices: true,
  });
}

export function polygon(g, vertices, fill, edge, width = 1) {
  const p = new Path2D();
  for (const [i, point] of vertices.entries()) {
    if (i) p.lineTo(...point);
    else p.moveTo(...point);
  }
  p.closePath();
  return shape(g, p, fill, edge, width);
}

export function blob(g, x, y, rx, ry, fill, seed, edge) {
  const rand = prng(seed);
  const points = Array.from({length: 20}, (_, i) => {
    const th = Math.PI * 2 * i / 20;
    const r = .82 + .31 * rand();
    return [x + Math.cos(th) * rx * r, y + Math.sin(th) * ry * r];
  });
  const p = new Path2D();
  p.moveTo((points[19][0] + points[0][0]) / 2, (points[19][1] + points[0][1]) / 2);
  for (const [i, [px, py]] of points.entries()) {
    const next = points[(i + 1) % points.length];
    p.quadraticCurveTo(px, py, (px + next[0]) / 2, (py + next[1]) / 2);
  }
  p.closePath();
  return shape(g, p, fill, edge, 1);
}

export function glow(g, x, y, radius, color, alpha = 1) {
  const gradient = g.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, `${color.slice(0, 7)}00`);
  g.save(); g.globalAlpha *= alpha;
  ellipse(g, x, y, radius, radius, gradient);
  g.restore();
}

export async function prepareWash() {
  await initBaker();
  const colors = {pink: '#C66B78', red: '#AB2327', yellow: '#C29435', black: '#554047',
    lilac: '#91588D', fibrin: '#C5AE86', mesentery: '#DFCAA1'};
  for (const [i, [name, color]] of Object.entries(colors).entries()) {
    bake(name, (b, p) => {
      for (let j = 0; j < 3; j++) {
        p.fill(b, p.blob(80 * (j - 1), (j - 1) * 65, 380 - 27 * j, 31, .34, 79 + j * 10),
          color, 72, .36, [.55, .47]);
      }
    }, {seed: 15 + i, soft: true, edge: .14, bleed: .2});
  }
}

export const wash = (g, name, x, y, size, alpha) => drawWash(g, name, x, y, size, {alpha});

export function paper(dividers = true) {
  return layer(1920, 1080, g => {
    g.fillStyle = PAPER;
    g.fillRect(0, 0, 1920, 1080);
    g.lineWidth = 1;
    g.strokeStyle = '#E2DDD3';
    g.beginPath();
    for (let x = 0; x <= 1920; x += 40) { g.moveTo(x + .5, 0); g.lineTo(x + .5, 1080); }
    for (let y = 0; y <= 1080; y += 40) { g.moveTo(0, y + .5); g.lineTo(1920, y + .5); }
    g.stroke();
    const rand = prng(508);
    for (let i = 0; i < 26000; i++) {
      g.fillStyle = i % 3 ? '#6954480D' : '#FFFFFF55';
      g.fillRect(rand() * 1920, rand() * 1080, .5 + rand(), .5 + rand());
    }
    if (dividers) {
      line(g, [[490, 52], [490, 882]], '#AB928B', 2);
      line(g, [[51, 888], [1869, 888]], '#B8A39A', 1);
    }
  });
}
