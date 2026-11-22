import { fileURLToPath } from 'node:url';
import { readCueSheets } from '../scripts/export_tts_sheet.mjs';
import { cueDurationMs } from './timelineHelper.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const { sheets, cues } = await readCueSheets(root);
const spoken = cues.filter(cue => cue.type === 'speech');
const bridges = cues.filter(cue => cue.type === 'bridge');
console.log(JSON.stringify({
  sections: sheets.length, spoken: spoken.length, credits: cues.at(-1).defaultDuration,
  bridges: bridges.length, bridgeDuration: bridges.reduce((ms, cue) => ms + cueDurationMs(cue), 0) / 1000,
  defaultDuration: cues.reduce((ms, cue) => ms + cueDurationMs(cue, { defaults: true }), 0) / 1000,
}, null, 2));
