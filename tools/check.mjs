import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const files = ['tools/bin.mjs','tools/browser.mjs','tools/server.mjs','tools/render-scene.mjs','tools/check.mjs','tools/finalize-parity.mjs','render.mjs','render_dpr2.mjs','assembly/pipeline/browser.mjs','assembly/pipeline/assemble.mjs','assembly/pipeline/render_endcard.mjs','assembly/pipeline/blind_review.mjs','assembly/subtitle/render.mjs','assembly/subtitle/loadCues.js','assembly/endcard/render.mjs','engine/tools/measure-mcb.mjs','film/generate_timeline.mjs','film/timeline.js'];
if (process.argv.includes('--env')) {
  const { detectBrowser } = await import('./browser.mjs');
  const { ffmpegPath, ffprobeOptional, binarySources } = await import('./bin.mjs');
  const fs = await import('node:fs');
  let ready = Number(process.versions.node.split('.')[0]) >= 18;
  console.log('Node 版本：' + process.version + (ready ? '' : '，请升级到 18 或更新版本'));
  try { console.log('使用浏览器：' + (await detectBrowser()).name); }
  catch (e) { console.error(e.message); ready = false; }
  try { await ffmpegPath(); console.log('ffmpeg 来源：' + binarySources.get('ffmpeg')); }
  catch (e) { console.error(e.message); ready = false; }
  console.log('ffprobe：' + (await ffprobeOptional() ? '可用（可选）' : '未安装（可选，预览将使用 ffmpeg 校验）'));
  const required = ['lines.json','narration.json','sentences.tsv','timeline.json','字幕_v3.srt','解说词_定稿.md'];
  const missing = required.filter(name => !fs.existsSync(new URL('../data/narration/' + name, import.meta.url)));
  console.log('data/narration 文件：' + (missing.length ? '缺少 ' + missing.join('、') : '齐全'));
  if (missing.length) ready = false;
  console.log(ready ? '全部就绪' : '尚未就绪，请按上面的提示补齐后重新运行首次安装文件。');
  if (!ready) process.exitCode = 1;
} else {
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL('../'+file,import.meta.url))], {stdio:'inherit'});
  if (result.error) throw result.error;
  if (result.status!==0) process.exit(result.status || 1);
}
console.log(`语法检查通过：${files.length} 个文件。`);
}
