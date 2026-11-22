import { brace, cellDot, closedCurve, ease, fillPath, ink, lerp, morphShape, morphToLens, mulberry32,
  organic, pigment, roughProp, round, scopeSvg, strokePath, svgId, washLayer } from '../canvasCore.js';
import { EOSIN, ERYTHROCYTE, HEMATOXYLIN, stainedNeutrophil } from './cells.js';

export const HE_LENS = Object.freeze({ x: 823, y: 501, radius: 300 });
const lens = HE_LENS;
const light = '#FFFDF9';
const mucosa = x => 338 + 17 * Math.sin((x - 596) / 58) + 11 * Math.sin(x / 29);
const submucosa = x => 527 + 8 * Math.sin((x - 523) / 57) + 10 * Math.sin((x - 523) / 117);
const muscle = x => 600 + 8 * Math.sin((x - 539) / 70) + 3 * Math.cos((x - 539) / 116);
const serosa = x => 733 + 7 * Math.sin((x - 628) / 54);
const margin = x => 772 + 7 * Math.cos(x / 48);
const erosionLeft = 882;
const erosionRight = 950;
const apical = x => {
  if (x <= erosionLeft || x >= erosionRight) return mucosa(x);
  const u = (x - erosionLeft) / (erosionRight - erosionLeft);
  return mucosa(x) + Math.sin(u * Math.PI) ** .57 * (30 + 4 * Math.sin(u * 23) + 1.8 * Math.sin(u * 51));
};
const leftEdge = y => lens.x - Math.sqrt(Math.max(0, lens.radius ** 2 - (y - lens.y) ** 2));

function visibleHeight(boundary) {
  let y = boundary(lens.x - lens.radius);
  for (let i = 0; i < 14; i++) y = boundary(leftEdge(y));
  return round(y);
}

const interfaces = [lens.y - lens.radius, ...[apical, submucosa, muscle, serosa, margin].map(visibleHeight)];
const layerNames = ['管腔', '黏膜', '黏膜下', '肌层', '浆膜'];
function arcRows(fn, left = 469, right = 1176) {
  return Array.from({ length: 73 }, (_, i) => {
    const x = lerp(left, right, i / 72);
    return [x, fn(x)];
  });
}

const band = (upper, lower) => closedCurve([...arcRows(upper), ...arcRows(lower, 1176, 469)]);
const edge = (fn, left, right) => 'M' + arcRows(fn, left, right).join('L');
const mucousBand = band(mucosa, submucosa);
const subBand = band(submucosa, muscle);
const muscleBand = band(muscle, serosa);
const serousBand = band(serosa, margin);
const groupShape = band(apical, margin);

function cryptEpithelium([x, offset, depth, tilt, curl, size], seed) {
  const rand = mulberry32(seed);
  const y0 = apical(x) + offset;
  const h = Math.min(depth, submucosa(x + tilt) - 12 - y0);
  const phase = rand() * 7;
  const section = t => {
    const x0 = x + t * tilt + Math.sin(Math.PI * t) * curl + .15 * curl * Math.sin(2 * Math.PI * t);
    const y = y0 + h * t;
    const tangent = tilt + Math.PI * curl * (Math.cos(Math.PI * t) + .30 * Math.cos(Math.PI * 2 * t));
    const len = Math.hypot(tangent, h);
    const nx = h / len;
    const ny = -tangent / len;
    const width = size * (.94 + .11 * Math.sin(t * 15 + phase) + .09 * Math.sin(t * 9));
    return { x0, y, nx, ny, width };
  };
  function wall(internal) {
    const rows = Array.from({ length: 23 }, (_, i) => {
      const t = i / 22 * (internal ? .944 : .98);
      const { x0, y, nx, ny, width } = section(t);
      const scale = internal ? .37 + .09 * Math.cos(t * 20 + phase) : 1;
      const taper = t < .87 ? 1 : 1 - (t - .87) * 4.7;
      return [x0, y, nx * width * scale * taper, ny * width * scale * taper];
    });
    const turn = rows.at(-1);
    const mouth = rows[0];
    return closedCurve([...rows.map(([x, y, dx, dy]) => [x + dx, y + dy]),
      [turn[0] + tilt * .019, turn[1] + (internal ? 3.8 : 7.2)],
      ...rows.reverse().map(([x, y, dx, dy]) => [x - dx, y - dy]),
      [mouth[0] - tilt * .02, mouth[1] - (offset <= 4 ? 8 : 5)]]);
  }
  const outer = wall(false);
  const slit = wall(true);
  const stains = [fillPath(outer, '#F3B7C9', .88), strokePath(outer, '#B65583', 1.1, .65),
    fillPath(slit, '#F9DDE2', .88), strokePath(slit, '#AE688A', .72, .64)];
  for (const side of [-1, 1]) {
    const n = Math.floor(h / (7.7 + rand() * 2.5));
    for (let i = 0; i < n; i++) {
      const t = (i + .29 + rand() * .40) / n * .963;
      const { x0, y, nx, ny, width } = section(t);
      const bx = nx * width * side;
      const by = ny * width * side;
      const angle = Math.atan2(ny, nx) * 180 / Math.PI + (rand() - .5) * 16;
      if ((i + seed + (side === -1 ? 1 : 0)) % 5 < 2) {
        stains.push(cellDot(x0 + bx * .61, y + by * .61, 3 + rand() * 1.14, 2.4 + rand() * 1.5,
          '#FFFDF9', angle, .90 + rand() * .10),
        cellDot(x0 + bx * .88, y + by * .88, 1.22, 1.78, '#653268', angle, .86));
      } else {
        stains.push(cellDot(x0 + bx * .77, y + by * .77, 2.35 + rand() * 1.8, 1.19 + rand() * 1.1,
          '#643168', angle, .62 + rand() * .31));
      }
    }
  }
  return stains.join('');
}

const glandSections = [
  [512, -4, 145, 29, 24, 15], [560, -3, 163, -2, -22, 12], [602, -1, 139, 17, 17, 13],
  [646, 21, 81, 21, 20, 11], [685, 0, 150, -20, 26, 14], [724, 3, 123, 27, -8, 13],
  [766, 49, 95, -16, 10, 13], [794, -1, 140, 37, -15, 15], [844, 0, 128, 5, 20, 13],
  [887, 68, 115, -8, 9, 13], [926, 85, 85, -21, 13, 11], [959, 3, 128, 26, 17, 12],
  [1011, -1, 127, -4, -14, 12], [1050, 31, 128, 19, -14, 14], [1097, -3, 143, 2, 15, 13],
  [1140, 19, 119, -13, -10, 15],
];

export function crypts() {
  const rand = mulberry32(482);
  const oblique = [
    [581, 506, 16, 10, -.38], [628, 518, 18, 10, -.34], [706, 505, 15, 12, .34],
    [787, 503, 17, 11, -.66], [851, 490, 15, 12, -.31], [973, 497, 15, 10, .1],
    [1052, 459, 13, 12, .5], [1127, 488, 14, 10, -.2],
  ].map(([x, y, rx, ry, angle], i) => {
    const wall = organic(x, y, rx, ry, 700 + i * 26, .24, angle, 13);
    const core = organic(x - 1, y + 1, rx * .43, ry * .45, 723 + i * 26, .34, angle, 12);
    const cells = Array.from({ length: 11 }, (_, j) => {
      const a = 2 * Math.PI * j / 11;
      const goblet = j % 3 === (i % 3);
      return cellDot(x + Math.cos(a) * rx * .67, y + Math.sin(a + angle * .15) * ry * .64,
        1.65 + rand() * 1.1, goblet ? 2.86 : 1.16, goblet ? light : '#713672',
        a * 180 / Math.PI, .74 + rand() * .21);
    }).join('');
    return fillPath(wall, '#EEA9BA', .82) + strokePath(wall, '#B45380', .99, .71)
      + fillPath(core, '#F9DDE3', .92) + cells;
  }).join('');
  return glandSections.map((section, i) => cryptEpithelium(section, 490 + i * 27)).join('') + oblique;
}

function mucosalLining() {
  const art = [];
  const rand = mulberry32(7307);
  for (const [from, to] of [[476, erosionLeft], [erosionRight, 1171]]) {
    const ribbon = closedCurve([...arcRows(apical, from, to), ...arcRows(x => apical(x) + 10, to, from)]);
    art.push(fillPath(ribbon, '#ED9AB3', .82), strokePath(edge(apical, from, to), '#AB3F71', 1.8, .72));
    for (let x = from + 3; x < to - 2; x += 7 + rand() * 3) {
      const y = apical(x);
      const angle = 15 + Math.atan2(apical(x + 1) - apical(x - 1), 2) * 54;
      art.push(cellDot(x, y + 7.1, 1.4, 2.4, '#622864', angle, .85));
      if (rand() < .54) art.push(cellDot(x, y + 3.1, 2.1, 2.56, light, angle, .93));
    }
  }
  const lower = x => apical(x) + 7.1 + 1.6 * Math.sin(x * .54);
  const rawEdge = closedCurve([...arcRows(apical, erosionLeft, erosionRight), ...arcRows(lower, erosionRight, erosionLeft)]);
  art.push(fillPath(rawEdge, '#B64C73', .42), strokePath(edge(lower, erosionLeft + 4, erosionRight - 4), '#A85476', 1.15, .57));
  for (let i = 0; i < 21; i++) {
    const x = lerp(erosionLeft + 5, erosionRight - 6, rand());
    const y = apical(x) - 7 + rand() * 18;
    art.push(fillPath(organic(x, y, 1.3 + rand() * 5.4, 1.1 + rand() * 2.3,
      941 + i * 15, .52, rand() * 4, 7), i % 4 ? '#D98EAA' : '#62325F', .38 + rand() * .39));
  }
  return art.join('');
}

function mucosalCells() {
  const rand = mulberry32(1638);
  const cells = [];
  for (let i = 0; i < 960; i++) {
    const x = 515 + rand() * 614;
    const y = lerp(apical(x) + 12, submucosa(x) + 5, rand());
    const a = rand();
    cells.push(cellDot(x, y, 0.9 + a * 2.4, 1 + rand() * 3.4,
      a > .43 ? '#743269' : '#AE537F', rand() * 160, .28 + rand() * .46));
  }
  return cells.join('');
}

function lymphoid(x, y, rx, ry, seed) {
  const rand = mulberry32(seed);
  const fields = [fillPath(organic(x, y, rx, ry, seed, .1), '#C680AA', .74),
    fillPath(organic(x + 4, y - 2, rx * .57, ry * .53, seed + 17, .16), '#E8AFBD', .92)];
  for (let i = 0; i < 120; i++) {
    const theta = rand() * Math.PI * 2;
    const r = Math.sqrt(rand());
    const px = x + Math.cos(theta) * rx * r;
    const py = y + Math.sin(theta) * ry * r;
    fields.push(cellDot(px, py, 0.8 + rand() * 1.7, 1.3 + rand() * 1.1, HEMATOXYLIN,
      rand() * 120, r > .6 ? .5 + rand() * .35 : .18 + rand() * .3));
  }
  return fields.join('');
}

export function connectiveAndMuscle() {
  const rand = mulberry32(1493);
  const strands = [];
  for (let i = 0; i < 450; i++) {
    const x = 492 + rand() * 651;
    const y = lerp(submucosa(x) + 3, muscle(x) - 3, rand());
    const len = 8 + rand() * 18;
    strands.push(strokePath(`M${x} ${y} q${len / 2} ${-7 + rand() * 12} ${len} ${-5 + rand() * 10}`,
      i % 7 ? '#C7648F' : '#783A6F', i % 4 ? .83 : 1.4, .14 + rand() * .48));
  }
  strands.push(lymphoid(648, 552, 46, 34, 31), lymphoid(976, 562, 42, 29, 29));
  const cigar = 'M-1.1 -.04 C-.61 -.56 .50 -.61 1 .03 C.53 .51 -.69 .55 -1.1 -.04Z';
  for (let i = 0; i < 1150; i++) {
    const x = 501 + rand() * 649;
    const level = rand();
    const y = lerp(muscle(x) + 6, serosa(x) - 7, level);
    const len = 11 + rand() * 28;
    const slope = level < .68 ? .19 + .15 * Math.sin(x / 74) : -.39 + .13 * Math.cos(x / 78);
    const depth = len * slope + (rand() - .5) * 2.9;
    strands.push(strokePath(`M${x} ${y} q${len * .42} ${depth * .32} ${len} ${depth}`,
      i % 3 ? EOSIN : '#DB8AA5', .7 + rand() * 1.10, .18 + rand() * .39));
    if (i % 7 === 0) {
      const angle = Math.atan2(depth, len) * 180 / Math.PI;
      const sx = 4.0 + rand() * 3.5;
      const sy = 1.45 + rand() * .62;
      strands.push(`<g transform="translate(${x + len * .36} ${y + depth * .34}) rotate(${angle}) scale(${sx} ${sy})">
        ${fillPath(cigar, HEMATOXYLIN, .51 + rand() * .25)}
        ${cellDot(-.12, -.09, .43, .11, '#95638B', 0, .66)}
      </g>`);
    }
  }
  for (let i = 0; i < 99; i++) {
    const x = 552 + rand() * 537;
    const y = lerp(serosa(x) + 4, margin(x) - 4, rand());
    strands.push(cellDot(x, y, 1.6 + rand() * 4.1, .68 + rand() * .9,
      '#A25778', -14 + rand() * 24, .25 + rand() * .57));
  }
  return strands.join('');
}

function congestedCapillaries() {
  const profiles = [[907, 396, 13, 9], [971, 473, 14, 10], [875, 553, 15, 11], [945, 576, 16, 10]];
  return profiles.map(([x, y, rx, ry], i) => {
    const seed = 3818 + i * 179;
    const rand = mulberry32(seed);
    const wall = organic(x, y, rx, ry, seed, .17, (rand() - .5) * .58, 15);
    const packed = Array.from({ length: 12 }, (_, j) => {
      const angle = 2.39996 * j + i;
      const spread = Math.sqrt(j / 13);
      const cx = x + rx * .81 * Math.cos(angle) * spread;
      const cy = y + ry * .78 * Math.sin(angle) * spread;
      return cellDot(cx, cy, 2.66 + rand() * 1.06, 1.62 + rand() * .82,
        ERYTHROCYTE, rand() * 150, .75 + rand() * .24);
    }).join('');
    return fillPath(wall, '#F5C6CE', .96)
      + strokePath(wall, '#9A4A75', 1.05, .87)
      + packed
      + cellDot(x - rx * .86, y + ry * .32, 2.9, .96, '#562358', -47, .77);
  }).join('');
}

function focalInfiltrate(cellStyle) {
  const groups = [
    [912, 375, 35, 19, 22], [917, 422, 48, 23, 25], [943, 478, 54, 29, 19],
    [907, 522, 61, 18, 11], [900, 563, 76, 22, 28],
  ];
  const scattered = [[583, 400], [628, 481], [682, 428], [715, 506], [758, 457], [788, 516],
    [691, 568], [760, 561], [803, 577], [1047, 474], [1070, 449], [1017, 547]];
  const foci = groups.flatMap(([x, y, rx, ry, count], k) => {
    const rand = mulberry32(1227 + k * 131);
    const points = [];
    for (let attempt = 0; attempt < count * 25 && points.length < count; attempt++) {
      const a = rand() * 2 * Math.PI;
      const r = Math.sqrt(rand());
      const px = x + Math.cos(a) * rx * r;
      const py = y + Math.sin(a) * ry * r;
      if (points.every(([qx, qy]) => (px - qx) ** 2 + (py - qy) ** 2 > 34)) points.push([px, py]);
    }
    return points;
  });
  return [...scattered, ...foci].map(([x, y], i) =>
    stainedNeutrophil(round(x), round(y), i % 3 ? 3 : 4, 203 + i * 43, (i * 37) % 190, cellStyle)).join('');
}

function lensPainting(paintNotes, cellDiameter) {
  const cellStyle = cellDiameter === undefined ? undefined : { diameter: cellDiameter, outline: false };
  const stain = washLayer(2216, () => {
    pigment(mucousBand, EOSIN, 109, { bleed: .08, direction: 'in', border: .59, texture: .79 });
    pigment(band(x => mucosa(x) + 15, x => submucosa(x) - 25), '#B85080', 71,
      { bleed: .14, texture: .83, border: .34, split: .32 });
    pigment(subBand, '#C67AA7', 86, { bleed: .09, direction: 'in', border: .44, texture: .65 });
    pigment(muscleBand, '#CC6594', 119, { bleed: .15, direction: 'in', border: .50, texture: .81 });
    pigment(band(x => lerp(muscle(x), serosa(x), .47), x => serosa(x) - 5),
      '#B84B7C', 83, { bleed: .10, direction: 'in', border: .6, texture: .84, angle: 36 });
    pigment(serousBand, '#DF839C', 122, { bleed: .12, direction: 'in', border: .58, texture: .57 });
    paintNotes?.();
  });
  const bases = fillPath(mucousBand, '#F6C4D4') + fillPath(subBand, '#F0CDD9')
    + fillPath(muscleBand, '#F2B4CA') + fillPath(serousBand, '#F5CED4');
  const stroma = `<g clip-path="url(#c-tissue)">${mucosalCells()}${connectiveAndMuscle()}</g>`;
  const abrasion = closedCurve([...arcRows(x => mucosa(x) - 26, erosionLeft, erosionRight),
    ...arcRows(apical, erosionRight, erosionLeft)]);
  const sparseMuscularNeutrophils = [
    [669, 645], [757, 682], [934, 630], [1019, 670],
  ].map(([x, y], i) => stainedNeutrophil(x, y, i % 2 ? 3 : 4, 41 + i * 43, 17 + 23 * i, cellStyle)).join('');
  return {
    stain,
    detail: bases + stain + fillPath(abrasion, light) + stroma + mucosalLining()
      + `<g clip-path="url(#c-mucosa)">${crypts()}</g>`
      + strokePath(edge(x => submucosa(x) - 2), '#AD5C84', 1.5, .48)
      + strokePath(edge(muscle), '#AE5181', 2.85, .54)
      + strokePath(edge(serosa), '#9C4E7B', 2.95, .63)
      + strokePath(edge(margin), '#A05A7E', 2.1, .53)
      + focalInfiltrate(cellStyle) + congestedCapillaries() + sparseMuscularNeutrophils,
  };
}

let defaultPainting;

export function createHistologyLens({ id, x = lens.x, y = lens.y, scale = 1, paintNotes, separateFrame = false,
  cellDiameter, compactLayerLabels = false } = {}) {
  id = svgId('he-lens', id);
  if (![x, y, scale].every(Number.isFinite) || scale <= 0) throw new RangeError('Invalid lens position or scale');
  if (cellDiameter !== undefined && (!Number.isFinite(cellDiameter) || cellDiameter <= 0)) {
    throw new RangeError('Invalid neutrophil diameter');
  }
  const { stain, detail } = paintNotes || cellDiameter !== undefined ? lensPainting(paintNotes, cellDiameter)
    : (defaultPainting ??= lensPainting());
  const section = 'M818 319 C937 319 1031 417 1019 516 C1015 593 967 670 891 690 C799 713 717 687 674 627 C627 563 611 471 650 402 C684 339 754 314 818 319Z';
  const slide = 'M819 244 C947 236 1071 329 1092 456 C1117 588 1043 709 922 751 C811 787 681 746 614 638 C557 542 570 419 638 338 C687 275 759 251 819 244Z';
  const expand = morphShape(section, slide);
  const roundLens = morphToLens(slide, lens);
  const rings = roughProp('circle', [lens.x, lens.y, lens.radius * 2 + 26], 3314, '#60473E', 3.5, .45)
    + roughProp('circle', [lens.x, lens.y, lens.radius * 2 + 9], 9348, '#AC8E72', 2.7, .44);
  const fit = markup => x === lens.x && y === lens.y && scale === 1 ? markup
    : `<g transform="translate(${x} ${y}) scale(${scale}) translate(${-lens.x} ${-lens.y})">${markup}</g>`;
  const field = `<defs>
      <clipPath id="c-lens"><path id="c-outline" d="${roundLens(1)}"/></clipPath>
      <clipPath id="c-tissue"><path d="${groupShape}"/></clipPath>
      <clipPath id="c-mucosa"><path d="${band(apical, submucosa)}"/></clipPath>
    </defs><g clip-path="url(#c-lens)">
      <rect x="480" y="170" width="690" height="662" fill="${light}"/>
      ${detail}
    </g>`;
  const frame = `<g id="c-rings">${rings}</g>`;
  const paint = scopeSvg(field + (separateFrame ? '' : frame), id);
  const labelStyle = compactLayerLabels
    ? { x: 449, baseline: 8, size: 29, braceX: 481, braceColor: '#624D42',
      leaderX: 496, lift: 1.2, gap: 10, leaderColor: '#9B7A6B', width: 1.85, opacity: .7, taper: 3 }
    : { x: 446, baseline: 11, size: 33, braceX: 477, braceColor: '#665346',
      leaderX: 493, lift: 2, gap: 12, leaderColor: '#A58575', width: 1.9, opacity: .65, taper: 2 };
  const { x: labelX, baseline, size, braceX, braceColor, leaderX, lift, gap, leaderColor, width, opacity, taper } = labelStyle;
  const labels = `<g id="${id}-layer-labels">${layerNames.map((name, i) => {
    const y0 = interfaces[i];
    const y1 = interfaces[i + 1];
    const y = (y0 + y1) / 2;
    const start = leftEdge(y);
    return `<text class="note" x="${labelX}" y="${y + baseline}" text-anchor="end" font-size="${size}">${name}</text>
      ${brace(braceX, y0 + 1, y1 - 1, braceColor)}
      ${ink(`M${leaderX} ${y} Q${(start + leaderX) / 2} ${y + lift} ${start - gap} ${y}`,
        { color: leaderColor, opacity, size: width, taperStart: 2, taperEnd: taper })}`;
  }).join('')}</g>`;
  return {
    paint: fit(paint),
    ...(separateFrame ? { frame: fit(scopeSvg(frame, id)) } : {}),
    lettering: fit(labels),
    ...(paintNotes ? { notesWash: stain } : {}),
    update(art, lettering, t) {
      const outline = t <= .48 ? expand(ease(t / .48)) : roundLens(ease((t - .48) / .68));
      art.querySelector(`#${id}-c-outline`).setAttribute('d', outline);
      const opacity = ease((t - .65) / .51);
      art.querySelector(`#${id}-c-rings`).setAttribute('opacity', opacity);
      lettering?.querySelector(`#${id}-layer-labels`)?.setAttribute('opacity', opacity);
    },
  };
}
