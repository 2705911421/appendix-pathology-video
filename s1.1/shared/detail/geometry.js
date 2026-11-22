import { renderProfile } from '../renderProfile.js';

export const WIDTH = renderProfile.logicalWidth;
export const HEIGHT = renderProfile.logicalHeight;
export const PAPER = '#F5F1E9';
export const INK = '#1F1C19';
export const RED = '#C43428';
export const GOLD = '#D4A537';
export const NS = 'http://www.w3.org/2000/svg';

export const clamp = (x, min = 0, max = 1) => Math.max(min, Math.min(max, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (x) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
export const easeOutCubic = (x) => 1 - (1 - clamp(x)) ** 3;
export const round = (x) => Math.round(x * 100) / 100;

export function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    n = n + Math.imul(n ^ (n >>> 7), 61 | n) ^ n;
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

export function samplePath(d, spacing = 8, max = 360) {
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', d);
  const length = path.getTotalLength();
  const count = clamp(Math.ceil(length / spacing), 2, max);
  return Array.from({ length: count + 1 }, (_, i) => {
    const { x, y } = path.getPointAtLength(i * length / count);
    return [x, y];
  });
}

export function closedCurve(points) {
  const middle = (a, b) => `${round((a[0] + b[0]) / 2)} ${round((a[1] + b[1]) / 2)}`;
  return `M${middle(points.at(-1), points[0])} ${points.map(([x, y], i) =>
    `Q${round(x)} ${round(y)} ${middle(points[i], points[(i + 1) % points.length])}`).join(' ')}Z`;
}

export function ellipse(cx, cy, rx, ry) {
  return `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`;
}

export function organic(cx, cy, rx, ry, seed, irregularity = 0.13, rotation = 0, nodes = 14) {
  const rand = mulberry32(seed);
  const sin = Math.sin(rotation);
  const cos = Math.cos(rotation);
  return closedCurve(Array.from({ length: nodes }, (_, i) => {
    const angle = i / nodes * Math.PI * 2;
    const r = 1 + (rand() * 2 - 1) * irregularity;
    const x = Math.cos(angle) * rx * r;
    const y = Math.sin(angle) * ry * r;
    return [cx + x * cos - y * sin, cy + x * sin + y * cos];
  }));
}

export const fillPath = (d, color, opacity = 1) =>
  `<path d="${d}" fill="${color}" opacity="${opacity}"/>`;

export const strokePath = (d, color, width, opacity = 1) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"/>`;

export const cellDot = (x, y, rx, ry, color, rotation = 0, opacity = 1) =>
  `<ellipse cx="${round(x)}" cy="${round(y)}" rx="${round(rx)}" ry="${round(ry)}" transform="rotate(${round(rotation)} ${round(x)} ${round(y)})" fill="${color}" opacity="${round(opacity)}"/>`;

let instance = 0;
export function svgId(prefix, id) {
  const value = id ?? `${prefix}-${++instance}`;
  if (!/^[a-z][\w-]*$/iu.test(value)) throw new TypeError('Expected a unique SVG id');
  return value;
}

export function scopeSvg(markup, id) {
  return markup.replace(/(id="|url\(#|href="#)([a-z][\w-]*)/giu,
    (_, attribute, name) => `${attribute}${id}-${name}`);
}
