import assert from 'node:assert/strict';
import path from 'node:path';
import sharp from 'sharp';
import { getRenderProfile } from '../shared/renderProfile.js';
import { planSections } from './build_master_all.mjs';
import { readCueSheets } from './export_tts_sheet.mjs';
import { launchBrowser, project, withStage } from './render_master_sections.mjs';

const width = 2700;
const height = 1500;
const frameWidth = 864;
const frameHeight = 486;
const detailHeight = 151;
const paper = '#F5F1E9';
const profile = getRenderProfile('master');
const density = profile.deviceScaleFactor;
const cells = [
  { id: 'S05', p: .15, name: '四色导览 · 干净宣纸', detail: [520, 443, 1140, 175] },
  { id: 'S13', p: .80, name: '因果链 · 渗出过程小注', detail: [1230, 486, 585, 140] },
  { id: 'S14', p: .80, name: '灰黄色脓苔结论', detail: [430, 750, 1100, 112] },
  { id: 'S17', p: .80, name: '阑尾壁与系膜静脉引线', detail: [680, 535, 820, 235] },
  { id: 'S21', p: .50, name: '急性化脓性阑尾炎 · CT', detail: [1378, 324, 492, 300], stage: 1,
    zh: '急性化脓性阑尾炎见双环靶征、偏心粪石与脂肪条索；',
    en: 'target sign, eccentric fecalith, and fat stranding in acute suppurative appendicitis;' },
  { id: 'S21', p: .75, name: '急性坏疽性阑尾炎伴穿孔 · CT', detail: [1378, 324, 492, 300], stage: 2,
    zh: '急性坏疽性阑尾炎伴穿孔时，见管壁强化缺损、盲肠旁脓肿及游离气体。',
    en: 'wall enhancement defect, periappendiceal abscess, and free air in perforated acute gangrenous appendicitis.' },
];

const label = ({ id, p }) => id + ' · p=' + p.toFixed(2);
const placement = i => ({ left: 36 + (i % 3) * 882, top: 80 + Math.floor(i / 3) * 700 });
const sectionPlan = planSections(await readCueSheets(), undefined, profile);
const layers = [];
const browser = await launchBrowser();

try {
  for (const section of sectionPlan) {
    const cues = new Map(section.sheet.cues.map(cue => [cue.id, cue]));
    const samples = cells.filter(sample => cues.has(sample.id));
    if (!samples.length) continue;
    await withStage(browser, section, profile, async (page, _reload, check) => {
      for (const sample of samples) {
        const cue = cues.get(sample.id);
        const drawn = await page.evaluate(({ t, checkCt }) => {
          const state = window.renderAt(t);
          const read = selector => document.querySelector(selector)?.textContent;
          const english = document.querySelector('.story-caption-en');
          const visibleNotes = [...document.querySelectorAll('[data-ct-notes]')]
            .filter(node => !node.hidden && getComputedStyle(node).display !== 'none' &&
              Number(node.getAttribute('opacity') ?? 1) > .001)
            .map(node => Number(node.dataset.ctNotes));
          const rect = english?.getBoundingClientRect();
          return { id: state.id ?? state.cue?.id, density: devicePixelRatio, scene: checkCt ? {
            zh: read('.story-caption-cn'), en: read('.story-caption-en'), visibleNotes,
            enBounds: [rect.left, rect.right, rect.height],
          } : null };
        }, { t: cue.start + cue.duration * sample.p, checkCt: sample.stage !== undefined });
        assert.equal(drawn.id, sample.id);
        assert.equal(drawn.density, density);
        if (drawn.scene) {
          const { zh, en, visibleNotes, enBounds: [left, right, lineHeight] } = drawn.scene;
          assert.deepEqual([zh, en, visibleNotes], [sample.zh, sample.en, [sample.stage]], label(sample));
          assert.ok(left >= 60 && right <= 1860 && lineHeight <= 50, label(sample) + ' caption bounds');
        }
        const png = await page.screenshot({ scale: 'device', type: 'png', timeout: 120_000 });
        check();
        const info = await sharp(png).metadata();
        assert.deepEqual([info.width, info.height], [3840, 2160], label(sample));
        const { left, top } = placement(cells.indexOf(sample));
        const [x, y, w, h] = sample.detail.map(value => value * density);
        const [frame, detail] = await Promise.all([
          sharp(png).resize(frameWidth, frameHeight).png().toBuffer(),
          sharp(png).extract({ left: x, top: y, width: w, height: h })
            .resize(frameWidth, detailHeight, { fit: 'contain', background: paper }).png().toBuffer(),
        ]);
        layers.push({ input: frame, left, top: top + 41 }, { input: detail, left, top: top + 537 });
        console.log('PASS ' + label(sample) + ' · 3840×2160' + (drawn.scene ? ' · fixed bilingual page and one annotation set' : ''));
      }
    });
  }
} finally {
  await browser.close();
}

assert.equal(layers.length, cells.length * 2);
const labels = cells.map((sample, i) => {
  const { left, top } = placement(i);
  return '<text x="' + left + '" y="' + (top + 30) + '" font-size="26" fill="#655247">' + label(sample) + '</text>' +
    '<text x="' + (left + 205) + '" y="' + (top + 30) + '" font-size="27" font-weight="700">' + sample.name + '</text>';
}).join('');
const header = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
  '<g font-family="Microsoft YaHei, sans-serif" fill="#2A2622">' +
  '<text x="36" y="57" font-size="41" font-weight="700">终版定点复核</text>' +
  '<text x="2664" y="56" text-anchor="end" font-size="23" fill="#655247">完整画面 / 局部放大</text>' +
  '<path d="M36 74H2664" stroke="#BDAE9E" fill="none"/>' + labels + '</g></svg>');
const destination = path.join(project, 'out', 'final_9fixes_proof.png');
const result = await sharp({ create: { width, height, channels: 3, background: '#EAE2D6' } })
  .composite([...layers, { input: header }]).png().toFile(destination);
assert.deepEqual([result.width, result.height], [width, height]);
console.log('PASS 2700×1500 · 6 live frames\n' + destination);
