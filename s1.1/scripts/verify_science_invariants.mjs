import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { assertBlindReviewText } from '../shared/blindReview.js';
import { DEFAULT_PROFILE, getRenderProfile, renderProfile, videoDimensions } from '../shared/renderProfile.js';
import { planSections } from './build_master_all.mjs';
import { readCueSheets } from './export_tts_sheet.mjs';
import { launchBrowser, project, withStage } from './render_master_sections.mjs';

const acute = /增[生殖]|\bproliferat(?:ion|ive|e\w*)\b/iu;
const obsoleteSensitivity = /(?:98[.．]7|97)\s*%|百分之(?:九十七|九十八点七)/u;
const smartApostrophes = /[\u2018\u2019\u201b\u02bb\u02bc\uff07]/u;
const rasterFile = /\.(?:png|jpe?g|webp|avif|gif|bmp|tiff?)$/iu;
const sourceFile = /\.(?:[cm]?js|[cm]?ts|jsx|tsx|json|html|css|svg)$/iu;
const skips = new Set(['.git', 'node_modules', 'out', 'frames', 'audio', 'external_tts']);
const surgery = '一旦确诊，通常建议在症状缓解期择期切除；若正处于急性发作期，则视情况急诊手术。';
const lumaRange = [192, 232];
const authoredStages = ['normal', 'simple', 'phlegmon', 'gangrene', 'chronic'];
const checkpoints = [.16, .30, .49, .70, .92];

const localPath = file => path.join(project, file);
const read = file => readFile(localPath(file), 'utf8');
const json = async file => JSON.parse((await read(file)).replace(/^\uFEFF/u, ''));
const close = (a, b, error = 1e-6) => Math.abs(a - b) <= error;
const pass = text => console.log(`PASS  ${text}`);

function checkedText(value, location) {
  assert.doesNotThrow(() => assertBlindReviewText(value), `${location} contains blind-review identifiers`);
  assert.ok(!obsoleteSensitivity.test(value.normalize('NFKC')), `${location} contains obsolete sensitivity`);
}

async function* projectFiles(directory = '') {
  for (const entry of await readdir(localPath(directory), { withFileTypes: true })) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory() && !skips.has(entry.name)) yield* projectFiles(relative);
    else if (entry.isFile()) yield relative;
  }
}

async function verifySource() {
  let files = 0;
  for await (const file of projectFiles()) {
    assert.ok(!rasterFile.test(file), `Static raster in source tree: ${file}`);
    if (!sourceFile.test(file) || ['scripts/verify_science_invariants.mjs', 'shared/blindReview.js',
      'package-lock.json'].includes(file)) continue;
    const source = await read(file);
    checkedText(source, file);
    files++;
    // Audit/render utilities can encode their own diagnostic screenshots.
    const live = /^shared\//u.test(file) && !/\/(?:render_|assetsAuditBoard|verify-cues)/u.test(file)
      || /^s1\.1-\d\/(?:src\/|(?:main|gate1|scene-tools|s1[5-8]|vein-lens|rupture-mist|acute-washes)\.mjs$|[^/]+\.html$)/u.test(file);
    if (!live) continue;
    const body = file === 'shared/detail/bridgePlates.js'
      ? source.replace('/bridge-plates/${part}.png', '') : source;
    assert.ok(!/data\s*:\s*image\/|['"`][^'"\x60\r\n]*\.(?:png|jpe?g|webp|avif|gif|bmp|tiff?)(?:[?#][^'"\x60\r\n]*)?['"`]/iu.test(body),
      `${file} contains a raster URL or encoded texture`);
  }
  const metadata = await json('package.json');
  for (const key of ['author', 'contributors', 'studentId', 'school', 'affiliation', 'supervisor']) {
    assert.ok(!Object.hasOwn(metadata, key), `Unblinded package metadata key: ${key}`);
  }
  pass(`${files} source/metadata files · blind review · no external raster textures`);
}

async function verifyCues(source) {
  const speech = source.cues.filter(cue => cue.type === 'speech');
  assert.equal(speech.length, 25);
  assert.equal(source.cues.filter(cue => cue.type === 'bridge').length, 8);
  const required = {
    S02: [/内脏神经/u, /\bvisceral nerves\b/u],
    S03: [/麦氏点/u, /\bMcBurney's point\b/u],
    S04: [/三十九点三度/u, /39\.3°C/u],
    S08: [/蜂窝织炎性阑尾炎/u, /\bphlegmonous\b/u],
    S09: [/水肿增厚.*积脓的窄腔.*粪石/u, /\bfecalith\b/u],
    S10: [/变质.*渗出/u, /tissue injury and exudation/u],
    S11: [/坏死.*溃疡/u, /necrosis.*ulceration/u],
    S12: [/分叶核中性粒细胞变形.*内皮间隙/u, /lobed nuclei.*endothelial gaps/u],
    S13: [/纤维素性脓性渗出物/u, /fibrinous-purulent exudate/u],
    S14: [/变性、坏死的中性粒细胞.*纤维素性脓性渗出物/u, /necrotic neutrophils.*fibrinous-purulent exudate/u],
    S15: [/早期控制.*迅速恶化/u, /controlled early.*worsen rapidly/u],
    S16: [/黏膜和黏膜下层.*平滑肌层/u, /submucosa.*muscularis propria/u],
    S17: [/静脉回流.*阑尾系膜静脉.*血栓/u, /venous drainage.*mesoappendiceal vein/u],
    S18: [/坏疽性阑尾炎.*弥漫性腹膜炎/u, /gangrenous appendicitis.*diffuse peritonitis/u],
    S19: [/典型症状.*体格检查/u, /typical symptoms.*physical exam/u],
    S20: [/辅助确诊工具.*临床评估.*成人疑似病例.*可超过百分之九十三/u, /diagnostic aid.*clinical assessment.*adults.*exceed 93\s*%/iu],
    S21: [/轻度增粗.*偏心粪石.*脂肪条索.*壁强化缺损.*盲肠旁脓肿.*腔外气泡/u, /phlegmonous.*fecalith.*gangrenous.*extraluminal gas/u],
    S22: [/尽快外科评估.*弥漫性腹膜炎.*紧急手术.*局限性脓肿.*引流/u, /prompt surgical assessment.*diffuse peritonitis.*localized abscess/iu],
    S23: [/慢性阑尾炎.*修复性增生/u, /chronic appendicitis.*reparative proliferation/iu],
    S24: [/淋巴细胞和浆细胞/u, /elective appendectomy.*symptoms have subsided.*emergency surgery may be needed/u],
  };
  for (const [i, cue] of speech.entries()) {
    const { id, zhText, enText } = cue;
    assert.equal(id, `S${String(i + 1).padStart(2, '0')}`);
    for (const line of [zhText, enText]) checkedText(line, id);
    if (!['S23', 'S24'].includes(id)) assert.ok(!acute.test(zhText + ' ' + enText), `${id} presents proliferation outside the chronic scenes`);
    assert.ok(!smartApostrophes.test(enText), `${id} uses a non-ASCII apostrophe`);
    if (required[id]) {
      assert.match(zhText, required[id][0], id);
      assert.match(enText, required[id][1], id);
    }
    if (id === 'S24') assert.ok(zhText.includes(surgery), 'S24 timing principle must be quoted in full');
  }
  const local = await json('s1.1-5/cues_s1.1-5.json');
  const scriptWords = sheet => sheet.cues.map(({ id, zhText, enText, highlightZh }) => ({ id, zhText, enText, highlightZh }));
  assert.deepEqual(scriptWords(local), scriptWords(source.sheets[4].sheet), 'S19–S22 standalone text differs from the master build');
  const tts = await json('out/tts_cue_sheet.json');
  assert.deepEqual(tts.map(({ outputPath, ...cue }) => cue), speech, 'Re-export the edited narration sheet');
  for (const { outputPath, id } of tts) assert.equal(outputPath, `s1.1/external_tts/${id}.wav`);
  pass('25 bilingual cues · clinical wording, English spellings, apostrophes and narration export');
}

function verifyProfiles() {
  const master = getRenderProfile();
  const review = getRenderProfile('review');
  assert.equal(DEFAULT_PROFILE, 'master');
  assert.equal(renderProfile, master);
  assert.deepEqual(videoDimensions(master), { width: 3840, height: 2160 });
  assert.deepEqual([master.logicalWidth, master.logicalHeight, master.deviceScaleFactor, master.fps], [1920, 1080, 2, 60]);
  assert.deepEqual(videoDimensions(review), { width: 854, height: 480 });
  assert.deepEqual([review.logicalWidth, review.logicalHeight, review.deviceScaleFactor, review.fps], [1920, 1080, .5, 12]);
  pass('renderProfile · default 3840×2160 @ 60 fps · review 854×480 @ 12 fps');
}

const probeSource = String.raw`
  import { appendixCentreline, appendixWallRadius, createIleocecal, createIleocecalAsset, ileocecalDimensions,
    terminalIleumPoint } from './shared/anatomyWatercolor.js';
  import { createHistologyAsset } from './shared/histologyProcedural.js';
  import { createCTAsset, CT_ROI, prepareCTBackdrop } from './shared/ctRenderer.js';
  import { CT } from './shared/detail/ct.js';
  import { mainBox, zoomBox } from './s1.1-5/src/ct-film.js';

  const ns = 'http://www.w3.org/2000/svg';
  function surface(asset, which) {
    const root = document.createElementNS(ns, 'svg');
    root.innerHTML = asset.paint;
    asset.mount(root);
    return [...root.querySelectorAll('canvas')].at(which);
  }

  function readPlate(canvas) {
    const { width, height } = canvas;
    const { data } = canvas.getContext('2d').getImageData(0, 0, width, height);
    let samples = 0, opacity = 0, colored = 0, bottom = 0, total = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (((x + .5) / width * 2 - 1)**2 + ((y + .5) / height * 2 - 1)**2 > .984**2) continue;
        const offset = (y * width + x) * 4;
        const r = data[offset], g = data[offset + 1], b = data[offset + 2], a = data[offset + 3];
        samples++;
        opacity += Number(a === 255);
        total += .2126 * r + .7152 * g + .0722 * b;
        if (y >= height * .925) {
          bottom++;
          colored += Number(r - g >= 12 && r >= b - 5);
        }
      }
    }
    return { mean: total / samples, coverage: opacity / samples, stainedRim: colored / bottom };
  }

  function pixel(canvas, x, y) {
    const density = canvas.width / Math.round(CT_ROI.width * 2.4);
    return [...canvas.getContext('2d').getImageData(Math.floor(x * density), Math.floor(y * density), 1, 1).data];
  }

  window.scienceProbe = async stages => {
    const leg = stages.map(stage => {
      const art = createIleocecal({ stage });
      return { appendix: art.diameter, ileum: art.ilealDiameter, junction: art.valve, distal: art.ileum };
    });
    const dimensions = stages.map(stage => {
      const dim = ileocecalDimensions(stage);
      const maxDiameter = 2 * Math.max(...Array.from({ length: 101 }, (_, i) =>
        appendixWallRadius(stage, dim.appendix, i / 100)));
      return { ...dim, maxDiameter };
    });
    const inlet = [0, .25, .5, .75, 1].map(terminalIleumPoint);
    const root = appendixCentreline('normal', 0);
    const cut = createIleocecalAsset({ stage: 'phlegmon', cutaway: true }).audit.cutaway;
    const cross = createIleocecalAsset({ stage: 'chronic' }).audit.crossSection;
    const slides = stages.map(stage => {
      const asset = createHistologyAsset({ stage, id: 'science-' + stage, seed: 8053 });
      return { stage, ...asset.audit, ...readPlate(surface(asset, 0)) };
    });
    await prepareCTBackdrop();
    const scans = stages.slice(1, 4).map(stage => {
      const asset = createCTAsset({ stage, id: 'science-ct-' + stage });
      const canvas = surface(asset, -1);
      const { audit } = asset;
      const aroundAir = audit.airCenters.map(([x, y]) => ({
        core: pixel(canvas, x, y), neighbor: pixel(canvas, x - 8, y + 1),
      }));
      return { stage, ...audit, appendix: asset.appendix, wall: pixel(canvas, 201, 150)[0],
        stone: pixel(canvas, 185, 144)[0], fluid: pixel(canvas, 176, 146)[0],
        target: [128, 132, 136].map(y => pixel(canvas, 182, y)[0]), aroundAir };
    });
    return { dimensions, leg, inlet, root, cut, cross, slides, scans, roi: CT_ROI, native: CT, mainBox, zoomBox };
  };
`;

async function measureAssets(browser) {
  const { outputFiles } = await build({
    stdin: { contents: probeSource, resolveDir: project, sourcefile: 'science-probe.js' },
    platform: 'browser', bundle: true, write: false, format: 'iife', target: 'chrome120',
    define: { IS_MINIFIED: 'true' },
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  try {
    await page.setContent('<!doctype html><html lang="zh-CN"><body></body></html>');
    await page.addScriptTag({ content: outputFiles[0].text });
    return await page.evaluate(stages => window.scienceProbe(stages), authoredStages);
  } finally {
    await page.context().close();
  }
}

function verifyAnatomy({ dimensions, leg, inlet, root, cut, cross }) {
  for (const [i, item] of dimensions.entries()) {
    const legacy = leg[i];
    assert.ok(0 < item.appendix && item.appendix < item.ileum && item.ileum < item.cecum, authoredStages[i]);
    assert.ok(item.maxDiameter <= item.appendix && item.maxDiameter < item.ileum, `Rendered width · ${authoredStages[i]}`);
    assert.ok(0 < legacy.appendix && legacy.appendix < legacy.ileum);
    assert.ok(legacy.junction.x < legacy.distal.x && legacy.junction.y + 40 < legacy.distal.y);
    if (i > 0 && i <= 3) {
      assert.ok(dimensions[i - 1].appendix < item.appendix);
      assert.ok(leg[i - 1].appendix < legacy.appendix);
    }
  }
  assert.ok(inlet.every((p, i) => !i || p.x < inlet[i - 1].x && p.y < inlet[i - 1].y));
  assert.ok(inlet[0].y - inlet.at(-1).y >= .30 * (inlet[0].x - inlet.at(-1).x));
  assert.ok(root[0] < inlet.at(-1).x && root[1] > inlet.at(-1).y);
  assert.ok(cut.cavityFraction <= .45 && cut.wallFraction * 2 > cut.cavityFraction);
  assert.ok(cross.lumenFraction <= .22);
  pass(`anatomy · cecum ${dimensions[0].cecum}, ileum ${dimensions[0].ileum}, appendices ${dimensions.map(d => d.appendix).join('/')}`);
}

function verifyHistology({ slides }) {
  for (const { stage, mean, coverage, stainedRim } of slides) {
    assert.equal(coverage, 1, `${stage} leaves an uncovered field`);
    if (stage !== 'gangrene') {
      assert.ok(mean >= lumaRange[0] && mean <= lumaRange[1], `${stage} L_mean = ${mean.toFixed(2)}`);
      assert.ok(stainedRim >= .90, `${stage} has a pale/unstained bottom crescent`);
    }
  }
  const [normal, simple, phlegmon, gangrene, chronic] = slides;
  assert.ok(normal.crypts > 0 && normal.follicles > 0);
  assert.ok(simple.shallow >= 200 && simple.muscle >= 3 && simple.muscle <= 5 && simple.crypts > 0);
  assert.ok(phlegmon.shallow + phlegmon.muscle >= 900 && phlegmon.muscle > 300);
  assert.ok(phlegmon.serosalPus >= 150 && phlegmon.fibrin >= 50);
  assert.equal(gangrene.crypts, 0);
  assert.ok(gangrene.thrombosed > 0 && gangrene.fissurePus > 0 && gangrene.fissureRedCells > 0);
  assert.equal(chronic.shallow + chronic.muscle + chronic.freePus + chronic.serosalPus, 0);
  assert.ok(chronic.bundles > 0 && chronic.lymphocytes > 0 && chronic.plasmaCells > 0 && chronic.crypts > 0);
  pass(`H&E · L_mean ${slides.filter(s => s.stage !== 'gangrene').map(s => `${s.stage} ${s.mean.toFixed(2)}`).join(' · ')}`);
  pass(`H&E · simple muscularis ${simple.muscle} · phlegmon transmural ${phlegmon.shallow + phlegmon.muscle} · chronic lymphocytes/plasma cells ${chronic.lymphocytes}/${chronic.plasmaCells}`);
}

function verifyCt({ scans, roi, native, mainBox, zoomBox }) {
  assert.ok(roi.x >= 0 && roi.x + roi.width < native.width / 2);
  assert.ok(roi.y > 0 && roi.y + roi.height < native.height);
  assert.ok(close(mainBox.width / mainBox.height, native.width / native.height));
  assert.ok(close(zoomBox.width / (roi.width * mainBox.width / native.width), 2.4));
  assert.ok(close(zoomBox.height / (roi.height * mainBox.height / native.height), 2.4));
  for (const scan of scans) {
    assert.ok(scan.sameSource && scan.multiplier === 2.4, `${scan.stage}: axial scan and inset are not registered`);
    assert.ok(scan.appendix.x > roi.x && scan.appendix.x < roi.x + roi.width);
    assert.ok(scan.appendix.y > roi.y && scan.appendix.y < roi.y + roi.height);
  }
  const [simple, phlegmon, gangrene] = scans;
  assert.equal(simple.stranding, null);
  assert.equal(simple.gapAngle + simple.gasBubbles + phlegmon.gapAngle + phlegmon.gasBubbles, 0);
  assert.ok(phlegmon.stranding.oppositeDelta > .035 && phlegmon.stranding.radialPaths === 0, 'Fat stranding must be asymmetric and non-radial');
  assert.ok(phlegmon.stone > phlegmon.fluid + 80 && phlegmon.stone > 210, 'Missing eccentric high-attenuation fecalith');
  assert.ok(phlegmon.target[0] > phlegmon.target[1] + 20 && phlegmon.target[2] > phlegmon.target[1] + 20, 'Missing two enhancing rings');
  assert.ok(gangrene.gapAngle >= 30 && gangrene.wall < phlegmon.wall - 55, 'Missing enhancement defect');
  assert.equal(gangrene.aroundAir.length, 4);
  for (const { core, neighbor } of gangrene.aroundAir) {
    assert.deepEqual(core, [0, 0, 0, 255], 'Extraluminal gas must be black');
    assert.ok(neighbor[0] > 15, 'Extraluminal gas is not distinct from surrounding tissue');
  }
  pass('CT pixels · registered right iliac fossa ×2.4 · two rings, eccentric fecalith, wall defect and four black gas bubbles');
}

function instrumentText() {
  const proto = CanvasRenderingContext2D.prototype;
  const fill = proto.fillText;
  window.scienceText = [];
  let capture = false;
  window.scienceCapture = value => { capture = value; };
  proto.fillText = function (value, x, y, ...args) {
    if (capture && this.globalAlpha > .025) {
      const transform = this.getTransform();
      const origin = transform.transformPoint(new DOMPoint(x, y));
      const end = transform.transformPoint(new DOMPoint(x + this.measureText(value).width, y));
      const previous = window.scienceText.at(-1);
      // SVG tspan fragments and colored Canvas caption runs share one rendered line.
      if (previous?.canvas === this.canvas && Math.abs(previous.y - origin.y) < .75
          && Math.abs(previous.end - origin.x) < 2.6) {
        previous.text += value;
        previous.end = end.x;
      } else {
        window.scienceText.push({ text: String(value), y: origin.y, end: end.x, canvas: this.canvas });
      }
    }
    return fill.call(this, value, x, y, ...args);
  };
  window.scienceVisible = element => {
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (node.hidden || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < .025) return false;
    }
    return true;
  };
  window.scienceScreen = () => [...window.scienceText.map(item => item.text.replace(/\s+/gu, ' ').trim()),
    ...[...document.querySelectorAll('#plate text, #plate .story-caption-cn, #plate .story-caption-en')]
      .filter(window.scienceVisible).map(node => node.textContent.replace(/\s+/gu, ' ').trim()),
  ].filter(Boolean);
}

const requiredScreen = {
  S02: ['肚脐', '右髂前上棘', '外 1/3'],
  S03: ['麦氏点（压痛、反跳痛）', '从右髂前上棘向脐量 1/3'],
  S04: ['39.3℃ 高热', '13 × 10⁹/L ↑', '87% ↑', '参考上限 10 × 10⁹/L', '参考上限 75%'],
  S07: ['大体观察 · 肿胀充血'],
  S10: ['急性阑尾炎始终以变质、渗出为主'],
  S11: ['黏膜破溃缺损 · 变质'],
  S12: ['中性粒细胞变形游出 · 渗出'],
  S13: ['纤维素性脓性渗出物', '浆膜'],
  S14: ['纤维素性脓性渗出物', '脓细胞'],
  S15: ['纤维素性脓性渗出', '最常见典型路径 ≠ 每个患者必经的固定流程', '部分早期可及时控制', '部分可迅速恶化'],
  S17: ['阑尾系膜静脉血栓 · 回流受阻'],
  S18: ['出血坏死与全层穿孔'],
  S19: ['典型症状', '体格检查'],
  S20: ['重要辅助工具，非人人必做', '多层螺旋 CT 诊断敏感度 > 93%', '成人疑似急性阑尾炎'],
  S21: ['周围脂肪间隙清晰', '双环靶征', '偏心粪石', '非对称斑片状脂肪条索', '强化管壁局部缺损', '盲肠旁脓肿与腔外游离气泡', '2.4×'],
  S22: ['尽快外科评估', '弥漫性腹膜炎 · 通常需紧急手术', '局限性脓肿'],
  S23: ['修复性增生', '狭窄星形管腔'],
  S24: ['淋巴细胞', '浆细胞', '一旦确诊，通常建议在症状缓解期择期切除；', '若正处于急性发作期，则视情况急诊手术。'],
  S25: ['腹痛转移到右下腹，或持续加重', '尽快就医'],
  S26: ['病理学[M]', 'CD009977', 'Jerusalem Guidelines', '710–715'],
};

function verifyScreenWords(id, texts) {
  for (const value of texts) checkedText(value, id + ' screen');
  const all = texts.join('\n');
  if (!['S23', 'S24'].includes(id)) assert.doesNotMatch(all, acute, id);
  if (id === 'S07') assert.doesNotMatch(all, /单纯性|化脓性|坏疽性/u, id);
  if (id === 'S04') assert.doesNotMatch(all, /(?<!39\.3)℃ 高热/u, id);
  if (id === 'S13' || id === 'S14') assert.doesNotMatch(all, /单纯(?:的)?纤维素/u, id);
  if (id === 'S17') assert.doesNotMatch(all, /核溶解|全层浸润|血供.{0,6}彻底/u, id);
  for (const term of requiredScreen[id] ?? []) assert.ok(all.includes(term), `${id} missing screen wording: ${term}`);
}

function measureLandmarks(seconds) {
  const proto = CanvasRenderingContext2D.prototype;
  const original = Object.fromEntries(['beginPath', 'moveTo', 'lineTo', 'stroke'].map(name => [name, proto[name]]));
  const paths = new WeakMap();
  const segments = [];
  proto.beginPath = function () {
    paths.set(this, []);
    return original.beginPath.call(this);
  };
  for (const name of ['moveTo', 'lineTo']) {
    proto[name] = function (x, y) {
      paths.get(this)?.push(this.getTransform().transformPoint(new DOMPoint(x, y)));
      return original[name].call(this, x, y);
    };
  }
  proto.stroke = function (...args) {
    const points = paths.get(this);
    if (!args.length && points?.length === 2 && this.getLineDash().length) {
      segments.push(points.map(({ x, y }) => [x, y]));
    }
    return original.stroke.apply(this, args);
  };
  try {
    return { ...window.anatomyAt(seconds), segments };
  } finally {
    Object.assign(proto, original);
  }
}

async function verifyStageEvidence(page, section) {
  const seconds = (id, p) => {
    const cue = section.sheet.cues.find(cue => cue.id === id);
    return cue.start + cue.duration * p;
  };
  if (section.index === 0) {
    for (const id of ['S02', 'S03']) {
      const { navel, asisR, mcburney, segments } = await page.evaluate(measureLandmarks, seconds(id, .9));
      assert.ok(asisR.x < mcburney.x && mcburney.x < navel.x && asisR.y - navel.y >= 100, id);
      for (const axis of ['x', 'y']) assert.ok(close(mcburney[axis], asisR[axis] + (navel[axis] - asisR[axis]) / 3), id);
      assert.ok(segments.some(([[x1, y1], [x2, y2]]) =>
        close(x1, navel.x) && close(y1, navel.y) && close(x2, asisR.x) && close(y2, asisR.y)),
      `${id} does not draw a straight dashed navel–right ASIS reference`);
    }
  }
  if (section.index === 2) {
    const states = await page.evaluate(times => times.map(t => {
      window.renderAt(t);
      return window.artCounts();
    }), [seconds('S11', .91), seconds('S12', .30), seconds('S12', .92)]);
    assert.ok(states[0].clefts.every(([, width]) => width < 1) && states[0].migrated === 0, 'S11 endothelium');
    assert.ok(states[1].crossingCells > 0 && states[1].clefts.some(([, width]) => width > 10), 'S12 diapedesis');
    assert.ok(states[2].migrated > 0 && states[2].clefts.every(([, width]) => width < 1), 'S12 transient clefts');
    assert.ok(states[2].infiltrate >= 900 && states[2].highPowerCells >= 140, 'S13/S14 infiltration and pus');
  }
  if (section.index === 3) {
    const { scene, anchor, lines, pixel } = await page.evaluate(t => {
      window.renderAt(t);
      const scene = window.gate1SceneInfo.S17;
      const aperture = document.getElementById('s17-gross-clot-aperture');
      const anchor = ['cx', 'cy'].map(key => Number(aperture.getAttribute(key)));
      const lines = [...document.querySelectorAll('#s17-tangents line')].map(el =>
        ['x1', 'y1'].map(key => Number(el.getAttribute(key))));
      const panel = document.getElementById('s17-organ-body');
      const point = new DOMPoint(...anchor).matrixTransform(panel.getCTM().inverse());
      const canvas = panel.firstElementChild;
      const localX = point.x / Number(panel.getAttribute('width')) * canvas.width;
      const localY = point.y / Number(panel.getAttribute('height')) * canvas.height;
      const pixel = [...canvas.getContext('2d').getImageData(localX, localY, 1, 1).data];
      return { scene, anchor, lines, pixel };
    }, seconds('S17', .92));
    assert.deepEqual(lines, [anchor, anchor], 'S17 tangents do not start at the clot');
    assert.deepEqual(anchor, [scene.source.x, scene.source.y], 'S17 aperture is detached from the vein');
    assert.ok(pixel[0] - pixel[1] > 20 && pixel[2] - pixel[1] > 12 && pixel[3] === 255, 'S17 source point does not contain the clot pigment');
  }
  if (section.index === 4) {
    const { main, markers, roi } = await page.evaluate(t => {
      window.renderAt(t);
      function edges(node) {
        const { left, top, right, bottom, width, height } = node.getBoundingClientRect();
        return { left, top, right, bottom, width, height };
      }
      return { main: edges(document.querySelector('[data-ct-box="main"]')),
        markers: [...document.querySelectorAll('[data-ct-orientation] text')].slice(0, 2)
          .map(node => ({ ...edges(node), value: node.textContent })),
        roi: edges(document.querySelector('[data-ct-roi]')) };
    }, seconds('S21', .5));
    assert.deepEqual(markers.map(m => m.value), ['R', 'L']);
    for (const mark of markers) {
      assert.ok(mark.left >= main.left && mark.right <= main.right && mark.top >= main.top && mark.bottom < main.top + 60);
    }
    assert.ok(markers[0].left < main.left + 35 && markers[1].right > main.right - 35);
    assert.ok(roi.left > main.left && roi.right < main.left + main.width / 2);
  }
  if (section.index === 5) {
    // These are the actual transparent entry layers that get baked for B07.
    for (const part of ['notes', 'subject']) {
      const words = await page.evaluate(part => {
        window.scienceText.length = 0;
        window.renderBridgeEntry(part);
        return window.scienceScreen().join(' ');
      }, part);
      assert.doesNotMatch(words, acute, `B07/${part}`);
    }
  }
}

async function verifyRenderedText(browser, source) {
  const profile = { ...getRenderProfile(), deviceScaleFactor: 1 };
  const sections = planSections(source, undefined, profile);
  for (const section of sections) {
    await withStage(browser, section, profile, async (page, reload, check) => {
      await page.addInitScript(instrumentText);
      const imageRequests = [];
      page.on('request', request => {
        if (request.resourceType() === 'image') imageRequests.push(request.url());
      });
      await reload(true);
      for (const cue of section.sheet.cues) {
        const words = await page.evaluate(({ start, duration, id, checkpoints }) => {
          const result = new Set();
          for (const progress of checkpoints) {
            window.scienceText.length = 0;
            window.scienceCapture(true);
            const frame = window.renderAt(start + progress * duration);
            window.scienceCapture(false);
            if ((frame.id ?? frame.cue?.id) !== id) throw new Error('Wrong scene: ' + id);
            for (const words of window.scienceScreen()) result.add(words);
          }
          return [...result];
        }, { ...cue, checkpoints });
        verifyScreenWords(cue.id, words);
        check();
      }
      await verifyStageEvidence(page, section);
      assert.ok(imageRequests.every(url => url.startsWith('blob:')), 'Film requested an image file or data URL');
      check();
    });
  }
  pass('34 production scenes · visible Chinese/English text · McBurney geometry, diapedesis, clot anchor and axial R/L');
}

try {
  const source = await readCueSheets();
  await verifySource();
  await verifyCues(source);
  verifyProfiles();
  const browser = await launchBrowser();
  try {
    const assets = await measureAssets(browser);
    verifyAnatomy(assets);
    verifyHistology(assets);
    verifyCt(assets);
    await verifyRenderedText(browser, source);
  } finally {
    await browser.close();
  }
  console.log('SCIENCE INVARIANTS · 100% PASS');
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
