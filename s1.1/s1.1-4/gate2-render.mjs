import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { createHash, randomInt } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, realpath, rename, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { auditDrawing, auditMotion, auditSources } from './preview-audit.mjs';

const section = await realpath(fileURLToPath(new URL('.', import.meta.url)));
const file = (...parts) => path.join(section, ...parts);
assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--preview'), 'Unknown render mode');
const preview = process.argv[2] === '--preview';
const output = file('out', preview ? 'preview_s1.1-4_12fps.mp4' : 's1.1-4_video.mp4');
const cuePath = file('out', 'cues_s1.1-4.json');
const width = 1920;
const height = 1080;
const sourceFps = 30;
const fps = preview ? 12 : sourceFps;
const dpr = preview ? .5 : 1;
const encodedWidth = width * dpr;
const encodedHeight = height * dpr;
const reloadEvery = 300;
const pageCount = 2;

function normalizeSheet(sheet) {
  assert.equal(sheet.module, 's1.1-4');
  assert.deepEqual([sheet.width, sheet.height, sheet.fps], [width, height, sourceFps]);
  assert.ok(sheet.cues?.length, 'The section cue sheet is empty');
  let end = 0;
  const ids = new Set();
  const cues = sheet.cues.map(cue => {
    const duration = cue.duration ?? cue.defaultDuration;
    assert.ok(Number.isFinite(duration) && duration > 0, `Invalid duration for ${cue.id}`);
    assert.ok(cue.id && !ids.has(cue.id), `Repeated or missing cue ID: ${cue.id}`);
    ids.add(cue.id);
    const start = end;
    end += duration;
    return { ...cue, duration, start, end };
  });
  return { ...sheet, duration: end, cues };
}

const sheet = normalizeSheet(JSON.parse(await readFile(cuePath, 'utf8')));
const totalFrames = Math.round(sheet.duration * fps);
assert.ok(totalFrames >= 3);
console.log(`时间轴 ${sheet.cues.map(cue => `${cue.id} ${cue.duration}s`).join(' / ')} | ${sheet.duration.toFixed(6)}s | ${totalFrames} 帧 @ ${fps}fps`);
if (preview) await auditSources(section);

const coreWash = file('..', 'shared', 'detail', 'watercolor.js');
const { outputFiles } = await build({
  absWorkingDir: section, entryPoints: ['gate1.mjs'], bundle: true, write: false,
  format: 'esm', platform: 'browser', target: 'chrome120', define: { IS_MINIFIED: 'true' },
  ...(preview ? { outfile: 'preview-bundle.js', sourcemap: 'external' } : {}),
  plugins: [{
    name: 'reuse-gate1-watercolor-and-use-the-current-timeline',
    setup(builder) {
      builder.onResolve({ filter: /watercolor\.js$/ }, request => {
        if (path.resolve(request.resolveDir, request.path) === coreWash) {
          return { path: file('src', 'procedural-washes.mjs') };
        }
      });
      builder.onLoad({ filter: /cues_s1\.1-4\.json$/ }, request => {
        if (request.path === cuePath) return { contents: JSON.stringify(sheet), loader: 'json' };
      });
    },
  }],
});
const script = outputFiles.find(output => output.path.endsWith('preview-bundle.js')) ?? outputFiles[0];
const sourceMap = preview ? JSON.parse(outputFiles.find(output => output.path.endsWith('.js.map')).text) : null;
const routes = new Map([
  ['/', { type: 'text/html; charset=utf-8', body: await readFile(file('gate1.html')) }],
  ['/gate1.js', { type: 'text/javascript; charset=utf-8', body: script.contents }],
  ['/en.json', { type: 'application/json', body: '{}' }],
]);
const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const page = routes.get(url.pathname);
  if (page) return response.writeHead(200, { 'Content-Type': page.type }).end(page.body);
  return response.writeHead(url.pathname === '/favicon.ico' ? 204 : 404).end();
});

async function ready(worker) {
  try {
    await worker.page.waitForFunction(() => typeof window.renderAt === 'function', null, { timeout: 120_000 });
    const viewport = await worker.page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio]);
    assert.deepEqual(viewport, [width, height, dpr]);
    assert.deepEqual(worker.errors, []);
  } catch (error) {
    throw new Error(worker.errors.join('\n') || error.message, { cause: error });
  }
}

async function openPage(browser, origin, inspect = false) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr, locale: 'en' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('crash', () => errors.push('Chromium page crashed'));
  page.on('request', request => {
    if (!request.url().startsWith(`${origin}/`) || ['image', 'media'].includes(request.resourceType())) errors.push(request.url());
  });
  await page.route('**/*', route => route.request().url().startsWith(`${origin}/`) ? route.continue() : route.abort());
  const worker = { page, errors, cdp: await page.context().newCDPSession(page) };
  if (inspect) {
    await worker.cdp.send('Profiler.enable');
    await worker.cdp.send('Profiler.startPreciseCoverage', { callCount: true, detailed: false });
  }
  await page.goto(origin, { waitUntil: 'commit' });
  await ready(worker);
  return worker;
}

async function capture(worker, frame, inspectLabels = false) {
  const time = frame / fps;
  const cue = sheet.cues.find(({ end }) => time < end);
  const state = await worker.page.evaluate(async ({ t, inspect }) => {
    const state = window.renderAt(t);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (inspect) {
      const visibleSvg = [...document.querySelectorAll('svg text')]
        .filter(node => !node.closest('[hidden]') && node.getBoundingClientRect().width > 0)
        .map(node => node.textContent);
      const labels = [document.body.innerText, ...visibleSvg];
      const pattern = /\bS\d+\s*[@·:]\s*p\s*[:=]|\b(?:DEBUG|FPS|FRAME)\s*[:#=]/iu;
      state.debug = labels.find(label => pattern.test(label));
      state.debugElement = Boolean(document.querySelector('[data-debug-overlay]:not([hidden]),.debug-overlay:not([hidden])'));
    }
    return state;
  }, { t: time, inspect: inspectLabels });
  assert.equal(state.id, cue.id, `Wrong cue at frame ${frame}`);
  assert.ok(Math.abs(state.p - (time - cue.start) / (cue.end - cue.start)) < 1e-10);
  assert.ok(!state.debug && !state.debugElement, `Debug overlay at frame ${frame}: ${state.debug ?? ''}`);
  if (preview) {
    const bytes = await worker.page.screenshot({ type: 'png', scale: 'device' });
    assert.equal(bytes.readUInt32BE(16), encodedWidth);
    assert.equal(bytes.readUInt32BE(20), encodedHeight);
    assert.deepEqual(worker.errors, []);
    return bytes;
  }
  const { data } = await worker.cdp.send('Page.captureScreenshot', {
    format: 'png', fromSurface: true, captureBeyondViewport: false, optimizeForSpeed: true,
  });
  assert.deepEqual(worker.errors, []);
  return Buffer.from(data, 'base64');
}

function randomCheckFrames() {
  const frames = Array.from({ length: 3 }, (_, i) => randomInt(
    Math.floor(totalFrames * i / 3), Math.floor(totalFrames * (i + 1) / 3),
  ));
  for (let i = frames.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [frames[i], frames[j]] = [frames[j], frames[i]];
  }
  return frames;
}

async function preflight(workers) {
  const sampled = preview ? [['S17', .555], ['S18', .765]].map(([id, progress]) => {
    const cue = sheet.cues.find(item => item.id === id);
    return Math.round(fps * (cue.start + cue.duration * progress));
  }) : randomCheckFrames();
  const digest = bytes => createHash('md5').update(bytes).digest('hex');
  const first = new Map();
  console.log(`预检帧序 ${sampled.join(' → ')} / ${sampled.toReversed().join(' → ')}`);
  for (const [i, frame] of sampled.entries()) {
    first.set(frame, { i, hash: digest(await capture(workers[i % workers.length], frame, true)) });
  }
  for (const frame of sampled.toReversed()) {
    const { i, hash } = first.get(frame);
    const repeated = digest(await capture(workers[(i + 1) % workers.length], frame, true));
    assert.equal(repeated, hash, `Non-deterministic Chromium output at t=${frame / fps}`);
    console.log(`[PASS] t=${(frame / fps).toFixed(6)}s | MD5 ${hash} = ${repeated} | 无调试角标`);
  }
  if (preview) console.log('[PASS] 2 点跨页面逆序重绘 MD5 一致');
}

function startEncoder(destination) {
  const process = spawn('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-f', 'image2pipe', '-framerate', String(fps),
    '-c:v', 'png', '-threads', '2', '-i', 'pipe:0', '-c:v', 'libx264', '-profile:v', 'high', '-level', masterProfile.level,
    '-pix_fmt', 'yuv420p', '-crf', preview ? '26' : '17', '-preset', preview ? 'veryfast' : 'slow',
    '-threads:v', '3', '-an', '-f', 'mp4', destination,
  ], { cwd: section, windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
  let diagnostics = '';
  let inputFailure;
  process.stderr.setEncoding('utf8');
  process.stderr.on('data', chunk => { diagnostics = (diagnostics + chunk).slice(-8000); });
  process.stdin.on('error', error => { inputFailure = error; });
  const closed = new Promise(resolve => {
    process.once('error', error => resolve({ error }));
    process.once('close', (code, signal) => resolve({ code, signal }));
  });
  const ensureSuccess = async () => {
    const { code, signal, error } = await closed;
    if (error || code !== 0 || inputFailure) {
      throw new Error(diagnostics.trim() || error?.message || inputFailure?.message || `FFmpeg exited with ${code ?? signal}`);
    }
  };
  return {
    write(png) {
      if (inputFailure) throw inputFailure;
      return new Promise((resolve, reject) => process.stdin.write(png, error => error ? reject(error) : resolve()));
    },
    async finish() {
      process.stdin.end();
      await ensureSuccess();
    },
    async close() {
      if (process.exitCode === null && process.signalCode === null) {
        process.stdin.destroy();
        process.kill();
      }
      await closed;
    },
  };
}

async function streamFrames(workers, encoder) {
  for (let first = 0; first < totalFrames; first += reloadEvery) {
    const last = Math.min(first + reloadEvery, totalFrames);
    for (let i = first; i < last; i += workers.length) {
      const active = workers.slice(0, Math.min(workers.length, last - i));
      const batch = await Promise.all(active.map((worker, lane) => capture(worker, i + lane)));
      for (const frame of batch) await encoder.write(frame);
      const done = i + batch.length;
      if (done % 60 === 0 || done === totalFrames) console.log(`已送入 FFmpeg ${done}/${totalFrames} 帧`);
    }
    if (last % reloadEvery === 0) {
      for (const worker of workers) {
        await worker.page.reload({ waitUntil: 'commit' });
        await ready(worker);
      }
      console.log(`已重载 ${workers.length} 个页面 | 全局第 ${last} 帧`);
    }
  }
}

async function verifyMovie(filename) {
  const run = promisify(execFile);
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-count_frames', '-show_entries',
    'stream=codec_name,codec_type,profile,level,pix_fmt,width,height,avg_frame_rate,nb_frames,nb_read_frames,duration:format=duration,size',
    '-of', 'json', filename,
  ], { cwd: section, windowsHide: true });
  const { streams, format } = JSON.parse(stdout);
  assert.equal(streams.length, 1, 'The master must have only a video stream');
  const [video] = streams;
  assert.deepEqual([
    video.codec_type, video.codec_name, video.profile, video.level, video.pix_fmt, video.width, video.height, video.avg_frame_rate,
  ], ['video', 'h264', 'High', Number(masterProfile.level) * 10, 'yuv420p', encodedWidth, encodedHeight, `${fps}/1`]);
  assert.equal(Number(video.nb_read_frames), totalFrames, 'Decoded frame count mismatch');
  assert.equal(Number(video.nb_frames), totalFrames, 'Container frame count mismatch');
  const duration = totalFrames / fps;
  assert.ok(Math.abs(Number(video.duration) - duration) < 1e-6, 'Video duration mismatch');
  assert.ok(Math.abs(Number(format.duration) - duration) < 1e-6, 'Container duration mismatch');
  assert.equal(Number(format.size), (await stat(filename)).size);
  if (preview) assert.ok(Number(format.size) < 3_500_000, `Preview exceeds 3.5 MB: ${format.size} bytes`);
  return format;
}

const scratch = await mkdtemp(file('.gate2-'));
process.env.TMP = scratch;
process.env.TEMP = scratch;
process.env.TMPDIR = scratch;
let browser;
let encoder;
try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    channel: 'chrome', headless: true, executablePath: process.env.CHROME_PATH,
    args: ['--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-partial-raster'],
  });
  const workers = [];
  for (let i = 0; i < pageCount; i++) workers.push(await openPage(browser, origin, preview && i === 0));
  console.log(`Chromium ${browser.version()} | ${encodedWidth}×${encodedHeight} @ DPR ${dpr} | ${workers.length} 个并行页面`);
  if (preview) {
    await auditMotion(workers[0].page, sheet.cues);
    auditDrawing(await workers[0].cdp.send('Profiler.takePreciseCoverage'), sourceMap);
    await workers[0].cdp.send('Profiler.stopPreciseCoverage');
  }
  await preflight(workers);

  const intermediate = path.join(scratch, 'master.mp4');
  encoder = startEncoder(intermediate);
  await streamFrames(workers, encoder);
  await browser.close();
  browser = undefined;
  await encoder.finish();
  const report = await verifyMovie(intermediate);
  await rename(intermediate, output);
  console.log(`[PASS] ffprobe | ${totalFrames} 帧 | ${report.duration}s | ${report.size} 字节 | 视频流 1，音频流 0`);
} finally {
  if (browser) await browser.close();
  if (encoder) await encoder.close();
  server.close();
  const resolved = await realpath(scratch);
  assert.equal(path.dirname(resolved), section);
  assert.ok(path.basename(resolved).startsWith('.gate2-'));
  await rm(resolved, { recursive: true, force: true, maxRetries: 6, retryDelay: 250 });
}
console.log('[PASS] 临时目录已删除，PNG 全程经管道传输，散帧落盘数量 0');
console.log(output);
import { renderProfile as masterProfile } from '../shared/renderProfile.js';
