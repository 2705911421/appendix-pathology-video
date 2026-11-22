import { clamp, lerp } from './geometry.js';
import { inkOutline } from './ink.js';
import { patientHeadArt } from './patient.js';
import { createRaster, rasterScale } from './raster.js';
import { displayDensity } from '../renderProfile.js';

const HEAD_HEIGHT = 128;
const HEAD_WIDTH = 104;
const HEAD_SCALE = 1.12;
const NECK_WIDTH = 42;
const NECK_HEIGHT = 26;
const SHOULDER_HALF = 2.15 * HEAD_WIDTH / 2;
const TORSO_HEIGHT = 2.1 * HEAD_HEIGHT;
const CUFF_HALF = 42 / 2;
const FOREARM_HALF = 34 / 2;
const cuffY = -190;
const navel = { x: 0, y: -86 };
const outlines = new Map();
const shapes = new Map();
const ink = '#51433B';
const fabricInk = '#796353';
let drawing;

function shape(path) {
  if (!shapes.has(path)) shapes.set(path, new Path2D(path));
  return shapes.get(path);
}

function fill(ctx, form, color, edge, width = 1.55) {
  const path = typeof form === 'string' ? shape(form) : form;
  ctx.fillStyle = color;
  ctx.fill(path);
  if (edge) {
    ctx.strokeStyle = edge;
    ctx.lineWidth = width;
    ctx.stroke(path);
  }
}

function mark(ctx, source, color, size, seed = 87) {
  const key = [source, size, seed].join('|');
  if (!outlines.has(key)) {
    outlines.set(key, new Path2D(inkOutline(source, { size, seed, taperStart: 3, taperEnd: 6 })));
  }
  fill(ctx, outlines.get(key), color);
}

function oval(ctx, x, y, rx, ry, color) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function wash(ctx, region, pigment, name, area, opacity) {
  if (!pigment) return;
  ctx.save();
  ctx.clip(typeof region === 'string' ? shape(region) : region);
  ctx.globalAlpha *= opacity;
  pigment(ctx, name, ...area);
  ctx.restore();
}

function shade(ctx, points, stops) {
  const color = ctx.createLinearGradient(...points);
  for (const [offset, value] of stops) color.addColorStop(offset, value);
  return color;
}

function shirtShape(lift, tuck) {
  const y = -TORSO_HEIGHT + lift;
  const top = new Path2D();
  top.moveTo(-NECK_WIDTH / 2, y - 1);
  top.bezierCurveTo(-48, y + 2, -69, y + 5, -89, y + 14);
  top.quadraticCurveTo(-106, y + 20 + tuck * 4, -SHOULDER_HALF, y + 40 + tuck * 5);
  top.quadraticCurveTo(-112, y + 59, -113, cuffY - 4);
  top.quadraticCurveTo(-98, cuffY + 9, -70, cuffY + 1);
  top.quadraticCurveTo(-74, cuffY + 21, -74, -133);
  top.bezierCurveTo(-71, -95, -73, -62, -80, -27);
  top.quadraticCurveTo(-83, -7, -82, 2);
  top.quadraticCurveTo(-41, 16, -1, 9);
  top.quadraticCurveTo(33, 12, 82, 2);
  top.bezierCurveTo(79, -19, 76, -54, 75, -87);
  top.quadraticCurveTo(79, -133, 72, cuffY + 1);
  top.quadraticCurveTo(94, cuffY + 8, 113, cuffY - 4);
  top.quadraticCurveTo(113, y + 61, SHOULDER_HALF, y + 40 + tuck * 4);
  top.quadraticCurveTo(107, y + 20, 89, y + 14);
  top.bezierCurveTo(67, y + 5, 46, y + 1, NECK_WIDTH / 2, y - 1);
  top.quadraticCurveTo(1, y + 10, -NECK_WIDTH / 2, y - 1);
  top.closePath();
  return top;
}

function drawFabric(ctx, lift, tuck, pigment) {
  const y = -TORSO_HEIGHT + lift;
  const shirt = shirtShape(lift, tuck);
  fill(ctx, 'M-79 -7 Q1 -16 78 -7 Q88 7 90 34 H-88 Q-88 12 -79 -7Z',
    '#A89B8B', '#7E7467', 1.4);
  fill(ctx, shirt, shade(ctx, [-88, y, 96, -12], [
    [0, '#F2E4C8'], [.35, '#FAF0DC'], [.75, '#F0E4CB'], [1, '#D8BE99'],
  ]), ink, 1.8);
  wash(ctx, shirt, pigment, 'linen', [-150, y - 35, 254, 321], .33);
  wash(ctx, shirt, pigment, 'wood', [29, y + 23, 151, 285], .15);
  ctx.save();
  ctx.clip(shirt);
  fill(ctx, 'M-112 -265 C-99 -227 -80 -211 -77 -172 Q-72 -144 -80 -124 L-100 -141 L-136 -204Z',
    '#AE876B20');
  fill(ctx, 'M83 -265 Q67 -238 71 -193 C101 -163 72 -137 76 -83 C82 -53 64 -30 80 9 L126 11 L129 -253Z',
    '#A7815A22');
  mark(ctx, 'M-79 -181 Q-84 -163 -76 -143', '#AB8D72', 1.85);
  mark(ctx, 'M76 -182 Q85 -158 77 -147', '#B2987E', 1.85);
  mark(ctx, 'M-79 -51 Q-59 -72 -42 -62', '#B3997C', 1.85, 97);
  mark(ctx, 'M74 -41 Q55 -22 38 -30', '#A2866D', 1.85);
  mark(ctx, 'M-66 -20 Q-47 -11 -28 -15', '#BAA085', 1.55);
  ctx.restore();
  mark(ctx, 'M-109 -202 Q-93 -193 -74 -197', fabricInk, 2.25);
  mark(ctx, 'M74 -198 Q93 -194 109 -202', fabricInk, 2.25);
}

function neck(ctx, lift, pigment) {
  const y = -TORSO_HEIGHT + lift;
  const half = NECK_WIDTH / 2;
  const path = new Path2D();
  path.moveTo(-half * .59, y - NECK_HEIGHT - 13);
  path.bezierCurveTo(-half * .69, y - 27, -half * .76, y - 8, -half, y);
  path.quadraticCurveTo(0, y + 17, half, y);
  path.bezierCurveTo(half * .75, y - 8, half * .67, y - 27, half * .57, y - NECK_HEIGHT - 13);
  path.quadraticCurveTo(0, y - NECK_HEIGHT - 18, -half * .59, y - NECK_HEIGHT - 13);
  path.closePath();
  fill(ctx, path, shade(ctx, [-24, y, 23, y - 26], [
    [0, '#EACBA7'], [.56, '#E6C09C'], [1, '#BD947E'],
  ]));
  wash(ctx, path, pigment, 'skin', [-31, y - 41, 66, 57], .23);

  ctx.save();
  ctx.translate(0, y);
  mark(ctx, 'M-13 -31 C-15 -21 -15 -9 -21 0', '#826957AA', 1.85);
  mark(ctx, 'M12 -33 C14 -22 15 -8 21 0', '#826957AA', 1.85);
  mark(ctx, 'M-22 1 Q0 19 22 0', '#74614E', 2.2);
  mark(ctx, 'M-25 6 Q0 23 26 5', '#B09778', 1.85);
  ctx.restore();
}

const rightShoulder = -91;

// The right arm keeps its two authored Bézier poses.
const rightA = 'M' + (rightShoulder - CUFF_HALF) + ' ' + cuffY
  + ' C-114 -158 -107 -129 -96 -112 C-84 -91 -56 ' + (-89 + FOREARM_HALF) + ' -24 -73 Q-18 -75 -20 -84'
  + ' C-18 -91 -21 -96 -30 -98 C-48 ' + (-89 - FOREARM_HALF) + ' -64 -105 -69 -120 C-75 -142 -72 -170 '
  + (rightShoulder + CUFF_HALF) + ' ' + cuffY + 'Z';
const rightB = 'M' + (rightShoulder - CUFF_HALF) + ' ' + cuffY
  + ' C-115 -156 -111 -125 -107 -108 C-99 -84 -81 ' + (-76 + FOREARM_HALF) + ' -64 -58 Q-58 -56 -55 -65'
  + ' C-54 -72 -57 -77 -62 -79 C-77 -86 -80 -101 -82 -118 C-84 -143 -75 -171 '
  + (rightShoulder + CUFF_HALF) + ' ' + cuffY + 'Z';
function blendPath(from, to) {
  const number = /-?\d+(?:\.\d+)?/gu;
  const targets = to.match(number).map(Number);
  return amount => {
    let i = 0;
    return new Path2D(from.replace(number, value => lerp(Number(value), targets[i++], amount).toFixed(2)));
  };
}

const rightArm = blendPath(rightA, rightB);

const fingersOpen = 'M-4 -8 C1 -11 4 -14 10 -15 C15 -16 21 -14 21 -11 Q21 -7 16 -7'
  + ' C22 -8 28 -10 34 -8 C37 -7 37 -4 33 -3 C37 -4 42 -4 42 0 C43 3 38 4 32 5'
  + ' C37 5 40 7 38 10 C36 12 32 12 27 12 C33 14 32 17 27 17 C16 18 6 14 -3 9Z';
const fingersTense = 'M-4 -8 C1 -11 6 -16 11 -15 C16 -16 20 -15 20 -11 Q20 -8 16 -7'
  + ' C21 -9 27 -11 32 -10 C36 -9 36 -6 32 -4 C38 -6 41 -4 40 -1 C39 2 35 4 30 5'
  + ' C35 5 37 7 35 10 C32 13 29 13 25 12 C29 14 28 17 24 17 C16 17 6 14 -3 9Z';
const hand = blendPath(fingersOpen, fingersTense);

function drawHand(ctx, pose, wrist, angle, facing) {
  ctx.save();
  ctx.translate(wrist.x, wrist.y);
  ctx.rotate(angle);
  ctx.scale(1, facing);
  fill(ctx, hand(pose), '#EAC6A0', '#826351', 1.45);
  mark(ctx, 'M9 -10 Q13 -14 19 -11', '#9D705C', 1.65);
  mark(ctx, 'M21 -3 Q27 -5 32 -4', '#A47862', 1.55);
  mark(ctx, 'M21 4 Q29 2 34 3', '#A47862', 1.55);
  mark(ctx, 'M18 10 Q22 9 28 10', '#A47862', 1.4);
  ctx.restore();
}

function drawRightArm(ctx, pose, pigment) {
  const arm = rightArm(pose);
  const color = shade(ctx, [-130, -195, -17, -64], [
    [0, '#D3A081'], [.44, '#EFCEAA'], [.83, '#EAC7A3'], [1, '#CE9A80'],
  ]);
  fill(ctx, arm, color, ink, 1.5);
  wash(ctx, arm, pigment, 'skin', [-135, -218, 129, 172], .24);
  const wrist = { x: lerp(-23, -62, pose), y: lerp(-85, -68, pose) };
  drawHand(ctx, pose, wrist, lerp(-.12, -.43, pose), 1);
}

const UPPER_ARM_LENGTH = 70;
const FOREARM_LENGTH = 65;
const radians = degrees => degrees * Math.PI / 180;

function along(point, direction, distance) {
  return { x: point.x + direction.x * distance, y: point.y + direction.y * distance };
}

function direction(angle) {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function normal(vector) {
  return { x: -vector.y, y: vector.x };
}

function leftArmPose(pose, lift) {
  const shoulder = { x: 91, y: cuffY - 15 + lift * .30 };
  const upperAngle = radians(lerp(74, 92, pose));
  const forearmAngle = radians(lerp(42, 150, pose));
  const upper = direction(upperAngle);
  const forearm = direction(forearmAngle);
  const elbow = along(shoulder, upper, UPPER_ARM_LENGTH);
  const wrist = along(elbow, forearm, FOREARM_LENGTH);
  return {
    shoulder,
    elbow,
    wrist,
    upper,
    forearm,
    elbowTangent: direction((upperAngle + forearmAngle) / 2),
    handAngle: forearmAngle + radians(lerp(-38, 25, pose)),
  };
}

function leftArmShape({ shoulder, elbow, wrist, upper, forearm, elbowTangent }) {
  const upperNormal = normal(upper);
  const bendNormal = normal(elbowTangent);
  const forearmNormal = normal(forearm);
  const outline = new Path2D();
  const curveTo = (first, second, end) =>
    outline.bezierCurveTo(first.x, first.y, second.x, second.y, end.x, end.y);
  const outsideShoulder = along(shoulder, upperNormal, -CUFF_HALF);
  const outsideElbow = along(elbow, bendNormal, -FOREARM_HALF);
  const outsideWrist = along(wrist, forearmNormal, -9);
  const insideShoulder = along(shoulder, upperNormal, CUFF_HALF);
  const insideElbow = along(elbow, bendNormal, FOREARM_HALF);
  const insideWrist = along(wrist, forearmNormal, 9);
  outline.moveTo(outsideShoulder.x, outsideShoulder.y);
  curveTo(along(outsideShoulder, upper, 26), along(outsideElbow, elbowTangent, -17), outsideElbow);
  curveTo(along(outsideElbow, elbowTangent, 17), along(outsideWrist, forearm, -18), outsideWrist);
  outline.lineTo(insideWrist.x, insideWrist.y);
  curveTo(along(insideWrist, forearm, -22), along(insideElbow, elbowTangent, 15), insideElbow);
  curveTo(along(insideElbow, elbowTangent, -16), along(insideShoulder, upper, 24), insideShoulder);
  outline.closePath();
  return outline;
}

function drawLeftArm(ctx, pose, lift, pigment) {
  const joints = leftArmPose(pose, lift);
  const arm = leftArmShape(joints);
  const color = shade(ctx, [75, -196, 159, -86], [
    [0, '#D3A081'], [.44, '#EFCEAA'], [.83, '#EAC7A3'], [1, '#CE9A80'],
  ]);

  ctx.save();
  ctx.clip(shape('M-30 -189 H72 Q94 -182 113 -194 L225 -197 V35 H-30Z'));
  fill(ctx, arm, color, ink, 1.5);
  wash(ctx, arm, pigment, 'skin', [25, -222, 173, 182], .24);
  drawHand(ctx, pose, joints.wrist, joints.handAngle, -1);
  ctx.restore();
  return { shoulder: joints.shoulder, elbow: joints.elbow, wrist: joints.wrist };
}

function expression(ctx, grimace, seconds) {
  // Coordinates here describe the original illustration's face before fitting it to 104 × 128.
  const blink = Math.exp(-Math.pow(((seconds + .93) % 5.1 - 2.55) * 19, 2));
  for (const [x, width, y] of [[1013, 23, 283], [1048, 33, 280]]) {
    ctx.beginPath();
    ctx.moveTo(x, y + 1.9);
    ctx.quadraticCurveTo(x + width * .47, y - 8 + 5 * grimace, x + width, y + 8 * grimace);
    ctx.strokeStyle = '#55433A';
    ctx.lineWidth = 4.3 + grimace * 1.1;
    ctx.stroke();
    const closed = clamp(.78 * grimace + blink);
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 17);
    ctx.quadraticCurveTo(x + width * .52, y + 10 + 8 * closed, x + width - 2, y + 16);
    ctx.strokeStyle = '#59453B';
    ctx.lineWidth = 2.8;
    ctx.stroke();
    if (closed < .9) oval(ctx, x + width * .45, y + 17, 2.45, 3.5 * (1 - closed), '#4F3B34');
  }
  mark(ctx, 'M1008 296 Q1006 313 997 328 Q993 338 1013 339', '#80604E', 4.3);
  mark(ctx, 'M1024 337 Q1032 335 1035 332', '#876456', 3.5);
  ctx.beginPath();
  ctx.moveTo(1026, 352 + 3 * grimace);
  ctx.quadraticCurveTo(1040, 354 - 12 * grimace, 1058, 352 + 8 * grimace);
  ctx.strokeStyle = '#7B514A';
  ctx.lineWidth = 3.1 + 1.1 * grimace;
  ctx.stroke();
  mark(ctx, 'M1036 366 Q1044 369 1055 366', '#B08775', 3.8);
}

function drawSweat(ctx, grimace, seconds) {
  const sweat = clamp((grimace - .65) / .24);
  if (sweat <= 0) return;
  for (const i of [0, 1]) {
    const fall = (seconds / (2.8 + .7 * i) + i * .39) % 1;
    const x = i ? 1015 - 8 * fall : 1121 + 17 * fall;
    const y = (i ? 278 : 271) + 61 * fall;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(i ? .72 : 1, i ? .72 : 1);
    ctx.globalAlpha *= sweat * Math.sin(fall * Math.PI);
    fill(ctx, 'M0 -8 Q13 4 6 11 Q-1 16 -7 10 Q-11 4 0 -8Z', '#A2C5CE', '#7FA4AE', 1.75);
    oval(ctx, -1.2, 4, 1.8, 3.1, '#EAF5F4');
    ctx.restore();
  }
}

const hair = 'M1007 298 C995 291 993 276 990 259 C982 250 975 236 975 221'
  + ' C975 207 985 193 997 181 C1012 159 1037 141 1066 137'
  + ' C1086 128 1110 130 1129 135 C1158 134 1179 147 1195 165'
  + ' C1214 181 1228 208 1228 233 C1228 257 1207 279 1180 297'
  + ' C1167 289 1155 295 1145 307 C1145 290 1149 271 1144 254'
  + ' C1129 253 1105 235 1092 221 C1078 235 1052 248 1017 251'
  + ' C1013 270 1013 288 1007 298Z';

function head(ctx, lift, grimace, seconds, pigment) {
  const { face, ear } = patientHeadArt;
  const chin = -TORSO_HEIGHT + lift - NECK_HEIGHT + 2;
  ctx.save();
  ctx.translate(0, chin);
  ctx.scale(HEAD_SCALE * HEAD_WIDTH / 253, HEAD_SCALE * HEAD_HEIGHT / 280);
  ctx.translate(-1101.5, -408);
  const flesh = shade(ctx, [1020, 216, 1172, 390], [
    [0, '#F5DDC2'], [.52, '#EFCEAE'], [1, '#D8AA90'],
  ]);
  fill(ctx, face, flesh, ink, 3.4);
  wash(ctx, face, pigment, 'skin', [989, 217, 208, 190], .24);
  wash(ctx, face, pigment, 'pink', [1007, 293, 119, 73], .20 + grimace * .08);
  fill(ctx, ear, '#E9C3A5', '#8C6D5B', 3.1);
  mark(ctx, 'M1156 303 Q1171 290 1171 306 Q1167 315 1160 314', '#A77862', 3.35);
  fill(ctx, hair, shade(ctx, [994, 160, 1210, 300], [
    [0, '#746258'], [.52, '#534741'], [1, '#493F3B'],
  ]), '#493E36', 3.35);
  wash(ctx, hair, pigment, 'linen', [976, 117, 272, 206], .21);
  wash(ctx, hair, pigment, 'black', [1051, 167, 207, 171], .19);
  for (const [i, stroke] of [
    'M986 220 C1005 181 1044 161 1080 156 Q1108 152 1127 162',
    'M996 234 C1018 200 1060 178 1099 178 Q1122 178 1140 188',
    'M1014 240 C1039 218 1068 205 1097 200 Q1116 199 1135 208',
    'M1097 215 C1114 228 1137 234 1166 231',
    'M1137 165 Q1175 173 1191 206',
    'M1160 243 Q1183 250 1201 230',
    'M1188 266 Q1204 252 1210 231',
  ].entries()) mark(ctx, stroke, i < 5 ? '#A58A76' : '#B2937A', i % 3 === 0 ? 5.1 : 3.6, 131 + i);
  expression(ctx, grimace, seconds);
  drawSweat(ctx, grimace, seconds);
  ctx.restore();
}

function bodyLayer() {
  if (!drawing) {
    const canvas = createRaster(440, 510, Math.max(2, displayDensity()));
    drawing = { canvas, ctx: canvas.getContext('2d') };
  }
  return drawing;
}

/** Draw the portrait in world space with a hip pivot and a fixed-length left arm. */
export function drawPatientRig(ctx, state) {
  const { hipX, hipY, pigment } = state;
  const time = state.seconds ?? 0;
  const pose = clamp(state.poseBlend ?? 0);
  const bend = clamp(state.hunch ?? pose);
  const grimace = clamp(state.grimace ?? pose);
  const scale = state.scale ?? 1;
  const lift = (1.4 + 1.2 * pose) * Math.sin(time * 2.4)
    + pose * 2.5 * Math.sin(time * 5.1 - .4);
  const spineAngle = -9 * bend;
  const angle = spineAngle * Math.PI / 180;
  const { canvas, ctx: art } = bodyLayer();

  const density = rasterScale(canvas);
  art.setTransform(density.x, 0, 0, density.y, 200 * density.x, 455 * density.y);
  art.clearRect(-200, -455, 440, 510);
  art.lineCap = 'round';
  art.lineJoin = 'round';
  drawFabric(art, lift, pose, pigment);
  neck(art, lift, pigment);
  state.paintAbdomen?.(art, navel);
  const leftArm = drawLeftArm(art, clamp(state.leftPoseBlend ?? pose), lift, pigment);
  drawRightArm(art, pose, pigment);
  head(art, lift, grimace, time, pigment);

  art.globalCompositeOperation = 'destination-in';
  art.fillStyle = shade(art, [0, -40, 0, 29], [[0, '#FFFFFF'], [.45, '#FFFFFFD6'], [1, '#FFFFFF00']]);
  art.fillRect(-200, -455, 440, 510);
  art.globalCompositeOperation = 'source-over';

  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.drawImage(canvas, -200, -455, 440, 510);
  ctx.restore();
  return {
    navel: { x: hipX - navel.y * scale * Math.sin(angle), y: hipY + navel.y * scale * Math.cos(angle) },
    spineAngle,
    leftArm,
  };
}
