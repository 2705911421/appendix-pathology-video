import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { mulberry32 } from '../shared/canvasCore.js';
import { timeCues } from './src/timing.js';
import {
  directory, launchStageBrowser, loadStagePage, openStagePage, seekTime, startStage, viewport,
} from './stage-host.mjs';
import { verifyGate } from './verify-gate.mjs';

const { width, height } = viewport;
const samples = [['S01', .65], ['S03', .80], ['S04', .75], ['S05', .85]];
const stage = await startStage();
const { duration, cues } = timeCues(stage.sheet.cues);
const cueTimes = new Map(cues.map(cue => [cue.id, cue]));

async function seek(page, id, p) {
  const { start, duration: seconds } = cueTimes.get(id);
  const selected = await seekTime(page, start + p * seconds);
  assert.equal(selected.id, id);
  assert.ok(Math.abs(selected.p - p) < 1e-10, `${id} cue progress mismatch`);
}

async function checkFrameLayout(page, id) {
  const state = await page.evaluate(() => {
    const canvas = document.querySelector('#opening-stage');
    const { width } = canvas;
    const height = 130;
    const { top: origin } = canvas.getBoundingClientRect();
    const top = origin + 915;
    const bottom = top + height;
    const { data } = canvas.getContext('2d').getImageData(0, 915, width, height);
    const bands = [{ left: width, right: -1 }, { left: width, right: -1 }];
    for (let y = 0; y < height; y++) {
      const band = bands[Number(y >= 66)];
      for (let x = 0; x < width; x++) {
        const pixel = (y * width + x) * 4;
        if (Math.max(data[pixel], data[pixel + 1], data[pixel + 2]) >= 180) continue;
        band.left = Math.min(x, band.left);
        band.right = Math.max(x, band.right);
      }
    }
    return {
      top, bottom, bands,
      en: document.querySelector('.story-caption-en').textContent,
      watermark: /\bS0[1-5]\s*@\s*p/u.test(document.querySelector('#plate').textContent),
    };
  });
  assert.equal(state.top, 915);
  assert.equal(state.bottom, 1045);
  assert.equal(state.en, cueTimes.get(id).enText);
  assert.ok(!/[\u02bb\u02bc\u2018\u2019\u201b\uff07\r\n]/u.test(state.en), `${id} English subtitle is not a single ASCII-apostrophe line`);
  assert.equal(state.watermark, false, 'Review label on a clean frame');
  for (const band of state.bands) {
    assert.ok(band.right > band.left && band.left >= 60 && band.right <= 1860, `${id} subtitle out of bounds or missing`);
  }
}

async function writeContactSheet(frames) {
  const gap = 16;
  const header = 53;
  const fullWidth = 2 * width + gap;
  const fullHeight = 2 * (height + header) + gap;
  const inputs = frames.map((input, index) => ({
    input, left: index % 2 * (width + gap), top: Math.floor(index / 2) * (height + header + gap) + header,
  }));
  const labelSheet = `<svg width="${fullWidth}" height="${fullHeight}" xmlns="http://www.w3.org/2000/svg">
    ${samples.map(([id, p], i) => {
    const { left, top } = inputs[i];
    return `<rect x="${left}" y="${top - header}" width="${width}" height="${header}" fill="#EEE7DB"/>
      <text x="${left + 88}" y="${top - 17}" font-family="Consolas, monospace" font-size="25"
        fill="#51483F">${id} @ p=${p.toFixed(2)}</text>`;
  }).join('')}</svg>`;
  const filename = ['keyframes_s1.1-1', 'png'].join('.');
  await writeFile(path.join(directory, 'out', filename), await sharp({
    create: { width: fullWidth, height: fullHeight, channels: 3, background: '#BDB3A5' },
  }).composite([...inputs, { input: Buffer.from(labelSheet), left: 0, top: 0 }]).toFormat('png').toBuffer());
  console.log(`Rendered out/${filename} | ${fullWidth}x${fullHeight} | four ${width}x${height} stills`);
}

async function checkOrder(page) {
  const random = mulberry32(0x533131);
  const half = duration / 2;
  const samples = [{ time: random() * half }, { time: half + random() * half }];
  for (const [key, order] of [['first', samples], ['second', samples.toReversed()]]) {
    for (const sample of order) {
      await seekTime(page, sample.time);
      sample[key] = await page.screenshot({ scale: 'css' });
    }
  }
  return samples;
}

let browser;
try {
  browser = await launchStageBrowser();
  const faults = [];
  const page = await openStagePage(browser, stage.url, faults);
  await page.coverage.startJSCoverage();
  await loadStagePage(page, stage.url);
  const firstScene = await page.evaluate(() => window.renderAt(0));
  const lastScene = await page.evaluate(t => window.renderAt(t), duration);
  assert.deepEqual(firstScene, { id: 'S01', p: 0 });
  assert.deepEqual(lastScene, { id: 'S05', p: 1 });
  await seek(page, 'S02', .82);
  await checkFrameLayout(page, 'S02');

  const frames = [];
  for (const [id, p] of samples) {
    await seek(page, id, p);
    await checkFrameLayout(page, id);
    frames.push(await page.screenshot({ scale: 'css' }));
  }
  await writeContactSheet(frames);
  const clip = { x: 0, y: 0, width, height: 880 };
  await seek(page, 'S03', .2);
  const early = await page.screenshot({ clip, scale: 'css' });
  await seek(page, 'S03', .8);
  const late = await page.screenshot({ clip, scale: 'css' });
  const determinism = await checkOrder(page);
  const coverage = await page.coverage.stopJSCoverage();
  assert.deepEqual(faults, []);
  await verifyGate({ directory, page, coverage, source: stage.source, early, late, determinism });
} finally {
  if (browser) await browser.close();
  await stage.close();
}
