import { RED, lerp } from '../../shared/canvasCore.js';
import { NUMERAL_FONT } from '../../shared/fonts.js';
import { phase, phaseOut } from '../../shared/timelineHelper.js';
import { dot, fade, fill, ink, letter, pathOf, roughPath } from './paint.js';

const dark = '#454640';
const zero = 1134;
const fever = 39.3;
const normalTemperature = [36, 37];
const normalInk = '#566B61';
const assays = [
  { y: 405, normal: [4, 10], result: 13.0, max: 15, start: .14, name: '白细胞总数' },
  { y: 611, normal: [2, 7], result: 11.3, max: 15, start: .30, name: '中性粒细胞数目（绝对值）' },
];
const glass = 'M-21 661 C-19 538 -20 359 -19 266 C-18 234 -7 222 3 225 C15 226 22 243 22 268 L22 660 C40 671 50 687 48 706 C46 732 26 753 2 754 C-25 753 -47 735 -49 709 C-51 688 -39 670 -21 661Z';
const mercury = 'M-5 267 Q1 256 7 267 L8 675 C21 681 28 691 27 705 C25 722 14 733 1 733 C-14 733 -27 720 -27 706 C-27 692 -18 679 -6 675Z';
const tempY = t => 665 - (t - 35) * 56;

function temperature(ctx, p, pigment, glassInk) {
  ctx.save();
  ctx.translate(778, 0);
  const heat = phaseOut(p, 0, .14);
  const burst = Math.sin(Math.PI * phase(p, .14, .30));
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
  const bandTop = tempY(normalTemperature[1]);
  const bandBottom = tempY(normalTemperature[0]);
  ctx.fillStyle = '#A9BBA97D';
  ctx.fillRect(-53, bandTop, 30, bandBottom - bandTop);
  ink(ctx, `M-54 ${bandTop} Q-57 ${(bandTop + bandBottom) / 2} -54 ${bandBottom}`, normalInk, 2.5);
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

  const reading = phaseOut(p, .12, .18);
  fade(ctx, reading, () => {
    ctx.save();
    ctx.translate(0, cap);
    ink(ctx, 'M24 0 Q39 -1 60 0', RED, 3.4);
    ctx.translate(32, 5 * (1 - reading));
    fade(ctx, .16, () => pigment(ctx, 'rose', 45, -43, 237, 71));
    letter(ctx, fever.toFixed(1) + '℃ 高热', 63, 13, {
      size: 41, weight: 700, color: RED, font: NUMERAL_FONT,
    });
    fade(ctx, phase(p, .17, .24), () => {
      letter(ctx, '（正常 ' + normalTemperature.join('–') + '℃）', 63, 53,
        { size: 27, weight: 650, color: normalInk });
    });
    ctx.restore();
  });
  ctx.restore();
}

function indicator(ctx, assay, p) {
  const { y, normal, result, max, start, name } = assay;
  const trackW = 555;
  const xLimit = trackW * normal[1] / max;
  const maxW = trackW * result / max;
  const barW = maxW * phaseOut(p, start, start + .23);
  fade(ctx, phase(p, start, start + .065), () => {
    letter(ctx, name, zero + 2, y - 79, { size: 34, weight: 700, color: dark });
    const value = result.toFixed(1) + '×10⁹/L';
    letter(ctx, value, zero + 2, y - 35, { size: 36, weight: 720, color: RED, font: NUMERAL_FONT });
    const referenceX = zero + ctx.measureText(value).width + 12;
    fade(ctx, phase(p, start + .035, start + .105), () => {
      letter(ctx, '（正常 ' + normal.join('–') + '×10⁹/L）', referenceX, y - 35,
        { size: 28, weight: 620, color: normalInk });
    });
    ctx.beginPath();
    ctx.roundRect(zero, y - 12, trackW, 24, 12);
    ctx.fillStyle = '#DED9CE';
    ctx.fill();
    if (barW > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(zero, y - 12, barW, 24, Math.min(12, barW / 2));
      ctx.clip();
      ctx.fillStyle = '#58788E';
      ctx.fillRect(zero, y - 12, Math.min(barW, xLimit), 24);
      if (barW > xLimit) {
        ctx.fillStyle = '#C43428';
        ctx.fillRect(zero + xLimit, y - 12, barW - xLimit, 24);
      }
      ctx.restore();
    }
    ctx.save();
    ctx.strokeStyle = normalInk;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(zero + xLimit, y - 21);
    ctx.lineTo(zero + xLimit, y + 24);
    ctx.stroke();
    ctx.restore();
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
        ink(ctx, 'M1134 382 Q1133 507 1134 659', '#4C4A43', 3.5);
        letter(ctx, '0', zero - 8, 682, { size: 22, align: 'right', font: NUMERAL_FONT });
      });
      assays.forEach(assay => indicator(ctx, assay, p));
      const read = phase(p, .45, .56);
      fade(ctx, read, () => {
        letter(ctx, '参考区间因实验室略有差异 · 需结合病史和查体', zero + 7, 737 + 6 * (1 - read),
          { size: 24, weight: 680, color: '#2A2622' });
        const underline = phase(p, .51, .965);
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
