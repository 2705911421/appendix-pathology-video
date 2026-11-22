import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { masterHeight, masterWidth, renderProfile as profile } from '../shared/renderProfile.js';

export const project = fileURLToPath(new URL('../', import.meta.url));
const shared = path.join(project, 'shared');
const stages = [
  ['index.html', 'src/scene.js', '/scene.js', 'src/watercolorCanvas.js'],
  ['index.html', 'src/scene.js', '/scene.js'],
  ['index.html', 'main.mjs', '/act.js'],
  ['gate1.html', 'gate1.mjs', '/gate1.js', 'src/procedural-washes.mjs'],
  ['src/index.html', 'src/main.js', '/act.js', 'src/live-watercolor.js'],
  ['src/index.html', 'src/main.js', '/section.js', 'src/brush-canvases.js'],
];

export function frameBoundary(seconds) {
  // Quantize cumulative cut positions, so up to one frame is added across the whole film.
  return Math.ceil(seconds * profile.fps - 1e-8);
}

async function host(section) {
  const directory = path.join(project, section.sheet.module);
  const [htmlFile, entry, route, adapter] = stages[section.index];
  const [html, bundle] = await Promise.all([
    readFile(path.join(directory, htmlFile)),
    build({
      entryPoints: [path.join(directory, entry)], bundle: true, write: false,
      platform: 'browser', format: 'esm', target: 'chrome120', define: { IS_MINIFIED: 'true' },
      plugins: [{
        name: 'master-stage',
        setup(builder) {
          builder.onResolve({ filter: /watercolor\.js$/ }, ({ importer, path: request }) => {
            const resolved = path.resolve(path.dirname(importer), request);
            if (adapter && resolved === path.join(shared, 'detail', 'watercolor.js')) {
              return { path: path.join(directory, adapter) };
            }
          });
          builder.onLoad({ filter: /cues_s1\.1-\d\.json$/ }, ({ path: file }) => {
            if (file === section.file) return { contents: JSON.stringify(section.sheet), loader: 'json' };
          });
        },
      }],
    }),
  ]);
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    if (pathname === '/') return response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
    if (pathname === route) {
      return response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' }).end(bundle.outputFiles[0].contents);
    }
    if (/^\/en(?:-US)?\.json$/u.test(pathname)) {
      return response.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
    }
    return response.writeHead(pathname === '/favicon.ico' ? 204 : 404).end();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}

export async function launchBrowser() {
  const options = {
    executablePath: process.env.CHROME_PATH,
    args: ['--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--disable-gpu-compositing', '--disable-partial-raster', '--disable-lcd-text'],
  };
  try {
    return await chromium.launch(options);
  } catch (error) {
    if (options.executablePath || !/Executable doesn't exist/u.test(error.message)) throw error;
    return chromium.launch({ ...options, channel: 'chrome' });
  }
}

async function withStage(browser, section, task) {
  const server = await host(section);
  let page;
  let fault;
  try {
    page = await browser.newPage({
      viewport: { width: profile.logicalWidth, height: profile.logicalHeight },
      deviceScaleFactor: profile.deviceScaleFactor, locale: 'en-US',
    });
    await page.addInitScript(({ sheet, hasVoice }) => {
      globalThis.__sectionCueSheet = sheet;
      globalThis.__masterHasVoice = hasVoice;
      // Reset procedural washes to the same seed after each reload.
      let state = 0x11a318;
      Math.random = () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
      };
    }, { sheet: section.sheet, hasVoice: section.hasVoice });
    page.on('pageerror', error => { fault ??= error; });
    page.on('console', message => {
      if (message.type() === 'error') fault ??= new Error(message.text());
    });
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === server.url || url.protocol === 'blob:' || url.protocol === 'data:') return route.continue();
      fault ??= new Error(`Unexpected browser request ${url.origin}`);
      return route.abort();
    });
    const check = () => { if (fault) throw fault; };
    const load = async (reload = false) => {
      let fail;
      const fatal = new Promise((_, reject) => { fail = reject; });
      page.once('pageerror', fail);
      try {
        await Promise.race([fatal, (async () => {
          if (reload) await page.reload({ waitUntil: 'commit' });
          else await page.goto(server.url, { waitUntil: 'commit' });
          await page.waitForFunction(() => typeof window.renderAt === 'function', null, { polling: 250, timeout: 180_000 });
          await page.evaluate(() => document.fonts.ready.then(() => null));
        })()]);
        check();
      } finally {
        page.off('pageerror', fail);
      }
    };
    await load();
    return await task(page, load, check);
  } catch (error) {
    throw new Error(`${section.sheet.module} ${error.message}`, { cause: error });
  } finally {
    try {
      await page?.context().close();
    } finally {
      await server.close();
    }
  }
}

async function screenshot(page, t) {
  const cue = await page.evaluate(seconds => {
    const state = window.renderAt(seconds);
    return state?.id ?? state?.cue?.id;
  }, t);
  const png = await page.screenshot({ type: 'png', scale: 'device', timeout: 120_000 });
  return { png, cue };
}

export async function smokeSection(browser, section, id, progress) {
  return withStage(browser, section, async (page, _load, check) => {
    const slot = section.sheet.cues.find(cue => cue.id === id);
    const frame = Math.round((slot.start + slot.duration * progress) * profile.fps);
    const { png, cue } = await screenshot(page, frame / profile.fps);
    check();
    if (cue !== id) throw new Error(`预期 ${id}，截到 ${cue}`);
    const { width, height } = await sharp(png).metadata();
    if (width !== masterWidth || height !== masterHeight) throw new Error(`PNG ${width}×${height}`);
    const canvas = await page.locator('#plate canvas').evaluateAll((elements, viewport) =>
      elements.filter(element => {
        const rect = element.getBoundingClientRect();
        return rect.x === 0 && rect.y === 0 && rect.width === viewport.width && rect.height === viewport.height;
      }).map(element => [element.width, element.height]), { width: profile.logicalWidth, height: profile.logicalHeight });
    if (!canvas.length || canvas.some(([w, h]) => w !== masterWidth || h !== masterHeight)) {
      throw new Error(`全幅画布 backing store 异常 ${JSON.stringify(canvas)}`);
    }
    // Exclude the subtitle strip and count pigment/ink, not the off-white paper texture.
    const { data, info } = await sharp(png).extract({ left: 2001, top: 1201, width: width - 2001, height: 640 })
      .removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let ink = 0;
    let rowsWithInk = 0;
    const stride = info.width * info.channels;
    for (let row = 0; row < data.length; row += stride) {
      let rowInk = 0;
      for (let pixel = row; pixel < row + stride; pixel += info.channels) {
        const r = data[pixel];
        const g = data[pixel + 1];
        const b = data[pixel + 2];
        if ((r + g + b) / 3 < 175 || Math.max(r, g, b) - Math.min(r, g, b) > 42) rowInk++;
      }
      ink += rowInk;
      if (rowInk >= 12) rowsWithInk++;
    }
    if (ink < 1400 || rowsWithInk < 30) throw new Error(`右下象限缺少实际笔触（${ink} 像素，${rowsWithInk} 行）`);
    console.log(`${section.sheet.module} ${id} 4K 满屏 PASS（${width}×${height}，右下象限 ${ink} 着色像素）`);
  });
}

function launchEncoder(destination) {
  const child = spawn('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
    '-f', 'image2pipe', '-framerate', String(profile.fps), '-c:v', 'png', '-threads', '2', '-i', 'pipe:0',
    '-map', '0:v:0', '-an', '-c:v', profile.videoCodec, '-profile:v', profile.profile, '-level', profile.level,
    '-vf', 'scale=out_color_matrix=bt709', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-pix_fmt', profile.pixFmt, '-crf', String(profile.crf), '-preset', profile.preset, '-threads', '4',
    '-video_track_timescale', String(profile.fps * 1000),
    '-map_metadata', '-1', '-fflags', '+bitexact', destination,
  ], { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
  let stderr = '';
  child.stdin.on('error', () => {}); // The write callback and encoder exit result report pipe failures.
  child.stderr.setEncoding('utf8').on('data', chunk => { stderr = (stderr + chunk).slice(-16000); });
  const done = once(child, 'close').then(([code, signal]) => {
    if (code !== 0) throw new Error(`ffmpeg ${signal ?? code}\n${stderr.trim()}`);
  });
  done.catch(() => {});
  return { child, done };
}

export async function renderSection(browser, section, destination, frameCount, startFrame = 0) {
  return withStage(browser, section, async (page, load, check) => {
    const { child, done } = launchEncoder(destination);
    try {
      for (let frame = 0; frame < frameCount; frame++) {
        if (frame && frame % profile.reloadIntervalFrames === 0) await load(true);
        // The sub-frame offset keeps local cue cuts on the global narration clock.
        const time = (startFrame + frame) / profile.fps + section.samplingOffset;
        const { png } = await screenshot(page, time);
        check();
        await new Promise((resolve, reject) => child.stdin.write(png, error => error ? reject(error) : resolve()));
        if ((frame + 1) % profile.reloadIntervalFrames === 0 || frame + 1 === frameCount) {
          console.log(`${section.sheet.module} ${frame + 1}/${frameCount} 帧`);
        }
      }
      child.stdin.end();
      await done;
    } catch (error) {
      child.stdin.destroy();
      child.kill();
      await done.catch(() => {});
      throw error;
    }
  });
}
