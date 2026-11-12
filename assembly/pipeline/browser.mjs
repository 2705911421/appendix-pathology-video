// Shared headless Chrome for subtitle and endcard frame renders.
import fs from 'node:fs/promises';
import path from 'node:path';
import { launchBrowser } from '../../tools/browser.mjs';

export const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.css': 'text/css',
};

export const launchChrome = launchBrowser;

export async function routeRoot(page, origin, root) {
  const rootResolved = path.resolve(root);
  await page.route(origin + '/**', async (route) => {
    try {
      const rel = decodeURIComponent(new URL(route.request().url()).pathname);
      const file = path.resolve(rootResolved, '.' + (rel === '/' ? '/index.html' : rel));
      if (file !== rootResolved && !file.startsWith(rootResolved + path.sep)) throw new Error('outside root');
      const body = await fs.readFile(file);
      await route.fulfill({
        status: 200,
        contentType: MIME[path.extname(file)] || 'application/octet-stream',
        body,
      });
    } catch {
      await route.fulfill({ status: 404, body: '' });
    }
  });
}

export async function withPage(root, origin, fn) {
  const browser = await launchChrome();
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    page.setDefaultTimeout(60000);
    page.on('pageerror', (e) => errors.push(String(e.message || e)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await routeRoot(page, origin, root);
    await page.goto(origin + '/');
    await page.waitForFunction(() => window.READY === true);
    if (errors.length) throw new Error(errors.join('\n'));
    const value = await fn(page, errors);
    if (errors.length) throw new Error(errors.join('\n'));
    return value;
  } finally {
    await browser.close();
  }
}

export async function canvasPng(page, t, mode) {
  const url = await page.evaluate(({ t, mode }) => {
    if (mode === 'overlay') window.renderOverlay(t);
    else window.render(t);
    return document.querySelector('canvas').toDataURL('image/png');
  }, { t, mode });
  const comma = url.indexOf(',');
  if (comma < 0) throw new Error('canvas did not return a PNG');
  return Buffer.from(url.slice(comma + 1), 'base64');
}
