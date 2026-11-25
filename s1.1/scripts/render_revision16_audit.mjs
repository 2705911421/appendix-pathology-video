import assert from 'node:assert/strict';
import path from 'node:path';
import sharp from 'sharp';
import { getRenderProfile } from '../shared/renderProfile.js';
import { planSections } from './build_master_all.mjs';
import { readCueSheets } from './export_tts_sheet.mjs';
import { launchBrowser, project, smokeSection } from './render_master_sections.mjs';

const width = 2400;
const height = 1800;
// Leave each frame at 16:9. The two wider cells give the dual insets and linked arrows more room.
const cells = [
  { id: 'S03', progress: .92, left: 32, top: 66, width: 768 },
  { id: 'S04', progress: .94, left: 816, top: 66, width: 768 },
  { id: 'S08', progress: .83, left: 1600, top: 66, width: 768 },
  { id: 'S12', progress: .812, left: 32, top: 574, width: 768 },
  { id: 'S13', progress: .89, left: 816, top: 574, width: 768 },
  { id: 'S16', progress: .91, left: 1600, top: 574, width: 768 },
  { id: 'S17', progress: .91, left: 32, top: 1082, width: 1152 },
  { id: 'S19', progress: .78, left: 1216, top: 1082, width: 1152,
    inkRegion: { left: 840, top: 150, width: 505, height: 465 } },
];

const profile = getRenderProfile();
const sections = planSections(await readCueSheets(), undefined, profile);
const browser = await launchBrowser();
const tiles = [];
try {
  for (const cell of cells) {
    const section = sections.find(({ sheet }) => sheet.cues.some(cue => cue.id === cell.id));
    assert.ok(section, cell.id);
    const frame = await smokeSection(browser, section, cell.id, cell.progress, profile, cell.inkRegion);
    const input = await sharp(frame).resize(cell.width, cell.width * 9 / 16).png().toBuffer();
    tiles.push({ input, left: cell.left, top: cell.top });
  }
} finally {
  await browser.close();
}

const labels = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <g fill="#564437" font-family="Arial, sans-serif" font-size="26" font-weight="600">${cells.map(
    ({ id, left, top }) => `<text x="${left + 4}" y="${top - 14}">${id}</text>`,
  ).join('')}</g>
</svg>`);
const destination = path.join(project, 'out', 'revision16_audit_grid.png');
const metadata = await sharp({ create: { width, height, channels: 3, background: '#E9DFD0' } })
  .composite([...tiles, { input: labels }]).png().toFile(destination);
assert.deepEqual([metadata.width, metadata.height], [width, height]);
console.log(destination);
