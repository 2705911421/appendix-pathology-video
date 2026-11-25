import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assertBlindReviewText } from '../shared/blindReview.js';
import { getRenderProfile } from '../shared/renderProfile.js';
import { finalVideoName } from './assemble_final.mjs';
import { planSections } from './build_master_all.mjs';
import { credits, readCueSheets } from './export_tts_sheet.mjs';
import { checkVideo, inspectMedia, runMedia } from './media_probe.mjs';
import { project } from './render_master_sections.mjs';

const profileName = process.argv[2] ?? 'review';
const profile = getRenderProfile(profileName);
const file = path.join(project, 'out', finalVideoName(profileName, false));
const plan = planSections(await readCueSheets(), undefined, profile);
const frames = plan.at(-1).endFrame;
const duration = frames / profile.fps;

const { streams, format } = await inspectMedia(file, true);
const [video, audio] = streams;
checkVideo(video, profile);
assert.equal(streams.length, 2);
assert.equal(Number(video.nb_read_frames), frames);
assert.equal(Number(video.nb_frames), frames);
assert.equal(Number(video.duration), duration);
assert.ok(video.width % 2 === 0 && video.height % 2 === 0);
assert.ok(Math.abs(Number(format.duration) - duration) < .002);
assert.equal(audio.codec_name, 'aac');
assert.equal(audio.channels, 2);
const gap = Math.abs(Number(video.duration) - Number(audio.duration));
assert.ok(gap < .15, 'A/V duration drift');
const tagNames = ['major_brand', 'minor_version', 'compatible_brands', 'language', 'handler_name', 'vendor_id'];
let tags = 0;
for (const data of [format.tags, ...streams.map(stream => stream.tags)]) {
  for (const [key, value] of Object.entries(data ?? {})) {
    tags++;
    assert.ok(tagNames.includes(key), `Unexpected metadata key ${key}`);
    const valid = {
      major_brand: /^[A-Za-z0-9 ]{4}$/u, minor_version: /^\d+$/u, compatible_brands: /^[A-Za-z0-9 ]+$/u,
      language: /^(?:und|zho|eng)$/u, handler_name: /^(?:VideoHandler|SoundHandler|)$/u, vendor_id: /^[0\[\]]*$/u,
    }[key];
    assert.match(value, valid, key);
    assertBlindReviewText(value);
  }
}
const [pictures, loudness] = await Promise.all([
  runMedia('ffmpeg', ['-hide_banner', '-nostats', '-nostdin', '-xerror', '-i', file, '-map', '0:v:0', '-an',
    '-vf', 'blackdetect=d=0:pix_th=0.10:pic_th=0.98,freezedetect=n=-70dB:d=3.5',
    '-fps_mode', 'passthrough', '-threads:v', '2', '-f', 'framemd5', '-']),
  runMedia('ffmpeg', ['-hide_banner', '-nostats', '-nostdin', '-xerror', '-i', file, '-map', '0:a:0', '-vn',
    '-af', 'ebur128=peak=true:framelog=verbose', '-f', 'null', '-']),
]);
const black = [...pictures.stderr.matchAll(/black_start:([\d.]+)\s+black_end:([\d.]+)/gu)];
assert.equal(black.length, 0);
const checksums = pictures.stdout.split(/\r?\n/u).filter(line => line.startsWith('0,')).map(line => line.split(',').at(-1).trim());
assert.equal(checksums.length, frames);
const creditsStart = frames - Math.round(credits.duration * profile.fps);
const frozen = [];
for (const [, side, time] of pictures.stderr.matchAll(/freeze_(start|end):\s*([\d.]+)/gu)) {
  if (side === 'start') frozen.push([Number(time), duration]);
  else if (frozen.length) frozen.at(-1)[1] = Number(time);
}
const lowMotion = frozen.filter(([start]) => start < creditsStart / profile.fps).map(([start, end]) => {
  const from = Math.round(start * profile.fps);
  const to = Math.min(creditsStart, Math.round(end * profile.fps));
  return { start, end, differentFrames: new Set(checksums.slice(from, to)).size, frames: to - from };
});
let max = 0, largest = 0;
for (let first = 0; first < creditsStart;) {
  let last = first + 1;
  while (last < creditsStart && checksums[last] === checksums[first]) last++;
  if (last - first > max) { max = last - first; largest = first; }
  first = last;
}
assert.ok(max / profile.fps < 3.5, `True decoded hold at ${largest / profile.fps}s for ${max / profile.fps}s`);
assert.ok(lowMotion.every(x => x.differentFrames > 1 || x.frames / profile.fps < 3.5));

const windows = plan.flatMap(section => {
  const seconds = section.startFrame / profile.fps - section.samplingOffset;
  return section.sheet.cues.filter(cue => cue.type === 'bridge' || cue.type === 'credits').map(cue => ({
    id: cue.id, from: seconds + cue.start - (cue.type === 'credits' ? .7 : .17),
    to: seconds + (cue.type === 'credits' ? cue.start + .6 : cue.end + .17),
  }));
});
const frameSize = 160 * 90;
const gray = execFileSync('ffmpeg', ['-v', 'error', '-nostdin', '-xerror', '-i', file, '-map', '0:v:0', '-an',
  '-vf', 'scale=160:90:flags=area,format=gray', '-fps_mode', 'passthrough', '-threads:v', '1', '-f', 'rawvideo', '-'],
{ maxBuffer: 96_000_000, windowsHide: true });
assert.equal(gray.length, frameSize * frames);
for (const window of windows) {
  let maxJump = 0, at = 0, measured = 0;
  for (let frame = Math.max(1, Math.ceil(window.from * profile.fps)); frame <= Math.floor(window.to * profile.fps); frame++) {
    let sum = 0;
    const offset = frame * frameSize;
    for (let i = 0; i < frameSize; i++) sum += (gray[offset + i] - gray[offset + i - frameSize]) ** 2;
    const delta = Math.sqrt(sum / frameSize) / 255;
    if (delta > maxJump) { maxJump = delta; at = frame; }
    measured++;
  }
  window.maxRMSE = maxJump;
  window.maxAt = at / profile.fps;
  window.measured = measured;
  assert.ok(maxJump <= .12, `${window.id} decoded transition RMSE ${maxJump.toFixed(5)} at ${window.maxAt.toFixed(3)}s`);
}

const summary = loudness.stderr.slice(loudness.stderr.lastIndexOf('Summary:'));
const integrated = Number(/\bI:\s*(-?[\d.]+) LUFS/u.exec(summary)?.[1]);
const peak = Number(/\bPeak:\s*(-?[\d.]+) dB(?:FS|TP)/u.exec(summary)?.[1]);
assert.ok(integrated >= -18 && integrated <= -14 && peak <= -1);
const rate = Number(audio.sample_rate);
const bytes = execFileSync('ffmpeg', ['-v', 'error', '-nostdin', '-ss', (duration - 3).toFixed(3), '-i', file,
  '-map', '0:a:0', '-t', '3', '-ac', '1', '-ar', String(rate), '-f', 'f32le', '-'], { maxBuffer: 4_000_000, windowsHide: true });
const values = Array.from({ length: bytes.length / 4 }, (_, i) => bytes.readFloatLE(i * 4));
const rms = buffer => 20 * Math.log10(Math.max(1e-10, Math.sqrt(buffer.reduce((s, n) => s + n * n, 0) / buffer.length)));
const taper = Array.from({ length: 6 }, (_, i) => rms(values.slice(i * rate / 2, (i + 1) * rate / 2)));
const endValues = values.slice(-Math.round(.050 * rate));
const endRms = rms(endValues);
const tailJump = endValues.reduce((peak, n, i) => i ? Math.max(peak, Math.abs(n - endValues[i - 1])) : peak, 0);
assert.ok(taper[0] - taper.at(-1) >= 14 && endRms < -55 && tailJump < .004, 'Audio tail lacks a smooth attenuation');

const metrics = { profile: profileName, frames, duration, width: video.width, height: video.height, fps: profile.fps,
  pixFmt: video.pix_fmt, audioSeconds: Number(audio.duration), avGap: gap, structuralTags: tags, privateMetadata: 0,
  blackIntervals: black.length, lowMotion, maxIdenticalFrames: max, maxIdenticalSeconds: max / profile.fps,
  identicalStart: largest / profile.fps, abnormalFreezes: 0, transitionWindows: windows, lufs: integrated, truePeak: peak, tailRms: taper,
  last50msRms: endRms, last50msMaxDelta: tailJump, bytes: Number(format.size) };
await writeFile(path.join(project, 'out', '.strict-media-metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
console.log(JSON.stringify(metrics));
