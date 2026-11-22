import { cellDot, closedCurve, fillPath, ink, lerp, mulberry32, organic, pencil, pigment, round,
  scopeSvg, strokePath, svgId, washLayer } from '../canvasCore.js';
import { ERYTHROCYTE, VASCULAR_NUCLEUS, vascularNeutrophil } from './cells.js';

const top = x => 444 + 36 * Math.sin((x - 421) / 260) - 25 * Math.cos((x - 1310) / 130);
const floor = x => 692 + 39 * Math.sin((x + 22) / 310) + 24 * Math.cos((x - 850) / 190);
const rim = x => 219 + 25 * Math.sin(x / 190) + 15 * Math.cos((x + 36) / 79);
const cleft = x => 109 * Math.exp(-((x - 898) ** 2) / 1700) + 74 * Math.exp(-((x - 956) ** 2) / 2300);
const apo = x => rim(x) + cleft(x);
const serosa = x => 770 + 26 * Math.sin((x + 120) / 274) - 11 * Math.sin(x / 89);
const upperLip = x => top(x) - 11 * Math.exp(-((x - 994) ** 2) / 1000);
const lowerLip = x => floor(x) + 5;
const crossingX = 994;
const crossingY = upperLip(crossingX);
export const EXTRAVASATION = Object.freeze({ x: crossingX, y: crossingY });
const junctionLeft = crossingX - 8;
const junctionRight = crossingX + 8;
const ulcerLeft = 835;
const ulcerRight = 1010;

function curve(from, to, fn, step = 16) {
  const count = Math.max(1, Math.ceil(Math.abs(to - from) / step));
  return Array.from({ length: count + 1 }, (_, i) => {
    const x = lerp(from, to, i / count);
    return [round(x), round(fn(x))];
  });
}

const tissueBand = (upper, lower, from = -52, to = 1972) =>
  closedCurve([...curve(from, to, upper), ...curve(to, from, lower)]);

const line = (from, to, fn, step) => 'M' + curve(from, to, fn, step).join('L');
const lumen = tissueBand(top, floor);
const mucosa = tissueBand(x => apo(x) - 5, x => apo(x) + 106 + 11 * Math.sin(x / 101));
const tissue = tissueBand(x => apo(x) + 16, x => serosa(x) + 47);

function extracellular() {
  const rand = mulberry32(765);
  const remarks = [];
  for (let i = 0; i < 540; i++) {
    const x = -22 + rand() * 1964;
    const y = lerp(apo(x) + 47, top(x) + 3, rand());
    const z = rand();
    const theta = rand() * 5.1;
    if (z < 0.3) {
      const xx = x + 10 + 39 * rand();
      const yy = y + Math.sin(theta) * 10;
      remarks.push(strokePath(`M${x} ${y} Q${(x + xx) / 2} ${y - 8} ${xx} ${yy}`, '#B86A74', 1.2 + z, 0.24));
    } else {
      remarks.push(cellDot(x, y, 1.3 + z * 4.7, 0.7 + rand() * 1.85, z > 0.8 ? '#974F79' : '#BF7985',
        theta * 30, 0.12 + rand() * 0.42));
    }
  }
  return remarks.join('');
}

export function columnarCell({ width, height, goblet: isGoblet, pale, nucleusAngle = 0 }) {
  const column = 'M-.48 .01 Q-.16 -.037 .45 .005 C.52 .24 .43 .55 .46 .83 Q.49 .95 .32 .99 Q0 1.02 -.43 .986 C-.48 .74 -.54 .40 -.48 .01Z';
  const goblet = 'M-.40 .035 C-.52 .12 -.47 .31 -.37 .43 C-.23 .56 -.12 .63 -.09 .70 Q0 .75 .12 .69 C.18 .60 .35 .52 .41 .34 C.47 .19 .45 .08 .33 .05 Q0 -.02 -.40 .035Z';
  const crescent = 'M-.34 .82 C-.23 .94 .21 .94 .35 .79 Q.39 .96 .15 .973 C-.09 1.02 -.35 .97 -.34 .82Z';
  const lining = fillPath(column, pale ? '#F2B0B6' : '#E693A4', .63)
    + strokePath(column, '#B76682', .024, .69);
  const inner = isGoblet
    ? fillPath(goblet, '#FFFDF9', .92) + strokePath(goblet, '#CF97AB', .017, .68)
      + fillPath(crescent, VASCULAR_NUCLEUS, .91)
    : cellDot(-.025, .765, .152, .139, VASCULAR_NUCLEUS, nucleusAngle, .90)
      + cellDot(-.043, .745, .07, .06, '#8E6AA6', 4, .45);
  return `<g transform="scale(${width} ${height})">${lining}${inner}</g>`;
}

export function epithelium() {
  const rand = mulberry32(3104);
  const cells = [];
  const apical = x => rim(x) + cleft(x) * .43;
  const height = x => 62 + 6 * Math.sin(x / 81) + 4 * Math.sin(x / 127);
  const basal = x => apical(x) + height(x);
  for (const [from, to] of [[-31, ulcerLeft], [ulcerRight, 1954]]) {
    cells.push(ink(line(from, to, basal), { size: 3.5, color: '#99546A', opacity: .74 }));
    const count = Math.round((to - from) / 28);
    const step = (to - from) / count;
    for (let i = 0; i < count; i++) {
      const width = step * (1.01 + rand() * .035);
      const x = from + step * (i + .5);
      const y = apical(x) + (rand() - .45) * 2.6;
      const h = height(x);
      const angle = (rand() - .5) * 5 + Math.atan2(apical(x + 1) - apical(x - 1), 2) * 14;
      const isGoblet = i % 7 === 2 || i % 7 === 5;
      const cell = columnarCell({ width, height: h, goblet: isGoblet, pale: i % 3,
        nucleusAngle: isGoblet ? 0 : (rand() - .5) * 19 });
      cells.push(`<g transform="translate(${x} ${y}) rotate(${angle})">${cell}</g>`);
    }
  }
  const wound = 'M834 212 C845 222 845 243 858 252 L873 257 Q872 273 892 283 L899 295 Q915 273 929 291 L945 285 Q951 270 966 276 L976 263 Q995 259 1009 229';
  cells.push(strokePath(wound, '#D27A91', 15, .43),
    ink(wound, { size: 5.1, color: '#9C475F', opacity: .82, taperEnd: 5 }),
    ink('M820 255 L835 264 Q849 271 855 281 L869 285', { size: 4.0, color: '#7F3B5F' }),
    ink('M970 294 Q982 284 991 282 L1001 275 L1028 277', { size: 4.0, color: '#7F3B5F' }));
  for (let i = 0; i < 20; i++) {
    const x = 852 + rand() * 145;
    const y = 230 + rand() * 71;
    cells.push(fillPath(organic(x, y, 4.6 + rand() * 15, 2.7 + rand() * 6.5, 510 + i, .54, rand() * 3, 9),
      i % 3 ? '#D892A0' : '#EAB0B6', .46 + rand() * .33));
  }
  for (let i = 0; i < 17; i++) {
    const x = 853 + rand() * 134;
    const y = 253 + rand() * 52;
    if (i % 3 === 0) cells.push(cellDot(x, y, 2.4 + rand() * 1.8, 1.9 + rand() * 1.3, '#301829', rand() * 90, .89));
    const pieces = 2 + i % 3;
    for (let j = 0; j < pieces; j++) {
      const dx = (rand() - .5) * 16;
      const dy = (rand() - .5) * 12;
      cells.push(fillPath(organic(x + dx, y + dy, 1.7 + rand() * 2.2, 1.15 + rand() * 1.9, 1020 + i * 7 + j,
        .72, rand() * 4, 6), '#4A235B', .62 + rand() * .32));
    }
  }
  return cells.join('');
}

export function endothelialCell(start, end, centre, axis, width, rx, ry) {
  const left = axis(start);
  const right = axis(end);
  const y = axis(centre);
  const tip = 'M' + [start, left] + ` C${lerp(start, centre, .46)} ${lerp(left, y, .66) - 3}
    ${centre - 14} ${y - width} ${centre} ${y - width}
    C${centre + 16} ${y - width} ${lerp(centre, end, .73)} ${right - 2.1} ${end} ${right}
    C${lerp(centre, end, .71)} ${right + 3} ${centre + 16} ${y + width} ${centre} ${y + width}
    C${centre - 18} ${y + width} ${lerp(start, centre, .47)} ${left + 2.7} ${start} ${left}Z`;
  const angle = Math.atan2(axis(centre + 3) - axis(centre - 3), 6) * 180 / Math.PI;
  return fillPath(tip, '#F1BECA', .88) + strokePath(tip, '#AC657A', 1.45, .87)
    + cellDot(centre, y, rx, ry, VASCULAR_NUCLEUS, angle, .86)
    + cellDot(centre - 2, y - .9, 6.1, .95, '#A17AA6', angle, .59);
}

export function vessel() {
  const rand = mulberry32(188);
  const lines = [];
  const banks = [
    [-48, junctionLeft, upperLip, -1],
    [junctionRight, 1966, upperLip, -1],
    [-48, 1966, lowerLip, 1],
  ];
  for (const [from, to, axis, side] of banks) {
    lines.push(ink(line(from, to, x => axis(x) + side * 11),
      { size: 2.5, color: '#A65260', opacity: .65 }));
    let start = from;
    while (start < to - 1) {
      const guess = start + 49 + rand() * 34;
      const end = to - guess < 41 ? to : guess;
      const centre = lerp(start, end, .47 + rand() * .10);
      const width = 6.8 + rand() * 3.8;
      lines.push(endothelialCell(start, end, centre, axis, width, 12 + rand() * 7.5, 2.8 + rand() * 1.4));
      start = end + .55;
    }
  }
  return lines.join('');
}

const redCells = [
  [32, .31, 48, 24, -.45], [74, .72, 49, 18, .24], [171, .48, 58, 33, -.30],
  [290, .27, 78, 36, .26], [263, .76, 54, 18, -.44], [403, .58, 52, 30, -.58],
  [490, .78, 43, 15, .31], [561, .32, 61, 33, .42], [644, .67, 68, 31, -.26],
  [728, .22, 40, 14, -.50], [782, .55, 50, 30, -.3], [877, .76, 60, 26, .34],
  [923, .48, 36, 18, .19], [1047, .51, 59, 34, -.35], [1111, .76, 36, 14, .09],
  [1171, .29, 58, 26, .34], [1275, .68, 64, 38, -.45], [1392, .51, 53, 20, .32],
  [1472, .71, 46, 22, -.55], [1538, .29, 54, 27, .27], [1597, .57, 55, 33, .56],
  [1698, .76, 69, 29, -.29], [1756, .29, 57, 29, -.19], [1843, .54, 64, 32, .44],
  [1901, .78, 40, 18, -.1],
].map(([x, level, a, b, angle], index) => ({ x, y: lerp(top(x), floor(x), level), a, b, angle, seed: 112 + index * 179 }));

export function redBloodCells(cells = redCells) {
  const bases = cells.map(({ x, y, a, b, angle, seed }) =>
    fillPath(organic(x, y, a, b, seed, 0.1, angle), '#E8817C', 0.93)).join('');
  const washes = washLayer(877, () => {
    for (const { x, y, a, b, angle, seed } of cells) {
      pigment(organic(x, y, a, b, seed, 0.1, angle), ERYTHROCYTE, 139,
        { bleed: 0.075, direction: 'in', texture: 0.64, border: 0.92, split: 0.29 });
      if (b >= 24) pigment(organic(x - 2, y - 2, a * 0.51, b * 0.4, seed + 9, 0.2, angle),
        '#FFD5BA', 140, { bleed: 0.11, texture: 0.6, border: 0.38 });
    }
  }, 'multiply');
  const dimples = cells.map(({ x, y, a, b, angle, seed }) => {
    const narrow = b <= 21;
    const bow = narrow
      ? `M${-a * 0.9} ${b * .1} C${-a * .59} ${-b * .89} ${-a * .39} ${b * .56} 0 ${b * .2}
        C${a * .48} ${-b * .19} ${a * .57} ${-b * .70} ${a * .87} ${-b * .10}`
      : `M${-a * .46} ${-b * .04} Q${-a * .32} ${-b * .54} ${a * .11} ${-b * .55}
        Q${a * .38} ${-b * .48} ${a * .47} ${-b * .07}`;
    const lip = `M${-a * .59} ${b * .56} Q0 ${b * .94} ${a * .66} ${b * .4}`;
    return `<g transform="translate(${x} ${y}) rotate(${angle * 180 / Math.PI})">
      ${ink(bow, { size: narrow ? 4.2 : 2.7, seed, color: narrow ? '#F7AF96' : '#A94955', opacity: .67 })}
      ${ink(lip, { size: 3.6, seed, color: '#B43145', opacity: .64 })}
    </g>`;
  }).join('');
  return bases + washes + dimples;
}

const debrisCells = [
  [86, 18, 18], [222, 40, 21], [399, 17, 18], [536, 39, 23],
  [690, 26, 19], [844, 45, 21], [1000, 26, 22], [1133, 45, 20],
  [1323, 24, 22], [1476, 40, 18], [1619, 21, 19], [1815, 39, 22],
];

const whiteCells = [
  { x: 562, y: 553, r: 43, lobes: 4, angle: -21 },
  { x: 861, y: 520, r: 36, lobes: 3, angle: 47 },
  { x: 1487, y: 505, r: 44, lobes: 4, angle: -21 },
  { x: 373, y: 374, r: 25, lobes: 3, angle: 31 },
  { x: 1174, y: 352, r: 28, lobes: 4, angle: -18 },
  { x: crossingX, y: crossingY, r: 37, lobes: 4, angle: 0, crossing: true },
  { x: 1047, y: 390, r: 41, lobes: 3, angle: 35 },
  { x: 1014, y: 320, r: 31, lobes: 4, angle: 11 },
  { x: 1665, y: 349, r: 23, lobes: 3, angle: 10 },
];

function whiteBloodCells() {
  const cells = whiteCells.map((cell, i) => vascularNeutrophil(cell, 104 + i * 41));
  const washes = washLayer(7118, () => {
    whiteCells.forEach(({ x, y, r, crossing }, i) => {
      pigment(organic(x + r * .09, y + r * .13, r * .91, r * (crossing ? 1.36 : .8), 309 + i * 59, .19),
        '#C889B0', 65, { bleed: .19, border: .27, texture: .81 });
    });
  }, 'multiply');
  return `<defs><mask id="b-cell-paint" mask-type="alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
    ${cells.map(({ boundary, transform }) => `<path d="${boundary}" transform="${transform}" fill="white"/>`).join('')}
  </mask></defs>
  ${cells.map(({ body }) => body).join('')}
  <g mask="url(#b-cell-paint)">${washes}${cells.map(({ detail }) => detail).join('')}</g>
  ${cells.map(({ edge }) => edge).join('')}`;
}

function plasmaAndExudate() {
  return washLayer(9408, () => {
    pigment('M987 486 C978 468 960 456 962 436 C959 417 978 420 982 401 C1001 390 1008 419 1016 430 C1029 443 1015 458 1003 470 L1000 483Z',
      '#E9877F', 84, { bleed: .28, direction: 'out', angle: 109, texture: .84, border: .35 });
    pigment(organic(979, 434, 22, 42, 883, .3, -.26), '#D45A58', 46,
      { bleed: .26, angle: 94, border: .31, texture: .83 });
    pigment(tissueBand(x => serosa(x) - 27 + 7 * Math.sin(x / 77),
      x => serosa(x) + 10 + 4 * Math.sin(x / 63)), '#D89BA3', 52,
    { bleed: .16, angle: 76, texture: .78, border: .30 });
    const softBed = tissueBand(x => serosa(x) - 1 + 6 * Math.sin(x / 39),
      x => serosa(x) + 56 + 11 * Math.sin(x / 56), -64, 1980);
    pigment(softBed, '#DFBD52', 49, { bleed: .27, angle: 84, texture: .83, border: .28 });
    const rand = mulberry32(9674);
    for (let i = 0; i < 14; i++) {
      const x = i * 145 + 25 + rand() * 50;
      pigment(organic(x, serosa(x) + 23 + rand() * 13, 42 + rand() * 59, 14 + rand() * 27,
        191 + i * 29, .32, (rand() - .5) * .22, 15), i % 3 ? '#DFBD52' : '#C3A16A',
      45 + rand() * 45, { bleed: .29, direction: 'out', angle: 67, texture: .89, border: .44 });
    }
    pencil(tissueBand(x => serosa(x) + 5, x => serosa(x) + 41, 71, 1840), 'HB', '#B09557',
      { distance: 11.4, angle: 25, weight: .32 });
  }, 'multiply');
}

export function fibrin() {
  const rand = mulberry32(4410);
  const behind = [ink(line(-42, 1970, x => serosa(x) + 2), { size: 2.65, color: '#A86B71', opacity: .51 })];
  const over = [];
  const knots = Array.from({ length: 38 }, (_, i) => ({
    x: i * 57 - 70 + rand() * 39,
    rows: [6 + rand() * 13, 24 + rand() * 13, 43 + rand() * 13],
  }));
  for (let i = 0; i < knots.length - 1; i++) {
    const a = knots[i];
    const b = knots[i + 1];
    for (let j = 0; j < a.rows.length; j++) {
      const end = b.rows[(j + 1 + (i % 2)) % b.rows.length];
      const y = serosa(a.x) + a.rows[j];
      const ty = serosa(b.x) + end;
      const d = `M${a.x} ${y} Q${lerp(a.x, b.x, .39)} ${lerp(y, ty, .46) + (rand() - .58) * 21} ${b.x} ${ty}`;
      behind.push(strokePath(d, j % 2 ? '#B87B1A' : '#E0A838', 1.25 + rand() * 1.55, .43 + rand() * .36));
      const sweep = `M${a.x} ${y} Q${lerp(a.x, b.x, .61)} ${(y + ty) / 2 - 13} ${b.x + 19} ${serosa(b.x) + a.rows[j] + 5}`;
      if ((i + j) % 3 === 0) over.push(ink(sweep, { color: '#B87B1A', size: 2.4, opacity: .61, seed: 61 + i * 29 + j }));
      else behind.push(strokePath(sweep, '#E0A838', 1.25, .58));
    }
  }
  const pus = debrisCells.map(([x, depth, r], i) => {
    const y = serosa(x) + depth;
    const edge = organic(x, y, r, r * .83, 900 + i * 19, .38, rand() * 3, 15);
    const cx = x + (rand() - .5) * r * .49;
    const cy = y + (rand() - .5) * r * .46;
    const body = [fillPath(edge, '#F5E4D8', .81), strokePath(edge, '#B48083', 1.25, .58),
      fillPath(organic(cx, cy, r * .60, r * .54, 328 + i * 39, .33, .3, 12), '#99768E', i % 3 ? .34 : .17)];
    for (let j = 0; j < (i % 3 ? 9 : 5); j++) {
      const dx = (rand() - .5) * r * 1.22;
      const dy = (rand() - .5) * r * .92;
      const size = .9 + rand() * 2.5;
      body.push(fillPath(organic(cx + dx, cy + dy, size, size * .79, 774 + i * 32 + j, .62,
        rand() * 4, 6), j % 3 ? '#492345' : '#7E5174', .50 + rand() * .47));
    }
    return body.join('');
  }).join('');
  return behind.join('') + pus + over.join('');
}

function buildInflammationField() {
  const beds = washLayer(4884, () => {
    pigment(tissue, '#ED9E9E', 61, { bleed: 0.19, texture: 0.82, border: 0.35 });
    pigment(mucosa, '#D87E8D', 108, { bleed: 0.145, border: 0.52, split: 0.41 });
    pigment(tissueBand(x => apo(x) + 46, x => apo(x) + 93 + 20 * Math.sin(x / 63)),
      '#D0909E', 64, { bleed: 0.11, border: 0.47 });
    pigment(tissueBand(x => top(x) - 55, x => floor(x) + 69), '#E77A67', 94,
      { bleed: 0.25, angle: 94, texture: 0.94, border: 0.78, split: 0.39 });
    pigment(tissueBand(x => top(x) - 13, x => floor(x) + 23), '#CE4D49', 96,
      { bleed: 0.134, texture: 0.88, border: 0.6 });
    pigment(lumen, '#ED8C83', 96, { bleed: 0.079, direction: 'in', border: 0.77, texture: 0.68, split: 0.22 });
    pigment(tissueBand(x => top(x) + 23, x => lerp(top(x), floor(x), 0.55), -80, 2000),
      '#FFB19E', 75, { bleed: 0.11, border: 0.21, texture: 0.58 });
    pigment('M257 416 Q406 308 521 334 Q620 348 678 413 Q558 468 404 471 Q311 472 257 416Z',
      '#E46D62', 59, { bleed: 0.25, texture: 0.97, border: 0.59 });
    pigment('M839 316 Q946 279 1017 301 C1096 345 1113 379 1145 468 Q1051 507 984 453 Q924 393 839 316Z',
      '#DB675E', 69, { bleed: 0.26, texture: 0.98, border: 0.72 });
    pigment('M729 236 Q812 198 862 245 Q920 290 970 253 Q1001 228 1059 218 C1042 279 1021 306 949 329 Q906 347 872 305 Q828 265 729 236Z',
      '#A93957', 112, { bleed: 0.22, border: 0.86 });
  });
  const cells = redBloodCells();
  return `<defs><clipPath id="b-lumen"><path d="${lumen}"/></clipPath></defs>
      ${fillPath(tissue, '#ED968E', 0.13)}
      ${fillPath(lumen, '#DE7F77', 0.28)}
      ${beds}
      ${plasmaAndExudate()}
      ${extracellular()}
      ${epithelium()}
      <g clip-path="url(#b-lumen)"><g id="b-flow">${cells}</g></g>
      ${vessel()}
      ${whiteBloodCells()}
      ${fibrin()}`;
}

let field;
export function createInflammationField({ id, x = 0, y = 0, scale = 1 } = {}) {
  id = svgId('inflammation', id);
  if (![x, y, scale].every(Number.isFinite) || scale <= 0) throw new RangeError('Invalid field position or scale');
  const paint = scopeSvg(field ??= buildInflammationField(), id);
  return {
    paint: x || y || scale !== 1 ? `<g transform="translate(${x} ${y}) scale(${scale})">${paint}</g>` : paint,
    extravasation: { x: x + scale * crossingX, y: y + scale * crossingY },
    update(root, _lettering, t) {
      root.querySelector(`#${id}-b-flow`).setAttribute('transform', `translate(${(t - 1.2) * 13} 0)`);
    },
  };
}
