#!/usr/bin/env node
// Still renderer for the subtitle page. Not the assembly video.
//   node render.mjs --cues ../qa/cues_estimate.json --t 1.74,8.48 --out-dir ../qa/frames
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.dirname(fileURLToPath(import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.woff2': 'font/woff2' };

function args(argv) {
  const out = { t: ['1'], cues: null, outDir: path.resolve(root, '../qa/frames'), overlay: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--t') out.t = next().split(',').map(Number);
    else if (a === '--cues') out.cues = path.resolve(next());
    else if (a === '--out-dir') out.outDir = path.resolve(next());
    else if (a === '--overlay') out.overlay = true;
    else if (a === '--out') { out.outDir = path.dirname(path.resolve(next())); out.single = path.resolve(argv[i]); }
    else throw new Error('Unknown arg ' + a);
  }
  return out;
}

const opt = args(process.argv);
let cues = [];
if (opt.cues) {
  const data = JSON.parse(await fs.readFile(opt.cues, 'utf8'));
  cues = data.cues || data;
}
await fs.mkdir(opt.outDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none', '--force-color-profile=srgb'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.route('http://subtitle.local/**', async (route) => {
    try {
      const rel = decodeURIComponent(new URL(route.request().url()).pathname);
      const file = path.resolve(root, '.' + (rel === '/' ? '/index.html' : rel));
      if (file !== root && !file.startsWith(root + path.sep)) throw new Error('outside root');
      await route.fulfill({ status: 200, contentType: mime[path.extname(file)] || 'application/octet-stream', body: await fs.readFile(file) });
    } catch {
      await route.fulfill({ status: 404, body: '' });
    }
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://subtitle.local/');
  await page.waitForFunction(() => window.READY === true);
  await page.evaluate((c) => { window.CUES = c; }, cues);
  if (errors.length) throw new Error(errors.join('\n'));
  for (let n = 0; n < opt.t.length; n++) {
    const t = opt.t[n];
    const url = await page.evaluate(({ t, overlay }) => {
      if (overlay) window.renderOverlay(t);
      else window.render(t);
      return document.querySelector('canvas').toDataURL('image/png');
    }, { t, overlay: opt.overlay });
    const buf = Buffer.from(url.split(',')[1], 'base64');
    const dest = opt.single && opt.t.length === 1 ? opt.single : path.join(opt.outDir, `still_${String(n + 1).padStart(2, '0')}_t${t}.png`);
    await fs.writeFile(dest, buf);
    console.log(dest);
  }
} finally {
  await browser.close();
}
