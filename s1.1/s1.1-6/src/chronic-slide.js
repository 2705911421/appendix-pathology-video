import { RED, arrow, cellDot, clamp, fillPath, ink, lerp, mulberry32 } from '../../shared/canvasCore.js';
import { createHistologyAsset, HISTOLOGY_DIAMETER } from '../../shared/histologyProcedural.js';
import { phase, pushTo } from '../../shared/timelineHelper.js';
import { chronicNotes } from './chronic-specimen.js';
import { scaleAround, settleScale, tracedInk, traceTo } from './motion.js';

const center = { x: 745, y: 445 };
const charcoal = '#1F1C19';
const blue = '#2F5D7C';
const emergencyInk = '#B82018';
const focusSwitch = .55;
const hematoxylin = '#2B0F54';
const cells = [
  { id: 'lymphocyte', x: 595, y: 758, start: .16, end: .34, label: '淋巴细胞', paint: lymphocyte },
  { id: 'plasma-cell', x: 855, y: 758, start: .26, end: .45, label: '浆细胞', paint: plasmaCell },
];

const rules = [
  { number: 1, x: 1137, top: 334, color: blue, scale: 1.03, label: '症状缓解期 · 择期手术',
    text: ['1. 一旦确诊，通常建议在', '症状缓解期择期切除；'] },
  { number: 2, x: 1137, top: 534, color: RED, scale: 1.04, label: '急性发作期 · 视情况急诊',
    text: ['2. 若正处于急性发作期，', '则视情况急诊手术。'] },
];

function whiteField(x, y) {
  return `<circle cx="${x}" cy="${y}" r="34" fill="#FFFFFF" stroke="#8C8276" stroke-width="1.3"/>`;
}

function lymphocyte(x, y) {
  const random = mulberry32(433);
  const texture = Array.from({ length: 30 }, () => {
    const angle = random() * 2 * Math.PI;
    const r = Math.sqrt(random()) * 15.9;
    return cellDot(Math.cos(angle) * r, Math.sin(angle) * r, .54 + random() * .92, .55 + random() * .68,
      '#553379', angle * 50, .50);
  }).join('');
  return whiteField(x, y) + `<g transform="translate(${x} ${y})">
    <circle r="21.1" fill="#C0CFDF" stroke="#8196A9" stroke-width=".7"/>
    <circle r="19.4" fill="${hematoxylin}"/>${texture}</g>`;
}

function plasmaCell(x, y) {
  const chromatin = Array.from({ length: 5 }, (_, i) => {
    const angle = i * 72 + 7;
    const spoke = 'M2 -1.05 C4.2 -2.3 6.7 -3 8.45 -2.6 Q10.1 -.15 8.25 2.52 C6 2.78 3.1 1.7 2 1.05Z';
    return `<g transform="translate(-6 -4.8) rotate(${angle})">${fillPath(spoke, '#2B104D')}</g>`;
  }).join('');
  const halo = 'M4 -10 C11 -8 14 -2 14 4 C12 11 4 15 -2 12 C3 10 6 6 7 1 C7 -3 6 -7 4 -10Z';
  return whiteField(x, y) + `<g transform="translate(${x} ${y}) rotate(24)">
    <ellipse rx="18.8" ry="21.7" fill="#A7B2DD" stroke="#6B6DA6" stroke-width=".85"/>
    <ellipse rx="16.8" ry="19.9" fill="#BDC6E8"/>
    ${fillPath(halo, '#FFFFFF')}
    <circle cx="-6" cy="-4.8" r="10.2" fill="#70448D" stroke="#3D1D61" stroke-width="1.05"/>
    ${chromatin}${cellDot(-6, -4.8, 1.1, .95, '#3E1D58')}</g>`;
}

function operationsBoard() {
  return `<text class="note" x="1135" y="215" font-size="30" fill="${charcoal}" style="font-weight:800">慢性阑尾炎手术时机核心原则：</text>
    ${ink('M1135 241 Q1408 237 1786 241', { color: '#7C7065', size: 2.3, opacity: .74 })}
    ${rules.map(({ number, x, top, color, label, text }) => `<g id="s24-rule-${number}">
      <path class="phase-brush" d="M${x} ${top + 1} q-1.5 46 -.25 119" fill="none" stroke="${color}"
        stroke-width="6" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/>
      <text class="note" x="1159" y="${top + 19}" font-size="24" fill="${color}" style="font-weight:760">${label}</text>
      <text class="note principle" x="1159" y="${top + 65}" font-size="30" fill="${charcoal}"
        style="font-weight:750">${text[0]}<tspan x="1199" y="${top + 111}">${text[1]}</tspan></text>
    </g>`).join('')}`;
}

export function chronicSlide() {
  const notes = chronicNotes();
  const view = createHistologyAsset({
    id: 's24-histology', stage: 'chronic', x: center.x - 250, y: center.y - 250,
    scale: 500 / HISTOLOGY_DIAMETER, showLayers: true,
  });
  const fibrosisPath = 'M1042 712 C1085 665 1014 585 899 581';
  return {
    fade: p => 1 - phase(p, .90, 1),
    paint: notes.paint + `<g id="s24-optics">${view.paint}</g>` + cells.map(cell =>
      `<g id="s24-${cell.id}">${cell.paint(cell.x, cell.y)}</g>`).join(''),
    lettering: notes.lettering + `
      <text id="s24-title" class="note" x="${center.x}" y="145" font-size="28" fill="${charcoal}" text-anchor="middle"
        style="font-weight:750">慢性阑尾炎 · H&amp;E</text>
      <g id="s24-layers">${view.lettering}</g>
      <g id="s24-fibrosis">
        ${tracedInk('s24-collagen', fibrosisPath, arrow(fibrosisPath, { color: '#8E3A5C', size: 2.5, head: 12 }), 34)}
        <text id="s24-fibrosis-label" class="note callout" x="1056" y="730" font-size="24" text-anchor="middle" fill="${charcoal}"
          style="font-weight:750">阑尾壁纤维化增生</text>
      </g>
      ${cells.map(cell => `<g id="s24-${cell.id}-label">
        <text class="note" x="${cell.x + 43}" y="${cell.y + 9}" font-size="24" fill="${charcoal}"
          style="font-weight:750">${cell.label}</text></g>`).join('')}
      ${operationsBoard()}`,
    audit: { lens: view.lens, layers: view.layers, histology: view.recipe },
    mount: view.mount,
    update(art, labels, p) {
      const zoom = settleScale(clamp(p / .24), .66);
      const optics = scaleAround(center.x, center.y, zoom);
      const entrance = phase(p, 0, .13);
      for (const element of [art.querySelector('#s24-optics'), labels.querySelector('#s24-layers')]) {
        element.setAttribute('transform', optics);
        element.setAttribute('opacity', entrance);
      }
      labels.querySelector('#s24-title').setAttribute('opacity', entrance);
      traceTo(labels, 's24-collagen', phase(p, .13, .33));
      labels.querySelector('#s24-fibrosis-label').setAttribute('opacity', phase(p, .18, .33));
      for (const cell of cells) {
        const pop = settleScale(clamp((p - cell.start) / (cell.end - cell.start)), .62);
        const opacity = phase(p, cell.start, lerp(cell.start, cell.end, .54));
        for (const element of [art.querySelector(`#s24-${cell.id}`), labels.querySelector(`#s24-${cell.id}-label`)]) {
          element.setAttribute('transform', scaleAround(cell.x, cell.y, pop));
          element.setAttribute('opacity', opacity);
        }
      }

      const switchFocus = phase(p, focusSwitch, .66);
      for (const rule of rules) {
        const first = rule.number === 1;
        const focus = first ? 1 - switchFocus : switchFocus;
        const draw = first ? phase(p, .006, .18) : phase(p, focusSwitch, .72);
        const row = labels.querySelector(`#s24-rule-${rule.number}`);
        row.setAttribute('opacity', lerp(.72, 1, focus));
        row.setAttribute('transform', pushTo({ x: rule.x, y: rule.top + 65 }, 1, rule.scale, focus * draw).transform);
        const brush = row.querySelector('.phase-brush');
        brush.setAttribute('opacity', draw > 0 ? (first ? 1 - switchFocus : 1) : 0);
        brush.setAttribute('stroke-dashoffset', 1 - draw);
        const shade = switchFocus === 1 ? emergencyInk : switchFocus === 0 ? charcoal : `rgb(${
          [[31, 184], [28, 32], [25, 24]].map(([a, b]) => Math.round(lerp(a, b, switchFocus))).join(',')})`;
        row.querySelector('.principle').setAttribute('fill', first ? charcoal : shade);
      }
    },
  };
}
