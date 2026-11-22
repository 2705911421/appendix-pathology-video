import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { launchRenderBrowser, startRenderHost } from './render-host.mjs';
import { prepareTimeline } from './src/timeline.mjs';

const section = path.resolve(fileURLToPath(new URL('.', import.meta.url)));
const sheet = JSON.parse(await readFile(new URL('./out/cues_s1.1-3.json', import.meta.url), 'utf8'));
const { duration, cues, width: artworkWidth, height: artworkHeight } = prepareTimeline(sheet);
const fps = 12;
const width = artworkWidth / 2;
const height = artworkHeight / 2;
const frameCount = Math.round(duration * fps);
const sizeLimit = 4_000_000;
const output = path.join(section, 'out', `preview_${sheet.module}_12fps.mp4`);
const md5 = pixels => createHash('md5').update(pixels).digest('hex');
const debug = /\bS\d{1,4}\s*@|\bdebug\s+(?:overlay|corner)\b/iu;
const run = promisify(execFile);

async function preflight(worker) {
  const time = (id, p) => {
    const cue = cues.find(cue => cue.id === id);
    return cue.start + cue.duration * p;
  };
  const samples = [['S12', .67], ['S14', .53]];
  const times = samples.map(([id, p]) => time(id, p));
  const pass = await worker.captureBatch(times, true);
  const reversed = await worker.captureBatch([times[1], time('S13', .12), times[0]], true);
  samples.forEach(([id, p], i) => {
    const original = pass[i];
    const repeat = reversed[i === 0 ? 2 : 0];
    const hash = md5(original.pixels);
    assert.equal(md5(repeat.pixels), hash, `Non-deterministic canvas at ${id} p=${p}`);
    assert.ok(original.inspection.concat(repeat.inspection).every(text => !debug.test(text)));
    console.log(`PASS 4 determinism | ${id} p=${p.toFixed(2)} | RGBA MD5 ${hash}`);
  });
  const states = await worker.page.evaluate(() => {
    window.renderCue('S12', .75);
    const vessel = window.artCounts();
    window.renderCue('S12', .995);
    const last = window.artCounts();
    window.renderCue('S14', .26);
    const weaveStart = window.artCounts();
    window.renderCue('S14', .84);
    const weaveEnd = window.artCounts();
    return { vessel, last, weaveStart, weaveEnd };
  });
  assert.equal(states.vessel.erythrocytes, 28);
  assert.equal(states.vessel.leukocytes, 6);
  assert.equal(states.vessel.dilation, 24);
  assert.deepEqual(states.vessel.clefts, [[1040, 20], [1230, 20]]);
  assert.equal(states.last.migrated, 6);
  assert.equal(states.weaveEnd.infiltrate, 950);
  assert.equal(states.weaveEnd.layerLabels, 5);
  assert.ok(states.weaveEnd.fibrinThreads >= 80 && states.weaveEnd.highPowerCells >= 65 && states.weaveEnd.highPowerCells <= 80);
  assert.ok(states.weaveStart.visibleThreads < states.weaveEnd.visibleThreads
    && states.weaveStart.visiblePus < states.weaveEnd.visiblePus);
  assert.equal(states.weaveEnd.rasterNodes, 0);
  console.log(`PASS motion | ${states.last.migrated} neutrophils migrated | fibrin ${states.weaveStart.visibleThreads}→${states.weaveEnd.visibleThreads} | pus cells ${states.weaveStart.visiblePus}→${states.weaveEnd.visiblePus}`);
}

async function encode(worker, temporary) {
  const ffmpeg = spawn('ffmpeg', [
    '-hide_banner', '-loglevel', 'warning', '-nostdin',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', 'pipe:0',
    '-map', '0:v:0', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', '-preset', 'veryfast', '-an',
    '-maxrate', '470k', '-bufsize', '400k', '-threads', '2',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-movflags', '+faststart',
    '-y', temporary,
  ], { cwd: section, windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
  let diagnostics = '';
  let inputError;
  ffmpeg.stderr.setEncoding('utf8').on('data', text => { diagnostics = (diagnostics + text).slice(-8000); });
  ffmpeg.stdin.on('error', error => { inputError = error; });
  const done = new Promise((resolve, reject) => {
    ffmpeg.once('error', reject);
    ffmpeg.once('close', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited (${code ?? signal})\n${diagnostics}`));
    });
  });
  done.catch(() => {});
  const batchSize = 6;
  const request = start => worker.captureBatch(Array.from({ length: Math.min(batchSize, frameCount - start) },
    (_, i) => (start + i) / fps)).then(frames => ({ frames }), error => ({ error }));
  let next = request(0);
  let sent = 0;
  const begin = Date.now();
  try {
    for (let start = 0; start < frameCount; start += batchSize) {
      const { frames, error } = await next;
      if (error) throw error;
      if (start + batchSize < frameCount) next = request(start + batchSize);
      for (const { pixels } of frames) {
        if (inputError) throw inputError;
        await new Promise((resolve, reject) => ffmpeg.stdin.write(pixels, error => error ? reject(error) : resolve()));
        sent++;
        if (sent % 60 === 0 || sent === frameCount) {
          console.log(`Preview | ${sent}/${frameCount} | ${(sent * 1000 / (Date.now() - begin)).toFixed(2)} frames/s`);
        }
      }
    }
    ffmpeg.stdin.end();
    await done;
  } finally {
    if (ffmpeg.exitCode === null && ffmpeg.signalCode === null) ffmpeg.kill();
    await done.catch(() => {});
  }
}

async function verify(file) {
  const { stdout, stderr } = await run('ffprobe', [
    '-v', 'error', '-count_frames', '-show_entries',
    'stream=codec_type,codec_name,width,height,avg_frame_rate,nb_read_frames,duration:format=duration,size',
    '-of', 'json', file,
  ], { cwd: section, windowsHide: true });
  assert.equal(stderr.trim(), '');
  const { streams, format } = JSON.parse(stdout);
  assert.equal(streams.length, 1);
  const [video] = streams;
  assert.deepEqual([video.codec_type, video.codec_name, video.width, video.height, video.avg_frame_rate, Number(video.nb_read_frames)],
    ['video', 'h264', width, height, `${fps}/1`, frameCount]);
  assert.ok([video.duration, format.duration].every(value => Math.abs(Number(value) - frameCount / fps) < 1e-6));
  const { size } = await stat(file);
  assert.equal(size, Number(format.size));
  assert.ok(size < sizeLimit, `Preview exceeded ${sizeLimit} bytes`);
  return { size, duration: format.duration };
}

const scratch = await mkdtemp(path.join(section, '.preview-'));
assert.equal(path.dirname(path.resolve(scratch)), section);
process.env.TEMP = scratch;
process.env.TMP = scratch;
process.env.TMPDIR = scratch;
const temporary = path.join(scratch, 'preview.mp4');
let runtime;
let browser;
let result;
try {
  runtime = await startRenderHost(section, width, height, { preview: true });
  browser = await launchRenderBrowser();
  console.log(`Preview | ${width}×${height} | ${fps} fps | ${duration} s | ${frameCount} frames`);
  const worker = await runtime.newPage(browser);
  await preflight(worker);
  await encode(worker, temporary);
  worker.check();
  result = await verify(temporary);
  await rename(temporary, output);
} finally {
  try {
    await browser?.close();
    await runtime?.close();
  } finally {
    await rm(scratch, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  }
}
console.log(`PASS ffprobe | ${width}×${height} | ${fps} fps | ${result.duration} s | ${frameCount} frames | ${result.size} bytes | audio tracks 0`);
console.log('PASS cleanup | temporary PNG frames written 0 | preview staging removed');
console.log(output);
