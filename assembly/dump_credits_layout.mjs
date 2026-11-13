#!/usr/bin/env node
// Open the credits scene and write window.CREDITS_REPORT (measured boxes) as JSON.
import fs from 'node:fs';
import path from 'node:path';
import { loadChromium, launch, serve, resolveTarget, openPage, die } from '/workspace/garden-skills/skills/motion-showreel/scripts/lib/browser.mjs';

function help() {
  console.log(`usage: node assembly/dump_credits_layout.mjs [--project film] [--q query] [--out file.json] [--at seconds]
Measures MixSans boxes for the credits scene. Exit 0 after writing the report.`);
  process.exit(0);
}

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) help();
const opt = {};
const pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) { pos.push(a); continue; }
  const eq = a.indexOf('=');
  const key = eq < 0 ? a.slice(2) : a.slice(2, eq);
  const value = eq < 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true) : a.slice(eq + 1);
  opt[key] = value;
}
const project = path.resolve(pos[0] || opt.project || 'film');
const query = typeof opt.q === 'string' ? opt.q : 'scene=credits&pages=2&duration=14&blind=0';
const at = +(opt.at ?? 3.5);
const out = path.resolve(typeof opt.out === 'string' ? opt.out : 'qa/v6/final_credits_qa/layout.json');

const target = resolveTarget(project);
const chromium = await loadChromium(target.root);
const { server } = await serve(target.root);
const browser = await launch(chromium);
try {
  const page = await openPage(browser, { port: server.address().port, rel: target.rel, w: 1920, h: 1080, query });
  const report = await page.evaluate(t => {
    window.render(t);
    return window.CREDITS_REPORT;
  }, at);
  if (!report) die('CREDITS_REPORT missing');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  const n = (report.problems || []).length;
  console.log(`${out} problems=${n} strings=${(report.strings || []).length}`);
  if (n) console.error(report.problems.join('\n'));
} finally {
  await browser.close().catch(() => {});
  server.close();
}
