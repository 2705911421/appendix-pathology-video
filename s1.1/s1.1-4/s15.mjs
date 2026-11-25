import { RED, arrow, ink, inkLines, lerp } from '../shared/canvasCore.js';
import { centeredSpecimen, opacity, phase, scaleAround, trace, traceMask } from './scene-tools.mjs';

const cy = 430;
const types = [
  { x: 590, stage: 'simple', title: '暗红 · 单纯性', note: '充血水肿', start: 0 },
  { x: 1100, stage: 'phlegmon', title: '灰黄 · 化脓性', note: '纤维素性脓性渗出', start: .12 },
  { x: 1610, stage: 'gangrene', title: '焦黑 · 坏疽性', note: '出血坏死', start: .26 },
];

const alternatives = [
  { name: 'control', d: 'M654 261 C723 250 739 148 855 132 Q954 117 1090 130',
    head: 'M1077 124 L1090 130 L1076 134', x: 1109, y: 138, align: 'start', text: '部分早期可及时控制' },
  { name: 'rapid', d: 'M676 574 C740 680 929 693 1125 676 C1301 659 1470 659 1610 695',
    head: 'M1597 686 L1610 695 L1594 696', x: 1610, y: 727, align: 'middle', text: '部分可迅速恶化' },
];
const cautionLine = 'M816 797 C949 792 1107 800 1244 797 Q1321 794 1384 797';

function branch(prefix, { name, d, head, x, y, align, text }) {
  const id = `${prefix}-${name}`;
  return `<defs>${traceMask(id, d, 12)}</defs>
    <path d="${d}" mask="url(#${id}-mask)" fill="none" stroke="#3E3934" stroke-opacity=".65"
      stroke-width="2.35" stroke-linecap="round" stroke-dasharray="8 8"/>
    <g id="${id}-head">${ink(head, { color: '#3E3934', size: 2.65, opacity: .8, taperStart: 2, taperEnd: 2 })}</g>
    <text id="${id}-caption" class="note" x="${x}" y="${y}" text-anchor="${align}" fill="#3E3934" font-size="24">${text}</text>`;
}

export function evolutionPlate(prefix) {
  const specimens = types.map(({ x, stage, ...rest }) => {
    const id = `${prefix}-${stage}`;
    return { ...rest, x, id, organ: centeredSpecimen({ id, cx: x, cy, scale: .66, stage, perforated: false }) };
  });
  const arrows = [845, 1355].map((x, i) => {
    const id = `${prefix}-arrow-${i}`;
    const d = `M${x - 32} 430 H${x + 32}`;
    return `<defs>${traceMask(id, `M${x - 35} 430 H${x + 35}`, 22)}</defs>
      <g mask="url(#${id}-mask)">${arrow(d, { color: '#5F5145', size: 3.6, head: 14 })}</g>`;
  }).join('');
  return {
    specimens,
    paint: specimens.map(({ id, organ }) => `<g id="${id}-reveal">${organ.paint}</g>`).join(''),
    lettering: specimens.map(({ id, x, title, note }) => `<g id="${id}-labels">
      <text class="note title" x="${x}" y="195" text-anchor="middle" font-size="32" fill="#1F1C19">${title}</text>
      <text class="note" x="${x}" y="635" text-anchor="middle" font-size="28" fill="#2A2622">${note}</text>
    </g>`).join('') + `<g id="${prefix}-diagram">${arrows}
      ${alternatives.map(item => branch(prefix, item)).join('')}
      <g id="${prefix}-caution">
        <defs>${traceMask(`${prefix}-underline`, cautionLine, 15)}</defs>
        <text class="note" x="1100" y="785" text-anchor="middle" font-size="31" fill="${RED}"
          style="font-weight:800">最常见典型路径 ≠ 每个患者必经的固定流程</text>
        ${inkLines(['M794 765 Q781 779 794 793', 'M1406 765 Q1419 778 1406 793'],
        { color: RED, size: 3.1, opacity: .88, taperStart: 4, taperEnd: 8 })}
        <g mask="url(#${prefix}-underline-mask)">${ink(cautionLine, { color: RED, size: 3.3, opacity: .82 })}</g>
      </g>
    </g>`,
    mount(art) {
      for (const { organ } of specimens) organ.mount(art);
    },
    update(art, labels, p, firstReady = false) {
      for (const { id, x, start } of specimens) {
        const ready = firstReady && start === 0;
        const rise = ready ? 1 : phase(p, start, start + .18);
        const node = art.querySelector(`#${id}-reveal`);
        node.setAttribute('transform', scaleAround(x, cy, lerp(.935, 1, rise), x, cy + 9 * (1 - rise)));
        node.setAttribute('opacity', ready ? 1 : phase(p, start, start + .14));
        opacity(labels, `${id}-labels`, ready ? 1 : phase(p, start + .025, start + .17));
      }
      trace(labels, `${prefix}-arrow-0`, phase(p, .12, .28));
      trace(labels, `${prefix}-arrow-1`, phase(p, .25, .43));
      for (const [i, { name }] of alternatives.entries()) {
        const id = `${prefix}-${name}`;
        const progress = phase(p, .30 + .032 * i, .53 + .032 * i);
        trace(labels, id, progress);
        opacity(labels, `${id}-head`, phase(progress, .92, 1));
        opacity(labels, `${id}-caption`, phase(progress, .69, .98));
      }
      opacity(labels, `${prefix}-caution`, phase(p, .33, .46));
      trace(labels, `${prefix}-underline`, phase(p, .48, .97));
    },
  };
}

export function s15() {
  const plate = evolutionPlate('s15');
  return {
    paint: `<g data-entry-part="subject">${plate.paint}</g>`,
    lettering: `<g data-entry-part="subject">${plate.lettering}</g>`,
    mount: plate.mount,
    audit: { nativeDiameters: plate.specimens.map(({ organ }) => organ.dimensions.appendix) },
    update: (art, labels, p) => plate.update(art, labels, p, true),
  };
}
