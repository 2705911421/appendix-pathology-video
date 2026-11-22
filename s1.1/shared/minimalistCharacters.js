import { getStroke } from 'perfect-freehand';
import * as brush from 'p5.brush/standalone';
import { createRaster, drawRasterCrop } from './detail/raster.js';
import { displayDensity } from './renderProfile.js';

const INK = '#2A2622';
const PAPER_SKIN = '#F8F3E9';
const PIVOT_Y = 154;
const ARM_LENGTH = 108;
const TAU = 2 * Math.PI;
const limit = value => Math.max(0, Math.min(1, value));
const mix = (a, b, t) => a + (b - a) * t;
const pointBetween = ([ax, ay], [bx, by], t) => [mix(ax, bx, t), mix(ay, by, t)];

function quadratic([ax, ay], [cx, cy], [bx, by], steps = 20) {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    const k = 1 - t;
    return [k * k * ax + 2 * k * t * cx + t * t * bx, k * k * ay + 2 * k * t * cy + t * t * by];
  });
}

function cubics(start, ...spans) {
  const result = [start];
  let [ax, ay] = start;
  for (const [cx, cy, dx, dy, bx, by] of spans) {
    for (let i = 1; i <= 15; i++) {
      const t = i / 15;
      const k = 1 - t;
      result.push([
        k ** 3 * ax + 3 * k * k * t * cx + 3 * k * t * t * dx + t ** 3 * bx,
        k ** 3 * ay + 3 * k * k * t * cy + 3 * k * t * t * dy + t ** 3 * by,
      ]);
    }
    [ax, ay] = [bx, by];
  }
  return result;
}

function ellipse(rx, ry, tilt = 0, phase = 0, count = 54) {
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  return Array.from({ length: count }, (_, i) => {
    const angle = TAU * i / count + phase;
    const wiggle = 1 + .018 * Math.sin(3 * angle + .7) + .009 * Math.cos(5 * angle + .1);
    const x = rx * Math.cos(angle) * wiggle;
    const y = ry * Math.sin(angle) * wiggle;
    return [cos * x - sin * y, sin * x + cos * y];
  });
}

const head = ellipse(48, 47, -.055, 1.36);
const hand = ellipse(10, 8.35, .08, .4, 28);
const body = cubics([-14, 1],
  [-34, 2, -47, 20, -52, 43], [-57, 66, -58, 106, -52, 130],
  [-47, 148, -31, 154, -10, 156], [14, 158, 43, 150, 51, 134],
  [60, 114, 57, 73, 52, 45], [48, 24, 38, 10, 25, 5], [13, 0, 0, -2, -14, 1]);
const dish = cubics([-34, 0], [-29, 19, -16, 27, 0, 27], [15, 27, 29, 22, 34, 0], [13, 4, -11, 5, -34, 0]);
const dishSilhouette = cubics([-34, 0], [-32, -10, 32, -10, 34, 0],
  [29, 21, 16, 27, 0, 27], [-16, 27, -28, 18, -34, 0]);
const rim = ellipse(34, 8, -.015, .2, 46);
const drop = cubics([0, -9], [1, -6, 6, -1, 5, 3], [4, 9, -4, 10, -5, 4], [-6, 0, -3, -5, 0, -9]);

function drawInk(ctx, points, size = 5.55, {
  closed = false, color = INK, opacity = 1, taper = 0, phase = .9,
} = {}) {
  const input = (closed ? [...points, points[0]] : points).map(([x, y], i) => [
    x, y, .64 + .15 * Math.sin(i * .20 + phase) + .07 * Math.sin(i * .49 - phase),
  ]);
  const outline = getStroke(input, {
    size, thinning: .54, smoothing: .53, streamline: closed ? .19 : .31, simulatePressure: false,
    last: true, start: { taper: closed ? 0 : taper }, end: { taper: closed ? 0 : taper },
  });
  const path = new Path2D();
  const last = outline.at(-1);
  const first = outline[0];
  path.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
  for (const [i, [x, y]] of outline.entries()) {
    const [nx, ny] = outline[(i + 1) % outline.length];
    path.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  path.closePath();
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha *= opacity;
  ctx.fill(path);
  ctx.restore();
}

function shifted(points, dx, dy, sx = 1, sy = sx) {
  return points.map(([x, y]) => [x * sx + dx, y * sy + dy]);
}

// Each tile stores its atlas rectangle and where the local drawing origin sits inside it.
const tiles = {
  head:  [0, 0, 116, 114, 58, 57],
  shirt: [124, 0, 134, 178, 67, 10],
  coat:  [266, 0, 134, 178, 67, 10],
  hand:  [0, 125, 36, 34, 18, 17],
  blush: [42, 125, 43, 34, 21, 17],
  sweat: [91, 125, 25, 35, 12, 17],
  pain:  [0, 182, 76, 71, 38, 35],
  bowl:  [83, 182, 90, 51, 45, 13],
  bell:  [179, 182, 30, 30, 15, 15],
};
let washAtlas;

function prepareWashes() {
  if (washAtlas) return;
  const width = 406;
  const height = 258;
  const target = brush.createCanvas(width, height, { pixelDensity: displayDensity(), parent: null });
  brush.clear();
  const gl = target.getContext('webgl2');
  // Transparent pixels on a premultiplied surface must also have zero RGB.
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  brush.seed(204916);
  brush.noiseSeed(7733);
  brush.angleMode(brush.DEGREES);
  brush.noField();
  brush.noStroke();

  const wash = (key, boundary, color, alpha, bleed = .085, texture = .62, edge = .32) => {
    const [x, y, , , ox, oy] = tiles[key];
    brush.fill(color, Math.round(255 * alpha));
    brush.fillBleed(bleed, 'out', 37);
    brush.fillTexture(texture, edge, true, .10);
    brush.polygon(shifted(boundary, x + ox - width / 2, y + oy - height / 2));
  };

  wash('head', shifted(head, -1, .5, .968, .974), PAPER_SKIN, .99, .046, .28, .12);
  wash('shirt', shifted(body, -.8, 2.7, .959, .972), '#E8DEC8', .72, .12, .70, .39);
  wash('shirt', cubics([-46, 43], [-57, 67, -54, 110, -47, 130],
    [-38, 144, -22, 146, -17, 144], [-28, 126, -36, 104, -36, 85],
    [-35, 65, -39, 55, -46, 43]), '#CDBB98', .26, .16, .69, .21);
  wash('coat', shifted(body, 1.1, 2, .960, .976), '#F4F0E8', 1, .066, .38, .15);
  wash('coat', cubics([45, 28], [57, 48, 56, 81, 54, 109], [54, 134, 43, 146, 17, 151],
    [29, 136, 37, 110, 37, 78], [37, 54, 38, 40, 45, 28]), '#D1D7D7', .48, .13, .62, .25);
  wash('coat', cubics([-21, 6], [-9, 13, 9, 13, 21, 7], [19, 25, 9, 49, 0, 63],
    [-13, 47, -19, 24, -21, 6]), '#9CAFB6', .63, .055, .47, .23);
  wash('hand', shifted(hand, .4, .1, .94), PAPER_SKIN, 1, .040, .43, .19);
  wash('blush', ellipse(13.5, 7.1, -.22, 0, 34), '#E5A48C', .58, .23, .74, .18);
  wash('sweat', drop, '#91B4C4', .87, .11, .59, .27);
  wash('pain', ellipse(25, 23, -.13, .3, 42), '#D9897C', .55, .29, .75, .28);
  wash('pain', shifted(ellipse(16, 13, -.35, .5, 38), -2.5, 1), '#C97769', .28, .22, .65, .18);
  wash('bowl', shifted(dish, 0, -.15, .94, .97), '#C6AA89', .60, .12, .67, .35);
  wash('bowl', shifted(rim, 0, -.12, .97, .97), PAPER_SKIN, .98, .048, .34, .16);
  wash('bell', ellipse(6.1, 5.9, .14, .3, 27), '#B6C2C5', .98, .07, .45, .22);
  brush.render();

  const atlas = createRaster(width, height);
  atlas.getContext('2d').drawImage(target, 0, 0, atlas.width, atlas.height);
  washAtlas = atlas;
}

function stamp(ctx, key, x = 0, y = 0, scale = 1, opacity = 1) {
  if (opacity <= 0) return;
  const [sx, sy, width, height, ox, oy] = tiles[key];
  ctx.save();
  ctx.globalAlpha *= opacity;
  drawRasterCrop(ctx, washAtlas, sx, sy, width, height, x - ox * scale, y - oy * scale, width * scale, height * scale);
  ctx.restore();
}

// A symmetric quadratic with chord d and perpendicular control offset h has
// arc length (hypot(d,2h) + d²/(2h)*asinh(2h/d))/2.
function armCurve(shoulder, wrist, side) {
  const dx = wrist[0] - shoulder[0];
  const dy = wrist[1] - shoulder[1];
  const chord = Math.max(.001, Math.hypot(dx, dy));
  const target = Math.max(chord, ARM_LENGTH);
  let low = 0;
  let high = target;
  for (let i = 0; i < 18; i++) {
    const h = low + high;
    const length = .5 * (Math.hypot(chord, h) + chord * chord / h * Math.asinh(h / chord));
    if (length < target) low = h / 2;
    else high = h / 2;
  }
  const offset = side * (low + high) / (2 * chord);
  const [mx, my] = pointBetween(shoulder, wrist, .5);
  return [shoulder, [mx + dy * offset, my - dx * offset], wrist];
}

function drawArm(ctx, curve, side, bowlPosition, occlusion = 0) {
  const points = quadratic(...curve, 32);
  const phase = side < 0 ? 1 : 2.7;
  if (occlusion > 0) {
    const [x, y] = bowlPosition;
    const bowl = new Path2D();
    bowl.moveTo(x - 34, y);
    for (const [bx, by] of dishSilhouette) bowl.lineTo(x + bx, y + by);
    bowl.closePath();
    const outside = new Path2D(bowl);
    outside.rect(-250, -120, 510, 475);
    ctx.save();
    ctx.clip(outside, 'evenodd');
    drawInk(ctx, points, 5, { phase });
    ctx.restore();
    if (occlusion < 1) {
      ctx.save();
      ctx.clip(bowl);
      drawInk(ctx, points, 5, { phase, opacity: 1 - occlusion });
      ctx.restore();
    }
  } else {
    drawInk(ctx, points, 5, { phase });
  }
  const [, control, wrist] = curve;
  ctx.save();
  ctx.translate(...wrist);
  ctx.rotate(Math.atan2(wrist[1] - control[1], wrist[0] - control[0]) * .64);
  stamp(ctx, 'hand');
  drawInk(ctx, hand, 4.1, { closed: true, phase: side < 0 ? .1 : 1.2 });
  ctx.restore();
}

function figureSpace(x, y, angle = 0, sx = 1, sy = 1) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    apply(ctx) {
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.scale(sx, sy);
      ctx.translate(0, -PIVOT_Y);
    },
    point([px, py]) {
      const u = px * sx;
      const v = (py - PIVOT_Y) * sy;
      return [x + cos * u - sin * v, y + sin * u + cos * v];
    },
  };
}

const curve = (a, b, c) => quadratic(a, b, c, 24);
const joined = (a, b, c, d, e) => quadratic(a, b, c, 12).concat(quadratic(c, d, e, 12).slice(1));
const corner = (a, tip, b) => joined(a, pointBetween(a, tip, .5), tip, pointBetween(tip, b, .5), b);

const faces = {
  eat: {
    eyes: [curve([-24, -4], [-19, 2], [-15, -4]), curve([15, -4], [20, 2], [24, -4])],
    brows: [curve([-24, -12], [-19, -15], [-14, -12]), curve([14, -12], [19, -15], [24, -12])],
    brow: .28, mouth: curve([-7.7, 12], [0, 21], [8.1, 12]), blush: .50,
  },
  navel_pain: {
    eyes: [curve([-25, 0], [-20, -1], [-14, 0]), curve([14, 0], [19, -1], [25, 0])],
    brows: [curve([-26, -16], [-21, -13], [-13, -11]), curve([13, -11], [20, -13], [26, -16])],
    brow: .94, mouth: joined([-9, 16], [-5, 10], [0, 15], [5, 21], [9, 15]), blush: 0,
  },
  rlq_acute: {
    eyes: [corner([-29, -7], [-15, 0], [-27, 7]), corner([29, -7], [15, 0], [27, 7])],
    brows: [curve([-28, -19], [-23, -17], [-15, -15]), curve([15, -15], [22, -17], [28, -19])],
    brow: .86, mouth: curve([-11, 20], [-1, 12], [10, 19]), blush: 0,
  },
  recovered: {
    eyes: [curve([-27, -1], [-20, -12], [-13, -2]), curve([13, -2], [20, -12], [27, -1])],
    brows: [curve([-27, -14], [-20, -20], [-14, -15]), curve([14, -15], [20, -20], [27, -14])],
    brow: .26, mouth: curve([-11, 11], [0, 27], [11, 10.5]), blush: .58,
  },
};

const profiles = {
  eat:        { hunch: 0, shiver: 0, pain: 0, wrists: [[-58, 124], [58, 104]], dish: 1 },
  navel_pain: { hunch: .35, shiver: .12, pain: .43, wrists: [[-3, 99], [56, 123]], dish: 0 },
  rlq_acute:  { hunch: .85, shiver: .82, pain: 1, wrists: [[-29, 108], [-16, 127]], dish: 0 },
  recovered:  { hunch: 0, shiver: 0, pain: 0, wrists: [[-56, 125], [79, 131]], dish: 1 },
};

const patientHair = [
  curve([-25, -39], [-32, -51], [-41, -48]),
  curve([-10, -45], [-13, -62], [-25, -59]),
  curve([6, -45], [8, -60], [19, -56]),
];
const doctorHair = [
  curve([-35, -23], [-22, -35], [-9, -29]),
  curve([-7, -30], [14, -43], [35, -23]),
];

function drawHead(ctx, style, position, turn) {
  ctx.translate(...position);
  ctx.rotate(turn);
  stamp(ctx, 'head');
  drawInk(ctx, head, 4.9, { closed: true });
  for (const [i, arc] of (style === 'doctor' ? doctorHair : patientHair).entries()) {
    drawInk(ctx, arc, 4.2, { taper: 3.7, phase: i * 1.1 });
  }
}

function drawPatientFace(ctx, from, to, blend, distress, pain, phase) {
  const interpolate = (a, b) => a.map((point, i) => pointBetween(point, b[i], blend));
  const blush = mix(from.blush, to.blush, blend);
  stamp(ctx, 'blush', -29, 10, .83, blush);
  stamp(ctx, 'blush', 29, 10, .83, blush * .94);
  for (let i = 0; i < 2; i++) {
    drawInk(ctx, interpolate(from.brows[i], to.brows[i]), 3.15,
      { opacity: mix(from.brow, to.brow, blend), taper: 2.3, phase: 1.3 + i });
    drawInk(ctx, interpolate(from.eyes[i], to.eyes[i]), 3.85, { taper: 1.0, phase: .8 + i * 1.5 });
  }
  drawInk(ctx, interpolate(from.mouth, to.mouth), 3.85, { taper: 1.65 });
  for (const [i, offset] of [.27, .57].entries()) {
    const cycle = phase / TAU * .81 + offset;
    const fall = cycle - Math.floor(cycle);
    const opacity = Math.sin(Math.PI * fall) ** .64 * distress * (.45 + .55 * pain);
    stamp(ctx, 'sweat', 30.5 + i * 8.8, -27 + i * 12.6 + fall * 12, 1 - i * .21, opacity);
  }
}

function drawBowl(ctx, position, opacity, phase) {
  if (opacity <= 0) return;
  ctx.save();
  ctx.translate(...position);
  ctx.globalAlpha *= opacity;
  stamp(ctx, 'bowl');
  drawInk(ctx, dish.slice(0, 31), 4.65, { taper: 2.9 });
  drawInk(ctx, rim, 4.5, { closed: true, phase: 2.3 });
  const steam = [
    cubics([-10, -15], [-4, -22, -17, -23, -11, -32]),
    cubics([9, -16], [15, -26, 2, -28, 10, -38]),
  ];
  for (const [i, arc] of steam.entries()) {
    drawInk(ctx, shifted(arc, .8 * Math.sin(phase + i), -1.2 * Math.sin(phase + i)), 3.1,
      { color: '#70665B', opacity: .47, taper: 3.5 });
  }
  ctx.restore();
}

function startFigure(ctx, { x = 0, y = 0, scale = 1 }) {
  if (![x, y, scale].every(Number.isFinite) || scale <= 0) throw new RangeError('Invalid character position or scale');
  prepareWashes();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
}

/** x/y place the upright crown. breathPhase is in radians. fromPose and progress interpolate a pose change. */
export function drawMinimalPatient(ctx, opts = {}) {
  const { pose = 'eat', fromPose = pose, progress = 1, breathPhase = 0, seconds } = opts;
  if (!Object.hasOwn(profiles, pose) || !Object.hasOwn(profiles, fromPose)) throw new RangeError('Unknown patient pose');
  if (![progress, breathPhase, seconds ?? 0, opts.hunch ?? 0, opts.shiver ?? 0, opts.painLevel ?? 0].every(Number.isFinite)) {
    throw new RangeError('Patient motion parameters must be finite');
  }
  const t = limit(progress);
  const blend = t * t * (3 - 2 * t);
  const a = profiles[fromPose];
  const b = profiles[pose];
  const weight = key => mix(Number(fromPose === key), Number(pose === key), blend);
  const hunch = limit(opts.hunch ?? mix(a.hunch, b.hunch, blend));
  const pain = limit(opts.painLevel ?? mix(a.pain, b.pain, blend));
  const shiver = limit(opts.shiver ?? mix(a.shiver, b.shiver, blend));
  const breath = Math.sin(breathPhase);
  const tremorPhase = seconds === undefined ? breathPhase * 2.7 : TAU * 1.85 * seconds;
  const tremor = .64 * shiver * Math.sin(tremorPhase + .39);
  const distress = weight('rlq_acute');
  const torso = figureSpace(1.8 * tremor, 254 + .95 * tremor,
    -.68 * hunch + .013 * tremor, 1 + .014 * breath, 1 - .13 * hunch + .013 * breath);

  const arms = [-1, 1].map((side, i) => {
    const wrist = pointBetween(a.wrists[i], b.wrists[i], blend);
    return armCurve(torso.point([side * 46, 33]), torso.point(wrist), side);
  });
  const bowlOpacity = mix(a.dish, b.dish, blend);
  const bowlPosition = torso.point([81, 105]);
  const [hx, hy] = torso.point([0, 0]);
  const headPosition = [hx - 12 * hunch + 1.8 * tremor, hy - 46 + 12 * hunch + .9 * tremor];

  startFigure(ctx, opts);
  try {
    ctx.save();
    torso.apply(ctx);
    stamp(ctx, 'shirt');
    stamp(ctx, 'pain', mix(0, -24, distress), 100 + distress * 14, .79 + .20 * pain + .055 * Math.sin(2 * breathPhase),
      pain * (.83 + .14 * Math.sin(2 * breathPhase)));
    drawInk(ctx, body, 5.25, { closed: true, phase: 1.3 });
    drawInk(ctx, curve([-16, 9], [.2, 29], [17, 10]), 3.37, { taper: 3.4, opacity: .85 });
    ctx.restore();

    drawBowl(ctx, bowlPosition, bowlOpacity, breathPhase);
    drawArm(ctx, arms[0], -1);
    drawArm(ctx, arms[1], 1, bowlPosition, weight('recovered'));
    ctx.save();
    drawHead(ctx, 'patient', headPosition, -.30 * hunch + .035 * tremor);
    drawPatientFace(ctx, faces[fromPose], faces[pose], blend, distress, pain, breathPhase);
    ctx.restore();

    if (distress > 0) {
      const [mx, my] = torso.point([56, 23]);
      const opacity = distress * (.48 + .34 * shiver);
      drawInk(ctx, shifted(curve([8, -14], [16, -8], [14, 1]), mx, my + tremor), 3.6, { opacity, taper: 2.8 });
      drawInk(ctx, shifted(curve([17, -20], [27, -12], [25, -3]), mx, my + tremor), 3.6, { opacity, taper: 2.8 });
    }
  } finally {
    ctx.restore();
  }
  return { arms, head: headPosition };
}

const lens = ellipse(13.6, 12.25, -.06, .6, 35);

function drawDoctorFace(ctx) {
  stamp(ctx, 'blush', -27, 9.5, .7, .16);
  stamp(ctx, 'blush', 27, 9.5, .7, .16);
  for (const side of [-1, 1]) {
    const x = side * 17.7;
    drawInk(ctx, shifted(lens, x, -1), 3.2, { closed: true, opacity: .94, phase: x });
    drawInk(ctx, shifted(curve([-4, .3], [0, -5], [4.1, 0]), x, -1.4), 3.5, { taper: 1.45 });
  }
  drawInk(ctx, curve([-4.6, -1.5], [0, -5.5], [4.6, -1.7]), 3.1, { taper: 1.0 });
  drawInk(ctx, curve([-8.9, 14.4], [0, 24], [9.3, 13.6]), 3.69, { taper: 1.65 });
}

function drawCoat(ctx) {
  stamp(ctx, 'coat');
  drawInk(ctx, body, 5.15, { closed: true, phase: 1.3 });
  const editorial = { opacity: .84, taper: 1.75 };
  drawInk(ctx, cubics([-19, 6], [-23, 13, -28, 17, -30, 25], [-24, 24, -22, 24, -19, 24],
    [-20, 27, -24, 30, -25, 34], [-19, 44, -5, 61, .5, 67]), 3.45, editorial);
  drawInk(ctx, cubics([20, 6], [24, 13, 30, 18, 32, 25], [26, 25, 24, 24, 20, 24],
    [22, 28, 25, 31, 25, 34], [19, 46, 7, 59, .5, 67]), 3.45, editorial);
  drawInk(ctx, curve([-11, 14], [-1, 23], [10, 14]), 3.1, { opacity: .67, taper: 2.1 });
  drawInk(ctx, cubics([30, 84], [35, 83, 44, 84, 48, 83], [47, 89, 49, 95, 46, 100],
    [41, 102, 35, 102, 30, 99], [30, 94, 29, 89, 30, 84]), 3.05, { closed: true, opacity: .72 });
  drawInk(ctx, curve([39, 84], [40, 77], [40.2, 72]), 3.22, { color: '#555B5D', taper: 1.5 });
  drawInk(ctx, curve([40, 76], [43, 76], [43, 80]), 3.02, { color: '#555B5D', taper: 1.6 });

  const tube = { color: '#4B4A48', opacity: .93, taper: 2 };
  drawInk(ctx, cubics([-14, 19], [-24, 25, -26, 39, -21, 49], [-16, 61, -2, 65, 7, 54],
    [13, 48, 12, 32, 9, 23]), 4.7, tube);
  drawInk(ctx, cubics([-8, 60], [-6, 77, -3, 92, 11, 96]), 4.65, tube);
  stamp(ctx, 'bell', 15, 97, 1.03);
  drawInk(ctx, shifted(ellipse(7.3, 6.85, .16, .7, 30), 15, 97), 3.05,
    { closed: true, color: '#555957', phase: 2.1 });
}

/** x/y place the upright crown. breathPhase is in radians and nod sets the movement strength. */
export function drawMinimalDoctor(ctx, opts = {}) {
  const { pose = 'explain', breathPhase = 0, nod = .65 } = opts;
  if (pose !== 'explain') throw new RangeError('Unknown doctor pose');
  if (![breathPhase, nod].every(Number.isFinite)) throw new RangeError('Doctor motion parameters must be finite');
  const breath = Math.sin(breathPhase);
  const dip = limit(nod) * Math.sin(breathPhase * 1.70 + .5);
  const torso = figureSpace(0, 254, .019 * breath, 1 + .013 * breath, 1 + .016 * breath);
  const arms = [
    armCurve(torso.point([-46, 32]), torso.point([-55, 128]), -1),
    armCurve(torso.point([46, 33]), torso.point([109 + 2 * breath, 49 - 5 * dip]), -1),
  ];
  const [x, y] = torso.point([0, 0]);
  const headPosition = [x + 2.2 * dip, y - 46.5 + 3.1 * dip];

  startFigure(ctx, opts);
  try {
    ctx.save();
    torso.apply(ctx);
    drawCoat(ctx);
    ctx.restore();
    for (const [i, arm] of arms.entries()) drawArm(ctx, arm, i ? 1 : -1);
    ctx.save();
    drawHead(ctx, 'doctor', headPosition, -.062 * dip);
    drawDoctorFace(ctx);
    ctx.restore();
  } finally {
    ctx.restore();
  }
  return { arms, head: headPosition };
}
