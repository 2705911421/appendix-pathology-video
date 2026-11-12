#!/usr/bin/env node
// Final assembly: cues + scene video + bilingual subtitle overlay + 12 s endcard + audio.
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadCuesFromFs, writeSnapshot } from '../subtitle/loadCues.js';
import { subtitleState, linesFor, cardsFor, BAND, CN_SIZE, EN_SIZE, EN_FLOOR, EN_MAX_W, MAX, WEIGHT_CN, WEIGHT_EN, FADE, HALO } from '../subtitle/subtitle.js';
import { canvasPng, withPage } from './browser.mjs';
import { renderEndcard } from './render_endcard.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_VOICE = '/workspace/病理科普视频/配音/全稿_v3/旁白_v3.wav';
const ENDCARD_SECONDS = 12;

function parseArgs(argv) {
  const o = {
    sceneVideo: null,
    cues: null,
    voice: null,
    music: null,
    endcardDir: path.join(root, 'endcard'),
    fps: 30,
    outDir: path.join(root, 'qa'),
    outName: 'dryrun_测试',
    contentDuration: null,
    maxCues: null,
    blind: true,
    xfade: false,
    keepTmp: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const nxt = () => {
      if (i + 1 >= argv.length) throw new Error('missing value for ' + a);
      return argv[++i];
    };
    if (a === '--scene-video') o.sceneVideo = nxt();
    else if (a === '--cues') o.cues = nxt();
    else if (a === '--voice') o.voice = nxt();
    else if (a === '--music') o.music = nxt();
    else if (a === '--endcard-dir') o.endcardDir = path.resolve(nxt());
    else if (a === '--fps') o.fps = Number(nxt());
    else if (a === '--out-dir') o.outDir = path.resolve(nxt());
    else if (a === '--out-name') o.outName = nxt();
    else if (a === '--content-duration') o.contentDuration = Number(nxt());
    else if (a === '--max-cues') o.maxCues = Number(nxt());
    else if (a === '--blind') o.blind = true;
    else if (a === '--no-blind') o.blind = false;
    else if (a === '--xfade') o.xfade = true;
    else if (a === '--keep-tmp') o.keepTmp = true;
    else throw new Error('Unknown argument ' + a);
  }
  if (!o.voice && fs.existsSync(DEFAULT_VOICE)) o.voice = DEFAULT_VOICE;
  return o;
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => {
      if (code === 0) resolve({ out, err });
      else reject(new Error(`${cmd} ${args.map((x) => (/\s/.test(x) ? JSON.stringify(x) : x)).join(' ')}\n${err.slice(-4000)}`));
    });
  });
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function exists(p) {
  try { return fs.statSync(p).isFile() && fs.statSync(p).size > 0; } catch { return false; }
}

async function probe(file) {
  const { out } = await run('ffprobe', ['-hide_banner', '-print_format', 'json', '-show_format', '-show_streams', file]);
  return JSON.parse(out);
}

function visualKey(state) {
  if (!state) return 'none';
  const q = (a) => (a >= 0.999 ? 1 : a <= 0.001 ? 0 : Math.round(a * 1000) / 1000);
  return `${state.cn}\t${state.en}\t${q(state.cnA)}\t${q(state.enA)}`;
}

async function linkOrCopy(src, dest) {
  try { await fsp.link(src, dest); } catch { await fsp.copyFile(src, dest); }
}

async function rawPixels(png, pixFmt) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-v', 'error', '-i', png, '-f', 'rawvideo', '-pix_fmt', pixFmt, 'pipe:1'], { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    let err = '';
    p.stdout.on('data', (d) => chunks.push(d));
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(err || 'raw decode failed'))));
  });
}

function checkFullFrame(buf) {
  const w = 1920;
  const h = 1080;
  const paper = [0xf4, 0xef, 0xe6];
  let above = 0;
  let minAbove = null;
  let ink = 0;
  let minInk = null;
  for (let y = 0; y < h; y++) {
    const row = y * w * 3;
    for (let x = 0; x < w; x++) {
      const i = row + x * 3;
      const diff = Math.abs(buf[i] - paper[0]) + Math.abs(buf[i + 1] - paper[1]) + Math.abs(buf[i + 2] - paper[2]);
      if (diff <= 12) continue;
      if (y < BAND.fadeTop) {
        above++;
        if (minAbove == null) minAbove = y;
      } else {
        ink++;
        if (minInk == null) minInk = y;
      }
    }
  }
  return { above, minAbove, ink, minInk };
}

function checkOverlay(buf) {
  const w = 1920;
  const h = 1080;
  let above = 0;
  let minAbove = null;
  let opaque = 0;
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let x = 0; x < w; x++) {
      const a = buf[row + x * 4 + 3];
      if (y < BAND.fadeTop) {
        if (a !== 0) {
          above++;
          if (minAbove == null) minAbove = y;
        }
      } else if (a === 255) opaque++;
    }
  }
  return { above, minAbove, opaque };
}

function pngSize(buf) {
  if (buf.toString('ascii', 1, 4) !== 'PNG') throw new Error('not a png');
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function lastJson(text) {
  const i = text.lastIndexOf('{');
  const j = text.lastIndexOf('}');
  if (i < 0 || j < i) throw new Error('no JSON in ffmpeg output\n' + text.slice(-1800));
  return JSON.parse(text.slice(i, j + 1));
}

async function maxVolumeDb(file) {
  const { err } = await run('ffmpeg', ['-hide_banner', '-i', file, '-af', 'volumedetect', '-f', 'null', '-']);
  const m = err.match(/max_volume:\s*(-?[\d.]+|-?inf)\s*dB/i);
  if (!m) return null;
  if (m[1] === '-inf') return -Infinity;
  return Number(m[1]);
}

async function buildAudio({ voice, music, contentDur, totalDur, outWav }) {
  const voiceOk = voice && exists(voice);
  const musicOk = music && exists(music);
  let voiceSilent = !voiceOk;
  let musicSilent = !musicOk;
  if (voiceOk) {
    const peak = await maxVolumeDb(voice);
    voiceSilent = peak == null || peak <= -70;
  }
  if (musicOk) {
    const peak = await maxVolumeDb(music);
    musicSilent = peak == null || peak <= -70;
  }
  const report = {
    voice: voiceOk ? voice : null,
    music: musicOk ? music : null,
    voiceSilent,
    musicSilent,
  };
  if (voiceSilent && musicSilent) {
    await run('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
      '-t', totalDur.toFixed(6),
      '-c:a', 'pcm_s16le', outWav,
    ]);
    report.loudnorm = 'skipped';
    report.reason = 'Both voice and music are missing or digital silence. loudnorm is skipped because it misbehaves on digital silence.';
    report.integratedLufs = null;
    report.truePeak = null;
    return report;
  }

  const c = contentDur.toFixed(6);
  const tot = totalDur.toFixed(6);
  const fadeAt = Math.max(0, totalDur - 0.8).toFixed(6);
  const vIn = voiceOk ? ['-i', voice] : ['-f', 'lavfi', '-t', tot, '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000'];
  const mIn = musicOk ? ['-i', music] : ['-f', 'lavfi', '-t', tot, '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000'];
  const graph = [
    `[0:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:${c},asetpts=PTS-STARTPTS,apad=whole_dur=${tot},atrim=0:${tot}[voice]`,
    `[1:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:${tot},asetpts=PTS-STARTPTS,apad=whole_dur=${tot},afade=t=out:st=${fadeAt}:d=0.8[music]`,
    `[music][voice]sidechaincompress=threshold=0.05:ratio=8:attack=50:release=300[ducked]`,
    `[ducked][voice]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0,atrim=0:${tot},asetpts=PTS-STARTPTS[mix]`,
  ].join(';');
  const mixed = outWav.replace(/\.wav$/, '.mixed.wav');
  await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...vIn, ...mIn, '-filter_complex', graph, '-map', '[mix]', '-c:a', 'pcm_s16le', mixed]);
  const pass1 = await run('ffmpeg', ['-hide_banner', '-i', mixed, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-']);
  const measured = lastJson(pass1.err);
  const af = [
    'loudnorm=I=-14:TP=-1:LRA=11',
    `measured_I=${measured.input_i}`,
    `measured_TP=${measured.input_tp}`,
    `measured_LRA=${measured.input_lra}`,
    `measured_thresh=${measured.input_thresh}`,
    `offset=${measured.target_offset}`,
    'linear=true',
  ].join(':');
  await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', mixed, '-af', af, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', outWav]);
  const pass2 = await run('ffmpeg', ['-hide_banner', '-i', outWav, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-']);
  const after = lastJson(pass2.err);
  await fsp.rm(mixed, { force: true });
  report.loudnorm = 'two-pass';
  report.integratedLufs = Number(after.input_i);
  report.truePeak = Number(after.input_tp);
  report.target = { integratedLufs: -14, truePeakMax: -1 };
  return report;
}

async function makeScene({ sceneVideo, frames, fps, out }) {
  const dur = frames / fps;
  if (!sceneVideo) {
    await run('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'lavfi', '-i', `color=c=0xF4EFE6:s=1920x1080:r=${fps}`,
      '-frames:v', String(frames), '-r', String(fps),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '16', '-bf', '0', '-g', String(fps),
      '-an', out,
    ]);
    return 'placeholder #F4EFE6';
  }
  const info = await probe(sceneVideo);
  const v = info.streams.find((s) => s.codec_type === 'video');
  const same = Number(v.width) === 1920 && Number(v.height) === 1080;
  const prep = same
    ? `fps=${fps},setpts=PTS-STARTPTS,trim=duration=${dur.toFixed(6)}`
    : `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=${fps},setpts=PTS-STARTPTS,trim=duration=${dur.toFixed(6)}`;
  const d = dur.toFixed(6);
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', sceneVideo,
    '-f', 'lavfi', '-i', `color=c=0xF4EFE6:s=1920x1080:r=${fps}:d=${d}`,
    '-filter_complex', `[0:v]${prep}[v];[1:v]fps=${fps},trim=duration=${d},setpts=PTS-STARTPTS[p];[p][v]overlay=eof_action=pass,format=yuv420p`,
    '-frames:v', String(frames), '-r', String(fps),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '16', '-bf', '0', '-g', String(fps),
    '-an', out,
  ]);
  return sceneVideo;
}

function cueWindow(cues) {
  return cues.map((c) => ({
    id: c.id,
    ch: c.ch,
    start: round3(c.start),
    end: round3(c.end),
    hanzi: c.hanzi,
    text: c.text,
    en: c.en,
    englishCards: c.englishCards,
    lines: linesFor(c).map((l) => ({ text: l.text, start: round3(l.start), end: round3(l.end) })),
    cards: cardsFor(c).map((l) => ({ text: l.text, start: round3(l.start), end: round3(l.end) })),
  }));
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  const opt = parseArgs(process.argv);
  if (!(opt.fps > 0)) throw new Error('fps must be positive');
  await fsp.mkdir(opt.outDir, { recursive: true });
  const tmp = path.join(opt.outDir, 'tmp');
  const subDir = path.join(tmp, 'sub');
  const endDir = path.join(tmp, 'endcard');
  await fsp.rm(tmp, { recursive: true, force: true });
  await fsp.mkdir(subDir, { recursive: true });
  await fsp.mkdir(path.join(opt.outDir, 'frames'), { recursive: true });

  const endcardJson = path.join(opt.endcardDir, 'data/endcard.json');
  const watched = ['data/endcard.json', 'endcard.js', 'index.html', 'render.mjs'].map((rel) => path.join(opt.endcardDir, rel));
  const hashesBefore = Object.fromEntries(watched.map((f) => [f, sha256(f)]));
  if (!fs.readFileSync(endcardJson, 'utf8').includes('【待填】')) {
    throw new Error('endcard.json is missing 【待填】 before assembly; refusing to continue');
  }

  const loaded = loadCuesFromFs({ cues: opt.cues || undefined });
  const snapName = String(loaded.source || '').includes('estimate') ? 'cues_estimate.json' : 'cues_loaded.json';
  const snapPath = path.join(opt.outDir, snapName);
  writeSnapshot(snapPath, loaded);

  console.log(`cues ${loaded.count} source=${loaded.source} duration=${loaded.duration}`);
  if (loaded.count !== 77 && String(loaded.source).includes('estimate')) {
    throw new Error(`expected 77 estimated cues, got ${loaded.count}`);
  }

  let clip = loaded.cues.slice();
  if (opt.maxCues) clip = clip.slice(0, opt.maxCues);
  let contentDur = clip[clip.length - 1].end;
  if (opt.contentDuration != null) {
    contentDur = opt.contentDuration;
    clip = clip.filter((c) => c.start < contentDur).map((c) => (c.end > contentDur ? { ...c, end: contentDur } : { ...c }));
  }
  const contentFrames = Math.round(contentDur * opt.fps);
  const endFrames = Math.round(ENDCARD_SECONDS * opt.fps);
  const contentDurExact = contentFrames / opt.fps;
  const totalDur = (contentFrames + endFrames) / opt.fps;
  const clipPath = path.join(opt.outDir, 'cues_dryrun.json');
  fs.writeFileSync(clipPath, JSON.stringify({
    source: loaded.source,
    formula: loaded.formula,
    contentDuration: contentDurExact,
    lastCueEnd: clip[clip.length - 1].end,
    cues: clip,
  }, null, 2) + '\n');

  const c1 = clip.find((c) => c.id === '01') || clip[0];
  const c3 = clip.find((c) => c.id === '03');
  if (!c3) throw new Error('dry-run window has no sentence 03');
  const t1 = (c1.start + c1.end) / 2;
  const t3 = (c3.start + c3.end) / 2;
  const framesDir = path.join(opt.outDir, 'frames');
  const stills = [
    { t: t1, file: path.join(framesDir, '帧_01_句01中点.png'), kind: 'subtitle' },
    { t: t3, file: path.join(framesDir, '帧_02_最长英文_s03.png'), kind: 'subtitle' },
  ];

  console.log(`content ${contentDurExact}s (${contentFrames} frames) + endcard ${ENDCARD_SECONDS}s → ${totalDur}s`);
  console.log(`still t01=${t1} t03=${t3} endcardLocal=3 file=${contentDurExact + 3}`);

  const audioPath = path.join(tmp, 'audio.wav');
  const audioReport = await buildAudio({
    voice: opt.voice,
    music: opt.music,
    contentDur: contentDurExact,
    totalDur,
    outWav: audioPath,
  });
  console.log('audio', audioReport.loudnorm, audioReport.reason || '');

  const scenePath = path.join(tmp, 'scene.mp4');
  const sceneNote = await makeScene({ sceneVideo: opt.sceneVideo, frames: contentFrames, fps: opt.fps, out: scenePath });
  console.log('scene', sceneNote);

  const runs = [];
  for (let i = 0; i < contentFrames; i++) {
    const t = i / opt.fps;
    const key = visualKey(subtitleState(t, clip, { xfade: opt.xfade }));
    const last = runs[runs.length - 1];
    if (last && last.key === key) last.count += 1;
    else runs.push({ key, t, index: i, count: 1 });
  }
  console.log(`subtitle unique frames ${runs.length} / ${contentFrames}`);

  const measurePath = path.join(opt.outDir, 'english_measure.json');
  let measured = null;
  let overlayCheck = null;
  let qaPaths = null;
  let qaMeta = null;
  await withPage(path.join(root, 'subtitle'), 'http://subtitle.local', async (page) => {
    measured = await page.evaluate((cues) => window.measureCards(cues), loaded.cues);
    await page.evaluate(({ cues, xfade }) => { window.CUES = cues; window.XFADE = xfade; }, { cues: clip, xfade: opt.xfade });
    for (const still of stills) {
      const png = await canvasPng(page, still.t, 'full');
      await fsp.writeFile(still.file, png);
      console.log('still', still.file);
    }
    const extras = await page.evaluate((t) => window.buildQaStills(t), t3);
    const qaNames = {
      compare: '对比_字幕字号.png',
      phone: '预览_手机竖屏.png',
      strip: '预览_手机竖屏_条.png',
    };
    qaPaths = {};
    for (const [key, name] of Object.entries(qaNames)) {
      const file = path.join(framesDir, name);
      const url = extras[key];
      const comma = url.indexOf(',');
      if (comma < 0) throw new Error('QA still ' + name + ' was not a PNG');
      await fsp.writeFile(file, Buffer.from(url.slice(comma + 1), 'base64'));
      qaPaths[key] = file;
      console.log('qa', file);
    }
    qaMeta = extras.meta;
    let n = 0;
    let holdChecked = false;
    for (const run of runs) {
      const png = await canvasPng(page, run.t, 'overlay');
      const first = path.join(subDir, `f_${String(n).padStart(5, '0')}.png`);
      await fsp.writeFile(first, png);
      if (!holdChecked) {
        const st = subtitleState(run.t, clip, { xfade: opt.xfade });
        if (st && st.cn && st.cnA >= 0.999 && st.en && st.enA >= 0.999) {
          const raw = await rawPixels(first, 'rgba');
          overlayCheck = checkOverlay(raw);
          holdChecked = true;
          console.log('overlay alpha check', overlayCheck);
        }
      }
      n += 1;
      for (let k = 1; k < run.count; k++) {
        await linkOrCopy(first, path.join(subDir, `f_${String(n).padStart(5, '0')}.png`));
        n += 1;
      }
      if (n % 120 === 0 || n === contentFrames) console.log(`subtitle frames ${n}/${contentFrames}`);
    }
    if (n !== contentFrames) throw new Error(`subtitle frames ${n} != ${contentFrames}`);
  });
  fs.writeFileSync(measurePath, JSON.stringify(measured, null, 2) + '\n');

  const dead = (measured.rows || []).filter((r) => r.text && !(r.width > 0));
  if (dead.length) throw new Error('MixSans measureText returned 0 for ' + dead[0].text);

  const contentPath = path.join(tmp, 'content.mp4');
  console.log('overlay encode');
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', scenePath,
    '-framerate', String(opt.fps), '-start_number', '0', '-i', path.join(subDir, 'f_%05d.png'),
    '-filter_complex', '[1:v]format=rgba[s];[0:v][s]overlay=0:0:format=auto,format=yuv420p',
    '-frames:v', String(contentFrames), '-r', String(opt.fps),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '14', '-bf', '0', '-g', String(opt.fps),
    '-an', contentPath,
  ]);
  await fsp.rm(subDir, { recursive: true, force: true });

  const endcardPath = path.join(tmp, 'endcard.mp4');
  const endStill = path.join(framesDir, '帧_03_片尾A_t3.png');
  console.log('endcard render');
  await renderEndcard({
    endcardDir: opt.endcardDir,
    frameDir: endDir,
    videoPath: endcardPath,
    fps: opt.fps,
    duration: ENDCARD_SECONDS,
    stills: [{ t: 3, file: endStill }],
  });
  await fsp.rm(endDir, { recursive: true, force: true });

  const out1080 = path.join(opt.outDir, `${opt.outName}.mp4`);
  const out720 = path.join(opt.outDir, `${opt.outName}_720p.mp4`);
  const outBlind = path.join(opt.outDir, `${opt.outName}_盲审.mp4`);
  console.log('mux', out1080);
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', contentPath,
    '-i', endcardPath,
    '-i', audioPath,
    '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0[v]',
    '-map', '[v]', '-map', '2:a:0',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(opt.fps), '-preset', 'veryfast', '-crf', '16', '-bf', '0', '-g', String(opt.fps),
    '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2',
    '-movflags', '+faststart',
    out1080,
  ]);
  console.log('720p');
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', out1080,
    '-vf', 'scale=1280:720',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '18', '-bf', '0',
    '-c:a', 'copy',
    '-movflags', '+faststart',
    out720,
  ]);

  const hashesAfter = Object.fromEntries(watched.map((f) => [f, sha256(f)]));
  const endcardUntouched = watched.every((f) => hashesBefore[f] === hashesAfter[f]);
  const pendingStill = fs.readFileSync(endcardJson, 'utf8').includes('【待填】');

  const inkReports = [];
  for (const still of stills) {
    const buf = fs.readFileSync(still.file);
    const size = pngSize(buf);
    const raw = await rawPixels(still.file, 'rgb24');
    const ink = checkFullFrame(raw);
    inkReports.push({ file: still.file, ...size, t: still.t, ...ink, pass: size.w === 1920 && size.h === 1080 && ink.above === 0 && ink.ink > 0 && ink.minInk >= BAND.fadeTop });
  }
  const endBuf = fs.readFileSync(endStill);
  const endSize = pngSize(endBuf);

  const p1080 = await probe(out1080);
  const p720 = await probe(out720);
  const v1080 = p1080.streams.find((s) => s.codec_type === 'video');
  const a1080 = p1080.streams.find((s) => s.codec_type === 'audio');
  const dur1080 = Number(p1080.format.duration);
  const dur720 = Number(p720.format.duration);

  const shrinks = (measured.rows || []).filter((r) => r.size < EN_SIZE && !r.overflow);
  const overflows = (measured.rows || []).filter((r) => r.overflow);
  const widest = (measured.rows || []).reduce((a, b) => (!a || b.width > a.width ? b : a), null);

  const blockers = [];
  if (!endcardUntouched) blockers.push('endcard files changed during the run');
  if (!pendingStill) blockers.push('【待填】 missing from endcard.json');
  if (loaded.count !== 77) blockers.push(`cue count ${loaded.count}, expected 77 for this dry run`);
  for (const ink of inkReports) if (!ink.pass) blockers.push(`ink/safe-area fail ${path.basename(ink.file)} above=${ink.above} minInk=${ink.minInk}`);
  if (!overlayCheck || overlayCheck.above !== 0 || overlayCheck.opaque < 1000) blockers.push('transparent subtitle band failed the alpha check');
  if (Math.abs(dur1080 - totalDur) > 1 / opt.fps + 0.01) blockers.push(`duration ${dur1080}s differs from expected ${totalDur}s`);
  if (Number(v1080.width) !== 1920 || Number(v1080.height) !== 1080) blockers.push('master is not 1920x1080');
  if (v1080.pix_fmt !== 'yuv420p') blockers.push('master pix_fmt is ' + v1080.pix_fmt);
  if (!a1080) blockers.push('master has no audio stream');
  else if (Number(a1080.sample_rate) !== 48000 || Number(a1080.channels) !== 2) blockers.push('audio is not stereo 48 kHz');
  if (endSize.w !== 1920 || endSize.h !== 1080) blockers.push('endcard still is not 1920x1080');
  const qaSize = {};
  if (!qaPaths || !qaMeta) blockers.push('comparison and phone stills were not written');
  else {
    for (const [key, file] of Object.entries(qaPaths)) {
      qaSize[key] = pngSize(fs.readFileSync(file));
    }
    const expect = {
      compare: qaMeta.compare,
      phone: qaMeta.phone,
      strip: qaMeta.strip,
    };
    for (const key of Object.keys(expect)) {
      const got = qaSize[key];
      const want = expect[key];
      if (!got || got.w !== want.w || got.h !== want.h) blockers.push(`QA frame ${key} is ${got ? got.w + 'x' + got.h : 'missing'}, expected ${want.w}x${want.h}`);
    }
    if (qaMeta.phone.w !== 390) blockers.push('phone preview is not 390 px wide');
    if (qaMeta.safeTop !== BAND.safeTop) blockers.push('phone/compare safeTop does not match BAND');
  }

  let blind = { skipped: !opt.blind };
  if (opt.blind) {
    const probeTxt = path.join(opt.outDir, 'blind_ffprobe.txt');
    const stringsTxt = path.join(opt.outDir, 'blind_strings.txt');
    const scan = [endcardJson, snapPath, clipPath, measurePath];
    const script = path.join(root, 'pipeline/blind_review.sh');
    const proc = await runCapture(script, [out1080, outBlind, probeTxt, stringsTxt, ...scan]);
    blind = {
      skipped: false,
      exitCode: proc.code,
      probe: probeTxt,
      strings: stringsTxt,
      pass: proc.code === 0 && fs.readFileSync(probeTxt, 'utf8').includes('RESULT: PASS') && fs.readFileSync(stringsTxt, 'utf8').includes('RESULT: PASS'),
      stderr: proc.err.slice(-1500),
    };
    if (!blind.pass) blockers.push('blind review FAIL');
  }

  const fileInfo = (file) => {
    const st = fs.statSync(file);
    return { file, bytes: st.size, size: fmtBytes(st.size) };
  };
  const info1080 = fileInfo(out1080);
  const info720 = fileInfo(out720);
  const infoBlind = opt.blind && exists(outBlind) ? fileInfo(outBlind) : null;

  const windowTable = cueWindow(clip);
  const state1 = subtitleState(t1, clip, { xfade: opt.xfade });
  const state3 = subtitleState(t3, clip, { xfade: opt.xfade });
  const mismatches = loaded.mismatches || [];

  const report = {
    source: loaded.source,
    formula: loaded.formula,
    finalAudioTiming: loaded.finalAudioTiming,
    note: loaded.note || null,
    cueCount: loaded.count,
    first: loaded.cues[0] && loaded.cues[0].text,
    last: loaded.cues[loaded.cues.length - 1] && loaded.cues[loaded.cues.length - 1].text,
    mismatches,
    contentDuration: contentDurExact,
    lastCueEnd: clip[clip.length - 1].end,
    endcardDuration: ENDCARD_SECONDS,
    totalDurationExpected: totalDur,
    duration1080: dur1080,
    duration720: dur720,
    video: { width: v1080.width, height: v1080.height, pix_fmt: v1080.pix_fmt, codec: v1080.codec_name },
    audio: a1080 ? { codec: a1080.codec_name, sampleRate: a1080.sample_rate, channels: a1080.channels } : null,
    files: { master: info1080, p720: info720, blind: infoBlind },
    audioReport,
    typography: { CN_SIZE, EN_SIZE, EN_FLOOR, EN_MAX_W, MAX, weightCn: WEIGHT_CN, weightEn: WEIGHT_EN, halo: HALO, fade: FADE },
    BAND,
    pictureSafeTop: BAND.safeTop,
    xfade: opt.xfade,
    scene: sceneNote,
    english: {
      cards: measured.rows.length,
      shrinks,
      overflows: overflows.length ? overflows : measured.overflow,
      widest,
    },
    stills: { t1, t3, endcardT: 3, fileTime: contentDurExact + 3, state1, state3, inkReports, endSize, overlayCheck, qaPaths, qaMeta, qaSize },
    window: windowTable,
    endcardUntouched,
    pendingStill,
    blind,
    blockers,
  };
  const jsonPath = path.join(opt.outDir, `${opt.outName}_report.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n');
  const mdPath = path.join(opt.outDir, 'dryrun_report.md');
  fs.writeFileSync(mdPath, renderMarkdown(report));
  console.log('report', mdPath);

  if (!opt.keepTmp) await fsp.rm(tmp, { recursive: true, force: true });
  if (blockers.length) {
    console.error('BLOCKERS:\n' + blockers.map((b) => '- ' + b).join('\n'));
    process.exitCode = 1;
  } else {
    console.log('dry run OK');
  }
}

function runCapture(cmd, args) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => resolve({ code, out, err }));
  });
}

function renderMarkdown(r) {
  const lines = [];
  lines.push('# v5 assembly dry run');
  lines.push('');
  lines.push(`Cue source: \`${r.source}\`. Count: **${r.cueCount}**.`);
  lines.push(`First: ${r.first}`);
  lines.push(`Last: ${r.last}`);
  lines.push('');
  if (r.formula) {
    lines.push(`Estimate formula: \`${r.formula}\`.`);
    lines.push('Each duration is rounded to the nearest millisecond (`hanzi * 220 + 400` ms). This is not final audio timing.');
    lines.push('');
  }
  lines.push(`Mismatches vs lines.json / 字数 column: ${r.mismatches.length}.`);
  if (r.mismatches.length) {
    lines.push('');
    lines.push('```');
    lines.push(JSON.stringify(r.mismatches.slice(0, 30), null, 2));
    lines.push('```');
  }
  lines.push('');
  lines.push('## Typography');
  lines.push('');
  lines.push('| Item | Value |');
  lines.push('|---|---|');
  lines.push(`| Chinese | ${r.typography.CN_SIZE} px, weight ${r.typography.weightCn} |`);
  lines.push(`| English | ${r.typography.EN_SIZE} px, weight ${r.typography.weightEn}, floor ${r.typography.EN_FLOOR} px |`);
  lines.push(`| English max width | ${r.typography.EN_MAX_W} px |`);
  lines.push(`| Chinese wrap budget | ${r.typography.MAX} visual characters |`);
  lines.push(`| fadeTop / safeTop | ${r.BAND.fadeTop} |`);
  lines.push(`| fadeEnd | ${r.BAND.fadeEnd} |`);
  lines.push(`| cnY | ${r.BAND.cnY} |`);
  lines.push(`| enY | ${r.BAND.enY} |`);
  lines.push(`| fade extend | ${r.typography.fade.extend} |`);
  lines.push(`| fade stops | ${r.typography.fade.stops.map((s) => `${s.t}→${s.a}`).join(', ')} |`);
  lines.push(`| halo | stroke ${r.typography.halo.stroke}, blur ${r.typography.halo.blur}, shadow ${r.typography.halo.shadowAlpha}, stroke alpha ${r.typography.halo.strokeAlpha} |`);
  lines.push(`| xfade | ${r.xfade} |`);
  lines.push('');
  lines.push(`Picture safe-area top: **y=${r.pictureSafeTop}**. Scene art may extend down through y < ${r.pictureSafeTop}. This is the number to give mini.`);
  const peak = r.typography.fade.stops.reduce((a, s) => (s.a > a.a ? s : a), r.typography.fade.stops[0]);
  lines.push(`The backing is a soft scrim (${r.typography.fade.extend}) from y=${r.BAND.fadeTop}. Peak opacity ${peak.a} is at fadeEnd y=${r.BAND.fadeEnd}, just above the dense Chinese halo. It eases out instead of becoming a solid paper slab.`);
  lines.push(`Chinese baseline cnY=${r.BAND.cnY}. English baseline enY=${r.BAND.enY}. Ink and the halo stay at y ≥ ${r.pictureSafeTop}.`);
  lines.push('');
  lines.push('## Timing of the dry-run window');
  lines.push('');
  lines.push(`Content duration ${r.contentDuration} s (last cue ends ${r.lastCueEnd} s; the gap is a paper hold). Endcard ${r.endcardDuration} s. Expected total ${r.totalDurationExpected} s.`);
  lines.push('');
  lines.push('| id | ch | start | end | zh lines | en cards |');
  lines.push('|---|---|---:|---:|---:|---:|');
  for (const c of r.window) {
    lines.push(`| ${c.id} | ${c.ch} | ${c.start} | ${c.end} | ${c.lines.length} | ${c.cards.length} |`);
  }
  lines.push('');
  for (const c of r.window) {
    lines.push(`**${c.id}** ${c.text}`);
    lines.push('');
    for (const l of c.lines) lines.push(`- 中 ${l.start}–${l.end} ${l.text}`);
    for (const l of c.cards) lines.push(`- EN ${l.start}–${l.end} ${l.text}`);
    lines.push('');
  }
  lines.push('## English measure');
  lines.push('');
  lines.push(`Cards measured: ${r.english.cards}. Widest: ${r.english.widest ? `${r.english.widest.id} card ${r.english.widest.card} “${r.english.widest.text}” ${r.english.widest.width}px at ${r.english.widest.size}px` : 'n/a'}.`);
  const shrinkN = r.english.shrinks.length;
  const overflowN = (r.english.overflows || []).length;
  lines.push(`Shrinks below ${r.typography.EN_SIZE} px: ${shrinkN}. Overflows at the ${r.typography.EN_FLOOR} px floor: ${overflowN}.`);
  if (shrinkN === 0 && overflowN === 0) {
    lines.push(`Every English card fits at ${r.typography.EN_SIZE} px. None shrink below ${r.typography.EN_SIZE}, and none overflow at ${r.typography.EN_FLOOR} px.`);
  }
  if (r.english.shrinks.length) {
    for (const s of r.english.shrinks) lines.push(`- shrink ${s.id}: ${s.size}px ${s.width}px ${s.text}`);
  }
  if (r.english.overflows && r.english.overflows.length) {
    for (const s of r.english.overflows) lines.push(`- overflow ${s.id || s.i}: ${s.size}px ${s.width}px ${s.text}`);
  }
  lines.push('');
  lines.push('## Sample frames');
  lines.push('');
  lines.push(`- 帧_01_句01中点.png at t=${round3(r.stills.t1)} shows “${r.stills.state1 && r.stills.state1.cn}” / “${r.stills.state1 && r.stills.state1.en}”.`);
  lines.push(`- 帧_02_最长英文_s03.png at t=${round3(r.stills.t3)} shows “${r.stills.state3 && r.stills.state3.en}”.`);
  lines.push(`- 帧_03_片尾A_t3.png is endcard local t=3 (file time ≈ ${round3(r.stills.fileTime)} s), ${r.stills.endSize.w}×${r.stills.endSize.h}.`);
  lines.push('');
  lines.push(`Safe-area scan (non-paper pixels above y=${r.pictureSafeTop} fail; ink must exist at y≥${r.pictureSafeTop}):`);
  lines.push('');
  for (const ink of r.stills.inkReports) {
    lines.push(`- ${path.basename(ink.file)} ${ink.w}×${ink.h} above=${ink.above} minInkY=${ink.minInk} inkPixels=${ink.ink} ${ink.pass ? 'PASS' : 'FAIL'}`);
  }
  if (r.stills.overlayCheck) {
    lines.push(`- Overlay alpha: pixels above y=${r.pictureSafeTop} with alpha≠0: ${r.stills.overlayCheck.above}; opaque pixels in the band: ${r.stills.overlayCheck.opaque}.`);
  }
  const inkOk = r.stills.inkReports.every((ink) => ink.pass) && r.stills.overlayCheck && r.stills.overlayCheck.above === 0;
  lines.push('');
  lines.push(inkOk
    ? `Ink and halo stay at y ≥ ${r.pictureSafeTop}. Full-frame ink starts at or below the safe area, and the subtitle overlay has no alpha above it.`
    : `Ink or halo crossed y < ${r.pictureSafeTop}. See the scan above.`);
  lines.push('');
  if (r.stills.qaPaths) {
    lines.push('Comparison and phone preview:');
    lines.push('');
    const q = r.stills.qaPaths;
    const s = r.stills.qaSize || {};
    const m = r.stills.qaMeta || {};
    lines.push(`- ${q.compare}${s.compare ? ` (${s.compare.w}×${s.compare.h})` : ''}`);
    if (m.labels) lines.push(`  - ${m.labels.old}`);
    if (m.labels) lines.push(`  - ${m.labels.current}`);
    lines.push(`- ${q.phone}${s.phone ? ` (${s.phone.w}×${s.phone.h})` : ''} — 1920×1080 frame scaled to 390 px wide.`);
    if (q.strip) lines.push(`- ${q.strip}${s.strip ? ` (${s.strip.w}×${s.strip.h})` : ''} — subtitle band from y=${r.pictureSafeTop}, same scale.`);
    lines.push('');
  }
  lines.push('## Outputs');
  lines.push('');
  lines.push(`Scene: ${r.scene}.`);
  lines.push(`Master: ${r.files.master.file} ${r.files.master.size}, ${r.duration1080.toFixed(3)} s, ${r.video.width}×${r.video.height} ${r.video.pix_fmt} ${r.video.codec}, audio ${r.audio ? `${r.audio.codec} ${r.audio.sampleRate} Hz ${r.audio.channels} ch` : 'MISSING'}.`);
  lines.push(`720p: ${r.files.p720.file} ${r.files.p720.size}, ${r.duration720.toFixed(3)} s.`);
  if (r.files.blind) lines.push(`Blind: ${r.files.blind.file} ${r.files.blind.size}.`);
  lines.push('');
  lines.push('## Loudness');
  lines.push('');
  if (r.audioReport.loudnorm === 'skipped') {
    lines.push(r.audioReport.reason);
    lines.push('The programme is a valid silent stereo 48 kHz AAC stream.');
  } else {
    lines.push(`loudnorm ${r.audioReport.loudnorm}. Integrated ${r.audioReport.integratedLufs} LUFS, true peak ${r.audioReport.truePeak} dBTP. Target -14 LUFS, true peak ≤ -1 dBTP.`);
  }
  lines.push(`Voice file: ${r.audioReport.voice || 'none'}. Music file: ${r.audioReport.music || 'none (v4 music is not reused)'}.`);
  lines.push('');
  lines.push('## Blind review');
  lines.push('');
  lines.push(`Endcard files unchanged: ${r.endcardUntouched}. 【待填】 still present: ${r.pendingStill}.`);
  lines.push(`Blind result: ${r.blind.skipped ? 'skipped' : (r.blind.pass ? 'PASS' : 'FAIL')}.`);
  if (!r.blind.skipped) {
    lines.push(`Probe: ${r.blind.probe}`);
    lines.push(`Strings: ${r.blind.strings}`);
  }
  lines.push('');
  lines.push('## Blockers');
  lines.push('');
  if (!r.blockers.length) lines.push('None.');
  else for (const b of r.blockers) lines.push(`- ${b}`);
  lines.push('');
  lines.push('Intermediate PNG sequences live in `qa/tmp/` during the run and are deleted after a successful encode. The three sample frames are kept.');
  lines.push('');
  return lines.join('\n');
}

main().catch((err) => {
  console.error(err && err.stack || err);
  process.exit(1);
});
