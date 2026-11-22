import { RED, morphShape, organic } from '../../shared/canvasCore.js';
import { phase } from '../../shared/timelineHelper.js';
import { palette } from './notes.js';
import { fade, ink, letter } from './paint.js';

const headline = '一根“香肠”的变质日记';
const subtitle = '急性阑尾炎的色彩密码与炎症保卫战';
const center = 1110;
const black = '#2B2421';
const colors = ['#D38E82', RED, '#A9751E', '#241D23'];
const colorCenters = [983, 1136, 1289, 1442];
const swatchXs = [720, 958, 1196, 1434];


export function swatchesAt(p) {
  return palette.map((_, i) => i === 0
    ? .42 * phase(p, 0, .17) + .58 * phase(p, .12, .60)
    : phase(p, .48 + i * .112, .60 + i * .112));
}

function makeWords(letters, size, baseline, weight = 700) {
  // The offset is relative to each line's entrance window.
  const stagger = .035;
  const duration = 1 - (letters.length - 1) * stagger;
  return (ctx, progress) => {
    for (const [index, { char, x, color }] of letters.entries()) {
      const start = index * stagger;
      const amount = phase(progress, start, start + duration);
      fade(ctx, amount, () =>
        letter(ctx, char, x, baseline + 10 * (1 - amount), { align: 'center', size, weight, color }));
    }
  };
}

function firstLine() {
  const widths = [...headline].map(char => '“”'.includes(char) ? 36 : 68);
  let x = center - widths.reduce((sum, width) => sum + width, 0) / 2;
  return [...headline].map((char, index) => {
    const left = x;
    x += widths[index];
    return { char, x: (left + x) / 2, color: black };
  });
}

function secondLine() {
  return [
    { char: '阑', x: 776, color: black }, { char: '尾', x: 838, color: black }, { char: '的', x: 900, color: black },
    ...[...'粉红黄黑'].flatMap((char, index) => {
      const x = colorCenters[index];
      const run = [{ char, x, color: colors[index] }];
      if (index < 3) run.push({ char: '→', x: x + 77, color: '#705D4F' });
      return run;
    }),
  ];
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

export function makeTitle(pigment) {
  const writeHeadline = makeWords(firstLine(), 68, 459);
  const writeColors = makeWords(secondLine(), 62, 561);
  const subtitleChars = [...subtitle];
  const writeSubtitle = makeWords(subtitleChars.map((char, index) => ({
    char,
    x: center + (index - (subtitleChars.length - 1) / 2) * 34,
    color: '#64574C',
  })), 34, 650, 500);
  const dab = morphShape(organic(0, 0, 14, 32, 980, .15), organic(0, 0, 24, 23, 981, .22), 8);

  return (ctx, motion) => {
    const p = motion.titleProgress;
    if (p <= 0) return 0;
    palette.forEach(({ key }, i) => {
      const progress = motion.swatches[i];
      wetSwatch(ctx, pigment, swatchXs[i], key, progress, dab);
      fade(ctx, progress * .48 * phase(p, .48, .58),
        () => pigment(ctx, key, colorCenters[i] - 54, 503, 108, 79));
    });
    const headlineProgress = phase(p, .17, .61);
    writeHeadline(ctx, headlineProgress);
    writeColors(ctx, phase(p, .48, .91));

    const sign = phase(p, .71, .96);
    writeSubtitle(ctx, sign);
    fade(ctx, sign, () => {
      ctx.translate(817, 0);
      ctx.scale(sign, 1);
      ink(ctx, 'M0 682 C168 673 396 678 584 683', '#B74232', 5.8, 348);
    });
    return headlineProgress;
  };
}
