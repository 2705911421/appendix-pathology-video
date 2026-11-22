import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { access, mkdtemp, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { assertBlindReviewText } from '../shared/canvasCore.js';
import { sceneFades, sheet } from './src/cue-sheet.js';

const section = await realpath(fileURLToPath(new URL('.', import.meta.url)));
const source = path.join(section, 'src');
const shared = path.resolve(section, '../shared');
const output = path.join(section, 'out');
const inspect = process.argv.includes('--inspect');
const recordPreserved = process.argv.includes('--record-preserved');
const preservationFile = path.join(section, '.preserved-pixels.json');
const viewWidth = 960;
const viewHeight = 540;
const fps = 12;
const total = Math.round(sheet.duration * fps);
const run = promisify(execFile);
const seek = (cue, progress) => cue.start + (cue.end - cue.start) * progress;
const timeOf = (id, p) => seek(sheet.cues.find(cue => cue.id === id), p);
assert.equal(sheet.duration, 47);
assert.equal(sheet.cues.at(-1).defaultDuration, 8);
assert.equal(total, 564);

const sourceFiles = (await readdir(source)).filter(file => /\.(?:js|html)$/u.test(file));
const sceneText = (await Promise.all(sourceFiles.map(file => readFile(path.join(source, file), 'utf8')))).join('\n');
const staticRefs = /\.(?:png|jpe?g|webp|avif|gif)\b|data\s*:\s*image|base64|<(?:img|image)\b|new\s+Image\s*\(|\bloadImage\s*\(/giu;
const speechCalls = /SpeechSynthesisUtterance\s*\(|speechSynthesis\s*\.|\b(?:synthesizeSpeech|textToSpeech)\s*\(/gu;
assert.equal([...sceneText.matchAll(staticRefs)].length, 0);
assert.equal([...sceneText.matchAll(speechCalls)].length, 0);
console.log('PASS 1 | static image and embedded bitmap references: 0 | speech synthesis calls: 0');

const launchScripts = (await readdir(section)).filter(file => file.endsWith('.mjs'));
const allText = sceneText + (await Promise.all(launchScripts.map(file => readFile(path.join(section, file), 'utf8')))).join('\n');
const crossSection = /style[_]probe|s1[.]0[\\/]|s1[.]1-(?:[1-5]|[7-9]|[1-9][0-9]+)\b/giu;
assert.equal([...allText.matchAll(crossSection)].length, 0);
const sharedEntries = new Set(['canvasCore.js', 'timelineHelper.js', 'leftFloatNotes.js', 'anatomyWatercolor.js',
  'histologyProcedural.js', 'minimalistCharacters.js', 'references.js']);
const usedEntries = [...allText.matchAll(/['"](?:\.\.\/)+shared\/([^'"]+)['"]/gu)].map(([, file]) => file);
assert.ok(usedEntries.every(file => sharedEntries.has(file)));
console.log('PASS 2 | cross-section references: 0 | shared imports limited to frozen entry points');
const brushCalls = [...sceneText.matchAll(/\bbrush\.[a-z]+\s*\(/giu)].length;
const strokeCalls = [...sceneText.matchAll(/\bgetStroke\s*\(/gu)].length;
assert.ok(brushCalls > 0 && strokeCalls > 0);

let missingReferences = false;
try {
  await access(path.join(shared, 'references.js'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  missingReferences = true;
}
const { outputFiles } = await build({
  entryPoints: [path.join(source, 'main.js')], bundle: true, write: false,
  format: 'esm', platform: 'browser', target: 'chrome120', logLevel: 'warning',
  define: { IS_MINIFIED: 'true' },
  plugins: [{
    name: 'offline-section-runtime',
    setup(builder) {
      builder.onResolve({ filter: /^\.\/detail\/watercolor\.js$/ }, args => {
        if (path.relative(shared, args.resolveDir) === '') {
          return { path: path.join(source, 'brush-canvases.js') };
        }
      });
      builder.onResolve({ filter: /\/shared\/references\.js$/ }, args => {
        if (missingReferences && path.relative(source, args.resolveDir) === '') {
          return { path: 'references', namespace: 'local-references' };
        }
      });
      builder.onLoad({ filter: /^references$/, namespace: 'local-references' }, () => ({
        contents: 'export const REFERENCES = [];', loader: 'js',
      }));
    },
  }],
});

const routes = new Map([
  ['/', ['text/html; charset=utf-8', await readFile(path.join(source, 'index.html'))]],
  ['/section.js', ['text/javascript; charset=utf-8', outputFiles[0].contents]],
  ['/en-US.json', ['application/json; charset=utf-8', '{"language":"en-US"}']],
]);
const server = createServer((request, response) => {
  const route = routes.get(request.url);
  if (route) return response.writeHead(200, { 'Content-Type': route[0] }).end(route[1]);
  return response.writeHead(request.url === '/favicon.ico' ? 204 : 404).end();
});
const scratch = await mkdtemp(path.join(section, '.preview12-'));
process.env.TEMP = scratch;
process.env.TMP = scratch;
let context;
let encoder;
let encoderDone;

try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const executablePath = process.env.CHROME_PATH;
  context = await chromium.launchPersistentContext(path.join(scratch, 'browser'), {
    channel: executablePath ? undefined : 'chrome',
    executablePath,
    headless: true,
    viewport: { width: sheet.width, height: sheet.height },
    deviceScaleFactor: 1,
    locale: 'en-US',
    downloadsPath: scratch,
    acceptDownloads: false,
    args: ['--force-color-profile=srgb', '--disable-partial-raster', '--disable-lcd-text',
      '--disable-gpu-compositing', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
  });
  const blocked = [];
  await context.route('**/*', route => {
    const request = route.request();
    if (request.resourceType() === 'image' || !request.url().startsWith(`${origin}/`)) {
      blocked.push(request.url());
      return route.abort();
    }
    return route.continue();
  });
  await context.addInitScript(() => {
    window.creditsWritten = [];
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (line, x, y, ...rest) {
      if (this.canvas.classList.contains('review-credit')) {
        window.creditsWritten.push({ line, x, y, shadow: this.shadowBlur, opacity: this.globalAlpha });
      }
      return fill.call(this, line, x, y, ...rest);
    };
  });
  const [page] = context.pages();
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error(error.message);
  });
  await page.goto(origin, { waitUntil: 'commit' });
  try {
    await page.waitForFunction(() => typeof window.renderAt === 'function', null, { polling: 200, timeout: 150_000 });
  } catch (error) {
    throw new Error(errors.join('\n') || error.message);
  }
  const cdp = await context.newCDPSession(page);
  const liveCanvases = await page.locator('foreignObject canvas').count();
  assert.ok(liveCanvases > 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(blocked, []);
  console.log(`PASS 3 | brush calls: ${brushCalls} | getStroke calls: ${strokeCalls} | live canvas layers: ${liveCanvases}`);

  async function capture(t) {
    await page.evaluate(async time => {
      window.creditsWritten.length = 0;
      window.renderAt(time);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, t);
    assert.deepEqual(errors, []);
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png', fromSurface: true, optimizeForSpeed: true,
      clip: { x: 0, y: 0, width: sheet.width, height: sheet.height, scale: .5 },
      captureBeyondViewport: false,
    });
    return Buffer.from(data, 'base64');
  }

  async function pixelMD5(buffer) {
    const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual([info.width, info.height], [viewWidth, viewHeight]);
    return createHash('md5').update(data).digest('hex');
  }

  async function preservedPixels() {
    const regions = [
      ['S23', .13], ['S23', .63], ['S23', .83],
      ['S24', .25], ['S24', .60], ['S24', .82], ['S24', .95],
      ['S26', .16], ['S26', .60],
    ];
    const hashes = {};
    for (const [id, p] of regions) {
      const frame = await capture(timeOf(id, p));
      const pixels = id === 'S24'
        ? await sharp(frame).extract({ left: 560, top: 92, width: 370, height: 253 }).removeAlpha().raw().toBuffer()
        : await sharp(frame).removeAlpha().raw().toBuffer();
      hashes[`${id}@${p}`] = createHash('md5').update(pixels).digest('hex');
    }
    return hashes;
  }

  if (recordPreserved) {
    const hashes = await preservedPixels();
    await writeFile(preservationFile, `${JSON.stringify(hashes, null, 2)}\n`);
    console.log(`PRESERVED BASELINE | ${Object.keys(hashes).length} frame regions`);
  } else {
    const baseline = await readFile(preservationFile, 'utf8').catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return '';
    });
    if (baseline) {
      assert.deepEqual(await preservedPixels(), JSON.parse(baseline), 'Previously approved pixels changed');
      console.log('PASS preservation | S23, S24 board, and S26 steady plate | 9/9 regions pixel-identical');
    }
  }

  const sampleTimes = [timeOf('S23', .63), timeOf('S25', .66)];
  const initial = new Map();
  for (const t of sampleTimes) initial.set(t, await pixelMD5(await capture(t)));
  for (const t of sampleTimes.toReversed()) {
    const again = await pixelMD5(await capture(t));
    assert.equal(initial.get(t), again);
    console.log(`  t=${t.toFixed(3)} s | ${initial.get(t)} == ${again}`);
  }
  console.log('PASS 4 | 2/2 repeated pixel MD5 matches');

  if (!recordPreserved) {
    const luma = await page.evaluate(time => {
      window.renderAt(time);
      const canvas = document.querySelector('#s24-histology-field canvas');
      const { width, height } = canvas;
      const r = Math.min(width, height) / 2;
      const rgba = canvas.getContext('2d').getImageData(0, 0, width, height).data;
      let sum = 0;
      let count = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if ((x + .5 - r) ** 2 + (y + .5 - r) ** 2 >= (r - 1) ** 2) continue;
          const i = (y * width + x) * 4;
          sum += .2126 * rgba[i] + .7152 * rgba[i + 1] + .0722 * rgba[i + 2];
          count++;
        }
      }
      return sum / count;
    }, timeOf('S24', .76));
    console.log(`chronic H&E | L_mean = ${luma.toFixed(2)} / 255 (Rec.709, circular field)`);
    assert.ok(luma >= 200 && luma <= 226, 'Chronic histology outside approved luminance range');

    const transition = await page.evaluate(({ start, midway, finish, blank, rise, full }) => {
      const stageOpacity = time => {
        window.renderAt(time);
        return Number(getComputedStyle(document.querySelector('.story-paint')).opacity);
      };
      const creditOpacity = time => {
        window.creditsWritten.length = 0;
        window.renderAt(time);
        return window.creditsWritten[0].opacity;
      };
      const character = document.querySelector('#s25-minimal-patient canvas');
      const ctx = character.getContext('2d');
      const fullScene = stageOpacity(start);
      const outsideAlpha = [...ctx.getImageData(0, 0, 1, 1).data].at(-1);
      return [fullScene, stageOpacity(midway), stageOpacity(finish), creditOpacity(blank),
        creditOpacity(rise), creditOpacity(full), outsideAlpha];
    }, {
      start: timeOf('S25', sceneFades.homecomingStart),
      midway: timeOf('S25', .96), finish: timeOf('S25', .9995),
      blank: timeOf('S26', 0), rise: timeOf('S26', .04), full: timeOf('S26', sceneFades.creditsEnd),
    });
    assert.deepEqual(transition.slice(0, 2), [1, .5]);
    assert.ok(transition[2] < .001);
    assert.deepEqual(transition.slice(3), [0, .5, 1, 0]);
    console.log('PASS transition | S25 fade 0.92–1.00 | S26 fade 0.00–0.08 | transparent character artwork');
  }

  const animation = await page.evaluate(times => {
    const number = (selector, attribute) => Number(document.querySelector(selector).getAttribute(attribute));
    const chapter = times.map(time => {
      window.renderAt(time);
      const id = document.querySelector('#plate').dataset.cue;
      const frame = document.querySelector('.story-paint');
      return {
        id, fade: Number(getComputedStyle(frame).opacity),
        first: number('#s24-rule-1', 'opacity'), second: number('#s24-rule-2', 'opacity'),
        light: number('#s25-light', 'opacity'),
        cut: number('#s23-cross-section', 'opacity'),
        trace: number('#s25-underline-trace', 'stroke-dashoffset'),
        neutral: [...document.querySelectorAll('.chronic-swatches')].every(node => Number(node.getAttribute('opacity')) === .25),
        debug: /\bS\d{1,3}\s*@\s*(?:p|t)\s*=/iu.test(document.body.innerText),
      };
    });
    return chapter;
  }, [timeOf('S23', .44), timeOf('S23', .83), timeOf('S24', .36), timeOf('S24', .62),
    timeOf('S24', .81), timeOf('S24', .99), timeOf('S25', .60), timeOf('S25', .9995)]);
  assert.ok(animation.every(frame => frame.neutral && !frame.debug));
  assert.equal(animation[0].cut, 0);
  assert.equal(animation[1].cut, 1);
  assert.deepEqual([animation[2].first, animation[2].second], [1, .72]);
  assert.ok(animation[3].first > .72 && animation[3].second > .72);
  assert.deepEqual([animation[4].first, animation[4].second], [.72, 1]);
  assert.ok(animation[5].fade < .04 && animation[7].fade < .001);
  assert.ok(animation[6].light <= .07 && animation[6].trace < .03);

  const creditTime = timeOf('S26', .60);
  const stableCredits = await capture(creditTime);
  const credits = await page.evaluate(() => {
    const canvas = document.querySelector('.review-credit');
    return {
      rows: window.creditsWritten,
      references: canvas.dataset.references,
      clear: [...canvas.parentElement.children].filter(node => node !== canvas)
        .every(node => getComputedStyle(node).display === 'none'),
    };
  });
  assert.ok(credits.clear);
  assert.equal(credits.references, missingReferences ? 'fallback' : 'shared');
  assert.ok(credits.rows.length >= 10);
  assert.equal(new Set(credits.rows.map(({ line }) => line)).size, credits.rows.length);
  assert.ok(credits.rows.every(({ x, y, shadow, opacity }) =>
    Number.isInteger(x) && Number.isInteger(y) && shadow === 0 && opacity === 1));
  const creditsText = credits.rows.map(row => row.line).join('').normalize('NFKC').replace(/[\s\p{Cf}]/gu, '');
  const identity = /\u59d3\u540d|\u5b66\u53f7|\u4e09\u5ce1\u5927\u5b66|\u533b\u5b66\u9662|\u73ed\u7ea7|\u6307\u5bfc\u6559(?:\u5e08|\u6388)|\u6307\u5bfc\u8001\u5e08|\[\u5f85\u586b\]|\u3010\u5f85\u586b\u3011/gu;
  assert.equal([...creditsText.matchAll(identity)].length, 0);
  assertBlindReviewText(creditsText);
  assert.equal(await pixelMD5(stableCredits), await pixelMD5(await capture(timeOf('S26', .94))));
  console.log(`PASS 5 | blind-review identity matches: 0 | ${credits.rows.length} unique, integer-position text draws | references: ${credits.references}`);
  assert.deepEqual(blocked, []);

  if (recordPreserved) {
    // A preservation capture is an audit only.
  } else if (inspect) {
    const previewTimes = [['S23', .29], ['S23', .83], ['S24', .20], ['S24', .74], ['S25', .76], ['S26', .60]];
    const tiles = [];
    for (const [i, [id, progress]] of previewTimes.entries()) {
      const input = await sharp(await capture(timeOf(id, progress))).resize(640, 360).png().toBuffer();
      tiles.push({ input, left: i % 2 * 640, top: Math.floor(i / 2) * 360 });
    }
    const proof = path.join(section, '.preview-inspect.png');
    await sharp({ create: { width: 1280, height: 1080, channels: 3, background: '#F5F1E9' } })
      .composite(tiles).png().toFile(proof);
    console.log(`INSPECTION ${proof}`);
  } else {
    const temporary = path.join(scratch, 'preview.mp4');
    let log = '';
    let pipeError;
    encoder = spawn(process.env.FFMPEG_PATH || 'ffmpeg', [
      '-hide_banner', '-loglevel', 'warning', '-nostdin', '-f', 'image2pipe', '-framerate', String(fps),
      '-c:v', 'png', '-i', 'pipe:0', '-map', '0:v:0', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-crf', '26', '-preset', 'veryfast', '-an', '-threads:v', '3', '-movflags', '+faststart', temporary,
    ], { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
    encoder.stderr.on('data', chunk => { log = (log + chunk.toString()).slice(-16000); });
    encoder.stdin.on('error', error => { pipeError = error; });
    encoderDone = new Promise(resolve => {
      encoder.once('error', error => resolve({ error }));
      encoder.once('close', (code, signal) => resolve({ code, signal }));
    });
    const hold = timeOf('S26', sceneFades.creditsEnd);
    function nextAt(frame) {
      return (frame / fps >= hold ? Promise.resolve(stableCredits) : capture(frame / fps))
        .then(buffer => ({ buffer }), error => ({ error }));
    }
    let pending = nextAt(0);
    for (let frame = 0; frame < total; frame++) {
      const { buffer, error } = await pending;
      if (error || pipeError) throw error ?? pipeError;
      if (frame + 1 < total) pending = nextAt(frame + 1);
      await new Promise((resolve, reject) => encoder.stdin.write(buffer, error => error ? reject(error) : resolve()));
      if ((frame + 1) % 120 === 0 || frame + 1 === total) console.log(`STREAM ${frame + 1}/${total}`);
    }
    encoder.stdin.end();
    const result = await encoderDone;
    if (result.error || result.code !== 0) {
      throw new Error(`FFmpeg failed | ${result.error?.message ?? result.code ?? result.signal}\n${log}`);
    }
    assert.deepEqual(blocked, []);

    const { stdout, stderr } = await run(process.env.FFPROBE_PATH || 'ffprobe', [
      '-v', 'error', '-count_frames', '-show_entries',
      'stream=codec_type,codec_name,width,height,avg_frame_rate,nb_read_frames,duration:format=duration,size',
      '-of', 'json', temporary,
    ], { windowsHide: true });
    assert.equal(stderr.trim(), '');
    const { streams, format } = JSON.parse(stdout);
    assert.equal(streams.length, 1);
    const [video] = streams;
    assert.deepEqual([video.codec_type, video.codec_name, video.width, video.height,
      video.avg_frame_rate, Number(video.nb_read_frames), Number(video.duration)],
    ['video', 'h264', viewWidth, viewHeight, '12/1', total, sheet.duration]);
    assert.equal(Number(format.duration), sheet.duration);
    assert.ok(Number(format.size) < 3_000_000, `Preview over 3 MB: ${format.size} bytes`);
    const cuePath = path.join(output, `cues_${sheet.module}.json`);
    const cueText = `${JSON.stringify(sheet, null, 2)}\n`;
    const existing = await readFile(cuePath, 'utf8').catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return '';
    });
    if (existing !== cueText) await writeFile(cuePath, cueText);
    const finalPath = path.join(output, `preview_${sheet.module}_12fps.mp4`);
    await rename(temporary, finalPath);
    console.log(`PREVIEW ${finalPath} | ${viewWidth}x${viewHeight} @ ${fps} | ${total} frames | ${format.duration} s | ${format.size} bytes | audio streams: 0`);
  }
} finally {
  if (encoder && encoder.exitCode === null && encoder.signalCode === null) {
    encoder.stdin.destroy();
    encoder.kill();
    await encoderDone;
  }
  try {
    await context?.close();
  } finally {
    server.close();
    const resolved = await realpath(scratch);
    assert.equal(path.dirname(resolved), section);
    assert.ok(path.basename(resolved).startsWith('.preview12-'));
    await rm(resolved, { force: true, recursive: true, maxRetries: 5, retryDelay: 180 });
    console.log('CLEANUP | temporary frame directories: 0');
  }
}
