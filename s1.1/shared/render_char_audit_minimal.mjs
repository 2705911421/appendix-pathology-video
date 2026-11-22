import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import sharp from 'sharp';

const width = 1920;
const height = 600;
const here = fileURLToPath(new URL('.', import.meta.url));

async function presentBoard() {
  const labels = ['午饭', '脐周隐痛', '右下腹剧痛', '临床医生 · 讲解', '康复'];
  const labelFont = `590 27px ${SERIF_FONT}`;
  await document.fonts.load(labelFont, labels.join(''));
  await document.fonts.ready;
  const board = document.querySelector('canvas');
  const ctx = board.getContext('2d');

  function paint() {
    ctx.fillStyle = '#F5F1E9';
    ctx.fillRect(0, 0, board.width, board.height);
    ctx.fillStyle = '#DDD2C2';
    for (const x of [553, 1008, 1461]) ctx.fillRect(x, 88, 1, 430);

    drawMinimalPatient(ctx, { x: 129, y: 161, scale: 1.24, pose: 'eat', breathPhase: .52 });
    drawMinimalPatient(ctx, { x: 424, y: 158, scale: 1.24, pose: 'navel_pain', breathPhase: .5 });
    drawMinimalPatient(ctx, { x: 853, y: 92, scale: 1.46, pose: 'rlq_acute', breathPhase: .78 });
    drawMinimalDoctor(ctx, { x: 1214, y: 113, scale: 1.46, pose: 'explain', breathPhase: .74 });
    drawMinimalPatient(ctx, { x: 1668, y: 113, scale: 1.46, pose: 'recovered', breathPhase: .62 });

    ctx.fillStyle = '#4B4037';
    ctx.font = labelFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (const [i, x] of [138, 401, 781, 1234, 1688].entries()) ctx.fillText(labels[i], x, 548);
    return board.toDataURL('image/png');
  }

  function measure([start, control, end]) {
    let length = 0;
    let [priorX, priorY] = start;
    for (let step = 1; step <= 48; step++) {
      const t = step / 48;
      const k = 1 - t;
      const x = k * k * start[0] + 2 * k * t * control[0] + t * t * end[0];
      const y = k * k * start[1] + 2 * k * t * control[1] + t * t * end[1];
      length += Math.hypot(x - priorX, y - priorY);
      priorX = x;
      priorY = y;
    }
    return length;
  }

  const first = paint();
  const motion = new OffscreenCanvas(460, 355).getContext('2d');
  const poses = ['eat', 'navel_pain', 'rlq_acute', 'recovered', 'eat'];
  let shortest = Infinity;
  let longest = 0;
  for (let frame = 0; frame < 300; frame++) {
    const index = Math.floor(frame / 75);
    const progress = (frame % 75) / 74;
    const breathPhase = frame * 2 * Math.PI / 85;
    motion.clearRect(0, 0, 460, 355);
    const patient = drawMinimalPatient(motion, { x: 144, y: 31, fromPose: poses[index], pose: poses[index + 1], progress, breathPhase });
    const doctor = drawMinimalDoctor(motion, { x: 331, y: 31, breathPhase });
    for (const arm of [...patient.arms, ...doctor.arms]) {
      const length = measure(arm);
      if (!Number.isFinite(length)) throw new Error('Arm curve is not finite');
      shortest = Math.min(shortest, length);
      longest = Math.max(longest, length);
    }
  }
  if (shortest < 107.94 || longest > 108.06) throw new Error(`Arm lengths drifted: ${shortest}–${longest}`);
  const upright = drawMinimalPatient(motion, { pose: 'eat' });
  const acute = drawMinimalPatient(motion, { pose: 'rlq_acute' });
  if (acute.head[0] > upright.head[0] - 70 || acute.head[1] < upright.head[1] + 35) {
    throw new Error('Acute pose should lower the head toward the viewer’s left');
  }
  if (first !== paint()) throw new Error('Board changes after seeking to different character frames');
  window.charAudit = { first, shortest, longest };
}

const { outputFiles: [entry] } = await build({
  stdin: {
    contents: `import { drawMinimalPatient, drawMinimalDoctor } from './minimalistCharacters.js';
      import { SERIF_FONT } from './fonts.js';
      await (${presentBoard.toString()})();`,
    resolveDir: here,
    sourcefile: 'minimal-character-audit-browser.js',
  },
  bundle: true, write: false, format: 'esm', platform: 'browser', target: 'chrome120',
});

const args = ['--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const executablePath = process.env.CHROME_PATH;
let browser;
try {
  try {
    browser = await chromium.launch({ headless: true, executablePath, args });
  } catch (error) {
    if (executablePath || !String(error).includes("Executable doesn't exist")) throw error;
    browser = await chromium.launch({ headless: true, channel: 'chrome', args });
  }
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, locale: 'zh-CN' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setContent(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>body{margin:0}</style>
    <canvas width="${width}" height="${height}"></canvas></html>`);
  await page.addScriptTag({ type: 'module', content: entry.text });
  try {
    await page.waitForFunction(() => window.charAudit, null, { timeout: 30_000 });
  } catch (error) {
    throw new Error(errors.join('\n') || error.message);
  }
  const { first, shortest, longest } = await page.evaluate(() => window.charAudit);
  assert.deepEqual(errors, []);
  const png = Buffer.from(first.slice('data:image/png;base64,'.length), 'base64');
  const image = sharp(png).removeAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height, info.channels], [width, height, 3]);
  for (const [x, y] of [[0, 0], [62, 161], [630, 184], [1119, 250], [1595, 110]]) {
    const offset = (y * width + x) * 3;
    assert.deepEqual([...data.subarray(offset, offset + 3)], [245, 241, 233], 'Wash leaked outside its silhouette');
  }
  for (const [left, right] of [[40, 520], [565, 992], [1030, 1440], [1470, 1880]]) {
    let ink = 0;
    for (let y = 90; y < 510; y++) {
      for (let x = left; x < right; x++) if (data[(y * width + x) * 3] < 70) ink++;
    }
    assert.ok(ink > 2500, `Character contours are missing in the panel at x=${left}`);
  }
  const result = fileURLToPath(new URL('./out/char_audit_minimal.png', import.meta.url));
  await mkdir(new URL('./out/', import.meta.url), { recursive: true });
  await writeFile(result, await sharp(data, { raw: info }).png().toBuffer());
  console.log(`${width}×${height} | 300 motion frames | arm length ${shortest.toFixed(3)}–${longest.toFixed(3)} px`);
  console.log(result);
} finally {
  if (browser) await browser.close();
}
