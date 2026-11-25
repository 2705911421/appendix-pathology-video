import { getStroke } from 'perfect-freehand';
import { form as canvasForm, line as canvasLine, oval as canvasOval } from './detail/portraitPaths.js';

// The browser bundle gives the portrait its own brush target alongside the scene's watercolors.
const brush = typeof document === 'undefined' ? null : await import('p5.brush/standalone?minimalist-characters');

export const PORTRAIT_LAYER = Object.freeze({ x: -223, y: -34, width: 492, height: 397, waist: 332 });

const INK = '#2B2520';
const SKIN = '#F0DCC7';
const LINEN = '#DFD4BF';
const COAT = '#FCF9F4';
const TAU = 2 * Math.PI;
const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, t) => a + (b - a) * t;
const plus = ([x, y], [u, v], scale = 1) => [x + u * scale, y + v * scale];
const unit = angle => [Math.sin(angle), Math.cos(angle)];
const normal = ([x, y]) => [-y, x];
const coords = (...points) => points.flat();
const direction = ([x, y]) => {
  const length = Math.hypot(x, y);
  return [x / length, y / length];
};
const angleBetween = (from, to, progress) => from + (Math.atan2(Math.sin(to - from), Math.cos(to - from))) * progress;

function deferredPath(draw) {
  return (...parameters) => {
    let shape;
    const get = () => shape ??= draw(...parameters);
    return {
      get path() { return get().path; },
      get points() { return get().points; },
      get closed() { return get().closed; },
      get start() { return get().start; },
      get segments() { return get().segments; },
    };
  };
}

const form = deferredPath(canvasForm);
const line = deferredPath(canvasLine);
const oval = deferredPath(canvasOval);

// Shapes from the approved D portrait, with the sleeves separated at their actual cuffs.
const shirt = form([-23, 123], [[-44, 127, -71, 125, -89, 140], [-92, 157, -83, 180, -75, 196],
  [-70, 220, -77, 239, -73, 265], [-70, 298, -74, 339, -80, 367], [80, 367],
  [72, 338, 68, 298, 71, 267], [74, 246, 70, 219, 75, 194], [82, 178, 86, 159, 85, 140],
  [67, 131, 44, 128, 23, 123], [10, 117, -11, 116, -23, 123]]);
const coat = form([-22, 121], [[-42, 125, -77, 129, -92, 143], [-103, 159, -86, 194, -83, 213],
  [-75, 248, -78, 294, -84, 338], [83, 338], [78, 307, 76, 268, 78, 234],
  [78, 208, 90, 177, 93, 144], [76, 133, 45, 124, 23, 121], [5, 118, -12, 117, -22, 121]]);
const neck = form([-19, 93], [[-17, 110, -17, 121, -33, 129], [-25, 141, -14, 147, -1, 147],
  [16, 147, 25, 141, 34, 127], [16, 123, 17, 107, 20, 92], [-19, 93]]);
const face = form([-43, 55], [[-44, 28, -29, 9, -5, 7], [20, 6, 40, 20, 44, 44],
  [49, 63, 43, 83, 33, 97], [24, 111, 10, 120, -4, 118], [-19, 117, -35, 105, -40, 92],
  [-45, 82, -47, 65, -43, 55]]);
const jaw = line([-43, 63], [-45, 73, -42, 85, -39, 93], [-34, 105, -20, 115, -5, 118],
  [10, 121, 23, 113, 33, 98], [40, 88, 43, 75, 44, 65]);
const hair = form([-43, 70], [[-47, 60, -50, 46, -47, 33], [-44, 16, -33, 7, -19, 4],
  [-3, -1, 20, 4, 34, 14], [48, 24, 48, 40, 46, 54], [45, 61, 44, 64, 41, 68],
  [41, 56, 38, 48, 35, 38], [26, 38, 11, 33, 0, 27], [-10, 34, -24, 35, -36, 40], [-39, 53, -39, 60, -43, 70]]);
const parted = form([-43, 62], [[-47, 46, -47, 33, -42, 23], [-33, 9, -16, 7, -1, 9],
  [9, 2, 26, 6, 36, 15], [46, 23, 50, 42, 45, 61], [42, 56, 40, 49, 38, 39],
  [21, 37, 7, 30, -2, 25], [-12, 35, -22, 37, -36, 39], [-36, 46, -39, 55, -43, 62]]);
const cheek = form([29, 43], [[38, 57, 32, 76, 26, 89], [20, 104, 8, 113, 2, 117],
  [24, 115, 39, 94, 43, 74], [47, 58, 44, 49, 42, 44], [29, 43]]);
const hairSweep = [line([-43, 37], [-32, 14, -9, 3, 14, 10], [23, 11, 30, 14, 36, 19]),
  line([-35, 32], [-23, 22, -12, 18, -2, 20]), line([7, 13], [23, 12, 34, 24, 39, 34])];
const collar = line([-24, 126], [-15, 141, -9, 146, 1, 147], [11, 147, 20, 142, 24, 126]);
const shirtFold = form([-80, 148], [[-60, 145, -61, 192, -64, 213], [-67, 239, -58, 267, -56, 289],
  [-55, 309, -47, 326, -45, 338], [-77, 338], [-71, 297, -74, 277, -73, 258],
  [-76, 239, -70, 215, -73, 194], [-87, 174, -88, 155, -80, 148]]);
const coatFold = form([57, 140], [[75, 140, 86, 147, 89, 156], [87, 183, 83, 210, 77, 229],
  [76, 263, 78, 300, 83, 338], [51, 338], [54, 300, 57, 287, 52, 272],
  [46, 250, 52, 228, 53, 199], [53, 174, 55, 157, 57, 140]]);
const inner = form([-31, 129], [[-21, 138, -13, 143, 0, 143], [14, 143, 26, 134, 32, 127],
  [38, 168, 21, 196, 2, 217], [-17, 200, -28, 169, -31, 129]]);
const lapels = [form([-23, 121], [[-39, 131], [-46, 155], [-30, 158], [-36, 174],
  [-27, 187, -10, 206, 2, 221], [-9, 187, -19, 157, -23, 121]]),
form([23, 121], [[38, 131], [46, 154], [31, 159], [37, 173], [28, 188, 12, 209, 2, 221], [14, 184, 19, 154, 23, 121]])];
const flank = [line([-75, 195], [-71, 220, -77, 242, -73, 266], [-70, 286, -74, 321, -77, 335]),
  line([75, 195], [70, 220, 74, 244, 71, 265], [68, 288, 74, 322, 76, 335])];
const coatFlank = [line([-88, 164], [-90, 178, -87, 195, -83, 215], [-76, 247, -77, 292, -84, 335]),
  line([88, 162], [87, 188, 80, 208, 78, 235], [76, 269, 79, 312, 83, 335])];
const upperSeam = [line([-22, 123], [-42, 127, -68, 128, -87, 140]),
  line([22, 123], [42, 127, 68, 128, 87, 140])];
const foldMarks = [line([-70, 212], [-63, 218, -64, 232]), line([70, 240], [63, 248, 63, 258]),
  line([-61, 298], [-49, 304, -37, 306])];
const stethoscope = [
  line([-21, 135], [-29, 126, -14, 119, 0, 121], [14, 119, 29, 126, 21, 135]),
  line([-21, 135], [-35, 156, -35, 182, -20, 195], [-11, 204, 9, 204, 19, 194], [34, 181, 35, 157, 21, 135]),
  line([0, 202], [1, 216, 7, 233, 19, 234], [25, 236, 28, 231, 29, 226]),
];
const earpieces = [line([-21, 135], [-19, 128, -13, 124]), line([21, 135], [19, 128, 13, 124])];
const bell = oval(29, 226, 7.5, 7.1);
const glints = [oval(27.4, 224.2, 1.8, 1.2), oval(31.6, 227.2, 1.1, .8)];
const pocket = line([44, 212], [65, 211], [65, 229], [56, 235, 44, 232], [44, 212]);
const pen = line([58, 213], [57.5, 200, 59, 198]);

const swatches = {
  linen: '#B6A287', skin: '#B7886B', coat: '#ADBFC9', shirt: '#8398A1', hair: '#322922',
  cinnabar: '#C86758', dish: '#C9B69B', tea: '#A78152',
};
const tileWidth = 184;
const tileHeight = 154;
const atlases = new Map();
const surfaces = new WeakMap();

function palette(density) {
  if (atlases.has(density)) return atlases.get(density);
  const width = tileWidth * 4;
  const height = tileHeight * 2;
  const wet = brush.createCanvas(width, height, { pixelDensity: density, parent: null });
  const tiles = {};
  brush.angleMode(brush.DEGREES);
  brush.noField();
  brush.noStroke();
  for (const [index, [key, color]] of Object.entries(swatches).entries()) {
    const x = (index % 4) * tileWidth;
    const y = Math.floor(index / 4) * tileHeight;
    // Sample the pigment interior. The garment path supplies the wash boundary.
    const gutter = 27;
    tiles[key] = [(x + gutter) * density, (y + gutter) * density,
      (tileWidth - 2 * gutter) * density, (tileHeight - 2 * gutter) * density];
    brush.seed(8357 + index * 139);
    brush.noiseSeed(934 + index * 193);
    brush.fill(color, key === 'cinnabar' ? 155 : 168);
    brush.fillBleed(.112, 'out', 39);
    brush.fillTexture(.77, .29, true, .18);
    brush.polygon([[12, 15], [78, 10], [165, 15], [173, 72], [161, 130],
      [92, 141], [18, 128], [10, 73]].map(([px, py]) => [x + px - width / 2, y + py - height / 2]));
  }
  brush.render();
  const canvas = new OffscreenCanvas(wet.width, wet.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(wet, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = '#F5F1E918';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const atlas = { canvas, tiles };
  atlases.set(density, atlas);
  return atlas;
}

const bounds = new WeakMap();
function shapeBounds(shape) {
  if (!bounds.has(shape)) {
    const xs = shape.points.map(point => point[0]);
    const ys = shape.points.map(point => point[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    bounds.set(shape, [x, y, Math.max(...xs) - x, Math.max(...ys) - y]);
  }
  return bounds.get(shape);
}

function fill(ctx, shape, color, opacity = 1) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha *= opacity;
  ctx.fill(shape.path);
  ctx.restore();
}

function wash(ctx, atlas, shape, key, opacity, dx = 0, dy = 0) {
  const [x, y, width, height] = shapeBounds(shape);
  ctx.save();
  ctx.clip(shape.path);
  ctx.globalAlpha *= opacity;
  ctx.globalCompositeOperation = 'multiply';
  const bleed = 2.5;
  ctx.drawImage(atlas.canvas, ...atlas.tiles[key], x + dx - bleed, y + dy - bleed,
    width + 2 * bleed, height + 2 * bleed);
  ctx.restore();
}

function tint(ctx, atlas, shape, base, swatch, opacity = .5, offset = [0, 0]) {
  fill(ctx, shape, base);
  wash(ctx, atlas, shape, swatch, opacity, ...offset);
}

const inkPaths = new WeakMap();
function ink(ctx, shape, size = 3.1, { color = INK, opacity = .93, seed = 4, taper = 4.3 } = {}) {
  const id = `${size}/${seed}/${taper}`;
  let cache = inkPaths.get(shape);
  if (!cache) inkPaths.set(shape, cache = new Map());
  let path = cache.get(id);
  if (!path) {
    const positions = shape.closed ? [...shape.points, shape.points[0]] : shape.points;
    const outline = getStroke(positions.map(([x, y], index) =>
      [x, y, .61 + .21 * Math.sin(index * .135 + seed) + .115 * Math.cos(index * .48 + seed)]), {
      size, thinning: .81, smoothing: .54, streamline: .24, last: true, simulatePressure: false,
      start: { taper: shape.closed ? 0 : taper }, end: { taper: shape.closed ? 0 : taper * 1.16 },
    });
    path = new Path2D();
    const first = outline[0];
    const last = outline.at(-1);
    path.moveTo(mix(first[0], last[0], .5), mix(first[1], last[1], .5));
    for (const [i, [x, y]] of outline.entries()) {
      const [nx, ny] = outline[(i + 1) % outline.length];
      path.quadraticCurveTo(x, y, mix(x, nx, .5), mix(y, ny, .5));
    }
    path.closePath();
    cache.set(id, path);
  }
  fill(ctx, { path }, color, opacity);
}

const ARM_UPPER = 83;
const ARM_LOWER = 79;
function armRig(side, angles, lowerReach = ARM_LOWER) {
  const shoulder = [side * 81.5, 149];
  const u = unit(angles[0]);
  const v = unit(angles[1]);
  const elbow = plus(shoulder, u, ARM_UPPER);
  const wrist = plus(elbow, v, lowerReach);
  return { side, shoulder, elbow, wrist, u, v, n: normal(u), m: normal(v) };
}

function armForm(arm, start, widths, hand) {
  const { shoulder, elbow, wrist, u, v, n, m } = arm;
  const [upper, joint, cuff] = widths;
  const begin = plus(shoulder, u, start);
  const bisector = direction(plus(n, m));
  const on = (point, axis, distance, perpendicular, width) => plus(plus(point, axis, distance), perpendicular, width);
  const cuffOut = plus(wrist, m, cuff);
  const cuffIn = plus(wrist, m, -cuff);
  const palm = hand ? [
    coords(on(wrist, v, 7, m, cuff + 2), on(wrist, v, 18, m, cuff + 2), on(wrist, v, 23, m, cuff - 1)),
    coords(on(wrist, v, 30, m, cuff - 3), on(wrist, v, 28, m, -cuff + 1), on(wrist, v, 20, m, -cuff + 1)),
    coords(on(wrist, v, 18, m, -cuff - 2), on(wrist, v, 13, m, -cuff - 1), on(wrist, v, 10, m, -cuff)),
    coords(on(wrist, v, 8, m, -cuff + 1), on(wrist, v, 3, m, -cuff), cuffIn),
  ] : [cuffIn];
  return form(plus(begin, n, upper), [
    coords(on(begin, u, 17, n, upper), on(elbow, u, -21, n, joint + 1), on(elbow, u, -9, n, joint)),
    coords(plus(elbow, bisector, joint * 1.17), on(elbow, v, 10, m, joint)),
    coords(on(elbow, v, 25, m, joint), on(wrist, v, -12, m, cuff + 1.7), cuffOut),
    ...palm,
    coords(on(wrist, v, -16, m, -cuff - 1), on(elbow, v, 23, m, -joint), on(elbow, v, 10, m, -joint)),
    coords(plus(elbow, bisector, -joint * .82), on(elbow, u, -10, n, -joint)),
    coords(on(elbow, u, -24, n, -joint), on(begin, u, 12, n, -upper), plus(begin, n, -upper)),
  ]);
}

function shortSleeve(ctx, atlas, { side, shoulder, n, u }, seed) {
  const cap = plus(shoulder, u, -7);
  const cuff = plus(shoulder, u, 39);
  const outer = plus(cuff, n, -side * 17);
  const inner = plus(cuff, n, side * 17);
  const edge = line(plus(cap, n, -side * 13),
    coords(plus(plus(cap, u, 9), n, -side * 24), plus(plus(cuff, u, -7), n, -side * 17), outer),
    coords(plus(cuff, u, 5), inner));
  const shape = form(edge.start, [...edge.segments, coords(plus(plus(cuff, u, -11), n, side * 24), plus(cap, n, side * 16)),
    coords(plus(cap, u, -5), edge.start)]);
  tint(ctx, atlas, shape, LINEN, 'linen', .38, [-1.5, 1.6]);
  ink(ctx, edge, 3.0, { seed, taper: 3 });
}

function skinArm(ctx, atlas, arm, seed) {
  const limb = armForm(arm, 38, [16.4, 13.9, 9.2], true);
  tint(ctx, atlas, limb, SKIN, 'skin', .43, [1.5, 1]);
  ink(ctx, line(limb.start, ...limb.segments), 2.85, { seed, taper: 4.3 });
}

function coatSleeve(ctx, atlas, arm, seed) {
  const widths = arm.wrist[0] > 100 ? [22.8, 18.6, 12.8] : [21, 16.8, 12.2];
  const limb = armForm(arm, -1, widths, false);
  const { wrist, m, v } = arm;
  const hand = form(plus(wrist, m, 9.7), [
    coords(plus(plus(wrist, v, 11), m, 12), plus(plus(wrist, v, 19), m, 12), plus(plus(wrist, v, 22), m, 8)),
    coords(plus(plus(wrist, v, 30), m, 5), plus(plus(wrist, v, 26), m, -6), plus(plus(wrist, v, 18), m, -7)),
    coords(plus(plus(wrist, v, 10), m, -11), plus(wrist, m, -9.7)),
  ]);
  tint(ctx, atlas, hand, SKIN, 'skin', .39, [1, 0]);
  ink(ctx, hand, 2.45, { seed });
  tint(ctx, atlas, limb, COAT, 'coat', .30, [-1, 2.4]);
  ink(ctx, line(limb.start, ...limb.segments), 2.98, { seed: seed + 4, taper: 5.2 });
  ink(ctx, line(plus(plus(wrist, v, -5), m, 10), plus(wrist, v, -7), plus(plus(wrist, v, -3), m, -11)),
    1.57, { color: '#71645B', opacity: .62 });
}

function torsoPaint(ctx, atlas, doctor) {
  const body = doctor ? coat : shirt;
  tint(ctx, atlas, body, doctor ? COAT : LINEN, doctor ? 'coat' : 'linen', doctor ? .22 : .38, [1.7, 2.1]);
  ctx.save();
  ctx.clip(body.path);
  const shade = doctor ? coatFold : shirtFold;
  fill(ctx, shade, doctor ? '#B8C9D1' : '#9B9A8B', doctor ? .26 : .13);
  wash(ctx, atlas, shade, doctor ? 'coat' : 'linen', doctor ? .43 : .33, -1.8, 2.3);
  ctx.restore();
  for (const [i, path] of [...upperSeam, ...(doctor ? coatFlank : flank)].entries()) ink(ctx, path, 3.2, { seed: 2.8 + i });
  ink(ctx, line([-87, 140], [-69, 128, -49, 132, -31, 125]), 1.51, { seed: 77, opacity: .63, taper: 4.2 });
  if (!doctor) {
    for (const [i, path] of foldMarks.entries()) ink(ctx, path, 1.74, { seed: 4 + i, opacity: .61 });
  }
}

function drawHead(ctx, atlas, doctor, distress, smile, phase, recovery) {
  tint(ctx, atlas, face, SKIN, 'skin', .36, [1.4, .3]);
  ctx.save();
  ctx.clip(face.path);
  fill(ctx, cheek, '#C2896B', .24);
  wash(ctx, atlas, cheek, 'skin', .66, 1.2, 1.5);
  if (recovery > 0) {
    fill(ctx, oval(-27, 83, 11, 6), '#E29880', .14 * recovery);
    fill(ctx, oval(28, 83, 10, 6), '#E29880', .14 * recovery);
  }
  ctx.restore();
  const style = doctor ? parted : hair;
  tint(ctx, atlas, style, '#665448', 'hair', .88, [-1.4, -.5]);
  ink(ctx, jaw, 3.05, { seed: 14, taper: 1.4 });
  ink(ctx, style, 3.15, { seed: 31 });
  for (const [i, path] of hairSweep.entries()) ink(ctx, path, i ? 1.7 : 2.05,
    { color: i ? '#B69577' : '#3B302A', opacity: i ? .76 : .90, seed: i + 2 });

  const eyeY = 66 + 2.6 * distress;
  for (const [i, x] of (doctor ? [-17.1, 17.1] : [-19, 14]).entries()) {
    const lift = i ? -1 : 1;
    const figure = line([x - 4.4, eyeY - .25], [x - 1, eyeY - 2.5 + 4.1 * distress - 1.5 * recovery, x + 4.5, eyeY + .4]);
    ink(ctx, figure, 1.91 + .32 * distress, { taper: 1.17, seed: i * 2 + 3 });
    fill(ctx, oval(x + .1, eyeY + .72, 1.47, 1.76 - .60 * distress), INK,
      clamp((.92 - distress) / .20) * (.97 - .27 * distress) * (1 - .65 * recovery));
    const browY = 57 + .75 * phase;
    ink(ctx, line([x - 6, browY - 1.35 * lift * distress],
      [x - .5, browY - 2.85 + distress, x + 6, browY + 1.6 * lift * distress]), 1.84,
    { opacity: .75 + .17 * distress, taper: 1.6, seed: 8 + i });
  }
  ink(ctx, line([-2, 74], [-5.5, 82, -.4, 84]), 1.66, { opacity: .72, taper: 1.6 });
  ink(ctx, line([-8.2, 94 + distress], [-1.2, 96 + 5 * smile - 2.2 * distress, 7, 93.6 + distress]), 2.02,
    { seed: 14, taper: 1.85 });
  if (doctor) {
    for (const x of [-17.1, 17.1]) ink(ctx, oval(x, 66, 13.1, 10.6), 1.99, { color: '#4B423B', taper: 0, seed: x });
    ink(ctx, line([-4, 65], [0, 61.8, 4.3, 65]), 1.81, { taper: .9 });
    ink(ctx, line([-30, 63], [-39.7, 60.2]), 1.58, { taper: 1.6 });
    ink(ctx, line([30, 63], [41, 60.2]), 1.58, { taper: 1.6 });
  }
}

function doctorDetails(ctx, atlas) {
  tint(ctx, atlas, inner, '#AABBC0', 'shirt', .63, [-.4, 1.5]);
  for (const lapel of lapels) {
    tint(ctx, atlas, lapel, COAT, 'coat', .24, [.7, 2.3]);
    ink(ctx, lapel, 2.45, { opacity: .82, seed: 21 });
  }
  ink(ctx, pocket, 1.63, { opacity: .63 });
  ink(ctx, pen, 1.82, { color: '#637274', opacity: .82 });
  for (const [i, tube] of stethoscope.entries()) ink(ctx, tube, 3.07 - i * .25, { color: '#48514E', seed: 16 + i, taper: 1.8 });
  for (const edge of earpieces) ink(ctx, edge, 2.08, { color: '#829089', taper: .95 });
  fill(ctx, bell, '#BDC8C8');
  ink(ctx, bell, 2.02, { color: '#4F5A58', seed: 9 });
  for (const sparkle of glints) fill(ctx, sparkle, '#EEEAE0');
}

function glow(ctx, atlas, wrist, pain, acute, breathing) {
  if (pain <= .001) return;
  const x = mix(-4, -36, acute) + (wrist[0] - mix(-17, -39, acute)) * .22;
  const y = mix(262, 278, acute);
  const radius = mix(39, 47, acute) + 2.2 * breathing;
  const halo = oval(x, y, radius, radius * .72);
  ctx.save();
  ctx.clip(shirt.path);
  const stain = ctx.createRadialGradient(x, y, 6, x, y, radius);
  stain.addColorStop(0, '#B94D428C');
  stain.addColorStop(.47, '#C66A5760');
  stain.addColorStop(1, '#CE765900');
  fill(ctx, halo, stain, pain * (.83 + .11 * breathing));
  wash(ctx, atlas, oval(x, y - 1, radius * .70, radius * .51), 'cinnabar', pain * .34, 0, 1.5);
  for (const [i, path] of [line([x - 26, y + 13], [x - 18, y + 22, x - 9, y + 22]),
    line([x - 18, y + 22], [x - 12, y + 30, x + 1, y + 29]),
    line([x + 12, y + 11], [x + 17, y + 18, x + 24, y + 18])].entries()) {
    ink(ctx, path, 1.63, { color: '#735747', seed: 30 + i, opacity: .67 * acute, taper: 2.39 });
  }
  ctx.restore();
}

const dish = form([-43, 0], [[-39, 17, -24, 31, 0, 32], [25, 32, 39, 16, 43, 0], [19, 6, -21, 7, -43, 0]]);
const rim = oval(0, 0, 43, 10.3);
const tea = oval(0, .1, 36.4, 5.3);
const bowlFoot = line([-14, 32], [-8, 36, 10, 36, 16, 31.5]);
const vapour = [-20, 0, 21].map((x, i) => line([x, -15],
  [x - 8, -29, x + 18, -45, x + 11, -56 - i * 3]));

function paintBowl(ctx, atlas, place, lean, opacity) {
  if (opacity <= .001) return;
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.translate(...place);
  ctx.rotate(-lean);
  tint(ctx, atlas, dish, '#EDE4D3', 'dish', .70, [.9, 1.3]);
  ink(ctx, dish, 2.57, { seed: 17, color: '#6F6052' });
  fill(ctx, rim, '#FBF6EE');
  tint(ctx, atlas, tea, '#DCC6A2', 'tea', .62, [0, .6]);
  ink(ctx, rim, 2.0, { color: '#6F6052', seed: 19 });
  ink(ctx, line([-36, 11], [-20, 20, 23, 20, 37, 11]), 1.85, { color: '#6F939C', opacity: .83, taper: 6 });
  ink(ctx, line([-29, 20], [-13, 25, 17, 26, 28, 20]), 1.05, { color: '#7199A2', opacity: .59 });
  ink(ctx, bowlFoot, 1.7, { color: '#9B886F', seed: 7 });
  ctx.restore();
}

function paintSteam(ctx, place, lean, opacity, seconds) {
  if (opacity <= .001) return;
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.translate(...place);
  ctx.rotate(-lean);
  for (const [i, steam] of vapour.entries()) {
    const wave = Math.sin(seconds * 2.1 + i);
    ctx.save();
    ctx.translate(2.8 * wave, -3.1 * wave - 3);
    ink(ctx, steam, 2.45, { opacity: .62 + .09 * wave, color: '#786A5A', seed: i + 9, taper: 6.5 });
    ctx.restore();
  }
  ctx.restore();
}

const mealOrigin = 148;
const setBowl = [120, mealOrigin + 118];
const tableY = setBowl[1] + 36;
const tableTop = line([-200, tableY], [-97, tableY - 3, 118, tableY + 2, 239, tableY - 1]);
const tableShade = form([-202, tableY], [[-98, tableY - 5, 124, tableY - 1, 238, tableY - 1],
  [235, tableY + 13, 76, tableY + 16, -34, tableY + 15], [-146, tableY + 16, -184, tableY + 12, -202, tableY]]);

function paintTable(ctx, opacity) {
  if (opacity <= .001) return;
  ctx.save();
  ctx.globalAlpha *= opacity;
  const grain = ctx.createLinearGradient(-200, 0, 239, 0);
  grain.addColorStop(0, '#AA805900');
  grain.addColorStop(.29, '#BE936B49');
  grain.addColorStop(.72, '#BE936B47');
  grain.addColorStop(1, '#AA805900');
  fill(ctx, tableShade, grain);
  ink(ctx, tableTop, 2.2, { color: '#8F6C50', opacity: .70, taper: 45 });
  ctx.restore();
}

export function drawSeatedMeal(ctx, { x, y, scale, opacity, seconds }) {
  if (opacity <= .001) return null;
  const density = unitDensity(ctx, scale);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  paintTable(ctx, opacity);
  paintBowl(ctx, palette(density), setBowl, 0, opacity);
  paintSteam(ctx, setBowl, 0, opacity, seconds);
  ctx.restore();
  return [x + setBowl[0] * scale, y + setBowl[1] * scale];
}

const profiles = {
  eat: { hunch: 0, pain: 0, shiver: 0, smile: .53, dish: 1, arms: [[-.12, -.65], [.06, .72]] },
  navel_pain: { hunch: .35, pain: .46, shiver: .08, smile: 0, dish: 0, arms: [[-.08, 1.16], [.16, -.25]] },
  rlq_acute: { hunch: .80, pain: 1, shiver: .57, smile: 0, dish: 0, arms: [[-.275, .99], [.17, -.49]] },
  recovered: { hunch: 0, pain: 0, shiver: 0, smile: 1, dish: 1, arms: [[-.18, -.66], [.09, .69]] },
};
const relaxed = [[-.17, .20], [.16, -.25]];

function unitDensity(ctx, scale) {
  const { a, b, c, d } = ctx.getTransform();
  const demand = Math.max(Math.hypot(a, b), Math.hypot(c, d)) * scale;
  const dpr = globalThis.devicePixelRatio || 1;
  return Math.max(1, Math.ceil(Math.max(dpr, demand) - 1e-6));
}

function renderPortrait(ctx, opts, draw) {
  const { x = 0, y = 0, scale = 1 } = opts;
  if (![x, y, scale].every(Number.isFinite) || scale <= 0) throw new RangeError('Invalid portrait placement');
  const density = unitDensity(ctx, scale);
  const { x: left, y: top, width, height } = PORTRAIT_LAYER;
  let layer = surfaces.get(ctx);
  if (!layer || layer.width !== width * density) {
    layer = new OffscreenCanvas(width * density, height * density);
    surfaces.set(ctx, layer);
  }
  const pen = layer.getContext('2d');
  pen.resetTransform();
  pen.globalCompositeOperation = 'source-over';
  pen.clearRect(0, 0, layer.width, layer.height);
  pen.setTransform(density, 0, 0, density, -left * density, -top * density);
  const result = draw(pen, palette(density));
  const foot = pen.createLinearGradient(0, 311, 0, 337);
  foot.addColorStop(0, '#000');
  foot.addColorStop(.62, '#0009');
  foot.addColorStop(1, '#0000');
  pen.globalCompositeOperation = 'destination-in';
  pen.fillStyle = foot;
  pen.fillRect(left, top, width, height);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(layer, left, top, width, height);
  ctx.restore();
  return result;
}

function rotate(point, angle) {
  const [x, y] = point;
  return [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)];
}

function drawPortrait(ctx, atlas, state) {
  const { doctor, lean, lift, sideShift, nod, arms, smile, pain, distress, bowl, breath,
    table = 0, recovery = 0, seconds = 0, paintMeal = true } = state;
  const { waist, x: left, y: top, width, height } = PORTRAIT_LAYER;
  ctx.save();
  ctx.translate(sideShift, waist + lift);
  ctx.rotate(lean);
  ctx.translate(0, -waist);
  const headAngle = nod - (doctor ? .015 : .07 * distress);
  const headOffset = [doctor ? .4 * breath : -4.5 * distress, doctor ? 1.25 * breath : 3.0 * distress];
  const crownX = headOffset[0];
  const crownY = headOffset[1];

  for (const [i, arm] of arms.entries()) {
    if (doctor) coatSleeve(ctx, atlas, arm, 11 + i * 9);
    else shortSleeve(ctx, atlas, arm, 9 + i * 7);
  }
  torsoPaint(ctx, atlas, doctor);
  // Preserve the lower jaw as a clean occluding edge over the warm neck glaze.
  ctx.save();
  const silhouette = new Path2D();
  silhouette.rect(left - 60, top - 60, width + 120, height + 120);
  const figureMatrix = new DOMMatrix().translate(crownX, crownY + 108).rotate(headAngle * 180 / Math.PI)
    .scale(.963, 1.031).translate(0, -108);
  silhouette.addPath(face.path, figureMatrix);
  ctx.clip(silhouette, 'evenodd');
  tint(ctx, atlas, neck, '#E0C2A9', 'skin', .44, [.9, 1.3]);
  ink(ctx, line([-18, 109], [-18, 120, -27, 127]), 1.93, { taper: 2.3 });
  ink(ctx, line([19, 108], [18, 122, 29, 126]), 1.93, { taper: 2.3, seed: 13 });
  ctx.restore();
  if (doctor) doctorDetails(ctx, atlas);
  else {
    ink(ctx, collar, 2.33, { opacity: .90, taper: 2.8 });
    ink(ctx, line([-18, 128], [-13, 138, -4, 140]), 1.55, { opacity: .68, taper: 2.6 });
    glow(ctx, atlas, arms[0].wrist, pain, distress, breath);
    if (paintMeal) {
      paintTable(ctx, table);
      paintBowl(ctx, atlas, bowl.position, lean, bowl.opacity);
    }
    for (const [i, arm] of arms.entries()) skinArm(ctx, atlas, arm, 5 + i * 11);
    if (paintMeal) paintSteam(ctx, bowl.position, lean, bowl.opacity, seconds);
  }

  ctx.save();
  ctx.transform(figureMatrix.a, figureMatrix.b, figureMatrix.c, figureMatrix.d, figureMatrix.e, figureMatrix.f);
  drawHead(ctx, atlas, doctor, doctor ? 0 : mix(pain * .72, 1, distress), smile, breath, recovery);
  ctx.restore();
  ctx.restore();

  const world = ([px, py]) => plus([sideShift, waist + lift], rotate([px, py - waist], lean));
  const headPoint = new DOMPoint(0, 64).matrixTransform(figureMatrix);
  return { arms: arms.map(({ shoulder, elbow, wrist }) => [shoulder, elbow, wrist].map(world)),
    head: world([headPoint.x, headPoint.y]), bowl: bowl.opacity > .001 ? world(bowl.position) : null };
}

/** x/y locate the upright crown. Angle and pose interpolation remain in logical units. */
export function drawMinimalPatient(ctx, opts = {}) {
  const { pose = 'eat', fromPose = pose, progress = 1, breathPhase = 0, seconds, hasBowl } = opts;
  if (!Object.hasOwn(profiles, pose) || !Object.hasOwn(profiles, fromPose)) throw new RangeError('Unknown patient pose');
  if (![progress, breathPhase, seconds ?? 0, opts.hunch ?? 0, opts.shiver ?? 0, opts.painLevel ?? 0,
    Number(hasBowl ?? 0)].every(Number.isFinite)) throw new RangeError('Patient motion parameters must be finite');
  const t = clamp(progress);
  const blend = opts.eased ? t : t * t * (3 - 2 * t);
  const a = profiles[fromPose];
  const b = profiles[pose];
  const weight = key => mix(Number(fromPose === key), Number(pose === key), blend);
  const distress = weight('rlq_acute');
  const recovery = weight('recovered');
  const hunch = clamp(opts.hunch ?? mix(a.hunch, b.hunch, blend));
  const pain = clamp(opts.painLevel ?? mix(a.pain, b.pain, blend));
  const shiver = clamp(opts.shiver ?? mix(a.shiver, b.shiver, blend));
  const breath = mix(Math.sin(breathPhase), Math.sin(breathPhase * 1.62), distress);
  const tremor = shiver * Math.sin(seconds === undefined ? breathPhase * 2.75 : seconds * TAU * 1.82);
  const bowlAmount = hasBowl === undefined ? mix(a.dish, b.dish, blend) : clamp(Number(hasBowl));
  const lowerReach = mix(ARM_LOWER, 65, weight('eat') + recovery);
  const arms = [-1, 1].map((side, i) => {
    const angles = a.arms[i].map((value, j) => angleBetween(value, b.arms[i][j], blend));
    const armAngles = i === 1 ? angles.map((value, j) => {
      const withMeal = angleBetween(value, profiles.eat.arms[i][j], (1 - recovery) * bowlAmount * (1 - weight('eat')));
      return angleBetween(withMeal, relaxed[i][j], recovery * (1 - bowlAmount));
    }) : angles.map((value, j) => angleBetween(value, relaxed[i][j], recovery * (1 - bowlAmount)));
    return armRig(side, armAngles, lowerReach);
  });
  const bowl = { position: setBowl, opacity: bowlAmount };
  const table = bowlAmount;
  return renderPortrait(ctx, opts, (pen, atlas) => drawPortrait(pen, atlas, {
    doctor: false, lean: -.44 * hunch + .009 * tremor, lift: (1.48 + 1.1 * distress) * breath,
    sideShift: 1.2 * tremor, nod: -.073 * hunch + .015 * breath - recovery * Math.PI / 60,
    arms, smile: mix(a.smile, b.smile, blend), pain, distress, bowl, breath, table, recovery,
    seconds: seconds ?? breathPhase, paintMeal: opts.paintMeal !== false,
  }));
}

/** x/y locate the crown. breathPhase is in radians and nod controls the small speech beat. */
export function drawMinimalDoctor(ctx, opts = {}) {
  const { pose = 'explain', breathPhase = 0, nod = .65 } = opts;
  if (pose !== 'explain') throw new RangeError('Unknown doctor pose');
  if (![breathPhase, nod].every(Number.isFinite)) throw new RangeError('Doctor motion parameters must be finite');
  const breath = Math.sin(breathPhase);
  const dip = clamp(nod) * Math.sin(breathPhase * 1.72 + .5);
  const arms = [armRig(-1, [-.16, .12]), armRig(1, [.245 + .026 * breath, 1.94 + .036 * dip])];
  return renderPortrait(ctx, opts, (pen, atlas) => drawPortrait(pen, atlas, {
    doctor: true, lean: .023 + .009 * breath, lift: 1.8 * breath, sideShift: 0, nod: -.064 * dip,
    arms, smile: .65, pain: 0, distress: 0, bowl: { opacity: 0 }, breath,
  }));
}
