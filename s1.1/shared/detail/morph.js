import flubber from 'flubber';
import { ellipse } from './geometry.js';

const mix = (progress) => Math.max(0, Math.min(1, progress));

export function morphShape(from, to, maxSegmentLength = 12) {
  const between = flubber.interpolate(from, to, { maxSegmentLength });
  return (progress) => between(mix(progress));
}

export function morphToLens(from, { x, y, radius }, maxSegmentLength = 12) {
  const between = flubber.toCircle(from, x, y, radius, { maxSegmentLength });
  const circle = ellipse(x, y, radius, radius);
  return (progress) => {
    if (progress <= 0) return from;
    if (progress >= 1) return circle;
    return between(progress);
  };
}
