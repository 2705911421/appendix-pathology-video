import assert from 'node:assert/strict';
import { renderProfile as masterProfile } from '../shared/renderProfile.js';
import { execFile, spawn } from 'node:child_process';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, realpath, rename, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { cueTime, sectionDuration, sheet } from './src/cues.js';

const exec = promisify(execFile);
const root = fileURLToPath(new URL('.', import.meta.url));
const out = await realpath(path.join(root, 'out'));
const previewMode = process.argv.includes('--preview');
assert.deepEqual([sheet.width, sheet.height, sheet.fps], [1920, 1080, 30]);
const scale = previewMode ? .5 : 1;
const dpr = 1;
const viewport = { width: sheet.width * scale, height: sheet.height * scale };
const { width, height } = viewport;
const fps = previewMode ? 12 : 30;
const totalFrames = Math.round(sectionDuration * fps);
assert.ok(totalFrames >= 3 && /^[a-z0-9][a-z0-9.-]+$/iu.test(sheet.module));
const expectedDuration = totalFrames / fps;
const workers = previewMode ? 1 : 2;
const reloadInterval = previewMode ? totalFrames : 300;
const filename = previewMode ? `preview_${sheet.module}_12fps.mp4` : `${sheet.module}_video.mp4`;
const destination = path.join(out, filename);
const pending = path.join(out, `.${path.parse(filename).name}-${randomUUID()}.partial.mp4`);
const errors = [];

const [{ outputFiles }, html] = await Promise.all([
  build({
    entryPoints: [path.join(root, 'src', 'scene.js')], bundle: true, write: false, format: 'esm',
    platform: 'browser', target: 'chrome120', define: { IS_MINIFIED: 'true' },
  }),
  readFile(path.join(root, 'index.html')),
]);
const pageHtml = previewMode ? html.toString().replace('</head>',
  '<style>html,body{overflow:hidden}#plate{transform:scale(.5);transform-origin:0 0}</style></head>') : html;

const server = createServer((request, response) => {
  if (request.url === '/') return response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(pageHtml);
  if (request.url === '/scene.js') return response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' })
    .end(outputFiles[0].contents);
  if (request.url === '/favicon.ico') return response.writeHead(204).end();
  response.writeHead(404).end();
});
const profile = await mkdtemp(path.join(out, previewMode ? '.preview-browser-' : '.gate2-browser-'));
assert.equal(path.dirname(await realpath(profile)), out);

async function launchBrowser(directory) {
  const settings = {
    headless: true, locale: 'zh-CN', viewport, deviceScaleFactor: dpr,
    executablePath: process.env.CHROME_PATH,
    downloadsPath: profile, tracesDir: profile,
    args: ['--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--disable-partial-raster'],
  };
  try {
    return await chromium.launchPersistentContext(directory, settings);
  } catch (error) {
    if (settings.executablePath || !String(error).includes("Executable doesn't exist")) throw error;
    return chromium.launchPersistentContext(directory, { ...settings, channel: 'chrome' });
  }
}

async function ready(page) {
  try {
    await page.waitForFunction(() => window.ready === true && typeof window.renderAt === 'function',
      null, { timeout: 120_000, polling: 100 });
  } catch (error) {
    throw new Error(errors.join('\n') || error.message);
  }
  assert.deepEqual(errors, []);
}

const contexts = [];
async function prepareLane(slot, origin) {
  const directory = path.join(profile, `lane-${slot + 1}`);
  await mkdir(directory);
  const context = await launchBrowser(directory);
  contexts.push(context);
  await context.addInitScript(() => {
    window.__gate2CanvasText = null;
    for (const method of ['fillText', 'strokeText']) {
      const draw = CanvasRenderingContext2D.prototype[method];
      CanvasRenderingContext2D.prototype[method] = function (text, ...args) {
        window.__gate2CanvasText?.add(String(text));
        return draw.call(this, text, ...args);
      };
    }
  });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === origin && ['/', '/scene.js', '/favicon.ico'].includes(url.pathname)) return route.continue();
    errors.push(`Unexpected page resource: ${url.href}`);
    return route.abort();
  });
  const page = context.pages()[0] ?? await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', item => {
    if (item.type() === 'error') errors.push(item.text());
  });
  await page.goto(origin, { waitUntil: 'commit' });
  await ready(page);
  return { page, cdp: previewMode ? await context.newCDPSession(page) : null };
}

const debugMarker = /\b(?:S\d{1,3}\s*@|cue\s*[:=]\s*S\d+|(?:frame|fps|p|t)\s*[:=]\s*(?:\d|\.\d))/iu;

async function capture({ page, cdp }, frame, audit = false) {
  const visible = await page.evaluate(async ({ t, audit }) => {
    if (audit) window.__gate2CanvasText = new Set();
    window.renderAt(t);
    await new Promise(resolve => {
      const deadline = setTimeout(resolve, 350);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        clearTimeout(deadline);
        resolve();
      }));
    });
    if (audit) {
      const text = [document.body.innerText, ...window.__gate2CanvasText];
      window.__gate2CanvasText = null;
      return { text, width: innerWidth, height: innerHeight, dpr: devicePixelRatio,
        rasterNodes: document.querySelectorAll('img,image').length };
    }
    return null;
  }, { t: frame / fps, audit });
  if (visible) {
    assert.deepEqual([visible.width, visible.height, visible.dpr], [viewport.width, viewport.height, dpr]);
    assert.equal(visible.rasterNodes, 0);
    const marker = visible.text.find(text => debugMarker.test(text));
    assert.equal(marker, undefined, `Visible debug text at frame ${frame}`);
  }
  if (cdp) {
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png', fromSurface: true, captureBeyondViewport: false, optimizeForSpeed: true,
    });
    return Buffer.from(data, 'base64');
  }
  return page.screenshot({ type: 'png', scale: 'css', timeout: 30_000 });
}

function shuffle(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const other = randomInt(i + 1);
    [copy[i], copy[other]] = [copy[other], copy[i]];
  }
  return copy;
}

async function digest(png) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height, info.channels], [width, height, 3]);
  return createHash('md5').update(data).digest('hex');
}

async function difference(first, second) {
  const [a, b] = await Promise.all([first, second].map(png => sharp(png).removeAlpha().raw().toBuffer()));
  let count = 0;
  let max = 0;
  const bounds = { left: width, top: height, right: 0, bottom: 0 };
  for (let i = 0; i < a.length; i += 3) {
    const delta = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
    if (!delta) continue;
    const x = i / 3 % width;
    const y = Math.floor(i / 3 / width);
    bounds.left = Math.min(bounds.left, x);
    bounds.top = Math.min(bounds.top, y);
    bounds.right = Math.max(bounds.right, x);
    bounds.bottom = Math.max(bounds.bottom, y);
    count++;
    max = Math.max(max, delta);
  }
  return { count, max, bounds };
}

async function preflight(lanes) {
  const frames = previewMode
    ? [['S07', .43], ['S09', .90]].map(([id, p]) => Math.round(cueTime(id, p) * fps))
    : Array.from({ length: 3 }, (_, i) => randomInt(Math.floor(totalFrames * i / 3), Math.floor(totalFrames * (i + 1) / 3)));
  const firstOrder = shuffle(frames);
  const shuffled = shuffle(frames);
  const replayOrder = shuffled.every((frame, i) => frame === firstOrder[i]) ? shuffled.slice(1).concat(shuffled[0]) : shuffled;
  const baseline = new Map();
  const preview = new Map();
  for (const frame of firstOrder) {
    const png = await capture(lanes[0], frame, true);
    baseline.set(frame, { png, hash: await digest(png) });
    preview.set(frame, await sharp(png).resize({ width: 400 }).toBuffer());
  }
  for (const frame of replayOrder) {
    const png = await capture(lanes.at(-1), frame, true);
    const hash = await digest(png);
    const first = baseline.get(frame);
    if (hash !== first.hash) {
      const delta = await difference(first.png, png);
      throw new Error(`Preflight MD5 differs at frame ${frame}: ${first.hash} vs ${hash}; ${JSON.stringify(delta)}`);
    }
    console.log(`[Preflight] frame=${frame} t=${(frame / fps).toFixed(6)}s MD5=${hash} MATCH`);
  }
  assert.deepEqual(errors, []);
  console.log(`[Preflight] PASS | order ${firstOrder.join(',')} -> ${replayOrder.join(',')} | visible debug markers=0`);
  const previewPath = path.join(profile, 'preflight.jpg');
  await sharp({ create: { width: frames.length * 400, height: 225, channels: 3, background: '#F5F1E9' } })
    .composite(frames.map((frame, i) => ({ input: preview.get(frame), left: i * 400, top: 0 })))
    .jpeg({ quality: 86 }).toFile(previewPath);
  console.log(`[Preflight] review ${previewPath}`);
}

async function findSource(pattern, paths, extra = []) {
  try {
    const { stdout } = await exec('rg', ['--no-config', '--hidden', '--pcre2', '-n', ...extra, '-e', pattern, ...paths],
      { cwd: root, windowsHide: true });
    return stdout.trim().split(/\r?\n/).filter(Boolean);
  } catch (error) {
    if (error.code === 1) return [];
    throw error;
  }
}

async function auditPreview(lanes) {
  const image = String.raw`(?i)\.(?:png|jpe?g|webp)|data:image|new\s+Image\b|loadImage\b|<\s*img\b|<\s*image\b`;
  const speech = String.raw`(?i)\b(?:speechSynthesis|SpeechSynthesisUtterance|synthesizeSpeech|textToSpeech)\b`;
  const other = `(?i)(?:\\b${['style','probe'].join('_')}\\b|\\bs1[.]1-(?!2\\b)[0-9]+(?=[/\\\\'"\\x60]))`;
  const [images, tts, cross] = await Promise.all([
    findSource(image, ['src', 'index.html']),
    findSource(speech, ['src', 'index.html']),
    findSource(other, ['.'], ['-g', '*.js', '-g', '*.mjs', '-g', '*.html', '-g', '*.json', '-g', '!out/.*-browser-*/**']),
  ]);
  assert.deepEqual(images, []);
  assert.deepEqual(tts, []);
  console.log('[1/4] PASS | static image references=0 | TTS calls=0');
  assert.deepEqual(cross, []);
  console.log('[2/4] PASS | cross-section references=0');
  const expressions = { brush: String.raw`\bbrush\.\w+\(`, getStroke: String.raw`\bgetStroke\(`,
    flubber: String.raw`\bflubber\.(?:interpolate|toCircle)\(` };
  const [sites, runtime] = await Promise.all([
    Promise.all(Object.entries(expressions).map(async ([name, expression]) =>
      [name, (await findSource(expression, ['src'])).length])),
    lanes[0].page.evaluate(() => window.sceneMetrics),
  ]);
  const { calls, dimensions, incisionWindow } = runtime;
  assert.ok(sites.every(([, count]) => count > 0));
  assert.ok([calls.fill, calls.fillBleed, calls.getStroke, calls.interpolate, calls.toCircle].every(count => count > 0));
  assert.deepEqual(Object.values(dimensions).map(stage => [stage.cecum, stage.ileum, stage.appendix]),
    [[150, 63, 16.5], [150, 63, 25.5], [150, 63, 37.5]]);
  assert.equal(incisionWindow.wallFraction * 2, .6);
  console.log(`[3/4] PASS | call-site lines ${JSON.stringify(Object.fromEntries(sites))} | live ${JSON.stringify(calls)}`);
  await preflight(lanes);
  console.log('[4/4] PASS | two time points, reverse-order RGB MD5 match | debug markers=0');
}

function startEncoder() {
  const args = [
    '-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', 'pipe:0',
    '-map', '0:v:0', '-c:v', 'libx264', ...(previewMode ? [] : ['-profile:v', 'high', '-level', masterProfile.level]),
    '-pix_fmt', 'yuv420p', '-crf', previewMode ? '26' : '17', '-preset', previewMode ? 'veryfast' : 'slow',
    '-an', '-movflags', '+faststart', pending,
  ];
  const child = spawn('ffmpeg', args, { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
  child.stdin.on('error', () => {});
  child.stderr.setEncoding('utf8');
  let detail = '';
  child.stderr.on('data', text => { detail = (detail + text).slice(-12_000); });
  const done = new Promise(resolve => {
    child.once('error', error => resolve({ ok: false, detail: error.message }));
    child.once('close', (code, signal) => resolve({ ok: code === 0, detail: detail.trim() || String(signal ?? code) }));
  });
  return { child, done };
}

function writeFrame(encoder, png) {
  return new Promise((resolve, reject) => {
    encoder.child.stdin.write(png, error => error ? reject(error) : resolve());
  });
}

async function streamFrames(lanes, encoder) {
  const started = performance.now();
  const schedule = (slot, frame) => capture(lanes[slot], frame).then(png => ({ png }), error => ({ error }));
  for (let start = 0; start < totalFrames; start += reloadInterval) {
    if (start > 0) {
      await Promise.all(lanes.map(async ({ page }) => {
        await page.reload({ waitUntil: 'commit' });
        await ready(page);
      }));
      console.log(`[Render] page.reload after frame count ${start} | ${lanes.length} pages`);
    }
    const end = Math.min(start + reloadInterval, totalFrames);
    const queue = lanes.slice(0, end - start).map((_, slot) => schedule(slot, start + slot));
    for (let frame = start; frame < end; frame++) {
      const slot = (frame - start) % lanes.length;
      const result = await queue[slot];
      if (result.error) throw result.error;
      if (frame + lanes.length < end) queue[slot] = schedule(slot, frame + lanes.length);
      await writeFrame(encoder, result.png);
      if ([1, 15, 30].includes(frame + 1) || (frame + 1) % 150 === 0 || frame + 1 === totalFrames) {
        assert.deepEqual(errors, []);
        const rate = (frame + 1) / ((performance.now() - started) / 1000);
        console.log(`[Render] ${frame + 1}/${totalFrames} frames streamed | ${rate.toFixed(2)} frames/s`);
      }
    }
  }
  encoder.child.stdin.end();
  const result = await encoder.done;
  assert.ok(result.ok, `FFmpeg failed: ${result.detail}`);
}

async function verifyVideo() {
  const { stdout, stderr } = await exec('ffprobe', [
    '-v', 'error', '-count_frames', '-show_entries',
    'stream=codec_type,codec_name,profile,level,pix_fmt,width,height,avg_frame_rate,r_frame_rate,nb_frames,nb_read_frames,duration,duration_ts,time_base:format=duration,size',
    '-of', 'json', pending,
  ], { windowsHide: true });
  assert.equal(stderr.trim(), '');
  const { streams, format } = JSON.parse(stdout);
  assert.equal(streams.length, 1, 'The master must contain exactly one video stream');
  const [video] = streams;
  assert.deepEqual([video.codec_type, video.codec_name, video.pix_fmt], ['video', 'h264', 'yuv420p']);
  if (!previewMode) assert.deepEqual([video.profile, video.level], ['High', Number(masterProfile.level) * 10]);
  assert.deepEqual([video.width, video.height, video.avg_frame_rate, video.r_frame_rate],
    [width, height, `${fps}/1`, `${fps}/1`]);
  assert.equal(Number(video.nb_read_frames), totalFrames);
  assert.equal(Number(video.nb_frames), totalFrames);
  const [timeNum, timeDen] = video.time_base.split('/').map(Number);
  assert.equal(video.duration_ts * timeNum * fps, timeDen * totalFrames);
  assert.ok(Math.abs(Number(format.duration) - expectedDuration) <= 1e-6);
  const { size } = await stat(pending);
  assert.equal(Number(format.size), size);
  if (previewMode) assert.ok(size < 3_000_000, `Preview exceeds 3 MB: ${size} bytes`);
  return { duration: format.duration, frames: totalFrames, size, audioStreams: 0, video };
}

let encoder;
let published = false;
try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  console.log(`[Timeline] ${sheet.module} | ${sectionDuration}s | ${totalFrames} frames | ${width}×${height} @ ${fps}fps`);
  const opened = await Promise.allSettled(Array.from({ length: workers }, (_, slot) => prepareLane(slot, origin)));
  const lanes = opened.map(result => {
    if (result.status === 'rejected') throw result.reason;
    return result.value;
  });
  if (previewMode) await auditPreview(lanes);
  else await preflight(lanes);
  console.log(`[Render] ${lanes.length} Chromium instances -> FFmpeg image2pipe | temporary PNG frames written: 0`);
  encoder = startEncoder();
  await streamFrames(lanes, encoder);
  console.log('[Render] FFmpeg encoding complete. Verifying exact frame count and duration with ffprobe.');
  const verified = await verifyVideo();
  await rename(pending, destination);
  published = true;
  console.log(`[Verified] ${JSON.stringify(verified)}`);
  console.log(`[${previewMode ? 'Preview' : 'Master'}] ${destination}`);
} finally {
  if (encoder && encoder.child.exitCode === null && encoder.child.signalCode === null) {
    encoder.child.stdin.destroy();
    encoder.child.kill();
    await encoder.done;
  }
  try {
    await Promise.all(contexts.map(context => context.close()));
  } finally {
    server.close();
    if (!published) await rm(pending, { force: true });
    assert.equal(path.dirname(await realpath(profile)), out);
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
    console.log('[Cleanup] Temporary Chromium profile removed. Temporary PNG frames written: 0.');
  }
}
