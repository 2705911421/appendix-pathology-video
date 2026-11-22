import { RED, clamp, lerp } from '../../shared/canvasCore.js';
import { phase } from '../../shared/timelineHelper.js';
import { dot, fade, fill, ink, letter, pathOf, roughPath, stroke } from './paint.js';

const dark = '#454640';
const zero = 1134;
const assays = [
  { y: 373, normal: 10, result: 13, max: 15, hit: .57, name: '白细胞总数', unit: ' × 10⁹/L', limit: '10×10⁹/L' },
  { y: 555, normal: 75, result: 87, max: 100, hit: .68, name: '中性粒细胞', unit: '%', limit: '75%' },
];
const glass = 'M-21 661 C-19 538 -20 359 -19 266 C-18 234 -7 222 3 225 C15 226 22 243 22 268 L22 660 C40 671 50 687 48 706 C46 732 26 753 2 754 C-25 753 -47 735 -49 709 C-51 688 -39 670 -21 661Z';
const mercury = 'M-5 267 Q1 256 7 267 L8 675 C21 681 28 691 27 705 C25 722 14 733 1 733 C-14 733 -27 720 -27 706 C-27 692 -18 679 -6 675Z';
const tempY = t => 665 - (t - 35) * 56;

function temperature(ctx, p, t, pigment, glassInk) {
  ctx.save();
  ctx.translate(778, 0);
  const heat = phase(p, .09, .69);
  const burst = Math.sin(Math.PI * phase(p, .58, .86));
  const temp = lerp(36.8, 39.3, heat);
  const cap = tempY(temp) + 2.3 * burst * Math.sin(t * 38);
  const visible = phase(p, .07, .33);
  ctx.beginPath();
  ctx.rect(-300, lerp(815, 173, visible), 700, 860);
  ctx.clip();

  fill(ctx, glass, '#D9E5DFB0');
  ctx.save();
  ctx.clip(pathOf(glass));
  pigment(ctx, 'glass', -75, 186, 144, 589);
  fill(ctx, mercury, '#C3C0B3');
  ctx.beginPath();
  ctx.rect(-52, cap, 108, 795 - cap);
  ctx.clip();
  fill(ctx, mercury, '#BC3028');
  pigment(ctx, 'scarlet', -41, cap - 29, 85, 775 - cap);
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
    letter(ctx, String(i) + '℃', -58, tempY(i) + 8, { align: 'right', size: 23, font: 'Georgia, serif' });
  }

  fade(ctx, burst * .67, () => {
    pigment(ctx, 'rose', -57, cap - 57, 114, 102);
    for (const [i, x] of [-13, 2, 17].entries()) {
      const offset = 3 * Math.sin(t * 17 + i);
      ctx.beginPath();
      ctx.moveTo(x, cap - 9);
      ctx.bezierCurveTo(x + 12 + offset, cap - 24, x - 13, cap - 36, x + offset, cap - 53);
      ctx.strokeStyle = '#CB6456';
      ctx.lineWidth = 2.15 - .30 * i;
      ctx.stroke();
    }
  });

  fade(ctx, phase(p, .31, .64), () => {
    ctx.save();
    ctx.translate(0, cap);
    ink(ctx, 'M24 0 Q39 -1 60 0', RED, 3.4);
    ctx.translate(32, 0);
    pigment(ctx, 'rose', 45, -43, 237, 71);
    letter(ctx, temp.toFixed(1) + '℃ 高热', 75, 13, {
      size: 44, weight: 700, color: RED, font: 'Georgia, "Microsoft YaHei", serif',
    });
    ctx.restore();
  });
  ctx.restore();
}

function easeOutBack(t) {
  const after = t - 1;
  return 1 + 2.12 * after ** 3 + 1.12 * after ** 2;
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
  pigment(ctx, key, x - 26, y - 29, width + 51, 59);
  ctx.restore();
}

function indicator(ctx, assay, p, pigment) {
  const { y, normal, result, max, hit, name, unit, limit } = assay;
  const upper = 555 * normal / max;
  const overshoot = 555 * (result - normal) / max;
  const flow = phase(p, hit - .37, hit);
  const raise = easeOutBack(clamp((p - hit) / .23));
  const alarm = Math.sin(Math.PI * clamp((p - hit) / .20)) ** 2;
  const alpha = phase(p, hit - .47, hit - .23);
  fade(ctx, alpha, () => {
    const label = name + '：';
    letter(ctx, label, zero + 18, y - 52, { size: 33, weight: 700, color: dark });
    const valueX = zero + 18 + ctx.measureText(label).width + 4;
    letter(ctx, String(result) + unit + ' ↑', valueX, y - 52, {
      size: 32, weight: 600, color: RED, font: 'Georgia, "Microsoft YaHei", serif',
    });
    wetLine(ctx, pigment, 'stone', '#B7AC9D', zero, y, upper * flow);
    wetLine(ctx, pigment, 'scarlet', '#BE432E', zero + upper, y, overshoot * raise);
    ctx.save();
    ctx.strokeStyle = '#685E55';
    ctx.lineWidth = 1.75;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(zero + upper, y - 37);
    ctx.lineTo(zero + upper, y + 42);
    ctx.stroke();
    ctx.restore();
    letter(ctx, '正常上限 ' + limit, zero + upper, y + 64,
      { size: 22, align: 'center', color: dark });
    fade(ctx, alarm * .54, () => {
      pigment(ctx, 'rose', zero + upper - 39, y - 46, 81, 91);
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
      const arrival = phase(p, 0, .41);
      ctx.save();
      ctx.translate(103 * (1 - arrival) - motion.labsExit * 176, 5 * motion.labsExit);
      temperature(ctx, p, motion.t, pigment, glassInk);
      fade(ctx, phase(p, .14, .42), () => {
        ink(ctx, 'M1134 254 Q1133 507 1134 683', '#4C4A43', 3.5);
        letter(ctx, '0', zero - 8, 704, { size: 22, align: 'right', font: 'Georgia, serif' });
      });
      assays.forEach(assay => indicator(ctx, assay, p, pigment));
      fade(ctx, phase(p, .70, .96), () => {
        letter(ctx, '提示：急性细菌性炎症', zero + 7, 737, { size: 28, weight: 700, color: '#2A2622' });
        ctx.save();
        ctx.beginPath();
        ctx.rect(zero, 748, 376 * phase(p, .73, .97), 21);
        ctx.clip();
        ink(ctx, 'M1141 758 Q1289 751 1500 756', '#C53D2E', 5.3);
        ctx.restore();
      });
      ctx.restore();
    });
  };
}
