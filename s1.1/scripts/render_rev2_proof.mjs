import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { storySubtitleAt } from '../shared/canvasCore.js';
import { prepareProductionSubtitles, spokenHanCount } from '../shared/cueCaptions.js';
import { getRenderProfile } from '../shared/renderProfile.js';
import { planSections } from './build_master_all.mjs';
import { readCueSheets } from './export_tts_sheet.mjs';
import { launchBrowser, project, withStage } from './render_master_sections.mjs';

const profile = getRenderProfile('master');
const density = profile.deviceScaleFactor;
const board = { width: 3000, height: 2100, frameWidth: 720, frameHeight: 405, detailHeight: 176 };
const paper = '#F5F1E9';

const cells = [
  { id: 'S01', seconds: 2, label: '片头同步标题', detail: [548, 72, 824, 135], smoke: true },
  { id: 'S01', seconds: 5, label: '标题退场后', detail: [724, 595, 485, 210] },
  { id: 'S03', progress: .80, label: '腹膜刺激征三联征', detail: [1038, 662, 768, 194] },
  { id: 'S04', progress: .70, label: '正常区间与连续条形图', detail: [1115, 465, 596, 171] },
  { id: 'S05', progress: .60, label: '四色病理主线导览', detail: [525, 418, 1114, 205] },
  { id: 'S08', progress: .75, label: '同义异名与外观特征', detail: [1152, 172, 716, 164] },
  { id: 'S09', progress: .65, label: '全层浸润与外观成因', detail: [1257, 263, 530, 292] },
  { id: 'S13', progress: .75, label: '链激酶与纤溶酶原', detail: [1238, 234, 584, 388], smoke: true },
  { id: 'S14', progress: .40, label: '浆膜面高倍观', detail: [480, 747, 1008, 112] },
  { id: 'S18', progress: .80, label: '坏疽与穿孔辨析', detail: [1152, 761, 728, 107] },
  { id: 'S21', progress: .60, label: '急性化脓性阑尾炎 CT', detail: [760, 72, 855, 117] },
  { id: 'S26', progress: .50, label: '五条权威文献', detail: [280, 520, 1360, 351], smoke: true },
];
const samples = [...cells, { id: 'S14', progress: .45, smoke: true }];
const expected = [3840, 2160];

function sampleLabel({ id, seconds, progress }) {
  return `${id} · ${seconds === undefined ? `p=${progress.toFixed(2)}` : `t=${seconds.toFixed(1)}s`}`;
}

function region([left, top, width, height]) {
  return { left: left * density, top: top * density, width: width * density, height: height * density };
}

function captionPixels(raw, width, from, to) {
  let left = width, right = 0, top = to, bottom = 0;
  for (let y = from; y < to; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = 3 * (y * width + x);
      if (raw[pixel] + raw[pixel + 1] + raw[pixel + 2] >= 3 * 148) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return { left: left / density, right: right / density, top: top / density, bottom: bottom / density };
}

function verifyCaption(frame, width, cue, p, label, fixedCaption) {
  const text = fixedCaption ?? storySubtitleAt(prepareProductionSubtitles(cue), p)
    .page.zh.map(run => run.text).join('');
  const han = spokenHanCount(text);
  const chinese = captionPixels(frame, width, 885 * density, 985 * density);
  const english = captionPixels(frame, width, 985 * density, 1060 * density);
  for (const line of [chinese, english]) {
    assert.ok(line.right - line.left > 35 && line.left >= 60 && line.right <= 1860,
      `${label} 字幕边界 ${JSON.stringify(line)}`);
  }
  assert.ok(han > 0 && han <= 28 && english.bottom - english.top <= 42,
    `${label} 中文字幕 ${han} 字，英文边界 ${JSON.stringify(english)}`);
  return `中文 ${han} 字，英文单行 x=${english.left}–${english.right}`;
}

function verifyArtworkMargin(frame, width, height, cue, sample) {
  const credits = cue.type === 'credits';
  const from = credits ? 872 * density : 885 * density;
  const to = credits ? height : 919 * density;
  const margin = captionPixels(frame, width, from, to);
  assert.equal(margin.left, width / density, `${sampleLabel(sample)} 图形进入字幕区 ${JSON.stringify(margin)}`);
  if (cue.id === 'S14' && sample.progress === .40) {
    let badgeInk = 0;
    for (let y = 118 * density; y < 150 * density; y++) {
      for (let x = 353 * density; x < 655 * density; x++) {
        const pixel = 3 * (y * width + x);
        if (frame[pixel] < 140 && frame[pixel + 2] - frame[pixel] > 18) badgeInk++;
      }
    }
    assert.ok(badgeInk > 150 * density ** 2, 'S14 浆膜面视角标牌缺少可见蓝色笔触');
  }
}

function verifyMasterPixels(frame, width, height, label) {
  // A pure-white 16×16 physical square would expose an opaque rectangular backing surface.
  const whiteRows = new Uint16Array(width);
  let whitePixels = 0;
  let ink = 0;
  let inkRows = 0;
  for (let y = 0; y < height; y++) {
    const artworkRow = y >= height / 2 && y < 872 * density;
    let run = 0;
    let rowInk = 0;
    for (let x = 0; x < width; x++) {
      const position = 3 * (y * width + x);
      const r = frame[position];
      const g = frame[position + 1];
      const b = frame[position + 2];
      const white = r === 255 && g === 255 && b === 255;
      whitePixels += Number(white);
      run = white ? run + 1 : 0;
      whiteRows[x] = run >= 16 ? whiteRows[x] + 1 : 0;
      if (whiteRows[x] >= 16) throw new Error(`${label} 发现纯白矩形，物理坐标 (${x - 15}, ${y - 15})`);
      if (artworkRow && x >= width / 2 &&
        (r + g + b < 3 * 175 || Math.max(r, g, b) - Math.min(r, g, b) > 42)) rowInk++;
    }
    ink += rowInk;
    inkRows += Number(rowInk >= 10);
  }
  assert.ok(ink >= 350 * density ** 2 && inkRows >= 15 * density,
    `${label} 右下象限字幕上方未达到实际笔触门槛（${ink} 像素，${inkRows} 行）`);
  console.log(`4K PASS ${label} ${width}×${height}，右下笔触 ${ink} 像素／${inkRows} 行，纯白矩形 0（纯白像素 ${whitePixels}）`);
}

async function screenshot(page, cue, sample, check) {
  const time = cue.start + (sample.seconds ?? cue.duration * sample.progress);
  const result = await page.evaluate(({ time, id }) => {
    const state = window.renderAt(time);
    const opening = id === 'S01' ? window.openingTransitionAt(time).openingTitle : undefined;
    const ctTitle = id === 'S21' ? document.querySelector('[data-step="1"] text') : null;
    const fixedCaption = ctTitle ? document.querySelector('.story-caption-cn').textContent : undefined;
    const canvases = [...document.querySelectorAll('#plate canvas')].filter(canvas => {
      const bounds = canvas.getBoundingClientRect();
      return bounds.x === 0 && bounds.y === 0 && bounds.width === innerWidth && bounds.height === innerHeight;
    }).map(canvas => [canvas.width, canvas.height]);
    return { id: state.id ?? state.cue.id, p: state.p, opening, ct: ctTitle?.getAttribute('fill'), canvases,
      fixedCaption, density: devicePixelRatio };
  }, { time, id: cue.id });
  const label = sampleLabel(sample);
  assert.equal(result.id, cue.id, `${label} 场景选取`);
  assert.equal(result.density, density, `${label} 显示密度`);
  assert.ok(result.canvases.length > 0, `${label} 缺少全幅画布`);
  result.canvases.forEach(size => assert.deepEqual(size, expected, `${label} 画布像素缓冲`));
  if (cue.id === 'S01') assert.equal(result.opening.alpha, Number(sample.seconds === 2), `${label} 标题透明度`);
  if (cue.id === 'S21') assert.equal(result.ct?.toUpperCase(), '#C43428', `${label} 应聚焦急性化脓性阑尾炎`);
  const png = await page.screenshot({ type: 'png', scale: 'device', timeout: 120_000 });
  check();
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height], expected, `${label} 截图像素尺寸`);
  assert.equal(info.channels, 3, `${label} RGB 通道数`);
  verifyArtworkMargin(data, info.width, info.height, cue, sample);
  if (sample.smoke) verifyMasterPixels(data, info.width, info.height, label);
  if (cue.type === 'speech') console.log(`字幕 PASS ${label} ${verifyCaption(data, info.width, cue, result.p, label, result.fixedCaption)}`);
  return png;
}

function tilePosition(index) {
  return { left: 36 + (index % 4) * 736, top: 111 + Math.floor(index / 4) * 656 };
}

async function addTile(target, png, cell, index) {
  const { left, top } = tilePosition(index);
  const frame = await sharp(png).resize(board.frameWidth, board.frameHeight).png().toBuffer();
  const detail = await sharp(png).extract(region(cell.detail)).resize(board.frameWidth, board.detailHeight, {
    fit: 'contain', background: paper,
  }).png().toBuffer();
  target.push({ input: frame, left, top: top + 34 }, { input: detail, left, top: top + 451 });
}

function boardLabels() {
  const tiles = cells.map((cell, index) => {
    const { left, top } = tilePosition(index);
    return `<text x="${left}" y="${top + 22}" font-size="24" fill="#604E42">${sampleLabel(cell)}</text>
      <text x="${left + 209}" y="${top + 22}" font-size="25" font-weight="600">${cell.label}</text>`;
  }).join('');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${board.width}" height="${board.height}">
    <g font-family="Microsoft YaHei, Arial, sans-serif" fill="#2A2622">
      <text x="36" y="64" font-size="44" font-weight="700">阑尾变质日记 · 第二轮实景核查</text>
      <text x="2964" y="64" text-anchor="end" font-size="27" fill="#604E42">完整画面 / 局部放大</text>
      <path d="M36 89H2964" fill="none" stroke="#BAA997" stroke-width="1"/>
      ${tiles}
    </g>
  </svg>`);
}

const sections = planSections(await readCueSheets(), undefined, profile);
const browser = await launchBrowser();
const tiles = [];
try {
  for (const section of sections) {
    const cues = new Map(section.sheet.cues.map(cue => [cue.id, cue]));
    const group = samples.filter(sample => cues.has(sample.id));
    if (group.length === 0) continue;
    await withStage(browser, section, profile, async (page, _reload, check) => {
      for (const sample of group) {
        const frame = await screenshot(page, cues.get(sample.id), sample, check);
        const index = cells.indexOf(sample);
        if (index >= 0) await addTile(tiles, frame, sample, index);
      }
    });
  }
} finally {
  await browser.close();
}

assert.equal(tiles.length, 2 * cells.length, '核查拼图实景数量');
const destination = path.join(project, 'out', 'rev2_15items_proof.png');
await mkdir(path.dirname(destination), { recursive: true });
const result = await sharp({ create: { width: board.width, height: board.height, channels: 3, background: '#EAE2D6' } })
  .composite([...tiles, { input: boardLabels() }]).png().toFile(destination);
assert.deepEqual([result.width, result.height], [board.width, board.height], '核查拼图尺寸');
console.log(`拼图 PASS ${result.width}×${result.height}，${cells.length} 幅实景及局部放大\n${destination}`);
