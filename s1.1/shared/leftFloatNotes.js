import {
  HEIGHT, WIDTH, arrow, cellDot, ease, fillPath, ink, inkLines, organic, pigment, roughProp, svgId, washLayer,
} from './canvasCore.js';

const left = 65;
const width = 245;
const dotScale = .89;
const localLeft = 76;
const leftScale = `translate(${left} 0) scale(${dotScale} 1) translate(${-localLeft} 0)`;
const column = (content, transform = '') => `<svg x="${left}" width="${width}" height="${HEIGHT}"
  viewBox="${left} 0 ${width} ${HEIGHT}" overflow="hidden"><g transform="${transform}">${content}</g></svg>`;

const windowShape = 'M104 204 L311 210 L309 418 L105 410Z';
const darkSky = 'M108 205 L307 212 L305 410 C285 410 275 381 262 366 C216 331 179 347 108 323Z';
const moon = 'M253 233 C234 243 236 276 263 281 C274 283 281 279 287 273 C281 299 241 303 227 275 C218 257 230 235 253 233Z';
const swatches = [
  [111, '#DA8D88', 111, '粉白', 'normal'],
  [180, '#852E2F', 229, '暗红', 'simple'],
  [248, '#B39A5B', 163, '灰黄', 'phlegmon'],
  [317, '#1C1719', 230, '焦黑', 'gangrene'],
];
export const STAGE_DOT_CENTERS = Object.freeze(swatches.map(([x]) => left + dotScale * (x - localLeft)));
const stages = [
  { y: 319, key: 'simple', label: '单纯性', wash: '#CE7E83', strength: 172 },
  { y: 444, key: 'phlegmon', label: '化脓性', wash: '#BA954A', strength: 158 },
  { y: 569, key: 'gangrene', label: '坏疽性', wash: '#1C1719', strength: 156 },
];

function nightWatercolor() {
  pigment(windowShape, '#8E828B', 91, { bleed: 0.09, direction: 'in', texture: 0.42 });
  pigment(darkSky, '#605C78', 91, { bleed: 0.065, direction: 'in', border: 0.23 });
  pigment(moon, '#DAAC49', 231, { bleed: 0.095, border: 0.62 });
}

function dayWatercolor() {
  pigment(windowShape, '#A5BFC2', 87, { bleed: .09, direction: 'in', texture: .42 });
  pigment(darkSky, '#A7A77A', 57, { bleed: .08, direction: 'in', border: .24 });
  pigment(organic(253, 264, 24, 24, 115, .09), '#E8AD43', 192, { bleed: .13, border: .54 });
  pigment(organic(154, 274, 28, 6, 130, .31), '#FFF7E5', 129, { bleed: .14, border: .32 });
}

function windowDetails() {
  const frame = roughProp('polygon', [[[100, 199], [314, 207], [311, 421], [102, 413]]], 71, '#706458', 2.8)
    + roughProp('polygon', [[[109, 211], [304, 217], [303, 408], [111, 402]]], 82, '#837362', 1.3)
    + inkLines(['M102 333 Q199 332 309 339', 'M177 204 Q179 309 174 417',
      'M81 423 C151 427 244 429 331 431', 'M86 429 Q158 436 213 434'], { color: '#594F46', size: 3.5 });
  const hills = inkLines(['M113 385 Q131 363 150 368 Q166 363 174 358', 'M180 358 Q212 340 239 365 Q272 397 302 377',
    'M112 394 Q146 387 169 390', 'M180 393 Q215 376 236 390 Q271 411 303 395'],
  { color: '#756778', size: 1.8, opacity: 0.53 });
  return hills + frame;
}

function stars() {
  return cellDot(212, 240, 1.9, 2.1, '#F8EBD5') + cellDot(133, 272, 2.1, 1.7, '#F8EBD5')
    + inkLines(['M140 254 q0 8 -1 12', 'M135 260 l9 0'], { color: '#FCEDCE', size: 1.3, taperStart: 0, taperEnd: 0 });
}

let skies;
export function createStoryWindow({ id, phase = 0, y = 199 } = {}) {
  id = svgId('window', id);
  skies ??= [dayWatercolor, nightWatercolor].map((draw, i) => washLayer(3121 + i, draw, 'multiply', [78, 190, 258, 254]));
  const mix = ease(phase);
  const paint = column(`<g transform="translate(0 ${y - 199})">
    <g id="${id}-day" opacity="${1 - mix}">${skies[0]}</g>
    <g id="${id}-night" opacity="${mix}">${skies[1]}${stars()}</g>
    ${windowDetails()}</g>`, leftScale);
  return {
    paint,
    update(root, dayToNight) {
      const opacity = ease(dayToNight);
      root.querySelector(`#${id}-day`).setAttribute('opacity', 1 - opacity);
      root.querySelector(`#${id}-night`).setAttribute('opacity', opacity);
    },
  };
}

function clockInk(hour, minute) {
  const hands = hour === 18 && minute === 0
    ? ['M134 502 Q135 515 135 532', 'M135 532 Q134 541 136 552']
    : [[minute / 60, 29], [((hour % 12) + minute / 60) / 12, 20]].map(([fraction, radius]) => {
      const angle = fraction * 2 * Math.PI;
      return `M135 532 Q${135 + Math.sin(angle) * radius * .5 + .5} ${532 - Math.cos(angle) * radius * .5}
        ${135 + Math.sin(angle) * radius} ${532 - Math.cos(angle) * radius}`;
    });
  let clock = roughProp('ellipse', [135, 532, 82, 84], 331, '#605249', 2.8)
    + inkLines(hands, { size: 4, color: '#4A3C33', taperStart: 3, taperEnd: 3 });
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    const sx = Math.sin(a);
    const sy = Math.cos(a);
    clock += ink(`M${135 + sx * 33} ${532 + sy * 33} L${135 + sx * 37} ${532 + sy * 37}`,
      { size: i % 3 ? 1.65 : 2.7, color: '#857363', taperStart: 0, taperEnd: 0 });
  }
  return clock + cellDot(135, 532, 2.25, 2.25, '#584437');
}

const clockLabel = (hour, minute) => `<text class="numeral" x="188" y="546" font-size="39">${
  [hour, minute].map(value => String(value).padStart(2, '0')).join(':')}</text>`;

export function drawStoryClock({ hour = 18, minute = 0, y = 532, label = true } = {}) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new RangeError('Invalid clock time');
  }
  const translate = `translate(0 ${y - 532}) ${leftScale}`;
  return { paint: column(clockInk(hour, minute), translate), lettering: label ? column(clockLabel(hour, minute), translate) : '' };
}

function dotUnderpaint() {
  return swatches.map(([x, color], i) => fillPath(organic(x, 647, 16, 15, x + 34, .2), color, i % 2 ? .36 : .14)).join('');
}

function dotWatercolor() {
  for (const [x, color, opacity] of swatches) {
    pigment(organic(x, 647, 19, 19, x, 0.16), color, opacity, { bleed: 0.22, border: 0.76 });
  }
}

function dotUnderline(stage) {
  const swatch = swatches.find(([, , , , key]) => key === stage);
  if (!swatch) return '';
  const x = swatch[0];
  return ink(`M${x - 23} 675 C${x - 8} 671 ${x + 9} 671 ${x + 21} 674`,
    { size: 2.7, color: '#94362F', opacity: 0.75 });
}

const dotLabels = () => swatches.map(([x, , , label]) => `<text class="note" x="${x}" y="708" font-size="29"
  text-anchor="middle" fill="#2E2924" style="font-weight:730">${label}</text>`).join('');
const chronicLabel = y => `<text class="note" x="82" y="${y}" font-size="24" fill="#706159">慢性转化 · 增生登场</text>`;

function paleDots(content) {
  return `<g opacity=".55" style="filter:grayscale(.87)">${content}</g>`;
}

let dots;
let neutralDots;
const coloredDots = () => dots ??= dotUnderpaint() + washLayer(5568, dotWatercolor, 'multiply', [87, 620, 254, 53]);

function grayDots() {
  return neutralDots ??= washLayer(5568, () => {
    for (const [x] of swatches) {
      pigment(organic(x, 647, 19, 19, x, .16), '#A2A2A2', 138, { bleed: .22, border: .66 });
    }
  }, 'normal', [87, 620, 254, 53]);
}

export function drawStageDots({ stage = 'normal', mode = 'acute', y = 647, showStatus = true } = {}) {
  const transform = `translate(0 ${y - 647}) ${leftScale}`;
  const chronic = mode === 'chronic';
  return {
    paint: column(chronic ? grayDots() : coloredDots() + dotUnderline(stage), transform),
    lettering: column(chronic ? paleDots(dotLabels()) + (showStatus ? chronicLabel(750) : '') : dotLabels(), transform),
  };
}

/** Replay the original watercolor swatches one by one along the left margin. */
export function createStageRecap({ id, y = 647 } = {}) {
  id = svgId('stage-recap', id);
  const transform = `translate(0 ${y - 647}) ${leftScale}`;
  const defs = `<g id="${id}-pigment">${coloredDots()}</g>` + swatches.map(([x], i) =>
    `<clipPath id="${id}-clip-${i}"><rect x="${x - 30}" y="616" width="60" height="61"/></clipPath>`).join('');
  const marks = swatches.map((_, i) => `<g id="${id}-mark-${i}" clip-path="url(#${id}-clip-${i})">
    <use href="#${id}-pigment"/></g>`).join('');
  return {
    paint: column(`<defs>${defs}</defs>${marks}`, transform),
    lettering: column(dotLabels(), transform),
    update(art, p) {
      for (const [i] of swatches.entries()) {
        const phase = p - (.06 + i * .18);
        const pulse = ease(phase / .12) * (1 - ease((phase - .15) / .21));
        const tint = .31 + .25 * ease(phase / .23) + .43 * pulse;
        art.querySelector(`#${id}-mark-${i}`).setAttribute('opacity', tint);
      }
    },
  };
}

export function drawStageSwatch({ stage, y = 319 } = {}) {
  const swatch = swatches.find(([, , , , key]) => key === stage);
  if (!swatch || !Number.isFinite(y)) throw new RangeError('Invalid stage swatch');
  const [seed, color, opacity, label] = swatch;
  const mark = organic(104, y, 25, 24, seed, .20);
  return {
    paint: column(fillPath(mark, color, .24) + washLayer(seed, () => {
      pigment(mark, color, opacity, { bleed: .22, border: .76 });
    }, 'multiply', [64, Math.floor(y - 40), 80, 80])),
    lettering: column(`<text class="note title" x="150" y="${y + 13}" font-size="42" fill="#1F1C19">${label}</text>
      ${ink(`M151 ${y + 26} Q181 ${y + 22} 230 ${y + 26}`, { color: '#AD4C42', size: 3.8, taperEnd: 10 })}`),
  };
}

export function paintPathologyProgress() {
  for (const { y, wash, strength } of stages) {
    pigment(organic(104, y, 25, 24, y * 8, .22, .31), wash, strength, { bleed: .222, border: .79, texture: .87 });
  }
}

let progressWash;
export function drawPathologyProgress({ id, stage = 'simple', mode = 'acute', y = 319, wash } = {}) {
  id = svgId('progress', id);
  if (!wash) {
    progressWash ??= washLayer(7361, paintPathologyProgress, 'multiply', [63, 264, 72, 351]);
    wash = progressWash;
  }
  const transform = `translate(0 ${y - 319})`;
  const chronic = mode === 'chronic';
  const tint = `<defs><clipPath id="${id}-tints"><rect x="63" y="264" width="72" height="351"/></clipPath></defs>
    <g clip-path="url(#${id}-tints)">${fillPath(organic(104, 569, 21, 21, 153, .23), '#1C1719', .33)}
    <g style="mix-blend-mode:multiply">${wash}</g></g>`;
  const labels = stages.map(({ y, key, label }) => `<text class="note" x="150" y="${y + 13}"
    fill="${key === stage && !chronic ? '#94352F' : '#55463B'}" font-weight="${key === stage ? 800 : 580}" font-size="42">${label}</text>`).join('');
  const marks = arrow('M104 359 Q101 385 104 398', { size: 3.4, color: '#886C56', head: 13 })
    + arrow('M104 486 Q101 510 104 522', { size: 3.4, color: '#886C56', head: 13 });
  const active = stages.find(item => item.key === stage);
  const line = active ? `<g transform="translate(0 ${active.y - 319})">${
    ink('M151 346 Q208 344 270 346', { color: '#AD4C42', size: 3.8, taperEnd: 10 })}</g>` : '';
  return {
    paint: column(chronic ? paleDots(tint) : tint, transform),
    lettering: column(chronic ? paleDots(labels + marks) + chronicLabel(662)
      : labels + marks + line + '<text class="note" x="74" y="663" font-size="35" fill="#2E2924" style="font-weight:730">非每个患者<tspan x="74" dy="43">必经固定流程</tspan></text>', transform),
  };
}

// Retain the original watercolor pass and compositing order of the approved evening plate.
export function createEveningNotesWithProps(paintProps) {
  const wash = washLayer(3121, () => {
    nightWatercolor();
    paintProps();
    dotWatercolor();
  }, 'multiply');
  return {
    paint: `<svg x="350" width="${WIDTH - 350}" height="${HEIGHT}" viewBox="350 0 ${WIDTH - 350} ${HEIGHT}" overflow="hidden">${wash}</svg>`
      + column(dotUnderpaint() + wash + windowDetails() + clockInk(18, 0) + stars() + dotUnderline('simple'), leftScale),
    lettering: column(clockLabel(18, 0) + dotLabels(), leftScale),
  };
}
