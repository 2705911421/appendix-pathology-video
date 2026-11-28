import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rename, rm, statfs, writeFile } from 'node:fs/promises';
import { availableParallelism, freemem, totalmem } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { DEFAULT_PROFILE, getRenderProfile, renderProfile } from '../shared/renderProfile.js';
import { cueDurationMs } from '../shared/timelineHelper.js';
import { lockOutput } from './build_lock.mjs';
import { credits, readCueSheets } from './export_tts_sheet.mjs';
import { checkSegment, runMedia } from './media_probe.mjs';
import { renderFonts } from './render_fonts.mjs';
import { bridgePlateTarget, frameBoundary, launchBrowser, prepareBridgePlates, prepareStage, project, renderSection,
  smokeSection } from './render_master_sections.mjs';
import { findExternalInputs, syncDurations, voiceFile } from './sync_tts_durations.mjs';

const output = path.join(project, 'out');
const gib = 1024 ** 3;

export async function hasExternalVoices(cues) {
  return (await findExternalInputs(cues, { allowEmpty: true })).length > 0;
}

export function planSections({ sheets, cues }, master, profile = renderProfile) {
  const fallback = new Map(cues.map(cue => [cue.id, cue]));
  const synced = new Map(master?.cues.map(cue => [cue.id, cue]));
  let elapsedMs = 0;
  return sheets.map(({ sheet, file }, index) => {
    const sectionStart = elapsedMs;
    const activeCues = sheet.cues.map(cue => {
      const reference = synced.get(cue.id);
      const authored = fallback.get(cue.id);
      const { type, defaultDuration } = authored;
      const defaultMs = cueDurationMs(authored, { defaults: true });
      const ms = master && type === 'speech' ? Math.round(reference?.slotDur * 1000) : defaultMs;
      if (!Number.isSafeInteger(ms) || ms <= 0 || (cue.id === credits.id && ms !== credits.duration * 1000)) {
        throw new Error(`无效的渲染时长 ${cue.id}`);
      }
      if (master && (reference?.start !== elapsedMs / 1000 || reference.end !== (elapsedMs + ms) / 1000 ||
        (reference.type !== undefined && reference.type !== type))) {
        throw new Error(`人声与画面时间轴不一致 ${cue.id}`);
      }
      const start = (elapsedMs - sectionStart) / 1000;
      elapsedMs += ms;
      return { ...cue, type, defaultDuration, start, end: (elapsedMs - sectionStart) / 1000,
        duration: ms / 1000, effectiveDuration: ms / 1000 };
    });
    const startFrame = frameBoundary(sectionStart / 1000, profile.fps);
    const endFrame = frameBoundary(elapsedMs / 1000, profile.fps);
    const samplingOffset = startFrame / profile.fps - sectionStart / 1000;
    return { index, file, hasVoice: Boolean(master), frames: endFrame - startFrame, startFrame, endFrame, samplingOffset,
      sheet: { ...sheet, duration: activeCues.at(-1).end, cues: activeCues } };
  });
}

async function smoke(profile) {
  const sections = planSections(await readCueSheets(), undefined, profile);
  const browser = await launchBrowser();
  try {
    await smokeSection(browser, sections[0], 'S01', .57, profile);
    await smokeSection(browser, sections[0], 'S03', .83, profile);
    await smokeSection(browser, sections[2], 'S13', .63, profile);
    await smokeSection(browser, sections[4], 'S21', .51, profile);
  } finally {
    await browser.close();
  }
}

async function shaFile(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

function signatureFor(section, next, runtime) {
  const hash = createHash('sha256').update(JSON.stringify(runtime))
    .update(JSON.stringify({ frames: section.frames, offset: section.samplingOffset, hasVoice: section.hasVoice }));
  for (const { stage } of [section, next].filter(Boolean)) hash.update(JSON.stringify(stage));
  return hash.digest('hex');
}

async function canResume(file, marker, signature, section, profile) {
  try {
    const record = JSON.parse(await readFile(marker, 'utf8'));
    if (record.signature !== signature) throw new Error('画面、字体、运行环境或时间轴已变更');
    await checkSegment(file, profile, section.frames);
    if (record.sha256 !== await shaFile(file)) throw new Error('分段校验和不一致');
    console.log(`续渲命中 ${section.sheet.module}（ffprobe ${section.frames} 帧，${(section.frames / profile.fps).toFixed(3)} 秒）`);
    return true;
  } catch (error) {
    if (error.code !== 'ENOENT') console.log(`重新渲染 ${section.sheet.module}（${error.message.split('\n')[0]}）`);
    return false;
  }
}

async function renderAll(sections, directory, workers, profile, ffmpegVersion, force) {
  await mkdir(directory, { recursive: true });
  await Promise.all(sections.map(async section => { section.stage = await prepareStage(section); }));
  const browser = await launchBrowser();
  const pending = [];
  const files = [];
  try {
    const sources = ['../package-lock.json', 'render_master_sections.mjs', 'render_fonts.mjs'];
    const runtime = { profile, ffmpegVersion, browser: browser.version(), platform: process.platform, arch: process.arch,
      scripts: await Promise.all(sources.map(file => shaFile(new URL(file, import.meta.url)))) };
    for (const section of sections) {
      const file = path.join(directory, `${section.sheet.module}${profile.segmentSuffix}.mp4`);
      const marker = `${file}.json`;
      const signature = signatureFor(section, bridgePlateTarget(sections, section.index), runtime);
      const partial = file.replace(/\.mp4$/u, '.partial.mp4');
      const partialMarker = `${marker}.tmp`;
      files.push(file);
      await Promise.all([partial, partialMarker].map(item => rm(item, { force: true })));
      if (force || !await canResume(file, marker, signature, section, profile)) {
        pending.push({ section, file, marker, signature, partial, partialMarker });
      }
    }
    if (pending.length) await prepareBridgePlates(browser, sections, profile, pending.map(item => item.section));
  } finally {
    await browser.close();
  }
  let next = 0;
  const failure = new AbortController();
  await Promise.all(Array.from({ length: Math.min(workers, pending.length) }, async () => {
    try {
      while (!failure.signal.aborted && next < pending.length) {
        const { section, file, marker, signature, partial, partialMarker } = pending[next++];
        console.log(`开始 ${section.sheet.module}（${section.frames} 帧）`);
        try {
          await renderSection(section, partial, section.frames, 0, profile, failure.signal);
          await checkSegment(partial, profile, section.frames);
          await writeFile(partialMarker, JSON.stringify({ signature, sha256: await shaFile(partial) }) + '\n', { flag: 'wx' });
          await rename(partial, file);
          await rename(partialMarker, marker);
          console.log(`分段已校验并保存 ${section.sheet.module}`);
        } finally {
          section.bridgePlates = undefined;
          await Promise.all([partial, partialMarker].map(item => rm(item, { force: true })));
        }
      }
    } catch (error) {
      failure.abort(error);
    }
  }));
  failure.signal.throwIfAborted();
  return files;
}

function getWorkers(requested, profileName) {
  const concurrentMaster = totalmem() > 24 * gib && freemem() >= 8 * gib && availableParallelism() >= 4;
  const limit = profileName === 'master' && !concurrentMaster ? 1 : 2;
  return Math.min(requested ?? limit, limit);
}

async function buildMaster(requested, profileName, force) {
  const profile = getRenderProfile(profileName);
  const { assembleFinal, finalVideoName } = await import('./assemble_final.mjs');
  const [{ stdout: encoder }, { stdout: version }] = await Promise.all([
    runMedia('ffmpeg', ['-hide_banner', '-h', `encoder=${profile.videoCodec}`]),
    runMedia('ffmpeg', ['-version']),
    runMedia('ffprobe', ['-version']),
  ]);
  if (!encoder.includes(`Encoder ${profile.videoCodec} `)) throw new Error(`FFmpeg 缺少 ${profile.videoCodec}`);
  const release = await lockOutput(output);
  try {
    const { bsize, bavail } = await statfs(output);
    const freeGiB = bsize * bavail / gib;
    const reserve = profileName === 'master' ? 10 : profileName === 'teammate_1080p36' ? 3 : 1;
    if (freeGiB < reserve) throw new Error(`输出磁盘可用 ${freeGiB.toFixed(1)} GiB，${profileName} 档需要至少 ${reserve} GiB。`);
    const source = await readCueSheets();
    const inputs = await findExternalInputs(source.cues, { allowEmpty: true });
    const master = inputs.length ? await syncDurations(source, inputs) : undefined;
    const voicePath = master ? voiceFile : undefined;
    if (!master) console.log('使用默认时间线与程序配乐。');
    if (master && (master.duration < 315 || master.duration > 328)) {
      console.warn(`配音版时间线 ${master.duration.toFixed(3)} 秒，超出 315–328 秒审片目标。`);
    }
    const sections = planSections(source, master, profile);
    const frames = sections.at(-1).endFrame;
    const bridges = sections.flatMap(section => {
      const origin = section.startFrame / profile.fps - section.samplingOffset;
      return section.sheet.cues.filter(cue => cue.type === 'bridge')
        .map(({ id, start, end }) => ({ id, start: origin + start, end: origin + end }));
    });
    const ctSection = sections[4];
    const ctOrigin = ctSection.startFrame / profile.fps - ctSection.samplingOffset;
    const assessment = ctSection.sheet.cues.find(({ id }) => id === 'S20');
    const comparison = ctSection.sheet.cues.find(({ id }) => id === 'S21');
    // The dip through paper retains the four navigation marks near the cut.
    const inkAnchors = [...bridges, { id: 'S20-S21', start: ctOrigin + assessment.end - .04 * assessment.duration,
      end: ctOrigin + comparison.start + .02 * comparison.duration }];
    const workers = getWorkers(requested, profileName);
    console.log(`${profileName} 档位，总计 ${frames} 帧，${workers} 路并发（内存 ${(totalmem() / gib).toFixed(1)} GiB）。`);
    const scratch = path.join(output, '.render-cache', profileName);
    const segments = await renderAll(sections, scratch, workers, profile, version.split('\n')[0].trim(), force);
    const destination = path.join(output, finalVideoName(profileName, Boolean(voicePath)));
    await assembleFinal({ segments, frames, voicePath, destination, scratch, bridges, inkAnchors,
      creditsDuration: credits.duration, profileName });
    console.log(`${profileName} ${frames} 帧，${(frames / profile.fps).toFixed(3)} 秒\n${destination}`);
  } finally {
    await release();
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const { values } = parseArgs({ options: {
      profile: { type: 'string', default: DEFAULT_PROFILE },
      workers: { type: 'string' },
      force: { type: 'boolean' },
      smoke: { type: 'boolean' },
    } });
    if (values.workers !== undefined && !/^[12]$/u.test(values.workers)) throw new Error('--workers 必须是 1 或 2');
    if (values.smoke) await smoke(getRenderProfile(values.profile));
    else await buildMaster(values.workers === undefined ? undefined : Number(values.workers), values.profile, values.force);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
