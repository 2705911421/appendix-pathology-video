import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

export const directory = fileURLToPath(new URL('.', import.meta.url));
export const viewport = { width: 1920, height: 1080 };
const shared = fileURLToPath(new URL('../shared/', import.meta.url));
const cueFile = path.join(directory, 'out', 'cues_s1.1-1.json');

export async function startStage() {
  const [html, cueSource] = await Promise.all([
    readFile(path.join(directory, 'index.html')),
    readFile(cueFile, 'utf8'),
  ]);
  const sheet = JSON.parse(cueSource);
  const scope = {
    name: 'opening-live-watercolor',
    setup(bundle) {
      bundle.onResolve({ filter: /watercolor\.js$/ }, ({ importer, path: request }) => {
        if (importer.startsWith(shared)
          && path.resolve(path.dirname(importer), request) === path.join(shared, 'detail', 'watercolor.js')) {
          return { path: path.join(directory, 'src', 'watercolorCanvas.js') };
        }
        return undefined;
      });
      bundle.onLoad({ filter: /cues_s1\.1-1\.json$/ }, ({ path: file }) =>
        file === cueFile ? { contents: cueSource, loader: 'json' } : undefined);
    },
  };
  const { outputFiles: [bundle] } = await build({
    entryPoints: [path.join(directory, 'src', 'scene.js')],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: 'chrome120',
    define: { IS_MINIFIED: 'true' },
    plugins: [scope],
  });
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    if (pathname === '/') return response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
    if (request.url === '/scene.js') {
      return response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' }).end(bundle.contents);
    }
    if (/^\/en(?:-US)?\.json$/u.test(request.url)) {
      return response.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
    }
    if (request.url === '/favicon.ico') return response.writeHead(204).end();
    return response.writeHead(404).end();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    sheet,
    source: bundle.text,
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}

export function launchStageBrowser() {
  return chromium.launch({
    channel: 'chrome',
    executablePath: process.env.CHROME_PATH,
    headless: true,
    // Use the same software composition for every capture path and cue cut.
    args: [
      '--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--disable-gpu-compositing', '--disable-gpu-rasterization', '--disable-partial-raster', '--disable-lcd-text',
    ],
  });
}

export async function openStagePage(browser, url, faults) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, locale: 'en' });
  page.on('pageerror', error => faults.push(error.stack ?? error.message));
  page.on('console', message => { if (message.type() === 'error') faults.push(message.text()); });
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin === url) return route.continue();
    faults.push(`Unexpected external request ${route.request().url()}`);
    return route.abort();
  });
  return page;
}

export async function loadStagePage(page, url, reload = false) {
  let rejectScene;
  const failed = new Promise((_, reject) => { rejectScene = reject; });
  page.once('pageerror', rejectScene);
  try {
    await Promise.race([failed, (async () => {
      if (reload) await page.reload({ waitUntil: 'commit' });
      else await page.goto(url, { waitUntil: 'commit' });
      await page.waitForFunction(() => typeof window.renderAt === 'function', null, { timeout: 180_000 });
    })()]);
  } finally {
    page.off('pageerror', rejectScene);
  }
}

export function seekTime(page, t) {
  return page.evaluate(async seconds => {
    const selected = window.renderAt(seconds);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return selected;
  }, t);
}
