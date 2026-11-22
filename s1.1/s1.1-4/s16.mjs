import { NS, RED, arrow, lerp, roughProp } from '../shared/canvasCore.js';
import { makeCanvas, retainedCanvas } from '../shared/anatomyWatercolor.js';
import { logicalContext } from '../shared/detail/raster.js';
import { HISTOLOGY_DIAMETER, drawMicroNeutrophil } from '../shared/histologyProcedural.js';
import { evolutionPlate } from './s15.mjs';
import { histologyLens, opacity, pathologyProgress, phase, scaleAround, trace, traceMask } from './scene-tools.mjs';

const field = { x: 920, y: 465, radius: 285 };
const example = { x: 1430, y: 700, radius: 42 };
const microscopeScale = field.radius * 2 / HISTOLOGY_DIAMETER;
// The sweep crosses the four positions used by the frozen simple-stage recipe.
const muscleSweep = [[143, 349], [226, 401], [319, 363], [390, 433]]
  .map(([x, y]) => [field.x - field.radius + x * microscopeScale, field.y - field.radius + y * microscopeScale]);
const callouts = [
  { id: 's16-upper', x: 1003, y: 405, label: '黏膜与黏膜下层聚集', color: '#1F1C19', start: .35, end: .55 },
  { id: 's16-lower', x: 1062, y: 605, label: '平滑肌层仅散在寥寥几个', color: RED, start: .59, end: .81 },
];

function leader({ id, x, y, label, color }) {
  return `<defs>${traceMask(id, `M${x - 4} ${y} H1354`, 18)}</defs>
    <g mask="url(#${id}-mask)">${arrow(`M1350 ${y} H${x}`, { color, size: 2.9, head: 11 })}</g>
    <text id="${id}-text" class="note" x="1370" y="${y + 9}" font-size="28" fill="${color}"
      style="font-weight:750">${label}</text>`;
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
      <circle cx="${x}" cy="${y}" r="${radius}" fill="#FFFDF9"/>
      <g id="s16-legend-cell">${cell.markup}</g>
      ${roughProp('circle', [x, y, 2 * radius], 6712, '#8F7567', 2.05, .39)}
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
  </g>`;

function moveSweep(node, x, y, strength) {
  node.setAttribute('cx', x);
  node.setAttribute('cy', y);
  node.setAttribute('opacity', strength);
}

export function s16() {
  const notes = pathologyProgress('s16-notes', 'simple');
  const carry = evolutionPlate('s16-carry');
  const slide = histologyLens({ mode: 'simple', id: 's16-he', ...field });
  const origin = carry.specimens[0].organ.appendixTip;
  const legend = cellLegend();
  return {
    paint: notes.paint + carry.paint + `<g id="s16-field">${slide.paint}${softFocus}</g>` + legend.paint,
    lettering: notes.lettering + carry.lettering + `<text id="s16-title" class="note title" x="${field.x}" y="143"
      text-anchor="middle" font-size="28" fill="#1F1C19">H&amp;E 光学视野 · 单纯性</text>`
      + tracedBraces(slide) + callouts.map(leader).join('')
      + `<text id="s16-legend-label" class="note" x="1493" y="708" font-size="24" fill="#2E2924">分叶核中性粒细胞</text>`,
    audit: { ...slide.audit, lens: slide.lens },
    mount(art, labels) {
      carry.mount(art);
      carry.update(art, labels, 1);
      slide.mount(art);
      legend.mount(art);
    },
    update(art, labels, p) {
      for (const [i, { id }] of carry.specimens.entries()) {
        const fade = i === 0 ? phase(p, .09, .25) : phase(p, 0, .13 + .03 * i);
        opacity(art, `${id}-reveal`, 1 - fade);
        opacity(labels, `${id}-labels`, 1 - phase(p, 0, .105));
      }
      opacity(labels, 's16-carry-diagram', 1 - phase(p, 0, .10));
      const push = phase(p, .013, .32);
      const focusX = lerp(origin.x, field.x, push);
      const focusY = lerp(origin.y, field.y, push);
      art.querySelector('#s16-carry-simple-reveal').setAttribute('transform',
        scaleAround(origin.x, origin.y, lerp(1, 2.15, phase(p, .015, .24)), focusX, focusY));
      const focus = scaleAround(field.x, field.y, lerp(.070, 1, phase(p, .035, .32)), focusX, focusY);
      art.querySelector('#s16-field').setAttribute('transform', focus);
      labels.querySelector('#s16-brace-stack').setAttribute('transform', focus);
      opacity(art, 's16-field', phase(p, .05, .175));
      opacity(labels, 's16-title', phase(p, .20, .34));

      for (let i = 0; i < 5; i++) {
        const drawn = phase(p, .15 + i * .039, .255 + i * .048);
        trace(labels, `s16-brace-${i}`, drawn);
        opacity(labels, `s16-brace-${i}-text`, phase(drawn, .46, .99));
      }
      for (const { id, start, end } of callouts) {
        trace(labels, id, phase(p, start, end));
        opacity(labels, `${id}-text`, phase(p, end - .031, end + .036));
      }

      const top = phase(p, .35, .59);
      moveSweep(art.querySelector('#s16-sweep-upper'), lerp(962, 1080, top), lerp(367, 439, top),
        .77 * phase(p, .355, .437) * (1 - phase(p, .555, .660)));
      const travel = 3 * phase(p, .59, .847);
      const part = Math.min(2, Math.floor(travel));
      const [x1, y1] = muscleSweep[part];
      const [x2, y2] = muscleSweep[part + 1];
      moveSweep(art.querySelector('#s16-sweep-lower'), lerp(x1, x2, travel - part), lerp(y1, y2, travel - part),
        .86 * phase(p, .59, .634) * (1 - phase(p, .842, .933)));

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
