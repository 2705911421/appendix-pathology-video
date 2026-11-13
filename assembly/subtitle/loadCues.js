// Node cue loader. Priority: narration.json → sentences.tsv → 定稿 estimate.
// Browser code should fetch a snapshot instead of importing this file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const narrationDir = process.env.NARRATION_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/narration');

export const DEFAULT_PATHS = {
  narration: path.join(narrationDir, 'narration.json'),
  sentences: path.join(narrationDir, 'sentences.tsv'),
  lines: path.join(narrationDir, 'lines.json'),
  script: path.join(narrationDir, '解说词_定稿.md'),
};

/** duration_i = hanzi_i * 0.22 + 0.4 seconds. Evaluated in whole milliseconds. */
export const ESTIMATE_FORMULA = 'duration_i = hanzi_i * 0.22 + 0.4; start_0 = 0; end_i = start_i + duration_i; start_{i+1} = end_i';

function exists(p) {
  if (!p) return false;
  try {
    const st = fs.statSync(p);
    return st.isFile() && st.size > 0;
  } catch {
    return false;
  }
}

function readText(p) {
  return fs.readFileSync(p, 'utf8');
}

export function countHanzi(text) {
  const stripped = String(text ?? '').replace(/\[\d+\]/g, '');
  const m = stripped.match(/[\u4e00-\u9fff]/g);
  return m ? m.length : 0;
}

/** Milliseconds. hanzi * 220 + 400 === (hanzi * 0.22 + 0.4) * 1000, nearest ms. */
export function estimateDurationMs(hanzi) {
  return Math.round(hanzi * 220 + 400);
}

export function cardsFromEn(en) {
  const s = String(en ?? '').trim();
  if (!s) return [];
  if (s.includes(' | ')) return s.split(' | ').map((c) => c.trim()).filter(Boolean);
  return [s];
}

export function joinCards(cards) {
  return (cards || []).join(' | ');
}

function padId(n) {
  return String(n).padStart(2, '0');
}

function usable(cues) {
  return Array.isArray(cues) && cues.length > 0 && cues.every((c) => Number.isFinite(c.start) && Number.isFinite(c.end) && c.end > c.start && String(c.text || '').trim());
}

/** English cards from a 定稿「对应画面建议」 cell. Tolerates <br> and fullwidth colons. */
export function englishFromScene(scene) {
  const norm = String(scene ?? '').replace(/<br\s*\/?>/gi, '\n');
  const cards = [];
  const re = /英文续卡[：:]\s*([^\n]+)|英文[：:]\s*([^\n]+)/g;
  let m;
  while ((m = re.exec(norm))) {
    const text = (m[1] || m[2] || '').trim();
    if (text) cards.push(text);
  }
  return cards;
}

/** Parse the 77-row narration table. Later tables in the same file are ignored. */
export function parseDinggao(md) {
  const rows = [];
  for (const line of String(md).split(/\r?\n/)) {
    if (!/^\|\s*\d+\s*\|/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((s) => s.trim());
    if (cells.length < 5) continue;
    if (!/^\d+$/.test(cells[0]) || !/^\d+$/.test(cells[3])) continue;
    const n = Number(cells[0]);
    if (n < 1 || n > 77) continue;
    // The teacher-checklist table also starts with a number, but its 4th cell is not 字数.
    rows.push({
      n,
      id: padId(n),
      chapter: cells[1],
      text: cells[2],
      hanzi: Number(cells[3]),
      cards: englishFromScene(cells[4]),
    });
  }
  return rows;
}

function parseTsv(text) {
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const header = lines[0].split('\t').map((s) => s.trim());
  const col = (name, fallback) => {
    const i = header.indexOf(name);
    return i >= 0 ? i : fallback;
  };
  const iCh = col('段', 0);
  const iStart = col('起', 1);
  const iEnd = col('止', 2);
  const iText = col('句子', 4);
  const iEn = col('en', 5);
  const rows = [];
  for (const line of lines.slice(1)) {
    const c = line.split('\t');
    const ch = (c[iCh] || '').trim();
    const start = Number((c[iStart] || '').trim());
    const end = Number((c[iEnd] || '').trim());
    const text = (c[iText] || '').trim();
    const en = c.length > iEn ? (c[iEn] || '').trim() : '';
    rows.push({ ch, start, end, text, en });
  }
  return rows;
}

function parseNarration(json) {
  const segs = (json && json.segments) || [];
  return segs.map((s, i) => ({
    ch: s.ch != null ? String(s.ch) : '',
    start: Number(s.start),
    end: Number(s.end),
    text: s.text != null ? String(s.text) : '',
    en: s.en != null ? String(s.en).trim() : '',
    rawId: s.id != null ? String(s.id) : '',
    i,
  }));
}

function readLines(p) {
  if (!exists(p)) return [];
  const data = JSON.parse(readText(p));
  return Array.isArray(data) ? data : [];
}

function readDinggaoRows(p) {
  if (!exists(p)) return [];
  return parseDinggao(readText(p));
}

function finishCue(partial, i) {
  const cards = partial.englishCards && partial.englishCards.length
    ? partial.englishCards.map((c) => String(c).trim()).filter(Boolean)
    : cardsFromEn(partial.en);
  const id = partial.id && /^\d+$/.test(String(partial.id)) ? padId(Number(partial.id)) : padId(i + 1);
  return {
    i,
    id,
    ch: partial.ch || '',
    seg: partial.seg || '',
    start: partial.start,
    end: partial.end,
    text: partial.text,
    en: joinCards(cards),
    englishCards: cards.length ? cards : (partial.en ? cardsFromEn(partial.en) : []),
    ...(partial.hanzi != null ? { hanzi: partial.hanzi } : {}),
  };
}

function lookupEn(i, text, lines, dinggao) {
  const byIndex = lines[i];
  if (byIndex && byIndex.en && (byIndex.text === text || Number(byIndex.n) === i + 1)) return { en: String(byIndex.en).trim(), via: 'lines.json' };
  const byText = lines.find((l) => l && l.text === text && l.en);
  if (byText) return { en: String(byText.en).trim(), via: 'lines.json' };
  const d = dinggao.find((r) => r.text === text) || dinggao[i];
  if (d && d.cards && d.cards.length && (d.text === text || d.n === i + 1)) return { en: joinCards(d.cards), via: '定稿' };
  return null;
}

function enrichChapter(cue, i, lines, dinggao) {
  const line = lines[i];
  const row = dinggao.find((r) => r.text === cue.text) || dinggao[i];
  const title = (row && row.chapter) || (line && line.chapter) || '';
  const segFromLine = line && line.seg ? String(line.seg) : '';
  const segFromCh = /^\d{1,2}$/.test(String(cue.ch || '').trim()) ? padId(Number(cue.ch)) : '';
  const seg = segFromLine || segFromCh || cue.seg || '';
  if (title && seg) cue.ch = `${seg} ${title}`;
  else if (title && !cue.ch) cue.ch = title;
  else if (title && cue.ch && !String(cue.ch).includes(title)) cue.ch = `${cue.ch} ${title}`.trim();
  if (seg) cue.seg = seg;
}

function attachEnglish(cues, lines, dinggao, mismatches) {
  let merged = 0;
  for (const cue of cues) {
    enrichChapter(cue, cue.i, lines, dinggao);
    if (cue.en && cue.englishCards.length) continue;
    const found = lookupEn(cue.i, cue.text, lines, dinggao);
    if (found && found.en) {
      cue.englishCards = cardsFromEn(found.en);
      cue.en = joinCards(cue.englishCards);
      merged += 1;
    }
  }
  if (mismatches && merged) mismatches.push({ kind: 'en-merged', count: merged });
  return merged;
}

function fromTimedRows(rows, source, lines, dinggao) {
  const mismatches = [];
  const cues = rows.map((r, i) => finishCue({
    id: padId(i + 1),
    ch: r.ch,
    start: r.start,
    end: r.end,
    text: r.text,
    en: r.en || '',
  }, i));
  const merged = attachEnglish(cues, lines, dinggao, mismatches);
  const note = merged ? `${source} (some en merged from lines.json / 定稿)` : source;
  return {
    cues,
    source: note,
    formula: null,
    duration: cues[cues.length - 1].end,
    mismatches,
    count: cues.length,
    finalAudioTiming: true,
  };
}

function fromEstimate(dinggao, lines) {
  const mismatches = [];
  if (lines.length && lines.length !== dinggao.length) {
    mismatches.push({ kind: 'count', dinggao: dinggao.length, lines: lines.length });
  }
  let ms = 0;
  const cues = dinggao.map((r, i) => {
    const line = lines[i];
    if (line && line.text !== r.text) {
      mismatches.push({ kind: 'zh', i, id: r.id, dinggao: r.text, lines: line.text });
    }
    const cards = r.cards.slice();
    const en = joinCards(cards);
    if (line && line.en && line.en.trim() !== en) {
      mismatches.push({ kind: 'en', i, id: r.id, dinggao: en, lines: String(line.en).trim() });
    }
    const computed = countHanzi(r.text);
    if (r.hanzi !== computed) {
      mismatches.push({ kind: 'hanzi', i, id: r.id, column: r.hanzi, computed });
    }
    const hanzi = Number.isFinite(r.hanzi) ? r.hanzi : computed;
    const durMs = estimateDurationMs(hanzi);
    const start = ms / 1000;
    ms += durMs;
    const end = ms / 1000;
    const seg = line && line.seg ? String(line.seg) : '';
    const title = r.chapter || (line && line.chapter) || '';
    return finishCue({
      id: r.id,
      ch: seg && title ? `${seg} ${title}` : (title || seg),
      seg,
      start,
      end,
      text: r.text,
      en,
      englishCards: cards,
      hanzi,
    }, i);
  });
  return {
    cues,
    source: '定稿+estimate',
    formula: ESTIMATE_FORMULA,
    duration: cues.length ? cues[cues.length - 1].end : 0,
    mismatches,
    count: cues.length,
    finalAudioTiming: false,
    note: 'NOT final audio timing. hanzi is the 定稿 字数 column (Chinese characters, excluding ASCII, punctuation, and [n]). Each duration is rounded to the nearest millisecond.',
  };
}

function loadExplicit(file) {
  const raw = JSON.parse(readText(file));
  if (Array.isArray(raw)) {
    const cues = raw.map((c, i) => finishCue(c, i));
    return { cues, source: `file:${file}`, formula: null, duration: cues.length ? cues[cues.length - 1].end : 0, mismatches: [], count: cues.length, finalAudioTiming: null };
  }
  const cues = (raw.cues || raw.segments || []).map((c, i) => finishCue({
    id: c.id,
    ch: c.ch,
    seg: c.seg,
    start: Number(c.start),
    end: Number(c.end),
    text: c.text,
    en: c.en,
    englishCards: c.englishCards,
    hanzi: c.hanzi,
  }, i));
  return {
    cues,
    source: raw.source || `file:${file}`,
    formula: raw.formula || null,
    duration: raw.duration ?? (cues.length ? cues[cues.length - 1].end : 0),
    mismatches: raw.mismatches || [],
    count: cues.length,
    finalAudioTiming: raw.finalAudioTiming ?? null,
    note: raw.note || null,
  };
}

export function loadCuesFromFs(options = {}) {
  const paths = { ...DEFAULT_PATHS, ...(options.paths || {}) };
  if (options.cuesPath) paths.cues = options.cuesPath;
  if (options.cues && typeof options.cues === 'string') paths.cues = options.cues;
  if (options.narration) paths.narration = options.narration;
  if (options.sentences) paths.sentences = options.sentences;
  if (options.lines) paths.lines = options.lines;
  if (options.script) paths.script = options.script;

  let result;
  if (paths.cues && exists(paths.cues)) {
    result = loadExplicit(paths.cues);
  } else {
    const lines = readLines(paths.lines);
    const dinggao = readDinggaoRows(paths.script);
    let picked = null;
    if (exists(paths.narration)) {
      try {
        const rows = parseNarration(JSON.parse(readText(paths.narration)));
        if (usable(rows)) picked = fromTimedRows(rows, 'narration.json', lines, dinggao);
      } catch (err) {
        picked = null;
        result = { error: `narration.json unusable: ${err.message}` };
      }
    }
    if (!picked && exists(paths.sentences)) {
      try {
        const rows = parseTsv(readText(paths.sentences));
        if (usable(rows)) picked = fromTimedRows(rows, 'sentences.tsv', lines, dinggao);
      } catch (err) {
        if (!result) result = { error: `sentences.tsv unusable: ${err.message}` };
      }
    }
    if (!picked) {
      if (dinggao.length !== 77) {
        throw new Error(`定稿 parse produced ${dinggao.length} sentences, expected 77 (${paths.script})`);
      }
      picked = fromEstimate(dinggao, lines);
      if (result && result.error) picked.loadNotes = [result.error];
    }
    result = picked;
  }

  if (options.snapshot) writeSnapshot(options.snapshot, result);
  return result;
}

export function writeSnapshot(file, result) {
  const body = {
    source: result.source,
    formula: result.formula,
    finalAudioTiming: result.finalAudioTiming,
    note: result.note || null,
    count: result.cues.length,
    duration: result.duration,
    mismatches: result.mismatches || [],
    cues: result.cues,
  };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(body, null, 2) + '\n');
}

export async function loadCues(options = {}) {
  return loadCuesFromFs(options);
}
