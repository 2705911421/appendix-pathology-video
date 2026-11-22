import { fileURLToPath } from 'node:url';
import { readCueSheets } from '../scripts/export_tts_sheet.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const { sheets, cues } = await readCueSheets(root);
const spoken = cues.slice(0, -1);
console.log(JSON.stringify({
  sections: sheets.length, spoken: spoken.length, credits: cues.at(-1).defaultDuration,
  defaultDuration: cues.reduce((time, cue) => time + cue.defaultDuration, 0),
}, null, 2));
