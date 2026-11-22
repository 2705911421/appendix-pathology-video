export { phase as appear } from '../../shared/timelineHelper.js';

export const INK = '#1F1C19';
export const SOFT_INK = '#4E4842';
export const CINNABAR = '#C43428';

export function reveal(group, strength, rise = 12) {
  group.setAttribute('opacity', strength);
  group.setAttribute('transform', `translate(0 ${rise * (1 - strength)})`);
}

export function penProgress(path, strength) {
  path.setAttribute('stroke-dashoffset', 1 - strength);
}

export function inkMask(id, [x, y, width, height], strokes) {
  return `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${width}" height="${height}">
    <g fill="none" stroke="white" stroke-linecap="round" stroke-linejoin="round">
      ${strokes.map(([d, size]) => `<path d="${d}" stroke-width="${size}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`).join('')}
    </g></mask></defs>`;
}

export const label = (content, x, y, {
  size = 38, fill = INK, weight = 750, anchor = 'middle', hand = false, fit,
} = {}) => `<text x="${x}" y="${y}" fill="${fill}" text-anchor="${anchor}" font-size="${size}"
  ${fit ? `textLength="${fit}" lengthAdjust="spacingAndGlyphs"` : ''}
  style="font-family:var(--${hand ? 'hand' : 'text'});font-weight:${weight}">${content}</text>`;
