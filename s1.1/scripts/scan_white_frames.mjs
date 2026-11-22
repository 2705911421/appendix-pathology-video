import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { CREDIT_FADE_FRACTION } from '../shared/timelineHelper.js';

export const SAMPLE_WIDTH = 320;
export const SAMPLE_HEIGHT = 180;
export const MIN_CONTENT = .015;

// Warm paper and its faint grid remain above the ink threshold and outside these hue ranges.
export function contentRatio(rgb) {
  let count = 0;
  for (let i = 0; i < rgb.length; i += 3) {
    const r = rgb[i], g = rgb[i + 1], b = rgb[i + 2];
    if (54 * r + 183 * g + 19 * b < 220 * 256 || r - g > 16 || g - b > 19 || b - g > 10) count++;
  }
  return 3 * count / rgb.length;
}

export async function scanWhiteFrames(file, { frames, fps, creditsDuration }) {
  const stride = SAMPLE_WIDTH * SAMPLE_HEIGHT * 3;
  const child = spawn('ffmpeg', ['-v', 'error', '-nostdin', '-xerror', '-i', file, '-map', '0:v:0',
    '-an', '-vf', `scale=${SAMPLE_WIDTH}:${SAMPLE_HEIGHT}:flags=area`, '-fps_mode', 'passthrough',
    '-threads', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
  { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.setEncoding('utf8').on('data', chunk => { stderr = (stderr + chunk).slice(-10000); });
  const done = once(child, 'close').then(([code]) => {
    if (code !== 0) throw new Error(`白屏扫描解码失败 ${stderr.trim()}`);
  });
  done.catch(() => {});

  const frame = Buffer.allocUnsafe(stride);
  const creditsStart = Math.ceil(frames - creditsDuration * fps - 1e-8);
  const fadeEnd = creditsStart + Math.ceil(creditsDuration * CREDIT_FADE_FRACTION * fps);
  const failures = [];
  let written = 0, decoded = 0, scanned = 0, minimum = 1, minFrame = 0;
  for await (const chunk of child.stdout) {
    for (let offset = 0; offset < chunk.length;) {
      const take = Math.min(stride - written, chunk.length - offset);
      chunk.copy(frame, written, offset, offset + take);
      written += take;
      offset += take;
      if (written !== stride) continue;
      if (decoded < creditsStart || decoded >= fadeEnd) {
        const ratio = contentRatio(frame);
        if (ratio < minimum) { minimum = ratio; minFrame = decoded; }
        if (ratio < MIN_CONTENT) failures.push([decoded, ratio]);
        scanned++;
      }
      decoded++;
      written = 0;
    }
  }
  await done;
  if (written || decoded !== frames) throw new Error(`白屏扫描实际解码 ${decoded} 帧，预期 ${frames} 帧`);
  if (failures.length) {
    const where = failures.slice(0, 12).map(([index, ratio]) => `${(index / fps).toFixed(3)}s ${(ratio * 100).toFixed(2)}%`);
    throw new Error(`白屏扫描发现 ${failures.length} 帧内容低于 1.5%\n${where.join('、')}`);
  }
  console.log(`白屏扫描 PASS（${scanned}/${decoded} 帧，片尾淡入豁免 ${decoded - scanned} 帧，最低 ${(minimum * 100).toFixed(2)}%，${(minFrame / fps).toFixed(3)}s）`);
  return { scanned, decoded, minimum, minFrame };
}
