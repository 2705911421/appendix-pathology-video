import {
  RED, cellDot, fillPath, ink, lerp, mulberry32, organic, strokePath,
} from '../../shared/canvasCore.js';
import {
  columnarCell, createDiapedesisCell,
} from '../../shared/charactersAndHistology.js';
import { createHistologyAsset, HISTOLOGY_DIAMETER } from '../../shared/histologyProcedural.js';
import { canvasSlot, mountSurface, paintSurface, wash } from './brush.mjs';
import { band, edgePath, group, ramp, selectIds } from './geometry.mjs';
import { inkTrail } from './ink-trail.mjs';
import { stainNuclei, vascularCellMarkup } from './vascular-cells.mjs';

const strokes = [
  'M36 20 Q33 30 49 38 Q61 48 55 54 Q48 58 42 49 Q30 38 33 24Z',
  'M133 20 Q148 13 144 25 Q137 37 112 43 Q124 35 130 26Z',
  'M83 5 Q98 0 94 15 C93 29 84 51 70 63 Q51 79 24 80 Q54 66 67 48 Q80 30 81 11Z',
  'M84 41 C98 48 109 57 127 63 Q138 67 157 68 Q161 72 150 79 Q132 83 117 72 Q97 60 82 47Z',
  'M31 92 Q34 101 49 111 Q62 121 55 129 Q45 135 36 121 Q28 113 29 99Z',
  'M140 91 Q152 89 153 98 Q151 111 116 122 Q126 112 135 97Z',
  'M82 78 Q99 71 98 87 C99 109 83 137 63 152 Q42 171 9 174 C30 163 58 144 68 127 Q83 105 81 88Z',
  'M86 119 Q114 139 135 148 Q150 156 177 158 Q181 162 167 172 Q153 179 135 168 C111 157 102 141 84 126Z',
];

function flame() {
  const silhouette = strokes.join(' ');
  const rand = mulberry32(10318);
  const bristles = Array.from({ length: 570 }, (_, i) => {
    const x = rand() * 177;
    const y = rand() * 178;
    return cellDot(x, y, .35 + rand() * 2.3, .18 + rand() * .48,
      i % 3 ? '#B49A83' : '#9B5747', 12 + rand() * 21, .12 + rand() * .35);
  }).join('');
  return `<defs><clipPath id="opening-glyph-clip"><path d="${silhouette}"/></clipPath></defs>
    <g transform="translate(960 415) scale(${195 / 174}) translate(-93 -87)" aria-label="炎">
      ${fillPath(silhouette, '#1F1C19')}
      <g clip-path="url(#opening-glyph-clip)">${bristles}</g>
    </g>`;
}

function microDiagrams() {
  const y = 607.5;
  const section = x => 589 + 2.6 * Math.sin((x - 459) / 16);
  const circle = (name, x, detail) => `<g id="${name}">
    <defs><clipPath id="${name}-clip"><circle cx="${x}" cy="${y}" r="57.5"/></clipPath></defs>
    <g clip-path="url(#${name}-clip)">
      <circle cx="${x}" cy="${y}" r="57.5" fill="#FBF0E9"/>
      ${detail}
    </g>
    <circle cx="${x}" cy="${y}" r="57.1" fill="none" stroke="#936B63" stroke-width="1.35" opacity=".63"/>
  </g>`;
  const wall = band(section, () => 670, 449, 571, 4);
  const lumen = 'M1348 607 Q1375 598 1397 607 Q1404 611 1409 613 Q1417 608 1426 604 Q1454 601 1471 607 L1473 665 L1346 665Z';
  const bed = paintSurface(6520, () => {
    wash(wall, '#DE8CA6', 117, { bleed: .12, texture: .75, border: .42 });
    wash(lumen, '#E4988B', 109, { bleed: .16, texture: .71, border: .45 });
    wash(organic(1417, 615, 36, 19, 81, .28), '#CE625F', 71, { bleed: .25, texture: .72 });
  });
  const columns = Array.from({ length: 12 }, (_, i) => 454 + i * 10.2);
  const epithelium = columns.map((_, i) => group(`mini-epithelium-${i}`,
    stainNuclei(columnarCell({ width: 10.5, height: 22, goblet: i % 3 === 1, pale: i % 2 === 1 })))).join('');
  const debris = [-17, -10, -6, 0, 5, 13, 18].map((_, i) =>
    group(`mini-fragment-${i}`, cellDot(0, 0, 1.2 + (i % 2) * .2, .9, '#43245C', i * 19, .87))).join('');
  const discs = Array.from({ length: 7 }, (_, i) => group(`mini-disc-${i}`,
    cellDot(0, 0, 6.3, 3.1, '#C4474F', i * 21 - 52, .85)
    + cellDot(0, 0, 3.3, 1.15, '#F3A89B', i * 21 - 52, .92))).join('');
  const migrant = createDiapedesisCell({ radius: 9.7, lobes: 4, seed: 188 });
  const paint = circle('mini-ulcer', 510, `<defs><clipPath id="mini-tear">
        <path id="mini-wound-contour"/></clipPath></defs><g clip-path="url(#mini-tear)">
        ${fillPath(wall, '#EAA1B3', .53)}${canvasSlot('mini-ulcer-wash')}</g>${epithelium}${debris}
        <g id="mini-lip"></g>`)
    + circle('mini-exit', 1410, fillPath(lumen, '#E98C83', .53) + canvasSlot('mini-exit-wash')
      + group('mini-vessel-wall', '') + discs + group('mini-crawler', ''));
  const keys = ['mini-ulcer', 'mini-exit', 'mini-wound-contour', 'mini-lip', 'mini-vessel-wall', 'mini-crawler',
    ...columns.map((_, i) => `mini-epithelium-${i}`),
    ...Array.from({ length: 7 }, (_, i) => `mini-fragment-${i}`),
    ...Array.from({ length: 7 }, (_, i) => `mini-disc-${i}`)];
  let nodes;
  return {
    paint,
    mount(art) {
      mountSurface(art, 'mini-ulcer-wash', bed);
      mountSurface(art, 'mini-exit-wash', bed);
      nodes = selectIds(art, keys);
    },
    update(p) {
      const growth = ramp(p, .47, .76);
      for (const [name, x] of [['mini-ulcer', 510], ['mini-exit', 1410]]) {
        const node = nodes[name];
        node.setAttribute('opacity', growth);
        node.setAttribute('transform', `translate(${x} ${y}) scale(${lerp(.76, 1, growth)}) translate(${-x} ${-y})`);
      }
      if (growth === 0) return;
      const damage = ramp(p, .54, .91);
      const crease = x => section(x) + Math.max(0, 1 - Math.abs(x - 510) / 24) ** .87 * 29 * damage;
      nodes['mini-wound-contour'].setAttribute('d', band(crease, () => 670, 449, 571, 3));
      nodes['mini-lip'].innerHTML = strokePath(edgePath(482, 538, x => crease(x) + 1, 3), '#9E4A67', 2.1, .82 * damage);
      columns.forEach((x, i) => {
        const fall = damage * (1 - ramp(Math.abs(x - 510), 11, 27));
        const node = nodes[`mini-epithelium-${i}`];
        node.setAttribute('transform', `translate(${x} ${section(x) + fall * 9}) rotate(${Math.sign(510 - x) * fall * 24}) scale(${1 - fall * .18} ${1 - fall * .37})`);
        node.setAttribute('opacity', 1 - ramp(fall, .28, .86));
      });
      for (let i = 0; i < 7; i++) {
        const x = 510 + (i - 3) * 5.7;
        const node = nodes[`mini-fragment-${i}`];
        node.setAttribute('opacity', ramp(damage, .16, .58));
        node.setAttribute('transform', `translate(${x} ${crease(x) - damage * (3 + i % 3 * 3)})`);
        const bx = 1348 + (i * 19 + 148 * p) % 126;
        nodes[`mini-disc-${i}`].setAttribute('transform',
          `translate(${bx} ${623 + i % 3 * 10 + 2 * Math.sin(i + p * 19)}) rotate(${Math.sin(p * 16 + i) * 22})`);
      }
      const opening = ramp(p, .55, .69) * 6;
      nodes['mini-vessel-wall'].innerHTML = strokePath(
        `M1349 608 Q1380 598 ${1410 - opening} 612 M${1410 + opening} 612 Q1440 596 1469 608`, '#86536D', 2.2, .87);
      const dock = ramp(p, .51, .74);
      const depart = ramp(p, .74, .95);
      const squeeze = Math.exp(-(((p - .74) / .063) ** 2));
      const crawler = nodes['mini-crawler'];
      crawler.setAttribute('transform', `translate(${lerp(1382, 1410, dock) - depart * 9} ${lerp(642, 612, dock) - depart * 30})`);
      crawler.innerHTML = vascularCellMarkup('mini-leukocyte', migrant(squeeze), 9.7);
    },
  };
}

export function createInkOpening() {
  const lens = createHistologyAsset({ id: 'opening-glass', stage: 'simple', x: 750, y: 205, scale: 420 / HISTOLOGY_DIAMETER });
  const diagrams = microDiagrams();
  const vermilion = paintSurface(5103, () => {
    wash(organic(959, 414, 182, 133, 67, .2, -.34, 22), '#CB4D42', 37,
      { bleed: .48, texture: .77, border: .31 });
    wash(organic(980, 421, 130, 92, 91, .25, -.46, 21), '#D46856', 26,
      { bleed: .47, texture: .86, border: .3 });
    wash(organic(901, 466, 64, 31, 199, .31, -.29, 15), '#B44744', 22, { bleed: .32 });
  });
  const concept = (id, x, color, name, definition) => group(id, `
    <text class="note title" x="${x}" y="449" text-anchor="middle" font-size="50" fill="${color}">${name}</text>
    <text class="note" x="${x}" y="495" text-anchor="middle" font-size="28" fill="#2A2622">${definition}</text>`);
  let artNodes;
  let labelNodes;
  const drawLeft = inkTrail('M858 417 C768 412 700 381 593 428', { size: 5.5, color: '#302420', seed: 71 });
  const drawRight = inkTrail('M1062 419 C1152 413 1210 380 1327 428', { size: 5.5, color: '#773A31', seed: 77 });
  let lastArc;
  return {
    paint: group('opening-art', group('opening-lens', lens.paint)
      + group('opening-verm', canvasSlot('opening-verm-canvas'))
      + group('opening-flame', flame(), 'data-paint-cache=""') + diagrams.paint),
    lettering: `<g id="opening-left-trail"></g><g id="opening-right-trail"></g>
      ${concept('opening-left', 510, '#1F1C19', '变质', '细胞变性、坏死与破溃')}
      ${concept('opening-right', 1410, RED, '渗出', '血管扩张、血浆与白细胞游出')}
      <text class="note title" x="90" y="105" font-size="26" fill="#2A2622">急性阑尾炎始终以变质、渗出为主</text>
      ${ink('M91 122 Q150 123 207 120', { color: '#826E5F', size: 1.6, opacity: .43, seed: 66 })}`,
    mount(art, lettering) {
      lens.mount(art);
      mountSurface(art, 'opening-verm-canvas', vermilion);
      diagrams.mount(art);
      artNodes = selectIds(art, ['opening-art', 'opening-lens', 'opening-verm', 'opening-flame']);
      labelNodes = selectIds(lettering, ['opening-left-trail', 'opening-right-trail', 'opening-left', 'opening-right']);
    },
    update(_cue, p) {
      const draw = ramp(p, 0, .35);
      const closing = artNodes['opening-lens'];
      const scale = lerp(1, .31, draw);
      closing.setAttribute('transform', `translate(960 415) scale(${scale}) translate(-960 -415)`);
      closing.setAttribute('opacity', .72 * (1 - draw));
      artNodes['opening-art'].setAttribute('opacity', 1 - ramp(p, .88, 1));
      artNodes['opening-flame'].setAttribute('opacity', ramp(p, .09, .35));
      artNodes['opening-verm'].setAttribute('opacity', ramp(p, .07, .35));
      const glow = lerp(.69, 1, draw);
      artNodes['opening-verm'].setAttribute('transform', `translate(960 415) scale(${glow}) translate(-960 -415)`);
      diagrams.update(p);
      const arc = ramp(p, .35, .86);
      if (arc !== lastArc) {
        labelNodes['opening-left-trail'].innerHTML = drawLeft(arc);
        labelNodes['opening-right-trail'].innerHTML = drawRight(arc);
        lastArc = arc;
      }
      for (const [index, side] of ['left', 'right'].entries()) {
        const enter = ramp(p, .46 + index * .025, .73 + index * .025);
        labelNodes[`opening-${side}`].setAttribute('opacity', enter);
        labelNodes[`opening-${side}`].setAttribute('transform',
          `translate(${(1 - enter) * (index === 0 ? 23 : -23)} 0)`);
      }
    },
  };
}
