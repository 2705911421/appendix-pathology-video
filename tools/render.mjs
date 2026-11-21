import {createReadStream} from 'node:fs';
import fs from 'node:fs/promises';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {spawn, execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const film = path.join(root, 'film');
const output = path.join(root, 'out');
const qa = path.join(root, 'qa');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const ffprobe = process.env.FFPROBE_PATH || 'ffprobe';
const command = process.argv[2] || 'samples';
const workers = Number(process.env.RENDER_WORKERS || 3);
if (!['samples', 'video', 'mux'].includes(command) || !Number.isInteger(workers) || workers < 1 || workers > 5) {
  throw Error('Use samples, video or mux. RENDER_WORKERS must be between 1 and 5.');
}
const timeline = JSON.parse(await fs.readFile(path.join(film, 'timeline.json'), 'utf8'));
const {fps, frames, cues, creditsFrame} = timeline;
const starts = [...cues.filter((cue, i) => !i || cue.act !== cues[i - 1].act).map(cue => cue.startFrame), creditsFrame, frames];
const parts = starts.slice(0, -1).map((start, i) => ({
  start, end: starts[i + 1], index: i + 1,
  file: path.join(output, 'picture', `act-${i + 1}.mp4`),
}));

await fs.mkdir(path.join(output, 'picture'), {recursive: true});
await fs.mkdir(qa, {recursive: true});

async function sourceSignature(directory, hash = createHash('sha256')) {
  const entries = await fs.readdir(directory, {withFileTypes: true});
  entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    hash.update(path.relative(film, file));
    if (entry.isDirectory()) await sourceSignature(file, hash);
    else hash.update(await fs.readFile(file));
  }
  return hash;
}
const signature = (await sourceSignature(film)).update(await fs.readFile(fileURLToPath(import.meta.url))).digest('hex');

async function currentPart(part) {
  const recorded = await fs.readFile(`${part.file}.sha256`, 'utf8').catch(() => '');
  return recorded === signature && framesIn(part.file) === part.end - part.start;
}

const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.png': 'image/png',
};

function serve() {
  const server = createServer(async (req, res) => {
    try {
      const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname.slice(1));
      if (requested === 'favicon.ico') return res.writeHead(204).end();
      const file = path.resolve(film, requested || 'index.html');
      if (!file.startsWith(film + path.sep) || !(await fs.stat(file)).isFile()) return res.writeHead(404).end();
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
      createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404).end();
    }
  });
  server.listen(0, '127.0.0.1');
  return server;
}

function run(args, input = false) {
  const process = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-xerror', '-y', ...args], {
    stdio: [input ? 'pipe' : 'ignore', 'ignore', 'inherit'], windowsHide: true,
  });
  const complete = once(process, 'close').then(([code]) => {
    if (code !== 0) throw Error(`FFmpeg exited with code ${code}`);
  });
  complete.catch(() => {});
  process.stdin?.on('error', () => {});
  return {process, complete};
}

function framesIn(file) {
  try {
    const values = JSON.parse(execFileSync(ffprobe, ['-v','error','-select_streams','v:0',
      '-show_entries','stream=width,height,nb_frames,r_frame_rate','-of','json',file], {encoding:'utf8', stdio:['ignore','pipe','ignore']}));
    const stream = values.streams[0];
    return stream.width === 1920 && stream.height === 1080 && stream.r_frame_rate === `${fps}/1` ? +stream.nb_frames : 0;
  } catch { return 0; }
}

async function open(browser, url) {
  const page = await browser.newPage({viewport: {width: 1920, height: 1080}, deviceScaleFactor: 1});
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('response', reply => { if (reply.status() >= 400) errors.push(reply.url()); });
  await page.goto(url);
  try {
    await page.waitForFunction(() => window.ready === true, null, {timeout: 60_000});
  } catch (error) {
    await page.close();
    throw Error(errors.join('\n') || error.message);
  }
  if (errors.length) throw Error(errors.join('\n'));
  return {page, errors};
}

async function samples(browser, url) {
  const {page, errors} = await open(browser, url);
  try {
    const shots = cues.filter((cue, i) => !i || cue.shot !== cues[i - 1].shot || cue.act !== cues[i - 1].act);
    const capture = [
      ...shots.map(cue => ({name: `${cue.act}-${cue.shot}`, frame: cue.startFrame + Math.floor(cue.audioFrames * .68)})),
      {name: '7-credits', frame: creditsFrame + 20},
      ...[48,64,76,152,184,204,208,212,220,224,288,293,294,299].map(seconds=>({name:'refine-'+seconds,frame:seconds*fps})),
      ...cues.filter(cue=>/(McBurney's|guideline's|Don't)/u.test(cue.en)).map((cue,index)=>({
        name:'apostrophe-'+(index+1),frame:cue.startFrame+Math.round(cue.audioFrames/2),
      })),
    ];
    const metrics = await page.evaluate(() => window.checks);
    if (metrics.simpleMuscle.length !== 4 || metrics.subtitleMetrics.length !== cues.length) throw Error('Missing canvas annotations');
    const determinism = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      window.render(99.7); const first = c.toDataURL('image/png');
      window.render(219); window.render(99.7);
      return first === c.toDataURL('image/png');
    });
    if (!determinism) throw Error('Canvas frame depends on previous seek order');
    await page.evaluate(starts => {
      const {fps,frames} = window.checks.timeline;
      for (const start of starts) {
        for (let offset=-1;offset<=36;offset++) window.render(Math.min(frames-1,Math.max(0,start+offset))/fps);
      }
    }, [...shots.map(cue=>cue.startFrame),creditsFrame]);
    const storyChecks = await page.evaluate(() => {
      const {cues, fps, creditsFrame} = window.checks.timeline;
      const target = (shot, delay) => {
        const cue = cues.find(item=>item.shot===shot);
        return window.inspectFrame(cue.startFrame/fps+delay);
      };
      const focus = ['ct0','ct1','ct2'].map(shot=>target(shot,1.2).colors.lights);
      const overview = target('ctOverview',1).colors;
      const overviewCue = cues.find(cue=>cue.shot==='ctOverview');
      const overviewFrames = overviewCue.endFrame - overviewCue.startFrame;
      const timedCuts = Object.fromEntries(['alarm','rupture','ctOverview','ct0']
        .map(shot=>[shot,cues.find(cue=>cue.shot===shot).startFrame/fps]));
      const chronic = target('fibrosis',2).colors;
      const recap = [.7,1.5,2.4,3.5].map(seconds=>target('recover',seconds).colors.lights);
      const closing = window.inspectFrame(creditsFrame/fps+.7);
      return {focus,overview,overviewFrames,timedCuts,chronic,recap,endingHasSidebar:closing.colors!==null};
    });
    for (const [i,weights] of storyChecks.focus.entries()) {
      if (weights[i+1] < .9 || weights.some((w,j)=>j!==i+1 && w>.05)) throw Error('CT colors are not synchronized');
    }
    if (storyChecks.overviewFrames !== 90 || storyChecks.overview.lights.slice(1).some(w=>w<.2) || !storyChecks.chronic.grey ||
        storyChecks.chronic.lights.some(Boolean) || storyChecks.endingHasSidebar) throw Error('Sidebar state failed');
    const annotation = await page.evaluate(extra => {
      const fps = window.checks.timeline.fps;
      const times = new Set(extra.map(frame=>frame/fps));
      for (let second=0;second<window.checks.timeline.frames/fps;second++) times.add(second);
      let minSize = Infinity, count = 0;
      const problems = [];
      for (const second of times) {
        for (const item of window.inspectAnnotations(second)) {
          const {size,luminance,contrastLimit,surface,inkBounds:[left,top,right,bottom]} = item;
          minSize = Math.min(minSize,size);
          count++;
          if (size<24 || surface==='paper' && luminance>contrastLimit ||
              left<0 || right>1920 || top<0 || bottom>(second>=window.checks.timeline.creditsFrame/fps?1080:912)) {
            problems.push({second,...item});
          }
        }
      }
      return {count,minSize,frames:times.size,problems};
    }, [...capture.map(sample=>sample.frame),...shots.flatMap(cue=>[cue.startFrame,cue.startFrame+12])]);
    if (annotation.problems.length) throw Error(`Canvas label failed: ${JSON.stringify(annotation.problems.slice(0,5))}`);
    await fs.writeFile(path.join(qa, 'canvas.json'), JSON.stringify({subtitleMetrics: metrics.subtitleMetrics,
      simpleMuscle: metrics.simpleMuscle, deterministicSeek: determinism, storyChecks, annotation, sampleFrames: capture}, null, 2));
    for (const {name, frame} of capture) {
      await page.evaluate(time => window.render(time), frame / fps);
      await page.locator('#frame').screenshot({type: 'jpeg', quality: 91, path: path.join(qa, `${name}.jpg`)});
    }
    if (errors.length) throw Error(errors.join('\n'));
    console.log(`${capture.length} storyboard frames and canvas metrics ready`);
  } finally { await page.close(); }
}

async function renderPart({page, errors}, part) {
  const count = part.end - part.start;
  const temp = part.file.replace(/\.mp4$/, '.partial.mp4');
  const encoder = run(['-f','image2pipe','-c:v','mjpeg','-framerate',String(fps),'-i','-',
    '-an','-c:v','libx264','-threads','2','-preset','veryfast','-crf','16',
    '-vf','scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv',
    '-map_metadata','-1','-fflags','+bitexact',temp], true);
  console.log(`Act ${part.index}: ${count} frames`);
  try {
    for (let offset = 0; offset < count; offset += 12) {
      const n = Math.min(12, count - offset);
      const images = await page.evaluate(({start, n, fps}) => {
        const canvas = document.querySelector('#frame');
        const result = [];
        for (let i = 0; i < n; i++) {
          window.render((start+i)/fps);
          result.push(canvas.toDataURL('image/jpeg', .96).split(',')[1]);
        }
        return result;
      }, {start:part.start+offset,n,fps});
      const buffer = Buffer.concat(images.map(image=>Buffer.from(image,'base64')));
      await new Promise((resolve, reject) => encoder.process.stdin.write(buffer, error => error ? reject(error) : resolve()));
      if ((offset + 12) % 360 === 0) console.log(`Act ${part.index}: ${offset + 12}/${count}`);
    }
    encoder.process.stdin.end();
    await encoder.complete;
    if (errors.length) throw Error(errors.join('\n'));
    if (framesIn(temp) !== count) throw Error(`Act ${part.index} frame count mismatch`);
    await fs.rename(temp, part.file);
    await fs.writeFile(`${part.file}.sha256`, signature);
    console.log(`Act ${part.index}: finished`);
  } finally {
    if (encoder.process.exitCode === null) encoder.process.kill();
  }
}

async function video(browser, url) {
  const valid = await Promise.all(parts.map(currentPart));
  const pending = parts.filter((_, i) => !valid[i]);
  await Promise.all(Array.from({length: Math.min(workers, pending.length)}, async () => {
    const session = await open(browser, url);
    try {
      for (let part = pending.shift(); part; part = pending.shift()) await renderPart(session, part);
    } finally { await session.page.close(); }
  }));
}

async function mux() {
  for (const part of parts) if (!await currentPart(part)) throw Error(`Missing or stale act ${part.index}`);
  const list = path.join(output, 'picture', 'acts.txt');
  await fs.writeFile(list, parts.map(p => `file '${path.basename(p.file)}'`).join('\n') + '\n');
  const temp = path.join(output, 'submission.partial.mp4');
  const result = path.join(output, 'submission.mp4');
  const audio = path.join(root, 'audio', 'mix.wav');
  const ff = run(['-f','concat','-safe','1','-i',list,'-i',audio,
    '-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-flags:a','+bitexact',
    '-map_chapters','-1','-map_metadata','-1','-map_metadata:s:v:0','-1','-map_metadata:s:a:0','-1',
    '-metadata:s:v:0','handler_name=','-metadata:s:a:0','handler_name=','-metadata:s:v:0','encoder=',
    '-fflags','+bitexact','-movflags','+faststart',temp]);
  await ff.complete;
  if (framesIn(temp) !== frames) throw Error('Output frame count mismatch');
  await fs.rename(temp, result);
  console.log(result);
}

if (command !== 'mux') {
  const server = serve();
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH || undefined,
      channel: process.env.CHROME_PATH ? undefined : 'chrome',
      headless: true,
      args: ['--use-angle=' + (process.platform === 'win32' ? 'd3d11' : 'swiftshader'),
        '--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--force-color-profile=srgb'],
    });
    if (command === 'samples') await samples(browser, url);
    else await video(browser, url);
  } finally {
    await browser?.close();
    server.close();
  }
}
if (command !== 'samples') await mux();
