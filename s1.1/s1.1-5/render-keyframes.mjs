import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { HEIGHT, WIDTH } from '../shared/canvasCore.js';
import { formats, readVideoTimeline, renderVideo } from './render-video.mjs';
import { sheet } from './src/cue-sheet.js';

const section = fileURLToPath(new URL('.', import.meta.url));
const shared = path.resolve(section, '../shared');
const src = path.join(section, 'src');
const out = path.join(section, 'out');
const samples = [['S19', .75], ['S20', .82], ['S21', .18], ['S21', .50], ['S21', .85], ['S22', .80]];
const audit = process.argv.includes('--audit');
const video = process.argv.includes('--video');
const preview = process.argv.includes('--preview');
assert.ok([audit, video, preview].filter(Boolean).length <= 1, 'Choose --preview, --video, or --audit');
const instrument = audit || preview;
const format = preview ? formats.preview : formats.master;
const videoInput = video || preview ? await readVideoTimeline(out, format) : null;
if (videoInput) {
  console.log(`[timeline] ${videoInput.timeline.duration.toFixed(6)}s at ${format.fps}fps | ${videoInput.totalFrames} frames | out/cues_s1.1-5.json`);
}
const markerMethods = new Map([
  [path.join(src, 'live-watercolor.js'), [/\bbrush\.([a-zA-Z]+)(?=\()/g, 'p5.brush']],
  [path.join(shared, 'anatomyWatercolor.js'), [/\bbrush\.([a-zA-Z]+)(?=\()/g, 'p5.brush']],
  [path.join(shared, 'detail', 'ink.js'), [/\bgetStroke(?=\()/g, 'perfect-freehand']],
]);
const sharedInk = path.join(shared, 'detail', 'ink.js');
const methodSites = new Map();

function hookCalls(line, pattern, library, source, index) {
  return line.replace(pattern, (callee, ...args) => {
    const method = args.length > 2 && typeof args[0] === 'string' ? args[0] : callee;
    const key = `${library}/${path.basename(source)}:${index + 1}/${method}`;
    methodSites.set(key, { library, method });
    const slot = `globalThis.__actCallCounts[${JSON.stringify(key)}]`;
    return `((...args) => (${slot} = (${slot} || 0) + 1, ${callee}(...args)))`;
  });
}

const liveWashes = {
  name: 'live-washes',
  setup(plugin) {
    plugin.onResolve({ filter: /(^|\/)watercolor\.js$/ }, ({ path: target, resolveDir }) => {
      if (path.resolve(resolveDir, target) === path.join(shared, 'detail', 'watercolor.js')) {
        return { path: path.join(src, 'live-watercolor.js') };
      }
    });
    if (instrument) plugin.onLoad({ filter: /(?:live-watercolor|anatomyWatercolor|ink)\.js$/ }, async ({ path: source }) => {
      if (!markerMethods.has(source)) return;
      const [pattern, library] = markerMethods.get(source);
      const lines = (await readFile(source, 'utf8')).split(/\r?\n/u);
      const contents = lines.map((line, index) => {
        const marked = hookCalls(line, pattern, library, source, index);
        return source === sharedInk ? hookCalls(marked, /\b(?:rough\.generator|props\[method\]|props\.toPaths)(?=\()/g,
          'Rough.js', source, index) : marked;
      }).join('\n');
      return { contents, loader: 'js', resolveDir: path.dirname(source) };
    });
  },
};

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(entries.map(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'out' || entry.name.startsWith('.chromium-') ? [] : sourceFiles(file);
    return entry.isFile() && /\.(?:html|js|mjs|cjs|ts|css|json|svg)$/iu.test(entry.name) ? [file] : [];
  }));
  return paths.flat().sort();
}

async function auditSource() {
  const patterns = [
    { number: 1, title: '静态图片扫描', directory: src,
      pattern: /\.(?:png|jpg|jpeg|webp)\b|data:image|base64|new\s+Image\b|\bloadImage\s*\(|<\s*(?:img|image)\b|background-image:\s*url\(/iu },
    { number: 2, title: '跨板块引用扫描', directory: section,
      pattern: new RegExp('style' + '_probe|s1[.]1-(?!5(?!\\d))\\d+|s1[.]0[/\\\\]', 'iu') },
  ];
  for (const { number, title, directory, pattern } of patterns) {
    const files = await sourceFiles(directory);
    const matches = (await Promise.all(files.map(async file => (await readFile(file, 'utf8')).split(/\r?\n/u)
      .flatMap((line, i) => pattern.test(line) ? [`${path.relative(section, file)}:${i + 1}: ${line}`] : [])))).flat();
    assert.equal(matches.length, 0, matches.join('\n'));
    console.log(`[${number}] PASS ${title} | ${files.length} files | ${matches.length} matches`);
  }
}

async function capture(page, id, p) {
  const cue = sheet.cues.find(item => item.id === id);
  const time = cue.start + p * (cue.end - cue.start);
  const checks = await page.evaluate(async ({ id, p, time }) => {
    window.renderAt(time);
    const { cue, progress } = document.querySelector('#plate').dataset;
    if (cue !== id || Math.abs(Number(progress) - p) > 1e-9) throw new Error('Unexpected cue or progress');
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const captions = ['.story-caption-cn', '.story-caption-en'].map(selector => {
      const element = document.querySelector(selector);
      const range = document.createRange();
      range.selectNodeContents(element);
      const box = range.getBoundingClientRect();
      return { width: box.width, height: box.height, text: element.textContent,
        font: Number.parseFloat(getComputedStyle(element).fontSize) };
    });
    const box = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
    const texts = selector => [...document.querySelectorAll(selector)].map(mark => ({ text: mark.textContent,
      ...mark.getBoundingClientRect().toJSON(), x: Number(mark.getAttribute('x')), y: Number(mark.getAttribute('y')) }));
    const clips = document.querySelectorAll('img, svg image').length;
    if (id === 'S19' || id === 'S20') {
      return { captions, clips, doctor: Boolean(document.querySelector('[data-doctor] canvas')),
        left: box('[data-pan="left"]'), right: box('[data-pan="right"]'), foot: box('[data-scale] [data-scale-foot]'),
        clinical: texts('[data-clinical-caption] text'), auxiliary: texts('[data-ct-caption] text'),
        statistic: texts('[data-stat] text'),
        auxiliaryOpacity: Number(document.querySelector('[data-ct-caption]').getAttribute('opacity')),
        statisticOpacity: Number(document.querySelector('[data-stat]').getAttribute('opacity')) };
    }
    if (id === 'S21') {
      return { captions, clips, film: box('[data-ct-box="main"]'), inset: box('[data-ct-box="zoom"]'),
        roi: box('[data-ct-roi]'),
        orientation: texts('[data-ct-orientation] g text'), title: texts('[data-zoom-title]'),
        notes: texts('[data-ct-notes]:not([hidden]) text'),
        study: Number(document.querySelector('[data-ct-stage]').dataset.ctStage),
        grossStage: Number(document.querySelector('[data-gross-stage]:not([hidden])').dataset.grossStage) };
    }
    return { captions, clips, final: texts('[data-urgency="1"] text'),
      wash: Number(document.querySelector('[data-urgency-wash]').getAttribute('opacity')) };
  }, { id, p, time });
  assert.equal(checks.clips, 0, 'The live stage must contain no static picture elements');
  for (const { width, height, text, font } of checks.captions) {
    assert.ok(width <= 1797 && height <= font * 1.65 && text, `Caption overflows in ${id} p=${p}: ${text}`);
  }
  if (id === 'S19' || id === 'S20') {
    const { doctor, left, right, foot, clinical, auxiliary, statistic, auxiliaryOpacity, statisticOpacity } = checks;
    assert.ok(doctor, 'The shared doctor canvas was not mounted');
    assert.deepEqual(clinical.map(({ x, y }) => [x, y]), [[1115, 515], [1115, 549]]);
    assert.deepEqual(auxiliary.map(({ x, y }) => [x, y]), [[1585, 440], [1585, 472]]);
    assert.ok(clinical.every(note => note.top > left.bottom) && auxiliary.every(note => note.top > right.bottom),
      'Balance labels overlap a tray or suspension cord');
    assert.ok(clinical.every(note => note.right < foot.left || note.bottom < foot.top),
      `Clinical labels overlap the scale base (label bottom ${Math.max(...clinical.map(note => note.bottom))}, foot top ${foot.top})`);
    assert.equal(auxiliaryOpacity, id === 'S20' ? 1 : 0);
    assert.ok(id === 'S20' ? statisticOpacity > .9 : statisticOpacity === 0);
    assert.match(statistic[0].text, /^多层螺旋 CT 诊断敏感度 > 93%$/u);
  } else if (id === 'S21') {
    const { film, inset, roi, orientation, title, notes, study, grossStage } = checks;
    const middle = film.left + film.width / 2;
    assert.deepEqual([film.x, film.y, film.width, film.height], [800, 245, 520, 400]);
    assert.deepEqual([inset.x, inset.y, inset.width, inset.height], [1365, 245, 445, 400]);
    assert.deepEqual(orientation.map(note => note.text), ['R', 'L']);
    assert.deepEqual(orientation.map(note => [note.x, note.y]), [[816, 261], [1304, 261]]);
    assert.ok(orientation[0].right < middle && orientation[1].left > middle
      && orientation.every(mark => mark.top >= film.top && mark.bottom < film.top + 65), 'Axial R/L orientation reversed');
    assert.ok(roi.left > film.left && roi.right < middle && roi.top > film.top + film.height * .36
      && roi.bottom < film.top + film.height * .68, 'ROI left the right iliac fossa');
    assert.equal(title[0].text, '右髂窝 · 2.4× 局部放大');
    assert.equal(study, p < .33 ? 0 : p < .66 ? 1 : 2);
    assert.equal(grossStage, study);
    assert.equal(notes.length, 2);
    assert.ok(notes.every(note => note.top >= 705 && note.left >= 840 && note.right <= 1800 && note.bottom <= 825),
      'CT annotations must fit the paper below both scans');
  } else {
    assert.ok(checks.wash <= .16 && checks.final[0].left >= 1120 && checks.final[0].right <= 1820);
    assert.equal(checks.final[0].text, '蜂窝织炎性、坏疽性阑尾炎需尽早手术切除！');
  }
  return page.screenshot({ type: 'png', scale: 'css', animations: 'disabled' });
}

async function composite(page) {
  const tiles = [];
  const gap = 12;
  for (const [index, [id, p]] of samples.entries()) {
    const input = await capture(page, id, p);
    tiles.push({ input, left: (index % 2) * (WIDTH + gap), top: Math.floor(index / 2) * (HEIGHT + gap) });
    console.log(`${id} @ p=${p.toFixed(2)} | ${WIDTH}×${HEIGHT}`);
  }
  const width = 2 * WIDTH + gap;
  const height = 3 * HEIGHT + 2 * gap;
  await mkdir(out, { recursive: true });
  const destination = path.join(out, 'keyframes_s1.1-5.png');
  const temporary = path.join(out, `keyframes_s1.1-5-${process.pid}.tmp`);
  const cueFile = path.join(out, 'cues_s1.1-5.json');
  const cueTemp = `${cueFile}.${process.pid}.tmp`;
  try {
    const board = await sharp({ create: { width, height, channels: 3, background: '#C8BDAE' } })
      .composite(tiles).removeAlpha().png().toFile(temporary);
    assert.deepEqual([board.width, board.height, board.channels], [width, height, 3]);
    await writeFile(cueTemp, `${JSON.stringify(sheet, null, 2)}\n`, { flag: 'wx' });
    await rename(temporary, destination);
    await rename(cueTemp, cueFile);
  } finally {
    await Promise.all([temporary, cueTemp].map(file => rm(file, { force: true })));
  }
  console.log(`2 columns × 3 rows | ${width}×${height} | ${destination}`);
  console.log(`Visual cue sheet | ${sheet.duration}s | ${cueFile}`);
}

async function auditLibraries(page) {
  const executed = await page.evaluate(() => globalThis.__actCallCounts);
  for (const library of ['p5.brush', 'perfect-freehand', 'Rough.js']) {
    const sites = [...methodSites].filter(([key, site]) => site.library === library && executed[key] > 0);
    const methods = new Set(sites.map(([, site]) => site.method));
    assert.ok(sites.length > 0, `${library} did not execute`);
    const required = { 'p5.brush': ['fill', 'fillBleed', 'fillTexture', 'set'],
      'Rough.js': ['props[method]'] }[library] ?? [];
    assert.ok(required.every(method => methods.has(method)), `Missing ${library} call: ${required.join(', ')}`);
    const calls = sites.reduce((count, [key]) => count + executed[key], 0);
    console.log(`[3] PASS ${library} | ${sites.length} executed source lines | ${calls} calls | ${[...methods].join(', ')}`);
  }
}

async function auditPreviewMotion(page, timeline) {
  await page.evaluate(cues => {
    const query = selector => document.querySelector(selector);
    const all = selector => Array.from(document.querySelectorAll(selector));
    const opacity = node => Number(node.getAttribute('opacity'));
    const require = (check, failure) => { if (!check) throw new Error(failure); };
    function at(id, p) {
      const cue = cues.find(item => item.id === id);
      window.renderAt(cue.start + p * (cue.end - cue.start));
    }
    const angle = () => Number(query('[data-beam]').getAttribute('transform').slice(7, -1));
    at('S19', 0);
    require(angle() === 0, 'The beam must start level');
    at('S19', .96);
    require(angle() === -11, 'The left load must settle to −11°');
    at('S20', .85);
    require(angle() === -7 && opacity(query('[data-ct-weight]')) === 1, 'CT load must settle to −7°');
    require(opacity(query('[data-stat-wash]')) <= .16, 'Statistic wash exceeds 0.16');
    const doctor = query('[data-doctor] canvas');
    const ctx = doctor.getContext('2d');
    const pixels = () => ctx.getImageData(0, 0, doctor.width, doctor.height).data;
    const before = pixels();
    at('S20', .85 + .6 / (cues[1].end - cues[1].start));
    require(pixels().some((channel, i) => i % 4 === 3 && channel > 0 && channel !== before[i]), 'Shared doctor motion is missing');

    const foot = '[data-scale] [data-scale-foot]';
    for (const id of ['S19', 'S20']) {
      for (let frame = 1; frame < 24; frame++) {
        at(id, frame / 24);
        const left = query('[data-pan="left"]').getBoundingClientRect();
        const right = query('[data-pan="right"]').getBoundingClientRect();
        const base = query(foot).getBoundingClientRect();
        for (const text of all('[data-clinical-caption] text').filter(text => opacity(text.parentElement) > 0)) {
          const b = text.getBoundingClientRect();
          require(b.top > left.bottom && (b.right < base.left || b.bottom < base.top), `Left pan overlaps a label in ${id}`);
        }
        if (opacity(query('[data-ct-caption]'))) {
          require(all('[data-ct-caption] text').every(text => text.getBoundingClientRect().top > right.bottom),
            'Right pan overlaps a label');
        }
      }
    }

    for (const [p, expected] of [[.20, 0], [.33, null], [.50, 1], [.66, null], [.83, 2]]) {
      at('S21', p);
      const weights = all('[data-gross-stage]').map(opacity);
      const active = weights.filter(weight => weight > 0);
      require(expected === null ? active.length === 2 && Math.abs(active[0] - .5) < .001 : weights[expected] === 1,
        `CT/organ dissolve does not match p=${p}`);
      if (expected === null) continue;
      const suffix = '[data-ct-notes]:not([hidden]) text';
      require(all(suffix).length === 2 && all(suffix).every(text => {
        const b = text.getBoundingClientRect();
        return b.top >= 705 && b.bottom <= 825 && b.right <= 1800;
      }), 'CT label must stay in the paper region');
      const sides = all('[data-ct-orientation] g text').map(text => [text.textContent, text.getAttribute('x'), text.getAttribute('y')]);
      require(JSON.stringify(sides) === JSON.stringify([['R', '816', '261'], ['L', '1304', '261']]), 'R/L markers shifted');
    }
    at('S21', .998);
    const source = query('[data-gross-stage="2"]').getBoundingClientRect();
    require(opacity(query('[data-ct-stage]')) === 0, 'CT frames still visible at handoff');
    at('S22', .002);
    const target = query('[data-specimen="1"]').getBoundingClientRect();
    require(Math.abs(source.x - target.x) < 3 && Math.abs(source.width - target.width) < 2, 'Organ handoff jumped');
    at('S22', .85);
    require(opacity(query('[data-urgency-wash]')) <= .16 && !query('[clip-path] text'), 'Conclusion wash or text mask failed');
  }, timeline.cues);
  console.log('[motion] PASS balance clearance, −11°/−7°, both CT dissolves, and specimen handoff');
}

async function auditDraw(page) {
  const before = await capture(page, 'S21', .15);
  const after = await capture(page, 'S21', .85);
  const looped = await capture(page, 'S21', .15);
  await auditLibraries(page);

  const regionHeight = 880;
  const raster = buffer => sharp(buffer).removeAlpha().raw().toBuffer();
  const [early, late, returnFrame] = await Promise.all([before, after, looped].map(raster));
  let changed = 0;
  const tolerance = 8;
  const pixels = WIDTH * regionHeight;
  for (let i = 0; i < pixels * 3; i += 3) {
    if (channelDelta(early, late, i) > tolerance) changed++;
  }
  const rate = changed / pixels;
  assert.ok(rate > .015, `Live image changed only ${(rate * 100).toFixed(3)}%`);
  console.log(`[4] PASS 活画验证 | S21 p=0.15 vs p=0.85 | 0 ≤ y < 880 | max RGB delta > ${tolerance}/255`);
  console.log(`    ${changed}/${pixels} pixels changed (${(rate * 100).toFixed(3)}% > 1.5%)`);
  const md5 = buffer => createHash('md5').update(buffer).digest('hex');
  const [original, seekBack] = [early, returnFrame].map(md5);
  assert.equal(seekBack, original, original === seekBack ? '' : `RGB raster drift after seeking: ${rasterDrift(early, returnFrame)}`);
  console.log(`[5] PASS 确定性 MD5 | 1920×1080 RGB | S21 p=0.15 → 0.85 → 0.15 | ${original} = ${seekBack}`);
}

function channelDelta(a, b, index) {
  return Math.max(Math.abs(a[index] - b[index]), Math.abs(a[index + 1] - b[index + 1]), Math.abs(a[index + 2] - b[index + 2]));
}

function rasterDrift(a, b) {
  let pixels = 0, peak = 0;
  let left = WIDTH, top = HEIGHT, right = 0, bottom = 0;
  for (let i = 0; i < a.length; i += 3) {
    const delta = channelDelta(a, b, i);
    if (!delta) continue;
    const x = (i / 3) % WIDTH;
    const y = Math.floor(i / 3 / WIDTH);
    pixels++;
    peak = Math.max(peak, delta);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  return `${pixels} pixels, peak channel delta ${peak}/255, bounds (${left},${top})–(${right},${bottom})`;
}

if (instrument) await auditSource();
const { outputFiles: [bundle] } = await build({
  entryPoints: [path.join(src, 'main.js')], bundle: true, write: false, format: 'esm', platform: 'browser',
  target: 'chrome120', define: { IS_MINIFIED: 'true' }, plugins: [liveWashes], logLevel: 'warning',
});
const html = await readFile(path.join(src, 'index.html'));
const assets = new Map([
  ['/', ['text/html; charset=utf-8', html]],
  ['/act.js', ['text/javascript; charset=utf-8', bundle.contents]],
  ['/zh-CN.json', ['application/json; charset=utf-8', '{}']],
]);
const server = createServer((request, response) => {
  const { pathname } = new URL(request.url, 'http://127.0.0.1');
  if (pathname === '/favicon.ico') return response.writeHead(204).end();
  const asset = assets.get(pathname);
  if (!asset) return response.writeHead(404).end();
  return response.writeHead(200, { 'Content-Type': asset[0] }).end(asset[1]);
});

const scratch = await mkdtemp(path.join(section, '.chromium-'));
let browser;
try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  process.env.TMP = scratch;
  process.env.TEMP = scratch;
  const executablePath = process.env.CHROME_PATH;
  const args = ['--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-partial-raster'];
  if (videoInput) args.push('--disable-gpu-compositing');
  const options = { headless: true, executablePath, args };
  try {
    browser = await chromium.launch(options);
  } catch (error) {
    if (executablePath || !String(error).includes("Executable doesn't exist")) throw error;
    browser = await chromium.launch({ ...options, channel: 'chrome' });
  }
  const url = `http://127.0.0.1:${server.address().port}`;
  const errors = [];
  const assertHealthy = () => assert.deepEqual(errors, []);
  async function openPage() {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1, locale: 'zh-CN' });
    page.on('pageerror', error => errors.push(error.stack ?? error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('crash', () => errors.push('The Chromium renderer crashed'));
    await page.route('**/*', route => {
      const request = route.request();
      if (request.url().startsWith(`blob:${url}/`)) return route.continue();
      if (request.url().startsWith(`${url}/`) && !['image', 'media'].includes(request.resourceType())) return route.continue();
      errors.push(`Unexpected asset request: ${request.url()}`);
      return route.abort();
    });
    if (instrument) await page.addInitScript(() => { globalThis.__actCallCounts = {}; });
    if (videoInput) await page.addInitScript(timeline => { globalThis.__sectionCueSheet = timeline; }, videoInput.timeline);
    await page.goto(url, { waitUntil: 'commit' });
    await page.waitForFunction(() => window.ready === true, null, { timeout: videoInput ? 120_000 : 65_000 });
    return page;
  }
  try {
    const [page, other] = await Promise.all(videoInput ? [openPage(), openPage()] : [openPage()]);
    assertHealthy();
    if (preview) {
      await auditPreviewMotion(page, videoInput.timeline);
      await auditLibraries(page);
    }
    if (videoInput) await renderVideo({ pages: [page, other], assertHealthy, ...videoInput, out, format });
    else if (audit) await auditDraw(page);
    else await composite(page);
  } catch (error) {
    if (errors.length) console.error(errors.join('\n'));
    throw error;
  }
  assertHealthy();
} finally {
  if (browser) await browser.close();
  if (server.listening) {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
  // The target was allocated in this section and is the only directory removed here.
  assert.equal(path.dirname(path.resolve(scratch)), path.resolve(section));
  await rm(scratch, { recursive: true, force: true, maxRetries: 3, retryDelay: 120 });
}
