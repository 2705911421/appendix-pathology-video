import { access, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { assertBlindReviewText } from '../shared/blindReview.js';
import { DEFAULT_PROFILE, getRenderProfile } from '../shared/renderProfile.js';
import { lockOutput } from './build_lock.mjs';
import { checkVideo, inspectMedia, runMedia, withinSeconds } from './media_probe.mjs';
import { scanWhiteFrames } from './scan_white_frames.mjs';
import { CREDITS_TIMING } from '../shared/timelineHelper.js';

const title = '盲审稿-一根“香肠”的变质日记：阑尾的粉→红→黄→黑';
const rate = 44100;
const beat = 60 / 76;
// MIDI pitches for a quiet eight-bar felt-piano progression. Notes ring across bar lines.
const bars = [
  [48, 55, 60, 64, 67, 71], [45, 52, 57, 60, 64, 67],
  [41, 48, 53, 57, 60, 64], [43, 50, 55, 59, 62, 69],
  [48, 55, 60, 64, 67, 74], [40, 47, 55, 59, 62, 67],
  [41, 48, 53, 57, 60, 67], [43, 50, 55, 60, 62, 64],
];

function pianoVoice(pitch) {
  const radians = 2 * Math.PI * 440 * 2 ** ((pitch - 69) / 12);
  const tail = Math.round(rate * 3.6);
  const samples = new Float32Array(tail);
  const k = Math.max(0, (pitch - 48) / 26);
  for (let i = 0; i < tail; i++) {
    const t = i / rate;
    const fundamental = Math.sin(radians * t) * .78 + Math.sin(radians * t * 1.0021) * .22;
    const overtones = .25 * Math.exp(-t * 3.1) * Math.sin(radians * t * 2.002)
      + .09 * Math.exp(-t * 8) * Math.sin(radians * t * 3.011)
      + .035 * Math.exp(-t * 16) * Math.sin(radians * t * 4.021);
    const envelope = (1 - Math.exp(-t * 88)) * Math.exp(-t * (1.55 + k * .66)) * Math.min(1, (3.6 - t) * 7);
    samples[i] = envelope * (fundamental + overtones);
  }
  return samples;
}

function fadeEnvelope(samples, length) {
  return samples >= length ? 1 : .5 - .5 * Math.cos(Math.PI * samples / length);
}

async function writePiano(file, count, bridges) {
  const duration = count / rate;
  const left = new Float32Array(count);
  const right = new Float32Array(count);
  const notes = new Map();
  const echo = Math.round(rate * .057);
  const swells = bridges.map(({ start, end }) => [Math.round(start * rate), Math.round(end * rate)]);
  const pattern = [[0, 0, .092], [.5, 2, .041], [1, 1, .047], [1.5, 3, .047],
    [2, 0, .044], [2.5, 4, .059], [3.25, 5, .045]];
  for (let index = 0; index * 4 * beat < duration; index++) {
    for (const [offset, key, velocity] of pattern) {
      const pitch = bars[index % bars.length][key];
      if (!notes.has(pitch)) notes.set(pitch, pianoVoice(pitch));
      const voice = notes.get(pitch);
      const first = Math.round(rate * beat * (index * 4 + offset + (key >= 3 ? .015 : 0)));
      const pan = (pitch - 58) / 58;
      for (let i = 0; i < voice.length && first + i < count; i++) {
        const dry = voice[i] * velocity;
        const wet = i >= echo ? voice[i - echo] * velocity * .12 : 0;
        left[first + i] += dry * (.85 - pan) + wet * .65;
        right[first + i] += dry * (.85 + pan) + wet;
      }
    }
  }
  const wav = Buffer.allocUnsafe(44 + count * 4);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 4, 28);
  wav.writeUInt16LE(4, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(count * 4, 40);
  let nextSwell = 0;
  for (let i = 0; i < count; i++) {
    if (i >= (swells[nextSwell]?.[1] ?? Infinity)) nextSwell++;
    const swell = swells[nextSwell];
    const bridgeGain = swell && i >= swell[0]
      ? 1 + .08 * Math.sin(Math.PI * (i - swell[0]) / (swell[1] - swell[0])) ** 2
      : 1;
    const gain = 2.04 * bridgeGain * fadeEnvelope(i, rate * 1.2) * fadeEnvelope(count - 1 - i, rate * 3.2);
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i] * gain)) * 32767), 44 + i * 4);
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i] * gain)) * 32767), 46 + i * 4);
  }
  await writeFile(file, wav);
}

export function finalVideoName(profileName, hasVoice) {
  const { outputHeight, fps } = getRenderProfile(profileName);
  if (outputHeight) return `review_s1.1_${outputHeight}p_${fps}fps.mp4`;
  if (profileName === 'teammate_1080p36') return `teammate_s1.1_1080p_36fps${hasVoice ? '_voice' : ''}.mp4`;
  return `${title}${hasVoice ? '' : '（纯配乐版）'}.mp4`;
}

async function checkOutput(file, frames, creditsDuration, profile, review, loudnessTarget, inkAnchors) {
  const duration = frames / profile.fps;
  const { streams, format } = await inspectMedia(file);
  const [video, audio] = streams;
  checkVideo(video, profile);
  const tolerance = 1 / profile.fps + .001;
  if (streams.length !== 2 || Number(video.nb_frames) !== frames
    || !withinSeconds(video.duration, duration, .001) || !withinSeconds(video.start_time, 0, .001)
    || !withinSeconds(format.duration, duration, tolerance) || audio.codec_name !== 'aac'
    || !withinSeconds(audio.start_time, 0, .001) || Number(audio.sample_rate) !== rate
    || audio.channels !== 2 || !withinSeconds(audio.duration, duration, tolerance)) {
    throw new Error('ffprobe 帧数、总时长或 AAC 立体声规格异常');
  }
  const structuralTags = /^(?:major_brand|minor_version|compatible_brands|language|handler_name|vendor_id)$/u;
  for (const tags of [format.tags, ...streams.map(stream => stream.tags)]) {
    for (const [key, value] of Object.entries(tags ?? {})) {
      if (!structuralTags.test(key)) throw new Error(`发现应清除的元数据 ${key}`);
      assertBlindReviewText(value);
    }
  }
  console.log(`ffprobe PASS（${video.width}×${video.height}，${profile.fps} fps，${frames} 帧，${duration.toFixed(3)} 秒）`);

  const detectors = 'blackdetect=d=0:pix_th=0.10:pic_th=0.98,freezedetect=n=-70dB:d=3.5';
  const { stdout, stderr } = await runMedia('ffmpeg', ['-hide_banner', '-loglevel', 'info', '-nostats', '-nostdin',
    '-xerror', '-threads', '4', '-i', file, '-map', '0:v', '-an', '-sn', '-vf', detectors, '-fps_mode', 'passthrough',
    '-threads:v', '2', '-f', 'framemd5', '-']);
  const black = [...stderr.matchAll(/black_start:([\d.]+)\s+black_end:([\d.]+)/gu)]
    .map(([, start, end]) => [Number(start), Number(end)]);
  const freeze = [];
  for (const [, boundary, stamp] of stderr.matchAll(/freeze_(start|end):\s*([\d.]+)/gu)) {
    if (boundary === 'start') freeze.push([Number(stamp), duration]);
    else if (freeze.length) freeze.at(-1)[1] = Number(stamp);
  }
  const ranges = intervals => intervals.map(([start, end]) => `${start.toFixed(3)}–${end.toFixed(3)}s`).join('、');
  if (black.length) throw new Error(`blackdetect 发现黑帧 ${ranges(black)}`);
  const creditsStart = frames - Math.round(creditsDuration * profile.fps);
  const early = freeze.filter(([start]) => start < creditsStart / profile.fps);
  console.log(`blackdetect PASS。freezedetect 标记正片 ${early.length} 处低动量区间${early.length ? ` ${ranges(early)}` : ''}。`);
  const hashes = stdout.split(/\r?\n/u).filter(line => line.startsWith('0,')).map(line => line.slice(line.lastIndexOf(',') + 1).trim());
  if (hashes.length !== frames) throw new Error(`逐帧复核解码出 ${hashes.length} 帧，预期 ${frames} 帧`);
  let longest = 0;
  for (let end = 1, start = 0; end <= creditsStart; end++) {
    if (end < creditsStart && hashes[end] === hashes[start]) continue;
    longest = Math.max(longest, end - start);
    if (end - start > 3 * profile.fps) {
      throw new Error(`正片出现超过 3 秒的完全重复画面 ${ranges([[start / profile.fps, end / profile.fps]])}`);
    }
    start = end;
  }
  console.log(`逐帧哈希 PASS（正片最长连续同帧 ${(longest / profile.fps).toFixed(3)} 秒）。`);
  if (review && creditsDuration > 0) {
    await scanWhiteFrames(file, { frames, fps: profile.fps, creditsDuration, bridges: inkAnchors });
  }
  const { stderr: report } = await runMedia('ffmpeg', ['-hide_banner', '-nostats', '-nostdin', '-xerror', '-i', file,
    '-map', '0:a:0', '-vn', '-af', 'ebur128=peak=true:framelog=verbose', '-f', 'null', '-']);
  const summary = report.slice(report.lastIndexOf('Summary:'));
  const integrated = Number(/\bI:\s*(-?[\d.]+) LUFS/u.exec(summary)?.[1]);
  const peak = Number(/\bPeak:\s*(-?[\d.]+) dB(?:FS|TP)/u.exec(summary)?.[1]);
  const lra = Number(/\bLRA:\s*(-?[\d.]+) LU/u.exec(summary)?.[1]);
  if (![integrated, peak, lra].every(Number.isFinite) || Math.abs(integrated - loudnessTarget) > 1.0 || peak > -1.0) {
    throw new Error(`成片响度校验失败（${integrated} LUFS，${peak} dBTP，目标 ${loudnessTarget} LUFS，真峰值 ≤ -1 dBTP）`);
  }
  console.log(`ebur128 PASS（${integrated} LUFS，LRA ${lra} LU，${peak} dBTP）。`);
}

async function normalizationFilter(inputs, mix, target) {
  const norm = `loudnorm=I=${target}:TP=-2:LRA=${target === -24 ? 7 : 11}`;
  const { stderr } = await runMedia('ffmpeg', ['-hide_banner', '-nostats', '-nostdin', '-xerror',
    ...inputs, '-filter_complex', `${mix};[mix]${norm}:print_format=json[measured]`,
    '-map', '[measured]', '-f', 'null', '-']);
  const json = stderr.match(/\{\s*"input_i"\s*:[\s\S]*?\}/u)?.[0];
  const stats = json ? JSON.parse(json) : {};
  const keys = { measured_I: 'input_i', measured_TP: 'input_tp', measured_LRA: 'input_lra',
    measured_thresh: 'input_thresh', offset: 'target_offset' };
  const measured = Object.entries(keys).map(([parameter, key]) => {
    const value = Number(stats[key]);
    if (!Number.isFinite(value)) throw new Error(`loudnorm 无法量取 ${key}，请检查音源。`);
    return `${parameter}=${value}`;
  });
  return `${norm}:linear=true:${measured.join(':')}`;
}

export async function assembleFinal({
  segments, frames, voicePath, destination, scratch, bridges = [], inkAnchors = bridges,
  creditsDuration = CREDITS_TIMING.duration, profileName = DEFAULT_PROFILE,
}) {
  const profile = getRenderProfile(profileName);
  const review = profile.outputHeight === 480;
  const music = path.join(scratch, '.assemble-piano.wav');
  const manifest = path.join(scratch, '.assemble-segments.ffconcat');
  const pending = path.join(scratch, '.assemble-verified.mp4');
  let totalFrames = 0;
  const lines = ['ffconcat version 1.0'];
  for (const file of segments) {
    const relative = path.relative(scratch, file);
    if (!/^[\w.-]+\.mp4$/u.test(relative)) throw new Error('分段文件必须位于合成临时目录');
    const { streams } = await inspectMedia(file);
    if (streams.length !== 1) throw new Error(`分段应只含视频 ${relative}`);
    checkVideo(streams[0], profile);
    const count = Number(streams[0].nb_frames);
    if (!Number.isSafeInteger(count) || count <= 0) throw new Error(`分段帧数无效 ${relative}`);
    totalFrames += count;
    lines.push(`file ${relative}`, `duration ${(count / profile.fps).toFixed(6)}`);
  }
  const expectedFrames = frames ?? totalFrames;
  if (!totalFrames || totalFrames !== expectedFrames) throw new Error(`分段合计 ${totalFrames} 帧，预期 ${expectedFrames} 帧`);
  try {
    const samples = Math.ceil(expectedFrames * rate / profile.fps);
    await Promise.all([writePiano(music, samples, bridges), writeFile(manifest, `${lines.join('\n')}\n`)]);
    const fit = `apad,atrim=end_sample=${samples},asetpts=N/SR/TB`;
    const mix = voicePath
      ? `[1:a]aresample=${rate},${fit},asplit=2[control][voice];[0:a]volume=0.43[bgm];`
        + '[bgm][control]sidechaincompress=threshold=0.025:ratio=6:attack=32:release=760:detection=rms[duck];'
        + `[voice][duck]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.93:level=0:latency=1,${fit}[mix]`
      : `[0:a]${fit}[mix]`;
    const audioInputs = ['-i', music, ...(voicePath ? ['-i', voicePath] : [])];
    const loudnessTarget = voicePath || review ? -16 : -24;
    const norm = await normalizationFilter(audioInputs, mix, loudnessTarget);
    const filter = `${mix};[mix]${norm},aresample=${rate},${fit}[master]`;
    await runMedia('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-xerror', '-y', ...audioInputs,
      '-f', 'concat', '-safe', '1', '-i', manifest,
      '-filter_complex', filter, '-map', `${voicePath ? 2 : 1}:v:0`, '-map', '[master]',
      '-c:v', 'copy', '-bsf:v', 'filter_units=remove_types=6',
      '-c:a', 'aac', '-b:a', '256k', '-ar', String(rate), '-ac', '2', '-flags:a', '+bitexact',
      '-map_metadata', '-1', '-map_metadata:s:v', '-1', '-map_metadata:s:a', '-1', '-map_chapters', '-1', '-fflags', '+bitexact',
      '-metadata:s:v:0', 'handler_name=', '-metadata:s:a:0', 'handler_name=', '-video_track_timescale', String(profile.fps * 1000),
      '-movflags', '+faststart', pending]);
    await checkOutput(pending, expectedFrames, creditsDuration, profile, review, loudnessTarget, inkAnchors);
    await rename(pending, destination);
  } finally {
    await Promise.all([music, manifest, pending].map(file => rm(file, { force: true })));
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const { values } = parseArgs({ options: {
      profile: { type: 'string', default: DEFAULT_PROFILE },
      'segments-dir': { type: 'string' },
    } });
    if (!values['segments-dir']) throw new Error('用法 node s1.1/scripts/assemble_final.mjs --segments-dir=<分段目录> [--profile=review]');
    const profileName = values.profile;
    const profile = getRenderProfile(profileName);
    const scratch = path.resolve(values['segments-dir']);
    const segments = Array.from({ length: 6 }, (_, index) => path.join(scratch, `s1.1-${index + 1}${profile.segmentSuffix}.mp4`));
    const preparedVoice = path.join(scratch, 'voice_master.wav');
    const voicePath = await access(preparedVoice).then(() => preparedVoice, error => {
      if (error.code !== 'ENOENT') throw error;
    });
    const output = fileURLToPath(new URL('../out/', import.meta.url));
    const destination = path.join(output, finalVideoName(profileName, Boolean(voicePath)));
    const release = await lockOutput(output);
    try {
      await assembleFinal({ segments, voicePath, destination, scratch, profileName });
    } finally {
      await release();
    }
    console.log(destination);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
