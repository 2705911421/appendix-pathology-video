import { NS, RED, arrow, lerp } from '../shared/canvasCore.js';
import { makeCanvas, retainedCanvas } from '../shared/anatomyWatercolor.js';
import { logicalContext } from '../shared/detail/raster.js';
import {
  HISTOLOGY_DIAMETER, SIMPLE_MUSCLE_NEUTROPHILS, SIMPLE_SEROSAL_NEUTROPHILS, drawMicroNeutrophil,
} from '../shared/histologyProcedural.js';
import { histologyLens, opacity, phase, scaleAround, trace, traceMask } from './scene-tools.mjs';

const field = { x: 920, y: 465, radius: 285 };
const example = { x: 1430, y: 753, radius: 38 };
const microscopeScale = field.radius * 2 / HISTOLOGY_DIAMETER;
const projectCell = ([x, y]) => [field.x - field.radius + x * microscopeScale, field.y - field.radius + y * microscopeScale];
const muscleSweep = SIMPLE_MUSCLE_NEUTROPHILS.map(projectCell);
const serosaSweep = SIMPLE_SEROSAL_NEUTROPHILS.map(projectCell);
const [serosaX, serosaY] = serosaSweep.at(-1);
const callouts = [
  { id: 's16-upper', x: 1003, y: 405, lines: ['黏膜与黏膜下层聚集'], color: '#1F1C19', start: .25, end: .48 },
  { id: 's16-lower', x: 1062, y: 605, lines: ['肌层与浆膜层轻度水肿', '及少量中性粒细胞浸润'],
    color: RED, start: .55, end: .72 },
  { id: 's16-serosa', x: serosaX, y: serosaY, fromY: 634, lines: [], color: RED, start: .59, end: .76 },
];

function leader({ id, x, y, fromY = y, lines, color }) {
  const route = `M1350 ${fromY} Q${(x + 1350) / 2} ${fromY - 8} ${x} ${y}`;
  const label = lines.map((text, i) => `<tspan x="1370" dy="${i ? 37 : 0}">${text}</tspan>`).join('');
  return `<defs>${traceMask(id, route, 22)}</defs>
    <g mask="url(#${id}-mask)">${arrow(route, { color, size: 3.2, head: 11 })}</g>
    ${label ? `<text id="${id}-text" class="note" x="1370" y="${y + 8}" font-size="31" fill="${color}"
      style="font-weight:750">${label}</text>` : ''}`;
}

function tracedBraces(slide) {
  const template = document.createElementNS(NS, 'g');
  template.innerHTML = slide.lettering;
  const captions = [...template.querySelectorAll('.micro-layer')];
  const masks = captions.map((text, i) => {
    const id = `s16-brace-${i}`;
    const top = slide.layers[i];
    const bottom = slide.layers[i + 1];
    const stroke = text.previousElementSibling;
    stroke.setAttribute('mask', `url(#${id}-mask)`);
    text.id = `${id}-text`;
    return traceMask(id, `M-24 ${top - 2} V${bottom + 2}`, 48, [-53, top - 4, 53, bottom - top + 8]);
  });
  return `<g id="s16-brace-stack"><defs>${masks.join('')}</defs>${template.innerHTML}</g>`;
}

function cellLegend() {
  const { x, y, radius } = example;
  const canvas = makeCanvas(2 * radius, 2 * radius);
  drawMicroNeutrophil(logicalContext(canvas), radius, radius, 371, { scale: 6.4 });
  const cell = retainedCanvas('s16-example', canvas, { x: x - radius, y: y - radius });
  return {
    paint: `<g id="s16-legend">
      <g id="s16-legend-cell">${cell.markup}</g>
    </g>`,
    mount: cell.mount,
  };
}

const softFocus = `<defs>
  <clipPath id="s16-field-circle"><circle cx="920" cy="465" r="285"/></clipPath>
  <radialGradient id="s16-lens-glow">
    <stop stop-color="#FFF4CF" stop-opacity=".48" />
    <stop offset=".42" stop-color="#FFF0D2" stop-opacity=".20" />
    <stop offset="1" stop-color="#FFF0D2" stop-opacity="0" />
  </radialGradient>
  </defs>
  <g clip-path="url(#s16-field-circle)" style="mix-blend-mode:soft-light">
    <ellipse id="s16-sweep-upper" rx="98" ry="59" fill="url(#s16-lens-glow)"/>
    <ellipse id="s16-sweep-lower" rx="70" ry="51" fill="url(#s16-lens-glow)"/>
    <ellipse id="s16-sweep-serosa" rx="51" ry="23" fill="url(#s16-lens-glow)"/>
  </g>`;

function moveSweep(node, x, y, strength) {
  node.setAttribute('cx', x);
  node.setAttribute('cy', y);
  node.setAttribute('opacity', strength);
}

function sweepCells(node, positions, p, from, to) {
  const last = positions.length - 1;
  const travel = last * phase(p, from, to);
  const index = Math.min(last - 1, Math.floor(travel));
  const [x1, y1] = positions[index];
  const [x2, y2] = positions[index + 1];
  moveSweep(node, lerp(x1, x2, travel - index), lerp(y1, y2, travel - index),
    .86 * phase(p, from, from + .04) * (1 - phase(p, to, to + .09)));
}

export function s16() {
  const slide = histologyLens({ mode: 'simple', id: 's16-he', ...field });
  const legend = cellLegend();
  return {
    paint: `<g id="s16-field">${slide.paint}${softFocus}</g>` + legend.paint,
    lettering: `<text id="s16-title" class="note title" x="${field.x}" y="143"
      text-anchor="middle" font-size="28" fill="#1F1C19">H&amp;E 光学视野 · 单纯性</text>`
      + tracedBraces(slide) + callouts.map(leader).join('')
      + `<text id="s16-exudation-reference" class="note" x="1370" y="691" font-size="23" fill="#635650">渗出过程见前</text>
        <text id="s16-legend-label" class="note" x="1483" y="761" font-size="25" fill="#2E2924">分叶核中性粒细胞（放大）</text>`,
    audit: { ...slide.audit, lens: slide.lens },
    mount(art) {
      slide.mount(art);
      legend.mount(art);
    },
    update(art, labels, p, duration) {
      const push = phase(p * duration, 0, .15);
      const focus = scaleAround(field.x, field.y, lerp(.986, 1, push));
      art.querySelector('#s16-field').setAttribute('transform', focus);
      labels.querySelector('#s16-brace-stack').setAttribute('transform', focus);
      opacity(labels, 's16-title', lerp(.9, 1, push));

      for (let i = 0; i < 5; i++) {
        const drawn = phase(p, .15 + i * .039, .255 + i * .048);
        trace(labels, `s16-brace-${i}`, drawn);
        opacity(labels, `s16-brace-${i}-text`, phase(drawn, .46, .99));
      }
      for (const { id, start, end, lines } of callouts) {
        trace(labels, id, phase(p, start, end));
        if (lines.length) opacity(labels, `${id}-text`, phase(p, end - .05, end + .036));
      }

      const top = phase(p, .35, .59);
      moveSweep(art.querySelector('#s16-sweep-upper'), lerp(962, 1080, top), lerp(367, 439, top),
        .77 * phase(p, .355, .437) * (1 - phase(p, .555, .660)));
      sweepCells(art.querySelector('#s16-sweep-lower'), muscleSweep, p, .55, .80);
      sweepCells(art.querySelector('#s16-sweep-serosa'), serosaSweep, p, .68, .87);
      opacity(labels, 's16-exudation-reference', phase(p, .76, .86));

      const emerge = phase(p, .70, .85);
      const { x, y } = example;
      art.querySelector('#s16-legend').setAttribute('transform', scaleAround(x, y, lerp(.60, 1, emerge)));
      art.querySelector('#s16-legend-cell').setAttribute('transform',
        `rotate(${5.8 * Math.sin((p - .72) * 17)} ${x} ${y}) ${scaleAround(x, y, 1 + .027 * Math.sin(p * 23))}`);
      opacity(art, 's16-legend', emerge);
      opacity(labels, 's16-legend-label', phase(p, .74, .88));
    },
  };
}
