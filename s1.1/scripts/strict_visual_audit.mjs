import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { getRenderProfile } from '../shared/renderProfile.js';
import { CREDITS_TIMING, RECOVERY_FADE_SECONDS } from '../shared/timelineHelper.js';
import { planSections } from './build_master_all.mjs';
import { readCueSheets } from './export_tts_sheet.mjs';
import { launchBrowser, prepareBridgePlates, project, withStage } from './render_master_sections.mjs';
import { bridgeAnchorVisible, contentRatio } from './scan_white_frames.mjs';

const master = getRenderProfile();
const hd = { ...master, deviceScaleFactor: 1 };
const out = path.join(project, 'out');
const sections = planSections(await readCueSheets(), undefined, hd);
const cues = new Map(sections.flatMap(section => section.sheet.cues.map(cue => [cue.id, { ...cue, section }])));
const rows = [
  ['S03', 'B01', 'S04'], ['S05', 'B02', 'S06'], ['S09', 'B03', 'S10'],
  ['S10', 'B03b', 'S11'], ['S13', 'B04', 'S14'], ['S14', 'B05', 'S15'],
  ['S18', 'B06', 'S19'], ['S22', 'B07', 'S23'], ['S24', 'B08', 'S25'],
  ['S25', null, 'S26'],
];
const essential = { S01: .55, S02: .50, S03: .80, S04: .50, S09: .75, S10: .89,
  S12: .85, S13: .75, S14: .10, S16: .76, S17: .83, S18: .75, S19: .75,
  S21: .55, S22: .865, S24: .65, S26: .50 };
const extra = [
  ['S01', .98], ['S02', .02], ['S04', .85], ['S07', .79], ['S09', .20],
  ['S12', .54], ['S12', .74], ['S14', .57], ['S20', .05], ['S20', .14], ['S20', .23],
  ['S21', .20], ['S21', .86], ['S23', .89], ['S25', .91],
];
const native4k = [['S03', .80], ['S13', .75], ['S18', .75], ['S19', .75]];
const samples = new Map();
function point(id, progress, label = `${id} p=${progress.toFixed(2)}`) {
  const cue = cues.get(id);
  const time = cue.start + cue.duration * progress;
  const key = `${id}:${progress}`;
  if (!samples.has(key)) samples.set(key, { key, id, time, section: cue.section, progress, cue });
  return { key, label };
}
const storyCells = Array.from({ length: 26 }, (_, i) => {
  const id = `S${String(i + 1).padStart(2, '0')}`;
  return point(id, essential[id] ?? .72);
}).concat(extra.map(([id, p]) => point(id, p)));
const credits = cues.get('S26');
const home = cues.get('S25');
const bridgeCells = rows.map(([before, bridge, after]) => [
  point(before, .95),
  ...[.25, .45, .75].map(p => {
    if (bridge) return point(bridge, p);
    const offset = p * (RECOVERY_FADE_SECONDS + CREDITS_TIMING.fadeIn) - RECOVERY_FADE_SECONDS;
    return offset < 0 ? point('S25', 1 + offset / home.duration, `S25-S26 ${p.toFixed(2)}`)
      : point('S26', offset / credits.duration, `S25-S26 ${p.toFixed(2)}`);
  }),
  point(after, .05),
]);
const midpoint = ['B01', 'B02', 'B05', 'B06', 'B08'];
const boundaryProbes = rows.flatMap(([before, bridge, after]) => bridge
  ? [[before, bridge], [bridge, after]] : [[before, after]]).map(([a, b]) => {
  const cut = cues.get(a);
  const p = a === 'B03' ? 1 : 1 - (1 / master.fps) / cut.duration;
  return { from: point(a, p).key, to: point(b, 0).key, tag: `${a}→${b}` };
});
const compareKeys = new Set(boundaryProbes.flatMap(({ from, to }) => [from, to]));
const imageKeys = new Set([...storyCells, ...bridgeCells.flat()].map(({ key }) => key));
const storyMetrics = {};
const frameMetrics = {};
const failures = [];
const outputImages = new Map();
const compare = new Map();
const paper = [245, 241, 233];
const fail = (condition, message) => {
  if (!condition) failures.push(message);
};
const quant = number => Number(number.toFixed(6));

function regions(rgb, width, height, scale) {
  let quadrant = 0, safeGap = 0, whiteBlock = null;
  const widthThreshold = 24 * scale;
  const heights = new Uint16Array(width);
  for (let y = 0; y < height; y++) {
    let run = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const r = rgb[i], g = rgb[i + 1], b = rgb[i + 2];
      const ink = 54 * r + 183 * g + 19 * b < 220 * 256 || r - g > 16 || g - b > 19 || b - g > 10;
      if (ink && x > 1000 * scale && y > 600 * scale && y < 872 * scale) quadrant++;
      if (ink && y >= 885 * scale && y < 915 * scale) safeGap++;
      heights[x] = r > 252 && g > 252 && b > 252 ? heights[x] + 1 : 0;
      run = heights[x] >= widthThreshold ? run + 1 : 0;
      if (run === widthThreshold && !whiteBlock) whiteBlock = [x - run + 1, y - widthThreshold + 1, run, widthThreshold];
    }
  }
  const corners = [[16, 16], [1888, 16], [16, 1048], [1888, 1048]].map(([cx, cy]) => {
    const totals = [0, 0, 0];
    const side = 12 * scale;
    for (let y = cy * scale; y < cy * scale + side; y++) {
      for (let x = cx * scale; x < cx * scale + side; x++) {
        const i = (y * width + x) * 3;
        for (let c = 0; c < 3; c++) totals[c] += rgb[i + c];
      }
    }
    return totals.map(n => quant(n / side ** 2));
  });
  return { quadrant, safeGap, whiteBlock, corners, cornerError: Math.max(
    ...corners.flatMap(values => values.map((x, i) => Math.abs(x - paper[i])))) };
}

function captionBounds(rgb, width, scale) {
  return [[920, 986], [986, 1065]].map(([from, to]) => {
    let first = width, last = -1, north = Infinity, south = 0, count = 0;
    for (let y = from * scale; y < to * scale; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 3;
        if ((rgb[i] + rgb[i + 1] + rgb[i + 2]) / 3 > 144) continue;
        count++;
        first = Math.min(first, x);
        last = Math.max(last, x);
        north = Math.min(north, y);
        south = Math.max(south, y);
      }
    }
    return { count, left: first / scale, right: last / scale, top: north / scale, bottom: south / scale };
  });
}

function lensPixels(rgb, width, scale, [cx, cy, radius]) {
  let luma = 0, area = 0, bottom = 0, blue = 0;
  const r2 = (radius * .962) ** 2;
  for (let y = Math.ceil((cy - radius) * scale); y < (cy + radius) * scale; y++) {
    for (let x = Math.ceil((cx - radius) * scale); x < (cx + radius) * scale; x++) {
      if ((x / scale - cx) ** 2 + (y / scale - cy) ** 2 > r2) continue;
      const i = (y * width + x) * 3;
      luma += .2126 * rgb[i] + .7152 * rgb[i + 1] + .0722 * rgb[i + 2];
      area++;
      if (y / scale >= cy + .62 * radius) {
        bottom++;
        if (rgb[i + 2] - rgb[i] > 80 && rgb[i + 2] > 160) blue++;
      }
    }
  }
  return { mean: quant(luma / area), pixels: area, bottomBlue: blue, bottomPixels: bottom, blueRatio: quant(blue / bottom) };
}

function readStage(sample) {
  const frame = window.renderAt(sample.time);
  const nav = document.querySelector('[data-stage-navigation]');
  const navBox = nav?.getBoundingClientRect();
  const labels = ['.story-caption-cn', '.story-caption-en'].map(selector => document.querySelector(selector)?.textContent?.trim());
  const visible = node => {
    for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      if (ancestor.hidden || Number(style.opacity) < .05 || style.display === 'none') return false;
    }
    return true;
  };
  const yOver = [...document.querySelectorAll('#plate svg text')].filter(visible).map(node => ({
    bottom: node.getBoundingClientRect().bottom, text: node.textContent.trim(),
  })).filter(({ bottom }) => bottom > 872.5);
  const motion = frame.outgoing === undefined ? {} : { outgoing: frame.outgoing, incoming: frame.incoming };
  if (sample.id === 'B01') {
    const state = window.openingTransitionAt(sample.time);
    motion.outgoing = Math.max(state.patientOpacity, state.diagramOpacity);
    motion.incoming = state.labsOpacity;
  }
  return { id: frame.id ?? frame.cue?.id, labels, yOver, motion, nav: nav ? {
    box: [navBox.left, navBox.top, navBox.width, navBox.height], hidden: nav.hidden,
    opacity: Number(nav.style.opacity), marker: Number(nav.dataset.marker),
  } : null };
}

async function snap(page, sample, profile, key = sample.key) {
  const stage = await page.evaluate(readStage, { time: sample.time, id: sample.id });
  assert.equal(stage.id, sample.id);
  const png = await page.screenshot({ type: 'png', scale: 'device', timeout: 120_000 });
  const scale = profile.deviceScaleFactor;
  const raster = sharp(png).removeAlpha();
  const { data, info } = await raster.raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height, info.channels], [1920 * scale, 1080 * scale, 3]);
  const inClosingDissolve = sample.id === 'S25' && sample.time > home.end - RECOVERY_FADE_SECONDS;
  const expectedCaption = sample.cue.type === 'speech' && imageKeys.has(sample.key) && !inClosingDissolve;
  const counts = captionBounds(data, info.width, scale);
  if (expectedCaption) {
    fail(stage.labels.every(Boolean), `${key} missing bilingual text`);
    fail(counts.every(x => x.count >= 90 && x.left >= 60 && x.right <= 1860 && Math.abs(x.left + x.right - 1920) < 46),
      `${key} caption ink extents ${JSON.stringify(counts)}`);
    if (sample.id !== 'S25') fail(stage.nav?.hidden === (sample.id === 'S04'), `${key} navigation visibility`);
  }
  const { safeGap, ...pix } = regions(data, info.width, info.height, scale);
  fail(safeGap === 0, `${key} ${safeGap} ink pixels in the pre-caption gap`);
  fail(!stage.yOver.length, `${key} lettering beyond art guard ${JSON.stringify(stage.yOver)}`);
  fail(!pix.whiteBlock, `${key} near-white rectangle ${JSON.stringify(pix.whiteBlock)}`);
  if (scale === 2) {
    fail(pix.cornerError <= 6, `${key} corner error ${pix.cornerError.toFixed(2)}`);
    fail(pix.quadrant >= 1400, `${key} only ${pix.quadrant} true art pixels in the lower right`);
  }
  if (stage.nav && !stage.nav.hidden) fail(stage.nav.box.join(',') === '55,109,210,135', `${key} navigation coordinates`);
  const ink = quant(contentRatio(data));
  if (sample.cue.type === 'bridge' && imageKeys.has(sample.key)) {
    fail(ink >= .008 || bridgeAnchorVisible(data, info.width, info.height, sample.id), `${key} missing transition anchor`);
    if (midpoint.includes(sample.id) && sample.progress === .45) {
      fail(stage.motion.outgoing === 0 && stage.motion.incoming === 0, `${key} overlap ${JSON.stringify(stage.motion)}`);
    }
  }
  const rect = { S13: [960, 465, 290], S16: [920, 465, 285], S24: [745, 445, 250] }[sample.id];
  if (rect && imageKeys.has(sample.key)) {
    const stats = lensPixels(data, info.width, scale, rect);
    storyMetrics[key] = stats;
    fail(stats.mean >= 192 && stats.mean <= 232, `${key} lens mean ${stats.mean}`);
    if (sample.id === 'S13') fail(stats.blueRatio < .001, `${key} anomalous blue rim ${stats.blueRatio}`);
  }
  frameMetrics[key] = { ink, safeGap, ...pix, caption: counts, nav: stage.nav, motion: stage.motion, artSize: [info.width, info.height] };
  if (scale === 1 && imageKeys.has(sample.key)) outputImages.set(key, await sharp(png).resize(768, 432).png().toBuffer());
  if (scale === 1 && compareKeys.has(sample.key)) {
    const stamp = await sharp(png).resize(480, 270, { kernel: 'linear' }).removeAlpha().raw().toBuffer();
    const stageStamp = await sharp(stamp, { raw: { width: 480, height: 270, channels: 3 } })
      .extract({ left: 0, top: 0, width: 480, height: 218 }).raw().toBuffer();
    compare.set(key, { stamp, stageStamp, ...(sample.id === 'B03' || sample.id === 'S10'
      ? { circle: await sharp(png).extract({ left: 656, top: 151, width: 608, height: 608 }).removeAlpha().raw().toBuffer() } : {}) });
  }
  if (scale === 2) outputImages.set(key, await sharp(png).resize(768, 432).png().toBuffer());
}

function rmse(a, b) {
  assert.equal(a.length, b.length);
  let squares = 0;
  for (let i = 0; i < a.length; i++) squares += (a[i] - b[i]) ** 2;
  return quant(Math.sqrt(squares / a.length) / 255);
}

async function grid(name, cells, columns) {
  const pad = 12, picture = [768, 432], stride = [780, 470];
  const size = [columns * stride[0] + pad, Math.ceil(cells.length / columns) * stride[1] + pad];
  const placements = cells.map(({ key, label }, i) => ({
    left: pad + i % columns * stride[0], top: 35 + Math.floor(i / columns) * stride[1], label,
    input: outputImages.get(key),
  }));
  assert.ok(placements.every(x => Buffer.isBuffer(x.input)));
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size[0]}" height="${size[1]}">
    <g fill="#4C3C33" font-family="Arial,sans-serif" font-size="22" font-weight="600">${placements.map(
    ({ left, top, label }) => `<text x="${left + 4}" y="${top - 7}">${label}</text>`).join('')}</g></svg>`);
  const file = path.join(out, name);
  await sharp({ create: { width: size[0], height: size[1], channels: 3, background: '#E9DFD0' } })
    .composite([...placements.map(({ input, left, top }) => ({ input, left, top })), { input: svg }]).png().toFile(file);
  return { name, size, cells: cells.length };
}

const browser = await launchBrowser();
const high = [];
try {
  await prepareBridgePlates(browser, sections, hd);
  for (const section of sections) {
    const list = [...samples.values()].filter(x => x.section === section).sort((a, b) => a.time - b.time);
    await withStage(browser, section, hd, async (page, _reload, check) => {
      for (const sample of list) {
        await snap(page, sample, hd);
        check();
      }
    });
    console.log(`${section.sheet.module} rendered ${list.length} frames; cumulative findings ${failures.length}`);
  }
  for (const [id, progress] of native4k) {
    const { key } = point(id, progress);
    const sample = samples.get(key);
    const highKey = `4K ${key}`;
    await withStage(browser, { ...sample.section, bridgePlates: undefined }, master,
      async (page, _reload, check) => { await snap(page, sample, master, highKey); check(); });
    high.push({ key: highKey, label: `4K ${id} p=${progress.toFixed(2)}` });
    console.log(highKey, JSON.stringify(frameMetrics[highKey]));
  }
} finally {
  await browser.close();
}
const boundaries = boundaryProbes.map(({ from, to, tag }) => {
  const a = compare.get(from), b = compare.get(to);
  const value = rmse(a.stamp, b.stamp);
  const artRMSE = rmse(a.stageStamp, b.stageStamp);
  fail(artRMSE <= .055, `${tag} adjacent art jump RMSE ${artRMSE}`);
  return { tag, rmse: value, artRMSE, ...(tag === 'B03→S10' ? { lensRMSE: rmse(a.circle, b.circle) } : {}) };
});
const handoff = boundaries.find(x => x.tag === 'B03→S10');
fail(handoff.lensRMSE === 0, `B03→S10 microscope RMSE ${handoff.lensRMSE}`);
const sheets = [
  await grid('strict_story_audit.png', [...storyCells, ...high], 5),
  await grid('strict_seam_audit.png', bridgeCells.flat(), 5),
];
await writeFile(path.join(out, '.strict-visual-metrics.json'), JSON.stringify({
  findings: failures, frameCount: samples.size + high.length, frameMetrics, storyMetrics, boundaries, sheets,
}, null, 2) + '\n');
console.log('Visual findings', JSON.stringify(failures));
if (failures.length) process.exitCode = 1;
