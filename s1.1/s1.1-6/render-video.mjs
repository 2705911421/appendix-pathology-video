import assert from 'node:assert/strict';
import { renderProfile as masterProfile } from '../shared/renderProfile.js';
import { execFile, spawn } from 'node:child_process';
import { createHash, randomInt } from 'node:crypto';
import { once } from 'node:events';
import { access, mkdtemp, readFile, realpath, rename, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { CUES } from './src/cue-sheet.js';
import { assertBlindReviewText } from '../shared/canvasCore.js';

const section = await realpath(fileURLToPath(new URL('.', import.meta.url)));
const moduleName = path.basename(section);
const source = path.join(section, 'src');
const shared = path.resolve(section, '../shared');
const output = path.join(section, 'out');
const destination = path.join(output, `${moduleName}_video.mp4`);
const run = promisify(execFile);
const width = 1920;
const height = 1080;
const fps = 30;
const epochSize = 300;
const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';

const sheet = JSON.parse(await readFile(path.join(output, `cues_${moduleName}.json`), 'utf8'));
assert.equal(sheet.module, moduleName);
assert.deepEqual([sheet.width, sheet.height, sheet.fps], [width, height, fps]);
assert.deepEqual(sheet.cues.map(cue => cue.id), CUES.map(cue => cue.id));
let cursor = 0;
const cues = sheet.cues.map(cue => {
  const length = cue.duration ?? cue.defaultDuration;
  assert.ok(Number.isFinite(length) && length > 0, `Invalid duration for ${cue.id}`);
  if (cue.isCredits) assert.equal(length, 8, 'S26 must retain its eight-second hold');
  for (const text of [cue.zhText, cue.enText, ...cue.highlightZh]) assertBlindReviewText(text);
  const start = cursor;
  cursor += length;
  return { ...cue, start, end: cursor };
});
const totalDuration = sheet.duration ?? sheet.defaultDuration ?? cursor;
assert.ok(Number.isFinite(totalDuration) && totalDuration > 0);
assert.ok(Math.abs(totalDuration - cursor) < 1e-9, 'Cue durations and declared total differ');
const totalFrames = Math.round(totalDuration * fps);
const targetDuration = totalFrames / fps;
console.log(`TIMELINE ${moduleName} | ${totalDuration.toFixed(6)} s | ${totalFrames} frames | ${width}x${height} @ ${fps}`);

let referencesDeferred = false;
try {
  await access(path.join(shared, 'references.js'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  referencesDeferred = true;
}

// Build the approved scene with timing read from the on-disk cue sheet.
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
    name: 'approved-scene-runtime',
    setup(builder) {
      builder.onResolve({ filter: /^\.\/cue-sheet\.js$/ }, args => {
        if (path.relative(path.join(source, 'main.js'), args.importer) === '') {
          return { path: 'cue-timing', namespace: 'master' };
        }
      });
      builder.onResolve({ filter: /^\.\/detail\/watercolor\.js$/ }, args => {
        if (path.relative(shared, args.resolveDir) === '') {
          return { path: path.join(source, 'brush-canvases.js') };
        }
      });
      builder.onResolve({ filter: /\/shared\/references\.js$/ }, args => {
        if (referencesDeferred && path.relative(source, args.resolveDir) === '') {
          return { path: 'deferred-references', namespace: 'master' };
        }
      });
      builder.onLoad({ filter: /^cue-timing$/, namespace: 'master' }, () => ({
        contents: `export { resolveCue, sceneFades } from './cue-sheet.js'; export const CUES = ${JSON.stringify(cues)};`,
        resolveDir: source,
        loader: 'js',
      }));
      builder.onLoad({ filter: /^deferred-references$/, namespace: 'master' }, () => ({
        contents: 'export const REFERENCES = [];',
        loader: 'js',
      }));
    },
  }],
});

const html = await readFile(path.join(source, 'index.html'));
const served = new Map([
  ['/', ['text/html; charset=utf-8', html]],
  ['/section.js', ['text/javascript; charset=utf-8', outputFiles[0].contents]],
  ['/en-US.json', ['application/json; charset=utf-8', '{"language":"en-US"}']],
]);
const server = createServer((request, response) => {
  const content = served.get(request.url);
  if (content) return response.writeHead(200, { 'Content-Type': content[0] }).end(content[1]);
  return response.writeHead(request.url === '/favicon.ico' ? 204 : 404).end();
});

const scratch = await mkdtemp(path.join(section, '.gate2-'));
const temporaryVideo = path.join(scratch, 'master.mp4');
process.env.TEMP = scratch;
process.env.TMP = scratch;
let context;
let encoder;
let encoderDone;

function randomSamples() {
  const frames = [];
  for (let i = 0; i < 3; i++) {
    frames.push(randomInt(Math.floor(totalFrames * i / 3), Math.floor(totalFrames * (i + 1) / 3)));
  }
  // Both passes seek in a different order, including backwards seeks.
  return [[frames[1], frames[2], frames[0]], [frames[2], frames[0], frames[1]]];
}

async function checkMaster(file) {
  const { stdout, stderr } = await run(ffprobePath, [
    '-v', 'error', '-count_frames', '-show_entries',
    'stream=codec_type,codec_name,profile,level,width,height,pix_fmt,avg_frame_rate,nb_read_frames,duration:format=duration,size',
    '-of', 'json', file,
  ], { windowsHide: true });
  assert.equal(stderr.trim(), '', 'ffprobe reported a decoding error');
  const { streams, format } = JSON.parse(stdout);
  assert.equal(streams.length, 1, 'Expected one video stream and zero audio streams');
  const [video] = streams;
  assert.deepEqual(
    [video.codec_type, video.codec_name, video.profile, video.level, video.width, video.height,
      video.pix_fmt, video.avg_frame_rate, Number(video.nb_read_frames)],
    ['video', 'h264', 'High', Number(masterProfile.level) * 10, width, height, 'yuv420p', '30/1', totalFrames],
  );
  assert.ok(Math.abs(Number(video.duration) - targetDuration) < .000001);
  assert.ok(Math.abs(Number(format.duration) - targetDuration) < .000001);
  assert.equal(Number(format.size), (await stat(file)).size);
  return { fps, width, height, frames: totalFrames, duration: Number(format.duration),
    bytes: Number(format.size), codec: video.codec_name, profile: video.profile, level: masterProfile.level, audioStreams: 0 };
}

try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const executablePath = process.env.CHROME_PATH;
  context = await chromium.launchPersistentContext(path.join(scratch, 'browser'), {
    channel: executablePath ? undefined : 'chrome',
    executablePath,
    headless: true,
    viewport: { width, height },
    deviceScaleFactor: 1,
    locale: 'en-US',
    acceptDownloads: false,
    downloadsPath: scratch,
    args: ['--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--disable-partial-raster', '--disable-lcd-text', '--disable-gpu-compositing',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows', '--mute-audio'],
  });
  const blocked = [];
  await context.route('**/*', route => {
    const request = route.request();
    if (request.resourceType() === 'image' || !request.url().startsWith(`${origin}/`)) {
      blocked.push(request.url());
      return route.abort();
    }
    return route.continue();
  });
  await context.addInitScript(() => {
    const debug = /\bS\d{1,3}\s*@\s*(?:p|t)\s*=/iu;
    window.hasDebugCaption = false;
    for (const method of ['fillText', 'strokeText']) {
      const draw = CanvasRenderingContext2D.prototype[method];
      CanvasRenderingContext2D.prototype[method] = function (value, ...args) {
        if (debug.test(String(value))) window.hasDebugCaption = true;
        return draw.call(this, value, ...args);
      };
    }
  });

  const page = context.pages()[0];
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.message);
    console.error(error.message);
  });
  const cdp = await context.newCDPSession(page);

  async function ready(reload = false) {
    pageErrors.length = 0;
    if (reload) await page.reload({ waitUntil: 'commit', timeout: 180_000 });
    else await page.goto(origin, { waitUntil: 'commit' });
    try {
      await page.waitForFunction(() => typeof window.renderAt === 'function', null, { polling: 250, timeout: 180_000 });
    } catch (error) {
      throw new Error(pageErrors.join('\n') || error.message);
    }
    assert.deepEqual(pageErrors, []);
  }

  async function capture(frame, audit = false) {
    await page.evaluate(async ({ time, audit }) => {
      window.hasDebugCaption = false;
      window.renderAt(time);
      await new Promise(resolve => {
        const fallback = setTimeout(resolve, 95);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          clearTimeout(fallback);
          resolve();
        }));
      });
      if (audit) {
        if (window.devicePixelRatio !== 1) throw new Error('Unexpected device pixel ratio');
        const debug = /\bS\d{1,3}\s*@\s*(?:p|t)\s*=/iu;
        const visibleText = [...document.querySelectorAll('svg text, .story-caption')]
          .filter(element => element.checkVisibility()).map(element => element.textContent).join('\n');
        if (window.hasDebugCaption || debug.test(visibleText + '\n' + document.body.innerText)) {
          throw new Error('Debug caption found in a production frame');
        }
      }
    }, { time: frame / fps, audit });
    assert.deepEqual(pageErrors, []);
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png', fromSurface: true, captureBeyondViewport: false, optimizeForSpeed: true,
    });
    return Buffer.from(data, 'base64');
  }

  const [first, second] = randomSamples();
  await ready();
  console.log('READY Chromium page, approved scene initialized');
  const md5 = async image => {
    const { data, info } = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual([info.width, info.height], [width, height]);
    return createHash('md5').update(data).digest('hex');
  };
  async function fingerprint(order) {
    const results = new Map();
    for (const frame of order) results.set(frame, await md5(await capture(frame, true)));
    return results;
  }
  const initial = await fingerprint(first);
  const repeated = await fingerprint(second);
  for (const frame of first) {
    assert.equal(repeated.get(frame), initial.get(frame), `Nondeterministic source frame at ${frame / fps} s`);
    console.log(`PASS determinism | t=${(frame / fps).toFixed(6)} s | MD5 ${initial.get(frame)} == ${repeated.get(frame)}`);
  }
  assert.deepEqual(blocked, []);
  console.log('PASS 3/3 pixel MD5 | debug captions: 0 | DPR 1 | sRGB');

  let encoderLog = '';
  encoder = spawn(ffmpegPath, [
    '-hide_banner', '-loglevel', 'warning', '-nostdin',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', 'pipe:0',
    '-map', '0:v:0', '-c:v', 'libx264', '-profile:v', 'high', '-level', masterProfile.level,
    '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'slow', '-an',
    '-threads:v', '3', '-movflags', '+faststart', temporaryVideo,
  ], { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
  encoder.stderr.on('data', chunk => { encoderLog = (encoderLog + chunk.toString()).slice(-16000); });
  encoderDone = new Promise(resolve => {
    encoder.once('error', error => resolve({ error }));
    encoder.once('close', (code, signal) => resolve({ code, signal }));
  });
  let pipeError;
  encoder.stdin.on('error', error => { pipeError = error; });
  async function send(frame) {
    if (pipeError) throw pipeError;
    await new Promise((resolve, reject) => encoder.stdin.write(frame, error => error ? reject(error) : resolve()));
  }

  const started = performance.now();
  // Overlap the next capture with the current FFmpeg write and respect pipe backpressure.
  function schedule(frame) {
    return capture(frame).then(
      buffer => ({ buffer }),
      error => ({ error }),
    );
  }
  for (let start = 0; start < totalFrames; start += epochSize) {
    if (start > 0) {
      await ready(true);
      console.log(`RELOAD at frame ${start} | Chromium page ready`);
    }
    const end = Math.min(start + epochSize, totalFrames);
    let pending = schedule(start);
    for (let frame = start; frame < end; frame++) {
      const result = await pending;
      if (result.error) throw result.error;
      if (frame + 1 < end) pending = schedule(frame + 1);
      await send(result.buffer);
      const sent = frame + 1;
      if (sent % 150 === 0 || sent === totalFrames) {
        console.log(`STREAM ${sent}/${totalFrames} | ${((performance.now() - started) / 1000).toFixed(1)} s elapsed`);
      }
    }
  }
  encoder.stdin.end();
  const result = await encoderDone;
  if (result.error || result.code !== 0) {
    throw new Error(`FFmpeg failed | ${result.error?.message ?? result.code ?? result.signal}\n${encoderLog}`);
  }
  assert.deepEqual(blocked, []);

  const verification = await checkMaster(temporaryVideo);
  await rename(temporaryVideo, destination);
  console.log('PASS ffprobe ' + JSON.stringify(verification));
  console.log(`MASTER ${destination}`);
} finally {
  if (encoder && encoder.exitCode === null && encoder.signalCode === null) {
    encoder.stdin.destroy();
    encoder.kill();
    await encoderDone;
  }
  try {
    await context?.close();
  } finally {
    server.close();
    const resolvedScratch = await realpath(scratch);
    assert.equal(path.dirname(resolvedScratch), section);
    assert.ok(path.basename(resolvedScratch).startsWith('.gate2-'));
    await rm(resolvedScratch, { force: true, recursive: true, maxRetries: 5, retryDelay: 200 });
    console.log('CLEANUP scratch removed | temporary PNG frame directories created: 0');
  }
}
