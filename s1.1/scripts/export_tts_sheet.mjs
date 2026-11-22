import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertBlindReviewText } from '../shared/blindReview.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const modules = Array.from({ length: 6 }, (_, index) => `s1.1-${index + 1}`);
const expectedIds = Array.from({ length: 26 }, (_, index) => `S${String(index + 1).padStart(2, '0')}`);
export const credits = Object.freeze({ id: 'S26', duration: 8 });

function normalizeCue(cue, module) {
  const { id, start, end } = cue;
  const span = Number.isFinite(start) && Number.isFinite(end) ? end - start : undefined;
  const defaultDuration = cue.defaultDuration ?? span ?? cue.duration;
  if (!Number.isFinite(defaultDuration) || defaultDuration <= 0) {
    throw new Error(`${module}/${id} 缺少有效的默认时长`);
  }
  const zh = cue.zhText ?? (typeof cue.zh === 'string' ? cue.zh : cue.zh?.text);
  const en = cue.enText ?? cue.en;
  const zhText = assertBlindReviewText(zh);
  const enText = Array.isArray(en) ? en.map(assertBlindReviewText).join(' ') : assertBlindReviewText(en);
  if (id === credits.id) {
    if (zhText.trim() || enText.trim() || defaultDuration !== credits.duration) {
      throw new Error('S26 必须是 8.0 秒静音片尾');
    }
  } else if (!zhText.trim() || !enText.trim()) {
    throw new Error(`${module}/${id} 缺少中英文配音稿`);
  }
  return { id, module, zhText, enText, defaultDuration };
}

// Shared read-only parser. Importing this script does not run the export.
export async function readCueSheets(projectDirectory = root) {
  const sheets = await Promise.all(modules.map(async module => {
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
    return { file, original, sheet };
  }));
  const cues = sheets.flatMap(({ sheet }) => sheet.cues.map(cue => {
    if (!cue || typeof cue !== 'object' || Array.isArray(cue)) throw new Error(`${sheet.module} 有无效的 cue`);
    return normalizeCue(cue, sheet.module);
  }));
  if (cues.length !== expectedIds.length || cues.some(({ id }, index) => id !== expectedIds[index])) {
    throw new Error('六份清单必须按顺序各含一次 S01 至 S26');
  }
  return { sheets, cues };
}

async function exportSheet() {
  const { cues } = await readCueSheets();
  const voices = cues.filter(({ id }) => id !== credits.id);
  const sheet = voices.map(cue => ({ ...cue, outputPath: `s1.1/external_tts/${cue.id}.wav` }));
  await Promise.all(['external_tts', 'audio', 'out'].map(name => mkdir(path.join(root, name), { recursive: true })));
  const destination = path.join(root, 'out', 'tts_cue_sheet.json');
  const temporary = `${destination}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(sheet, null, 2)}\n`, { flag: 'wx' });
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
  const spoken = voices.reduce((sum, { defaultDuration }) => sum + defaultDuration, 0);
  console.log(`配音清单共 ${voices.length} 句，默认 ${spoken.toFixed(3)} 秒。计入 S26 后全片默认 ${(spoken + credits.duration).toFixed(3)} 秒。`);
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
