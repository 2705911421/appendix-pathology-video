import { HEIGHT, WIDTH, assertBlindReviewText } from '../../shared/canvasCore.js';
import { CREDITS_TIMING, phase } from '../../shared/timelineHelper.js';
import { createRaster, drawRaster, logicalContext } from '../../shared/detail/raster.js';
import { createStoryPaperSurface } from '../../shared/detail/transitionPaper.js';
import { REFERENCES } from '../../shared/references.js';
import { SANS_FONT } from '../../shared/fonts.js';

const font = SANS_FONT;
const bodyX = 304;
const bodyWidth = WIDTH - 2 * bodyX;
const audioCredit = new Map([
  [true, '3. 音频处理：AI 语音合成旁白（统一音色）+ 纯代码程序化合成配乐与音效。'],
  [false, '3. 音频处理：纯代码程序化合成温润钢琴配乐。'],
]);
const body = [
  '本作品在创作过程中使用了生成式人工智能工具辅助，具体用途如下：',
  '1. 画面与程序化绘制：使用 p5.brush、perfect-freehand 与 flubber 生成水彩和手绘动画。解剖、组织学与 CT 画面均为示意。',
  '2. 脚本与双语字幕：使用大语言模型辅助编写与翻译，医学内容参照下列教材与文献。',
  audioCredit.get(globalThis.__masterHasVoice === true),
];
const title = '创作说明';
const subheading = '主要科学依据与参考资料';
const references = REFERENCES.map((entry, i) => `[${i + 1}] ${entry}`);
const transcript = [title, ...body, subheading, ...references];
for (const text of transcript) assertBlindReviewText(text);

function wrap(ctx, text, width) {
  const tokens = text.match(/[a-z0-9]+(?:[.\-][a-z0-9]+)*|\s+|[^\s]/giu);
  const lines = [];
  let line = '';
  for (const token of tokens) {
    const follows = /^[.\u3001\u3002，；：！？）】》”’%]/u.test(token);
    if (!follows && line && ctx.measureText((line + token).trimEnd()).width > width) {
      lines.push(line.trimEnd());
      line = token.trimStart();
    } else {
      line += token;
    }
  }
  if (line) lines.push(line.trimEnd());
  return lines;
}

export function createCreditPlate() {
  const canvas = createRaster(WIDTH, HEIGHT);
  canvas.className = 'review-credit';
  canvas.dataset.references = 'shared';
  canvas.hidden = true;
  for (const text of transcript) {
    const fallback = document.createElement('p');
    fallback.textContent = text;
    canvas.append(fallback);
  }
  const ctx = logicalContext(canvas, { willReadFrequently: true });
  const paper = createStoryPaperSurface();

  let layout;
  function prepareLayout() {
    const lines = [];
    const add = (text, x, y, font, color, align = 'left') => lines.push({ text, x, y, font, color, align });
    add(title, WIDTH / 2, 162, `750 52px ${font}`, '#1F1C19', 'center');
    let y = 259;
    const paragraphs = (content, type, leading, gap, color) => {
      ctx.font = type;
      for (const paragraph of content) {
        for (const line of wrap(ctx, paragraph, bodyWidth)) {
          add(line, bodyX, y, type, color);
          y += leading;
        }
        y += gap;
      }
    };
    paragraphs(body, `400 28px ${font}`, 43, 5, '#2A2622');
    const rule = y + 3;
    add(subheading, bodyX, rule + 53, `720 29px ${font}`, '#1F1C19');
    y = rule + 101;
    paragraphs(references, `400 24px ${font}`, 34, 5, '#3E3934');
    const shift = Math.round((872 - (lines.at(-1).y + 13) - 92) / 2);
    return { lines, rule, shift };
  }

  return {
    canvas,
    draw(p) {
      drawRaster(ctx, paper);
      ctx.save();
      const { duration, fadeIn, fadeOut } = CREDITS_TIMING;
      const elapsed = p * duration;
      const opacity = phase(elapsed, 0, fadeIn) * (1 - phase(elapsed, duration - fadeOut, duration));
      ctx.globalAlpha = opacity;
      layout ??= prepareLayout();
      const { lines, rule, shift } = layout;
      ctx.fillStyle = '#9D7869';
      ctx.fillRect(Math.round(WIDTH / 2 - 36), Math.round(108 + shift), 72, 2);
      ctx.fillStyle = '#AB9F91';
      ctx.fillRect(Math.round(bodyX), Math.round(rule + shift), Math.round(bodyWidth), 1);
      ctx.textBaseline = 'alphabetic';
      for (const line of lines) {
        ctx.textAlign = line.align;
        ctx.font = line.font;
        ctx.fillStyle = line.color;
        ctx.fillText(line.text, Math.round(line.x), Math.round(line.y + shift));
      }
      ctx.restore();
      return opacity;
    },
  };
}
