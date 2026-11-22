import assert from 'node:assert/strict';
import { renderProfile as masterProfile } from '../shared/renderProfile.js';
import { execFile, spawn } from 'node:child_process';
import { createHash, randomInt } from 'node:crypto';
import { mkdtemp, readFile, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { launchRenderBrowser, startRenderHost } from './render-host.mjs';
import { prepareTimeline } from './src/timeline.mjs';

const runFile = promisify(execFile);
const section = path.resolve(fileURLToPath(new URL('.', import.meta.url)));
const sheet = JSON.parse(await readFile(new URL('./out/cues_s1.1-3.json', import.meta.url), 'utf8'));
const { width, height, fps, duration, cues } = prepareTimeline(sheet);
const totalFrames = Math.round(duration * fps);
const output = path.join(section, 'out', `${sheet.module}_video.mp4`);
const reloadInterval = 300;
const workerCount = 2;
const debugText = /\bS\d{1,4}\s*@|\bdebug\s+(?:overlay|corner)\b|\bframe\s+\d+\s*\/\s*\d+\b/iu;
assert.ok(totalFrames >= 3);

async function preflight(workers) {
  const sample = Array.from({ length: 3 }, (_, i) =>
    randomInt(Math.floor(totalFrames * i / 3), Math.floor(totalFrames * (i + 1) / 3)));
  const overviewStart = Math.ceil(cues[3].start * fps);
  const passes = [[sample[2], sample[0], overviewStart, sample[1]], [sample[1], sample[2], overviewStart, sample[0]]];
  const first = new Map();
  for (const [index, order] of passes.entries()) {
    for (const frame of new Set(order)) {
      const t = frame / fps;
      const { pixels, inspection } = await workers[index].capture(t, true);
      assert.ok(inspection.some(text => text.trim()), 'No text was captured for the overlay inspection');
      assert.ok(inspection.every(text => !debugText.test(text)), `Debug overlay at ${t.toFixed(6)} s`);
      const hash = createHash('md5').update(pixels).digest('hex');
      if (index === 0) first.set(frame, { pixels, hash });
      else {
        const previous = first.get(frame);
        if (hash !== previous.hash) {
          const changed = pixelDifferences(previous.pixels, pixels);
          throw new Error(`Non-deterministic frame ${frame} | ${previous.hash} vs ${hash} | ${changed}`);
        }
        first.delete(frame);
        console.log(`PASS determinism | frame ${frame} | t=${t.toFixed(6)} s | RGBA MD5 ${hash} | debug overlays 0`);
      }
    }
  }
}

function pixelDifferences(first, second) {
  let count = 0;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let peak = 0;
  for (let i = 0; i < first.length; i += 4) {
    const delta = Math.max(Math.abs(first[i] - second[i]), Math.abs(first[i + 1] - second[i + 1]),
      Math.abs(first[i + 2] - second[i + 2]), Math.abs(first[i + 3] - second[i + 3]));
    if (delta === 0) continue;
    count++;
    peak = Math.max(peak, delta);
    const x = (i / 4) % width;
    const y = Math.floor(i / 4 / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return `${count} different pixels | x=${minX}..${maxX}, y=${minY}..${maxY} | peak channel delta ${peak}`;
}

function startEncoder(pending) {
  const args = [
    '-hide_banner', '-loglevel', 'warning', '-nostdin',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', 'pipe:0',
    '-map', '0:v:0', '-c:v', 'libx264', '-profile:v', 'high', '-level', masterProfile.level,
    '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'slow', '-an', '-threads', '2',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1', '-color_range', 'tv',
    '-movflags', '+faststart',
    '-y', pending,
  ];
  const process = spawn('ffmpeg', args, { cwd: section, stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
  let diagnostics = '';
  let stdinError;
  process.stderr.setEncoding('utf8').on('data', text => { diagnostics = (diagnostics + text).slice(-16_000); });
  process.stdin.on('error', error => { stdinError = error; });
  const done = new Promise((resolve, reject) => {
    process.once('error', reject);
    process.once('close', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited (${code ?? signal})\n${diagnostics}`));
    });
  });
  done.catch(() => {});
  return {
    async write(pixels) {
      if (stdinError) throw stdinError;
      await new Promise((resolve, reject) => {
        process.stdin.write(pixels, error => error ? reject(error) : resolve());
      });
    },
    async finish() {
      process.stdin.end();
      await done;
    },
    async abort() {
      if (process.exitCode === null && process.signalCode === null) process.kill();
      await done.catch(() => {});
    },
  };
}

async function renderBlock(workers, start, end, encoder, startedAt) {
  const pending = new Map();
  let next = start;
  function startFrame(worker) {
    const frame = next++;
    pending.set(frame, worker.capture(frame / fps)
      .then(({ pixels }) => ({ worker, pixels }), error => ({ error })));
  }
  for (const worker of workers.slice(0, end - start)) startFrame(worker);
  for (let frame = start; frame < end; frame++) {
    const result = await pending.get(frame);
    if (result.error) throw new Error(`Chromium failed on frame ${frame}`, { cause: result.error });
    pending.delete(frame);
    if (next < end) startFrame(result.worker);
    await encoder.write(result.pixels);
    if (frame === 0 || (frame + 1) % 60 === 0 || frame + 1 === totalFrames) {
      const elapsed = (Date.now() - startedAt) / 1000;
      console.log(`Progress | ${frame + 1}/${totalFrames} frames | ${((frame + 1) / elapsed).toFixed(2)} frames/s`);
    }
  }
}

async function verifyVideo(file) {
  const { stdout, stderr } = await runFile('ffprobe', [
    '-v', 'error', '-count_frames', '-show_entries',
    'stream=codec_type,codec_name,profile,level,pix_fmt,width,height,avg_frame_rate,nb_frames,nb_read_frames,duration,start_time:format=size,duration',
    '-of', 'json', file,
  ], { cwd: section, windowsHide: true });
  assert.equal(stderr.trim(), '', 'ffprobe found a decoding error');
  const { streams, format } = JSON.parse(stdout);
  assert.equal(streams.length, 1, 'Expected a single track');
  const [track] = streams;
  assert.deepEqual([
    track.codec_type, track.codec_name, track.profile, track.level, track.pix_fmt,
    track.width, track.height, track.avg_frame_rate,
  ], ['video', 'h264', 'High', Number(masterProfile.level) * 10, 'yuv420p', width, height, `${fps}/1`]);
  assert.equal(Number(track.nb_frames), totalFrames);
  assert.equal(Number(track.nb_read_frames), totalFrames);
  assert.equal(Number(track.start_time), 0);
  for (const value of [track.duration, format.duration]) {
    assert.ok(Math.abs(Number(value) - totalFrames / fps) <= 0.00000051, `Wrong duration ${value}`);
  }
  const { size } = await stat(file);
  assert.equal(Number(format.size), size);
  return { duration: track.duration, frames: totalFrames, bytes: size, audioTracks: 0 };
}

const scratch = await mkdtemp(path.join(section, '.gate2-'));
assert.equal(path.dirname(path.resolve(scratch)), section);
process.env.TEMP = scratch;
process.env.TMP = scratch;
process.env.TMPDIR = scratch;
const pending = path.join(scratch, 'master.mp4');
let runtime;
let browser;
let encoder;
let verification;
try {
  console.log(`Timeline | ${duration.toFixed(6)} s | ${totalFrames} frames at ${fps} fps`);
  runtime = await startRenderHost(section, width, height);
  browser = await launchRenderBrowser();
  console.log(`Chromium ${browser.version()} | ${workerCount} workers | ${width}×${height} | DPR 1 | sRGB`);
  const primary = await runtime.newPage(browser);
  await runtime.selectLens(primary.page);
  const workers = [primary, await runtime.newPage(browser)];
  await preflight(workers);
  encoder = startEncoder(pending);
  const startedAt = Date.now();
  for (let start = 0; start < totalFrames; start += reloadInterval) {
    if (start) {
      await Promise.all(workers.map(worker => worker.reload()));
      console.log(`Reload | ${start} frames | ${workerCount} pages`);
    }
    await renderBlock(workers, start, Math.min(start + reloadInterval, totalFrames), encoder, startedAt);
  }
  await encoder.finish();
  verification = await verifyVideo(pending);
  await rename(pending, output);
} finally {
  try {
    await encoder?.abort();
    await browser?.close();
    await runtime?.close();
  } finally {
    await rm(scratch, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  }
}

console.log(`PASS ffprobe | ${verification.duration} s | ${verification.frames} frames | ${verification.bytes} bytes | audio tracks 0`);
console.log('PASS cleanup | PNG frames written 0 | temporary render directory removed');
console.log(output);
