import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, open, readdir, readFile, rm, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { renderProfile as profile } from '../shared/renderProfile.js';
import { credits, readCueSheets } from './export_tts_sheet.mjs';
import { frameBoundary, launchBrowser, project, renderSection, smokeSection } from './render_master_sections.mjs';

const exec = promisify(execFile);
const output = path.join(project, 'out');
const title = '盲审稿-一根“香肠”的变质日记：阑尾的粉→红→黄→黑';

async function hasExternalVoices(cues) {
  const names = await readdir(path.join(project, 'external_tts'), { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const ids = new Set(names.filter(entry => entry.isFile())
    .map(entry => /^(S\d\d)\.(?:wav|mp3)$/iu.exec(entry.name)?.[1].toUpperCase()));
  return cues.every(({ id }) => id === credits.id || ids.has(id));
}

export function planSections({ sheets, cues }, master) {
  const fallback = new Map(cues.map(cue => [cue.id, cue.defaultDuration]));
  const synced = new Map(master?.cues.map(cue => [cue.id, cue]));
  let elapsedMs = 0;
  return sheets.map(({ sheet, file }, index) => {
    const sectionStart = elapsedMs;
    const activeCues = sheet.cues.map(cue => {
      const reference = synced.get(cue.id);
      const duration = master ? reference?.slotDur : fallback.get(cue.id);
      const ms = Math.round(duration * 1000);
      if (!Number.isSafeInteger(ms) || ms <= 0 || (cue.id === credits.id && duration !== credits.duration)) {
        throw new Error(`无效的渲染时长 ${cue.id}`);
      }
      if (master && (reference.start !== elapsedMs / 1000 || reference.end !== (elapsedMs + ms) / 1000)) {
        throw new Error(`人声与画面时间轴不一致 ${cue.id}`);
      }
      const start = (elapsedMs - sectionStart) / 1000;
      elapsedMs += ms;
      return { ...cue, start, end: (elapsedMs - sectionStart) / 1000, duration };
    });
    const startFrame = frameBoundary(sectionStart / 1000);
    const endFrame = frameBoundary(elapsedMs / 1000);
    const samplingOffset = startFrame / profile.fps - sectionStart / 1000;
    return { index, file, hasVoice: Boolean(master), frames: endFrame - startFrame, endFrame, samplingOffset,
      sheet: { ...sheet, duration: activeCues.at(-1).end, cues: activeCues } };
  });
}

async function smoke() {
  const sections = planSections(await readCueSheets());
  const browser = await launchBrowser();
  try {
    await smokeSection(browser, sections[0], 'S03', .83);
    await smokeSection(browser, sections[2], 'S13', .63);
  } finally {
    await browser.close();
  }
}

async function renderAll(sections, directory, workers) {
  const files = sections.map(({ sheet }) => path.join(directory, `${sheet.module}.mp4`));
  const browser = await launchBrowser();
  let next = 0;
  let failure;
  try {
    await Promise.all(Array.from({ length: workers }, async () => {
      try {
        while (!failure && next < sections.length) {
          const index = next++;
          const section = sections[index];
          console.log(`开始 ${section.sheet.module}（${section.frames} 帧）`);
          await renderSection(browser, section, files[index], section.frames);
        }
      } catch (error) {
        failure ??= error;
        await browser.close();
      }
    }));
    if (failure) throw failure;
    return files;
  } finally {
    await browser.close();
  }
}

async function buildMaster(workers) {
  const { assembleFinal } = await import('./assemble_final.mjs');
  const [{ stdout: encoder }] = await Promise.all([
    exec('ffmpeg', ['-hide_banner', '-h', `encoder=${profile.videoCodec}`], { windowsHide: true }),
    exec('ffprobe', ['-version'], { windowsHide: true }),
  ]);
  if (!encoder.includes(`Encoder ${profile.videoCodec} `)) throw new Error(`FFmpeg 缺少 ${profile.videoCodec}`);
  await mkdir(output, { recursive: true });
  const lockPath = path.join(output, '.build_master_all.lock');
  const lock = await open(lockPath, 'wx').catch(error => {
    if (error.code === 'EEXIST') throw new Error(`已有母带构建锁 ${lockPath}`);
    throw error;
  });
  let scratch;
  try {
    await lock.writeFile(`${process.pid}\n`);
    scratch = await mkdtemp(path.join(output, '.master-'));
    let source = await readCueSheets();
    let master;
    let voicePath;
    if (await hasExternalVoices(source.cues)) {
      console.log('已找到 25 条外部配音，量取原音并同步时间轴。');
      try {
        const result = await exec(process.execPath, [path.join(project, 'scripts', 'sync_tts_durations.mjs')], { windowsHide: true });
        console.log(result.stdout.trim());
      } catch (error) {
        throw new Error(`配音回填失败\n${error.stderr?.trim() || error.message}`, { cause: error });
      }
      master = JSON.parse(await readFile(path.join(output, 'master_timeline.json'), 'utf8'));
      voicePath = path.join(scratch, 'voice_master.wav');
      await copyFile(path.join(project, 'audio', 'voice_master.wav'), voicePath);
      source = await readCueSheets();
    } else {
      console.log('外部配音尚未齐全，按默认分镜时长生成纯配乐版。');
    }
    const sections = planSections(source, master);
    const frames = sections.at(-1).endFrame;
    const segments = await renderAll(sections, scratch, workers);
    const destination = path.join(output, `${title}${voicePath ? '' : '（纯配乐版）'}.mp4`);
    await assembleFinal({ segments, frames, voicePath, destination, scratch, creditsDuration: credits.duration });
    console.log(`母带 ${frames} 帧，${(frames / profile.fps).toFixed(3)} 秒\n${destination}`);
  } finally {
    try {
      if (scratch && path.dirname(path.resolve(scratch)) === path.resolve(output) && path.basename(scratch).startsWith('.master-')) {
        await rm(scratch, { recursive: true, force: true });
      }
    } finally {
      await lock.close();
      await unlink(lockPath);
    }
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const args = process.argv.slice(2);
    const workersArgument = args.find(arg => /^--workers=[1-6]$/u.test(arg));
    const workers = Number(workersArgument?.split('=')[1] ?? 2);
    if (args.length === 1 && args[0] === '--smoke') await smoke();
    else if (!args.length || (args.length === 1 && workersArgument)) await buildMaster(workers);
    else throw new Error('用法 node s1.1/scripts/build_master_all.mjs [--workers=1..6 | --smoke]');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
