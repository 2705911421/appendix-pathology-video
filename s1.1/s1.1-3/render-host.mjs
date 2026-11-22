import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

export async function launchRenderBrowser() {
  const args = ['--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  const executablePath = process.env.CHROME_PATH;
  try {
    return await chromium.launch({ headless: true, executablePath, args });
  } catch (error) {
    if (executablePath || !String(error).includes("Executable doesn't exist")) throw error;
    return chromium.launch({ headless: true, channel: 'chrome', args });
  }
}

export async function startRenderHost(section, width, height, { preview = false } = {}) {
  const [{ outputFiles: [bundle] }, source] = await Promise.all([
    build({
      entryPoints: [path.join(section, 'main.mjs')],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'browser',
      target: 'chrome120',
      define: { IS_MINIFIED: 'true' },
    }),
    readFile(path.join(section, 'index.html'), 'utf8'),
  ]);
  // The encoder reads the canvas pixels directly. Skip the separate page composition.
  const html = source.replace('</head>', '<style>#plate { visibility: hidden; }</style></head>');
  const bytesPerFrame = width * height * 4;
  const uploads = new Map();
  let nextUpload = 0;
  let lens;

  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url, 'http://localhost');
    if (pathname === '/') return response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
    if (pathname === '/act.js') return response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' }).end(bundle.contents);
    if (pathname === '/favicon.ico') return response.writeHead(204).end();
    if (pathname === '/en.json' || pathname === '/en-US.json') {
      return response.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
    }
    if (pathname === '/generated-lens' && lens) {
      return response.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': lens.pixels.length,
      }).end(lens.pixels);
    }
    if (request.method === 'POST' && pathname.startsWith('/pixels/')) {
      const upload = uploads.get(pathname);
      const size = Number(request.headers['content-length']);
      const validSize = upload?.raw ? size === bytesPerFrame
        : Number.isSafeInteger(size) && size > 0 && size <= bytesPerFrame + 65536;
      if (!upload || upload.receiving || !validSize) {
        request.resume();
        return response.writeHead(400).end();
      }
      upload.receiving = true;
      const buffer = Buffer.allocUnsafe(size);
      let received = 0;
      request.on('data', chunk => {
        if (received + chunk.length <= size) chunk.copy(buffer, received);
        received += chunk.length;
      });
      request.on('end', () => {
        if (received !== size) return response.writeHead(400).end();
        upload.pixels = buffer;
        response.writeHead(204).end();
      });
      return;
    }
    response.writeHead(404).end();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/${preview ? '?preview=1' : ''}`;

  async function applyLens(page) {
    if (!lens) return;
    // All renderers use the same live procedural bake, including after a reload.
    await page.evaluate(async () => {
      const surface = window.retainedHistologyCanvas();
      const response = await fetch('/generated-lens', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not transfer the generated histology surface');
      const bytes = new Uint8ClampedArray(await response.arrayBuffer());
      const canvas = document.createElement('canvas');
      canvas.width = surface.width;
      canvas.height = surface.height;
      canvas.getContext('2d', { willReadFrequently: true })
        .putImageData(new ImageData(bytes, canvas.width, canvas.height), 0, 0);
      surface.replaceWith(canvas);
    });
  }

  return {
    close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
    async selectLens(page) {
      const destination = `/pixels/${++nextUpload}`;
      const upload = { raw: false };
      uploads.set(destination, upload);
      try {
        const size = await page.evaluate(async path => {
          const canvas = window.retainedHistologyCanvas();
          const ctx = canvas.getContext('2d');
          const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = await fetch(path, { method: 'POST', body: data });
          if (!result.ok) throw new Error('Could not collect the procedural lens');
          return data.byteLength;
        }, destination);
        assert.equal(upload.pixels?.length, size);
        lens = { pixels: upload.pixels };
      } finally {
        uploads.delete(destination);
      }
      await applyLens(page);
    },
    async newPage(browser) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, locale: 'en-US' });
      // Some brush internals initialize their grain before the scene applies its own seeds.
      await page.addInitScript(() => {
        let state = 0x6a09e667;
        Math.random = () => {
          state ^= state << 13;
          state ^= state >>> 17;
          state ^= state << 5;
          return (state >>> 0) / 4294967296;
        };
      });
      const pageErrors = [];
      const rasterRequests = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error') pageErrors.push(message.text());
      });
      page.on('request', request => {
        if (request.resourceType() === 'image' && !request.url().endsWith('/favicon.ico')) rasterRequests.push(request.url());
      });
      const check = () => {
        assert.deepEqual(pageErrors, [], 'Rendering page reported errors');
        assert.deepEqual(rasterRequests, [], 'Rendering page requested a raster asset');
      };
      async function waitReady() {
        try {
          await page.waitForFunction(() => typeof window.renderAt === 'function', null, {
            polling: 75, timeout: 180_000,
          });
        } catch (error) {
          throw new Error(pageErrors.join('\n') || error.message);
        }
        check();
      }
      await page.goto(url, { waitUntil: 'commit' });
      await waitReady();
      await applyLens(page);
      const viewport = await page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio]);
      assert.deepEqual(viewport, [width, height, 1]);

      async function captureBatch(times, inspect = false) {
        check();
        const frames = times.map(time => {
          const destination = `/pixels/${++nextUpload}`;
          uploads.set(destination, { raw: inspect });
          return { time, destination };
        });
        try {
          const inspected = await page.evaluate(async ({ frames, width, height, inspect }) => {
              const canvas = document.querySelector('.story-paint canvas');
              if (canvas.width !== width || canvas.height !== height) throw new Error('Unexpected render canvas size');
              const ctx = canvas.getContext('2d');
              const results = [];
              for (const { time, destination } of frames) {
                const paintedText = [];
                if (inspect) {
                  for (const name of ['fillText', 'strokeText']) {
                    const draw = ctx[name];
                    ctx[name] = function (text, ...args) {
                      paintedText.push(String(text));
                      return draw.call(this, text, ...args);
                    };
                  }
                }
                try {
                  window.renderAt(time);
                } finally {
                  if (inspect) {
                    delete ctx.fillText;
                    delete ctx.strokeText;
                  }
                }
                const body = inspect ? ctx.getImageData(0, 0, width, height).data
                  : await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                if (!body) throw new Error('Empty capture from the render canvas');
                const transfer = await fetch(destination, { method: 'POST', body });
                if (!transfer.ok) throw new Error('Frame did not reach the local encoder');
                results.push(inspect ? [...paintedText, document.body.textContent] : null);
              }
              return results;
            }, { frames, width, height, inspect });
          check();
          return frames.map(({ destination }, i) => {
            const { pixels } = uploads.get(destination);
            assert.ok(pixels?.length);
            if (inspect) assert.equal(pixels.length, bytesPerFrame);
            return { pixels, inspection: inspected[i] };
          });
        } finally {
          for (const { destination } of frames) uploads.delete(destination);
        }
      }

      return {
        page,
        check,
        async reload() {
          check();
          await page.reload({ waitUntil: 'commit' });
          await waitReady();
          await applyLens(page);
        },
        async capture(seconds, inspect = false) {
          const [frame] = await captureBatch([seconds], inspect);
          return frame;
        },
        captureBatch,
      };
    },
  };
}
