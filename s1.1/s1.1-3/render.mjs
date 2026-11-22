import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, rename, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { prepareTimeline } from './src/timeline.mjs';

const section = path.resolve(fileURLToPath(new URL('.', import.meta.url)));
const output = path.join(section, 'out', 'keyframes_s1.1-3.png');
const timeline = prepareTimeline(JSON.parse(await readFile(
  new URL('./out/cues_s1.1-3.json', import.meta.url), 'utf8',
)));
const { width, height } = timeline;
const frameBytes = width * height * 4;
const cues = new Map(timeline.cues.map(cue => [cue.id, cue]));
const samples = [['S10', .80], ['S11', .80], ['S12', .75], ['S14', .80]];
const auditOnly = process.argv.includes('--audit-motion');
const showOverview = process.argv.includes('--inspect-overview');

async function startServer() {
  const [{ outputFiles: [bundle] }, html] = await Promise.all([
    build({
      entryPoints: [path.join(section, 'main.mjs')],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'browser',
      target: 'chrome120',
      define: { IS_MINIFIED: 'true' },
    }),
    readFile(new URL('./index.html', import.meta.url)),
  ]);
  let captured;
  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url, 'http://localhost');
    if (pathname === '/') return response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
    if (pathname === '/act.js') return response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' }).end(bundle.contents);
    if (pathname === '/favicon.ico') return response.writeHead(204).end();
    if (pathname === '/pixels' && request.method === 'POST') {
      if (Number(request.headers['content-length']) !== frameBytes) return response.writeHead(400).end();
      const chunks = [];
      request.on('data', chunk => chunks.push(chunk));
      request.on('end', () => {
        captured = Buffer.concat(chunks);
        response.writeHead(204).end();
      });
      return;
    }
    // The installed drawing runtime can request English diagnostics.
    if (pathname === '/en.json' || pathname === '/en-US.json') {
      return response.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
    }
    response.writeHead(404).end();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    server,
    takePixels() {
      const pixels = captured;
      captured = undefined;
      assert.equal(pixels?.length, frameBytes);
      return pixels;
    },
  };
}

async function capture(page, takePixels, id, p) {
  const { start, end } = cues.get(id);
  const captionBounds = await page.evaluate(async seconds => {
    window.renderAt(seconds);
    const canvas = document.querySelector('.story-paint canvas');
    const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const transfer = await fetch('/pixels', { method: 'POST', body: data });
    if (!transfer.ok) throw new Error('Frame pixels did not reach the local assembler');
    return ['.story-caption-cn', '.story-caption-en'].map(selector => {
      const element = document.querySelector(selector);
      const range = document.createRange();
      range.selectNodeContents(element);
      return {
        text: element.textContent,
        width: range.getBoundingClientRect().width,
        lineHeight: range.getBoundingClientRect().height,
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
      };
    });
  }, start + (end - start) * p);
  for (const bounds of captionBounds) {
    assert.ok(bounds.text && bounds.width <= width - 123 && bounds.lineHeight <= bounds.fontSize * 1.65,
      `${id} p=${p} caption spills outside its line`);
  }
  return takePixels();
}

const frameImage = pixels => sharp(pixels, { raw: { width, height, channels: 4 } }).removeAlpha();
const md5 = pixels => createHash('md5').update(pixels).digest('hex');

function pixelDelta(before, after) {
  const total = width * 880;
  let changed = 0;
  for (let i = 0; i < total * 4; i += 4) {
    const delta = Math.max(Math.abs(before[i] - after[i]), Math.abs(before[i + 1] - after[i + 1]),
      Math.abs(before[i + 2] - after[i + 2]));
    if (delta >= 8) changed++;
  }
  return { changed, total, fraction: changed / total };
}

async function checkMotion(page, takePixels) {
  const before = await capture(page, takePixels, 'S12', .2);
  const after = await capture(page, takePixels, 'S12', .8);
  const { changed, total, fraction } = pixelDelta(before, after);
  assert.ok(fraction > .015, `S12 changed ${(fraction * 100).toFixed(2)}%, expected more than 1.5%`);
  console.log(`PASS 4 S12 p=0.20 vs p=0.80 | y=[0,880) | RGB delta >= 8 | ${changed}/${total} pixels | ${(fraction * 100).toFixed(2)}% (>1.50%)`);
}

async function checkDeterminism(page, takePixels, frames) {
  for (const { id, p, hash } of frames.toReversed()) {
    const repeat = md5(await capture(page, takePixels, id, p));
    assert.equal(repeat, hash, `${id} p=${p} depends on seek history`);
    console.log(`PASS 5 ${id} @ p=${p.toFixed(2)} | RGBA MD5 ${hash} = ${repeat}`);
  }
}

function countPixels(pixels, { x, y, w, h }, match) {
  let count = 0;
  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col++) {
      const i = (row * width + col) * 4;
      if (match(pixels[i], pixels[i + 1], pixels[i + 2])) count++;
    }
  }
  return count;
}

async function checkOverview(page, takePixels) {
  const pixels = await capture(page, takePixels, 'S13', .75);
  const gold = countPixels(pixels, { x: 874, y: 667, w: 172, h: 58 },
    (r, g, b) => r > 150 && r - b > 22 && g - b > 14);
  const infiltrate = countPixels(pixels, { x: 770, y: 370, w: 377, h: 258 },
    (r, g, b) => r < 160 && b > g + 20);
  assert.ok(gold >= 1200 && infiltrate >= 130, 'S13 shows a missing serosal band or infiltrate');
  if (showOverview) {
    const preview = await frameImage(pixels).resize(660).jpeg({ quality: 66 }).toBuffer();
    console.log(`S13_INSPECTION ${preview.toString('base64')}`);
  }
  console.log(`PASS S13 @ p=0.75 | gold-band pixels ${gold} | violet-infiltrate pixels ${infiltrate}`);
}

async function writeBoard(samples, scratch) {
  const frames = await Promise.all(samples.map(async ({ pixels }, index) => ({
    input: await frameImage(pixels).png().toBuffer(),
    left: (index % 2) * width,
    top: Math.floor(index / 2) * height,
  })));
  const pending = path.join(scratch, 'board');
  await sharp({ create: { width: width * 2, height: height * 2, channels: 3, background: '#F5F1E9' } })
    .composite(frames).png().toFile(pending);
  const { format, width: w, height: h, exif, iptc, xmp, comments } = await sharp(pending).metadata();
  assert.ok(format === 'png' && w === width * 2 && h === height * 2 && !exif && !iptc && !xmp && !comments?.length);
  await rename(pending, output);
  console.log(`${output} | ${w}×${h}`);
}

const scratch = await mkdtemp(path.join(section, '.gate-'));
assert.equal(path.dirname(path.resolve(scratch)), section);
// Keep the Chromium profile and its temporary files inside this section.
process.env.TEMP = scratch;
process.env.TMP = scratch;
process.env.TMPDIR = scratch;
let server;
let browser;
try {
  const runtime = await startServer();
  server = runtime.server;
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }),
    args: ['--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-partial-raster'],
  });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, locale: 'en-US' });
  const errors = [];
  const imageRequests = [];
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error(error.message);
  });
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', request => {
    if (request.resourceType() === 'image' && !request.url().endsWith('/favicon.ico')) imageRequests.push(request.url());
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'commit' });
  try {
    await page.waitForFunction(() => typeof window.renderAt === 'function', null, { timeout: 150_000 });
  } catch (error) {
    throw new Error(errors.join('\n') || error.message);
  }
  assert.deepEqual(errors, []);
  await checkOverview(page, runtime.takePixels);
  const frames = [];
  for (const [id, p] of samples) {
    const pixels = await capture(page, runtime.takePixels, id, p);
    frames.push({ id, p, pixels, hash: md5(pixels) });
    console.log(`${id} @ p=${p.toFixed(2)} | ${width}×${height}`);
  }
  await page.evaluate(() => window.renderCue('S12', .75));
  const counts = await page.evaluate(() => ({
    ...window.artCounts(),
    rasterNodesOnPage: document.querySelectorAll('img, image').length,
  }));
  assert.deepEqual(counts.lens, { x: 960, y: 465, diameter: 580 });
  assert.deepEqual(counts.highPowerLens, { x: 980, y: 445, rx: 560, ry: 275 });
  assert.equal(counts.infiltrate, 950);
  assert.equal(counts.layerLabels, 5);
  assert.ok(counts.liveHistologyCanvases >= 1, 'Frozen histology did not mount its canvas');
  assert.ok(counts.highPowerCells >= 140 && counts.fibrinThreads >= 80);
  assert.equal(counts.erythrocytes, 28);
  assert.ok(counts.leukocytes >= 5 && counts.leukocytes <= 6);
  assert.ok(counts.debrisNuclei >= 18 && counts.debrisNuclei <= 24);
  assert.ok(counts.cytoplasmAlpha === .55 && counts.chromatinWidth === .85);
  assert.ok(counts.crossingCells >= 2 && counts.crossingCells <= 3);
  assert.deepEqual(counts.clefts, [[1040, 20], [1230, 20]]);
  assert.equal(counts.rasterNodes, 0);
  assert.equal(counts.rasterNodesOnPage, 0);
  console.log(`PASS anatomy | H&E ${counts.infiltrate} infiltrating cells, ${counts.layerLabels} layer labels | S14 ${counts.highPowerCells} pus cells, ${counts.fibrinThreads} fibrin strands`);
  console.log(`PASS vessel | ${counts.erythrocytes} RBC, ${counts.leukocytes} neutrophils, ${counts.crossingCells} crossing | gaps ${counts.clefts.map(([x, width]) => `${x}:${width}px`).join(', ')} | cytoplasm alpha ${counts.cytoplasmAlpha}`);
  await checkMotion(page, runtime.takePixels);
  await checkDeterminism(page, runtime.takePixels, frames);
  assert.deepEqual(errors, []);
  assert.deepEqual(imageRequests, []);
  console.log('PASS browser | raster nodes 0 | raster requests 0');
  if (!auditOnly) await writeBoard(frames, scratch);
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  await rm(scratch, { recursive: true, force: true, maxRetries: 4, retryDelay: 125 });
}
