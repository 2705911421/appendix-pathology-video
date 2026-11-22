import { HEIGHT, PAPER, WIDTH, assertBlindReviewText } from '../../shared/canvasCore.js';
import { phase } from '../../shared/timelineHelper.js';
import { createRaster, logicalContext } from '../../shared/detail/raster.js';
import * as bibliography from '../../shared/references.js';
import { sceneFades } from './cue-sheet.js';

const font = '"Noto Sans SC", "Microsoft YaHei", sans-serif';
const bodyX = 345;
const bodyWidth = WIDTH - 2 * bodyX;
const audioCredit = new Map([
  [true, '3. 音频处理：背景音乐与音效由程序化合成，旁白使用外部交付音频。'],
  [false, '3. 音频处理：本版使用程序化合成的钢琴配乐。'],
]);
const body = [
  '本作品在创作过程中使用了生成式人工智能工具辅助，具体用途如下：',
  '1. 画面与程序化手绘渲染：使用代码生成工具结合 p5.brush、perfect-freehand 与 flubber 编写水彩与手绘动画脚本，全部医学解剖与病理形态均经人工逐帧校对；',
  '2. 脚本与双语字幕：使用大语言模型辅助故事结构梳理与英文字幕翻译，全部医学表述均对照权威教材与临床指南核验；',
  audioCredit.get(globalThis.__masterHasVoice) ?? '3. 音频处理：背景音乐与音效由程序化合成，旁白由语音合成工具生成。',
];
const title = '创作说明';
const subheading = '主要科学依据与参考资料';
const supplied = ['REFERENCES', 'references', 'default'].map(name => bibliography[name])
  .find(value => value !== undefined);
const fallback = [
  '[1] 步宏, 李一雷. 病理学[M]. 北京: 人民卫生出版社.',
  '[2] 2023–2026年急性阑尾炎多层螺旋CT诊断效能（敏感度>93%）及临床诊疗指南相关研究文献.',
];
const entries = supplied === undefined || supplied.length === 0 ? fallback : supplied;
if (!Array.isArray(entries) || entries.length !== 2
    || entries.some(entry => typeof entry !== 'string' || !entry.trim())) {
  throw new TypeError('Expected two references');
}
const references = entries.map((entry, i) => /^\[\d+\]/u.test(entry) ? entry : `[${i + 1}] ${entry}`);
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
  canvas.dataset.references = entries === fallback ? 'fallback' : 'shared';
  canvas.hidden = true;
  for (const text of transcript) {
    const fallback = document.createElement('p');
    fallback.textContent = text;
    canvas.append(fallback);
  }
  const ctx = logicalContext(canvas, { willReadFrequently: true });

  const text = (line, x, y) => ctx.fillText(line, Math.round(x), Math.round(y));
  return {
    canvas,
    draw(p) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.save();
      ctx.globalAlpha = phase(p, 0, sceneFades.creditsEnd);
      ctx.strokeStyle = '#C5BEB2';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(240, 95, 1440, 890);

      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'center';
      ctx.font = `700 44px ${font}`;
      ctx.fillStyle = '#1F1C19';
      text(title, WIDTH / 2, 195);

      ctx.textAlign = 'left';
      ctx.font = `400 25px ${font}`;
      ctx.fillStyle = '#2A2622';
      let y = 300;
      for (const paragraph of body) {
        for (const line of wrap(ctx, paragraph, bodyWidth - 26)) {
          text(line, bodyX, y);
          y += 46;
        }
      }

      ctx.fillStyle = '#B6AFA4';
      ctx.fillRect(bodyX, 670, bodyWidth, 1);
      ctx.fillStyle = '#1F1C19';
      ctx.font = `700 26px ${font}`;
      text(subheading, bodyX, 719);
      ctx.font = `400 23px ${font}`;
      ctx.fillStyle = '#3E3934';
      y = 768;
      for (const reference of references) {
        for (const line of wrap(ctx, reference, bodyWidth - 24)) {
          text(line, bodyX, y);
          y += 38;
        }
      }
      ctx.restore();
    },
  };
}
