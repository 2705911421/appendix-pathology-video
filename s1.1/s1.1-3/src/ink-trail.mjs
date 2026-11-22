import { getStroke } from 'perfect-freehand';
import { closedCurve, fillPath, lerp, samplePath } from '../../shared/canvasCore.js';

export function inkTrail(d, { color, size = 4, seed = 1, head = 0 } = {}) {
  const guide = samplePath(d, 7);
  const last = guide.length - 1;
  const pressure = i => .56 + .21 * Math.sin(i * .25 + seed);
  function draw(points, width) {
    return fillPath(closedCurve(getStroke(points, {
      size: width, thinning: .7, smoothing: .62, streamline: .24,
      simulatePressure: false, last: true, start: { taper: 5 }, end: { taper: 8 },
    })), color, .91);
  }
  return (progress, dx = 0, dy = 0) => {
    if (progress <= 0) return '';
    const end = Math.min(last, last * progress);
    const steps = Math.ceil(end);
    const points = Array.from({ length: steps + 1 }, (_, i) => {
      const at = Math.min(i, end);
      const index = Math.floor(at);
      const a = guide[index];
      const b = guide[index + 1] ?? a;
      const weight = (at / last) ** 2;
      return [lerp(a[0], b[0], at - index) + dx * weight,
        lerp(a[1], b[1], at - index) + dy * weight, pressure(at)];
    });
    const line = draw(points, size);
    if (head === 0 || progress <= .90) return line;
    const growth = (progress - .90) * 10;
    const [x, y] = points.at(-1);
    const [px, py] = points.at(-2);
    const angle = Math.atan2(y - py, x - px);
    const fin = side => [x - growth * head * Math.cos(angle + side * .50),
      y - growth * head * Math.sin(angle + side * .50), .44];
    return line + draw([fin(-1), [x, y, .72], fin(1)], size * .79);
  };
}
