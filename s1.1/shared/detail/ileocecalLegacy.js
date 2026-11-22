import {
  cellDot, clamp, closedCurve, fillPath, ink, inkLines, inkOutline, lerp, mulberry32, organic,
  pigment, svgId, washLayer,
} from '../canvasCore.js';

const stages = Object.freeze({
  normal:   { diameter: 34, base: '#F7D5C8', dye: '#C67569' },
  simple:   { diameter: 47, base: '#DD8C7F', dye: '#AC3F42' },
  phlegmon: { diameter: 68, base: '#CD796F', dye: '#A94B41' },
  gangrene: { diameter: 78, base: '#A44849', dye: '#6B2935' },
  chronic:  { diameter: 51, base: '#DBBEB3', dye: '#A67E73' },
});

// Anterior projection. The root is 38 drawing units below the valve, behind the cecal lip.
const valve = { x: 173, y: 224 };
const root = { x: 151, y: 262 };
const bendA = { x: 181, y: 337 };
const bendB = { x: 291, y: 383 };
const tip = { x: 397, y: 426 };
const thrombus = { x: 272, y: 296 };
const cecalWidth = 180;
const cecum = `M14 1 C11 23 21 34 12 51 C-2 70 1 92 13 107 C22 120 20 130 10 143
  C-2 158 0 182 12 196 C23 209 21 219 13 232 C1 247 3 272 10 289
  C22 322 50 340 90 340 C131 340 157 323 172 302 C184 286 186 264 177 243
  C172 232 173 221 180 207 C188 189 187 169 176 153 C168 142 168 130 176 116
  C189 97 189 76 178 57 C168 40 176 23 174 1Z`;
const ileum = `M421 164 C384 167 345 169 309 177 C269 185 236 198 207 204
  C191 208 183 212 169 213 C161 215 162 231 171 235 C183 232 194 235 208 235
  C239 234 277 224 320 220 C358 216 391 215 421 218 C427 212 430 197 429 188 C428 174 425 166 421 164Z`;
const meso = `M194 220 C213 216 237 220 253 234 C279 256 311 303 365 397
  C338 375 302 365 268 352 C240 340 218 325 199 305 C204 275 196 250 194 220Z`;
const vein = 'M221 219 C230 242 242 263 253 275 C260 285 266 290 272 296 C296 320 316 341 336 369';
const artery = 'M235 228 C248 251 276 283 292 307 C309 331 336 361 349 379';

function axis(u) {
  const v = 1 - u;
  const at = (a, b, c, d) => v ** 3 * a + 3 * v ** 2 * u * b + 3 * v * u ** 2 * c + u ** 3 * d;
  const derivative = (a, b, c, d) => v ** 2 * (b - a) + 2 * v * u * (c - b) + u ** 2 * (d - c);
  return {
    x: at(root.x, bendA.x, bendB.x, tip.x),
    y: at(root.y, bendA.y, bendB.y, tip.y),
    angle: Math.atan2(derivative(root.y, bendA.y, bendB.y, tip.y), derivative(root.x, bendA.x, bendB.x, tip.x)),
  };
}

function radius(u, diameter) {
  const capLength = Math.min(0.14, diameter * 0.44 / 315);
  const cap = clamp((u - 1 + capLength) / capLength);
  return diameter * .5 * (.83 + .17 * Math.sin(Math.PI * u)) * Math.sqrt(1 - cap ** 2);
}

function ribbon(from, to, lo, hi, steps = 45) {
  const points = offset => Array.from({ length: steps + 1 }, (_, i) => {
    const u = lerp(from, to, i / steps);
    const { x, y, angle } = axis(u);
    const r = offset(u, i / steps);
    return [x - r * Math.sin(angle), y + r * Math.cos(angle)];
  });
  return closedCurve([...points(lo), ...points(hi).reverse()]);
}

function appendixOutline(diameter) {
  return ribbon(0, 1, u => -radius(u, diameter), u => radius(u, diameter));
}

function cutPaths(diameter, opening, fibrosis) {
  const from = .56 - .21 * opening;
  const to = .56 + .23 * opening;
  const lip = (u, t) => radius(u, diameter) * Math.sin(Math.PI * t) ** .70 * opening * .78;
  const lumen = (u, t) => lip(u, t) * lerp(.62, .27, fibrosis);
  return {
    lip: ribbon(from, to, (u, t) => -lip(u, t), lip, 30),
    lumen: ribbon(from, to, (u, t) => -lumen(u, t), lumen, 30),
  };
}

const cutCenter = axis(.56);
const arcLength = Array.from({ length: 101 }, (_, i) => axis(i / 100)).reduce((sum, point, i, points) =>
  i ? sum + Math.hypot(point.x - points[i - 1].x, point.y - points[i - 1].y) : 0, 0);
export const APPENDIX_TO_CECUM = arcLength / cecalWidth;
export {
  appendixOutline, axis as appendixAxis, radius as appendixRadius, ribbon as appendixRibbon,
  cecalWidth as CECUM_WIDTH,
};

function junctionDrawing() {
  const folds = [69, 155, 241].map(y => [
    `M8 ${y + 12} Q41 ${y - 22} 83 ${y - 5} Q55 ${y + 27} 17 ${y + 34}Z`,
    `M106 ${y - 5} Q140 ${y - 26} 178 ${y + 10} Q148 ${y + 32} 108 ${y + 26}Z`,
  ]).flat();
  const taenia = 'M83 3 C89 56 80 105 82 157 C80 217 91 264 127 295 Q144 303 160 286 Q140 295 127 277 C102 244 98 196 100 155 Q98 79 100 3Z';
  const wash = washLayer(39871, () => {
    const soft = { bleed: .10, direction: 'in', texture: .78, border: .53 };
    pigment(cecum, '#C97D73', 119, soft);
    pigment('M11 7 C29 36 33 76 31 124 C27 183 17 239 30 289 C41 321 66 332 90 338 Q34 344 14 306 C-4 269 17 235 12 194 C3 157 23 148 13 108 Q-1 80 13 45Z', '#97544E', 67, soft);
    pigment('M152 22 C173 84 153 136 163 163 C179 194 157 214 164 234 C186 282 167 313 125 331 Q163 300 153 264 C143 219 156 203 148 166Z', '#A85C55', 70, soft);
    for (const fold of folds) pigment(fold, '#FFF1DA', 136, { bleed: .12, border: .35 });
    pigment(taenia, '#F9D8B7', 155, { ...soft, bleed: .15 });
    pigment(ileum, '#C58A7F', 103, soft);
    pigment('M173 219 C238 212 318 182 425 174 L427 190 C365 187 288 203 227 219 Q200 227 172 229Z', '#F7D9C6', 145, soft);
  }, 'multiply', [0, 0, 442, 355]);
  return fillPath(cecum, '#F5C8B9') + fillPath(taenia, '#F8D6BC', .70) + fillPath(ileum, '#F2C4B6') + wash
    + inkLines([cecum, ileum], { size: 2.9, color: '#794D47', opacity: .85, taperStart: 2, taperEnd: 3 })
    + inkLines([taenia, 'M91 13 C94 69 86 116 90 179 C91 213 98 250 111 272',
      'M183 210 C172 211 167 223 176 234', 'M168 212 C158 215 159 232 168 237',
      'M191 225 C239 222 256 206 306 198 Q357 189 403 186',
      'M401 171 Q411 190 404 214', 'M415 169 Q424 189 419 215',
    ], { size: 2.1, color: '#A56560', opacity: .77 })
    + inkLines(folds.map(path => path.slice(0, -1)), { size: 1.55, color: '#C08D79', opacity: .74 });
}

function mesoDrawing() {
  const wash = washLayer(76328, () => {
    pigment(meso, '#BBA06B', 96, { bleed: .118, border: .55, texture: .84 });
    pigment('M199 225 C240 228 269 274 286 310 Q316 347 349 375 C312 351 270 351 229 328 Q207 293 199 225Z',
      '#C5A16A', 66, { bleed: .14, direction: 'in', border: .5 });
  }, 'multiply', [181, 208, 203, 203]);
  return fillPath(meso, '#E9D7A8', .68) + wash + ink(meso, { color: '#A4885D', size: 2.1, opacity: .73 })
    + inkLines(['M210 225 Q230 244 245 282 Q263 310 292 342', 'M218 224 C229 248 254 279 273 315 Q298 349 338 378',
      'M226 228 Q260 277 316 350'], { color: '#A08A5F', size: 1.6, opacity: .56 })
    + ink(vein, { color: '#556889', size: 9.8, taperStart: 2, taperEnd: 7 })
    + ink(vein, { color: '#93A4B2', size: 4.4, taperStart: 3, taperEnd: 8 })
    + inkLines(['M250 272 Q244 291 236 313', 'M271 295 Q266 314 261 337',
      'M292 318 Q286 337 291 351', 'M315 343 Q313 360 314 369'], { color: '#5D7591', size: 3.1 })
    + ink(artery, { color: '#AD5C4D', size: 6, taperStart: 1, taperEnd: 5 })
    + ink(artery, { color: '#D58367', size: 2.5, taperStart: 1, taperEnd: 6 })
    + inkLines(['M254 257 Q254 277 243 304', 'M267 274 Q267 300 256 321', 'M282 293 Q281 319 274 338',
      'M297 314 Q298 335 293 349', 'M312 335 Q316 351 315 360'], { color: '#B75E53', size: 2.25 });
}

function tubeWatercolor(key) {
  const { dye } = stages[key];
  const cover = u => radius(u, 88);
  const rand = mulberry32(618);
  return washLayer(48551, () => {
    pigment(appendixOutline(92), dye, 106, { bleed: .13, direction: 'in', texture: .84, border: .57 });
    pigment(ribbon(.03, .993, u => -.92 * cover(u), u => -.11 * cover(u)),
      key === 'chronic' ? '#FFF0D6' : '#F1AD93', 121, { bleed: .12, border: .42 });
    if (key === 'phlegmon' || key === 'gangrene') {
      pigment(ribbon(.17, .997, u => (-.83 + .19 * Math.sin(45 * u)) * cover(u), u => (.53 + .18 * Math.sin(54 * u)) * cover(u)),
        '#B69B59', 187, { bleed: .18, texture: .94, border: .72, split: .31 });
      for (let i = 0; i < 14; i++) {
        const p = axis(.18 + i * .053);
        pigment(organic(p.x + (rand() - .5) * 25, p.y - 4 + (rand() - .5) * 26, 7 + rand() * 17,
          3 + rand() * 10, 301 + 11 * i, .27, p.angle), '#DBC482', 102, { bleed: .20, border: .51 });
      }
    }
    if (key === 'gangrene') {
      const necrosis = (u, t) => cover(u) * clamp(t * 4) * (.95 + .11 * Math.sin(u * 94));
      pigment(ribbon(.43, 1, (u, t) => -necrosis(u, t), necrosis), '#251C24', 250,
        { bleed: .12, direction: 'in', texture: .89, border: .78, split: .22 });
      pigment(ribbon(.59, .999, u => -.68 * cover(u), u => .65 * cover(u)), '#161318', 188,
        { bleed: .10, texture: .92, border: .70 });
    }
    if (key === 'chronic') {
      for (const side of [-.39, .23, .51]) {
        pigment(ribbon(.22, .93, u => (side - .09) * cover(u), u => (side + .08) * cover(u)), '#E6CBA5', 132,
          { bleed: .17, texture: .67, border: .41 });
      }
    }
  }, 'multiply', [106, 238, 348, 233]);
}

let junction;
let mesentery;
let tubeWashes;
let lumenWash;

function mixColor(a, b, amount) {
  const first = Number.parseInt(a.slice(1), 16);
  const last = Number.parseInt(b.slice(1), 16);
  const channels = [16, 8, 0].map(shift => Math.round(lerp(first >> shift & 255, last >> shift & 255, amount)));
  return `rgb(${channels.join(',')})`;
}

function state({ x = 0, y = 0, scale = 1, stage = 'normal', fromStage = stage, stageProgress = 1,
  cutaway = 0, showThrombus, fecalith = true, diameterRatio } = {}) {
  if (!Object.hasOwn(stages, stage) || !Object.hasOwn(stages, fromStage)) throw new RangeError('Invalid appendiceal stage');
  if (![x, y, scale, stageProgress, Number(cutaway)].every(Number.isFinite) || scale <= 0) {
    throw new RangeError('Invalid ileocecal drawing parameters');
  }
  const progress = clamp(stageProgress);
  const weight = key => (fromStage === key ? 1 - progress : 0) + (stage === key ? progress : 0);
  const diameter = diameterRatio === undefined ? lerp(stages[fromStage].diameter, stages[stage].diameter, progress)
    : stages.normal.diameter * diameterRatio;
  if (!Number.isFinite(diameter) || diameter <= 0) throw new RangeError('Invalid appendiceal diameter');
  const opening = clamp(Number(cutaway));
  const clotOpacity = showThrombus === undefined ? weight('gangrene') : clamp(Number(showThrombus));
  if (!Number.isFinite(clotOpacity)) throw new RangeError('Invalid thrombus visibility');
  const fibrosis = weight('chronic');
  const body = appendixOutline(diameter);
  const paths = cutPaths(diameter, opening, fibrosis);
  const active = weight('simple') + weight('phlegmon') + weight('gangrene');
  return {
    transform: `translate(${x} ${y}) scale(${scale})`,
    body, ink: inkOutline(body, { size: 2.95, seed: 772, taperStart: 3, taperEnd: 4 }),
    color: mixColor(stages[fromStage].base, stages[stage].base, progress),
    washes: Object.keys(stages).map(weight), clotOpacity, active, opening,
    lip: paths.lip, lumen: paths.lumen, fibrosis,
    stone: fecalith ? clamp((opening - .25) / .35) * (1 - fibrosis) : 0,
    anchors: {
      cecum: { x: x + 70 * scale, y: y + 278 * scale },
      ileum: { x: x + 354 * scale, y: y + 194 * scale },
      valve: { x: x + valve.x * scale, y: y + valve.y * scale },
      appendixBase: { x: x + root.x * scale, y: y + root.y * scale },
      appendixTip: { x: x + tip.x * scale, y: y + tip.y * scale },
      window: { x: x + cutCenter.x * scale, y: y + cutCenter.y * scale },
      diameter: diameter * scale,
      thrombusX: x + thrombus.x * scale, thrombusY: y + thrombus.y * scale,
      appendixPoint(u, offset = 0) {
        const point = axis(u);
        const r = radius(u, diameter) * offset;
        return { x: x + (point.x - r * Math.sin(point.angle)) * scale,
          y: y + (point.y + r * Math.cos(point.angle)) * scale, angle: point.angle };
      },
    },
  };
}

/** Mount the SVG once. A scene can supply an appendix layer in the same local coordinates. */
export function createIleocecal({ id, appendixLayer, appendixOverlay = '', fadeAscending = false, ...initial } = {}) {
  id = svgId('ileocecal', id);
  const art = state(initial);
  junction ??= junctionDrawing();
  mesentery ??= mesoDrawing();
  const junctionPaint = fadeAscending ? `<defs>
    <linearGradient id="${id}-ascending-wash" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="75">
      <stop offset="0" stop-color="white" stop-opacity="0"/>
      <stop offset=".57" stop-color="white" stop-opacity=".55"/>
      <stop offset="1" stop-color="white"/>
    </linearGradient>
    <mask id="${id}-ascending" maskUnits="userSpaceOnUse" mask-type="alpha" x="-24" y="-15" width="490" height="418">
      <rect x="-24" y="-15" width="490" height="418" fill="url(#${id}-ascending-wash)"/>
    </mask>
  </defs><g mask="url(#${id}-ascending)">${junction}</g>` : junction;
  if (appendixLayer !== undefined) {
    return {
      paint: `<g id="${id}" transform="${art.transform}">${mesentery}${appendixLayer}${junctionPaint}</g>`,
      ...art.anchors,
      update(svg, options = {}) {
        const next = state({ ...initial, ...options });
        svg.querySelector(`#${id}`).setAttribute('transform', next.transform);
        return next.anchors;
      },
    };
  }
  tubeWashes ??= Object.keys(stages).map(tubeWatercolor);
  lumenWash ??= washLayer(26121, () => {
    pigment(ribbon(.32, .81, u => -.7 * radius(u, 78), u => .7 * radius(u, 78)), '#C59543', 155,
      { bleed: .1, direction: 'in', texture: .93, border: .66 });
    pigment(organic(cutCenter.x + 23, cutCenter.y + 11, 39, 10.5, 3811, .34, .53), '#F2DA84', 180, { bleed: .16 });
  }, 'multiply', [200, 304, 160, 103]);
  const veinClot = organic(0, 0, 10.5, 3.25, 207, .20, 0, 13);
  const stone = 'M-9 -2 L-5 -6 L2 -7 L8 -4 L10 1 L6 5 L-1 6 L-7 4Z';
  const mesh = `<defs><clipPath id="${id}-tube"><path id="${id}-tube-clip" d="${art.body}"/></clipPath>
    <clipPath id="${id}-lumen"><path id="${id}-lumen-clip" d="${art.lumen}"/></clipPath></defs>`;
  const paint = `<g id="${id}" transform="${art.transform}">${mesh}${mesentery}
    <g id="${id}-clot" transform="translate(${thrombus.x} ${thrombus.y}) rotate(45)" opacity="${art.clotOpacity}">
      ${fillPath(veinClot, '#54283F')}${ink('M-7 -1 Q-2 -2.8 6 -1.2', { color: '#A8667F', size: 1.5 })}
    </g>
    <path id="${id}-body" d="${art.body}" fill="${art.color}"/>
    <g clip-path="url(#${id}-tube)">
      ${tubeWashes.map((wash, i) => `<g id="${id}-wash-${i}" opacity="${art.washes[i]}">${wash}</g>`).join('')}
      <g id="${id}-hyperemia" opacity="${art.active * .62}">${inkLines(['M186 320 Q218 372 287 387 Q330 397 358 421',
        'M212 355 Q218 343 231 339', 'M247 375 Q251 365 262 361', 'M286 388 Q299 377 309 377',
        'M314 393 Q322 407 329 405'], { color: '#813740', size: 2.5 })}</g>
      ${appendixOverlay}
    </g>
    <path id="${id}-outline" fill="#794743" fill-opacity=".87" d="${art.ink}"/>
    <g id="${id}-opening" opacity="${art.opening}">
      <path id="${id}-lip" d="${art.lip}" fill="#E7AA93" stroke="#9A514D" stroke-width="1.65"/>
      <path id="${id}-lumen-shape" d="${art.lumen}" fill="${mixColor('#D0A35B', '#997871', art.fibrosis)}" stroke="#976748" stroke-width="1.2"/>
      <g clip-path="url(#${id}-lumen)">
        <g id="${id}-pus" opacity="${1 - art.fibrosis}">${lumenWash}</g>
        <g id="${id}-stone" transform="translate(${cutCenter.x} ${cutCenter.y}) rotate(${cutCenter.angle * 180 / Math.PI})" opacity="${art.stone}">
          ${fillPath(stone, '#73583A')}${fillPath('M-6 -2 L-3 -5 L4 -4 L6 -2 L-1 0Z', '#BE9A65', .82)}
          ${ink(stone, { color: '#5D4938', size: 1.5, taperStart: 1, taperEnd: 1 })}
        </g>
      </g>
    </g>
    ${junctionPaint}
  </g>`;
  return {
    paint, ...art.anchors, arterialPath: artery,
    update(svg, options = {}) {
      const next = state({ ...initial, ...options });
      const set = (name, attribute, value) => svg.querySelector(`#${id}${name ? `-${name}` : ''}`).setAttribute(attribute, value);
      set('', 'transform', next.transform);
      set('body', 'd', next.body);
      set('body', 'fill', next.color);
      set('tube-clip', 'd', next.body);
      set('outline', 'd', next.ink);
      set('clot', 'opacity', next.clotOpacity);
      set('hyperemia', 'opacity', next.active * .62);
      set('opening', 'opacity', next.opening);
      set('lip', 'd', next.lip);
      set('lumen-shape', 'd', next.lumen);
      set('lumen-shape', 'fill', mixColor('#D0A35B', '#997871', next.fibrosis));
      set('lumen-clip', 'd', next.lumen);
      set('pus', 'opacity', 1 - next.fibrosis);
      set('stone', 'opacity', next.stone);
      next.washes.forEach((opacity, i) => set(`wash-${i}`, 'opacity', opacity));
      return next.anchors;
    },
  };
}
