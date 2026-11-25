import {
  arrow, cellDot, clamp, closedCurve, fillPath, lerp, mulberry32, organic, pigment, roughProp, strokePath, washLayer,
} from '../shared/canvasCore.js';
import { phase } from './scene-tools.mjs';

const ERYTHROCYTE = '#C81E2B';
const VASCULAR_NUCLEUS = '#33125E';

const bounds = [4, 456];
const upper = x => 90 + 7 * Math.sin(x / 69) + 3 * Math.sin(x / 31);
const lower = x => 161 + 8 * Math.sin((x - 16) / 75) + 8 * Math.sin(x / 179);
const depth = (x, part) => lerp(upper(x), lower(x), part);
const outerTop = x => upper(x) - 17 - 4 * Math.cos(x / 61);
const outerBottom = x => lower(x) + 17 + 3 * Math.sin(x / 37);

function rail(fn, start, end) {
  const steps = Math.ceil(Math.abs(end - start) / 7);
  return Array.from({ length: steps + 1 }, (_, i) => {
    const x = lerp(start, end, i / steps);
    return [x, fn(x)];
  });
}

function band(top, bottom, start = bounds[0], end = bounds[1]) {
  return closedCurve([...rail(top, start, end), ...rail(bottom, end, start)]);
}

const outside = band(outerTop, outerBottom);
const lumen = band(upper, lower);
const clot = closedCurve([
  ...rail(x => upper(x) - 5, 175, 282),
  ...[[292, .13], [278, .24], [301, .43], [297, .61], [310, .83], [303, 1.12]].map(([x, q]) => [x, depth(x, q)]),
  ...rail(x => lower(x) + 5, 298, 189),
  ...[[174, .85], [188, .75], [165, .60], [181, .45], [161, .27], [172, .19]].map(([x, q]) => [x, depth(x, q)]),
]);

function endothelium() {
  const rand = mulberry32(418);
  return [upper, lower].map((edge, side) => {
    const cells = [];
    for (let x = 10; x < 450; x += 9 + rand() * 4.5) {
      const y = edge(x) + (side ? 1.5 : -1.5);
      const angle = Math.atan2(edge(x + 2) - edge(x - 2), 4) * 180 / Math.PI;
      cells.push(cellDot(x, y, 5.7 + rand() * 1.2, 2.3 + rand() * .6, '#989CB6', angle, .61),
        cellDot(x + .4, y, 3.1 + rand() * 1.6, .9 + rand() * .31, VASCULAR_NUCLEUS, angle, .73));
    }
    return strokePath('M' + rail(edge, ...bounds).join('L'), '#687991', 1.35, .83) + cells.join('');
  }).join('');
}

function redCells(name, count, seed) {
  const rand = mulberry32(seed);
  const hues = [ERYTHROCYTE, '#BF3243', '#D14950', '#AE2339', '#DA6170'];
  return Array.from({ length: count }, (_, i) => {
    const id = `s17-${name}-${i}`;
    const offset = (i + .8 * rand()) / count;
    const lane = .085 + .83 * (((i * 5) % 17 + .52 * rand()) / 17);
    const rx = 3.5 + rand() * 3.55;
    const ry = 2.1 + rand() * 2.55;
    const rotation = (rand() - .5) * 127;
    const body = organic(0, 0, rx, ry, seed + i * 17, .125, 0, 12);
    return { id, offset, lane, rx, rotation,
      paint: `<g id="${id}" opacity="0">${fillPath(body, hues[i % hues.length], .94)}
      ${strokePath(body, '#9B2738', .62, .62)}
      ${cellDot(-.40, .14, rx * .55, ry * .44, '#F8A198', 0, .68)}
      ${cellDot(-rx * .17, -ry * .24, rx * .45, ry * .17, '#F7B2A6', 0, .66)}</g>`,
    };
  });
}

const modulo = (value, period) => ((value % period) + period) % period;

function placeCell({ node, rotation }, x, y, angle, alpha) {
  node.setAttribute('transform', `translate(${x} ${y}) rotate(${rotation + angle})`);
  node.setAttribute('opacity', alpha);
}

function updateCirculation(inlet, backedUp, outlet, p, edge, growth) {
  // Integrate a positive velocity that decays as the vessel closes.
  const age = p - .22;
  const distance = 298 * (1 - Math.exp(-3.45 * Math.max(0, age))) + 79 * age;
  for (const [i, cell] of inlet.entries()) {
    const x = 23 + modulo(cell.offset * 233 + distance, 233);
    const clear = 1 - phase(x, edge - 24, edge - 4);
    const y = depth(x, cell.lane) + 1.75 * Math.sin(i * 3.7 + age * 14 + .02 * x);
    placeCell(cell, x, y, 13 * Math.sin(i + p * 18), clear * lerp(.95, .41, growth));
  }
  for (const [i, cell] of backedUp.entries()) {
    const start = .25 + .385 * cell.offset;
    const flow = clamp((p - start) / (.123 + .074 * cell.lane));
    const intercept = 1 - (1 - flow) ** 2.6;
    const lane = i % 9;
    const column = Math.floor(i / 9);
    const settled = edge - 6 - cell.rx - 8.8 * column - 2.6 * (lane % 2);
    const x = lerp(19 + 47 * cell.offset, settled, intercept) + 1.18 * intercept * Math.sin(p * 17 + i);
    const y = depth(x, lerp(cell.lane, (lane + .51) / 9, intercept)) + 1.25 * Math.sin(p * 23 + i * 3);
    placeCell(cell, x, y, 12 * Math.sin(i + p * 11) * (1 - flow), .96 * phase(p, start, start + .07));
  }
  const drained = 1 - phase(p, .42, .85);
  for (const [i, cell] of outlet.entries()) {
    const x = 239 + modulo(218 * cell.offset + 626 * age, 218);
    const y = depth(x, cell.lane) + 1.8 * Math.sin(i * 5 + age * 17);
    placeCell(cell, x, y, 12 * Math.sin(age * 24 + i), .91 * drained);
  }
}

function clotFibres() {
  const fibres = [];
  const rand = mulberry32(55721);
  for (let i = 0; i < 13; i++) {
    const x = 154 + i * 12 + rand() * 7;
    const y = upper(x) - 9;
    const strand = `M${x} ${y} C${x + 15} ${y + 23} ${x - 17} ${y + 48} ${x + 36} ${y + 91}`;
    fibres.push(strokePath(strand, i % 3 ? '#A44456' : '#DF9C9F', 1.7 + rand() * 4.2, .31 + rand() * .39));
  }
  for (let i = 0; i < 165; i++) {
    const x = 157 + rand() * 152;
    fibres.push(cellDot(x, depth(x, rand()), .6 + rand() * 2.3, .5 + rand() * 1.35,
      i % 5 ? '#7F233C' : '#DE8D91', rand() * 180, .26 + rand() * .46));
  }
  return fibres.join('');
}

function vascularStroma() {
  const rand = mulberry32(34915);
  return Array.from({ length: 98 }, (_, i) => {
    const x = rand() * 456;
    const y = i % 2 ? outerTop(x) - 4 - rand() * 111 : outerBottom(x) + 6 + rand() * 98;
    const length = 7 + rand() * 30;
    return strokePath(`M${x} ${y} q${length * .47} ${rand() * 6 - 3} ${length} ${rand() * 8 - 4}`,
      '#99A9B9', .8 + rand() * .7, .16 + rand() * .22)
      + (i % 4 ? '' : cellDot(x, y, 2.6 + rand() * 1.7, 1, '#8A5680', rand() * 25 - 12, .51));
  }).join('');
}

export function veinLens({ x, y, radius }) {
  const inlet = redCells('inlet', 55, 9981);
  const backedUp = redCells('queued', 69, 4819);
  const outlet = redCells('outlet', 43, 8167);
  const wash = washLayer(62231, () => {
    pigment(band(x => upper(x) - 31, x => lower(x) + 28), '#7193AE', 65,
      { bleed: .24, texture: .8, border: .34 });
    pigment(outside, '#7193AC', 149, { bleed: .11, direction: 'in', border: .48, texture: .86 });
    pigment(band(outerTop, x => upper(x) - 5), '#6886A2', 122,
      { bleed: .10, direction: 'in', border: .54 });
    pigment(band(x => lower(x) + 4, outerBottom), '#718BA6', 123,
      { bleed: .12, texture: .77, border: .51 });
  }, 'normal', [0, 0, 460, 257]);
  const clotDye = washLayer(17981, () => {
    pigment(clot, '#6F2034', 225, { bleed: .12, texture: .95, border: .52, split: .34 });
    pigment(organic(236, 133, 58, 20, 4182, .25, .5), '#AA4D5C', 158,
      { bleed: .17, texture: .93, border: .41 });
  }, 'multiply', [142, 56, 185, 150]);
  const paint = `<defs>
    <clipPath id="s17-optic"><circle cx="${x}" cy="${y}" r="${radius}"/></clipPath>
    <clipPath id="s17-lumen"><path d="${lumen}"/></clipPath>
    <clipPath id="s17-plug"><path d="${clot}"/></clipPath>
  </defs>
  <circle cx="${x}" cy="${y}" r="${radius}" fill="#FFFDF9"/>
  <g clip-path="url(#s17-optic)">
    <g transform="translate(${x} ${y}) rotate(33) translate(-230 -128)">
      ${vascularStroma()}
      <path id="s17-vein-wall" d="${outside}" fill="#9CB3CA"/>${wash}
      ${fillPath(lumen, '#EEF3F1')}
      <g clip-path="url(#s17-lumen)">
        ${fillPath(band(upper, lower, 4, 259), '#D8DDE5', .58)}
        <g id="s17-downstream-tint">${fillPath(band(upper, lower, 239, 456), '#D8DDE5', .58)}</g>
        ${[...inlet, ...backedUp, ...outlet].map(cell => cell.paint).join('')}
        <g id="s17-plug-paint">
          ${fillPath(clot, '#5E1220')}
          <g clip-path="url(#s17-plug)"><g opacity=".5">${clotDye}</g>${clotFibres()}</g>
        </g>
      </g>
      ${endothelium()}
    </g>
  </g>
  ${roughProp('circle', [x, y, 2 * radius + 10], 9137, '#60473E', 3.05, .40)}
  ${roughProp('circle', [x, y, 2 * radius + 1], 931, '#AB8775', 1.9, .45)}`;
  let plug;
  let tint;
  return {
    paint,
    mount(art) {
      plug = art.querySelector('#s17-plug-paint');
      tint = art.querySelector('#s17-downstream-tint');
      for (const cell of [...inlet, ...backedUp, ...outlet]) cell.node = art.querySelector(`#${cell.id}`);
    },
    update(p) {
      const growth = phase(p, .25, .85);
      const width = lerp(.20, 1, growth);
      const height = lerp(.11, 1, growth);
      const pivotX = 234;
      const pivotY = lower(pivotX) - 1.6;
      plug.setAttribute('transform', `translate(${pivotX} ${pivotY}) scale(${width} ${height}) translate(${-pivotX} ${-pivotY})`);
      plug.setAttribute('opacity', phase(p, .25, .32));
      tint.setAttribute('opacity', 1 - phase(p, .42, .85));
      const edge = pivotX + (164 - pivotX) * width;
      updateCirculation(inlet, backedUp, outlet, p, edge, growth);
      return growth;
    },
  };
}

export function arteryLens({ x, y, radius }) {
  const tissue = washLayer(66519, () => {
    pigment(organic(226, 39, 174, 62, 813, .27, -.07, 24), '#BA6684', 133, { bleed: .20, texture: .84 });
    pigment(organic(236, 218, 152, 57, 902, .30, .06, 23), '#BB647F', 118, { bleed: .27, texture: .83 });
    pigment(organic(137, 70, 63, 26, 971, .33, -.12, 21), '#DFA4AE', 125, { bleed: .30, texture: .78 });
    pigment(organic(312, 171, 53, 34, 581, .26, -.14, 19), '#A85973', 85, { bleed: .28, texture: .73 });
  }, 'multiply', [52, 0, 352, 257]);
  const pressure = ['M207 63 Q219 74 226 93', 'M249 198 Q240 181 234 162']
    .map(d => arrow(d, { color: '#9A5368', size: 2.5, head: 10, opacity: .64 })).join('');
  const red = redCells('arterial', 62, 61008);
  const rng = mulberry32(13821);
  const fibres = Array.from({ length: 93 }, (_, i) => {
    const x = 95 + rng() * 271;
    const side = i % 3 ? 1 : -1;
    const depth = 5 + rng() * 59;
    const id = `s17-artery-fibre-${i}`;
    const length = 5.4 + rng() * 8.1;
    const mark = strokePath(`M${-length} 0 q${length} -4 ${length * 2.5} .1`, '#855675', .92, .47)
      + cellDot(0, 0, 2.9 + rng() * 3, .9 + rng() * .65, '#704A6D', -8 + rng() * 16, .72);
    return { id, x, side, depth, mark: `<g id="${id}">${mark}</g>` };
  });
  const paint = `<defs><clipPath id="s17-artery-clip">
    <circle cx="${x}" cy="${y}" r="${radius}"/>
  </clipPath><clipPath id="s17-artery-lumen-clip"><path id="s17-artery-clip-shape"/></clipPath></defs>
  <circle cx="${x}" cy="${y}" r="${radius}" fill="#F4E4DB"/>
  <g clip-path="url(#s17-artery-clip)">
    <g transform="translate(${x - 230} ${y - 128})">
      <path id="s17-artery-tissue-top" fill="#E3B4C0"/>
      <path id="s17-artery-tissue-bottom" fill="#DEADBC"/>
      ${tissue}
      ${fibres.map(fibre => fibre.mark).join('')}
      <path id="s17-artery-wall" fill="#B94F47" stroke="#8F3C3B" stroke-width="1.6"/>
      <path id="s17-artery-lumen" fill="#D2766F" stroke="#8D3541" stroke-width="1.35"/>
      <g clip-path="url(#s17-artery-lumen-clip)">${red.map(cell => cell.paint).join('')}</g>
      <g id="s17-pressure-cues">${pressure}</g>
    </g>
  </g>
  ${roughProp('circle', [x, y, 2 * radius + 9], 7729, '#60473E', 2.9, .40)}
  ${roughProp('circle', [x, y, 2 * radius + 1], 8239, '#AB8775', 1.8, .45)}`;
  let nodes, lumenClip;
  const axis = a => 128 + 3.3 * Math.sin((a - 230) / 48);
  return {
    paint,
    mount(art) {
      nodes = ['tissue-top', 'tissue-bottom', 'wall', 'lumen'].map(key => art.querySelector(`#s17-artery-${key}`));
      lumenClip = art.querySelector('#s17-artery-clip-shape');
      for (const item of [...fibres, ...red]) item.node = art.querySelector(`#${item.id}`);
    },
    update(p) {
      const compression = phase(p, .19, .41);
      const halfWidth = a => 32 - 25 * compression * Math.exp(-(((a - 230) / 62) ** 2));
      const top = a => axis(a) - halfWidth(a);
      const bottom = a => axis(a) + halfWidth(a);
      const outerTop = a => top(a) - 12 - 4 * Math.cos(a / 53);
      const outerBottom = a => bottom(a) + 12 + 4 * Math.sin(a / 62);
      const outlines = [band(() => -8, outerTop), band(outerBottom, () => 264),
        band(outerTop, outerBottom), band(top, bottom)];
      nodes.forEach((node, i) => node.setAttribute('d', outlines[i]));
      lumenClip.setAttribute('d', outlines[3]);
      for (const { x, side, depth, node } of fibres) {
        const wall = side > 0 ? outerBottom(x) : outerTop(x);
        node.setAttribute('transform', `translate(${x} ${wall + side * depth}) rotate(${12 * Math.sin((x - 160) / 53) * compression})`);
      }
      for (const [i, cell] of red.entries()) {
        const travelling = 97 + modulo(268 * cell.offset + 147 * p, 268);
        const waiting = 164 + (i % 11) * 5.8 + cell.offset * 10;
        const along = i % 3 ? lerp(travelling, waiting, .85 * compression) : travelling;
        const across = lerp(top(along), bottom(along), cell.lane);
        placeCell(cell, along, across, Math.sin(p * 13 + i) * 15, .80);
      }
      return halfWidth(230) * 2;
    },
  };
}
