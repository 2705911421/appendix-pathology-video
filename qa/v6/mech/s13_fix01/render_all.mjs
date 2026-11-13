import fs from 'node:fs';
import { execFileSync as run } from 'node:child_process';
import { timing } from '../../../../film/timing_snapshot.js';

const rows = timing.filter(s => s.n >= 49 && s.n <= 53);
const origin = rows[0].start;
const row = id => rows.find(s => s.n === id);
const T = {
  at: id => row(id).start - origin,
  end: id => row(id).end - origin,
  frac: (id, f) => row(id).start - origin + (row(id).end - row(id).start) * f,
};
const clock = { origin, duration: rows.at(-1).end - origin, T };
const P = 'qa/v6/mech/s13_fix01';
const tool = '/workspace/garden-skills/skills/motion-showreel/scripts/render.mjs';

const picks = [
  ['s49_start', T.frac(49, .04)],
  ['s49_pressure', T.frac(49, .86)],
  ['s50_squeeze', T.frac(50, .55)],
  ['s50_thrombus', T.frac(50, .95)],
  ['s51_necrosis', T.frac(51, .55)],
  ['s51_bleed', T.frac(51, .95)],
  ['s52_pigment', T.frac(52, .95)],
  ['s53_gross', T.frac(53, .55)],
  ['s53_end', T.end(53) - .04],
].map(([name, t]) => ({ name, t }));

fs.writeFileSync(P + '/keyframes.json', JSON.stringify({ origin: clock.origin, duration: clock.duration, picks }, null, 2));

function render(args) { run('node', [tool, 'film', ...args], { stdio: 'inherit' }); }
render(['--q', 'scene=s13', '--still', picks.map(p => p.t.toFixed(6)).join(','), '--out', P + '/stills', '--workers', '1']);
