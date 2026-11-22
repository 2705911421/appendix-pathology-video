import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { HEIGHT, WIDTH, assertBlindReviewText } from '../shared/canvasCore.js';

const section = await realpath(fileURLToPath(new URL('.', import.meta.url)));
const file = (...parts) => path.join(section, ...parts);
const boardPath = file('out', 'keyframes_s1.1-4.png');
const cuePath = file('out', 'cues_s1.1-4.json');
const locked = [
  { id: 'S15', duration: 13, p: .80 }, { id: 'S16', duration: 12.5, p: .75 },
  { id: 'S17', duration: 12, p: .75 }, { id: 'S18', duration: 13.5, p: .80 },
];
const sharedModules = new Set(['canvasCore.js', 'timelineHelper.js', 'leftFloatNotes.js',
  'anatomyWatercolor.js', 'histologyProcedural.js']);

const sheet = JSON.parse(await readFile(cuePath, 'utf8'));
assert.equal(sheet.module, 's1.1-4');
assert.deepEqual([sheet.width, sheet.height, sheet.fps], [WIDTH, HEIGHT, 30]);
assert.equal(sheet.cues.length, locked.length);
let end = 0;
const samples = sheet.cues.map((cue, index) => {
  const { id, duration, p } = locked[index];
  assert.equal(cue.id, id);
  assert.equal(cue.defaultDuration, duration);
  assert.equal(cue.start, end);
  end += duration;
  assert.equal(cue.end, end);
  assert.ok(cue.zhText && cue.enText && cue.highlightZh.length);
  assert.ok(cue.highlightZh.every(mark => cue.zhText.includes(mark)));
  assertBlindReviewText([cue.zhText, cue.enText].join(' '));
  return { ...cue, p };
});
assert.equal(sheet.duration, end);

async function sectionSources(directory) {
  const files = [];
  for (const child of await readdir(directory, { withFileTypes: true })) {
    if (child.name.startsWith('.') || child.name === 'out') continue;
    const target = path.join(directory, child.name);
    if (child.isDirectory()) files.push(...await sectionSources(target));
    else if (child.isFile() && /\.(?:mjs|js|cjs|html|css)$/u.test(child.name)) files.push(target);
  }
  return files;
}

async function auditSources() {
  // The matching destination is a file write. Browser sources have no raster filenames.
  const fileSuffix = String.raw`\.(?:png|jpe?g|webp|gif|avif)\b(?!\()`;
  const literalTags = '<' + '(?:img|image)\\b';
  const staticReference = new RegExp([fileSuffix, literalTags, 'data' + ':image',
    'new' + '\\s+Image\\b', 'load' + 'Image\\s*\\(', 'background-image\\s*:\\s*url\\s*\\('].join('|'), 'iu');
  const sibling = new RegExp(['style' + '_probe', String.raw`\bs1\.1-(?!4\b)\d+\b`,
    String.raw`\bs1\.0[\\/]`].join('|'), 'u');
  const hits = { static: [], sibling: [], shared: [] };
  for (const source of await sectionSources(section)) {
    let code = await readFile(source, 'utf8');
    if (source === file('gate1-keyframes.mjs')) code = code.replace(path.basename(boardPath), 'OUTPUT');
    const imageReference = staticReference.exec(code);
    if (imageReference) hits.static.push([path.relative(section, source), imageReference[0]]);
    if (sibling.test(code)) hits.sibling.push(path.relative(section, source));
    for (const [, name] of code.matchAll(/['"](?:\.\.\/)+shared\/([^'"]+)['"]/gu)) {
      if (!sharedModules.has(name)) hits.shared.push(name);
    }
  }
  assert.deepEqual(hits, { static: [], sibling: [], shared: [] });
  console.log('[PASS] 静态图片引用: 0');
  console.log('[PASS] 跨板块引用: 0，直接引用的共享模块均在冻结清单内');
}

const localWash = file('src', 'procedural-washes.mjs');
const coreWash = file('..', 'shared', 'detail', 'watercolor.js');
const bundle = await build({
  absWorkingDir: section, entryPoints: ['gate1.mjs'], outfile: 'gate1-bundle.js', write: false,
  bundle: true, format: 'esm', platform: 'browser', target: 'chrome120', sourcemap: 'external',
  define: { IS_MINIFIED: 'true' }, logLevel: 'warning',
  plugins: [{
    name: 'mount-watercolor-without-encoded-assets',
    setup(builder) {
      builder.onResolve({ filter: /watercolor\.js$/ }, request => {
        if (path.resolve(request.resolveDir, request.path) === coreWash) return { path: localWash };
      });
    },
  }],
});
const js = bundle.outputFiles.find(output => output.path.endsWith('gate1-bundle.js'));
const sourceMap = JSON.parse(bundle.outputFiles.find(output => output.path.endsWith('.js.map')).text);
const html = await readFile(file('gate1.html'));
const server = createServer((request, response) => {
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  if (pathname === '/') return response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
  if (pathname === '/gate1.js') return response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' }).end(js.contents);
  if (pathname === '/en.json') return response.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
  if (pathname === '/favicon.ico') return response.writeHead(204).end();
  return response.writeHead(404).end();
});

function countDrawingCalls(coverage) {
  const { functions } = coverage.result.find(entry => entry.url.endsWith('/gate1.js'));
  const brush = /^  brush\.\w+\(/u;
  const traces = [
    { library: 'p5.brush', source: '/anatomyWatercolor.js', name: 'paintWatercolor', call: brush },
    ...['brushTarget', 'pigment', 'washLayer'].map(name => ({
      library: 'p5.brush', source: 'procedural-washes.mjs', name, call: brush,
    })),
    { library: 'perfect-freehand', source: '/detail/ink.js', name: 'inkOutline', call: /\bgetStroke\(/u },
  ];
  const totals = new Map();
  for (const { library, source, name, call } of traces) {
    const entry = functions.find(func => func.functionName === name)?.ranges[0];
    assert.ok(entry?.count > 0, `Routine did not execute: ${name}`);
    const location = sourceMap.sources.findIndex(item => item.replaceAll('\\', '/').endsWith(source));
    assert.ok(location >= 0, `Routine source is missing: ${name}`);
    const lines = sourceMap.sourcesContent[location].split(/\r?\n/u);
    const first = lines.findIndex(line => line.startsWith(`function ${name}(`) || line.startsWith(`export function ${name}(`));
    const last = lines.findIndex((line, i) => i > first && line === '}');
    assert.ok(first >= 0 && last > first, `Routine definition is missing: ${name}`);
    const sites = lines.slice(first, last).filter(line => call.test(line)).length;
    assert.ok(sites > 0, `Drawing calls are missing: ${name}`);
    const amount = totals.get(library) ?? { sites: 0, calls: 0 };
    amount.sites += sites;
    amount.calls += sites * entry.count;
    totals.set(library, amount);
  }
  for (const [library, amount] of totals) {
    console.log(`[调用] ${library}: ${amount.sites} 个已执行调用行，${amount.calls} 次调用`);
  }
  console.log('[PASS] 真实调用 brush. / getStroke');
}

async function seek(page, sample, p = sample.p) {
  const time = sample.start + (sample.end - sample.start) * p;
  const result = await page.evaluate(async at => {
    const frame = window.renderAt(at);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return frame;
  }, time);
  assert.equal(result.id, sample.id);
  assert.ok(Math.abs(result.p - p) < 1e-9);
  assert.equal(await page.locator('img,image,audio,video').count(), 0);
  return page.screenshot({ scale: 'css' });
}

async function compose(frames) {
  return sharp({ create: { width: 2 * WIDTH, height: 2 * HEIGHT, channels: 3, background: '#F5F1E9' } })
    .composite(samples.map(({ id }, index) => ({
      input: frames.get(id), left: (index % 2) * WIDTH, top: Math.floor(index / 2) * HEIGHT,
    }))).removeAlpha().png().toBuffer();
}

const md5 = bytes => createHash('md5').update(bytes).digest('hex');

async function mainDiff(a, b) {
  const art = input => sharp(input).extract({ left: 0, top: 0, width: WIDTH, height: 881 }).removeAlpha().raw().toBuffer();
  const [first, second] = await Promise.all([art(a), art(b)]);
  let changed = 0;
  for (let i = 0; i < first.length; i += 3) {
    if (Math.max(Math.abs(first[i] - second[i]), Math.abs(first[i + 1] - second[i + 1]),
      Math.abs(first[i + 2] - second[i + 2])) >= 8) changed++;
  }
  return { changed, total: first.length / 3 };
}

async function auditFrameGeometry(page) {
  const result = await page.evaluate(() => {
    const info = window.gate1SceneInfo;
    const tangentTests = ['S17', 'S18'].map(id => {
      const { source, optic } = info[id];
      const leads = [...document.querySelectorAll(`#${id.toLowerCase()}-tangents line`)];
      return leads.length === 2 && leads.every(lead => {
        const [x, y, aimX, aimY] = ['x1', 'y1', 'x2', 'y2'].map(key => Number(lead.getAttribute(key)));
        const rx = aimX - optic.x;
        const ry = aimY - optic.y;
        return Math.hypot(x - source.x, y - source.y) < .001
          && Math.abs(Math.hypot(rx, ry) - optic.radius) < .001
          && Math.abs(rx * (x - aimX) + ry * (y - aimY)) < .01;
      });
    });
    const layers = [...document.querySelectorAll('.micro-layer')].map(node => node.textContent);
    return { info, tangentTests, layers };
  });
  const { S15, S16, S18 } = result.info;
  assert.deepEqual(S15.nativeDiameters, [25.5, 37.5, 40.5]);
  assert.deepEqual(result.layers, ['管腔', '黏膜', '黏膜下', '肌层', '浆膜']);
  assert.deepEqual([S16.shallow, S16.muscle], [228, 4]);
  assert.deepEqual([S18.plume.smokeLayers, S18.plume.drops, S18.exudateBoost], [3, 15, 1.48]);
  assert.deepEqual([S18.histology.thrombosed, S18.histology.fissurePus, S18.histology.fissureRedCells], [6, 132, 102]);
  assert.deepEqual(result.tangentTests, [true, true]);
  console.log('[PASS] Gate 0.9 管径与切片计数，S17 血栓和 S18 破口的双切线锚点');
}

const scratch = await mkdtemp(file('.gate1-'));
process.env.TMP = scratch;
process.env.TEMP = scratch;
process.env.TMPDIR = scratch;
let browser;
try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    channel: 'chrome', headless: true, executablePath: process.env.CHROME_PATH,
    args: ['--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-partial-raster'],
  });
  const page = await browser.newPage({ locale: 'en', viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => {
    if (!request.url().startsWith(`${origin}/`) || ['image', 'media'].includes(request.resourceType())) errors.push(request.url());
  });
  await page.route('**/*', route => route.request().url().startsWith(`${origin}/`) ? route.continue() : route.abort());
  const profiler = await page.context().newCDPSession(page);
  await profiler.send('Profiler.enable');
  await profiler.send('Profiler.startPreciseCoverage', { callCount: true, detailed: false });
  await page.goto(origin, { waitUntil: 'commit' });
  try {
    await page.waitForFunction(() => typeof window.renderAt === 'function', null, { timeout: 120_000 });
  } catch (error) {
    throw new Error(errors.join('\n') || error.message, { cause: error });
  }

  const frames = new Map();
  for (const sample of samples) {
    frames.set(sample.id, await seek(page, sample));
    console.log(`${sample.id} p=${sample.p.toFixed(2)} ${WIDTH}×${HEIGHT}`);
  }
  const board = await compose(frames);
  const { width, height, exif, iptc, xmp } = await sharp(board).metadata();
  assert.deepEqual([width, height], [2 * WIDTH, 2 * HEIGHT]);
  assert.ok(!exif && !iptc && !xmp);
  await auditFrameGeometry(page);
  await auditSources();
  countDrawingCalls(await profiler.send('Profiler.takePreciseCoverage'));
  await profiler.send('Profiler.stopPreciseCoverage');

  const before = await seek(page, samples.at(-1), .20);
  const { changed, total } = await mainDiff(before, frames.get('S18'));
  const ratio = 100 * changed / total;
  assert.ok(ratio > 1.5, `S18 main screen only changed ${ratio.toFixed(3)}%`);
  console.log(`[PASS] S18 活画 p=0.20 → 0.80，y=0–880，RGB 最大通道差≥8: ${changed}/${total} = ${ratio.toFixed(3)}%`);

  const replay = new Map();
  for (const sample of samples.toReversed()) replay.set(sample.id, await seek(page, sample));
  const original = md5(board);
  const repeated = md5(await compose(replay));
  assert.equal(repeated, original,
    `Frame replay differed: ${samples.filter(({ id }) => md5(frames.get(id)) !== md5(replay.get(id))).map(({ id }) => id).join(', ')}`);
  console.log(`[PASS] 原顺序与逆序回跳拼图 MD5: ${original} = ${repeated}`);
  assert.deepEqual(errors, []);

  const temporary = `${boardPath}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, board, { flag: 'wx' });
    await rename(temporary, boardPath);
  } finally {
    await rm(temporary, { force: true });
  }
  console.log(`2×2，${width}×${height} | ${boardPath}`);
} finally {
  if (browser) await browser.close();
  server.close();
  const resolved = await realpath(scratch);
  if (path.dirname(resolved) === section && path.basename(resolved).startsWith('.gate1-')) {
    await rm(resolved, { recursive: true, force: true });
  }
}
