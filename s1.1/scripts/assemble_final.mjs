import { execFile } from 'node:child_process';
import { rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { assertBlindReviewText } from '../shared/blindReview.js';
import { masterHeight, masterWidth, renderProfile as profile } from '../shared/renderProfile.js';

const exec = promisify(execFile);
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
    const envelope = (1 - Math.exp(-t * 118)) * Math.exp(-t * (1.55 + k * .66)) * Math.min(1, (3.6 - t) * 7);
    samples[i] = envelope * (fundamental + overtones);
  }
  return samples;
}

async function writePiano(file, count) {
  const duration = count / rate;
  const left = new Float32Array(count);
  const right = new Float32Array(count);
  const notes = new Map();
  const echo = Math.round(rate * .057);
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
  for (let i = 0; i < count; i++) {
    const gain = 32767 * Math.min(1, i / (rate * .45), (count - 1 - i) / (rate * 2));
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * gain), 44 + i * 4);
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i])) * gain), 46 + i * 4);
  }
  await writeFile(file, wav);
}

async function run(tool, args) {
  try {
    return await exec(tool, args, { windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  } catch (error) {
    throw new Error(`${tool} 处理失败\n${error.stderr?.trim() || error.message}`, { cause: error });
  }
}

async function inspect(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]);
  return JSON.parse(stdout);
}

function checkVideo(video) {
  if (video?.width !== masterWidth || video.height !== masterHeight || video.codec_name !== 'h264'
    || video.profile?.toLowerCase() !== profile.profile || video.level !== Number(profile.level) * 10 || video.pix_fmt !== profile.pixFmt
    || video.r_frame_rate !== `${profile.fps}/1`) {
    throw new Error('ffprobe 视频规格不符合 4K60 H.264 High@5.2');
  }
}

async function checkMaster(file, frames, creditsDuration) {
  const duration = frames / profile.fps;
  const { streams, format } = await inspect(file);
  const [video, audio] = streams;
  checkVideo(video);
  const tolerance = 1 / profile.fps + .001;
  if (streams.length !== 2 || Number(video.nb_frames) !== frames || video.avg_frame_rate !== `${profile.fps}/1`
    || Math.abs(Number(video.duration) - duration) > tolerance
    || Math.abs(Number(format.duration) - duration) > tolerance || audio.codec_name !== 'aac'
    || Number(audio.sample_rate) !== rate || audio.channels !== 2 || Math.abs(Number(audio.duration) - duration) > tolerance) {
    throw new Error('ffprobe 帧数、总时长或 AAC 立体声规格异常');
  }
  const structuralTags = /^(?:major_brand|minor_version|compatible_brands|language|handler_name|vendor_id)$/u;
  for (const tags of [format.tags, ...streams.map(stream => stream.tags)]) {
    for (const [key, value] of Object.entries(tags ?? {})) {
      if (!structuralTags.test(key)) throw new Error(`发现应清除的元数据 ${key}`);
      assertBlindReviewText(value);
    }
  }
  console.log(`ffprobe PASS（${masterWidth}×${masterHeight}，${profile.fps} fps，${frames} 帧，${duration.toFixed(3)} 秒）`);

  const { stderr } = await run('ffmpeg', ['-hide_banner', '-loglevel', 'info', '-nostdin', '-xerror', '-i', file,
    '-an', '-sn', '-vf', 'scale=960:540:flags=area,blackdetect=d=0.25:pix_th=0.10:pic_th=0.98,freezedetect=n=-70dB:d=2',
    '-f', 'null', '-']);
  const black = [...stderr.matchAll(/black_start:([\d.]+)\s+black_end:([\d.]+)/gu)];
  if (black.length) throw new Error(`blackdetect 发现黑屏 ${black.map(match => `${match[1]}–${match[2]}s`).join('、')}`);
  const freeze = [...stderr.matchAll(/freeze_start:\s*([\d.]+)/gu)].map(match => Number(match[1]));
  const early = freeze.filter(start => start < duration - creditsDuration - tolerance);
  if (early.length) throw new Error(`freezedetect 发现片尾前的静帧 ${early.map(start => `${start}s`).join('、')}`);
  console.log(`blackdetect PASS，freezedetect PASS（片尾识别到 ${freeze.length} 处停留）`);
}

export async function assembleFinal({ segments, frames, voicePath, destination, scratch, creditsDuration = 8 }) {
  const samples = Math.ceil(frames * rate / profile.fps);
  const music = path.join(scratch, 'piano.wav');
  const manifest = path.join(scratch, 'segments.ffconcat');
  const pending = path.join(scratch, 'verified-master.mp4');
  let totalFrames = 0;
  const lines = ['ffconcat version 1.0'];
  for (const file of segments) {
    const relative = path.relative(scratch, file);
    if (!/^[\w.-]+\.mp4$/u.test(relative)) throw new Error('分段文件必须位于合成临时目录');
    const { streams } = await inspect(file);
    if (streams.length !== 1) throw new Error(`分段应只含视频 ${relative}`);
    checkVideo(streams[0]);
    const count = Number(streams[0].nb_frames);
    if (!Number.isSafeInteger(count) || count <= 0) throw new Error(`分段帧数无效 ${relative}`);
    totalFrames += count;
    lines.push(`file ${relative}`, `duration ${(count / profile.fps).toFixed(6)}`);
  }
  if (totalFrames !== frames) throw new Error(`分段合计 ${totalFrames} 帧，预期 ${frames} 帧`);
  await Promise.all([writePiano(music, samples), writeFile(manifest, `${lines.join('\n')}\n`)]);
  const fit = `apad,atrim=end_sample=${samples}`;
  const tail = `${fit}[master]`;
  const filter = voicePath
    ? `[2:a]aresample=${rate},${fit},asplit=2[control][voice];[1:a]volume=0.66[bgm];`
      + '[bgm][control]sidechaincompress=threshold=0.035:ratio=8:attack=18:release=430[duck];'
      + `[voice][duck]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.93:level=0:latency=1,${tail}`
    : `[1:a]${tail}`;
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-f', 'concat', '-safe', '1',
    '-i', manifest, '-i', music, ...(voicePath ? ['-i', voicePath] : []),
    '-filter_complex', filter, '-map', '0:v:0', '-map', '[master]', '-c:v', 'copy', '-bsf:v', 'filter_units=remove_types=6',
    '-c:a', 'aac', '-b:a', '256k', '-ar', String(rate), '-ac', '2', '-flags:a', '+bitexact',
    '-map_metadata', '-1', '-map_metadata:s:v', '-1', '-map_metadata:s:a', '-1', '-map_chapters', '-1', '-fflags', '+bitexact',
    '-metadata:s:v:0', 'handler_name=', '-metadata:s:a:0', 'handler_name=', '-video_track_timescale', String(profile.fps * 1000),
    '-movflags', '+faststart', pending]);
  await checkMaster(pending, frames, creditsDuration);
  await rename(pending, destination);
}
