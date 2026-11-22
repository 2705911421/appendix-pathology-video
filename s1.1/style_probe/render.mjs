import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { HEIGHT, WIDTH } from '../shared/canvasCore.js';

const probe = fileURLToPath(new URL('.', import.meta.url));
const root = fileURLToPath(new URL('..', import.meta.url));
const outputArg = process.argv.find(arg => arg.startsWith('--out-dir='));
const out = outputArg ? path.resolve(outputArg.slice('--out-dir='.length)) : path.join(root, 'out', 'shared');
const components = process.argv.includes('--components');
const verify = process.argv.includes('--verify');
const boardName = components ? 'shared-components.png' : 'style_board_s1.1_v2.png';
const hero = components ? { stages: 1.4, cutaway: 6.65, portraits: 9.5 } : { A: 2.8, B: 6.15, C: 10.45 };
const paper = !process.argv.includes('--no-paper');
if (verify && !paper && !components) throw new Error('Gate 0.5 comparison requires the paper grain');
const frames = new Map();
const packages = ['p5', 'p5.brush', 'perfect-freehand', 'flubber', 'roughjs', 'playwright', 'sharp'];

const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const lookup = createRequire(import.meta.url);
console.log('Gate 0.5 dependencies');
for (const name of packages) {
  const definition = lookup.resolve.paths(name).map(directory => path.join(directory, name, 'package.json')).find(existsSync);
  if (!definition) throw new Error(`Missing dependency ${name}`);
  const actual = JSON.parse(await readFile(definition, 'utf8')).version;
  assert.equal(actual, manifest.dependencies[name], name);
  console.log(`  ${name}: ${actual}`);
}

const { outputFiles } = await build({
  entryPoints: [path.join(probe, components ? 'component-check.mjs' : 'main.mjs')],
  bundle: true, write: false, format: 'esm', platform: 'browser', target: 'chrome120',
  logLevel: 'warning', define: { IS_MINIFIED: 'true' },
});
const html = await readFile(path.join(probe, 'index.html'));
const locale = 'zh-CN';
const p5Messages = await readFile(new URL(`../translations/${locale}/extracted.json`, import.meta.resolve('p5')));
const server = createServer((request, response) => {
  switch (new URL(request.url, 'http://localhost').pathname) {
    case '/':
      return response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
    case '/probe.js':
      return response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' }).end(outputFiles[0].contents);
    case `/${locale}.json`:
      return response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }).end(p5Messages);
    case '/favicon.ico':
      return response.writeHead(204).end();
    default:
      return response.writeHead(404).end();
  }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');

async function open(browser, url, errors) {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1, locale });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') {
      const failure = `${message.location().url} ${message.text()}`;
      errors.push(failure);
      console.error(failure);
    }
  });
  page.on('response', reply => {
    if (reply.status() >= 400) console.error(`HTTP ${reply.status()} ${reply.url()}`);
  });
  await page.goto(url, { waitUntil: 'commit' });
  try {
    await page.waitForFunction(() => typeof window.renderAt === 'function', null, { timeout: 180_000 });
  } catch (error) {
    throw new Error(errors.join('\n') || error.message);
  }
  return page;
}

async function render(page, time) {
  const fit = await page.evaluate(async t => {
    window.renderAt(t);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return ['.story-caption-cn', '.story-caption-en'].map(selector => {
      const element = document.querySelector(selector);
      const range = document.createRange();
      range.selectNodeContents(element);
      return {
        width: range.getBoundingClientRect().width,
        height: range.getBoundingClientRect().height,
        text: element.textContent,
        fontSize: parseFloat(getComputedStyle(element).fontSize),
      };
    });
  }, time);
  for (const { width, height, text, fontSize } of fit) {
    assert.ok(width < 1796 && height < fontSize * 1.65 && text.length, `Caption overflows at t=${time}`);
    assert.ok(!/[\u2018\u2019]/u.test(text), 'Use ASCII apostrophes in captions');
  }
  const screenshot = await page.screenshot({ scale: 'css' });
  const png = await sharp(screenshot).removeAlpha().png().toBuffer();
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, WIDTH);
  assert.equal(info.height, HEIGHT);
  assert.equal(info.channels, 3);
  return { png, data, md5: createHash('md5').update(data).digest('hex') };
}

async function checkPaper(page) {
  const stats = await page.evaluate(() => {
    const canvas = document.querySelector('.story-grain canvas');
    if (!canvas) return null;
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const pixels = new Uint8Array(128 * 72 * 4);
    function read(x, y) {
      gl.readPixels(x, y, 128, 72, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let sum = 0;
      let max = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        sum += pixels[i];
        max = Math.max(max, pixels[i]);
      }
      return { mean: sum / (128 * 72), max };
    }
    return { blank: read(390, 844), subtitle: read(890, 20) };
  });
  assert.equal(Boolean(stats), paper);
  if (stats) {
    assert.ok(stats.blank.max >= 1 && stats.blank.max <= 9, 'Paper opacity exceeded the 3.4% shader limit');
    assert.ok(stats.subtitle.mean < stats.blank.mean * 0.24, 'Paper strength is too high behind captions');
    console.log(`  Paper alpha peak ${stats.blank.max}/255 | caption mean ${(stats.subtitle.mean / stats.blank.mean * 100).toFixed(1)}% of open paper`);
  }
}

async function verifyApprovedFrame(letter, rendered) {
  const file = path.join(root, 'out', `frame_${letter}_v2.png`);
  const approved = await sharp(file).removeAlpha().raw().toBuffer();
  const { data: actual } = rendered;
  assert.equal(actual.length, approved.length);
  if (letter !== 'A') {
    assert.ok(approved.equals(actual), `Approved frame ${letter} changed`);
  } else {
    for (let y = 0; y < 919; y++) {
      // The left notes are remapped to x=65–310. Captions start at y=919.
      const start = (y * WIDTH + (y >= 175 && y < 760 ? 350 : 0)) * 3;
      const end = ((y + 1) * WIDTH) * 3;
      assert.ok(approved.subarray(start, end).equals(actual.subarray(start, end)), `Frame A artwork changed at y=${y}`);
    }
  }
  console.log(`  ${letter} matches the approved ${letter === 'A' ? 'artwork outside the revised notes and captions' : 'frame pixels'}`);
}

async function checkStableFrame(letter, expected, actual) {
  if (actual.md5 === expected.md5) return actual.md5;
  let pixelCount = 0;
  let channelDelta = 0;
  for (let i = 0; i < expected.data.length; i += 3) {
    const delta = Math.max(
      Math.abs(expected.data[i] - actual.data[i]),
      Math.abs(expected.data[i + 1] - actual.data[i + 1]),
      Math.abs(expected.data[i + 2] - actual.data[i + 2]),
    );
    if (delta) pixelCount++;
    channelDelta = Math.max(channelDelta, delta);
  }
  // Chromium can round a handful of antialiased edges differently when a cached layer is shown again.
  const stable = channelDelta <= 1 && pixelCount <= WIDTH * HEIGHT * .0001;
  if (!stable && process.env.S11_INSPECT_FRAMES) {
    const directory = process.env.S11_INSPECT_FRAMES;
    await mkdir(directory, { recursive: true });
    await Promise.all([
      writeFile(path.join(directory, `${letter}-first.png`), expected.png),
      writeFile(path.join(directory, `${letter}-seek.png`), actual.png),
    ]);
  }
  assert.ok(stable, `Pixel drift in ${letter} (${pixelCount} pixels, max channel delta ${channelDelta})`);
  return `${pixelCount} antialiased pixels rounded by 1/255`;
}

let browser;
try {
  const args = ['--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-partial-raster'];
  const executablePath = process.env.CHROME_PATH;
  try {
    browser = await chromium.launch({ headless: true, executablePath, args });
  } catch (error) {
    if (executablePath || !String(error).includes("Executable doesn't exist")) throw error;
    browser = await chromium.launch({ headless: true, channel: 'chrome', args });
  }
  const url = `http://127.0.0.1:${server.address().port}/?paper=${Number(paper)}`;
  const errors = [];
  const page = await open(browser, url, errors);
  console.log(`Chromium ${browser.version()} | ${WIDTH}×${HEIGHT} | DPR 1 | sRGB | WebGL paper ${paper ? 'on' : 'off'}`);
  await checkPaper(page);
  for (const [letter, time] of Object.entries(hero)) {
    const frame = await render(page, time);
    if (verify && !components) await verifyApprovedFrame(letter, frame);
    frames.set(letter, frame);
  }
  for (const time of [8.82, 0.65, 4.9]) {
    await page.evaluate(t => window.renderAt(t), time);
  }
  for (const letter of components ? Object.keys(hero).toReversed() : ['B', 'C', 'A']) {
    const actual = await render(page, hero[letter]);
    const expected = frames.get(letter);
    console.log(`  ${letter} t=${hero[letter]} | ${await checkStableFrame(letter, expected, actual)}`);
  }

  await page.close();
  const fresh = await open(browser, url, errors);
  for (const letter of components ? Object.keys(hero).toReversed() : ['C', 'A', 'B']) {
    const cold = await render(fresh, hero[letter]);
    console.log(`  ${letter} cold start | ${await checkStableFrame(letter, frames.get(letter), cold)}`);
  }
  assert.deepEqual(errors, []);
  if (components) console.log('  Shared component checks', await fresh.evaluate(() => window.verifySharedComponents()));

  if (!verify || components) await mkdir(out, { recursive: true });
  const gap = 24;
  const inputs = [...frames.values()].map(({ png }, i) => ({ input: png, left: 0, top: i * (HEIGHT + gap) }));
  const board = await sharp({ create: { width: WIDTH, height: HEIGHT * 3 + gap * 2, channels: 3, background: '#BDB1A0' } })
    .composite(inputs).png().toBuffer();
  for (const [name, png] of [
    ...[...frames].map(([letter, { png }]) => [components ? `shared_${letter}.png` : `frame_${letter}_v2.png`, png]),
    [boardName, board],
  ]) {
    const { exif, iptc, xmp, comments, width, height } = await sharp(png).metadata();
    assert.ok(!exif && !iptc && !xmp && !comments?.length, `Unexpected metadata in ${name}`);
    if (!verify || components) await writeFile(path.join(out, name), png);
    console.log(`  ${name} | ${width}×${height}`);
  }
  if (!verify || components) console.log(path.join(out, boardName));
} finally {
  if (browser) await browser.close();
  server.close();
}
