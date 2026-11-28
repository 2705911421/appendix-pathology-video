import { RED, inkOutline, lerp, samplePath } from '../../shared/canvasCore.js';
import { SANS_FONT } from '../../shared/fonts.js';
import { phase } from '../../shared/timelineHelper.js';
import { dot, fade, fill, ink, letter, pathOf, stroke } from './paint.js';

const center = { x: 1340, y: 465 };
const U = { x: 0, y: -106 };
const A = { x: -155, y: 30 };
const M = { x: lerp(A.x, U.x, 1 / 3), y: lerp(A.y, U.y, 1 / 3) };
const umber = '#5B5A56';
const anatomyOutline = 'M-116 -232 C-101 -197 -107 -163 -121 -144 C-132 -128 -132 -112 -129 -95 C-127 -70 -153 -57 -167 -31'
  + ' C-185 2 -201 38 -197 75 C-195 113 -181 154 -158 180 C-128 217 -71 221 -25 196'
  + ' Q0 174 25 196 C71 221 128 217 158 180 C181 154 195 113 197 75 C201 38 185 2 167 -31'
  + ' C153 -57 127 -70 129 -95 C132 -112 132 -128 121 -144 C107 -163 101 -197 116 -232Z';
const flank = 'M-111 -202 C-107 -174 -116 -153 -124 -138 C-135 -114 -129 -100 -129 -92'
  + ' Q-135 -64 -160 -42 C-174 -23 -190 18 -195 48 C-200 101 -177 157 -154 180';
const wing = 'M-155 30 C-157 26 -168 26 -176 17 C-183 11 -185 3 -182 -6 C-175 -29 -151 -43 -118 -41'
  + ' C-83 -41 -50 -26 -30 -10 C-19 1 -24 23 -18 43 Q-13 60 -5 75'
  + ' C-1 83 -6 98 -21 98 Q-34 94 -47 91 C-61 92 -64 115 -81 126'
  + ' C-97 135 -120 121 -127 109 C-131 102 -130 89 -137 80'
  + ' C-147 68 -143 49 -154 40 Q-163 34 -155 30Z';
const brow = 'M-178 -5 C-168 -24 -139 -38 -110 -33 C-71 -27 -44 -13 -36 5';
const socket = 'M-137 46 Q-125 32 -112 45 Q-99 59 -115 70 Q-132 77 -139 64Z';
const foramen = 'M-100 84 C-85 72 -70 79 -67 93 C-65 104 -81 117 -94 110 C-104 107 -110 92 -100 84Z';
const sacrum = 'M-32 -14 Q0 -28 32 -14 C30 10 13 36 2 53 Q-11 48 -22 25 Q-33 5 -32 -14Z';
const cecum = 'M-11 -45 C-17 -40 -14 -30 -15 -22 C-15 -12 -7 -9 0 -11'
  + ' C9 -13 13 -23 9 -32 Q7 -38 14 -41 Q11 -47 3 -45 Q-5 -42 -6 -46Z';
const appendix = 'M-5 -15 C-7 -8 -5 -4 -4 1 C-3 10 4 17 12 16 C18 15 21 9 20 4'
  + ' Q19 0 16 1 Q13 2 15 6 Q15 11 10 11 C5 10 4 4 4 0 C3 -7 5 -11 5 -15Z';

const routeD = 'M' + U.x + ' ' + U.y + ' L' + M.x + ' ' + M.y;
const routeAngle = Math.atan2(M.y - U.y, M.x - U.x);
let guide;

function washPelvis(ctx, pigment, localized) {
  const linen = ctx.createLinearGradient(0, -232, 0, 215);
  for (const [offset, color] of [
    [0, '#EBE1CF00'], [.12, '#EBE1CF7D'], [.52, '#ECE0CFC3'], [.76, '#E5D8C7A9'],
    [.90, '#E9DFCD54'], [1, '#EAE2D100'],
  ]) linen.addColorStop(offset, color);
  fill(ctx, anatomyOutline, linen);
  fade(ctx, .17, () => {
    ctx.clip(pathOf(anatomyOutline));
    pigment(ctx, 'linen', -233, -217, 474, 418);
  });

  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ink(ctx, flank, '#A095858C', 2.35, 1005);
    fill(ctx, wing, '#BAD0D4AB');
    fade(ctx, .79, () => {
      ctx.clip(pathOf(wing));
      pigment(ctx, 'pelvis', -195, -68, 205, 221);
    });
    stroke(ctx, wing, '#7A97A3', 1.85);
    ink(ctx, brow, '#718D9C', 2.75, 1017);
    ink(ctx, 'M-158 9 Q-132 -22 -96 -10 Q-67 1 -56 18', '#8FA8B3', 1.9, 1021);
    ink(ctx, 'M-155 31 Q-141 33 -128 55', '#7E99A3', 2.1, 1033);
    fill(ctx, socket, '#8CA7B281');
    stroke(ctx, socket, '#738E9AB7', 1.3);
    fill(ctx, foramen, '#F1EBDDCC');
    stroke(ctx, foramen, '#829BA4', 1.6);
    ink(ctx, 'M-63 101 Q-43 81 -26 92 L-6 98', '#79939F', 2.2, 1039);
    ctx.restore();
  }
  fill(ctx, sacrum, '#AFC0C4BD');
  stroke(ctx, sacrum, '#8299A1', 1.7);
  for (const d of ['M-26 -3 Q0 -12 26 -3', 'M-22 9 Q0 2 22 9', 'M-17 22 Q0 14 17 22', 'M-12 33 Q0 30 12 33']) {
    ink(ctx, d, '#8BA1A8', 1.8, 1042);
  }
  fill(ctx, 'M-6 82 Q0 80 6 82 L6 98 Q0 102 -6 98Z', '#D5D6C9');
  ink(ctx, 'M0 83 L0 98', '#778C94', 2.05, 1057);
  ink(ctx, 'M-64 112 Q-46 137 -25 131 Q-13 126 0 130', '#AF9F8977', 1.6);
  ink(ctx, 'M64 112 Q46 137 25 131 Q13 126 0 130', '#AF9F8977', 1.6);

  fade(ctx, localized, () => {
    ctx.translate(M.x, M.y);
    fill(ctx, cecum, '#BAB0A384');
    fade(ctx, .19, () => {
      ctx.clip(pathOf(cecum));
      pigment(ctx, 'skin', -25, -49, 50, 42);
    });
    stroke(ctx, cecum, '#81746995', 1.55);
    ink(ctx, 'M-13 -34 Q-6 -30 6 -35', '#938578A2', 1.8);
    ink(ctx, 'M-13 -24 Q-6 -20 6 -25', '#938578A2', 1.55);
    fill(ctx, appendix, '#C3A4978C');
    stroke(ctx, appendix, '#8B776DA2', 1.55);
  });
}

export function paintPainHalo(ctx, pigment, point, radius, opacity, tightness = 0) {
  fade(ctx, opacity, () => {
    const { x, y } = point;
    const cloud = ctx.createRadialGradient(x, y, 1, x, y, radius);
    cloud.addColorStop(0, 'rgba(177, 43, 37, ' + lerp(.28, .65, tightness) + ')');
    cloud.addColorStop(.53, 'rgba(198, 85, 72, ' + lerp(.17, .27, tightness) + ')');
    cloud.addColorStop(1, '#CC625500');
    dot(ctx, x, y, radius, radius, cloud);
    const washSize = radius * 2;
    pigment(ctx, 'rose', x - radius, y - radius, washSize, washSize);
    if (tightness > 0) {
      const width = lerp(radius * 1.12, 14, tightness);
      pigment(ctx, 'scarlet', x - width / 2, y - width / 2, width, width);
    }
  });
}

function leader(ctx, from, to, color, width = 2.25) {
  ctx.save();
  ctx.translate(from.x, from.y);
  ctx.rotate(Math.atan2(to.y - from.y, to.x - from.x));
  ctx.scale(Math.hypot(to.x - from.x, to.y - from.y) / 100, 1);
  ink(ctx, 'M0 0 Q58 -5 100 0', color, width, 1073);
  ctx.restore();
}

function pointsOnRoute() {
  if (!guide) {
    const points = samplePath(routeD, 2.35);
    const dashed = [];
    for (let i = 0; i + 5 < points.length; i += 9) {
      const [a, b, c, d] = [points[i], points[i + 2], points[i + 3], points[i + 5]];
      const curve = 'M' + a.join(' ') + ' C' + b.join(' ') + ' ' + c.join(' ') + ' ' + d.join(' ');
      dashed.push({
        start: i / (points.length - 1),
        shape: new Path2D(inkOutline(curve, { size: 5.2, seed: 1090 + i, taperStart: 0, taperEnd: 0 })),
      });
    }
    const arrowhead = new Path2D(inkOutline('M-13 -7 Q-5 -4 0 0 Q-5 4 -13 7',
      { size: 4.2, seed: 1147, taperStart: 1, taperEnd: 1 }));
    guide = { dashed, arrowhead };
  }
  return guide;
}

function routeAt(progress) {
  return progress === 1 ? M : { x: lerp(U.x, M.x, progress), y: lerp(U.y, M.y, progress) };
}

function markNavel(ctx, alpha) {
  fade(ctx, alpha, () => {
    dot(ctx, U.x, U.y, 4.2, 4.2, '#4C585C');
    leader(ctx, { x: 7, y: -116 }, { x: 104, y: -132 }, '#77848A', 2.0);
    letter(ctx, '肚脐', 116, -128, { size: 29, color: '#536369', weight: 650 });
  });
}

function markLandmarks(ctx, alpha) {
  const length = Math.hypot(U.x - A.x, U.y - A.y);
  const nx = (A.y - U.y) / length;
  const ny = (U.x - A.x) / length;
  fade(ctx, alpha, () => {
    ctx.save();
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.moveTo(U.x, U.y);
    ctx.lineTo(A.x, A.y);
    ctx.lineWidth = 2.05;
    ctx.strokeStyle = '#54493F';
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    for (const point of [A, M, U]) {
      ctx.moveTo(point.x - nx * 5, point.y - ny * 5);
      ctx.lineTo(point.x + nx * 5, point.y + ny * 5);
    }
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#5A5248BD';
    ctx.stroke();
    for (const [start, end, text, offset] of [
      [A, M, '外 1/3', 35], [M, U, '内 2/3', 20],
    ]) {
      letter(ctx, text, (start.x + end.x) / 2 - nx * offset, (start.y + end.y) / 2 - ny * offset, {
        size: 20, align: 'center', color: '#5A5248', weight: 650,
      });
    }
    dot(ctx, A.x, A.y, 4.2, 4.2, '#4C585C');
    dot(ctx, M.x, M.y, 3.1, 3.1, '#54493F');
    leader(ctx, { x: A.x - 6, y: A.y + 3 }, { x: -219, y: 54 }, '#77848A', 2.0);
    letter(ctx, '右髂前上棘', -225, 66, { align: 'right', size: 25, color: '#536369', weight: 650 });
  });
}

function showMigration(ctx, motion, pigment, point) {
  const { t, migration: progress, lock, markings } = motion;
  const { dashed, arrowhead } = pointsOnRoute();
  const trackAlpha = markings * phase(progress, 0, .19);
  fade(ctx, trackAlpha, () => {
    for (const dash of dashed) {
      fade(ctx, phase(progress, dash.start, dash.start + .085),
        () => fill(ctx, dash.shape, '#B23C32'));
    }
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(routeAngle);
    fill(ctx, arrowhead, '#AB3B32');
    ctx.restore();
  });

  const radius = lerp(67, 19, progress) * (1 + .055 * Math.sin(t * 5.3));
  paintPainHalo(ctx, pigment, point, radius, lerp(.56, .94, progress), progress);
  fade(ctx, lock, () => {
    dot(ctx, M.x, M.y, 4.4, 4.4, '#98352F');
    for (const [i, base] of [14, 23].entries()) {
      const breathing = Math.sin(t * 6.9 - i * .8);
      const radius = base + (i ? 2.4 : 1.7) * breathing;
      ctx.beginPath();
      ctx.arc(M.x, M.y, radius, 0, Math.PI * 2);
      ctx.lineWidth = i ? 1.5 : 1.9;
      ctx.strokeStyle = i ? '#B2433966' : '#AE3D348C';
      ctx.stroke();
    }
    leader(ctx, { x: M.x + 14, y: M.y + 18 }, { x: -88, y: 221 }, '#A34338A0', 2.3);
    letter(ctx, '麦氏点（压痛、反跳痛）', -88, 257, { size: 34, color: RED, weight: 700 });
    letter(ctx, '从右髂前上棘向脐量 1/3', -88, 299, { size: 27, color: umber });
  });
}

export function drawPeritonealSigns(ctx, { diagramOpacity, peritonealSigns }) {
  fade(ctx, diagramOpacity * phase(peritonealSigns, .39, .53), () => {
    ctx.beginPath();
    ctx.roundRect(1060, 775, 720, 68, 9);
    ctx.fillStyle = '#F4ECE3';
    ctx.fill();
    ink(ctx, 'M1062 783 Q1061 808 1062 835', '#C43428', 2, 1149);

    let x = 1077;
    const runs = [
      ['腹膜刺激征 = 压痛 + ', 22, 650, '#1F1C19'],
      ['反跳痛', 22, 800, '#C43428'],
      [' + ', 22, 650, '#1F1C19'],
      ['腹肌紧张', 22, 800, '#C43428'],
      ['（核心体征）', 17, 700, '#C43428'],
    ];
    for (const [text, size, weight, color] of runs) {
      letter(ctx, text, x, 801, { size, weight, color, font: SANS_FONT });
      x += ctx.measureText(text).width;
    }
    letter(ctx, '单纯压痛 ≠ 腹膜刺激征 ｜ 麦氏点压痛伴反跳痛（松手牵拉腹膜）→ 提示累及腹膜',
      1077, 827, { size: 19, weight: 500, color: '#4E4740', font: SANS_FONT });
  });
}

export function drawAnatomy(ctx, motion, pigment) {
  if (motion.diagramOpacity <= .001) return null;
  const x = center.x + motion.diagramSlide;
  const y = center.y - motion.diagramLift;
  const painCenter = motion.migrating ? routeAt(motion.migration) : U;
  fade(ctx, motion.diagramOpacity, () => {
    ctx.translate(x, y);
    washPelvis(ctx, pigment, motion.migrating ? motion.markings : 0);
    if (motion.migrating) markLandmarks(ctx, motion.markings);
    if (motion.migrating) showMigration(ctx, motion, pigment, painCenter);
    else {
      const radius = lerp(36, 67, motion.neural) + 5.5 * Math.sin(motion.t * 2.8);
      paintPainHalo(ctx, pigment, U, radius, motion.neural * .56);
    }
    markNavel(ctx, Math.max(.84, motion.neuralLabel, motion.markings));
  });
  const project = ({ x: px, y: py }) => ({ x: x + px, y: y + py });
  return { navel: project(U), asisR: project(A), mcburney: project(M), appendix: project(M), painCenter: project(painCenter) };
}
