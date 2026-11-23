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

    drawMinimalPatient(ctx, { x: 113, y: 174, scale: .84, pose: 'eat', breathPhase: .52 });
    drawMinimalPatient(ctx, { x: 436, y: 174, scale: .84, pose: 'navel_pain', breathPhase: .5 });
    drawMinimalPatient(ctx, { x: 853, y: 116, scale: 1.12, pose: 'rlq_acute', breathPhase: .78 });
    drawMinimalDoctor(ctx, { x: 1196, y: 116, scale: 1.12, pose: 'explain', breathPhase: .74 });
    drawMinimalPatient(ctx, { x: 1668, y: 116, scale: 1.12, pose: 'recovered', breathPhase: .62 });

    ctx.fillStyle = '#4B4037';
    ctx.font = labelFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (const [i, x] of [138, 401, 781, 1234, 1688].entries()) ctx.fillText(labels[i], x, 548);
    return ctx.getImageData(0, 0, board.width, board.height).data;
  }

  const distance = ([x, y], [nextX, nextY]) => Math.hypot(nextX - x, nextY - y);
  const first = paint();
  const motion = new OffscreenCanvas(460, 355).getContext('2d');
  const poses = ['eat', 'navel_pain', 'rlq_acute', 'recovered', 'eat'];
  for (let frame = 0; frame < 300; frame++) {
    const index = Math.floor(frame / 75);
    const progress = (frame % 75) / 74;
    const breathPhase = frame * 2 * Math.PI / 85;
    motion.clearRect(0, 0, 460, 355);
    const patient = drawMinimalPatient(motion, { x: 144, y: 31, fromPose: poses[index], pose: poses[index + 1], progress, breathPhase });
    const doctor = drawMinimalDoctor(motion, { x: 331, y: 31, breathPhase });
    for (const [shoulder, elbow, wrist] of [...patient.arms, ...doctor.arms]) {
      if (!(Math.abs(distance(shoulder, elbow) - 83) < 1e-8 && Math.abs(distance(elbow, wrist) - 79) < 1e-8)) {
        throw new Error('An upper arm or forearm changed length');
      }
    }
  }
  const upright = drawMinimalPatient(motion, { pose: 'eat' });
  const acute = drawMinimalPatient(motion, { pose: 'rlq_acute' });
  if (acute.head[0] > upright.head[0] - 70 || acute.head[1] < upright.head[1] + 13) {
    throw new Error('Acute pose should lower the head toward the viewer’s left');
  }
  if (!paint().every((value, index) => value === first[index])) throw new Error('Board changes after seeking');
  window.charAuditReady = true;
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
    await page.waitForFunction(() => window.charAuditReady, null, { timeout: 120_000 });
  } catch (error) {
    throw new Error(errors.join('\n') || error.message);
  }
  assert.deepEqual(errors, []);
  const png = await page.locator('canvas').screenshot({ scale: 'css' });
  const image = sharp(png).removeAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height, info.channels], [width, height, 3]);
  for (const [x, y] of [[0, 0], [9, 171], [562, 320], [998, 206], [1454, 295], [1908, 501]]) {
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
  if (!process.argv.includes('--check-only')) {
    await mkdir(new URL('./out/', import.meta.url), { recursive: true });
    await writeFile(result, await sharp(data, { raw: info }).png().toBuffer());
    console.log(result);
  }
  console.log(`${width}×${height} | 300 motion frames | fixed 83 / 79 px arm segments`);
} finally {
  if (browser) await browser.close();
}
