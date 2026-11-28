import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { isBuiltin } from 'node:module';
import { build } from 'esbuild';
import { assertBlindReviewText } from '../shared/blindReview.js';
import { CAPTION_HAN_LIMIT, prepareProductionSubtitles, spokenHanCount } from '../shared/cueCaptions.js';
import { CAPTION_SAFE_Y, STORY_ART_BOTTOM, storySubtitleAt } from '../shared/canvasCore.js';
import { DEFAULT_PROFILE, bridgeScale, getRenderProfile, inkTick, renderProfile, tempoScale, videoDimensions } from '../shared/renderProfile.js';
import { CREDITS_TIMING, cueDurationMs } from '../shared/timelineHelper.js';
import { REFERENCES } from '../shared/references.js';
import { ENGLISH_FONT, HAND_FONT, NUMERAL_FONT, SANS_FONT, SERIF_FONT } from '../shared/fonts.js';
import { planSections } from './build_master_all.mjs';
import { formatTextForTTS, readCueSheets, recommendedTts } from './export_tts_sheet.mjs';
import { launchBrowser, prepareBridgePlates, project, withStage } from './render_master_sections.mjs';

const acute = /增[生殖]|\bproliferat(?:ion|ive|e\w*)\b/iu;
const obsoleteSensitivity = /(?:98[.．]7|97)\s*%|百分之(?:九十七|九十八点七)/u;
const obsoleteRevision = /两者都是腹膜刺激征|沿虚线纵切|切开阑尾|剖开|外现特征|愤怒的蛛网|烧穿|烧到|修复性增生|蜂窝织炎性|每升一百三十亿|每升四十到一百亿|每升一百一十三亿|每升二十到七十亿|本例参考三十六|修复性的增生|散在(?:的)?寥寥|reparative proliferation/iu;
const bareDiagnosis = /(?:单纯性|化脓性|坏疽性)(?!阑尾炎)/u;
const offModel = /\u8fc7\u654f\u53cd\u5e94|\u9ecf\u819c\u539f\u53d1(?:\u6027)?\u6e83\u75a1|\u539f\u53d1(?:\u6027)?\u9ecf\u819c\u6e83\u75a1|allergic reaction|primary mucosal ulcer/iu;
const smartApostrophes = /[\u2018\u2019\u201b\u02bb\u02bc\uff07]/u;
const rasterFile = /\.(?:png|jpe?g|webp|avif|gif|bmp|tiff?)$/iu;
const sourceFile = /\.(?:[cm]?js|[cm]?ts|jsx|tsx|json|html|css|svg|md)$/iu;
const localLeak = /\b(?:T[O]DO|F[I]XME)\b|\bs[k][-][A-Za-z0-9_-]{12,}|\b[a-z]:[\\/](?=[^\s'"`)])|\/(?:[U]sers|[h]ome)\/[\p{L}\d._-]+|[\p{Script=Han}]{1,4}\u8001\u5e08/iu;
const nameDigests = new Map();
for (const [length, digest] of [[3,"02cef0d13500922533c5"],[3,"339995a414573e8d925e"],[2,"fafec8d98ba983aaf55f"],[3,"5d79ae6b827cd786a28d"],[3,"6f8f8866f6432bd1d762"],[3,"8370da4706ed3efdb5db"],[3,"782a39e6d7543032fda9"],[5,"c7d3c218354515024dcb"],[17,"79e20c0a475dc907c8e5"],[10,"8662e00a304101db8bb2"],[10,"5c9abe0e466fb13eba53"]]) {
  if (!nameDigests.has(length)) nameDigests.set(length, new Set());
  nameDigests.get(length).add(digest);
}
const skips = new Set(['.git', 'node_modules', 'out', 'frames', 'audio', 'external_tts']);
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
  assert.ok(!obsoleteRevision.test(value.normalize('NFKC')), `${location} contains retired revision wording`);
  assert.doesNotMatch(value, localLeak, `${location} has a private path, token, or unfinished marker`);
  assert.doesNotMatch(value, offModel, `${location} contains a prohibited etiology model`);
}

const referenceHashes = [
  '170f8746547233a89f70fed8a152e355f7cff38195ab1e3877a2c119662d1a92',
  '510133525f7b17bd89846a275996be98847e72011d615837aaf374ae5d2ba989',
  '597ff847e88f5724095bddb8c03635140c464ef48a5812613dc8e314a5d53c9b',
  'd8b39786b145438fcad3c0047c7e68cb63ac0aa40a1c0a7da5671793631df77e',
  'a48fa6f8cb4473eb5b44de3f566c7fac14122265e3d75a0e5f0d581e7c6238a1',
];

function verifyReferenceRows() {
  assert.equal(REFERENCES.length, referenceHashes.length);
  REFERENCES.forEach((row, i) =>
    assert.equal(createHash('sha256').update(row).digest('hex'), referenceHashes[i], 'S26 citation ' + (i + 1)));
  return REFERENCES.slice(0, 3);
}

function checkNames(source, location, digestsByLength = nameDigests) {
  const lower = source.normalize('NFKC').toLowerCase();
  const check = candidate => {
    const digests = digestsByLength.get(candidate.length);
    if (!digests) return;
    const token = createHash('sha256').update(candidate).digest('hex').slice(0, 20);
    assert.ok(!digests.has(token), `${location} matches a redacted publication name`);
  };
  for (const text of lower.match(/\p{Script=Han}+/gu) ?? []) {
    for (let i = 0; i < text.length - 1; i++) {
      check(text.slice(i, i + 2));
      if (i < text.length - 2) check(text.slice(i, i + 3));
    }
  }
  for (const [, phrase] of lower.matchAll(/\b(?=([a-z]+(?:[ -][a-z]+){1,2})\b)/gu)) {
    const words = phrase.split(/[ -]/u);
    check(words.slice(0, 2).join(''));
    if (words.length === 3) check(words.join(''));
  }
}

async function* projectFiles(directory = '') {
  for (const entry of await readdir(localPath(directory), { withFileTypes: true })) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory() && !skips.has(entry.name)) yield* projectFiles(relative);
    else if (entry.isFile()) yield relative;
  }
}

async function verifySource() {
  const textbooks = verifyReferenceRows();
  let files = 0;
  let fontAssignments = 0;
  const modules = new Set();
  const rootMeta = JSON.parse(await readFile(path.join(project, '..', 'package.json'), 'utf8'));
  for await (const file of projectFiles()) {
    assert.ok(!rasterFile.test(file), `Static raster in source tree: ${file}`);
    if (!sourceFile.test(file) || ['scripts/verify_science_invariants.mjs', 'shared/blindReview.js',
      'package-lock.json'].includes(file)) continue;
    const source = await read(file);
    checkedText(source, file);
    const nameScope = file === 'shared/references.js'
      ? textbooks.reduce((body, entry) => body.replace(`  '${entry}',`, ''), source) : source;
    checkNames(nameScope, file);
    files++;
    for (const [, , token] of source.matchAll(/\b(?:from\s+|import\s*(?:\(\s*)?)(['"])([^'"\s]+)\1/gu)) {
      if (isBuiltin(token) || token.startsWith('.') || token.startsWith('#')) continue;
      const name = token.split('/').slice(0, token.startsWith('@') ? 2 : 1).join('/');
      modules.add(name);
      assert.ok(Object.hasOwn(rootMeta.dependencies, name), `${file} dependency ${name} is absent from root package.json`);
    }
    // Audit/render utilities can encode their own diagnostic screenshots.
    const live = /^shared\//u.test(file) && !/\/(?:render_|assetsAuditBoard|verify-cues)/u.test(file)
      || /^s1\.1-\d\/(?:src\/|(?:main|gate1|scene-tools|s1[5-8]|vein-lens|rupture-mist|acute-washes)\.mjs$|[^/]+\.html$)/u.test(file);
    if (!live) continue;
    const body = file === 'shared/detail/bridgePlates.js'
      ? source.replace('/bridge-plates/${part}.png', '') : source;
    assert.ok(!/data\s*:\s*image\/|['"`][^'"\x60\r\n]*\.(?:png|jpe?g|webp|avif|gif|bmp|tiff?)(?:[?#][^'"\x60\r\n]*)?['"`]/iu.test(body),
      `${file} contains a raster URL or encoded texture`);
    assert.doesNotMatch(body, /;base64,|\b(?:atob|btoa)\s*\(/iu, `${file} embeds encoded data`);
    assert.doesNotMatch(body, /\bloadImage\s*\(/u, `${file} calls the raster loader`);
    const assignments = [...body.matchAll(/\b\w+\.font\s*=(?!=)/gu)].length;
    if (assignments) assert.match(body, /fonts\.js['"]/u, `${file} font calls bypass the shared fallback stacks`);
    fontAssignments += assignments;
  }
  const roster = [
    ['s1.1-1/src', 'patient.js', 'drawMinimalPatient'],
    ['s1.1-5/src', 'diagnosis.js', 'drawMinimalDoctor'],
    ['s1.1-6/src', 'homecoming.js', 'drawMinimalPatient'],
  ];
  for (const [directory, owner, renderer] of roster) {
    const found = [];
    for await (const file of projectFiles(directory)) {
      if (!sourceFile.test(file)) continue;
      const source = await read(file);
      assert.doesNotMatch(source, /\b(?:drawPatient|drawDoctor)\s*\(|from\s+['"][^'"]+charactersAndHistology\.js['"]/u,
        `${file} imports an obsolete portrait renderer`);
      if (source.includes('shared/minimalistCharacters.js')) {
        assert.ok(source.includes(renderer), file);
        found.push(path.posix.basename(file));
      }
    }
    assert.deepEqual(found, [owner]);
  }
  for (const font of [ENGLISH_FONT, HAND_FONT, NUMERAL_FONT, SANS_FONT, SERIF_FONT]) {
    assert.match(font, /Microsoft YaHei/u);
    assert.match(font, /PingFang SC|Songti SC/u);
    assert.match(font, /, (?:sans-serif|serif)$/u);
  }
  const metadata = await json('package.json');
  for (const key of ['author', 'contributors', 'studentId', 'school', 'affiliation', 'supervisor']) {
    assert.ok(!Object.hasOwn(metadata, key), `Unblinded package metadata key: ${key}`);
  }
  const references = await read('shared/references.js');
  // Journal pagination is excluded from the year scan by its volume(issue): pages form.
  const dates = references.replace(/\b\d+\(\d+\):\s+\d+[-–]\d+/gu, '');
  const years = [...dates.matchAll(/\b\d{4}\b/gu)].map(([year]) => Number(year));
  assert.deepEqual(years, [2024, 2024, 2024, 2024, 2025, 2026]);
  assert.ok(years.every(year => year >= 2023 && year <= 2026));
  for (const term of ['崔慧先', '卞修武', '陈孝平', 'Surg Endosc, 2024', 'JAMA Surg, 2026', 'Podda M']) {
    assert.ok(references.includes(term), 'S26 citation missing ' + term);
  }
  pass('S26 · 5 exact references · 2024–2026 · journal pages excluded from year detection');
  const sample = '测试名';
  const sampleDigest = createHash('sha256').update(sample).digest('hex').slice(0, 20);
  assert.throws(() => checkNames(sample, 'synthetic probe', new Map([[sample.length, new Set([sampleDigest])]])),
    /matches a redacted/u);
  pass(`${files} sources · 0 known name, privacy or banned wording hits · ${modules.size} dependency roots · ${fontAssignments} canvas font assignments · 3 Style D entry points`);
}

async function verifyRepository(source) {
  const root = path.join(project, '..');
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
  const files = [...new Set(git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0').filter(Boolean))];
  const staged = git('diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR').split('\0').filter(Boolean);
  const media = /\.(?:png|jpe?g|webp|mp4|wav|mp3)$/iu;
  assert.equal(git('branch', '--show-current').trim(), 'main');
  assert.ok(staged.every(file => !media.test(file)), 'Staged media or audit image');
  assert.ok(files.every(file => !media.test(file)), 'Media in tracked/candidate files');
  for (const file of files) {
    const full = path.join(root, file);
    const info = await stat(full);
    assert.ok(info.size <= 5_000_000, `${file} exceeds 5 MB`);
    if (sourceFile.test(file) && !file.startsWith('s1.1/') || /(?:package-lock\.json|\/out\/.*\.json)$/u.test(file)) {
      const value = await readFile(full, 'utf8');
      checkedText(value, file);
      checkNames(value, file);
    }
  }
  for (const { original, sheet } of source.sheets) checkedText(original.toString('utf8'), sheet.module);
  const ignores = ['s1.1/out/frames-strict/frame.png', 's1.1/out/strict_story_audit.png', 'preview.mp4',
    'preview.wav', 'preview.mp3', 'node_modules/probe/package.json', '.env.stage', '.envrc'];
  assert.equal(git('check-ignore', ...ignores).trim().split(/\r?\n/u).length, ignores.length);
  const [renderer, builder] = await Promise.all([read('scripts/render_master_sections.mjs'), read('scripts/build_master_all.mjs')]);
  assert.match(renderer, /['"]image2pipe['"]/u);
  assert.match(renderer, /child\.stdin\.write\(png/u);
  assert.match(renderer, /profile\.reloadIntervalFrames/u);
  assert.match(renderer, /await browser\.close\(\)/u);
  assert.match(builder, /totalmem\(\)\s*>\s*24/u);
  assert.match(builder, /await canResume\(/u);
  assert.match(builder, /await checkSegment\(/u);
  assert.match(builder, /record\.sha256\s*!==\s*await shaFile/u);
  assert.match(builder, /force\s*\|\|\s*!(?:await )?canResume/u);
  assert.ok(getRenderProfile().reloadIntervalFrames > 0);
  pass(`${files.length} tracked/candidate files · main · 0 over 5 MB · 0 staged media · ${ignores.length} ignored-path probes`);
}

async function verifyCues(source) {
  const speech = source.cues.filter(cue => cue.type === 'speech');
  assert.equal(speech.length, 25);
  const bridges = source.cues.filter(cue => cue.type === 'bridge');
  assert.equal(bridges.length, 9);
  assert.equal(bridges.at(-1).id, 'B08');
  assert.equal(bridges.at(-1).defaultDuration, 1.4);
  assert.ok(bridges.every(cue => cueDurationMs(cue) >= 1300 && cueDurationMs(cue) <= 2100));
  const credits = source.cues.at(-1);
  assert.equal(credits.defaultDuration, CREDITS_TIMING.duration);
  const budget = source.cues.reduce((sum, cue) => sum + cueDurationMs(cue), 0) / 1000;
  assert.ok(budget >= 315 && budget <= 335, `Native budget ${budget}`);
  const authored = new Map(source.sheets.flatMap(({ sheet }) => sheet.cues).map(cue => [cue.id, cue]));
  const required = {
    S02: [/内脏神经/u, /visceral nerves/u],
    S03: [/右下腹.*麦氏点.*右髂前上棘.*压痛.*反跳痛.*腹肌紧张.*腹膜刺激征.*核心体征.*松手牵拉腹膜/u,
      /McBurney's point.*right ASIS.*Tenderness.*rebound tenderness.*guarding.*core markers.*peritoneal involvement/u],
    S04: [/体温明显升高.*白细胞总数.*中性粒细胞计数增高/u, /body temperature.*white blood cell.*neutrophil counts/iu],
    S07: [/浆膜面毛细血管.*烧红的铁丝网.*暗红/u, /serosal capillaries.*red-hot wire mesh.*dark red/u],
    S08: [/急性化脓性阑尾炎.*急性蜂窝织性阑尾炎.*外观特征/u, /gross external appearance of acute suppurative.*acute phlegmonous.*appendicitis/u],
    S09: [/阑尾壁各层浸润大量中性粒细胞.*灰黄色脓苔/u, /neutrophils infiltrate all layers.*gray-yellow purulent coat/u],
    S10: [/阑尾炎的本质主要是炎症.*变质.*渗出/u, /inflammation.*tissue alteration and exudation/u],
    S11: [/梗阻—感染.*以粪石为主.*腔内压升高.*缺血.*细菌感染.*黏膜变性坏死脱落.*变质/u,
      /obstruction-infection.*fecalith.*pressure.*ischemia.*bacterial invasion.*mucosal necrosis/u],
    S12: [/组胺.*缓激肽.*前列腺素.*趋化因子.*通透性升高.*血浆被挤出或漏出.*边集、滚动、黏附.*阿米巴样运动主动游出/u,
      /histamine, bradykinin, prostaglandins, chemokines.*plasma leaks out.*neutrophils actively emigrate.*margination, rolling, adhesion.*amoeboid diapedesis/u],
    S13: [/链激酶.*激活纤溶酶原.*促进纤维素降解.*透明质酸酶.*急性蜂窝织性阑尾炎/u,
      /streptokinase activates plasminogen to degrade fibrin.*hyaluronidase.*acute phlegmonous appendicitis/u],
    S14: [/^在浆膜面，.*脓细胞.*纤维素性脓性渗出物.*灰黄色脓苔/u,
      /^On the serosal surface,.*pus cells.*fibrinous-purulent exudate.*gray-yellow purulent coat/u],
    S15: [/急性单纯性阑尾炎.*急性化脓性阑尾炎.*急性坏疽性阑尾炎.*并非每位患者/u, /not every patient follows/u],
    S16: [/急性单纯性阑尾炎.*黏膜和黏膜下层.*肌层与浆膜层.*轻度水肿.*少量中性粒细胞浸润/u,
      /mucosa and submucosa.*mild edema and sparse neutrophil infiltration.*muscularis and serosa/u],
    S17: [/急性化脓性阑尾炎.*阑尾壁动脉.*阑尾系膜静脉.*动静脉双重受阻.*缺血坏死/u,
      /mural arteries.*mesoappendiceal vein thrombosis.*dual vascular obstruction.*ischemia and necrosis/u],
    S18: [/腐败菌.*急性坏疽性阑尾炎.*穿孔不一定伴有坏疽.*画等号/u,
      /putrefactive infection.*gangrenous appendicitis.*perforation does not require gangrene/u],
    S19: [/转移性右下腹痛.*体格检查.*反跳痛与腹肌紧张/u, /migratory right lower quadrant pain.*physical exam.*rebound.*guarding/u],
    S20: [/多层螺旋CT.*辅助确诊工具.*百分之九十三.*并非人人必做/u, /multidetector CT.*diagnostic aid.*93% sensitivity.*not required for every patient/u],
    S21: [/急性单纯性阑尾炎.*急性化脓性阑尾炎.*急性坏疽性阑尾炎.*管壁强化缺损.*盲肠旁脓肿.*游离气体/u,
      /target sign.*fecalith.*fat stranding.*wall enhancement defect.*abscess.*free air/u],
    S22: [/未穿孔的急性化脓性阑尾炎.*尽早手术切除.*急性坏疽性阑尾炎.*尽快外科评估.*弥漫性腹膜炎.*局限性脓肿.*引流/u,
      /Unperforated acute suppurative appendicitis.*prompt appendectomy.*urgent surgical review.*diffuse peritonitis.*localized abscess/u],
    S23: [/慢性阑尾炎.*炎症刺激导致的增生.*纤维化/u, /chronic appendicitis.*inflammation-induced proliferation/u],
    S24: [/淋巴细胞与浆细胞.*缓解期择期切除.*急性发作期.*急诊手术/u, /interval elective surgery.*emergency surgery during acute flares/u],
  };
  const durations = [6.9, 9.8, 28.8, 11.4, 11, 7.3, 10.7, 12.9, 12.6, 7.1, 12.2, 21.1, 22.3,
    13.9, 14.1, 13.9, 12.6, 19.2, 14.3, 11.7, 19.6, 18.7, 14.6, 16, 12.6];
  const ranges = /36–37|4–10|2–7/u;
  const labs = await read('s1.1-1/src/labs.js');
  for (const term of ['36–37℃', '4–10×10⁹/L', '2–7×10⁹/L']) assert.ok(labs.includes(term), 'S04 graph ' + term);
  const serosa = await read('s1.1-3/src/serosa.mjs');
  assert.doesNotMatch(serosa, /各层浸润大量中性粒细胞|macro-underline/u);
  assert.equal(CAPTION_HAN_LIMIT, 28);
  for (const [i, cue] of speech.entries()) {
    const { id, zhText, enText, defaultDuration } = cue;
    const { highlightZh } = authored.get(id);
    assert.equal(id, `S${String(i + 1).padStart(2, '0')}`);
    for (const line of [zhText, enText]) checkedText(line, id);
    if (!['S23', 'S24'].includes(id)) assert.ok(!acute.test(zhText + ' ' + enText), `${id} presents proliferation outside the chronic scenes`);
    assert.equal(defaultDuration, durations[i], id + ' raw duration');
    assert.doesNotMatch(zhText, bareDiagnosis, id);
    if (id === 'S04') assert.doesNotMatch(zhText, ranges, id);
    assert.ok(!smartApostrophes.test(enText), `${id} uses a non-ASCII apostrophe`);
    if (required[id]) {
      assert.match(zhText, required[id][0], id);
      assert.match(enText, required[id][1], id);
    }
    if (id === 'S11') assert.doesNotMatch(zhText + ' ' + enText, offModel, id);
    assert.ok(Array.isArray(highlightZh) && highlightZh.length && highlightZh.every(term => term && zhText.includes(term)),
      `${id} has missing or unsynced Chinese highlights`);
    for (const term of highlightZh) checkedText(term, `${id} highlight`);
    // The comparison scene has its own bilingual pages, exercised with the CT layers below.
    if (id === 'S21') continue;
    const { pages, pageEnds } = prepareProductionSubtitles({ ...cue, highlightZh });
    const total = spokenHanCount(zhText);
    if (total > 34) assert.ok(pages.length >= 2 && pages.length <= Math.max(4, Math.ceil(total / 28)), id);
    const chinese = pages.map(page => page.zh.map(run => run.text).join(''));
    assert.equal(chinese.join(''), zhText, id);
    const compact = text => text.replace(/\s+/gu, '');
    assert.equal(compact(pages.map(page => page.en).join('')), compact(enText), id);
    let accumulated = 0;
    for (const [j, text] of chinese.entries()) {
      const length = spokenHanCount(text);
      assert.ok(length > 0 && length <= CAPTION_HAN_LIMIT, id + ' subtitle page ' + (j + 1));
      assert.equal(storySubtitleAt({ pages, pageEnds }, (pageEnds[j] + (pageEnds[j - 1] ?? 0)) / 2).page, pages[j]);
      accumulated += length;
      assert.equal(pageEnds[j], accumulated / total, id + ' subtitle timing');
      assert.doesNotMatch(pages[j].en, /[\r\n]/u, id);
    }
  }
  const local = await json('s1.1-5/cues_s1.1-5.json');
  const scriptWords = sheet => sheet.cues.map(({ id, zhText, enText, highlightZh, defaultDuration }) =>
    ({ id, zhText, enText, highlightZh, defaultDuration }));
  assert.deepEqual(scriptWords(local), scriptWords(source.sheets[4].sheet), 'S19–S22 standalone text differs from the master build');
  const tts = await json('out/tts_cue_sheet.json');
  assert.deepEqual(tts.map(({ outputPath, ...cue }) => cue),
    speech.map(cue => ({ ...cue, zhText: formatTextForTTS(cue.zhText), ...recommendedTts })),
    'Re-export the edited narration sheet');
  assert.doesNotMatch(tts.find(({ id }) => id === 'S04').zhText, ranges, 'S04 TTS');
  for (const { outputPath, id } of tts) assert.equal(outputPath, `s1.1/external_tts/${id}.wav`);
  pass(`25 bilingual cues · 24 Han-paced cues ≤ 28 Han · S21 uses fixed CT pages · TTS and 9 bridges · native budget ${budget.toFixed(3)} s`);
  let cursor = 0;
  const timings = source.cues.map(cue => {
    const spoken = cue.type === 'speech' ? formatTextForTTS(cue.zhText) : '';
    const units = spokenHanCount(spoken) + (spoken.match(/[A-Z0-9]/gu) ?? []).length;
    const milliseconds = cueDurationMs(cue);
    const rate = units * 1000 / milliseconds;
    if (units) assert.ok(rate >= 2.5 && rate <= 6.2, `${cue.id} speech rate ${rate}`);
    const row = {
      id: cue.id, module: cue.module, type: cue.type, start: cursor / 1000,
      duration: milliseconds / 1000, units, rate: Number(rate.toFixed(3)),
    };
    cursor += milliseconds;
    return row;
  });
  console.table(timings);
}

function verifyProfiles() {
  const master = getRenderProfile();
  const review = getRenderProfile('review');
  assert.equal(DEFAULT_PROFILE, 'master');
  assert.equal(renderProfile, master);
  assert.deepEqual(videoDimensions(master), { width: 3840, height: 2160 });
  assert.deepEqual([master.logicalWidth, master.logicalHeight, master.deviceScaleFactor, master.fps], [1920, 1080, 2, 60]);
  assert.deepEqual([master.videoCodec, master.profile, master.level, master.pixFmt], ['libx264', 'high', '5.2', 'yuv420p']);
  assert.deepEqual(videoDimensions(review), { width: 854, height: 480 });
  assert.deepEqual([review.logicalWidth, review.logicalHeight, review.deviceScaleFactor, review.fps], [1920, 1080, .5, 12]);
  assert.equal(getRenderProfile('review15').fps, 15);
  const peer = getRenderProfile('teammate_1080p36');
  assert.deepEqual(videoDimensions(peer), { width: 1920, height: 1080 });
  assert.deepEqual([peer.deviceScaleFactor, peer.fps, peer.profile, peer.level, peer.pixFmt],
    [1, 36, 'high', '4.2', 'yuv420p']);
  assert.deepEqual([peer.tempoScale, peer.bridgeScale], [tempoScale, bridgeScale]);
  assert.deepEqual([tempoScale, bridgeScale, master.tempoScale, master.bridgeScale], [1.15, .8, 1.15, .8]);
  assert.deepEqual(CREDITS_TIMING, { duration: 6.5, fadeIn: .6, fadeOut: .8 });
  assert.equal(inkTick(2.39), 11);
  assert.equal(cueDurationMs({ id: 'S01', defaultDuration: 11.5 }), 10000);
  assert.equal(cueDurationMs({ id: 'S01', defaultDuration: 11.5, effectiveDuration: 11.37 }), 11370);
  pass('renderProfile · master 3840×2160 @ 60 fps · teammate 1920×1080 @ 36 fps · review 12/15 fps · native 1.15×/0.80 bridge');
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
  assert.ok(cross.lumenFraction <= .22 && cross.folds >= 3 && cross.folds <= 4);
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
  assert.ok(simple.shallow >= 200 && simple.muscle >= 4 && simple.muscle <= 5 && simple.crypts > 0);
  assert.ok(simple.serosalNeutrophils >= 2 && simple.serosalNeutrophils <= 3);
  assert.ok(simple.muscleEdema > 0 && simple.serosalEdema > 0 && simple.serosalPus === 0);
  assert.ok(phlegmon.shallow + phlegmon.muscle >= 900 && phlegmon.muscle > 300);
  assert.ok(phlegmon.serosalPus >= 150 && phlegmon.fibrin >= 50);
  assert.equal(gangrene.crypts, 0);
  assert.ok(gangrene.thrombosed >= 3 && gangrene.thrombosed <= 4 && gangrene.fissurePus > 0 && gangrene.fissureRedCells > 0);
  assert.ok(gangrene.clouds >= 18 && gangrene.clouds <= 24 && gangrene.ghostField >= 420 && gangrene.ghostField <= 550);
  assert.ok(gangrene.mucosalDebris > 0 && gangrene.fissureExit > 350);
  assert.equal(chronic.shallow + chronic.muscle + chronic.freePus + chronic.serosalPus, 0);
  assert.ok(chronic.bundles > 0 && chronic.lymphocytes > 0 && chronic.plasmaCells > 0 && chronic.crypts > 0);
  pass(`H&E · L_mean ${slides.filter(s => s.stage !== 'gangrene').map(s => `${s.stage} ${s.mean.toFixed(2)}`).join(' · ')}`);
  pass(`H&E · simple muscle/serosa neutrophils ${simple.muscle}/${simple.serosalNeutrophils} and edema in both layers · phlegmon transmural ${phlegmon.shallow + phlegmon.muscle} · chronic lymphocytes/plasma cells ${chronic.lymphocytes}/${chronic.plasmaCells}`);
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
      const metrics = this.measureText(value);
      const end = transform.transformPoint(new DOMPoint(x + metrics.width, y));
      const bottom = transform.transformPoint(new DOMPoint(x, y + metrics.actualBoundingBoxDescent)).y;
      const previous = window.scienceText.at(-1);
      // SVG tspan fragments and colored Canvas caption runs share one rendered line.
      if (previous?.canvas === this.canvas && Math.abs(previous.y - origin.y) < .75
          && Math.abs(previous.end - origin.x) < 2.6) {
        previous.text += value;
        previous.end = end.x;
        previous.bottom = Math.max(previous.bottom, bottom);
      } else {
        window.scienceText.push({ text: String(value), x: origin.x, y: origin.y, end: end.x, bottom,
          font: this.font, fill: this.fillStyle, alpha: this.globalAlpha, canvas: this.canvas });
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
  S01: ['一根“香肠”的变质日记', '阑尾的粉 → 红 → 黄 → 黑'],
  S02: ['肚脐'],
  S03: ['麦氏点（压痛、反跳痛）', '从右髂前上棘向脐量 1/3',
    '腹膜刺激征 = 压痛 + 反跳痛 + 腹肌紧张（核心体征）', '单纯压痛 ≠ 腹膜刺激征'],
  S04: ['39.3℃ 高热', '（正常 36–37℃）', '白细胞总数', '13.0×10⁹/L', '（正常 4–10×10⁹/L）',
    '中性粒细胞数', '11.3×10⁹/L', '（正常 2–7×10⁹/L）', '参考区间因实验室略有差异'],
  S05: ['四道色彩密码 · 直击阑尾变质现场', '10小时症状升级背后的病理演变'],
  S07: ['大体观察 · 肿胀充血', '浆膜血管扩张充血', '像烧红的铁丝网'],
  S08: ['急性化脓性阑尾炎（又称急性蜂窝织性阑尾炎）的外观特征', '浆膜面灰黄色脓苔'],
  S09: ['外观成因 · 组织学透视', '阑尾壁各层浸润大量中性粒细胞', '覆盖一层灰黄色脓苔'],
  S10: ['变质', '渗出'],
  S11: ['黏膜破溃缺损 · 变质', '粪石梗阻 → 腔内压升高 → 缺血与感染'],
  S12: ['组胺 / 缓激肽 / 前列腺素 / 趋化因子等炎症介质', '通透性升高 · 血浆渗出',
    '1. 边集', '2. 滚动', '3. 黏附', '4. 阿米巴样游出（主动渗出）'],
  S13: ['急性化脓性阑尾炎（又称急性蜂窝织性阑尾炎）· 全层蔓延', '感染链球菌',
    '产生链激酶 → 激活纤溶酶原 → 促进纤维素降解', '配合透明质酸酶分解组织间质',
    '局限性纤维素渗出被溶解 → 炎症迅速蔓延至各层', '渗出详细过程见前'],
  S14: ['【视角切换 · 浆膜面高倍观】', '浆膜面外观真相：变性坏死的中性粒细胞（脓细胞）',
    '= 纤维素性脓性渗出物 → 肉眼呈灰黄色脓苔'],
  S15: ['急性单纯性阑尾炎', '急性化脓性阑尾炎', '急性坏疽性阑尾炎',
    '纤维素性脓性渗出', '最常见典型路径 ≠ 每个患者必经的固定流程', '部分早期可及时控制', '部分可迅速恶化'],
  S16: ['急性单纯性阑尾炎', '肌层与浆膜层轻度水肿及少量中性粒细胞浸润', '分叶核中性粒细胞（放大）', '渗出详细过程见前'],
  S17: ['阑尾壁动脉受压', '肿胀管壁使动脉变窄', '阑尾系膜静脉血栓', '血栓堵腔 · 回流受阻',
    '动静脉双重受阻 → 阑尾缺血、坏死'],
  S18: ['急性坏疽性阑尾炎', '出血坏死与全层穿孔', '坏死 + 继发腐败菌感染', '阑尾坏疽发黑',
    '穿孔不一定伴有坏疽', '急性化脓性阑尾炎也可直接破溃穿孔，二者不能画等号'],
  S19: ['典型症状：转移性右下腹痛', '体格检查：麦氏点压痛、反跳痛与腹肌紧张（腹膜刺激征）', '肚脐', '脐周 → 右下腹', '麦氏点'],
  S20: ['重要辅助工具，非人人必做', '多层螺旋 CT 诊断敏感度 > 93%', '成人疑似急性阑尾炎'],
  S21: ['急性单纯性阑尾炎', '急性化脓性阑尾炎', '急性坏疽性阑尾炎', '管壁轻增粗', '脂肪清晰', '双环靶征', '偏心粪石', '脂肪条索',
    '壁强化缺损', '盲肠旁脓肿', '游离气体', '2.4×'],
  S22: ['急性化脓性阑尾炎', '急性坏疽性阑尾炎', '未穿孔', '通常以尽早手术切除为主', '尽快外科评估',
    '弥漫性腹膜炎：通常需紧急手术', '局限性脓肿：可视情况先抗感染，必要时引流'],
  S23: ['慢性期：炎症刺激导致增生', '急性期：变质 + 渗出', '狭窄星形管腔'],
  S24: ['淋巴细胞', '浆细胞', '一旦确诊，通常建议在症状缓解期择期切除；', '若正处于急性发作期，则视情况急诊手术。'],
  S25: ['腹痛转移到右下腹，或持续加重', '尽快就医'],
  S26: ['系统解剖学[M]', '病理学[M]', '外科学[M]', 'Surg Endosc, 2024', 'JAMA Surg, 2026', 'Podda M'],
};

function verifyScreenWords(id, texts) {
  const textbooks = id === 'S26' ? verifyReferenceRows().map((row, i) => `[${i + 1}] ${row}`) : [];
  for (const value of texts) {
    checkedText(value, id + ' screen');
    if (!textbooks.includes(value)) checkNames(value, id + ' screen');
  }
  const all = texts.join('\n');
  for (const row of textbooks) assert.ok(texts.includes(row), 'S26 missing the complete textbook citation');
  if (!['S23', 'S24', 'B08'].includes(id)) assert.doesNotMatch(all, acute, id);
  if (id === 'S02') assert.doesNotMatch(all, /右髂前上棘|麦氏点|内\s*2\/3|外\s*1\/3/u, id);
  if (id === 'S07') assert.doesNotMatch(all, /单纯性|化脓性|坏疽性/u, id);
  if (id === 'S04') assert.doesNotMatch(all, /(?<!39\.3)℃ 高热|中性粒细胞比例|87\s*%/u, id);
  if (id === 'S11') assert.doesNotMatch(all, offModel, id);
  if (id === 'S13' || id === 'S14') assert.doesNotMatch(all, /单纯(?:的)?纤维素/u, id);
  if (id === 'S14') assert.doesNotMatch(all, /各层浸润大量中性粒细胞/u, id);
  if (id === 'S17') assert.doesNotMatch(all, /核溶解|全层浸润|血供.{0,6}彻底/u, id);
  const joined = all.replace(/\s+/gu, ' ');
  for (const term of requiredScreen[id] ?? []) assert.ok(all.includes(term) || joined.includes(term),
    `${id} missing screen wording: ${term}`);
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

function measureTemperatureBand(seconds) {
  const proto = CanvasRenderingContext2D.prototype;
  const fillRect = proto.fillRect;
  const ranges = [];
  proto.fillRect = function (x, y, width, height) {
    if (width === 30 && height > 0 && height < 100) {
      const transform = this.getTransform();
      const top = transform.transformPoint(new DOMPoint(x, y));
      const bottom = transform.transformPoint(new DOMPoint(x + width, y + height));
      ranges.push([top.x, top.y, bottom.x, bottom.y]);
    }
    return fillRect.call(this, x, y, width, height);
  };
  try {
    window.renderAt(seconds);
    return ranges;
  } finally {
    proto.fillRect = fillRect;
  }
}

function measureDiagnosisLinks({ time, safeY }) {
  window.renderAt(time);
  const shape = id => document.getElementById(id);
  const coordinates = node => [Number(node.getAttribute('cx')), Number(node.getAttribute('cy'))];
  const point = ({ x, y }) => [x, y];
  const navel = coordinates(shape('s19-navel'));
  const asis = coordinates(shape('s19-right-asis'));
  const mcburney = coordinates(shape('s19-mcburney'));
  const pain = shape('s19-pain-route');
  const doctor = document.querySelector('[data-doctor] canvas');
  const rect = doctor.getBoundingClientRect();
  const { width, height } = doctor;
  const pixels = doctor.getContext('2d').getImageData(0, 0, width, height).data;
  let farthest = 0;
  for (let y = 0; y < height; y++) {
    for (let x = farthest + 1; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] > 25) farthest = x;
    }
  }
  const doctorRight = rect.left + farthest * rect.width / width;
  function touchesDoctor(x, y) {
    const dx = Math.floor((x - rect.left) * width / rect.width);
    const dy = Math.floor((y - rect.top) * height / rect.height);
    for (let iy = Math.max(dy - 4, 0); iy < Math.min(dy + 5, height); iy++) {
      for (let ix = Math.max(dx - 4, 0); ix < Math.min(dx + 5, width); ix++) {
        if (pixels[(iy * width + ix) * 4 + 3] > 24) return true;
      }
    }
    return false;
  }
  const obstacles = [...document.querySelectorAll('[data-scale] [data-pan], [data-clinical-caption] text, [data-abdominal-locator-labels] text')]
    .filter(window.scienceVisible).map(node => ({ box: node.getBoundingClientRect(), label: node.textContent.trim() || 'scale pan' }));
  const links = [...document.querySelectorAll('[data-locator-link]')].map(node => {
    const id = node.getAttribute('data-locator-link');
    const path = shape(id).querySelector('path');
    const length = path.getTotalLength();
    const samples = Array.from({ length: 120 }, (_, i) => path.getPointAtLength(length * i / 119));
    const hit = samples.map(({ x, y }) => y >= safeY ? 'subtitle band' : touchesDoctor(x, y) ? 'doctor'
      : obstacles.find(({ box }) => Math.hypot(Math.max(box.left - x, x - box.right, 0),
        Math.max(box.top - y, y - box.bottom, 0)) < 28)?.label);
    const collision = hit.find(Boolean);
    return { start: point(samples[0]), end: point(samples.at(-1)), collision,
      inCorridor: samples.every(({ x }) => x >= 850 && x <= 1080),
      color: node.querySelector('path').getAttribute('fill'),
      revealed: Number(path.getAttribute('stroke-dashoffset')) === 0 && window.scienceVisible(node) };
  });
  const starts = ['symptoms', 'exam'].map(key => {
    const { left, top, bottom } = document.querySelector(`[data-${key}] text`).getBoundingClientRect();
    return { left, top, bottom };
  });
  return { navel, asis, mcburney, painStart: point(pain.getPointAtLength(0)),
    painEnd: point(pain.getPointAtLength(pain.getTotalLength())), starts, links, doctorRight };
}

function measureCanvasText(seconds) {
  window.scienceText.length = 0;
  window.scienceCapture(true);
  window.renderAt(seconds);
  window.scienceCapture(false);
  return window.scienceText.map(({ canvas: _canvas, ...metrics }) => metrics);
}

function measureNav(t) {
  window.renderAt(t);
  const [canvas] = document.querySelectorAll('canvas[data-stage-navigation]');
  if (!canvas) return {};
  const { left, top, right } = canvas.getBoundingClientRect();
  const ctx = canvas.getContext('2d');
  const scale = canvas.width / 210;
  const marks = [29, 81, 133, 185].map(x => {
    const pixels = (top, width, height) => ctx.getImageData((x - width / 2) * scale,
      top * scale, width * scale, height * scale).data;
    const filled = values => values.some((n, i) => i % 4 === 3 && n > 10);
    return filled(pixels(20, 10, 13)) && filled(pixels(35, 26, 17));
  });
  return { left, top, right, marks, opacity: Number(canvas.style.opacity), marker: Number(canvas.dataset.marker) };
}

async function verifyStageEvidence(page, section) {
  const seconds = (id, p) => {
    const cue = section.sheet.cues.find(cue => cue.id === id);
    return cue.start + cue.duration * p;
  };
  const initial = section.sheet.cues[0].id;
  const nav = await page.evaluate(measureNav, seconds(initial, .55));
  assert.deepEqual([nav.left, nav.top, nav.right], [55, 109, 265]);
  assert.ok(nav.marks.every(Boolean) && nav.opacity > .99, `${initial} fixed four-color navigation`);
  const separation = async (id, p) => page.evaluate(times => times.map(t => window.renderAt(t)), p.map(x => seconds(id, x)));
  const checkSeparation = async id => {
    const [first, pause, last] = await separation(id, [.25, .45, .75]);
    assert.ok(first.outgoing > 0 && first.incoming === 0, `${id} retiring view`);
    assert.ok(pause.outgoing === 0 && pause.incoming === 0, `${id} still has overlapping subjects`);
    assert.ok(last.outgoing === 0 && last.incoming > 0, `${id} incoming view`);
  };
  if (section.index === 0) {
    const hidden = await page.evaluate(measureLandmarks, seconds('S02', .5));
    assert.equal(hidden.segments.length, 0, 'S02 must withhold the localization guide');
    const { navel, asisR, mcburney, segments } = await page.evaluate(measureLandmarks, seconds('S03', .9));
    assert.ok(asisR.x < mcburney.x && mcburney.x < navel.x && asisR.y - navel.y >= 100);
    assert.ok(close(mcburney.y, 433 + 2 / 3), 'S03 pelvis and McBurney labels raised 16 px');
    for (const axis of ['x', 'y']) assert.ok(close(mcburney[axis], asisR[axis] + (navel[axis] - asisR[axis]) / 3));
    assert.ok(segments.some(([[x1, y1], [x2, y2]]) =>
      close(x1, navel.x) && close(y1, navel.y) && close(x2, asisR.x) && close(y2, asisR.y)), 'S03 localization guide');
    const joins = await page.evaluate(times => times.map(t => window.openingTransitionAt(t)),
      [.25, .46, .65].map(p => seconds('B01', p)));
    assert.ok(joins[0].patientOpacity > 0 && joins[0].labsOpacity === 0);
    assert.ok(joins[1].patientOpacity === 0 && joins[1].diagramOpacity === 0 && joins[1].labsOpacity === 0
      && joins[1].dotOpacity === 0 && joins[1].noteOpacity === 1);
    assert.ok(joins[2].patientOpacity === 0 && joins[2].labsOpacity > 0);
    const cut = seconds('S02', 0);
    const firstReviewFrame = Math.ceil(cut * 15) / 15;
    const poses = await page.evaluate(times => times.map(t => window.openingPatientAt(t)),
      [seconds('S01', .15), firstReviewFrame - 1 / 15, firstReviewFrame, cut + .60]);
    assert.equal(poses[0].cx, 960);
    assert.ok(poses[0].bowl && poses[0].progress === 0, 'Early meal pose must stay relaxed');
    assert.equal(poses[2].cx, poses[1].cx);
    assert.equal(poses[2].hunch, poses[1].hunch);
    assert.deepEqual(poses[1].bowl, poses[0].bowl, 'Meal must stay pinned while the portrait leaves');
    assert.deepEqual(poses[2].bowl, poses[0].bowl, 'Meal cannot translate across the S01–S02 cut');
    assert.equal(poses[3].cx, 565);
    assert.equal(poses[3].bowl, null);
    const opening = await page.evaluate(times => times.map(t => window.openingTransitionAt(t).openingTitle),
      [.25, .60, .95, 2, 4.10, 4.425, 4.75, 5]);
    assert.deepEqual(opening[0], { alpha: 0, dy: 14 });
    assert.ok(close(opening[1].alpha, .875) && close(opening[1].dy, 1.75));
    assert.deepEqual(opening.slice(2, 5), Array(3).fill({ alpha: 1, dy: 0 }));
    assert.ok(close(opening[5].alpha, .5));
    assert.deepEqual(opening.slice(6), Array(2).fill({ alpha: 0, dy: 0 }));
    const pressureNotes = await page.evaluate(measureCanvasText, seconds('S03', .92));
    const mechanism = pressureNotes.filter(({ text }) => /^(?:腹膜刺激征 =|单纯压痛 ≠)/u.test(text));
    assert.equal(mechanism.length, 2);
    assert.ok(mechanism.every(({ x, y, end }) => x >= 1060 && end <= 1780 && y >= 675 && y <= 845),
      'S03 peritoneal signs must sit below the pelvis and above subtitles');
    assert.deepEqual(mechanism.map(({ font }) => Number(/([\d.]+)px/u.exec(font)[1])), [22, 19]);
    assert.equal(mechanism[1].y - mechanism[0].y, 26, 'S03 peritoneal signs two-line spacing');
    assert.ok(mechanism[1].bottom <= 855, 'S03 graphic bottom clearance');
    const normalTemperatureBand = await page.evaluate(measureTemperatureBand, seconds('S04', .94));
    assert.deepEqual(normalTemperatureBand, [[725, 553, 755, 609]], 'S04 missing the 36–37℃ band on the scale');
    const readings = await page.evaluate(measureCanvasText, seconds('S04', .94));
    for (const [name, reading, range] of [
      ['白细胞总数', '13.0×10⁹/L', '（正常 4–10×10⁹/L）'],
      ['中性粒细胞数', '11.3×10⁹/L', '（正常 2–7×10⁹/L）'],
    ]) {
      const [label, value, reference] = [name, reading, range].map(term => readings.find(({ text }) => text === term));
      assert.ok(label && value && reference && close(value.y, reference.y) && value.y - label.y <= 50
        && value.y - label.y > 0 && reference.x > value.end, `S04 missing a paired readout for ${name}`);
    }
    const tracks = await page.evaluate(t => {
      window.renderAt(t);
      const ctx = document.querySelector('#opening-stage').getContext('2d');
      return [[1504, 405], [1393, 611]].map(([x, y]) =>
        [-7, -1, 0, 1, 7].map(dx => [...ctx.getImageData(x + dx, y + 5, 1, 1).data]));
    }, seconds('S04', .55));
    for (const [base, ...colors] of tracks) {
      assert.ok(base[2] > base[0] + 20 && colors.at(-1)[0] > colors.at(-1)[2] + 25);
      assert.ok(colors.every(rgb => Math.min(...rgb.slice(0, 3)) < 180), 'S04 continuous bar');
    }
    const titleCompositions = await page.evaluate(times => times.map(t => window.openingTransitionAt(t)),
      [seconds('S04', .90), seconds('S04', .95), seconds('S04', .99999), seconds('S05', 0),
        seconds('S05', .04), seconds('S05', .08)]);
    const [fullLabs, halfLabs, lastLabs, paper, halfGuide, fullGuide] = titleCompositions;
    assert.ok(close(fullLabs.labsOpacity, 1) && close(halfLabs.labsOpacity, .5) && lastLabs.labsOpacity < 1e-6);
    assert.ok(titleCompositions.slice(0, 3).every(state => close(state.labsOpacity, state.noteOpacity)),
      'S04 labs and clock must fade together');
    assert.deepEqual([paper.labsOpacity, paper.noteOpacity, paper.guideOpacity], [0, 0, 0]);
    assert.ok(close(halfGuide.guideOpacity, .5) && close(fullGuide.guideOpacity, 1), 'S05 8% guide fade');
    const cleanRight = await page.evaluate(times => {
      const sample = t => {
        window.renderAt(t);
        return document.querySelector('#opening-stage').getContext('2d').getImageData(1580, 180, 120, 16).data;
      };
      const [bare, guide] = times.map(sample);
      return bare.every((value, i) => value === guide[i]);
    }, [seconds('S01', 2 / section.sheet.cues[0].duration), seconds('S05', .15)]);
    assert.ok(cleanRight, 'S05 right side must match the unwashed paper');
  }
  if (section.index === 1) {
    const lens = await page.evaluate(t => window.renderAt(t).lens, seconds('S07', .80));
    assert.ok(lens?.radius >= 140 && lens.alpha > .95 && lens.cleanGap > 24, 'S07 congested serosal-vessel lens');
    const wording = await page.evaluate(measureCanvasText, seconds('S08', .83));
    assert.ok(wording.some(({ text, x, end }) =>
      text === '急性化脓性阑尾炎（又称急性蜂窝织性阑尾炎）的外观特征' && x >= 265 && end <= 1860),
    'S08 gross title includes both complete names and appearance');
    const [gross, mid, perspective, handoff] = await page.evaluate(times => times.map(t => window.renderAt(t)),
      [seconds('S09', .35), seconds('S09', .50), seconds('S09', .75), seconds('B03', .75)]);
    assert.ok(close(gross.sectionOpacity, 0) && mid.sectionOpacity > 0 && mid.sectionOpacity < 1);
    assert.equal(perspective.sectionOpacity, 1);
    assert.deepEqual([handoff.micro.x, handoff.micro.y, handoff.micro.width, handoff.micro.opacity], [960, 455, 570, 1]);
  }
  if (section.index === 2) {
    const states = await page.evaluate(times => times.map(t => {
      window.renderAt(t);
      return window.artCounts();
    }), [seconds('S11', .91), ...[.39, .53, .62, .684, .701, .748, .985].map(p => seconds('S12', p))]);
    const [ulcer, plasma, margin, roll, adhesion, held, crossing, settled] = states;
    assert.ok(ulcer.clefts.every(([, width]) => width < 1) && ulcer.migrated === 0, 'S11 endothelium');
    assert.ok(plasma.dilation > 12 && plasma.plasma > .6 && plasma.migrated === 0 && plasma.crossingCells === 0,
      'S12 plasma should leak before neutrophils cross');
    assert.ok(margin.leadCell.y < plasma.leadCell.y - 50 && !margin.leadCell.out, 'S12 margination');
    assert.ok(roll.leadCell.x > margin.leadCell.x + 70 && roll.leadCell.angle > margin.leadCell.angle + 90,
      'S12 rolling along the wall');
    assert.ok(close(adhesion.leadCell.x, held.leadCell.x) && close(adhesion.leadCell.y, held.leadCell.y), 'S12 adhesive pause');
    assert.ok(crossing.crossingCells > 0 && crossing.clefts.some(([, width]) => width > 10)
      && crossing.leadCell.squeeze > .87, 'S12 amoeboid diapedesis');
    assert.ok(settled.migrated >= 4 && settled.clefts.every(([, width]) => width < 1), 'S12 transient clefts');
    assert.ok(settled.infiltrate >= 900 && settled.highPowerCells >= 140, 'S13/S14 infiltration and pus');
    const labels = await page.evaluate(times => times.map(t => {
      window.scienceText.length = 0;
      window.scienceCapture(true);
      window.renderAt(t);
      window.scienceCapture(false);
      return window.scienceScreen().filter(text => /^[1-4]\. /u.test(text)).map(text => Number(text[0]));
    }), [.40, .51, .62, .705, .812].map(p => seconds('S12', p)));
    assert.deepEqual(labels, [[], [1], [1, 2], [1, 2, 3], [1, 2, 3, 4]], 'S12 staged labels in live exudation scene');
    const linkedWords = await page.evaluate(measureCanvasText, seconds('S12', .812));
    const stages = linkedWords.filter(({ text }) => /^[1-4]\. /u.test(text));
    assert.equal(stages.length, 4);
    assert.ok(stages.every(({ y, x }) => y <= 225 && x >= 265), 'S12 phase labels must clear the vascular wall');
    const footnote = (await page.evaluate(measureCanvasText, seconds('S13', .80)))
      .find(({ text }) => text === '渗出详细过程见前');
    assert.ok(footnote?.fill === '#443d37' && footnote.alpha === 1
      && Number(/([\d.]+)px/u.exec(footnote.font)[1]) >= 19, 'S13 reference contrast, size, and opacity');
    const [vesselFull, vesselHalved, vesselGone] = await separation('S12', [.91, .955, .99999]);
    const [heHidden, heGrowing, heFull] = await separation('S13', [0, .045, .09]);
    assert.ok(close(vesselFull.outgoing, 1) && close(vesselHalved.outgoing, .5) && vesselGone.outgoing < 1e-6);
    assert.ok(close(heHidden.incoming, 0) && close(heGrowing.incoming, .5) && close(heFull.incoming, 1)
      && heHidden.artScale < heGrowing.artScale && heGrowing.artScale < heFull.artScale && heFull.artScale === 1,
    'S12 → S13 vessel fade and expanding H&E aperture');
    const priming = await page.evaluate(times => times.map(t => {
      window.renderAt(t);
      const { visiblePus, highPowerCells, pusFraction, wovenFraction } = window.artCounts();
      return { visiblePus, highPowerCells, pusFraction, wovenFraction };
    }), [seconds('B04', .98), seconds('S14', 0), seconds('S14', .55)]);
    assert.ok(priming.slice(0, 2).every(({ visiblePus, highPowerCells, pusFraction, wovenFraction }) =>
      close(pusFraction, .70) && close(wovenFraction, .70) && Math.abs(visiblePus - highPowerCells * .70) <= 1),
    'S14 primes both pus and fibrin to 70% before entry');
    assert.ok(priming[2].visiblePus >= 140 && priming[2].wovenFraction === 1);
    await checkSeparation('B05');
    const [before, center, after] = await separation('B03b', [.25, .45, .75]);
    assert.ok(before.branchOpacity > 0 && before.incoming === 0 && center.branchOpacity === 0
      && center.incoming > 0 && after.outgoing === 0);
  }
  if (section.index === 3) {
    const { scene, clotAnchor, lines, clearance, veinPixel, clotPixel, wallSites, early, open, compressed, colors, dual, clotSpansLumen } = await page.evaluate(times => {
      const shape = id => document.getElementById(id);
      window.renderAt(times[0]);
      const scene = window.gate1SceneInfo.S17;
      const artery = shape('s17-artery-lumen');
      const early = scene.arteryDiameter;
      const open = artery.isPointInFill(new DOMPoint(230, 145));
      window.renderAt(times[1]);
      const compressed = !artery.isPointInFill(new DOMPoint(230, 145)) && artery.isPointInFill(new DOMPoint(230, 128));
      const colors = ['s17-artery-wall', 's17-vein-wall'].map(id => getComputedStyle(shape(id)).fill);
      const dual = ['s17-arterial-inset', 's17-magnification'].every(id => window.scienceVisible(shape(id)));
      const clot = shape('s17-plug-paint').querySelector('path');
      const clotSpansLumen = [93, 124, 155].every(y => clot.isPointInFill(new DOMPoint(234, y)));
      const aperture = document.getElementById('s17-gross-clot-aperture');
      const clotAnchor = ['cx', 'cy'].map(key => Number(aperture.getAttribute(key)));
      const venous = [...document.querySelectorAll('#s17-tangents path')];
      const arterial = [...document.querySelectorAll('#s17-arterial-guides path')];
      const lines = venous.map(el => {
        const { x, y } = el.getPointAtLength(0);
        return [x, y];
      });
      let clearance = Infinity;
      for (const path of [...venous, ...arterial]) {
        const length = path.getTotalLength();
        const samples = Math.ceil(length);
        for (let i = 0; i <= samples; i++) {
          const { x, y } = path.getPointAtLength(length * i / samples);
          for (const [cx, cy] of scene.ileum) clearance = Math.min(clearance, Math.hypot(x - cx, y - cy));
        }
      }
      const panel = document.getElementById('s17-organ-body');
      const canvas = panel.firstElementChild;
      const specimenCoordinates = panel.getCTM().inverse();
      const samplePigment = position => {
        const point = new DOMPoint(...position).matrixTransform(specimenCoordinates);
        const localX = point.x / Number(panel.getAttribute('width')) * canvas.width;
        const localY = point.y / Number(panel.getAttribute('height')) * canvas.height;
        return [...canvas.getContext('2d').getImageData(localX, localY, 1, 1).data];
      };
      const wallSites = arterial.map((path, i) => {
        const { x, y } = path.getPointAtLength(0);
        const wall = scene.walls[i];
        const [r, g, b, a] = samplePigment(wall.interior);
        return { distance: Math.hypot(x - wall.x, y - wall.y),
          yellow: r > 175 && g > 115 && r - g > 25 && g - b > 18 && a === 255 };
      });
      return { scene, clotAnchor, lines, clearance, veinPixel: samplePigment([scene.veinAnchor.x, scene.veinAnchor.y]),
        clotPixel: samplePigment(clotAnchor), wallSites, early, open, compressed, colors, dual, clotSpansLumen };
    }, [seconds('S17', .17), seconds('S17', .92)]);
    const { veinAnchor, ileumBottom, guideClearance, walls } = scene;
    assert.ok(veinAnchor.y > ileumBottom && lines.every(([x, y]) =>
      close(x, veinAnchor.x, .05) && close(y, veinAnchor.y, .05)), 'S17 venous guides start below the ileum');
    assert.ok(veinPixel[2] > veinPixel[0] + 12 && veinPixel[2] > veinPixel[1] + 5 && veinPixel[3] === 255,
      'S17 guide source does not point to blue vein pigment: ' + veinPixel.join(','));
    assert.deepEqual(walls.map(({ side }) => side), [1, -1], 'S17 upper and lower appendix walls');
    assert.ok(wallSites.every(({ distance, yellow }) => distance < .05 && yellow), 'S17 arterial guides mark the swollen yellow wall');
    assert.ok(guideClearance > 2 && clearance > scene.ileumRadius + 1,
      `S17 guide crosses the ileum (${clearance} vs ${scene.ileumRadius})`);
    assert.deepEqual(clotAnchor, [scene.source.x, scene.source.y], 'S17 aperture is detached from the vein');
    assert.ok(clotPixel[0] - clotPixel[1] > 20 && clotPixel[2] - clotPixel[1] > 12 && clotPixel[3] === 255,
      'S17 aperture does not contain the clot pigment');
    assert.ok(dual && open && compressed && scene.arteryDiameter < early * .35 && clotSpansLumen,
      'S17 red artery must narrow while the blue vein lumen is blocked');
    const [red, blue] = colors.map(color => color.match(/\d+/gu).map(Number));
    assert.ok(red[0] > red[2] + 30 && blue[2] > blue[0] + 30, 'S17 vessel coding');
    const fronts = await page.evaluate(times => times.map(t => {
      window.renderAt(t);
      return Number(document.getElementById('s18-inflamed').dataset.necroticFront);
    }), [.05, .15, .35, .58].map(p => seconds('S18', p)));
    assert.ok(fronts[0] === fronts[1] && fronts[2] > fronts[1] && fronts[3] > fronts[2],
      'S18 blackening must follow the onset of secondary infection');
    const [simpleFull, simpleHalf, simpleGone] = await separation('S16', [.92, .96, .99999]);
    const [vascularHidden, vascularHalf, vascularFull] = await separation('S17', [0, .04, .08]);
    assert.ok(close(simpleFull.artOpacity, 1) && close(simpleHalf.artOpacity, .5) && simpleGone.artOpacity < 1e-6);
    assert.ok(close(vascularHidden.artOpacity, 0) && close(vascularHalf.artOpacity, .5) && close(vascularFull.artOpacity, 1),
      'S16 → S17 8% subject fade');
    const organJoin = await page.evaluate(times => times.map(t => {
      const { id, artOpacity } = window.renderAt(t);
      const s17 = id === 'S17';
      const readOpacity = selector => Number(document.querySelector(selector).getAttribute('opacity'));
      const subject = document.querySelector(s17 ? '#s17-organ-body' : '#s18-inflamed-body');
      const { a, b, c, d, e, f } = subject.getCTM();
      return { artOpacity, pose: [a, b, c, d, e, f],
        right: readOpacity(s17 ? '#s17-right-insets' : '#s18-seam-title'),
        labels: s17 ? readOpacity('#s17-right-labels') : null };
    }), [seconds('S17', .92), seconds('S17', .96), seconds('S17', .99999),
      seconds('S18', 0), seconds('S18', .04), seconds('S18', .08)]);
    assert.ok(organJoin.every(({ artOpacity, pose }) =>
      close(artOpacity, 1) && pose.every((value, i) => close(value, organJoin[0].pose[i]))),
    'S17 → S18 holds left organ geometry and opacity');
    assert.ok(organJoin.every(({ right }, i) => close(right, [1, .5, 0, 0, .5, 1][i]))
      && organJoin.slice(0, 3).every(({ right, labels }) => close(right, labels)),
    'S17 → S18 right-side fades');
    await checkSeparation('B06');
  }
  if (section.index === 4) {
    for (const p of [.61, .78, .95]) {
      const { navel, asis, mcburney, painStart, painEnd, starts, links, doctorRight } = await page.evaluate(
        measureDiagnosisLinks, { time: seconds('S19', p), safeY: STORY_ART_BOTTOM },
      );
      assert.deepEqual(links.map(link => link.color), ['#C43428', '#2F5D7C']);
      assert.ok(doctorRight <= 615, `S19 fingertips reach x=${doctorRight}`);
      for (const [i, link] of links.entries()) {
        const { left, top, bottom } = starts[i];
        assert.ok(link.revealed && link.inCorridor, `S19 locator arrow ${i + 1} has a reveal or corridor error at ${p}`);
        assert.ok(!link.collision, `S19 locator arrow ${i + 1} overlaps ${link.collision} at ${p}`);
        assert.ok(link.start[0] > left - 55 && link.start[0] < left - 28 && link.start[1] >= top && link.start[1] <= bottom,
          `S19 locator arrow ${i + 1} starts at the wrong label`);
        for (const axis of [0, 1]) assert.ok(close(link.end[axis], [painEnd, mcburney][i][axis], .01));
      }
      assert.deepEqual(painStart, navel, 'S19 pain migration starts at the navel');
      for (const axis of [0, 1]) assert.ok(close(mcburney[axis], asis[axis] + (navel[axis] - asis[axis]) / 3));
      assert.ok(Math.hypot(painEnd[0] - mcburney[0], painEnd[1] - mcburney[1]) > 25, 'S19 arrows must target distinct sites');
    }

    const layout = await page.evaluate(t => {
      window.renderAt(t);
      const word = selector => document.querySelector(selector).getBoundingClientRect();
      const lab = word('[data-labs] text');
      const statistic = word('[data-stat] text');
      const source = word('[data-stat-scope] text');
      const foot = word('[data-scale-foot]');
      const footGap = Math.min(...[...document.querySelectorAll('[data-clinical-caption] text')].map(node => {
        const box = node.getBoundingClientRect();
        return Math.hypot(Math.max(foot.left - box.right, box.left - foot.right, 0),
          Math.max(foot.top - box.bottom, box.top - foot.bottom, 0));
      }));
      const rows = ['symptoms', 'exam', 'labs'].map(id => Number(document.querySelector(`[data-${id}] text`).getAttribute('y')));
      return { gap: statistic.top - lab.bottom, bottom: source.bottom, footGap, rows,
        retired: document.querySelector('[data-abdominal-locator]').getAttribute('opacity') === '0' };
    }, seconds('S20', .80));
    assert.deepEqual(layout.rows.slice(1).map((y, i) => y - layout.rows[i]), [26, 26]);
    assert.ok(layout.gap >= 28 && layout.bottom <= 855 && layout.footGap > 0 && layout.retired,
      `S20 layout ${JSON.stringify(layout)}`);

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
    for (const [i, p] of [.18, .50, .75].entries()) {
      const tx = seconds('S21', p);
      const nav = await page.evaluate(measureNav, tx);
      assert.ok(nav.marks.every(Boolean) && Math.abs(nav.marker - i - 1) < .08, 'S21 fixed labels and moving highlight');
      const inset = await page.evaluate(index => {
        const zoom = document.querySelector('[data-ct-box="zoom"]').getBoundingClientRect();
        const arrows = [...document.querySelectorAll(`[data-ct-notes="${index}"] [data-ct-inset-arrow] text`)]
          .filter(window.scienceVisible).map(x => x.getBoundingClientRect());
        return [arrows.length, arrows.every(({ left, top, right, bottom }) =>
          left >= zoom.left + 14 && right <= zoom.right - 14 && top >= zoom.top && bottom <= zoom.bottom)];
      }, i);
      assert.deepEqual(inset, [i ? 3 : 2, true]);
    }
    const fixedCtCaptions = [
      ['增强CT上三型各有线索：急性单纯性阑尾炎仅轻度增粗、脂肪清晰；',
        'Contrast CT reveals distinct clues: mild thickening with clean fat in acute simple appendicitis;'],
      ['急性化脓性阑尾炎见双环靶征、偏心粪石与脂肪条索；',
        'target sign, eccentric fecalith, and fat stranding in acute suppurative appendicitis;'],
      ['急性坏疽性阑尾炎伴穿孔时，见管壁强化缺损、盲肠旁脓肿及游离气体。',
        'wall enhancement defect, periappendiceal abscess, and free air in perforated acute gangrenous appendicitis.'],
    ];
    const samples = [.15, .294, .309, .3199, .32, .3201, .331, .346, .50,
      .624, .639, .6499, .65, .6501, .661, .676, .75, .99];
    const ct = await page.evaluate(times => times.map(t => {
      const state = window.renderAt(t);
      const cn = document.querySelector('.story-caption-cn');
      const en = document.querySelector('.story-caption-en');
      const { left, right, height } = en.getBoundingClientRect();
      const notes = [...document.querySelectorAll('[data-ct-notes]')]
        .filter(node => !node.hasAttribute('hidden') && Number(node.getAttribute('opacity') ?? 1) > 0)
        .map(node => Number(node.dataset.ctNotes));
      return { stage: state.ctStage, words: [cn.textContent, en.textContent], left, right, height, notes };
    }), samples.map(p => seconds('S21', p)));
    for (const [i, p] of samples.entries()) {
      const expected = p < .32 ? 0 : p < .65 ? 1 : 2;
      const { stage, words, left, right, height, notes } = ct[i];
      assert.deepEqual([stage, words], [expected, fixedCtCaptions[expected]], 'S21 CT and subtitle alignment at ' + p);
      assert.ok(left >= 60 && right <= 1860 && height <= 50, 'S21 English bounds at ' + p);
      assert.ok(notes.length < 2 && (!notes.length || notes[0] === stage), 'S21 inset overlap at ' + p);
      if (p === .32 || p === .65) assert.deepEqual(notes, [], 'S21 annotation blank at the stage cut');
    }
    const [ctOld, ctMiddle, ctEnd] = await separation('S20', [.92, .96, .99999]);
    const [ctStart, ctIncoming, ctReady] = await separation('S21', [0, .04, .08]);
    assert.ok(close(ctOld.sceneOpacity, 1) && close(ctMiddle.sceneOpacity, .5) && ctEnd.sceneOpacity < 1e-6);
    assert.ok(ctStart.sceneOpacity === 0 && close(ctIncoming.sceneOpacity, .5) && close(ctReady.sceneOpacity, 1),
      'S20 → S21 subject fade');
  }
  if (section.index === 5) {
    // These are the actual transparent entry layers that get baked for B07.
    for (const part of ['subject']) {
      const words = await page.evaluate(part => {
        window.scienceText.length = 0;
        window.renderBridgeEntry(part);
        return window.scienceScreen().join(' ');
      }, part);
      assert.doesNotMatch(words, acute, `B07/${part}`);
    }
    await checkSeparation('B08');
    const recovery = section.sheet.cues.find(cue => cue.id === 'S25');
    const blank = 1 - .30 / recovery.duration;
    const [normal, fading, held, last] = await separation('S25', [.88, (.88 + blank) / 2, blank, .99999]);
    assert.ok(close(normal.closingPaper, 0) && close(fading.closingPaper, .5) && close(held.closingPaper, 1)
      && held.sceneOpacity === 0 && last.sceneOpacity === 0, 'S25 must hold clean paper for 0.300 s');
    const [paper, creditFade, credit] = await separation('S26', [0, .30 / 6.5, .60 / 6.5]);
    assert.ok(close(paper.creditOpacity, 0) && close(creditFade.creditOpacity, .5) && close(credit.creditOpacity, 1),
      'S26 credits fade over the existing 0.600 s');
  }
}

async function verifyRenderedText(browser, source) {
  const profile = { ...getRenderProfile(), deviceScaleFactor: 1 };
  const sections = planSections(source, undefined, profile);
  await prepareBridgePlates(browser, sections, profile, sections.slice(2, 4));
  for (const section of sections) {
    const imageRequests = [];
    await withStage(browser, section, profile, async (page, _reload, check) => {
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
      assert.ok(imageRequests.every(url => url.startsWith('blob:') || /^http:\/\/127\.0\.0\.1:\d+\/bridge-plates\/subject\.png$/u.test(url)),
        'Film requested an image file or data URL');
      check();
    }, { initScript: instrumentText, onRequest: request => {
      if (request.resourceType() === 'image') imageRequests.push(request.url());
    } });
    pass(`${section.sheet.module} · live wording and scene evidence`);
  }
  pass('35 production scenes · visible wording, medicine, layout and bridge envelopes');
}

try {
  const source = await readCueSheets();
  await verifySource();
  await verifyRepository(source);
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
