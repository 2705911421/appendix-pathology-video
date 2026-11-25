import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertBlindReviewText } from '../shared/blindReview.js';
import { CREDITS_TIMING, cueDurationMs, cueType } from '../shared/timelineHelper.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const modules = Array.from({ length: 6 }, (_, index) => `s1.1-${index + 1}`);
const expectedCueOrder = [
  'S01 S02 S03 B01 S04 S05 B02', 'S06 S07 S08 S09 B03',
  'S10 B03b S11 S12 S13 B04 S14 B05', 'S15 S16 S17 S18 B06',
  'S19 S20 S21 S22 B07', 'S23 S24 B08 S25 S26',
];
export const credits = Object.freeze({ id: 'S26', duration: CREDITS_TIMING.duration });
export const recommendedTts = Object.freeze({
  recommendedSpeed: 1.08,
  recommendedPauses: Object.freeze({ comma: .11, dash: .18, semicolon: .18, period: .22 }),
});

export function formatTextForTTS(zhText) {
  const range = (_text, first, last) => last ? `${first}到${last}` : first;
  return zhText
    .replace(/(\d+(?:\.\d+)?)(?:\s*[–—～-]\s*(\d+(?:\.\d+)?))?\s*×\s*10⁹\s*\/\s*L/gu,
      (text, first, last) => range(text, first, last) + '乘以10的9次方每升')
    .replace(/(\d+(?:\.\d+)?)(?:\s*[–—～-]\s*(\d+(?:\.\d+)?))?\s*(?:℃|°C)/gu,
      (text, first, last) => range(text, first, last) + '摄氏度');
}

function normalizeCue(cue, module) {
  const { id, start, end } = cue;
  const type = cueType(cue);
  if (type !== (id === credits.id ? 'credits' : id.startsWith('B') ? 'bridge' : 'speech')) {
    throw new Error(`${module}/${id} 的节点类型不匹配`);
  }
  const span = Number.isFinite(start) && Number.isFinite(end) ? end - start : undefined;
  const defaultDuration = cue.defaultDuration ?? (type === 'bridge' ? cue.duration : span ?? cue.duration);
  if (!Number.isFinite(defaultDuration) || defaultDuration <= 0) {
    throw new Error(`${module}/${id} 缺少有效的默认时长`);
  }
  const zh = cue.zhText ?? (typeof cue.zh === 'string' ? cue.zh : cue.zh?.text);
  const en = cue.enText ?? cue.en;
  const zhText = assertBlindReviewText(zh ?? '');
  const enText = Array.isArray(en) ? en.map(assertBlindReviewText).join(' ') : assertBlindReviewText(en ?? '');
  if (type === 'credits' || id === credits.id) {
    if (type !== 'credits' || id !== credits.id || zhText.trim() || enText.trim() || defaultDuration !== credits.duration) {
      throw new Error(`S26 必须是 ${credits.duration} 秒静音片尾`);
    }
  } else if (type === 'bridge') {
    if (zhText.trim() || enText.trim()) throw new Error(`${module}/${id} 的桥段不得包含口播字幕`);
  } else if (!zhText.trim() || !enText.trim()) {
    throw new Error(`${module}/${id} 缺少中英文配音稿`);
  }
  return { id, module, type, zhText, enText, defaultDuration };
}

// Shared read-only parser. Importing this script does not run the export.
export async function readCueSheets(projectDirectory = root) {
  const sheets = await Promise.all(modules.map(async (module, index) => {
    const file = path.join(projectDirectory, module, 'out', `cues_${module}.json`);
    const original = await readFile(file);
    let sheet;
    try {
      sheet = JSON.parse(original.toString('utf8').replace(/^\uFEFF/u, ''));
    } catch (error) {
      throw new Error(`无法解析 ${file}`, { cause: error });
    }
    if (sheet?.module !== module || !Array.isArray(sheet.cues) || !sheet.cues.length) {
      throw new Error(`无效的板块 cue 清单 ${file}`);
    }
    if (sheet.cues.map(cue => cue?.id).join(' ') !== expectedCueOrder[index]) {
      throw new Error(`${module} 的分镜或桥段顺序不符，预期 ${expectedCueOrder[index]}`);
    }
    return { file, original, sheet };
  }));
  const cues = sheets.flatMap(({ sheet }) => sheet.cues.map(cue => {
    if (!cue || typeof cue !== 'object' || Array.isArray(cue)) throw new Error(`${sheet.module} 有无效的 cue`);
    return normalizeCue(cue, sheet.module);
  }));
  return { sheets, cues };
}

async function exportSheet() {
  const { cues } = await readCueSheets();
  const voices = cues.filter(({ type }) => type === 'speech');
  const sheet = voices.map(cue => ({
    ...cue, zhText: formatTextForTTS(cue.zhText), ...recommendedTts,
    outputPath: `s1.1/external_tts/${cue.id}.wav`,
  }));
  await Promise.all(['external_tts', 'audio', 'out'].map(name => mkdir(path.join(root, name), { recursive: true })));
  const destination = path.join(root, 'out', 'tts_cue_sheet.json');
  const temporary = `${destination}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(sheet, null, 2)}\n`, { flag: 'wx' });
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
  const spoken = voices.reduce((sum, cue) => sum + cueDurationMs(cue, { defaults: true }), 0) / 1000;
  const total = cues.reduce((sum, cue) => sum + cueDurationMs(cue, { defaults: true }), 0) / 1000;
  console.log(`配音清单共 ${voices.length} 句，默认口播 ${spoken.toFixed(3)} 秒。含桥段及片尾，全片默认 ${total.toFixed(3)} 秒。`);
  console.log(destination);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    await exportSheet();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
