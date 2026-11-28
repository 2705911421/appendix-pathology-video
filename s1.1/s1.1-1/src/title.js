import { RED, morphShape, organic } from '../../shared/canvasCore.js';
import { SERIF_FONT } from '../../shared/fonts.js';
import { phase, phaseOut } from '../../shared/timelineHelper.js';
import { palette } from './notes.js';
import { fade, ink, letter } from './paint.js';

const headline = '一根“香肠”的变质日记';
const subtitle = '阑尾的粉 → 红 → 黄 → 黑';
const openingCenter = 960;
const guideCenter = 1077;
const black = '#2A2622';
const colors = ['#9A534E', RED, '#856522', '#2A2622'];
const swatchXs = [720, 958, 1196, 1434];
const titlePace = p => p * .96 / .65;

export function drawOpeningTitle(ctx, seconds, pigment) {
  const arrival = phaseOut(seconds, .25, .95);
  const alpha = arrival * (1 - phase(seconds, 4.10, 4.75));
  const dy = 14 * (1 - arrival);
  fade(ctx, alpha, () => {
    ctx.translate(0, dy);
    ctx.letterSpacing = '1px';
    letter(ctx, headline, openingCenter, 119, {
      align: 'center', size: 48, weight: 700, color: '#1F1C19', font: SERIF_FONT,
    });
    ctx.letterSpacing = '0px';
    letter(ctx, subtitle, openingCenter, 165, {
      align: 'center', size: 24, weight: 600, color: '#1F1C19', font: SERIF_FONT,
    });
    const left = openingCenter - ctx.measureText(subtitle).width / 2;
    const marks = palette.map(({ key }, i) => ({
      key, x: left + ctx.measureText(subtitle.slice(0, subtitle.indexOf('粉红黄黑'[i]))).width,
    }));
    fade(ctx, .24, () => {
      for (const { key, x } of marks) pigment(ctx, key, x - 2, 168, 28, 9);
    });
  });
  return { alpha, dy };
}

export function swatchesAt(p) {
  p = titlePace(p);
  return palette.map((_, i) => i === 0
    ? .42 * phase(p, 0, .17) + .58 * phase(p, .12, .60)
    : phase(p, .48 + i * .112, .60 + i * .112));
}

function wetSwatch(ctx, pigment, x, key, progress, dab) {
  if (progress <= .001) return;
  const width = 200;
  const head = x - width / 2 + width * progress;
  const edge = new Path2D();
  edge.moveTo(x - 120, 215);
  edge.lineTo(head - 3, 215);
  edge.quadraticCurveTo(head + 13, 250, head + 7, 277);
  edge.quadraticCurveTo(head + 11, 299, head - 7, 331);
  edge.lineTo(x - 120, 331);
  edge.closePath();
  ctx.save();
  ctx.clip(edge);
  pigment(ctx, key, x - width / 2, 211, width, 123);
  ctx.restore();

  fade(ctx, .48 * Math.sin(Math.PI * progress), () => {
    ctx.save();
    ctx.translate(head - 4, 273);
    const brushHead = new Path2D(dab(progress));
    ctx.clip(brushHead);
    pigment(ctx, key, -28, -45, 56, 90);
    ctx.restore();
  });
}

export function makeColorGuide(pigment) {
  const dab = morphShape(organic(0, 0, 14, 32, 980, .15), organic(0, 0, 24, 23, 981, .22), 8);

  return (ctx, motion) => {
    const p = titlePace(motion.titleProgress);
    if (p <= 0) return 0;
    palette.forEach(({ key, label }, i) => {
      const progress = motion.swatches[i];
      const strength = .72 + .28 * phase(motion.titleAccent, i * .22, i * .22 + .29);
      fade(ctx, strength, () => wetSwatch(ctx, pigment, swatchXs[i], key, progress, dab));
      fade(ctx, progress, () => {
        letter(ctx, label, swatchXs[i], 374,
          { align: 'center', size: 36, weight: 700, color: colors[i], font: SERIF_FONT });
        if (i < swatchXs.length - 1) {
          letter(ctx, '→', (swatchXs[i] + swatchXs[i + 1]) / 2, 374,
            { align: 'center', size: 26, color: '#705D4F' });
        }
      });
    });
    const headlineProgress = phase(p, .17, .53);
    fade(ctx, headlineProgress, () => {
      letter(ctx, '四道色彩密码 · 直击阑尾变质现场', guideCenter, 506 + 12 * (1 - headlineProgress),
        { align: 'center', size: 60, weight: 700, color: black, font: SERIF_FONT });
    });
    const sign = phase(p, .32, .70);
    fade(ctx, sign, () => {
      letter(ctx, '10小时症状升级背后的病理演变', guideCenter, 581,
        { align: 'center', size: 30, weight: 550, color: '#64574C', font: SERIF_FONT });
      ctx.translate(874, 0);
      ctx.scale(sign, 1);
      ink(ctx, 'M0 601 C111 595 286 597 407 602', '#B74232', 4, 348);
    });
    return headlineProgress;
  };
}
