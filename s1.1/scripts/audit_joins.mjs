import { execFile } from 'node:child_process';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { getRenderProfile } from '../shared/renderProfile.js';
import { hasExternalVoices, planSections } from './build_master_all.mjs';
import { readCueSheets } from './export_tts_sheet.mjs';
import { project } from './render_master_sections.mjs';

const exec = promisify(execFile);
const profile = getRenderProfile('review');
const output = path.join(project, 'out');
const video = path.join(output, 'review_s1.1_480p_12fps.mp4');
const target = path.join(output, 'joins_audit_s1.1.png');
const offsets = [-1, -.10, .10, 1];
const tile = { width: 427, height: 240, channels: 3 };
const gutter = 14;
const stride = tile.width * tile.height * tile.channels;
const rowHeight = tile.height + 66;
const header = 80;
const center = column => gutter + column * (tile.width + gutter) + tile.width / 2;

function timecode(frame) {
  const ms = Math.round(frame * 1000 / profile.fps);
  return `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms % 60000 / 1000)).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}

async function activeSections() {
  const source = await readCueSheets();
  const voice = await hasExternalVoices(source.cues);
  const timeline = voice ? JSON.parse(await readFile(path.join(output, 'master_timeline.json'), 'utf8')) : undefined;
  return planSections(source, timeline, profile);
}

async function inspectVideo(frameCount) {
  const { stdout } = await exec('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,nb_frames,avg_frame_rate', '-of', 'json', video], { windowsHide: true });
  const [stream] = JSON.parse(stdout).streams;
  if (stream?.width !== profile.outputWidth || stream.height !== profile.outputHeight
    || stream.avg_frame_rate !== `${profile.fps}/1` || Number(stream.nb_frames) !== frameCount) {
    throw new Error('审片文件与当前分镜不匹配');
  }
}

async function assembleAudit(sections) {
  const strips = sections.slice(0, -1).map((section, i) => {
    const cut = section.endFrame;
    const from = section.sheet.cues.at(-1).id;
    const to = sections[i + 1].sheet.cues[0].id;
    return { cut, from, to, frames: offsets.map(offset => cut + Math.round(offset * profile.fps)) };
  });
  const frames = strips.flatMap(strip => strip.frames);
  const total = sections.at(-1).endFrame;
  if (frames.some((frame, i) => frame < 0 || frame >= total || (i && frame <= frames[i - 1]))) {
    throw new Error('接缝抽帧时间不在有效顺序内');
  }
  const select = frames.map(frame => `eq(n\\,${frame})`).join('+');
  const { stdout: raw } = await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-i', video,
    '-an', '-vf', `select=${select},scale=${tile.width}:${tile.height}:flags=lanczos`, '-fps_mode', 'passthrough',
    '-frames:v', String(frames.length), '-threads', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
  { windowsHide: true, encoding: 'buffer', maxBuffer: frames.length * stride + 65536 });
  if (raw.length !== frames.length * stride) throw new Error('审片抽帧数量有误');

  const width = gutter + offsets.length * (tile.width + gutter);
  const height = header + strips.length * rowHeight + 8;
  const labels = strips.map(({ cut, from, to, frames }, row) => {
    const top = header + row * rowHeight;
    return `<text x="${gutter}" y="${top + 21}" fill="#8C4030" font-size="19" font-weight="700">0${row + 1}  ${from} → ${to}  /  ${timecode(cut)}</text>`
      + frames.map((frame, col) => `<text x="${center(col)}" y="${top + 294}" text-anchor="middle" font-size="17">${timecode(frame)}</text>`).join('');
  }).join('');
  const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <g fill="#302821" font-family="Segoe UI, Microsoft YaHei, Arial, sans-serif">
      <text x="${gutter}" y="35" font-size="27" font-weight="700">s1.1  ·  Scene joins</text>
      ${offsets.map((offset, i) => `<text x="${center(i)}" y="65" text-anchor="middle" font-size="17">${offset < 0 ? '−' : '+'}${Math.abs(offset).toFixed(2)} s</text>`).join('')}
      ${labels}
    </g></svg>`);
  const tiles = frames.map((_, i) => ({
    input: raw.subarray(i * stride, (i + 1) * stride), raw: tile,
    left: gutter + (i % offsets.length) * (tile.width + gutter),
    top: header + Math.floor(i / offsets.length) * rowHeight + 30,
  }));
  const sheet = await sharp({ create: { width, height, channels: 3, background: '#F5F1E9' } })
    .composite([...tiles, { input: text, top: 0, left: 0 }]).png().toBuffer();
  const temporary = `${target}.${process.pid}.tmp`;
  try {
    await writeFile(temporary, sheet, { flag: 'wx' });
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
  for (const { cut, from, to, frames } of strips) {
    console.log(`${from} → ${to} ${timecode(cut)} | ${frames.map(timecode).join(' / ')}`);
  }
  console.log(target);
}

try {
  const sections = await activeSections();
  await inspectVideo(sections.at(-1).endFrame);
  await assembleAudit(sections);
} catch (error) {
  console.error(error.stderr?.trim() || error.message);
  process.exitCode = 1;
}
