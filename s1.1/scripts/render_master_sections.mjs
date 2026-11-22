import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { renderProfile } from '../shared/renderProfile.js';
import { fontPrelude, renderFonts } from './render_fonts.mjs';

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
const outgoingPlates = {
  B02: ['subject'], B05: ['notes', 'subject'], B06: ['icon', 'subject'], B07: ['notes', 'subject'],
};

export function frameBoundary(seconds, fps = renderProfile.fps) {
  // Quantize cumulative cut positions, so up to one frame is added across the whole film.
  return Math.ceil(seconds * fps - 1e-8);
}

export async function prepareStage(section) {
  const directory = path.join(project, section.sheet.module);
  const [htmlFile, entry, route, adapter] = stages[section.index];
  const [html, bundle] = await Promise.all([
    readFile(path.join(directory, htmlFile), 'utf8'),
    build({
      absWorkingDir: project, entryPoints: [path.join(directory, entry)], bundle: true, write: false, charset: 'utf8',
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
            if (path.relative(section.file, file) === '') return { contents: JSON.stringify(section.sheet), loader: 'json' };
          });
        },
      }],
    }),
  ]);
  const text = bundle.outputFiles[0].text;
  return { html: html.replace('</head>', '<link rel="stylesheet" href="/render-fonts.css">\n</head>'),
    bundle: fontPrelude(text, section.index === 0) + text, route };
}

async function host(section) {
  const [{ html, bundle, route }, fonts] = await Promise.all([section.stage ?? prepareStage(section), renderFonts()]);
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    if (pathname === '/') return response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
    if (pathname === route) {
      return response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' }).end(bundle);
    }
    if (pathname === '/render-fonts.css') return response.writeHead(200, { 'Content-Type': 'text/css' }).end(fonts.css);
    if (fonts.files.has(pathname)) {
      try {
        if (!fonts.buffers.has(pathname)) fonts.buffers.set(pathname, readFile(fonts.files.get(pathname)));
        const font = await fonts.buffers.get(pathname);
        return response.writeHead(200, { 'Content-Type': 'font/woff2' }).end(font);
      } catch {
        return response.writeHead(500).end();
      }
    }
    const plate = /^\/bridge-plates\/(\w+)\.png$/u.exec(pathname);
    if (plate && section.bridgePlates?.[plate[1]]) {
      return response.writeHead(200, { 'Content-Type': 'image/png' }).end(section.bridgePlates[plate[1]]);
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

export async function withStage(browser, section, profile, task) {
  const server = await host(section);
  try {
    return await withPage(browser, server, section, profile, task);
  } finally {
    await server.close();
  }
}

async function withPage(browser, server, section, profile, task) {
  let page;
  let fault;
  try {
    page = await browser.newPage({
      viewport: { width: profile.logicalWidth, height: profile.logicalHeight },
      deviceScaleFactor: profile.deviceScaleFactor, locale: 'en-US',
    });
    await page.addInitScript(({ sheet, hasVoice, bridgeParts }) => {
      globalThis.__sectionCueSheet = sheet;
      globalThis.__masterHasVoice = hasVoice;
      globalThis.__bridgeParts = bridgeParts;
      // Reset procedural washes to the same seed after each reload.
      let state = 0x11a318;
      Math.random = () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
      };
    }, { sheet: section.sheet, hasVoice: section.hasVoice, bridgeParts: Object.keys(section.bridgePlates ?? {}) });
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
    await page?.context().close();
  }
}

export function bridgePlateTarget(sections, index) {
  return outgoingPlates[sections[index].sheet.cues.at(-1).id] ? sections[index + 1] : undefined;
}

export async function prepareBridgePlates(browser, sections, profile, pending = sections) {
  for (let index = 0; index < sections.length - 1; index++) {
    const from = sections[index];
    const id = from.sheet.cues.at(-1).id;
    const parts = outgoingPlates[id];
    if (!parts || !pending.includes(from)) continue;
    const to = { ...sections[index + 1], bridgePlates: undefined };
    from.bridgePlates = await withStage(browser, to, profile, async (page, _load, check) => {
      const plates = {};
      for (const part of parts) {
        await page.evaluate(part => {
          window.renderBridgeEntry(part);
          const root = document.querySelector('#plate');
          for (const element of [document.documentElement, document.body, root]) {
            element.style.background = 'transparent';
          }
          for (const element of root.querySelectorAll('.story-grain, .story-caption, .story-caption-halo, [data-bridge-paper]')) {
            element.style.visibility = 'hidden';
          }
        }, part);
        const png = await page.screenshot({ type: 'png', scale: 'device', omitBackground: true, timeout: 120_000 });
        const { channels } = await sharp(png).metadata();
        if (channels !== 4) throw new Error(`${id}/${part} 抽取的入场画面缺少透明通道`);
        check();
        plates[part] = png;
      }
      return plates;
    });
    console.log(`${id} 入场图层已准备（${parts.length}）`);
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

export async function smokeSection(browser, section, id, progress, profile = renderProfile) {
  const density = profile.deviceScaleFactor;
  const expectedWidth = profile.logicalWidth * density;
  const expectedHeight = profile.logicalHeight * density;
  return withStage(browser, section, profile, async (page, _load, check) => {
    const slot = section.sheet.cues.find(cue => cue.id === id);
    const time = slot.start + slot.duration * progress;
    const { png, cue } = await screenshot(page, time);
    check();
    if (cue !== id) throw new Error(`预期 ${id}，截到 ${cue}`);
    const { width, height } = await sharp(png).metadata();
    if (width !== expectedWidth || height !== expectedHeight) throw new Error(`PNG ${width}×${height}`);
    const canvas = await page.locator('#plate canvas').evaluateAll((elements, viewport) =>
      elements.filter(element => {
        const rect = element.getBoundingClientRect();
        return rect.x === 0 && rect.y === 0 && rect.width === viewport.width && rect.height === viewport.height;
      }).map(element => [element.width, element.height]), { width: profile.logicalWidth, height: profile.logicalHeight });
    if (!canvas.length || canvas.some(([w, h]) => w !== expectedWidth || h !== expectedHeight)) {
      throw new Error(`全幅画布 backing store 异常 ${JSON.stringify(canvas)}`);
    }
    // Exclude the subtitle strip and count pigment/ink, not the off-white paper texture.
    const left = 1000 * density + 1;
    const { data, info } = await sharp(png).extract({ left, top: 600 * density + 1, width: width - left, height: 320 * density })
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
      if (rowInk >= 6 * density) rowsWithInk++;
    }
    if (ink < 350 * density ** 2 || rowsWithInk < 15 * density) throw new Error(`右下象限缺少实际笔触（${ink} 像素，${rowsWithInk} 行）`);
    const captionTop = 919 * density;
    const caption = await sharp(png).extract({ left: 0, top: Math.floor(captionTop), width, height: height - Math.floor(captionTop) })
      .removeAlpha().raw().toBuffer();
    const extents = [[width, 0, 0], [width, 0, 0]];
    for (let pixel = 0; pixel < caption.length / 3; pixel++) {
      const i = pixel * 3;
      if ((caption[i] + caption[i + 1] + caption[i + 2]) / 3 > 148) continue;
      const x = pixel % width;
      const y = Math.floor(pixel / width) + captionTop;
      const line = extents[Number(y >= 985 * density)];
      line[0] = Math.min(line[0], x);
      line[1] = Math.max(line[1], x);
      line[2] = Math.max(line[2], y);
    }
    if (extents.some(([xmin, xmax, bottom]) => xmax - xmin < 60 * density
      || xmin < 75 * density || xmax > width - 75 * density || bottom > 1060 * density)) {
      throw new Error(`双语字幕超出安全区或缺失 ${JSON.stringify(extents)}`);
    }
    console.log(`${section.sheet.module} ${id} PASS（${width}×${height}，右下 ${ink} 着色像素，字幕横向 ${extents.map(([x, right]) => `${x}–${right}`).join(' / ')}）`);
    return png;
  });
}

function launchEncoder(destination, profile) {
  const { logicalWidth, logicalHeight, outputWidth, outputHeight } = profile;
  // Retain the authored display ratio through the even-width 480p raster.
  const scale = outputWidth
    ? `scale=${outputWidth}:${outputHeight}:flags=lanczos:out_color_matrix=bt709`
      + `,setsar=sar=${logicalWidth * outputHeight}/${logicalHeight * outputWidth}:max=16384`
    : 'scale=out_color_matrix=bt709';
  const child = spawn('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
    '-f', 'image2pipe', '-framerate', String(profile.fps), '-c:v', 'png', '-threads', '2', '-i', 'pipe:0',
    '-map', '0:v:0', '-an', '-c:v', profile.videoCodec,
    ...(profile.profile ? ['-profile:v', profile.profile, '-level:v', profile.level] : []),
    '-vf', scale, '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-pix_fmt', profile.pixFmt, '-crf', String(profile.crf), '-preset', profile.preset, '-threads', '4',
    ...(profile.maxBitrate ? ['-maxrate', `${profile.maxBitrate}M`, '-bufsize', `${2 * profile.maxBitrate}M`] : []),
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

export async function renderSection(section, destination, frameCount, startFrame = 0, profile = renderProfile, signal) {
  const server = await host(section);
  const { child, done } = launchEncoder(destination, profile);
  try {
    for (let first = 0; first < frameCount; first += profile.reloadIntervalFrames) {
      signal?.throwIfAborted();
      const end = Math.min(first + profile.reloadIntervalFrames, frameCount);
      // End the entire browser, including its GPU process, before the next batch.
      const browser = await launchBrowser();
      try {
        await withPage(browser, server, section, profile, async (page, _load, check) => {
          for (let frame = first; frame < end; frame++) {
            signal?.throwIfAborted();
            const time = (startFrame + frame) / profile.fps + section.samplingOffset;
            const { png } = await screenshot(page, time);
            check();
            if (frame === first) {
              const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
              if (width !== profile.logicalWidth * profile.deviceScaleFactor || height !== profile.logicalHeight * profile.deviceScaleFactor) {
                throw new Error(`浏览器捕获尺寸异常 ${width}×${height}`);
              }
            }
            await new Promise((resolve, reject) => child.stdin.write(png, error => error ? reject(error) : resolve()));
          }
        });
      } finally {
        await browser.close();
      }
      console.log(`${section.sheet.module} ${end}/${frameCount} 帧`);
    }
    child.stdin.end();
    await done;
  } catch (error) {
    child.stdin.destroy();
    child.kill();
    await done.catch(() => {});
    throw error;
  } finally {
    await server.close();
  }
}
