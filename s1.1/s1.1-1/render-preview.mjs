import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { timeCues } from './src/timing.js';
import { directory, launchStageBrowser, loadStagePage, openStagePage, startStage } from './stage-host.mjs';

const exec = promisify(execFile);
const fps = 12;
const batch = 6;
const out = path.join(directory, 'out');
const movie = path.join(out, 'preview_s1.1-1_12fps.mp4');
const temporary = path.join(out, '.preview-' + process.pid + '.mp4');
const maximumSize = 3_000_000;

async function captureFrames(page, times) {
  return page.evaluate(async times => {
    const canvas = document.querySelector('#opening-stage');
    const output = [];
    for (const time of times) {
      window.renderAt(time);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Canvas capture failed');
      const pixels = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (let offset = 0; offset < pixels.length; offset += 0x4000) {
        binary += String.fromCharCode(...pixels.subarray(offset, offset + 0x4000));
      }
      output.push(btoa(binary));
    }
    return output;
  }, times);
}

async function open(browser, host) {
  const faults = [];
  const page = await openStagePage(browser, host.url, faults);
  await loadStagePage(page, host.url + '/?preview=1');
  assert.deepEqual(faults, []);
  return { page, faults };
}

async function checkAnatomy({ page, faults }, cue) {
  const times = [.435, .80].map(p => cue.start + cue.duration * p);
  const [middle, landmarks] = await page.evaluate(times => times.map(t => window.anatomyAt(t)), times);
  assert.deepEqual(faults, []);
  assert.ok(landmarks, 'Could not read the diagram landmarks');
  const { navel, asisR, mcburney } = landmarks;
  assert.deepEqual(navel, { x: 1340, y: 355 });
  assert.deepEqual(asisR, { x: 1185, y: 495 });
  assert.deepEqual(landmarks.appendix, mcburney);
  assert.deepEqual(landmarks.painCenter, mcburney);
  for (const axis of ['x', 'y']) {
    const midpoint = (navel[axis] + mcburney[axis]) / 2;
    assert.ok(Math.abs(middle.painCenter[axis] - midpoint) < 1e-7);
  }
  const gap = mcburney.y - navel.y;
  console.log('[S03 @ p=.80] navel.y=' + navel.y.toFixed(2)
    + ' px  mcburney.y=' + mcburney.y.toFixed(2) + ' px  asisR.y=' + asisR.y.toFixed(2)
    + ' px  gap=' + gap.toFixed(2) + ' px');
  assert.ok(navel.y < mcburney.y && mcburney.y < asisR.y && gap >= 45, 'Incorrect landmark heights');
  assert.ok(Math.abs(mcburney.y - (asisR.y + (navel.y - asisR.y) / 3)) < 1e-7);
  assert.ok(Math.abs(mcburney.x - (asisR.x + (navel.x - asisR.x) / 3)) < 1e-7);
  assert.ok(asisR.x < mcburney.x && mcburney.x < navel.x);
}

async function checkPatient({ page, faults }, cues) {
  const lunch = cues.find(cue => cue.id === 'S01');
  const split = cues.find(cue => cue.id === 'S02');
  const acute = cues.find(cue => cue.id === 'S03');
  const at = (cue, p) => cue.start + cue.duration * p;
  const times = [at(lunch, 0), at(lunch, .58), at(lunch, .95), at(split, .15), at(split, .30),
    at(acute, 0), at(acute, .435), at(acute, .80)];
  const [meal, turning, navel, sliding, separated, starting, moving, folded] = await page.evaluate(
    times => times.map(t => window.openingPatientAt(t)), times);
  assert.deepEqual(faults, []);
  assert.equal(meal.fromPose, 'eat');
  assert.equal(meal.progress, 0);
  assert.ok(turning.progress > 0 && turning.progress < 1);
  assert.equal(navel.pose, 'navel_pain');
  assert.equal(navel.progress, 1);
  assert.ok(sliding.cx < meal.cx && sliding.cx > separated.cx);
  assert.equal(separated.cx, 690);
  assert.equal(separated.pose, 'navel_pain');
  assert.equal(starting.fromPose, 'navel_pain');
  assert.equal(starting.progress, 0);
  assert.ok(Math.abs(moving.progress - .5) < 1e-7);
  assert.equal(folded.pose, 'rlq_acute');
  assert.equal(folded.progress, 1);
  assert.ok(folded.head[0] < starting.head[0] - 30, 'The acute drawing must curl forward');
  console.log('[S01 → S03] approved pose changes, x=690 and the acute curl verified');
}

async function checkTransition({ page, faults }, cues) {
  const labs = cues.find(cue => cue.id === 'S04');
  const title = cues.find(cue => cue.id === 'S05');
  const at = (cue, p) => cue.start + cue.duration * p;
  const times = [at(labs, .85), at(labs, .925), at(title, 0), at(title, .08), at(title, .12),
    at(title, .14), at(title, .30)];
  const [full, fading, ...frames] = await page.evaluate(times => times.map(t => window.openingTransitionAt(t)), times);
  assert.deepEqual(faults, []);
  assert.ok(full.labsOpacity > .999 && fading.labsOpacity > 0 && fading.labsOpacity < full.labsOpacity);
  assert.ok(frames.every(frame => frame.labsOpacity === 0));
  assert.ok(frames.slice(0, 4).every(frame => frame.headlineProgress === 0));
  assert.ok(frames[1].firstSwatch > 0 && frames[2].firstSwatch > frames[1].firstSwatch);
  assert.ok(frames.at(-1).headlineProgress > 0);
  const [faintPatient, noPatient] = await page.evaluate(times => times.map(t => window.openingTransitionAt(t)),
    [at(labs, .08), at(labs, .12)]);
  assert.ok(faintPatient.patientOpacity > 0 && faintPatient.patientOpacity < 1);
  assert.ok(noPatient.patientOpacity < 1e-9);
  assert.ok(frames[1].noteOpacity > 0 && frames[2].noteOpacity < 1e-9);
  console.log('[S04 → S05] laboratory opacity reaches 0 before the headline; the first swatch grows during the gap');
}

async function checkOrder(workers, time) {
  const samples = [4.35, time, 46.8];
  const hash = encoded => createHash('md5').update(Buffer.from(encoded, 'base64')).digest('hex');
  const [first, reverse] = await Promise.all([
    captureFrames(workers[0].page, samples),
    captureFrames(workers[1].page, samples.toReversed()),
  ]);
  assert.deepEqual(first.map(hash), reverse.toReversed().map(hash));
  console.log('[Preview] 3/3 frame digests match in reverse order');
}

async function encode(workers, frames) {
  const child = spawn('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-f', 'image2pipe',
    '-framerate', String(fps), '-vcodec', 'png', '-i', 'pipe:0',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', '-preset', 'veryfast',
    '-maxrate', '450k', '-bufsize', '450k', '-an', '-movflags', '+faststart', temporary,
  ], { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
  const exited = once(child, 'close');
  exited.catch(() => {});
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', text => { stderr = (stderr + text).slice(-8192); });
  child.stdin.on('error', () => {});
  try {
    await once(child, 'spawn');
    for (let start = 0; start < frames; start += batch * workers.length) {
      const groups = await Promise.all(workers.map(async ({ page, faults }, worker) => {
        const first = start + worker * batch;
        const count = Math.min(batch, frames - first);
        if (count <= 0) return [];
        const times = Array.from({ length: count }, (_, i) => (first + i) / fps);
        const captures = await captureFrames(page, times);
        assert.deepEqual(faults, [], 'Browser error during preview');
        return captures;
      }));
      for (const group of groups) {
        for (const encoded of group) {
          await new Promise((resolve, reject) => child.stdin.write(Buffer.from(encoded, 'base64'),
            error => error ? reject(error) : resolve()));
        }
      }
      const done = Math.min(start + batch * workers.length, frames);
      if (done % 120 === 0 || done === frames) console.log('[Preview] ' + done + '/' + frames + ' frames');
    }
    child.stdin.end();
    const [code] = await exited;
    assert.equal(code, 0, stderr || 'FFmpeg failed');
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await exited.catch(() => {});
  }
}

async function verifyVideo(frames) {
  const { stdout } = await exec('ffprobe', [
    '-v', 'error', '-count_frames',
    '-show_entries', 'stream=codec_type,codec_name,width,height,avg_frame_rate,nb_read_frames,duration:format=size,duration',
    '-of', 'json', temporary,
  ], { windowsHide: true });
  const { streams, format } = JSON.parse(stdout);
  assert.equal(streams.length, 1);
  const [track] = streams;
  assert.deepEqual([track.codec_type, track.codec_name, track.width, track.height, track.avg_frame_rate],
    ['video', 'h264', 960, 540, '12/1']);
  assert.equal(Number(track.nb_read_frames), frames);
  assert.ok(Math.abs(Number(format.duration) - frames / fps) < .001);
  const { size } = await stat(temporary);
  assert.equal(size, Number(format.size));
  assert.ok(size < maximumSize, 'Preview exceeds 3 MB');
  return { duration: format.duration, frames, bytes: size, width: 960, height: 540, fps, audioStreams: 0 };
}

const host = await startStage();
let browser;
try {
  const { duration, cues } = timeCues(host.sheet.cues);
  const migration = cues.find(cue => cue.id === 'S03');
  const time = migration.start + migration.duration * .8;
  const frames = Math.round(duration * fps);
  assert.ok(frames > 0);
  browser = await launchStageBrowser();
  const workers = await Promise.all([open(browser, host), open(browser, host)]);
  await checkAnatomy(workers[0], migration);
  await checkPatient(workers[0], cues);
  await checkTransition(workers[0], cues);
  await checkOrder(workers, time);
  await encode(workers, frames);
  const info = await verifyVideo(frames);
  await rename(temporary, movie);
  console.log('[Verified] ' + JSON.stringify(info));
  console.log('[Output] ' + movie);
} finally {
  if (browser) await browser.close();
  await host.close();
  await rm(temporary, { force: true });
}
