import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { credits, readCueSheets } from './export_tts_sheet.mjs';
import { cueDurationMs } from '../shared/timelineHelper.js';
import { lockOutput } from './build_lock.mjs';

const exec = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const external = path.join(root, 'external_tts');
const output = path.join(root, 'out');
export const voiceFile = path.join(root, 'audio', 'voice_master.wav');
const timelineFile = path.join(output, 'master_timeline.json');
const sampleRate = 44100;
const channels = 2;
const padding = 0.45;

async function run(tool, args, label) {
  try {
    const { stdout, stderr } = await exec(tool, args, { windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
    if (stderr.trim()) throw new Error(stderr.trim());
    return stdout;
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`PATH 中找不到 ${tool}`, { cause: error });
    throw new Error(`${label} 的 ${tool} 处理失败\n${error.stderr?.trim() || error.message}`, { cause: error });
  }
}

async function fingerprint(file) {
  const info = await stat(file, { bigint: true });
  if (!info.isFile()) throw new Error(`不是音频文件 ${file}`);
  return [info.dev, info.ino, info.size, info.mtimeNs, info.ctimeNs].join('/');
}

export async function findExternalInputs(cues, { allowEmpty = false } = {}) {
  const voices = cues.filter(({ type }) => type === 'speech');
  const entries = await readdir(external, { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const byId = new Map(voices.map(({ id }) => [id, []]));
  for (const { name } of entries.filter(entry => entry.isFile())) {
    const match = /^(S\d{2})\.(wav|mp3)$/iu.exec(name);
    if (match) byId.get(match[1].toUpperCase())?.push(name);
  }
  const missing = voices.filter(({ id }) => byId.get(id).length === 0).map(({ id }) => id);
  const duplicate = voices.filter(({ id }) => byId.get(id).length > 1).map(({ id }) => byId.get(id).join(' / '));
  if (allowEmpty && missing.length === voices.length) return [];
  const errors = [];
  if (missing.length) errors.push(`缺少 ${missing.length} 条音频（.wav 或 .mp3）\n${missing.join('、')}`);
  if (duplicate.length) errors.push(`同一个 cue 需要唯一音频\n${duplicate.join('\n')}`);
  if (errors.length) throw new Error(errors.join('\n'));
  return Promise.all(voices.map(async ({ id }) => {
    const [name] = byId.get(id);
    const file = path.join(external, name);
    return { id, file, inputPath: `s1.1/external_tts/${name}`, fingerprint: await fingerprint(file) };
  }));
}

async function probe(file, label) {
  // Decoded sample counts reflect audible duration, including gapless trimming of MP3 padding.
  const stdout = await run('ffprobe', [
    '-v', 'error', '-select_streams', 'a:0', '-show_streams', '-show_frames', '-show_format',
    '-show_entries', 'stream=sample_rate,channels,codec_name:frame=nb_samples:format=format_name',
    '-of', 'json', '-protocol_whitelist', 'file', '-i', file,
  ], label);
  const { streams, frames, format } = JSON.parse(stdout);
  const stream = streams?.[0];
  const rate = Number(stream?.sample_rate);
  if (!['wav', 'mp3'].includes(format?.format_name)) throw new Error(`${label} 不是有效的 WAV 或 MP3 音频`);
  if (!Number.isSafeInteger(rate) || rate <= 0 || !frames?.length) {
    throw new Error(`${label} 没有可解码的音频`);
  }
  let samples = 0;
  for (const { nb_samples } of frames) {
    const count = Number(nb_samples);
    if (!Number.isSafeInteger(count) || count <= 0) throw new Error(`${label} 有无效的音频样本计数`);
    samples += count;
  }
  if (!Number.isSafeInteger(samples)) throw new Error(`${label} 的音频样本数超出可处理范围`);
  return { realDur: samples / rate, samples, rate, channels: stream.channels, codec: stream.codec_name };
}

function timeline(sheets, cues, measured) {
  const byId = new Map(measured.map(input => [input.id, input]));
  const sectionStarts = new Map();
  let cursorMs = 0;
  const slots = cues.map(cue => {
    const { id, module, type, zhText, enText, defaultDuration } = cue;
    const input = byId.get(id);
    const realDur = input?.realDur ?? 0;
    const slotMs = type === 'speech' ? Math.round((realDur + padding) * 1000) : cueDurationMs(cue);
    const slotDur = slotMs / 1000;
    const startMs = cursorMs;
    cursorMs += slotMs;
    if (!Number.isSafeInteger(cursorMs * sampleRate)) throw new Error('时间轴超出可处理范围');
    if (!sectionStarts.has(module)) sectionStarts.set(module, startMs);
    const sectionOffset = sectionStarts.get(module);
    return {
      id, module, type, zhText, enText, defaultDuration, realDur, slotDur,
      inputPath: input?.inputPath ?? null,
      start: startMs / 1000, end: cursorMs / 1000,
      sectionStart: (startMs - sectionOffset) / 1000, sectionEnd: (cursorMs - sectionOffset) / 1000,
      startSample: Math.round(startMs * sampleRate / 1000),
      endSample: Math.round(cursorMs * sampleRate / 1000),
    };
  });
  const sections = sheets.map(({ sheet }) => {
    const inSection = slots.filter(slot => slot.module === sheet.module);
    return {
      module: sheet.module,
      start: inSection[0].start, end: inSection.at(-1).end, duration: inSection.at(-1).sectionEnd,
    };
  });
  return {
    audioPath: 's1.1/audio/voice_master.wav', sampleRate, channels,
    duration: cursorMs / 1000, totalSamples: slots.at(-1).endSample,
    sections, cues: slots,
  };
}

async function renderVoice(measured, master, file) {
  const format = `aformat=sample_fmts=s16:sample_rates=${sampleRate}:channel_layouts=stereo`;
  const clock = 'asetpts=N/SR/TB';
  const speechStreams = new Map(measured.map(({ id }, index) => [id, index]));
  const filters = master.cues.map(({ id, type, startSample, endSample }, index) => {
    const length = endSample - startSample;
    const clip = `atrim=end_sample=${length},${clock}[slot${index}]`;
    return type !== 'speech'
      ? `anullsrc=r=${sampleRate}:cl=stereo,${format},${clip}`
      : `[${speechStreams.get(id)}:a:0]aresample=${sampleRate},${format},apad=whole_len=${length},${clip}`;
  });
  const inputs = master.cues.map((_, index) => `[slot${index}]`).join('');
  filters.push(`${inputs}concat=n=${master.cues.length}:v=0:a=1[voice]`);
  await run('ffmpeg', [
    '-hide_banner', '-v', 'error', '-nostdin', '-xerror', '-n',
    ...measured.flatMap(({ file }) => ['-protocol_whitelist', 'file', '-i', file]),
    '-filter_complex', filters.join(';'), '-map', '[voice]', '-map_metadata', '-1',
    '-c:a', 'pcm_s16le', '-ar', String(sampleRate), '-ac', String(channels), '-f', 'wav', file,
  ], '人声总轨');
  const result = await probe(file, '人声总轨');
  if (result.rate !== sampleRate || result.channels !== channels || result.codec !== 'pcm_s16le'
    || result.samples !== master.totalSamples) {
    throw new Error(`总轨校验失败，期望 ${master.totalSamples} 个立体声样本，实际 ${result.samples}`);
  }
}

async function cleanFiles(files) {
  const results = await Promise.allSettled(files.map(file => rm(file, { force: true })));
  for (const [index, result] of results.entries()) {
    if (result.status === 'rejected') console.warn(`临时文件清理失败 ${files[index]}\n${result.reason.message}`);
  }
}

// Prepare output backups before any replacement, and restore already-published files on failure.
async function publish(files, token) {
  const backups = new Map();
  const committed = [];
  const keep = new Set();
  try {
    for (const { destination } of files) {
      const backup = `${destination}.${token}.bak`;
      try {
        await copyFile(destination, backup, constants.COPYFILE_EXCL);
        backups.set(destination, backup);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    for (const { temporary, destination } of files) {
      await rename(temporary, destination);
      committed.push(destination);
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const destination of committed.reverse()) {
      const backup = backups.get(destination);
      try {
        if (backup) await rename(backup, destination);
        else await rm(destination, { force: true });
      } catch (rollbackError) {
        if (backup) keep.add(backup);
        rollbackErrors.push(`${destination} ${rollbackError.message}${backup ? `，备份在 ${backup}` : ''}`);
      }
    }
    if (rollbackErrors.length) {
      throw new Error(`${error.message}\n回滚失败\n${rollbackErrors.join('\n')}`, { cause: error });
    }
    throw error;
  } finally {
    await cleanFiles([...backups.values()].filter(file => !keep.has(file)));
  }
}

export async function syncDurations({ sheets, cues }, inputs) {
  await mkdir(path.dirname(voiceFile), { recursive: true });
  const token = randomUUID();
  const staged = [];
  const stage = destination => {
    const record = { destination, temporary: `${destination}.${token}.tmp` };
    staged.push(record);
    return record.temporary;
  };
  try {
    const measured = [];
    for (const input of inputs) {
      const { realDur } = await probe(input.file, input.id);
      measured.push({ ...input, realDur });
    }
    const master = timeline(sheets, cues, measured);
    await renderVoice(measured, master, stage(voiceFile));
    await writeFile(stage(timelineFile), `${JSON.stringify(master, null, 2)}\n`, { flag: 'wx' });
    for (const input of inputs) {
      if (await fingerprint(input.file) !== input.fingerprint) {
        throw new Error(`配音处理期间音频发生变化 ${input.id}`);
      }
    }
    await publish(staged, token);
    const bridgeDuration = master.cues.reduce((sum, cue) => sum + (cue.type === 'bridge' ? cue.slotDur : 0), 0);
    console.log(`已回填 ${measured.length} 句，全片 ${master.duration.toFixed(3)} 秒，含 ${bridgeDuration.toFixed(3)} 秒静音桥段及 S26 的 ${credits.duration.toFixed(3)} 秒静音。`);
    console.log(voiceFile);
    console.log(timelineFile);
    return master;
  } finally {
    await cleanFiles(staged.map(record => record.temporary));
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const release = await lockOutput(output);
    try {
      const source = await readCueSheets();
      await syncDurations(source, await findExternalInputs(source.cues));
    } finally {
      await release();
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
