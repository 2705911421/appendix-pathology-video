import { NS, RED } from '../shared/canvasCore.js';
import { createIleocecalAsset, ILEOCECAL_BOX } from '../shared/anatomyWatercolor.js';
import { createHistologyAsset, HISTOLOGY_DIAMETER } from '../shared/histologyProcedural.js';
import { drawPathologyProgress } from '../shared/leftFloatNotes.js';

export { phase } from '../shared/timelineHelper.js';

export function centeredSpecimen({ cx, cy, scale, ...options }) {
  const x = cx - ILEOCECAL_BOX.width * scale / 2;
  const y = cy - ILEOCECAL_BOX.height * scale / 2;
  return { ...createIleocecalAsset({ ...options, x, y, scale }), x, y, scale };
}

export function histologyLens({ mode, id, x, y, radius }) {
  return createHistologyAsset({
    id, stage: mode, x: x - radius, y: y - radius, scale: 2 * radius / HISTOLOGY_DIAMETER,
    showLayers: mode === 'simple',
  });
}

export function pathologyProgress(id, stage) {
  const notes = drawPathologyProgress({ id, stage });
  const template = document.createElementNS(NS, 'g');
  template.innerHTML = notes.lettering;
  const reminder = [...template.querySelectorAll('text')].find(node => node.textContent === '非每个患者必经固定流程');
  if (!reminder) throw new Error('The frozen stage notes are missing the variation reminder');
  reminder.setAttribute('font-size', '22');
  reminder.setAttribute('style', 'font-weight:750');
  reminder.setAttribute('fill', '#2E2924');
  reminder.querySelector('tspan').setAttribute('dy', '30');
  return { paint: notes.paint, lettering: template.innerHTML };
}

export function opacity(layer, id, amount) {
  layer.querySelector(`#${id}`).setAttribute('opacity', amount);
}

export function scaleAround(x, y, scale, targetX = x, targetY = y) {
  return `translate(${targetX} ${targetY}) scale(${scale}) translate(${-x} ${-y})`;
}

// The mask traces an ink stroke in its own coordinates. Text stays outside it.
export function traceMask(id, guide, width = 14, bounds = [-64, -16, 2000, 1100]) {
  const [x, y, w, h] = bounds;
  return `<mask id="${id}-mask" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}">
    <path id="${id}-trace" d="${guide}" fill="none" stroke="white" stroke-width="${width}"
      pathLength="1" stroke-linecap="butt" stroke-dasharray="1 1" stroke-dashoffset="1"/>
  </mask>`;
}

export function trace(layer, id, progress) {
  layer.querySelector(`#${id}-trace`).setAttribute('stroke-dashoffset', 1 - progress);
}

export const tangentPair = id => `<g id="${id}" stroke="${RED}" stroke-width="2.5" stroke-linecap="round"
    stroke-dasharray="8 8"><line/><line/></g>`;

export function setTangents(layer, id, anchor, circle, amount) {
  const dx = anchor.x - circle.x;
  const dy = anchor.y - circle.y;
  const distance = dx ** 2 + dy ** 2;
  const radiusSquared = circle.radius ** 2;
  if (distance <= radiusSquared) throw new RangeError('Magnified source must be outside the optical circle');
  const radial = radiusSquared / distance;
  const tangent = circle.radius * Math.sqrt(distance - radiusSquared) / distance;
  const group = layer.querySelector(`#${id}`);
  group.setAttribute('opacity', amount);
  for (const [i, line] of [...group.children].entries()) {
    const sign = i === 0 ? -1 : 1;
    line.setAttribute('x1', anchor.x);
    line.setAttribute('y1', anchor.y);
    line.setAttribute('x2', circle.x + radial * dx - sign * tangent * dy);
    line.setAttribute('y2', circle.y + radial * dy + sign * tangent * dx);
  }
}
