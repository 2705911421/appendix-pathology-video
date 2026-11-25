import {
  HEIGHT, WIDTH, cellDot, clamp, drawRaster, drawRasterCrop, fillPath, ink, lerp, logicalContext, mulberry32, organic, round, strokePath,
} from '../../shared/canvasCore.js';
import {
  ERYTHROCYTE, columnarCell, createDiapedesisCell, endothelialCell,
} from '../../shared/charactersAndHistology.js';
import { displayDensity } from '../../shared/renderProfile.js';
import { canvasSlot, createSurface, graphite, mountSurface, paintSurface, wash } from './brush.mjs';
import { band, edgePath, group, ramp, selectIds } from './geometry.mjs';
import { inkTrail } from './ink-trail.mjs';
import { CHROMATIN_WIDTH, CYTOPLASM_ALPHA, stainNuclei, vascularCellMarkup } from './vascular-cells.mjs';

const woundX = 920;
const junctions = [1040, 1230];
const redCellCount = 28;
const flowWidth = 2040;
const flowMargin = 60;
const initialVelocity = 85;
const dilationStart = .18;
const dilationEnd = .43;
const debrisNuclei = 22;
const apical = x => 277 + 12 * Math.sin((x - 248) / 190) + 6 * Math.cos((x + 35) / 104);
const height = x => 76 + 6 * Math.sin(x / 94) + 3 * Math.cos(x / 53);
const basal = x => apical(x) + height(x);
const upper = x => 465 + 10 * (1 - Math.cos((x - 1040) / 215)) + 3.5 * (1 - Math.cos((x - 1040) / 103));
const lower = x => 725 - 11 * (1 - Math.cos((x - 668) / 228)) - 4 * (1 - Math.cos((x - 668) / 135));
const referenceX = junctions[0];
const vesselAxis = (upper(referenceX) + lower(referenceX)) / 2;
const restingScale = 1 - 24 / (lower(referenceX) - upper(referenceX));
const outerSerosa = x => 754 + 13 * Math.sin((x + 100) / 270) + 4 * Math.sin(x / 57);
const lumen = band(upper, lower);
const ulcerProgress = p => ramp(p, .18, .92);
const woundHalfWidth = damage => lerp(18, 93, damage);
const woundRise = 345 - apical(woundX);

function woundContour(x, damage) {
  const offset = x - woundX;
  const taper = Math.max(0, 1 - Math.abs(offset) / woundHalfWidth(damage)) ** .77;
  const ragged = Math.sin(offset * .21) * 6 + Math.sin(offset * .48) * 2.5;
  return apical(x) + damage * taper * (woundRise + ragged);
}

function tissueWashes() {
  return paintSurface(10470, () => {
    wash(band(x => apical(x) - 6, x => outerSerosa(x) + 10), '#E7A2A4', 65,
      { bleed: .24, texture: .82, border: .46 });
    wash(band(x => apical(x) - 2, x => basal(x) + 55), '#CE7891', 110,
      { bleed: .12, texture: .80, border: .64, split: .42 });
    wash(band(x => basal(x) + 22, x => basal(x) + 49 + 9 * Math.sin(x / 57)), '#D895A4', 57,
      { bleed: .18, texture: .88, border: .49 });
    wash(band(x => upper(x) - 40, x => lower(x) + 32), '#E99D8C', 96,
      { bleed: .25, texture: .97, border: .61, angle: 94 });
    wash(band(x => upper(x) + 52, x => outerSerosa(x) + 12), '#C97981', 45,
      { bleed: .25, texture: .84, border: .37 });
    wash(band(x => outerSerosa(x) - 6, x => outerSerosa(x) + 12), '#A55672', 50,
      { bleed: .23, texture: .7, border: .48 });
    graphite(band(x => basal(x) + 19, x => upper(x) + 27, 24, 1899), '#986572',
      { distance: 12, weight: .23 });
  });
}

function stroma() {
  const rand = mulberry32(6855);
  const texture = Array.from({ length: 660 }, (_, i) => {
    const x = rand() * WIDTH;
    const y = lerp(basal(x) + 8, upper(x) + 14, rand());
    const size = rand();
    const dot = cellDot(x, y, 1.1 + size * 4.1, .55 + rand() * 1.5,
      i % 5 ? '#AA627C' : '#73466F', rand() * 155, .17 + rand() * .39);
    if (i % 4) return dot;
    const l = 7 + rand() * 34;
    return dot + strokePath(`M${x} ${y} q${l * .44} ${-9 + rand() * 16} ${l} ${-6 + rand() * 12}`,
      i % 8 ? '#AF748B' : '#C58475', .62 + rand() * 1.1, .19 + rand() * .31);
  }).join('');
  return canvasSlot('wall-washes') + texture;
}

function epithelialCells() {
  const rand = mulberry32(3104);
  return Array.from({ length: 68 }, (_, i) => {
    const x = -18 + i * 29.2;
    const y = apical(x) + (rand() - .5) * 2.2;
    const angle = -Math.atan2(apical(x + 1) - apical(x - 1), 2) * 47 + (rand() - .5) * 4.5;
    const goblet = i % 7 === 2 || i % 7 === 5;
    const art = stainNuclei(columnarCell({
      width: 30 + rand() * .9, height: height(x), pale: i % 3, goblet, nucleusAngle: (rand() - .5) * 19,
    }));
    return { x, y, angle, art };
  });
}

function injury() {
  const rand = mulberry32(24511);
  const marks = (count, draw, spread, offset) => Array.from({ length: count }, (_, i) => {
    const x = (rand() - .5) * spread;
    const lift = offset + (rand() - .45) * (10 + (1 - Math.abs(x) / 92) * 13);
    return { x, lift, art: draw(i, rand) };
  });
  const fibers = marks(42, (_, random) => {
    const length = 4 + random() * 14;
    const a = (random() - .5) * 15;
    return strokePath(`M0 0 q${length * .32} ${a} ${length * .68} ${a * .53} t${length * .32} ${a * .11}`,
      'rgba(205, 118, 140, 0.48)', 1.2 + random() * 2.0);
  }, 164, -2);
  const nuclei = marks(debrisNuclei, (i, random) => {
    const rx = 1.2 + random();
    const ry = 1.2 + random() * .88;
    return i % 4 === 0 ? cellDot(0, 0, rx, ry, '#2B0F54', random() * 180)
      : fillPath(organic(0, 0, rx, ry, 291 + i * 17, .27, random(), 8), '#2B0F54', .93);
  }, 148, 4);
  const microbes = marks(15, (_, random) =>
    cellDot(0, 0, .77 + random() * .61, .51 + random() * .24, '#633357', random() * 165, .63), 134, -16);
  const detached = Array.from({ length: 11 }, (_, i) => {
    const x = (i - 5) * 13.6 + (rand() - .5) * 6;
    const shape = organic(0, 0, 3.5 + rand() * 5.3, 2 + rand() * 3.3, 442 + i * 29, .59, rand(), 10);
    return { x, lift: 0, detached: true, art: fillPath(shape, '#D67D96', .57) };
  });
  const eosinDebris = marks(27, (i, random) =>
    fillPath(organic(0, 0, 2 + random()*6, 1.1 + random()*2.5, 981+i*43, .48, random()*2.8, 9),
      i%4 ? '#DFA5AE' : '#CE7A91', .72), 146, 7);
  return [...eosinDebris, ...fibers, ...nuclei, ...microbes, ...detached];
}

function bloodWashes() {
  return paintSurface(7783, () => {
    wash(band(x => upper(x) - 19, x => lower(x) + 28), '#D75A51', 124,
      { bleed: .17, texture: .91, border: .69, split: .39 });
    wash(lumen, '#E98C87', 126, { bleed: .09, direction: 'in', texture: .77, border: .61 });
    wash(band(x => upper(x) + 21, x => lerp(upper(x), lower(x), .60)), '#FFB19E', 73,
      { bleed: .18, texture: .79, border: .37 });
    wash(band(x => lower(x) - 48, x => lower(x) + 4), '#C6404B', 58,
      { bleed: .13, texture: .94, border: .66 });
  });
}

function plasmaWashes() {
  const surface = createSurface();
  const ctx = logicalContext(surface);
  for (const [i, x] of junctions.entries()) {
    const y = upper(x);
    for (let layer = 0; layer < 4; layer++) {
      const bend = (i ? 1 : -1) * (13 + layer * 4);
      const rise = 45 + layer * 15;
      const mist = new Path2D(`M${x - 5} ${y + 4}
        C${x - 12} ${y - 20} ${x + bend - 19} ${y - 36} ${x + bend - 22} ${y - rise}
        Q${x + bend + 9} ${y - rise - 12} ${x + bend + 25} ${y - rise}
        C${x + bend + 9} ${y - 39} ${x + 9} ${y - 12} ${x + 6} ${y + 4}Z`);
      const pigment = ctx.createLinearGradient(x, y, x + bend, y - rise);
      pigment.addColorStop(0, 'rgba(209,153,80,.22)');
      pigment.addColorStop(.51, 'rgba(231,187,107,.17)');
      pigment.addColorStop(1, 'rgba(239,206,136,0)');
      ctx.fillStyle = pigment;
      ctx.fill(mist);
    }
  }
  return surface;
}

function erythrocytes() {
  const rand = mulberry32(12952);
  const cells = Array.from({ length: redCellCount }, (_, i) => ({
    x0: 17 + i * (flowWidth / redCellCount) + rand() * 25,
    level: (i % 3 === 1 ? .29 : i % 3 === 0 ? .76 : .54) + (rand() - .5) * .23,
    sx: 100 + (i % 8) * 228,
    sy: 98 + Math.floor(i / 8) * 145,
    a: 36 + rand() * 35,
    b: i % 4 === 0 ? 15 + rand() * 6 : 23 + rand() * 12,
    angle: (rand() - .5) * 1.1,
    seed: 112 + i * 179,
  }));
  const paintCell = ({ sx, sy, a, b, angle, seed }) => {
    wash(organic(sx, sy, a, b, seed, .1, angle), ERYTHROCYTE, 150,
      { bleed: .075, direction: 'in', texture: .64, border: .92, split: .29 });
    if (b >= 23) wash(organic(sx - 2, sy - 2, a * .50, b * .43, seed + 9, .2, angle),
      '#FFD5BA', 133, { bleed: .11, texture: .59, border: .38 });
  };
  const tiled = displayDensity() !== 1;
  const atlas = tiled ? createSurface() : paintSurface(877, () => cells.forEach(paintCell));
  const ctx = logicalContext(atlas);
  if (tiled) {
    // Paint each erythrocyte into its own compact native-resolution tile.
    for (const cell of cells) {
      const x = cell.sx - 98, y = cell.sy - 68;
      const tile = paintSurface(877 + cell.seed, () => paintCell(cell), [x, y, 196, 136]);
      drawRaster(ctx, tile, x, y);
    }
  }
  const silhouettes = new Path2D();
  for (const { sx, sy, a, b, angle, seed } of cells) {
    const rim = new Path2D(organic(sx, sy, a, b, seed, .1, angle));
    silhouettes.addPath(rim);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#E87F75';
    ctx.fill(rim);
    ctx.restore();
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);
    ctx.lineCap = 'round';
    const narrow = b < 23;
    ctx.lineWidth = narrow ? 3.6 : 2.8;
    ctx.strokeStyle = narrow ? '#F6AC95B5' : '#9C404B9C';
    ctx.stroke(new Path2D(narrow
      ? `M${-.82 * a} ${b * .11} C${-.54 * a} ${-b * .65} ${-.26 * a} ${b * .53} 0 ${b * .02}
        S${a * .58} ${-b * .49} ${a * .83} ${-b * .1}`
      : `M${-.5 * a} ${b * .07} Q${-.39 * a} ${-b * .75} ${a * .21} ${-b * .41}
        Q${a * .44} ${-b * .32} ${.47 * a} 0`));
    ctx.strokeStyle = '#AA30469F';
    ctx.lineWidth = 3.4;
    ctx.stroke(new Path2D(`M${-.60 * a} ${b * .45} Q0 ${b * .91} ${a * .61} ${b * .43}`));
    ctx.restore();
  }
  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fill(silhouettes);
  ctx.restore();
  return (canvas, travel, stasis) => {
    const draw = canvas.getContext('2d');
    draw.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
    draw.clearRect(0, 0, WIDTH, HEIGHT);
    for (const [i, { x0, level, sx, sy }] of cells.entries()) {
      const freeX = (x0 + travel) % flowWidth - flowMargin;
      const rhythm = 2 * Math.PI * (freeX - 1110) / flowWidth;
      const compression = stasis * 62 * Math.sin(rhythm);
      const x = ((freeX + flowMargin - compression + flowWidth) % flowWidth) - flowMargin;
      const roll = travel * .017 + i * 2.31;
      const rotations = Math.sin(roll) * .35;
      const depth = .62 + .38 * Math.cos(roll * .72) ** 2;
      const stamp = cx => {
        const y = lerp(upper(cx), lower(cx), level) + 8 * Math.sin(roll * .41);
        draw.save();
        draw.translate(cx, y);
        draw.rotate(rotations);
        draw.scale(1, depth);
        drawRasterCrop(draw, atlas, sx - 94, sy - 62, 188, 124, -94, -62, 188, 124);
        draw.restore();
      };
      stamp(x);
      if (x < 94) stamp(x + flowWidth);
      else if (x > WIDTH - 94) stamp(x - flowWidth);
    }
  };
}

function endothelium() {
  const rand = mulberry32(188);
  const retract = [];
  const moving = [];
  const halfGap = 10;
  function strip(from, to, axis, side, startGap = null, endGap = null) {
    const count = Math.round((to - from) / 66);
    const positions = Array.from({ length: count + 1 }, (_, i) =>
      lerp(from, to, i / count) + (i === 0 || i === count ? 0 : (rand() - .5) * 21));
    const lining = positions.slice(1).map((end, i) => {
      const start = positions[i] + (i === 0 && startGap !== null ? 0 : .28);
      const center = lerp(start, end, .43 + rand() * .13);
      const paint = stainNuclei(endothelialCell(start, end, center, axis, 6.8 + rand() * 3.8,
        9 + rand() * 7.5, 2.8 + rand() * 1.4));
      const joinsStart = i === 0 && startGap !== null;
      const joinsEnd = i === count - 1 && endGap !== null;
      if (!joinsStart && !joinsEnd) return paint;
      const id = `vessel-tip-${retract.length}`;
      retract.push({ id, far: joinsStart ? end : start, length: end - start, gap: joinsStart ? startGap : endGap });
      moving.push(group(id, paint));
      return '';
    }).join('');
    const support = ink(edgePath(from, to, x => axis(x) + side * 10),
      { size: 2.4, color: '#A65260', opacity: .63 });
    return support + lining;
  }
  const [a, b] = junctions;
  const bridges = junctions.map((x, i) => group(`vessel-bridge-${i}`,
    ink(edgePath(x - halfGap - 3, x + halfGap + 3, t => upper(t) - 10, 4),
      { color: '#A65260', size: 2.4, opacity: .63, taperStart: 2, taperEnd: 2 }))).join('');
  const fixed = strip(-63, a - halfGap, upper, -1, null, 0)
    + strip(a + halfGap, b - halfGap, upper, -1, 0, 1)
    + strip(b + halfGap, 1984, upper, -1, 1)
    + strip(-63, 1984, lower, 1);
  const paint = group('vessel-immobile-lining', fixed, 'data-paint-cache=""') + bridges + moving.join('');
  return { paint, retract, halfGap };
}

const migrants = [
  { gap: 0, begin: .44, crossing: .757, arrive: .93, toX: 892, toY: 352, initialX: 660, depth: 111, radius: 24, lobes: 4, seed: 229 },
  { gap: 1, begin: .48, crossing: .805, arrive: .96, toX: 1042, toY: 362, initialX: 934, depth: 104, radius: 25, lobes: 3, seed: 442 },
  { gap: 0, begin: .51, crossing: .814, arrive: .97, toX: 866, toY: 386, initialX: 550, depth: 153, radius: 22, lobes: 3, seed: 346 },
  { gap: 1, begin: .55, crossing: .874, arrive: 1, toX: 1090, toY: 391, initialX: 845, depth: 144, radius: 24, lobes: 4, seed: 503 },
  { gap: 0, begin: .568, crossing: .884, arrive: 1, toX: 923, toY: 390, initialX: 419, depth: 60, radius: 28, lobes: 4, seed: 194 },
  { gap: 1, begin: .61, crossing: .909, arrive: 1, toX: 1010, toY: 419, initialX: 795, depth: 118, radius: 28, lobes: 3, seed: 391 },
].map(cell => ({ ...cell, shape: createDiapedesisCell(cell) }));

function migrantPose(cell, movement, scale, prelude) {
  const rollStart = cell.begin + .088;
  const adhesionStart = cell.crossing - .091;
  const crossingStart = cell.crossing - .041;
  const margin = ramp(movement, cell.begin, rollStart);
  const rolling = ramp(movement, rollStart, adhesionStart);
  const crossing = ramp(movement, crossingStart, cell.crossing);
  const departure = clamp((movement - cell.crossing) / (cell.arrive - cell.crossing));
  const release = ramp(departure, .03, .96);
  const xGap = junctions[cell.gap];
  const entrance = cell.initialX + 28 * prelude;
  const crawl = Math.sin(release * Math.PI) * Math.sin(release * 8 + cell.seed);
  const rollFrom = entrance + 70;
  const rollTo = xGap - 11;
  const x = lerp(entrance, rollFrom, margin) + (rollTo - rollFrom) * rolling
    + (xGap - rollTo) * crossing + (cell.toX - xGap) * release + crawl * 5;
  const approachY = vesselAxis + (upper(x) - vesselAxis) * scale;
  const wallY = vesselAxis + (upper(xGap) - vesselAxis) * scale;
  const upright = Math.exp(-(((movement - cell.crossing) / .038) ** 2));
  const squeeze = Math.round(upright * 48) / 48;
  const yIn = approachY + scale * lerp(cell.depth, cell.radius * .72, margin) * (1 - crossing);
  const yOut = wallY + (cell.toY - wallY) * (1 - (1 - departure) ** 2) + crawl * 3;
  return {
    squeeze, x, y: movement <= cell.crossing ? yIn : yOut,
    angle: (1 - upright) * ((rolling * 360) % 360 + margin * 9 + 14 * crawl),
    out: movement > cell.crossing && yOut < wallY - 28,
  };
}

function integralOfDilation(p) {
  const span = dilationEnd - dilationStart;
  const u = clamp((p - dilationStart) / span);
  return span * (u ** 3 - .5 * u ** 4) + Math.max(0, p - dilationEnd);
}

const neutrophilSteps = [
  { text: '1. 边集', x: 480, y: 219, width: 98, start: .44, path: 'M548 232 Q635 324 714 468' },
  { text: '2. 滚动', x: 707, y: 210, width: 99, start: .53, path: 'M771 224 Q839 324 851 459' },
  { text: '3. 黏附', x: 929, y: 223, width: 99, start: .66, path: 'M988 236 Q1002 324 1020 450' },
  { text: '4. 阿米巴样游出（主动渗出）', x: 1200, y: 221, width: 407, start: .72,
    path: 'M1252 233 C1254 306 1220 354 1234 433' },
].map((step, i) => ({
  ...step,
  id: `s3-diapedesis-${i}`,
  trace: inkTrail(step.path, { color: '#55443A', size: 2.15, head: 9, seed: 960 + i }),
}));

function paperNote(text, x, y, width, color = '#493A33') {
  return `<rect x="${x - 13}" y="${y - 34}" width="${width + 25}" height="48" rx="14" fill="#F5F1E9" fill-opacity=".86"/>
    <text class="note title" x="${x}" y="${y}" font-size="27" fill="${color}">${text}</text>`;
}

const cutFrom = woundX - 123;
const cutTo = woundX + 123;
const membrane = (from, to, opacity) => opacity > 0
  ? ink(edgePath(from, to, basal, 7), { size: 3.15, color: '#9C4D69', opacity: .83 * opacity, taperStart: 4, taperEnd: 4 })
  : '';

export function createVascularScene(entranceTime, pixelScale = 1) {
  const epithelium = epithelialCells();
  const unstableColumns = [];
  const intactColumns = [];
  epithelium.forEach(({ x, y, angle, art }, i) => {
    const transform = `transform="translate(${x} ${y}) rotate(${angle})"`;
    if (x > cutFrom && x < cutTo) {
      const shade = `<path id="s3-stain-${i}" d="${organic(0, height(x) * .50, 13.2, height(x) * .45, i + 82, .08, -.05, 16)}"
        fill="#713B61" opacity="0"/>`;
      unstableColumns.push({ i, paint: group(`s3-epi-${i}`, art + shade, transform) });
    } else intactColumns.push(`<g ${transform}>${art}</g>`);
  });
  const wall = endothelium();
  const damaged = injury();
  const washes = tissueWashes();
  const congestion = bloodWashes();
  const plasma = plasmaWashes();
  const drawBlood = erythrocytes();
  const ulcerLeader = inkTrail('M648 141 C751 158 854 244 920 345', { color: '#793E50', size: 4.5, head: 20, seed: 41 });
  const flowLeader = inkTrail('M1628 129 C1686 203 1575 348 1348 366 Q1281 378 1252 438',
    { color: '#A18052', size: 1.9, head: 11, seed: 154 });
  const mediatorGlow = [[971, 163], [1059, 205], [1119, 169], [1222, 236], [1288, 182]].map(([x, y], i) =>
    cellDot(x, y, 13 + i % 3 * 3, 7 + i % 2 * 3, '#D9A951', (i - 2) * 13, .18)
    + cellDot(x + 1, y, 4.4, 3.2, '#B68144', 10, .38)).join('');
  const paint = `<defs>
    <clipPath id="s3-wall-mask"><path id="s3-wall-cut"/></clipPath>
    <clipPath id="s3-lumen-mask"><path d="${lumen}"/></clipPath>
  </defs><g>
    <g clip-path="url(#s3-wall-mask)">${group('s3-stroma', stroma(), 'data-paint-cache=""')}</g>
    ${group('s3-healthy-columns', intactColumns.join('') + membrane(-53, cutFrom, 1) + membrane(cutTo, 1978, 1),
      'data-paint-cache=""')}
    ${unstableColumns.map(item => item.paint).join('')}
    <g id="s3-basal-note"></g>
    ${group('s3-wound-debris', damaged.map(({ art }, i) => group(`s3-debris-${i}`, art)).join(''))}
    <g id="s3-vessel-dilate">
      ${canvasSlot('s3-plasma')}
      ${group('s3-lumen-color', fillPath(lumen, '#DE7F77', .36) + canvasSlot('s3-congestion'), 'data-paint-cache=""')}
      <g clip-path="url(#s3-lumen-mask)">
        ${canvasSlot('s3-erythrocytes')}
      </g>
      ${wall.paint}
    </g>
    ${migrants.map((cell, i) => group(`migrant-${i}`, '', 'data-migrating-cell=""')).join('')}
  </g>`;
  let artNodes;
  let labelNodes;
  let bloodCanvas;
  let sample;
  let lastDamage;
  let lastLeader;
  const lastStep = [];
  const lastShapes = [];
  return {
    paint,
    lettering: `
      ${group('s3-wound-label', `<text class="note title" x="325" y="148" font-size="32" fill="#1F1C19">黏膜破溃缺损 · 变质</text>
        <text class="note" x="325" y="201" font-size="27" fill="#683E40">粪石梗阻 → 腔内压升高 → 缺血与感染</text>
        <g id="s3-wound-leader"></g>`)}
      ${group('s3-mediators', paperNote('组胺 / 缓激肽 / 前列腺素 / 趋化因子等炎症介质', 332, 121, 672, '#654331') + mediatorGlow)}
      ${group('s3-exudate-label', paperNote('通透性升高 · 血浆渗出', 1360, 116, 289, '#65452E') + '<g id="s3-exudate-leader"></g>')}
      ${neutrophilSteps.map(({ id, x, y, text, width }) =>
        group(id, `<g id="${id}-leader"></g>${paperNote(text, x, y, width, '#24201D')}`)).join('')}`,
    mount(art, lettering) {
      mountSurface(art, 'wall-washes', washes);
      mountSurface(art, 's3-congestion', congestion);
      mountSurface(art, 's3-plasma', plasma);
      bloodCanvas = mountSurface(art, 's3-erythrocytes', createSurface(pixelScale));
      artNodes = selectIds(art, [
        's3-wall-cut', 's3-basal-note', 's3-plasma', 's3-vessel-dilate', 's3-wound-debris',
        ...unstableColumns.flatMap(({ i }) => [`s3-epi-${i}`, `s3-stain-${i}`]),
        ...damaged.map((_, i) => `s3-debris-${i}`),
        ...junctions.map((_, i) => `vessel-bridge-${i}`),
        ...wall.retract.map(({ id }) => id), ...migrants.map((_, i) => `migrant-${i}`),
      ]);
      labelNodes = selectIds(lettering, ['s3-wound-label', 's3-exudate-label', 's3-wound-leader',
        's3-exudate-leader', 's3-mediators', ...neutrophilSteps.flatMap(({ id }) => [id, `${id}-leader`])]);
    },
    audit() {
      return { erythrocytes: redCellCount, leukocytes: migrants.length, debrisNuclei,
        cytoplasmAlpha: CYTOPLASM_ALPHA, chromatinWidth: CHROMATIN_WIDTH, ...sample };
    },
    update(cue, p) {
      const { id, start, duration } = cue;
      const isUlcer = id === 'S11';
      const damage = isUlcer ? ulcerProgress(p) : 1;
      const wound = x => woundContour(x, damage);
      if (damage !== lastDamage) {
        artNodes['s3-wall-cut'].setAttribute('d', band(wound, () => 826, -61, 1981, 7));
        artNodes['s3-wound-debris'].setAttribute('opacity', ramp(damage, .09, .67));
        const rupture = ramp(damage, .08, .61);
        const span = woundHalfWidth(damage) * .96;
        const lip = strokePath(edgePath(woundX - span, woundX + span, x => wound(x) + 1, 3),
          '#AF5675', 4.1, .70 * rupture);
        artNodes['s3-basal-note'].innerHTML = membrane(cutFrom - 3, cutTo + 3, 1 - rupture)
          + membrane(cutFrom - 3, woundX - span, rupture) + membrane(woundX + span, cutTo + 3, rupture) + lip;
        unstableColumns.forEach(({ i }) => {
          const { x, y, angle } = epithelium[i];
          const node = artNodes[`s3-epi-${i}`];
          const proximity = 1 - ramp(Math.abs(x - woundX), 15, 98);
          const stress = proximity * ramp(damage, .02, .76);
          const lost = rupture * (1 - ramp(Math.abs(x - woundX), span - 13, span + 8));
          node.setAttribute('transform',
            `translate(${round(x + (woundX - x) * stress * .13)} ${round(y + stress * 29)}) rotate(${angle + stress * Math.sign(woundX - x) * 32}) scale(${1 - stress * .19} ${1 - stress * .43})`);
          artNodes[`s3-stain-${i}`].setAttribute('opacity', .52 * stress);
          node.setAttribute('opacity', 1 - lost);
        });
        damaged.forEach(({ x, lift, detached }, i) => {
          const fragment = artNodes[`s3-debris-${i}`];
          const offset = x * lerp(.45, 1, damage);
          const anchor = woundX + offset;
          const rise = ramp(damage, .16 + i % 3 * .022, .93);
          const drift = Math.sin(i * .79 + damage * 2.5) * 4.2 + (detached ? rise * x * .26 : 0);
          const y = detached ? lerp(wound(anchor) - 3, apical(anchor) - 28 - i % 4 * 6, rise)
            : wound(anchor) + lift * damage;
          fragment.setAttribute('opacity', detached ? ramp(damage, .13, .32) * (1 - ramp(damage, .69, 1)) : 1);
          fragment.setAttribute('transform', `translate(${anchor + drift} ${y}) rotate(${drift * 4.3})`);
        });
        lastDamage = damage;
      }
      const movement = isUlcer ? 0 : p;
      const expansion = ramp(movement, dilationStart, dilationEnd);
      const scale = lerp(restingScale, 1, expansion);
      const slowdown = isUlcer ? 0 : .23 * integralOfDilation(p);
      const travel = (start - entranceTime + duration * (p - slowdown)) * initialVelocity;
      artNodes['s3-vessel-dilate'].setAttribute('transform', `translate(0 ${vesselAxis}) scale(1 ${scale}) translate(0 ${-vesselAxis})`);
      artNodes['s3-plasma'].setAttribute('opacity', expansion);
      drawBlood(bloodCanvas, travel, expansion);
      const poses = migrants.map(cell => migrantPose(cell, movement, scale, isUlcer ? p : 1));
      const leakage = .16 * expansion * (1 - ramp(movement, .90, .978));
      const opening = junctions.map((_, gap) => Math.max(leakage, ...migrants
        .filter(cell => cell.gap === gap)
        .map(({ crossing }) => ramp(movement, crossing - .052, crossing - .019)
          * (1 - ramp(movement, crossing + .014, crossing + .064)))));
      wall.retract.forEach(({ id, far, length, gap }) => {
        const tip = 1 + (wall.halfGap - .24) * (1 - opening[gap]) / length;
        artNodes[id].setAttribute('transform', `translate(${far} 0) scale(${tip} 1) translate(${-far} 0)`);
      });
      opening.forEach((openness, i) => {
        artNodes[`vessel-bridge-${i}`].setAttribute('opacity', 1 - openness);
      });
      poses.forEach(({ x, y, angle, squeeze }, i) => {
        const node = artNodes[`migrant-${i}`];
        node.setAttribute('transform', `translate(${x} ${y}) rotate(${angle})`);
        node.dataset.squeeze = squeeze.toFixed(3);
        if (lastShapes[i] !== squeeze) {
          const { radius, shape } = migrants[i];
          node.innerHTML = vascularCellMarkup(`migrant-${i}`, shape(squeeze), radius);
          lastShapes[i] = squeeze;
        }
      });
      sample = { cueId: id, dilation: round(24 * expansion), plasma: expansion, leadCell: poses[0],
        migrated: poses.filter(pose => pose.out).length,
        crossingCells: poses.filter(pose => pose.squeeze > .87 && !pose.out).length,
        clefts: opening.map((openness, i) => [junctions[i], round(lerp(.48, wall.halfGap * 2, openness))]) };
      labelNodes['s3-wound-label'].setAttribute('opacity', isUlcer ? ramp(p, .20, .37) : 0);
      labelNodes['s3-mediators'].setAttribute('opacity', ramp(movement, .035, .16));
      labelNodes['s3-exudate-label'].setAttribute('opacity', ramp(movement, .24, .34));
      const stroke = isUlcer ? ramp(p, .28, .58) : ramp(p, .27, .44);
      const y = isUlcer ? wound(woundX) : 422;
      const key = `${id}/${stroke}/${y}`;
      if (key !== lastLeader) {
        if (isUlcer) labelNodes['s3-wound-leader'].innerHTML = ulcerLeader(stroke, 0, y - 345);
        else labelNodes['s3-exudate-leader'].innerHTML = flowLeader(stroke);
        lastLeader = key;
      }
      neutrophilSteps.forEach(({ id, trace, start }, i) => {
        const progress = ramp(movement, start, start + .058);
        labelNodes[id].setAttribute('opacity', progress);
        if (progress !== lastStep[i]) {
          labelNodes[`${id}-leader`].innerHTML = trace(progress);
          lastStep[i] = progress;
        }
      });
    },
  };
}
