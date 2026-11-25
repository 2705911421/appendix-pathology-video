import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { CREDITS_TIMING, RECOVERY_FADE_SECONDS } from '../shared/timelineHelper.js';

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

function inkIn(rgb, width, height, [x0, y0, x1, y1], threshold) {
  let ink = 0;
  const [left, top, right, bottom] = [
    Math.floor(x0 * width / 1920), Math.floor(y0 * height / 1080),
    Math.ceil(x1 * width / 1920), Math.ceil(y1 * height / 1080),
  ];
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const i = (y * width + x) * 3;
      if (54 * rgb[i] + 183 * rgb[i + 1] + 19 * rgb[i + 2] < threshold * 256) ink++;
    }
  }
  return ink / ((right - left) * (bottom - top));
}

export function bridgeAnchorVisible(rgb, width, height, id) {
  if (id === 'B01') {
    return inkIn(rgb, width, height, [87, 203, 262, 382], 213) > .18
      && inkIn(rgb, width, height, [85, 388, 266, 463], 217) > .035;
  }
  // Measure each swatch footprint. A bare sheet, a lone dot or a window in another corner earns no exemption.
  return [84, 136, 188, 240].every(x => inkIn(rgb, width, height, [x - 8, 127, x + 8, 143], 230) >= .24);
}

export async function scanWhiteFrames(file, { frames, fps, creditsDuration, bridges = [] }) {
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
  const creditsStart = frames - Math.round(creditsDuration * fps);
  const fadeEnd = creditsStart + Math.ceil(CREDITS_TIMING.fadeIn * fps);
  const fadeStart = creditsStart - Math.ceil(RECOVERY_FADE_SECONDS * fps);
  const closing = frames - Math.ceil(CREDITS_TIMING.fadeOut * fps);
  const failures = [];
  let written = 0, decoded = 0, scanned = 0, anchored = 0, minimum = 1, minFrame = 0;
  for await (const chunk of child.stdout) {
    for (let offset = 0; offset < chunk.length;) {
      const take = Math.min(stride - written, chunk.length - offset);
      chunk.copy(frame, written, offset, offset + take);
      written += take;
      offset += take;
      if (written !== stride) continue;
      if (decoded < fadeStart || decoded >= fadeEnd && decoded < closing) {
        const ratio = contentRatio(frame);
        if (ratio < minimum) { minimum = ratio; minFrame = decoded; }
        const t = decoded / fps;
        if (ratio < MIN_CONTENT) {
          const bridge = bridges.find(({ start, end }) => t >= start && t < end);
          if (bridge && bridgeAnchorVisible(frame, SAMPLE_WIDTH, SAMPLE_HEIGHT, bridge.id)) anchored++;
          else failures.push([decoded, ratio]);
        }
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
    throw new Error(`白屏扫描发现 ${failures.length} 帧低于场景或过渡墨迹门槛\n${where.join('、')}`);
  }
  console.log(`白屏扫描 PASS（${scanned}/${decoded} 帧，${anchored} 帧通过原生导航或时钟锚点，片尾淡入淡出豁免 ${decoded - scanned} 帧，最低 ${(minimum * 100).toFixed(2)}%，${(minFrame / fps).toFixed(3)}s）`);
  return { scanned, decoded, anchored, minimum, minFrame };
}
