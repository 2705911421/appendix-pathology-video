import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { access, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { assertBlindReviewText } from '../shared/canvasCore.js';
import { resolveCue, samples, sheet } from './src/cue-sheet.js';

const section = await realpath(fileURLToPath(new URL('.', import.meta.url)));
const source = path.join(section, 'src');
const shared = path.resolve(section, '../shared');
const output = path.join(section, 'out');
const { width, height } = sheet;
const { cues } = sheet;

const files = (await readdir(source)).filter(name => /\.(?:js|html)$/u.test(name));
const sceneSource = (await Promise.all(files.map(name => readFile(path.join(source, name), 'utf8')))).join('\n');
const stillRefs = /\.(?:png|jpe?g|webp|avif|gif)\b|data:image|<(?:img|image)\b|new\s+Image\s*\(|\bloadImage\s*\(/giu;
const speechCalls = /SpeechSynthesisUtterance\s*\(|speechSynthesis\s*\.|\b(?:synthesizeSpeech|textToSpeech)\s*\(/gu;
assert.equal([...sceneSource.matchAll(stillRefs)].length, 0);
assert.equal([...sceneSource.matchAll(speechCalls)].length, 0);
console.log('PASS 1 | static image references: 0 | synthesis calls: 0');

const runnerSource = await readFile(fileURLToPath(import.meta.url), 'utf8');
const otherSections = /style[_]probe|s1[.]0[\\/]|s1[.]1-(?:[1-5]|[7-9]|[1-9][0-9]+)\b/giu;
assert.equal([...(sceneSource + runnerSource).matchAll(otherSections)].length, 0);
console.log('PASS 2 | cross-section references: 0');

const brushCalls = [...sceneSource.matchAll(/\bbrush\.[a-z]+\s*\(/giu)].length;
const strokeCalls = [...sceneSource.matchAll(/\bgetStroke\s*\(/gu)].length;
assert.ok(brushCalls > 0 && strokeCalls > 0);

assert.equal(sheet.duration, 47);
assert.deepEqual(cues.map(cue => cue.defaultDuration), [12, 15.5, 11.5, 8]);
assert.deepEqual(cues.at(-1), {
  id: 'S26', defaultDuration: 8, isCredits: true, zhText: '', highlightZh: [], enText: '', start: 39, end: 47,
});
for (const [id, p] of samples) {
  const cue = cues.find(item => item.id === id);
  const resolved = resolveCue(cues, cue.start + cue.defaultDuration * p);
  assert.equal(resolved.cue.id, id);
  assert.equal(resolved.p, p);
}

let referencesDeferred = false;
try {
  await access(path.join(shared, 'references.js'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  referencesDeferred = true;
}
const { outputFiles } = await build({
  entryPoints: [path.join(source, 'main.js')],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'browser',
  target: 'chrome120',
  logLevel: 'warning',
  define: { IS_MINIFIED: 'true' },
  plugins: [{
    name: 'section-canvas-backend',
    setup(builder) {
      builder.onResolve({ filter: /^\.\/detail\/watercolor\.js$/ }, args => {
        if (path.relative(shared, args.resolveDir) === '') return { path: path.join(source, 'brush-canvases.js') };
      });
      builder.onResolve({ filter: /\/shared\/references\.js$/ }, args => {
        if (referencesDeferred && path.relative(source, args.resolveDir) === '') {
          return { path: 'references', namespace: 'deferred-credit' };
        }
      });
      builder.onLoad({ filter: /^references$/, namespace: 'deferred-credit' }, () => ({
        contents: 'export const REFERENCES = [];', loader: 'js',
      }));
    },
  }],
});

const html = await readFile(path.join(source, 'index.html'));
const server = createServer((request, reply) => {
  if (request.url === '/') return reply.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
  if (request.url === '/section.js') {
    return reply.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' }).end(outputFiles[0].contents);
  }
  if (request.url === '/en-US.json') {
    return reply.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }).end('{"language":"en-US"}');
  }
  if (request.url === '/favicon.ico') return reply.writeHead(204).end();
  reply.writeHead(404).end();
});

const profile = await mkdtemp(path.join(section, '.gate1-'));
process.env.TEMP = profile;
process.env.TMP = profile;
let context;
try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  const executablePath = process.env.CHROME_PATH;
  context = await chromium.launchPersistentContext(path.join(profile, 'browser'), {
    channel: executablePath ? undefined : 'chrome',
    executablePath, headless: true, acceptDownloads: false, downloadsPath: profile,
    viewport: { width, height }, deviceScaleFactor: 1, locale: 'en-US',
    args: ['--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--disable-partial-raster', '--disable-lcd-text', '--disable-gpu-compositing'],
  });
  const page = context.pages()[0];
  const errors = [];
  const blocked = [];
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error(error.message);
  });
  await page.route('**/*', route => {
    const request = route.request();
    if (request.resourceType() === 'image' || !request.url().startsWith(`${url}/`)) {
      blocked.push(request.url());
      return route.abort();
    }
    return route.continue();
  });
  await page.addInitScript(() => {
    window.creditAudit = { draws: [], frames: [] };
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (line, x, y, ...rest) {
      if (this.canvas.classList.contains('review-credit')) {
        window.creditAudit.draws.push({ line, x, y, blur: this.shadowBlur });
      }
      return fill.call(this, line, x, y, ...rest);
    };
    const stroke = CanvasRenderingContext2D.prototype.strokeRect;
    CanvasRenderingContext2D.prototype.strokeRect = function (...original) {
      if (this.canvas.classList.contains('review-credit')) {
        window.creditAudit.frames.push([...original, this.strokeStyle, this.lineWidth]);
      }
      return stroke.apply(this, original);
    };
  });
  await page.goto(url, { waitUntil: 'commit' });
  try {
    await page.waitForFunction(() => typeof window.renderAt === 'function', null, { timeout: 180_000 });
  } catch (error) {
    throw new Error(errors.join('\n') || error.message);
  }

  async function seek(id, p) {
    const cue = cues.find(item => item.id === id);
    const seen = await page.evaluate(async time => {
      window.creditAudit = { draws: [], frames: [] };
      window.renderAt(time);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return document.querySelector('#plate').dataset.cue;
    }, cue.start + cue.defaultDuration * p);
    assert.deepEqual(errors, []);
    assert.equal(seen, id);
  }

  async function capture(id, p) {
    await seek(id, p);
    return page.screenshot({ scale: 'css', animations: 'disabled' });
  }

  const canvases = await page.locator('foreignObject canvas').count();
  assert.ok(canvases > 0);
  assert.deepEqual(blocked, []);
  console.log(`PASS 3 | brush calls: ${brushCalls} | getStroke calls: ${strokeCalls} | live canvas layers: ${canvases}`);

  const frames = new Map();
  for (const [id, p] of samples) frames.set(id, await capture(id, p));
  const raw = frame => sharp(frame).removeAlpha().raw().toBuffer();
  const cropped = frame => sharp(frame).extract({ left: 0, top: 0, width, height: 880 }).removeAlpha().raw().toBuffer();
  const early = await cropped(await capture('S24', .25));
  const late = await cropped(frames.get('S24'));
  let changed = 0;
  for (let i = 0; i < early.length; i += 3) {
    if (Math.max(Math.abs(early[i] - late[i]), Math.abs(early[i + 1] - late[i + 1]),
      Math.abs(early[i + 2] - late[i + 2])) >= 3) changed++;
  }
  const changeRate = changed / (width * 880) * 100;
  assert.ok(changeRate > 1.5, `S24 changed only ${changeRate.toFixed(2)}%`);
  console.log(`PASS 4 | S24 0.25 -> 0.82 | y=0..879 | ${changed}/${width * 880} changed (${changeRate.toFixed(2)}%)`);

  for (const p of [0, .25, .549, .55, .82, .999]) {
    await seek('S24', p);
    const rows = await page.evaluate(() => [1, 2].map(number => {
      const group = document.querySelector(`#s24-rule-${number}`);
      return {
        opacity: Number(getComputedStyle(group).opacity),
        accent: Number(getComputedStyle(group.querySelector('.phase-brush')).opacity),
        scale: Number(group.transform.baseVal.getItem(0).matrix.a.toFixed(2)),
        color: group.querySelector('.principle').getAttribute('fill'),
        text: group.querySelector('.principle').textContent,
      };
    }));
    const expectedText = ['1. 一旦确诊，通常建议在症状缓解期择期切除；', '2. 若正处于急性发作期，则视情况急诊手术。'];
    const active = Number(p >= .55);
    for (const [i, row] of rows.entries()) {
      assert.equal(row.opacity, active === i ? 1 : .72);
      assert.equal(row.accent, Number(active === i));
      assert.equal(row.scale, active === i ? [1.03, 1.04][i] : 1);
      assert.equal(row.color, active === 1 && i === 1 ? '#B82018' : '#1F1C19');
      assert.equal(row.text, expectedText[i]);
    }
  }
  console.log('PASS S24 board | switch=0.55 | inactive opacity=0.72 | exact text');

  const checksum = buffer => createHash('md5').update(buffer).digest('hex');
  for (const [id, p] of samples.toReversed()) {
    await seek(id, .09);
    const first = await raw(frames.get(id));
    const second = await raw(await capture(id, p));
    const md5 = checksum(first);
    assert.equal(checksum(second), md5, `${id} rendered different pixels after seeking`);
    console.log(`  ${id} @ ${p.toFixed(2)} MD5 ${md5} == ${md5}`);
  }

  await seek('S26', .60);
  const credit = await page.evaluate(() => {
    const canvas = document.querySelector('.review-credit');
    const otherLayersHidden = [...canvas.parentElement.children].filter(element => element !== canvas)
      .every(element => getComputedStyle(element).display === 'none');
    const paper = [...canvas.getContext('2d').getImageData(0, 0, 1, 1).data];
    return { otherLayersHidden, paper, ...window.creditAudit };
  });
  assert.ok(credit.otherLayersHidden);
  assert.deepEqual(credit.paper, [245, 241, 233, 255]);
  assert.equal(credit.frames.length, 1);
  const [border] = credit.frames;
  assert.deepEqual(border.slice(0, 5), [240, 95, 1440, 890, '#c5beb2']);
  assert.ok(Math.abs(border[5] - 1.2) < 1e-6);
  assert.ok(credit.draws.length >= 6);
  assert.equal(new Set(credit.draws.map(({ line }) => line)).size, credit.draws.length);
  assert.ok(credit.draws.every(({ x, y, blur }) => Number.isInteger(x) && Number.isInteger(y) && blur === 0));
  assert.deepEqual(credit.draws[0], { line: '创作说明', x: 960, y: 195, blur: 0 });
  const privateText = credit.draws.map(({ line }) => line).join('\n').normalize('NFKC').replace(/[\s\p{Cf}]/gu, '');
  const identity = /\u59d3\u540d|\u5b66\u53f7|\u5b66\u6821|\u5b66\u9662|\u73ed\u7ea7|\u6307\u5bfc\u6559\u5e08|\u6307\u5bfc\u8001\u5e08|\u4e09\u5ce1\u5927\u5b66|[\[\u3010]\u5f85\u586b[\]\u3011]/gu;
  const matches = [...privateText.matchAll(identity)];
  assert.equal(matches.length, 0);
  assertBlindReviewText(privateText);
  assert.deepEqual(blocked, []);
  console.log(`PASS 5 | 4/4 matching MD5 | blind-review hits: ${matches.length} | ${credit.draws.length} unique integer-position text draws`);

  const contactSheet = await sharp({
    create: { width: width * 2, height: height * 2, channels: 3, background: '#F5F1E9' },
  }).composite(samples.map(([id], i) => ({
    input: frames.get(id), left: i % 2 * width, top: Math.floor(i / 2) * height,
  }))).removeAlpha().png().toBuffer();
  const metadata = await sharp(contactSheet).metadata();
  assert.equal(metadata.width, width * 2);
  assert.equal(metadata.height, height * 2);
  assert.ok(!metadata.exif && !metadata.iptc && !metadata.xmp && !metadata.comments?.length);

  await mkdir(output, { recursive: true });
  const board = `keyframes_${sheet.module}.png`;
  const cueFile = `cues_${sheet.module}.json`;
  await writeFile(path.join(profile, board), contactSheet);
  await writeFile(path.join(profile, cueFile), `${JSON.stringify(sheet, null, 2)}\n`, 'utf8');
  await rename(path.join(profile, board), path.join(output, board));
  await rename(path.join(profile, cueFile), path.join(output, cueFile));
  console.log(`Gate 1 | ${metadata.width}x${metadata.height} | ${samples.map(([id, p]) => `${id}@${p.toFixed(2)}`).join(' ')}`);
  console.log(`References: ${referencesDeferred ? 'deferred' : 'loaded from frozen shared module'}`);
} finally {
  await context?.close();
  server.close();
  const scratch = await realpath(profile);
  assert.equal(path.dirname(scratch), section);
  await rm(scratch, { force: true, recursive: true, maxRetries: 3, retryDelay: 150 });
}
