import { RED, arrow, cellDot, clamp, fillPath, ink, lerp, mulberry32 } from '../../shared/canvasCore.js';
import { createHistologyAsset, HISTOLOGY_DIAMETER } from '../../shared/histologyProcedural.js';
import { phase } from '../../shared/timelineHelper.js';
import { scaleAround, settleScale, tracedInk, traceTo } from './motion.js';

const center = { x: 745, y: 445 };
const charcoal = '#1F1C19';
const blue = '#2F5D7C';
const emergencyInk = '#A4372E';
const focusSwitch = .56;
const hematoxylin = '#2E1259';
const cells = [
  { id: 'lymphocyte', x: 595, y: 758, start: .16, end: .34, label: '淋巴细胞', paint: lymphocyte },
  { id: 'plasma-cell', x: 855, y: 758, start: .26, end: .45, label: '浆细胞', paint: plasmaCell },
];

const rules = [
  { number: 1, x: 1137, top: 334, color: blue, label: '症状缓解期 · 择期手术',
    text: ['1. 一旦确诊，通常建议在', '症状缓解期择期切除；'] },
  { number: 2, x: 1137, top: 534, color: RED, label: '急性发作期 · 视情况急诊',
    text: ['2. 若正处于急性发作期，', '则视情况急诊手术。'] },
];

function legendField(x, y) {
  return `<circle cx="${x}" cy="${y}" r="38" fill="#FCF9F5" stroke="#8C8276" stroke-width="1.55"/>`;
}

function lymphocyte(x, y) {
  const random = mulberry32(433);
  const texture = Array.from({ length: 30 }, () => {
    const angle = random() * 2 * Math.PI;
    const r = Math.sqrt(random()) * 15.9;
    return cellDot(Math.cos(angle) * r, Math.sin(angle) * r, .54 + random() * .92, .55 + random() * .68,
      '#553379', angle * 50, .50);
  }).join('');
  return legendField(x, y) + `<g transform="translate(${x} ${y})">
    <circle r="23" fill="#C8D8EC" stroke="#8196A9" stroke-width=".7"/>
    <circle r="19" fill="${hematoxylin}"/>${texture}</g>`;
}

function plasmaCell(x, y) {
  const nucleusX = -13;
  const chromatin = Array.from({ length: 5 }, (_, i) => {
    const angle = i * 72 + 7;
    const spoke = 'M3 -1.2 C5 -2.8 8.4 -4 10.2 -3 Q11.7 0 10.2 3.1 C7.3 3.6 5.1 2.3 3 1.2Z';
    return `<g transform="translate(${nucleusX} 0) rotate(${angle})">${fillPath(spoke, '#230840')}</g>`;
  }).join('');
  const halo = 'M1 -9 C8 -10 15 -7 16 -1 C16 6 10 10 2 8 C6 5 8 3 8 0 C8 -3 6 -6 1 -9Z';
  return legendField(x, y) + `<g transform="translate(${x} ${y})">
    <ellipse rx="27" ry="20" fill="#BACBE6" stroke="#7883A8" stroke-width=".85"/>
    <ellipse cx="5" cy="-2" rx="18" ry="14" fill="#D0DBEE" opacity=".45"/>
    <g transform="translate(-1.2 0) scale(${Math.sqrt(1.5)})">${fillPath(halo, '#FFFFFF', .96)}</g>
    <circle cx="${nucleusX}" cy="0" r="12" fill="#9D74AC" stroke="#3D1D61" stroke-width="1.15"/>
    ${chromatin}${cellDot(nucleusX, 0, 2.6, 2.4, '#C5A0C6', 0, .88)}</g>`;
}

function operationsBoard() {
  return `<text class="note" x="1135" y="215" font-size="30" fill="${charcoal}" style="font-weight:800">慢性阑尾炎手术时机核心原则：</text>
    ${ink('M1135 241 Q1408 237 1786 241', { color: '#7C7065', size: 2.3, opacity: .74 })}
    ${rules.map(({ number, x, top, color, label, text }) => `<g id="s24-rule-${number}">
      <path class="phase-brush" d="M${x} ${top + 1} q-1.5 46 -.25 119" fill="none" stroke="${color}"
        stroke-width="4.5" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/>
      <text class="note" x="1159" y="${top + 19}" font-size="24" fill="${color}" style="font-weight:760">${label}</text>
      <text class="note principle" x="1159" y="${top + 65}" font-size="30" fill="${charcoal}"
        style="font-weight:750">${text[0]}<tspan x="1199" y="${top + 111}">${text[1]}</tspan></text>
    </g>`).join('')}`;
}

export function chronicSlide() {
  const view = createHistologyAsset({
    id: 's24-histology', stage: 'chronic', x: center.x - 250, y: center.y - 250,
    scale: 500 / HISTOLOGY_DIAMETER, showLayers: true,
  });
  const fibrosisPath = 'M1042 712 C1085 665 1014 585 899 581';
  return {
    paint: `<g id="s24-optics">${view.paint}</g>` + cells.map(cell =>
      `<g id="s24-${cell.id}">${cell.paint(cell.x, cell.y)}</g>`).join(''),
    lettering: `
      <text id="s24-title" class="note" x="${center.x}" y="145" font-size="28" fill="${charcoal}" text-anchor="middle"
        style="font-weight:750">慢性阑尾炎 · H&amp;E</text>
      <g id="s24-layers">${view.lettering}</g>
      <g id="s24-fibrosis">
        ${tracedInk('s24-collagen', fibrosisPath, arrow(fibrosisPath, { color: '#8E3A5C', size: 2.5, head: 12 }), 34)}
        <text id="s24-fibrosis-label" class="note callout" x="1056" y="730" font-size="24" text-anchor="middle" fill="${charcoal}"
          style="font-weight:750">胶原束增多 · 阑尾壁纤维化</text>
      </g>
      ${cells.map(cell => `<g id="s24-${cell.id}-label">
        <text class="note" x="${cell.x + 43}" y="${cell.y + 9}" font-size="24" fill="${charcoal}"
          style="font-weight:750">${cell.label}</text></g>`).join('')}
      ${operationsBoard()}`,
    audit: { lens: view.lens, layers: view.layers, histology: view.recipe },
    mount: view.mount,
    update(art, labels, p) {
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

      const switchFocus = phase(p, focusSwitch, .63);
      for (const rule of rules) {
        const first = rule.number === 1;
        const focus = first ? 1 - switchFocus : switchFocus;
        const draw = first ? phase(p, .006, .53) : phase(p, focusSwitch, .98);
        const row = labels.querySelector(`#s24-rule-${rule.number}`);
        row.setAttribute('opacity', lerp(.80, 1, focus));
        const brush = row.querySelector('.phase-brush');
        brush.setAttribute('opacity', draw > 0 ? (first ? 1 - switchFocus : 1) : 0);
        brush.setAttribute('stroke-dashoffset', 1 - draw);
        const shade = switchFocus === 1 ? emergencyInk : switchFocus === 0 ? charcoal : `rgb(${
          [[31, 164], [28, 55], [25, 46]].map(([a, b]) => Math.round(lerp(a, b, switchFocus))).join(',')})`;
        row.querySelector('.principle').setAttribute('fill', first ? charcoal : shade);
      }
    },
  };
}
