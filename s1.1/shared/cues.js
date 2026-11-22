import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { asciiApostrophes, assertBlindReviewText, HEIGHT, WIDTH } from './canvasCore.js';
import { cueType } from './timelineHelper.js';

export const FPS = 30;
const sections = Array.from({ length: 6 }, (_, index) => `s1.1-${index + 1}`);
const sheetKeys = ['module', 'width', 'height', 'fps', 'duration', 'cues'];
const cueKeys = ['id', 'type', 'start', 'end', 'zh', 'en'];

function assertFields(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error(`${label} contains fields outside the visual cue format`);
}

function frame(seconds) {
  const count = Math.round(seconds * FPS);
  if (!Number.isFinite(seconds) || seconds < 0 || Math.abs(seconds * FPS - count) > 1e-6) {
    throw new RangeError('Cue times must be on the 30 fps frame grid');
  }
  return count;
}

function zhText(zh) {
  if (typeof zh === 'string') return assertBlindReviewText(zh);
  assertFields(zh, ['text', 'highlights'], 'Chinese caption');
  if (!Array.isArray(zh.highlights)) throw new TypeError('Caption highlights must be an array');
  return { text: assertBlindReviewText(zh.text), highlights: zh.highlights.map(assertBlindReviewText) };
}

function enText(en) {
  const normalize = value => asciiApostrophes(assertBlindReviewText(value));
  if (!Array.isArray(en)) return normalize(en);
  if (en.length !== 2) throw new RangeError('Expected two English caption pages');
  return en.map(normalize);
}

export function normalizeSectionCues(sheet) {
  assertFields(sheet, sheetKeys, 'Section cues');
  const { module, duration, fps = FPS, width = WIDTH, height = HEIGHT, cues } = sheet;
  if (!sections.includes(module)) throw new RangeError('Expected an s1.1 section from 1 to 6');
  if (fps !== FPS || width !== WIDTH || height !== HEIGHT) throw new RangeError('Expected 1920×1080 at 30 fps');
  const durationFrames = frame(duration);
  if (durationFrames < 1) throw new RangeError('Invalid section duration');
  if (!Array.isArray(cues) || !cues.length) throw new TypeError('Expected visual cues');
  let cursor = 0;
  const ids = new Set();
  const timeline = cues.map((cue, index) => {
    assertFields(cue, cueKeys, `Cue ${index + 1}`);
    const { id, start, end, zh = '', en = '' } = cue;
    if (typeof id !== 'string' || !id.trim() || ids.has(id)) {
      throw new TypeError('Each cue must have a distinct identifier');
    }
    assertBlindReviewText(id);
    ids.add(id);
    const startFrame = frame(start);
    const endFrame = frame(end);
    if (startFrame !== cursor || endFrame <= startFrame || endFrame > durationFrames) {
      throw new RangeError('Visual cues must cover each frame continuously');
    }
    cursor = endFrame;
    const declared = cue.type === undefined ? {} : { type: cueType(cue) };
    if (declared.type && declared.type !== 'speech' && (zh !== '' || en !== '')) {
      throw new Error(`Silent cue ${id} cannot have captions`);
    }
    return { id, ...declared, start: startFrame / FPS, end: endFrame / FPS, zh: zhText(zh), en: enText(en) };
  });
  if (cursor !== durationFrames) throw new RangeError('Visual cues must reach the end of the section');
  return { module, width, height, fps, duration: durationFrames / FPS, cues: timeline };
}

export function validateFilmCues(sheets) {
  if (!Array.isArray(sheets) || sheets.length !== sections.length) throw new RangeError('Expected six section cue sheets');
  const byName = new Map(sheets.map(sheet => {
    const clean = normalizeSectionCues(sheet);
    return [clean.module, clean];
  }));
  let cursor = 0;
  const timeline = sections.map(module => {
    const sheet = byName.get(module);
    if (!sheet) throw new Error(`Missing visual cue sheet for ${module}`);
    const startFrame = cursor;
    cursor += frame(sheet.duration);
    return { module, startFrame, endFrame: cursor };
  });
  return { duration: cursor / FPS, frames: cursor, fps: FPS, sections: timeline };
}

const fileName = module => `cues_${module}.json`;

export async function writeSectionCues(outputDirectory, sheet) {
  const clean = normalizeSectionCues(sheet);
  const directory = path.resolve(outputDirectory);
  await mkdir(directory, { recursive: true });
  const destination = path.join(directory, fileName(clean.module));
  const temporary = `${destination}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(clean, null, 2)}\n`, { flag: 'wx' });
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
  return destination;
}

export async function readFilmCues(projectDirectory) {
  const sheets = await Promise.all(sections.map(async module => {
    const source = path.join(projectDirectory, module, 'out', fileName(module));
    const sheet = JSON.parse(await readFile(source, 'utf8'));
    if (sheet.module !== module) throw new Error(`Cue sheet module does not match ${fileName(module)}`);
    return sheet;
  }));
  return validateFilmCues(sheets);
}
