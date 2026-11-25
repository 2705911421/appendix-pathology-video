import assert from 'node:assert/strict';
import path from 'node:path';
import sharp from 'sharp';
import { getRenderProfile } from '../shared/renderProfile.js';
import { planSections } from './build_master_all.mjs';
import { readCueSheets } from './export_tts_sheet.mjs';
import { launchBrowser, prepareBridgePlates, project, withStage } from './render_master_sections.mjs';

const full = [
  ['S01', .55], ['S02', .50], ['S03', .80], ['S04', .55],
  ['S09', .20], ['S09', .75], ['S12', .85], ['S14', .15],
  ['S17', .80], ['S18', .75], ['S19', .75], ['S21', .65, 'S21 · 化脓性'],
  ['S22', .85], ['S23', .75], ['S24', .65], ['S25', .75],
];
const seams = [
  ['B01', .46], ['B03', .75], ['B03b', .45], ['B05', .45],
  ['B06', .45], ['B08', .45], ['S21', .86, 'S21 · 坏疽穿孔'], ['S26', .50],
];
const master = getRenderProfile();
const standard = { ...master, deviceScaleFactor: 1 };
const sections = planSections(await readCueSheets(), undefined, standard);
const browser = await launchBrowser();

async function capture(page, section, [id, p], profile) {
  const cue = section.sheet.cues.find(cue => cue.id === id);
  const state = await page.evaluate(({ time, expectCaption }) => {
    const frame = window.renderAt(time);
    const labels = ['.story-caption-cn', '.story-caption-en'].map(selector =>
      document.querySelector(selector)?.textContent?.trim());
    return { id: frame.id ?? frame.cue?.id, captions: !expectCaption || labels.every(Boolean) };
  }, { time: cue.start + cue.duration * p, expectCaption: cue.type === 'speech' });
  assert.equal(state.id, id);
  assert.ok(state.captions, `${id} missing bilingual captions`);
  const png = await page.screenshot({ type: 'png', scale: 'device', timeout: 120_000 });
  const { width, height } = await sharp(png).metadata();
  assert.deepEqual([width, height], [1920 * profile.deviceScaleFactor, 1080 * profile.deviceScaleFactor]);
  if (cue.type === 'speech') {
    const scale = profile.deviceScaleFactor;
    for (const [top, bottom] of [[921, 982], [982, 1040]]) {
      const sample = await sharp(png).extract({ left: 80 * scale, top: top * scale,
        width: 1760 * scale, height: (bottom - top) * scale }).greyscale().raw().toBuffer();
      assert.ok(sample.filter(pixel => pixel < 132).length > 120 * scale ** 2, `${id} rendered subtitle ink missing`);
    }
  }
  return png;
}

async function viewGeometry(page, id) {
  const picks = id === 'S18'
    ? ['#s18-inset', '#s18-micro-title', '#s18-warning']
    : ['[data-doctor]', '#s19-navel', '#s19-mcburney', '[data-pan="left"]'];
  return page.evaluate(selectors => selectors.map(selector => {
    const { left, top, width, height } = document.querySelector(selector).getBoundingClientRect();
    return [left, top, width, height];
  }), picks);
}

async function verifyMasterPixels(page, section, sample, geometry, check) {
  const png = await capture(page, section, sample, master);
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const white = (x, y) => {
    const i = (y * info.width + x) * 3;
    return data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255;
  };
  for (let y = 0; y + 48 < info.height; y += 16) {
    for (let x = 0; x + 48 < info.width; x += 16) {
      const uniform = [0, 12, 24, 36, 48].every(dy => [0, 12, 24, 36, 48].every(dx => white(x + dx, y + dy)));
      assert.ok(!uniform, `${sample[0]} has a white rectangle at ${x},${y}`);
    }
  }
  check();
  const physical = await viewGeometry(page, sample[0]);
  for (const [i, box] of physical.entries()) {
    assert.ok(box.every((value, j) => Math.abs(value - geometry[i][j]) <= 1), `${sample[0]} geometry drifts at 2×`);
  }
  console.log(`PASS ${sample[0]} native ${info.width}×${info.height} · 0 white rectangles · matching logical geometry`);
}

async function collage(samples, captured, { width, height, cell, x, y, dx, dy, name }) {
  const layout = await Promise.all(samples.map(async ([id, p, title], i) => ({
    left: x + i % 4 * dx, top: y + Math.floor(i / 4) * dy, title: title ?? id,
    progress: p.toFixed(2), input: await sharp(captured.get(samples[i])).resize(cell, cell * 9 / 16).png().toBuffer(),
  })));
  const labels = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <g fill="#544338" font-family="Microsoft YaHei,Arial,sans-serif" font-size="23" font-weight="600">${layout.map(
    ({ left, top, title, progress }) => `<text x="${left + 5}" y="${top - 11}">${title} · p=${progress}</text>`).join('')}</g>
    </svg>`);
  const file = path.join(project, 'out', name);
  const size = await sharp({ create: { width, height, channels: 3, background: '#E9DFD0' } })
    .composite([...layout.map(({ input, left, top }) => ({ input, left, top })), { input: labels }]).png().toFile(file);
  assert.deepEqual([size.width, size.height], [width, height]);
  console.log(file);
}

const captured = new Map();
const layouts = new Map();
try {
  await prepareBridgePlates(browser, sections, standard, sections.slice(2, 4));
  for (const section of sections) {
    const samples = [...full, ...seams].filter(([id]) => section.sheet.cues.some(cue => cue.id === id));
    await withStage(browser, section, standard, async (page, _reload, check) => {
      for (const sample of samples) {
        const png = await capture(page, section, sample, standard);
        check();
        captured.set(sample, png);
        if (['S18', 'S19'].includes(sample[0])) layouts.set(sample[0], await viewGeometry(page, sample[0]));
      }
    });
    console.log(`PASS ${section.sheet.module} · ${samples.length} production stills`);
  }
  await collage(full, captured, { width: 3200, height: 2160, cell: 784,
    x: 8, y: 58, dx: 800, dy: 536, name: 'deep_audit_all16_v2.png' });
  await collage(seams, captured, { width: 2800, height: 1200, cell: 672,
    x: 20, y: 111, dx: 696, dy: 600, name: 'seams_audit_v2.png' });
  captured.clear();
  for (const [index, sample] of [[3, ['S18', .75]], [4, ['S19', .75]]]) {
    const section = { ...sections[index], bridgePlates: undefined };
    await withStage(browser, section, master,
      (page, _reload, check) => verifyMasterPixels(page, section, sample, layouts.get(sample[0]), check));
  }
} finally {
  await browser.close();
}
