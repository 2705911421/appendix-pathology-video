import assert from 'node:assert/strict';
import { renderProfile as masterProfile } from '../shared/renderProfile.js';
import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { mulberry32 } from '../shared/canvasCore.js';
import { timeCues } from './src/timing.js';
import {
  directory, launchStageBrowser, loadStagePage, openStagePage, seekTime, startStage, viewport,
} from './stage-host.mjs';

const exec = promisify(execFile);
const fps = 30;
const batchSize = 300;
const output = path.join(directory, 'out', 's1.1-1_video.mp4');
const staging = path.join(directory, 'out', `.s1.1-1_video-${process.pid}.part.mp4`);
const { width, height } = viewport;

async function createWorker(browser, url) {
  const faults = [];
  const page = await openStagePage(browser, url, faults);
  const session = await page.context().newCDPSession(page);
  await loadStagePage(page, url);
  assert.deepEqual(faults, []);
  return { page, session, faults };
}

async function capture(worker, frame, audit = false) {
  await seekTime(worker.page, frame / fps);
  assert.deepEqual(worker.faults, [], `Browser errors at frame ${frame}`);
  if (audit) {
    const hasLabel = await worker.page.evaluate(() => /\bS\d{2}\s*@\s*p\b/iu.test(
      document.querySelector('#plate').textContent,
    ));
    assert.equal(hasLabel, false, `Review label at frame ${frame}`);
  }
  const { data } = await worker.session.send('Page.captureScreenshot', {
    format: 'png', fromSurface: true, captureBeyondViewport: false, optimizeForSpeed: true,
  });
  return Buffer.from(data, 'base64');
}

async function checkCorners(frame, buffer) {
  const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height, info.channels], [width, height, 3]);
  const bands = [[0, 92], [1048, height]];
  const edges = [[0, 320], [width - 320, width]];
  for (const [startY, endY] of bands) {
    for (const [startX, endX] of edges) {
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const i = (y * width + x) * 3;
          if (Math.max(data[i], data[i + 1], data[i + 2]) < 165) {
            throw new Error(`Ink in a reserved corner at frame ${frame} (${x}, ${y})`);
          }
        }
      }
    }
  }
}

async function preflight(workers, totalFrames) {
  const random = mulberry32(0x533132);
  const frames = [0, 1, 2].map(index => {
    const start = Math.floor(totalFrames * index / 3);
    const end = Math.floor(totalFrames * (index + 1) / 3);
    return start + Math.floor(random() * (end - start));
  });
  const hash = buffer => createHash('md5').update(buffer).digest('hex');
  const first = new Map();
  for (const index of [1, 0, 2]) {
    const frame = frames[index];
    const buffer = await capture(workers[0], frame, true);
    await checkCorners(frame, buffer);
    first.set(frame, hash(buffer));
  }
  for (const index of [2, 1, 0]) {
    const frame = frames[index];
    const buffer = await capture(workers[1], frame, true);
    const second = hash(buffer);
    console.log(`[Preflight] frame=${frame} t=${(frame / fps).toFixed(6)}s | ${first.get(frame)} | ${second}`);
    assert.equal(second, first.get(frame), `Frame ${frame} depends on seek order or worker`);
  }
  console.log('[Preflight] PASS 3/3 | two workers, different seek orders | clean corners and no review label');
}

async function encode(workers, url, totalFrames) {
  const ffmpeg = spawn('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
    '-f', 'image2pipe', '-framerate', String(fps), '-vcodec', 'png', '-i', 'pipe:0',
    '-c:v', 'libx264', '-profile:v', 'high', '-level', masterProfile.level, '-pix_fmt', 'yuv420p',
    '-crf', '17', '-preset', 'slow', '-an', staging,
  ], { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
  let stderr = '';
  ffmpeg.stderr.setEncoding('utf8');
  ffmpeg.stderr.on('data', text => { stderr = (stderr + text).slice(-8192); });
  ffmpeg.stdin.on('error', () => {});
  const closed = once(ffmpeg, 'close');
  // Observe spawn errors immediately. The encoder result is awaited below.
  closed.catch(() => {});
  try {
    await once(ffmpeg, 'spawn');
    console.log(`[Encode] ${workers.length} capture pages | ordered image2pipe | 0 frame files`);
    const started = performance.now();
    for (let start = 0; start < totalFrames; start += batchSize) {
      if (start !== 0) {
        console.log(`[Reload] ${workers.length} pages after ${start} frames`);
        await Promise.all(workers.map(({ page }) => loadStagePage(page, url, true)));
      }
      const end = Math.min(start + batchSize, totalFrames);
      for (let index = start; index < end; index += workers.length) {
        const active = workers.slice(0, end - index);
        const buffers = await Promise.all(active.map((worker, offset) => capture(worker, index + offset)));
        for (const buffer of buffers) {
          await new Promise((resolve, reject) => ffmpeg.stdin.write(buffer, error => error ? reject(error) : resolve()));
        }
        const frames = index + buffers.length;
        if (frames % 100 === 0 || frames === end) {
          const elapsed = ((performance.now() - started) / 1000).toFixed(1);
          console.log(`[Frames] ${frames}/${totalFrames} | ${elapsed}s elapsed`);
        }
      }
    }
    ffmpeg.stdin.end();
    const [code, signal] = await closed;
    if (code !== 0) throw new Error(`FFmpeg exited with ${code ?? signal}\n${stderr}`);
  } catch (error) {
    if (stderr) console.error(stderr.trim());
    throw error;
  } finally {
    if (ffmpeg.exitCode === null && ffmpeg.signalCode === null) ffmpeg.kill();
    await closed.catch(() => {});
  }
}

async function verifyVideo(file, totalFrames) {
  const { stdout } = await exec('ffprobe', [
    '-v', 'error', '-count_frames',
    '-show_entries', 'stream=codec_type,codec_name,profile,level,width,height,pix_fmt,r_frame_rate,avg_frame_rate,nb_frames,nb_read_frames,duration:format=duration,size',
    '-of', 'json', file,
  ], { windowsHide: true });
  const { streams, format } = JSON.parse(stdout);
  assert.equal(streams.length, 1, 'Expected one video stream and no audio stream');
  const [video] = streams;
  assert.deepEqual(
    [video.codec_type, video.codec_name, video.profile, video.level, video.width, video.height, video.pix_fmt],
    ['video', 'h264', 'High', Number(masterProfile.level) * 10, width, height, 'yuv420p'],
  );
  assert.equal(video.r_frame_rate, '30/1');
  assert.equal(video.avg_frame_rate, '30/1');
  assert.equal(Number(video.nb_frames), totalFrames);
  assert.equal(Number(video.nb_read_frames), totalFrames);
  assert.ok(Math.abs(Number(video.duration) - totalFrames / fps) < 0.000001);
  assert.ok(Math.abs(Number(format.duration) - totalFrames / fps) < 0.001);
  const { size } = await stat(file);
  assert.equal(Number(format.size), size);
  return { seconds: video.duration, frames: Number(video.nb_read_frames), bytes: size, audioStreams: 0 };
}

const stage = await startStage();
let browser;
try {
  assert.equal(stage.sheet.module, 's1.1-1');
  const { duration, cues } = timeCues(stage.sheet.cues);
  const totalFrames = Math.round(duration * fps);
  assert.ok(totalFrames >= 3, 'Three distinct preflight frames are required');
  console.log(`[Timeline] ${cues.map(cue => `${cue.id}=${cue.duration}s`).join(' ')} | ${duration}s | ${totalFrames} frames @ ${fps} fps`);
  browser = await launchStageBrowser();
  const workers = await Promise.all([createWorker(browser, stage.url), createWorker(browser, stage.url)]);
  await preflight(workers, totalFrames);
  await encode(workers, stage.url, totalFrames);
  await browser.close();
  browser = undefined;
  console.log('[Verify] ffprobe counting decoded frames');
  const verified = await verifyVideo(staging, totalFrames);
  await rename(staging, output);
  console.log(`[Done] ${output}`);
  console.log(`[Verified] ${JSON.stringify(verified)}`);
  console.log('[Cleanup] All frames streamed in memory | 0 temporary frame directories created');
} finally {
  if (browser) await browser.close();
  await stage.close();
  await rm(staging, { force: true });
}
