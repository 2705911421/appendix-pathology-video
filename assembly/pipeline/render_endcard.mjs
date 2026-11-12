import { ffmpegPath, ffprobePath } from '../../tools/bin.mjs';
// Render the approved endcard to a 12 s 1080p30 mp4 without modifying endcard/.
// Loads endcard/index.html the same way endcard/render.mjs does.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { canvasPng, withPage } from './browser.mjs';

async function run(cmd, args) {
  cmd = cmd === 'ffmpeg' ? await ffmpegPath() : cmd === 'ffprobe' ? await ffprobePath() : cmd;
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(err) : reject(new Error(`${cmd} ${args.join(' ')}\n${err.slice(-2500)}`))));
  });
}

function endcardKey(t, timing) {
  const changing = (w) => t >= w[0] && t < w[1];
  if (changing(timing.aIn) || changing(timing.aOut) || changing(timing.bIn)) return `anim:${t.toFixed(4)}`;
  if (t < timing.aOut[0]) return 'holdA';
  return 'holdB';
}

async function linkOrCopy(src, dest) {
  try {
    await fs.link(src, dest);
  } catch {
    await fs.copyFile(src, dest);
  }
}

/**
 * @param {object} opts
 * @param {string} opts.endcardDir
 * @param {string} opts.frameDir  PNG sequence directory (f_00000.png ...)
 * @param {string} [opts.videoPath]  encoded mp4, if set
 * @param {number} [opts.fps]
 * @param {number} [opts.duration]
 * @param {{t:number,file:string}[]} [opts.stills]
 */
export async function renderEndcard(opts) {
  const fps = opts.fps || 30;
  const duration = opts.duration || 12;
  const frames = Math.round(duration * fps);
  const endcardDir = path.resolve(opts.endcardDir);
  const data = JSON.parse(await fs.readFile(path.join(endcardDir, 'data/endcard.json'), 'utf8'));
  const timing = data.timing;
  await fs.mkdir(opts.frameDir, { recursive: true });

  const runs = [];
  for (let i = 0; i < frames; i++) {
    const t = i / fps;
    const key = endcardKey(t, timing);
    const last = runs[runs.length - 1];
    if (last && last.key === key) last.count += 1;
    else runs.push({ key, t, index: i, count: 1 });
  }

  await withPage(endcardDir, 'http://endcard.local', async (page) => {
    let written = 0;
    for (const run of runs) {
      const png = await canvasPng(page, run.t, 'full');
      const first = path.join(opts.frameDir, `f_${String(written).padStart(5, '0')}.png`);
      await fs.writeFile(first, png);
      written += 1;
      for (let k = 1; k < run.count; k++) {
        const dest = path.join(opts.frameDir, `f_${String(written).padStart(5, '0')}.png`);
        await linkOrCopy(first, dest);
        written += 1;
      }
    }
    if (written !== frames) throw new Error(`endcard frames ${written} != ${frames}`);
    for (const still of opts.stills || []) {
      const png = await canvasPng(page, still.t, 'full');
      await fs.mkdir(path.dirname(still.file), { recursive: true });
      await fs.writeFile(still.file, png);
    }
  });

  if (opts.videoPath) {
    await fs.mkdir(path.dirname(opts.videoPath), { recursive: true });
    await run('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-framerate', String(fps), '-start_number', '0',
      '-i', path.join(opts.frameDir, 'f_%05d.png'),
      '-frames:v', String(frames),
      '-r', String(fps),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-preset', 'veryfast', '-crf', '14', '-bf', '0', '-g', String(fps),
      '-an', opts.videoPath,
    ]);
  }
  return { frames, runs: runs.length, fps, duration };
}
