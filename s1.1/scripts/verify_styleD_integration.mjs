import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { PORTRAIT_LAYER } from '../shared/minimalistCharacters.js';
import { getRenderProfile } from '../shared/renderProfile.js';
import { planSections } from './build_master_all.mjs';
import { readCueSheets } from './export_tts_sheet.mjs';
import { launchBrowser, prepareStage, project, withStage } from './render_master_sections.mjs';

const capturePlan = [
  { section: 0, scenes: [['S01', .60], ['S02', .65], ['S03', .80]] },
  { section: 4, scenes: [['S19', .75], ['S20', .80]] },
  { section: 5, scenes: [['S25', .75]] },
];
const master = getRenderProfile('master');
const hd = { ...master, deviceScaleFactor: 1 };
const timeOf = (section, id, p) => {
  const cue = section.sheet.cues.find(cue => cue.id === id);
  assert.ok(cue, `Missing ${id}`);
  return cue.start + cue.duration * p;
};

function installPortraitProbe(layer) {
  const drawImage = CanvasRenderingContext2D.prototype.drawImage;
  let last;
  CanvasRenderingContext2D.prototype.drawImage = function (...args) {
    const [source, x, y, width, height] = args;
    if (args.length === 5 && source instanceof OffscreenCanvas && x === layer.x && y === layer.y
      && width === layer.width && height === layer.height) {
      last = { source, imageMatrix: this.getTransform(), target: this.canvas, opacity: this.globalAlpha };
    }
    return drawImage.apply(this, args);
  };

  function inspect() {
    if (!last) return null;
    const { source, imageMatrix, target, opacity } = last;
    const { width, height } = source;
    const density = width / layer.width;
    const { data } = source.getContext('2d').getImageData(0, 0, width, height);
    const margin = Math.floor(4 * density);
    let left = width;
    let top = height;
    let right = -1;
    let bottom = -1;
    let ink = 0;
    let chestInk = 0;
    let white = 0;
    let leaked = 0;
    const fade = [0, 0];
    for (let y = 0; y < height; y++) {
      const logicalY = y / density + layer.y;
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const alpha = data[index + 3];
        if (!alpha) continue;
        if (x < margin || x >= width - margin || y < margin || y >= height - margin) leaked++;
        if (alpha === 255 && data[index] === 255 && data[index + 1] === 255 && data[index + 2] === 255) white++;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        const logicalX = x / density + layer.x;
        if (alpha > 196 && (data[index] + data[index + 1] + data[index + 2]) / 3 < 125) {
          ink++;
          if (logicalX > -43 && logicalX < 42 && logicalY > 146 && logicalY < 242) chestInk++;
        }
        if (logicalX > -60 && logicalX < 60) {
          if (logicalY >= 316 && logicalY < 322) fade[0] += alpha;
          if (logicalY >= 330 && logicalY < 336) fade[1] += alpha;
        }
      }
    }
    if (right < left) throw new Error('A portrait surface is empty');
    const rect = target.getBoundingClientRect();
    const scaleX = rect.width / target.width;
    const scaleY = rect.height / target.height;
    const corners = [[left, top], [right + 1, top], [left, bottom + 1], [right + 1, bottom + 1]].map(([x, y]) =>
      new DOMPoint(x / density + layer.x, y / density + layer.y).matrixTransform(imageMatrix));
    const minX = Math.min(...corners.map(point => point.x));
    const minY = Math.min(...corners.map(point => point.y));
    const maxX = Math.max(...corners.map(point => point.x));
    const maxY = Math.max(...corners.map(point => point.y));
    return { left: rect.left + minX * scaleX, top: rect.top + minY * scaleY,
      right: rect.left + maxX * scaleX, bottom: rect.top + maxY * scaleY,
      surfaceGutter: Math.min(minX * scaleX, minY * scaleY, (target.width - maxX) * scaleX, (target.height - maxY) * scaleY),
      density, opacity, targetBacking: [target.width, target.height], targetCss: [rect.width, rect.height],
      ink: ink / density ** 2, chestInk: chestInk / density ** 2, white, leaked, fade: fade[1] / Math.max(1, fade[0]) };
  }

  window.sampleStyleD = ({ time, info = false }) => {
    last = null;
    const scene = window.renderAt(time);
    const rig = info && window.openingPatientAt?.(time);
    const nodes = scene.id === 'S25' ? ['#s25-action-0', '#s25-action-1', '#s25-action-2']
      : scene.id === 'S19' || scene.id === 'S20' ? ['[data-pan="left"]', '[data-clinical-caption]'] : [];
    const exclusions = nodes.map(selector => document.querySelector(selector)?.getBoundingClientRect().left)
      .filter(value => typeof value === 'number');
    return { ...scene, rig, portrait: inspect(), exclusion: exclusions.length ? Math.min(...exclusions) : null };
  };
}

function checkRig(arms) {
  assert.equal(arms.length, 2);
  for (const [shoulder, elbow, wrist] of arms) {
    assert.ok(Math.abs(Math.hypot(shoulder[0] - elbow[0], shoulder[1] - elbow[1]) - 83) < 1e-8, 'Upper arm changed length');
    assert.ok(Math.abs(Math.hypot(elbow[0] - wrist[0], elbow[1] - wrist[1]) - 79) < 1e-8, 'Forearm changed length');
  }
}

async function inspect(page, section, id, p, extra = {}) {
  const time = timeOf(section, id, p);
  const info = section.index === 0;
  const result = await page.evaluate(({ time, info }) => window.sampleStyleD({ time, info }), { time, info });
  assert.equal(result.id, id);
  assert.ok(Math.abs(result.p - p) < 1e-9);
  if (extra.hidden) {
    assert.equal(result.portrait, null, `${id} still draws the portrait after its exit`);
    return result;
  }
  const { portrait: b, exclusion, rig } = result;
  assert.ok(b, `${id} missing a live character raster`);
  const location = `${id}@${p} ${JSON.stringify(b)}`;
  assert.equal(b.leaked, 0, location);
  assert.equal(b.white, 0, location);
  assert.ok(b.surfaceGutter >= 3 && b.ink > 450, `Clipped or empty portrait ${location}`);
  assert.ok(b.top >= 0 && b.bottom <= 870 && b.left >= 350 && b.right <= 1920, `Portrait outside safe area ${location}`);
  if (id === 'S02' || id === 'S03') assert.ok(b.right <= 975, `Portrait in pelvic label lane ${location}`);
  if (exclusion !== null) assert.ok(b.right <= exclusion - 20, `Portrait intersects diagram or lettering ${location}, edge ${exclusion}`);
  if (rig) checkRig(rig.arms);
  if (id === 'S25') assert.ok(b.fade > .14 && b.fade < .82, `Waist fade lost ${location}`);
  return result;
}

async function scanWhite(png, width, height) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height, info.channels], [width, height, 3]);
  const limit = Math.ceil(12 * width / hd.logicalWidth);
  const heights = new Uint16Array(width);
  let white = 0;
  let blocks = 0;
  for (let y = 0; y < height; y++) {
    let run = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) {
        heights[x]++;
        white++;
      } else heights[x] = 0;
      run = heights[x] >= limit ? run + 1 : 0;
      if (run >= limit) blocks++;
    }
  }
  assert.equal(blocks, 0, `${width}×${height} contains a pure-white block`);
  return white;
}

async function snap(page, profile) {
  const png = await page.screenshot({ type: 'png', scale: 'device', timeout: 120_000 });
  const { logicalWidth, logicalHeight, deviceScaleFactor } = profile;
  const white = await scanWhite(png, logicalWidth * deviceScaleFactor, logicalHeight * deviceScaleFactor);
  return { png, white };
}

function checkResolution(hdPortrait, masterPortrait, feature) {
  assert.ok(masterPortrait.density >= 2 * hdPortrait.density, 'Portrait did not scale its native raster density');
  assert.ok(hdPortrait[feature] > 95, `No 1080p ${feature} signal`);
  const ratio = masterPortrait[feature] / hdPortrait[feature];
  assert.ok(ratio >= .90 && ratio <= 1.12, `${feature} area changed across densities: ${ratio}`);
  return ratio;
}

async function checkOpeningMotion(page, section) {
  let nearest = Infinity;
  let previous;
  for (const id of ['S01', 'S02', 'S03']) {
    for (const p of [.01, .19, .39, .61, .82, .98]) {
      const { portrait } = await inspect(page, section, id, p);
      nearest = Math.min(nearest, portrait.left - 350);
    }
  }
  for (const p of [.08, .31, .59, .80]) {
    const { portrait } = await inspect(page, section, 'B01', p);
    if (previous !== undefined) assert.ok(portrait.opacity < previous, 'B01 portrait fade is not monotonic');
    previous = portrait.opacity;
  }
  assert.ok(previous < .015, 'B01 portrait exits too abruptly');
  await inspect(page, section, 'B01', .93, { hidden: true });
  await inspect(page, section, 'S04', .20, { hidden: true });
  console.log(`PASS S01–S04 / B01 · ${nearest.toFixed(1)}px clearance on the left · fixed arm lengths · clean fade`);
}

async function makeSheet(frames, destination) {
  const width = 2400;
  const height = 1600;
  const sampleWidth = 896;
  const sampleHeight = 504;
  const tiles = await Promise.all(frames.map(async ({ png, id, p }, index) => ({
    left: 257 + (index % 2) * 986,
    top: 24 + Math.floor(index / 2) * 529,
    input: await sharp(png).resize(sampleWidth, sampleHeight, { fit: 'inside', kernel: 'linear' }).png().toBuffer(),
    label: `${id} · p=${p.toFixed(2)}`,
  })));
  const labels = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    ${tiles.map(({ left, top, label }) => `<text x="${left}" y="${top - 6}" font-family="Consolas, monospace"
      font-size="16" fill="#51483F">${label}</text>`).join('')}
  </svg>`;
  const png = await sharp({ create: { width, height, channels: 3, background: '#EAE4D8' } }).composite([
    ...tiles.map(({ input, left, top }) => ({ input, left, top })), { input: Buffer.from(labels), left: 0, top: 0 },
  ]).png().toBuffer();
  const white = await scanWhite(png, width, height);
  assert.equal(white, 0, 'The audit board introduces pure-white pixels');
  await writeFile(destination, png);
  console.log(`PASS audit board · ${width}×${height} · ${white} pure-white pixels · 0 white blocks`);
  console.log(destination);
}

const sections = planSections(await readCueSheets(), undefined, master);
for (const { section } of capturePlan) sections[section].stage = await prepareStage(sections[section]);
const browser = await launchBrowser();
const frames = [];
try {
  for (const { section, scenes } of capturePlan) {
    const entry = sections[section];
    await withStage(browser, entry, hd, async (page, _load, check) => {
      await page.evaluate(installPortraitProbe, PORTRAIT_LAYER);
      if (section === 0) await checkOpeningMotion(page, entry);
      for (const [id, p] of scenes) {
        const { portrait, exclusion, rig } = await inspect(page, entry, id, p);
        if (id === 'S01') {
          assert.ok(rig.bowl, 'Lunch bowl is missing');
          const wrist = rig.arms[1][2];
          const reach = Math.hypot(rig.bowl[0] - wrist[0], rig.bowl[1] - wrist[1]);
          assert.ok(reach > 45 && reach < 53, 'Lunch bowl is detached from the resting hand');
        }
        const { png, white } = await snap(page, hd);
        check();
        frames.push({ png, white, id, p, portrait });
        const gap = exclusion === null ? '' : ` · next element ${(exclusion - portrait.right).toFixed(1)}px away`;
        console.log(`PASS ${id}@${p.toFixed(2)} · x ${portrait.left.toFixed(1)}–${portrait.right.toFixed(1)} · y≤${portrait.bottom.toFixed(1)}${gap} · ${white} pure-white pixels`);
      }
    });
  }
  await withStage(browser, sections[0], master, async (page, _load, check) => {
    await page.evaluate(installPortraitProbe, PORTRAIT_LAYER);
    const { portrait } = await inspect(page, sections[0], 'S03', .80);
    assert.deepEqual(portrait.targetBacking, [3840, 2160]);
    const { white } = await snap(page, master);
    const ratio = checkResolution(frames.find(frame => frame.id === 'S03').portrait, portrait, 'ink');
    check();
    console.log(`PASS S03 master · 3840×2160 · ink coverage ratio ${ratio.toFixed(3)} · ${white} pure-white pixels · memory only`);
  });
  await withStage(browser, sections[4], master, async (page, _load, check) => {
    await page.evaluate(installPortraitProbe, PORTRAIT_LAYER);
    const { portrait } = await inspect(page, sections[4], 'S20', .80);
    const ratio = checkResolution(frames.find(frame => frame.id === 'S20').portrait, portrait, 'chestInk');
    check();
    console.log(`PASS S20 1080p / master · lapel and stethoscope ink coverage ratio ${ratio.toFixed(3)}`);
  });
  const output = path.join(project, 'out');
  await mkdir(output, { recursive: true });
  await makeSheet(frames, path.join(output, 'styleD_integration_audit.png'));
} finally {
  await browser.close();
}
