import { closedCurve, lerp, round } from '../../shared/canvasCore.js';
export { phase as ramp } from '../../shared/timelineHelper.js';

export function bank(from, to, edge, spacing = 14) {
  const steps = Math.max(1, Math.ceil(Math.abs(to - from) / spacing));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const x = lerp(from, to, i / steps);
    return [round(x), round(edge(x))];
  });
}

export const band = (top, bottom, from = -46, to = 1966, spacing = 14) =>
  closedCurve([...bank(from, to, top, spacing), ...bank(to, from, bottom, spacing)]);

export const edgePath = (from, to, edge, spacing) => 'M' + bank(from, to, edge, spacing).join('L');

export function group(id, content, attrs = '') {
  return `<g id="${id}" ${attrs}>${content}</g>`;
}

export function selectIds(root, names) {
  return Object.fromEntries(names.map(name => [name, root.querySelector(`#${name}`)]));
}
