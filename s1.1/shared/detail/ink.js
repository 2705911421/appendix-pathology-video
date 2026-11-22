import { getStroke } from 'perfect-freehand';
import rough from 'roughjs';
import { INK, clamp, closedCurve, fillPath, mulberry32, samplePath } from './geometry.js';

const props = rough.generator();

export function inkOutline(d, {
  size = 3.3, seed = 12, taperStart = 8, taperEnd = 16,
} = {}) {
  const rand = mulberry32(seed);
  const samples = samplePath(d, 4.5).map(([x, y], i) => [
    x, y, clamp(0.59 + 0.21 * Math.sin(i * 0.29 + seed) + (rand() - 0.5) * 0.17),
  ]);
  const outline = getStroke(samples, {
    size, thinning: 0.65, smoothing: 0.58, streamline: 0.25, simulatePressure: false, last: true,
    start: { taper: taperStart, cap: true },
    end: { taper: taperEnd, cap: true },
  });
  return closedCurve(outline);
}

export function ink(d, { color = INK, opacity = 1, ...pressure } = {}) {
  return fillPath(inkOutline(d, pressure), color, opacity);
}

export function inkLines(paths, options = {}) {
  return paths.map((path, index) => ink(path, { seed: 38 + index * 107, ...options })).join('');
}

export function arrow(d, { size = 3.2, color = INK, head = 19, opacity = 1 } = {}) {
  const points = samplePath(d, 10);
  const [x, y] = points.at(-1);
  const [px, py] = points.at(-2);
  const angle = Math.atan2(y - py, x - px);
  const tip = [angle + 0.57, angle - 0.57].map(a => [
    x - head * Math.cos(a), y - head * Math.sin(a),
  ]);
  const end = `M${tip[0]} Q${x - 4 * Math.cos(angle)} ${y - 4 * Math.sin(angle)} ${x} ${y} L${tip[1]}`;
  return ink(d, { size, color, opacity, taperEnd: 3 })
    + ink(end, { size: size * 1.1, color, opacity, taperStart: 5, taperEnd: 7 });
}

export function brace(x, y0, y1, color = INK) {
  const m = (y0 + y1) / 2;
  const k = Math.min(8, (y1 - y0) * 0.12);
  return ink(`M${x + 14} ${y0} Q${x} ${y0} ${x} ${y0 + k}
    L${x} ${m - k} Q${x} ${m - 1} ${x - 10} ${m}
    Q${x} ${m + 1} ${x} ${m + k} L${x} ${y1 - k}
    Q${x} ${y1} ${x + 14} ${y1}`,
  { size: 3, color, taperStart: 5, taperEnd: 5 });
}

export function roughProp(method, geometry, seed, stroke, strokeWidth, roughness = 0.48) {
  const drawable = props[method](...geometry, {
    seed, roughness, stroke, strokeWidth, bowing: 0.42, disableMultiStroke: true,
  });
  return props.toPaths(drawable).map(p => `<path d="${p.d}" fill="${p.fill ?? 'none'}"
    stroke="${p.stroke}" stroke-width="${p.strokeWidth}" stroke-linecap="round"/>`).join('');
}
