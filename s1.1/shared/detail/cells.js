import { cellDot, closedCurve, fillPath, lerp, mulberry32, organic, strokePath } from './geometry.js';
import { morphShape } from './morph.js';

export const HEMATOXYLIN = '#2B0F54';
export const EOSIN = '#CF4A78';
export const ERYTHROCYTE = '#C81E2B';
export const VASCULAR_NUCLEUS = '#33125E';

const crossingOutline = `M-.50 -1.38
  C-.81 -1.33 -.98 -1.03 -.88 -.78 C-1.01 -.58 -.65 -.39 -.42 -.31
  C-.23 -.23 -.17 -.13 -.16 .02 C-.15 .18 -.24 .31 -.48 .49
  C-.78 .72 -.69 1.07 -.52 1.25 C-.40 1.48 -.05 1.48 .21 1.43
  C.54 1.42 .75 1.18 .68 .91 C.71 .70 .51 .53 .32 .40
  C.18 .28 .14 .15 .15 .02 C.16 -.12 .25 -.27 .46 -.38
  C.74 -.52 .94 -.73 .85 -.98 C.91 -1.18 .64 -1.37 .35 -1.34
  C.18 -1.46 -.23 -1.53 -.50 -1.38Z`;

const lobeShapes = [
  'M-.94 -.10 C-1.13 -.49 -.67 -1.01 -.23 -.94 C.04 -.98 .19 -.62 .48 -.74 C.84 -.85 1.03 -.51 1.05 -.16 C1.15 .22 .79 .68 .50 .72 C.19 .80 .05 .56 -.17 .69 C-.63 .97 -.98 .49 -.94 -.10Z',
  'M-.91 .24 C-1.07 -.10 -.85 -.69 -.44 -.81 C-.15 -1.08 .34 -.89 .48 -.65 C.74 -.59 1.02 -.28 .95 .14 C.97 .50 .55 .88 .16 .80 C-.27 .92 -.71 .64 -.91 .24Z',
  'M-.90 .02 C-1.05 -.47 -.75 -.91 -.29 -.88 C-.08 -.89 -.06 -.63 .16 -.60 C.46 -.74 .87 -.60 1.01 -.22 C1.19 .23 .75 .78 .41 .74 C.16 .80 .00 .65 -.16 .73 C-.51 .98 -.91 .52 -.90 .02Z',
];

function pseudopods(seed) {
  const rand = mulberry32(seed);
  const lift = rand() * Math.PI;
  return closedCurve(Array.from({ length: 21 }, (_, i) => {
    const a = 2 * Math.PI * i / 21;
    const r = .98 + .15 * Math.sin(3 * a + lift) + .10 * Math.cos(5 * a - lift) + (rand() - .5) * .18;
    return [Math.cos(a) * r * 1.05, Math.sin(a) * r * .92];
  }));
}

function nucleus(count, seed, crossing) {
  const anchors = crossing
    ? count === 3 ? [[-.40, -1.03], [.37, -.87], [-.12, .91]]
      : [[-.40, -1.03], [.37, -.87], [-.23, .66], [.18, 1.11]]
    : count === 3
      ? [[-.52, -.25], [.15, -.37], [.39, .34]]
      : [[-.59, -.20], [-.08, -.49], [.46, -.18], [.27, .45]];
  const rand = mulberry32(seed);
  return anchors.map(([x, y], i) => ({
    x: x + (rand() - .5) * .09,
    y: y + (rand() - .5) * .09,
    rx: .20 + rand() * .053,
    ry: .24 + rand() * .059,
    angle: (i % 2 ? 38 : -30) + (rand() - .5) * 56,
    shape: lobeShapes[(i + seed) % lobeShapes.length],
  }));
}

function chromatin(lobes, dye, width, squeeze = 0) {
  const fibres = lobes.slice(1).map((end, i) => {
    const start = lobes[i];
    const midpoint = (start.x + end.x) * .5 + .052;
    const x = i === 1 ? lerp(midpoint, -.018, squeeze) : midpoint;
    const y = (start.y + end.y) * .5 - .065;
    return strokePath(`M${start.x} ${start.y} Q${x} ${y} ${end.x} ${end.y}`, dye, width);
  }).join('');
  return fibres + lobes.map(({ x, y, rx, ry, angle, shape }) =>
    `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${rx} ${ry})">
      ${fillPath(shape, dye)}
      ${fillPath('M-.70 .13 Q-.57 -.64 -.15 -.55 Q.19 -.40 .04 .10 Q-.17 .47 -.56 .43Z', '#9269A6', .24)}
      ${cellDot(.31, .15, .26, .39, '#241040', -22, .38)}
    </g>`).join('');
}

function vascularPaint(boundary, transform, r, lobes, squeeze, seed) {
  const rand = mulberry32(seed + 22);
  const granules = [];
  for (let i = 0; i < 66; i++) {
    const side = rand() < .54 ? -1 : 1;
    const a = rand() * 2 * Math.PI;
    const radius = Math.sqrt(rand());
    const gx = Math.cos(a) * radius * lerp(.89, .65, squeeze);
    const gy = Math.sin(a) * radius * lerp(.79, .50, squeeze) + side * .89 * squeeze;
    granules.push(cellDot(gx, gy, .013 + rand() * .018, .012 + rand() * .014,
      i % 3 ? '#BD79AB' : '#CFA3C5', 0, .2 + rand() * .35));
  }
  return {
    boundary,
    transform,
    body: `<path d="${boundary}" transform="${transform}" fill="rgba(235, 214, 240, 0.85)"/>`,
    detail: `<g transform="${transform}">
      ${granules.join('')}
      ${chromatin(lobes, VASCULAR_NUCLEUS, .9 / r, squeeze)}
    </g>`,
    edge: `<g transform="${transform}">${strokePath(boundary, '#8D5985', 1.15 / r, .61)}</g>`,
  };
}

export function vascularNeutrophil({ x, y, r, lobes: count, angle, crossing = false }, seed) {
  const boundary = crossing ? crossingOutline : pseudopods(seed);
  const transform = `translate(${x} ${y}) rotate(${angle}) scale(${r})`;
  return vascularPaint(boundary, transform, r, nucleus(count, seed + 9, crossing), Number(crossing), seed);
}

export function createDiapedesisCell({ radius, lobes, seed }) {
  const body = morphShape(pseudopods(seed), crossingOutline, .067);
  const roundNucleus = nucleus(lobes, seed + 9, false);
  const crossingNucleus = nucleus(lobes, seed + 9, true);
  return (squeeze) => {
    const nuclearPose = roundNucleus.map((lobe, i) => ({
      ...lobe, x: lerp(lobe.x, crossingNucleus[i].x, squeeze),
      y: lerp(lobe.y, crossingNucleus[i].y, squeeze),
    }));
    return vascularPaint(body(squeeze), `scale(${radius})`, radius, nuclearPose, squeeze, seed);
  };
}

export function stainedNeutrophil(x, y, count, seed, angle, { diameter = 12, outline = true } = {}) {
  const r = diameter / 2;
  const body = organic(0, 0, 1.02, .95, seed + 23, .24, 0, 14);
  const cytoplasm = outline ? fillPath(body, '#E4AFD0', .33) + strokePath(body, '#C473A8', .043, .21)
    : cellDot(0, 0, 1, 1, '#E4AFD0', 0, .24);
  return `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${r})">
    ${cytoplasm}
    ${chromatin(nucleus(count, seed, false), HEMATOXYLIN, .45 / r)}
  </g>`;
}
