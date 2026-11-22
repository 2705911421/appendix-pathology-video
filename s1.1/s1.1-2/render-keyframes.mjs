import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { CUES, cueTime, sheet } from './src/cues.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const out = path.join(root, 'out');
const { width, height } = sheet;
const samples = [['S06', .65], ['S07', .78], ['S08', .75], ['S09', .48]];
assert.deepEqual([width, height, sheet.fps], [1920, 1080, 30]);
for (const cue of CUES) {
  assert.ok(cue.defaultDuration > 0 && cue.zhText && cue.enText);
  assert.ok(cue.highlightZh.every(word => cue.zhText.includes(word)));
}

function search(pattern, targets, extra = []) {
  const result = spawnSync('rg', ['--no-config', '-n', '--hidden', '--pcre2', ...extra, '-e', pattern, ...targets],
    { encoding: 'utf8', cwd: root });
  if (result.error) throw result.error;
  if (result.status > 1) throw new Error(result.stderr);
  return result.stdout.trim().split(/\r?\n/).filter(Boolean);
}

function checkSources() {
  const assets = String.raw`(?i)\.(?:png|jpg|jpeg|webp)|data:image|new\s+Image\b|loadImage\b|<\s*ima?g[e]?\b|background-image\s*:\s*url\(`;
  const tts = String.raw`(?i)\b(?:speechSynthesis|SpeechSynthesisUtterance|textToSpeech|synthesizeSpeech|edge[_-]tts)\b`;
  assert.deepEqual(search(assets, ['src', 'index.html']), []);
  assert.deepEqual(search(tts, ['src', 'index.html']), []);
  console.log('[1/5] PASS | static image references=0 | TTS calls=0');
  const styleDirectory = ['style', 'probe'].join('_');
  const sectionPrefix = 's1[.]1-';
  const foreign = `(?i)(?:\\b${styleDirectory}\\b|\\b${sectionPrefix}(?!2\\b)[0-9]+(?=[/\\\\'"\\x60]))`;
  const crossHits = search(foreign, ['.'], ['-g', '*.js', '-g', '*.mjs', '-g', '*.html', '-g', '*.css', '-g', '*.json',
    '-g', '!out/.gate-browser-*/**']);
  assert.deepEqual(crossHits, []);
  console.log('[2/5] PASS | cross-section references=0');
}

const { outputFiles } = await build({
  entryPoints: [path.join(root, 'src', 'scene.js')],
  bundle: true, write: false, format: 'esm', platform: 'browser', target: 'chrome120',
  define: { IS_MINIFIED: 'true' },
});
const html = await readFile(path.join(root, 'index.html'));
const server = createServer((request, response) => {
  if (request.url === '/') return response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
  if (request.url === '/scene.js') return response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' })
    .end(outputFiles[0].contents);
  if (request.url === '/favicon.ico') return response.writeHead(204).end();
  response.writeHead(404).end();
});
const outputRoot = await realpath(out);
const profile = await mkdtemp(path.join(outputRoot, '.gate-browser-'));
assert.equal(path.dirname(await realpath(profile)), outputRoot);
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;
const errors = [];
let context;

async function still(page, id, progress) {
  const state = await page.evaluate(async seconds => {
    const state = window.renderAt(seconds);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const captions = ['.story-caption-cn', '.story-caption-en'].map(selector => {
      const element = document.querySelector(selector);
      const range = document.createRange();
      range.selectNodeContents(element);
      return { width: range.getBoundingClientRect().width, text: element.textContent };
    });
    return { ...state, captions };
  }, cueTime(id, progress));
  assert.equal(state.id, id);
  assert.ok(Math.abs(state.p - progress) < 1e-8);
  for (const { width: captionWidth, text } of state.captions) {
    assert.ok(captionWidth <= width - 124 + .1 && text.trim(), `Caption overflow in ${id}`);
  }
  return { state, png: await page.screenshot({ scale: 'css' }) };
}

async function mainPixels(png) {
  return sharp(png).extract({ left: 0, top: 0, width, height: 880 }).removeAlpha().raw().toBuffer();
}

async function frameMd5(png) {
  const bytes = await sharp(png).removeAlpha().raw().toBuffer();
  return createHash('md5').update(bytes).digest('hex');
}

try {
  const settings = {
    headless: true, locale: 'zh-CN', viewport: { width, height }, deviceScaleFactor: 1,
    executablePath: process.env.CHROME_PATH,
    args: ['--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-partial-raster'],
  };
  try {
    context = await chromium.launchPersistentContext(profile, settings);
  } catch (error) {
    if (settings.executablePath || !String(error).includes("Executable doesn't exist")) throw error;
    context = await chromium.launchPersistentContext(profile, { ...settings, channel: 'chrome' });
  }
  await context.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.drawImage;
    window.canvasComposites = 0;
    CanvasRenderingContext2D.prototype.drawImage = function (source, ...args) {
      if (!(source instanceof HTMLCanvasElement || source instanceof OffscreenCanvas)) {
        throw new TypeError('Canvas compositor received a source other than a live canvas');
      }
      window.canvasComposites++;
      return original.call(this, source, ...args);
    };
  });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === origin && ['/', '/scene.js', '/favicon.ico'].includes(url.pathname)) return route.continue();
    errors.push(`Unexpected page resource: ${url.href}`);
    return route.abort();
  });
  const page = context.pages()[0] ?? await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(origin, { waitUntil: 'commit' });
  try {
    await page.waitForFunction(() => window.ready === true, null, { timeout: 120_000 });
  } catch (error) {
    throw new Error(errors.join('\n') || error.message);
  }
  assert.deepEqual(errors, []);
  const frames = [];
  for (const [i, [id, p]] of samples.entries()) {
    const { png, state } = await still(page, id, p);
    assert.ok(Math.abs(state.diameter - [16.5, 25.5, 37.5, 37.5][i]) < 1e-8);
    if (id === 'S07') {
      assert.deepEqual(state.lens, { x: 1590, y: 275, radius: 142, labelTop: 460, cleanGap: 43, alpha: 1 });
    }
    if (id === 'S08') assert.ok(Math.abs(state.scale - 1.56) < 1e-8);
    frames.push(png);
    console.log(`Frame ${id} @ p=${p.toFixed(2)} | diameter=${state.diameter.toFixed(2)} | push=${state.camera.toFixed(3)}`);
  }
  const gapPixels = { left: 1448, top: 418, width: 284, height: 42 };
  const [plainPaper, magnifierGap] = await Promise.all(frames.slice(0, 2).map(png =>
    sharp(png).extract(gapPixels).removeAlpha().raw().toBuffer()));
  assert.ok(plainPaper.equals(magnifierGap), 'A guide crosses the clean area below the magnifier');

  const morph = await still(page, 'S09', .92);
  const { micro } = morph.state;
  const endpoint = await page.evaluate(t => window.renderAt(t).micro, CUES.at(-1).end);
  assert.ok(micro.growth > .8 && micro.growth < 1 && micro.histology > .7 && micro.magnification > 1);
  assert.ok(micro.width > 490 && micro.width < 580 && micro.height > 490 && micro.height < 580);
  assert.deepEqual(endpoint, { growth: 1, histology: 1, magnification: 1.19, x: 1040, y: 465, width: 580, height: 580 });

  checkSources();
  const ran = await page.evaluate(() => ({
    ...window.sceneMetrics,
    canvasComposites: window.canvasComposites,
    rasterNodes: document.querySelectorAll('img,image').length,
  }));
  assert.ok(ran.rasterNodes === 0 && ran.canvasComposites > 0);
  assert.deepEqual(ran.specimen, { x: 990, y: 450, scale: 1.40 });
  for (const { cecum, ileum, appendix } of Object.values(ran.dimensions)) {
    assert.equal(cecum, 150);
    assert.equal(ileum, 63);
    assert.ok(appendix < ileum);
  }
  assert.equal(ran.incisionWindow.wallFraction * 2, .60);
  assert.equal(ran.incisionWindow.cavityFraction, .40);
  assert.ok(ran.histology.muscle > 0 && ran.histology.crypts > 0);
  const source = 'src';
  const lines = {
    brush: search(String.raw`\bbrush\.\w+\(`, [source]).length,
    getStroke: search(String.raw`\bgetStroke\(`, [source]).length,
    rough: search(String.raw`\broughGenerator\.(?:circle|toPaths)\(`, [source]).length,
    flubber: search(String.raw`\bflubber\.(?:interpolate|toCircle)\(`, [source]).length,
  };
  assert.ok(Object.values(lines).every(value => value > 0));
  assert.ok(Object.values(ran.calls).every(value => value > 0));
  console.log(`[3/5] PASS | call-site lines ${JSON.stringify(lines)}`);
  console.log(`      live calls ${JSON.stringify(ran.calls)} | canvas-only composites=${ran.canvasComposites} | raster DOM nodes=${ran.rasterNodes}`);

  const early = await still(page, 'S07', .2);
  const late = await still(page, 'S07', .8);
  const [low, high] = await Promise.all([mainPixels(early.png), mainPixels(late.png)]);
  let rawDifferences = 0;
  let visibleDifferences = 0;
  for (let i = 0; i < low.length; i += 3) {
    const max = Math.max(Math.abs(low[i] - high[i]), Math.abs(low[i + 1] - high[i + 1]), Math.abs(low[i + 2] - high[i + 2]));
    if (max > 0) rawDifferences++;
    if (max >= 8) visibleDifferences++;
  }
  const percent = count => (count * 100 / (width * 880)).toFixed(3);
  assert.ok(visibleDifferences / (width * 880) > .015);
  console.log(`[4/5] PASS | S07 p=0.20 vs 0.80 | y=[0,880) | ${rawDifferences}/${width * 880} pixels = ${percent(rawDifferences)}% | RGB delta >= 8: ${percent(visibleDifferences)}%`);

  const firstHashes = await Promise.all(frames.map(frameMd5));
  const replayHashes = [];
  for (let i = samples.length - 1; i >= 0; i--) {
    const { png } = await still(page, ...samples[i]);
    replayHashes[i] = await frameMd5(png);
  }
  assert.deepEqual(replayHashes, firstHashes, 'A frame changed after seeking to other cues');
  const { png: irisReplay } = await still(page, 'S09', .92);
  const irisHash = await frameMd5(morph.png);
  assert.equal(await frameMd5(irisReplay), irisHash, 'The microscope transition changed after seeking');
  console.log('[5/5] PASS | full-frame RGB MD5 first render = replay');
  for (const [i, [id]] of samples.entries()) console.log(`      ${id} ${firstHashes[i]}`);
  console.log(`      S09 p=0.92 ${irisHash}`);
  assert.deepEqual(errors, []);

  const gap = 24;
  const board = path.join(out, 'keyframes_s1.1-2.png');
  const check = path.join(out, 'check_flubber.png');
  const [sheetInfo, checkInfo] = await Promise.all([
    sharp({ create: { width: width * 2 + gap, height: height * 2 + gap, channels: 3, background: '#BDB1A0' } })
      .composite(frames.map((input, i) => ({
        input, left: i % 2 * (width + gap), top: Math.floor(i / 2) * (height + gap),
      }))).removeAlpha().png().toFile(board),
    sharp(morph.png).removeAlpha().png().toFile(check),
  ]);
  assert.deepEqual([sheetInfo.width, sheetInfo.height], [width * 2 + gap, height * 2 + gap]);
  assert.deepEqual([checkInfo.width, checkInfo.height], [width, height]);
  console.log('QA | Gate 0.9 cecum=150 | ileum=63 | incision wall/lumen=60%/40% | S07 clean gap=43');
  console.log(`QA | S09 p=0.92 Flubber aperture ${micro.width.toFixed(1)} × ${micro.height.toFixed(1)} | p=1 center=(${endpoint.x},${endpoint.y}) diameter=${endpoint.width}`);
  console.log(`Written | ${checkInfo.width} × ${checkInfo.height} | ${path.basename(check)}`);
  console.log(`Written | ${sheetInfo.width} × ${sheetInfo.height} | ${path.basename(board)}`);
  console.log(`PASS | Gate 1 stills | ${board}`);
} finally {
  await context?.close();
  server.close();
  await rm(profile, { recursive: true, force: true, maxRetries: 3 });
}
