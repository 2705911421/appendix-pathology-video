import assert from 'node:assert/strict';
import { renderProfile as masterProfile } from '../shared/renderProfile.js';
import { spawn, execFile } from 'node:child_process';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { readFile, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { HEIGHT, WIDTH } from '../shared/canvasCore.js';
import { prepareCueSheet } from './src/cue-sheet.js';

export const formats = {
  master: { fps: 30, width: WIDTH, height: HEIGHT, scale: 1, crf: 17, preset: 'slow', file: 's1.1-5_video.mp4' },
  preview: { fps: 12, width: 960, height: 540, scale: .5, crf: 26, preset: 'veryfast', file: 'preview_s1.1-5_12fps.mp4',
    byteLimit: 3_500_000 },
};
const reloadEvery = 300;
const run = promisify(execFile);
const noOverlay = /\bS\d+\s*@\s*p\s*=|\b(?:frame|cue)\s*#\d+\s*@/iu;

export async function readVideoTimeline(out, format = formats.master) {
  const source = JSON.parse(await readFile(path.join(out, 'cues_s1.1-5.json'), 'utf8'));
  const timeline = prepareCueSheet(source);
  const totalFrames = Math.round(timeline.duration * format.fps);
  assert.deepEqual([timeline.module, timeline.width, timeline.height, timeline.fps], ['s1.1-5', WIDTH, HEIGHT, 30]);
  assert.ok(totalFrames >= 3, 'The complete timeline must cover at least three frames');
  return { timeline, totalFrames };
}

async function connectPage(page, assertHealthy, format) {
  const client = await page.context().newCDPSession(page);
  const screenshot = { format: 'png', optimizeForSpeed: true, fromSurface: true };
  if (format.scale !== 1) screenshot.clip = { x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: format.scale };
  return {
    async capture(index, checkOverlay = false) {
      const inspection = await page.evaluate(async ({ time, checkOverlay }) => {
        window.renderAt(time);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        if (checkOverlay) {
          const stage = document.querySelector('#plate');
          return {
            dimensions: [stage.offsetWidth, stage.offsetHeight, devicePixelRatio],
            text: stage.textContent,
            images: stage.querySelectorAll('img, svg image').length,
            debug: Boolean(stage.querySelector('[data-debug], [data-debug-overlay], .debug-overlay, .debug-badge')),
          };
        }
      }, { time: index / format.fps, checkOverlay });
      if (checkOverlay) {
        assert.deepEqual(inspection.dimensions, [WIDTH, HEIGHT, 1]);
        assert.equal(inspection.images, 0);
        assert.ok(!inspection.debug && !noOverlay.test(inspection.text), `Debug overlay at frame ${index}`);
      }
      const { data } = await client.send('Page.captureScreenshot', screenshot);
      const frame = Buffer.from(data, 'base64');
      assert.equal(frame.readUInt32BE(16), format.width);
      assert.equal(frame.readUInt32BE(20), format.height);
      assertHealthy();
      return frame;
    },
    async reload() {
      await page.reload({ waitUntil: 'commit' });
      await page.waitForFunction(() => window.ready === true, null, { timeout: 120_000 });
      assertHealthy();
    },
  };
}

async function checkDeterminism(workers, totalFrames, timeline, format) {
  const { fps, width, height } = format;
  const preview = format === formats.preview;
  const picks = Array.from({ length: 3 }, (_, i) =>
    randomInt(Math.floor(i * totalFrames / 3), Math.floor((i + 1) * totalFrames / 3)));
  // The CT scene's filtered film backdrop differed at 29s with GPU compositing.
  const check = 29 * fps;
  const regression = check < totalFrames && !picks.includes(check) ? [check] : [];
  const tests = preview ? [['S20', .28], ['S21', .33]].map(([id, p]) => {
    const cue = timeline.cues.find(item => item.id === id);
    return Math.round((cue.start + (cue.end - cue.start) * p) * fps);
  }) : [...picks, ...regression];
  const orders = preview ? [tests, tests.toReversed()]
    : [[picks[1], ...regression, picks[2], picks[0]], [picks[2], picks[0], ...regression, picks[1]]];
  async function sample(worker, frames) {
    const captures = new Map();
    for (const index of frames) {
      const png = await worker.capture(index, true);
      const rgb = await sharp(png).removeAlpha().raw().toBuffer();
      captures.set(index, { rgb, md5: createHash('md5').update(rgb).digest('hex') });
    }
    return captures;
  }
  const [first, second] = await Promise.all(workers.map((worker, i) => sample(worker, orders[i])));
  for (const index of tests) {
    const time = (index / fps).toFixed(6);
    const a = first.get(index);
    const b = second.get(index);
    assert.equal(b.md5, a.md5, a.md5 === b.md5 ? '' : `Full-frame RGB MD5 mismatch at t=${time}s | ${describeDrift(a.rgb, b.rgb, width, height)}`);
    console.log(`${preview ? '[4]' : '[preflight]'} PASS ${width}×${height} RGB MD5 t=${time}s | ${a.md5} = ${b.md5}`);
  }
  console.log(`[preflight] PASS ${preview ? 'two motion timestamps' : 'three shuffled timestamps'} across both pages | no debug overlay`);
}

function describeDrift(a, b, width, height) {
  let count = 0, peak = 0;
  let left = width, top = height, right = 0, bottom = 0;
  for (let i = 0; i < a.length; i += 3) {
    const delta = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
    if (!delta) continue;
    const x = (i / 3) % width, y = Math.floor(i / 3 / width);
    count++;
    peak = Math.max(peak, delta);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  return `${count} pixels, max RGB delta ${peak}/255, bounds (${left},${top})–(${right},${bottom})`;
}

function startEncoder(destination, { fps, crf, preset }) {
  const child = spawn('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-xerror', '-y',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', 'pipe:0',
    '-map', '0:v:0', '-c:v', 'libx264', '-profile:v', 'high', '-level', masterProfile.level,
    '-pix_fmt', 'yuv420p', '-crf', String(crf), '-preset', preset, '-an', destination,
  ], { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });

  let stderr = '';
  let failure;
  child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
  child.stdin.on('error', error => { failure ??= error; });
  const exited = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (code !== 0) reject(new Error(`FFmpeg ${signal ?? `exit ${code}`}\n${stderr.trim()}`));
      else resolve();
    });
  });
  exited.catch(error => { failure = error; });

  return {
    async write(frame) {
      if (failure) throw failure;
      await new Promise((resolve, reject) => child.stdin.write(frame, error => error ? reject(error) : resolve()));
    },
    async finish() {
      child.stdin.end();
      await exited;
    },
    async abort() {
      child.stdin.destroy();
      child.kill();
      await exited.catch(() => {});
      if (stderr.trim()) console.error(stderr.trim());
    },
  };
}

async function verifyVideo(file, totalFrames, { fps, width, height, byteLimit }) {
  const { stdout, stderr } = await run('ffprobe', [
    '-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file,
  ], { windowsHide: true, maxBuffer: 1_048_576 });
  assert.equal(stderr.trim(), '', 'ffprobe reported decode errors');
  const { streams, format } = JSON.parse(stdout);
  assert.equal(streams.length, 1, 'Expected a silent video with a single stream');
  const [video] = streams;
  assert.deepEqual([video.codec_type, video.codec_name, video.profile, video.level, video.pix_fmt],
    ['video', 'h264', 'High', Number(masterProfile.level) * 10, 'yuv420p']);
  assert.deepEqual([video.width, video.height, video.r_frame_rate, video.avg_frame_rate], [width, height, `${fps}/1`, `${fps}/1`]);
  assert.equal(Number(video.nb_frames), totalFrames, 'Unexpected container frame count');
  assert.equal(Number(video.nb_read_frames), totalFrames, 'Unexpected decoded frame count');
  const expectedDuration = totalFrames / fps;
  assert.ok(Math.abs(Number(video.duration) - expectedDuration) <= .000001, 'Unexpected video stream duration');
  assert.ok(Math.abs(Number(format.duration) - expectedDuration) <= .000001, 'Unexpected container duration');
  const { size } = await stat(file);
  assert.equal(size, Number(format.size));
  if (byteLimit) assert.ok(size < byteLimit, `Preview exceeds its byte limit (${size}/${byteLimit})`);
  return { width, height, fps, duration: video.duration, frames: totalFrames, bytes: size, audioStreams: 0 };
}

export async function renderVideo({ pages, assertHealthy, totalFrames, timeline, out, format = formats.master }) {
  const workers = await Promise.all(pages.map(page => connectPage(page, assertHealthy, format)));
  await checkDeterminism(workers, totalFrames, timeline, format);
  const destination = path.join(out, format.file);
  const temporary = path.join(out, `.${path.parse(format.file).name}-${randomUUID()}.tmp.mp4`);
  const encoder = startEncoder(temporary, format);
  const start = performance.now();
  let reported = start;
  let finished = false;
  try {
    for (let batch = 0; batch < totalFrames; batch += reloadEvery) {
      if (batch) {
        console.log(`[reload] ${batch}/${totalFrames} streamed | page.reload() × ${workers.length}`);
        await Promise.all(workers.map(worker => worker.reload()));
      }
      const limit = Math.min(batch + reloadEvery, totalFrames);
      for (let next = batch; next < limit; next += workers.length) {
        const active = workers.slice(0, limit - next);
        const frames = await Promise.all(active.map((worker, i) => worker.capture(next + i)));
        for (const frame of frames) await encoder.write(frame);
        const done = next + frames.length;
        const now = performance.now();
        if (done === limit || now - reported >= 15_000) {
          console.log(`[render] ${done}/${totalFrames} streamed | ${(done / (now - start) * 1000).toFixed(2)} fps elapsed average`);
          reported = now;
        }
      }
    }
    console.log('[encode] All frames streamed. Waiting for the final H.264 packets.');
    await encoder.finish();
    finished = true;
    const metadata = await verifyVideo(temporary, totalFrames, format);
    await rename(temporary, destination);
    console.log(`[verified] ${JSON.stringify(metadata)} | ${destination}`);
    console.log('[cleanup] PNG frame files written: 0 | PNG frame directories created: 0');
  } finally {
    if (!finished) await encoder.abort();
    await rm(temporary, { force: true });
  }
}
