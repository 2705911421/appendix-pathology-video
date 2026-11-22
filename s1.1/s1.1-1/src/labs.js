import { RED, clamp, lerp } from '../../shared/canvasCore.js';
import { NUMERAL_FONT } from '../../shared/fonts.js';
import { phase, phaseOut } from '../../shared/timelineHelper.js';
import { dot, fade, fill, ink, letter, pathOf, roughPath } from './paint.js';

const dark = '#454640';
const zero = 1134;
const fever = 39.3;
const assays = [
  { y: 373, normal: 10, result: 13, max: 15, hit: .38, name: '白细胞总数', unit: ' × 10⁹/L' },
  { y: 555, normal: 75, result: 87, max: 100, hit: .49, name: '中性粒细胞比例', unit: '%' },
];
const glass = 'M-21 661 C-19 538 -20 359 -19 266 C-18 234 -7 222 3 225 C15 226 22 243 22 268 L22 660 C40 671 50 687 48 706 C46 732 26 753 2 754 C-25 753 -47 735 -49 709 C-51 688 -39 670 -21 661Z';
const mercury = 'M-5 267 Q1 256 7 267 L8 675 C21 681 28 691 27 705 C25 722 14 733 1 733 C-14 733 -27 720 -27 706 C-27 692 -18 679 -6 675Z';
const tempY = t => 665 - (t - 35) * 56;

function temperature(ctx, p, pigment, glassInk) {
  ctx.save();
  ctx.translate(778, 0);
  const heat = phaseOut(p, 0, .22);
  const burst = Math.sin(Math.PI * phase(p, .22, .46));
  const cap = tempY(lerp(36.8, fever, heat));
  fill(ctx, glass, '#D9E5DFB0');
  ctx.save();
  ctx.clip(pathOf(glass));
  pigment(ctx, 'glass', -75, 186, 144, 589);
  fill(ctx, mercury, '#C3C0B3');
  ctx.beginPath();
  ctx.rect(-52, cap, 108, 795 - cap);
  ctx.clip();
  fill(ctx, mercury, RED);
  fade(ctx, .46, () => pigment(ctx, 'scarlet', -41, cap - 29, 85, 775 - cap));
  dot(ctx, -10, 702, 8, 5, '#F6AE91');
  ctx.restore();
  glassInk(ctx);
  ink(ctx, 'M-13 649 Q-13 418 -12 263 Q-10 240 -1 238', '#FFF5E5CC', 4.3);
  ink(ctx, 'M29 694 Q33 716 17 734', '#E8F2ECDD', 3.9);
  for (let i = 0; i <= 35; i++) {
    const y = tempY(35 + i / 5);
    ctx.beginPath();
    ctx.moveTo(-24, y);
    ctx.lineTo(i % 5 ? -32 : -47, y);
    ctx.lineWidth = i % 5 ? 1.25 : 2.2;
    ctx.strokeStyle = '#5B6662';
    ctx.stroke();
  }
  for (let i = 35; i <= 42; i++) {
    letter(ctx, String(i) + '℃', -58, tempY(i) + 8, { align: 'right', size: 23, font: NUMERAL_FONT });
  }

  fade(ctx, burst * .45, () => {
    fade(ctx, .30, () => pigment(ctx, 'rose', -57, cap - 57, 114, 102));
    for (const x of [-12, 12]) {
      ctx.beginPath();
      ctx.moveTo(x, cap - 9);
      ctx.bezierCurveTo(x + 8, cap - 24, x - 7, cap - 36, x + 2, cap - 51);
      ctx.strokeStyle = '#CB6456';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });

  const reading = phaseOut(p, .22, .275);
  fade(ctx, reading, () => {
    ctx.save();
    ctx.translate(0, cap);
    ink(ctx, 'M24 0 Q39 -1 60 0', RED, 3.4);
    ctx.translate(32, 5 * (1 - reading));
    fade(ctx, .16, () => pigment(ctx, 'rose', 45, -43, 237, 71));
    letter(ctx, fever.toFixed(1) + '℃ 高热', 63, 13, {
      size: 41, weight: 700, color: RED, font: NUMERAL_FONT,
    });
    ctx.restore();
  });
  ctx.restore();
}

function wetLine(ctx, pigment, key, color, x, y, width) {
  if (width < .5) return;
  const end = x + width;
  const contour = new Path2D();
  contour.moveTo(x, y - 10);
  contour.bezierCurveTo(x + width * .34, y - 18, end - 18, y - 13, end - 6, y - 12);
  contour.quadraticCurveTo(end + 4, y - 9, end, y + 2);
  contour.quadraticCurveTo(end - 2, y + 11, end - 9, y + 12);
  contour.bezierCurveTo(end - width * .34, y + 17, x + width * .22, y + 12, x, y + 10);
  contour.closePath();
  ctx.save();
  ctx.clip(contour);
  fill(ctx, contour, color);
  fade(ctx, .57, () => pigment(ctx, key, x - 26, y - 29, width + 51, 59));
  ctx.restore();
}

function indicator(ctx, assay, p, pigment) {
  const { y, normal, result, max, hit, name, unit } = assay;
  const upper = 555 * normal / max;
  const overshoot = 555 * (result - normal) / max;
  const flow = phaseOut(p, 0, hit);
  const raise = phaseOut(p, hit, hit + .14);
  const alarm = Math.sin(Math.PI * clamp((p - hit) / .20)) ** 2;
  const alpha = phase(p, 0, hit - .23);
  fade(ctx, alpha, () => {
    const label = name + '：';
    letter(ctx, label, zero + 18, y - 52, { size: 33, weight: 700, color: dark });
    const valueX = zero + 18 + ctx.measureText(label).width + 4;
    const read = phaseOut(p, hit, hit + .10);
    fade(ctx, read, () => letter(ctx, String(result) + unit + ' ↑', valueX, y - 52 + 4 * (1 - read), {
      size: 32, weight: 600, color: RED, font: NUMERAL_FONT,
    }));
    wetLine(ctx, pigment, 'stone', '#B7AC9D', zero, y, upper * flow);
    wetLine(ctx, pigment, 'scarlet', RED, zero + upper, y, overshoot * raise);
    ctx.save();
    ctx.strokeStyle = '#685E55';
    ctx.lineWidth = 1.75;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(zero + upper, y - 37);
    ctx.lineTo(zero + upper, y + 42);
    ctx.stroke();
    ctx.restore();
    letter(ctx, '参考上限 ' + normal + unit, zero + upper, y + 64,
      { size: 22, align: 'center', color: dark });
    fade(ctx, alarm * .32, () => {
      fade(ctx, .48, () => pigment(ctx, 'rose', zero + upper - 39, y - 46, 81, 91));
      ctx.beginPath();
      ctx.ellipse(zero + upper, y, 11 + alarm * 12, 18 + alarm * 12, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#BB483C';
      ctx.lineWidth = 2.1;
      ctx.stroke();
    });
  });
}

export function makeLabs(pigment) {
  const glassInk = roughPath(glass, 613, '#5B716E', 2.5);
  return (ctx, motion) => {
    const p = motion.labsProgress;
    fade(ctx, motion.labsOpacity, () => {
      const arrival = motion.labsEntry;
      ctx.save();
      ctx.translate(64 * (1 - arrival), 26 * (1 - arrival));
      temperature(ctx, p, pigment, glassInk);
      fade(ctx, motion.chartEntry, () => {
        ink(ctx, 'M1134 254 Q1133 507 1134 683', '#4C4A43', 3.5);
        letter(ctx, '0', zero - 8, 704, { size: 22, align: 'right', font: NUMERAL_FONT });
      });
      assays.forEach(assay => indicator(ctx, assay, p, pigment));
      const read = phase(p, .70, .86);
      fade(ctx, read, () => {
        letter(ctx, '支持急性炎症，需结合病史和查体', zero + 7, 737 + 6 * (1 - read),
          { size: 27, weight: 700, color: '#2A2622' });
        const underline = phaseOut(p, .76, .94);
        fade(ctx, .80 * underline, () => {
          ctx.translate(1141, 0);
          ctx.scale(underline, 1);
          ink(ctx, 'M0 758 Q148 751 359 756', RED, 4.2);
        });
      });
      ctx.restore();
    });
  };
}
