import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

function runRg(directory, options) {
  const result = spawnSync('rg', options, { cwd: directory, encoding: 'utf8', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0 && result.status !== 1) throw new Error(result.stderr.trim());
  return { code: result.status, lines: result.stdout.trim().split(/\r?\n/u).filter(Boolean) };
}

function checkScan(directory, label, rule, search) {
  const { code, lines } = runRg(directory, ['-n', '-i', '--pcre2', '--hidden', '--no-ignore', '-e', rule, ...search]);
  console.log(`${label} | rg exit=${code} | matches=${lines.length}`);
  if (lines.length) console.log(lines.join('\n'));
  assert.equal(lines.length, 0, label);
}

export async function verifyGate({ directory, page, coverage, source, early, late, determinism }) {
  const sources = ['-g', '*.{js,mjs,cjs,html,css,json}', '.'];
  const staticPattern = [
    String.raw`\.(?:png|jpe?g|webp)\b`, 'data' + ':image', String.raw`new\s+[I]mage\b`,
    String.raw`load[I]mage\s*\(`, String.raw`<\s*(?:img|image)\b`,
    String.raw`background-image\s*:\s*url\s*\(`,
  ].join('|');
  checkScan(directory, '[1] Static image scan',
    staticPattern, sources);
  checkScan(directory, '[2] Chapter isolation scan',
    String.raw`style[_]probe|s1[.]0|s1[.]1-(?!1(?:[^0-9]|$))[0-9]+`, sources);

  const brushes = await page.evaluate(() => window.brushCallCounts());
  const script = coverage.find(entry => entry.url.endsWith('/scene.js'));
  assert.ok(script, 'Browser must report execution of the scene');
  function sharedCalls(name, pattern) {
    const fn = script.functions.find(entry => entry.functionName === name);
    assert.ok(fn, `Missing browser coverage for ${name}`);
    const { startOffset, endOffset, count } = fn.ranges[0];
    const lines = source.slice(startOffset, endOffset).split('\n').filter(line => pattern.test(line));
    return [lines.length, count];
  }
  const brushSites = runRg(directory, [
    '-n', '-e', String.raw`brush\.(?:fill|fillBleed|fillTexture|set)\(`, 'src/watercolorCanvas.js',
  ]).lines.length;
  const measurements = [
    ['p5.brush', brushSites, Object.values(brushes).reduce((sum, count) => sum + count, 0)],
    // The bundle may rename perfect-freehand's getStroke export.
    ['perfect-freehand', ...sharedCalls('inkOutline', /\bconst outline\s*=\s*[\w$.]+\(samples\d*,/u)],
    ['Rough.js', ...sharedCalls('roughProp', /\bprops\[method\]\(/u)],
    ['flubber', ...sharedCalls('morphShape', /\binterpolate\(/u)],
  ];
  for (const [name, sites, executed] of measurements) {
    console.log(`[3] ${name} | call sites=${sites} | runtime calls=${executed}`);
    assert.ok(sites > 0 && executed > 0, `${name} must be called during drawing`);
  }
  console.log(`    brush.fill=${brushes.fill} fillBleed=${brushes.fillBleed} fillTexture=${brushes.fillTexture} set=${brushes.set}`);
  assert.ok(Object.values(brushes).every(count => count > 0));

  const surfaces = await page.evaluate(() => ({
    images: document.querySelectorAll('img, image').length,
    runtimeCanvases: document.querySelectorAll('#opening-stage').length,
  }));
  console.log(`    DOM image elements=${surfaces.images} | procedural paint canvases=${surfaces.runtimeCanvases}`);
  assert.equal(surfaces.images, 0);
  assert.ok(surfaces.runtimeCanvases > 0);

  const [first, second] = await Promise.all([early, late].map(buffer =>
    sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true })));
  assert.deepEqual(first.info, second.info);
  const { width, height, channels } = first.info;
  assert.equal(width, 1920);
  assert.equal(height, 880);
  assert.equal(channels, 3);
  let changed = 0;
  let strong = 0;
  for (let i = 0; i < first.data.length; i += channels) {
    const difference = Math.max(
      Math.abs(first.data[i] - second.data[i]),
      Math.abs(first.data[i + 1] - second.data[i + 1]),
      Math.abs(first.data[i + 2] - second.data[i + 2]),
    );
    changed += Number(difference > 0);
    strong += Number(difference > 8);
  }
  const pixels = width * height;
  console.log(`[4] S03 @ p=0.20 vs p=0.80 | crop x=0 y=0 ${width}x${height}`);
  console.log(`    changed pixels=${changed}/${pixels} (${(changed / pixels * 100).toFixed(2)}%)`);
  console.log(`    max RGB delta > 8: ${strong}/${pixels} (${(strong / pixels * 100).toFixed(2)}%)`);
  assert.ok(strong / pixels > .015, 'Main artwork must change by more than 1.5%');

  console.log('[5] Whole-frame MD5 | pass 1: A → B | pass 2: B → A');
  const md5 = buffer => createHash('md5').update(buffer).digest('hex');
  let allMatch = true;
  for (const { time, first, second } of determinism) {
    const a = md5(first);
    const b = md5(second);
    console.log(`    t=${time.toFixed(6)}s | ${a} | ${b} | ${a === b ? 'MATCH' : 'MISMATCH'}`);
    if (a !== b) {
      allMatch = false;
      const [left, right] = await Promise.all([first, second].map(buffer =>
        sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true })));
      const { width: w, height: h } = left.info;
      let minX = w, minY = h, maxX = -1, maxY = -1, count = 0, peak = 0;
      for (let i = 0, pixel = 0; i < left.data.length; i += 3, pixel++) {
        const delta = Math.max(...[0, 1, 2].map(channel =>
          Math.abs(left.data[i + channel] - right.data[i + channel])));
        if (delta === 0) continue;
        const x = pixel % w;
        const y = Math.floor(pixel / w);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        count++;
        peak = Math.max(peak, delta);
      }
      console.log(`      changed pixels=${count} | max RGB delta=${peak} | bounds=(${minX},${minY})–(${maxX},${maxY})`);
    }
  }
  assert.ok(allMatch, 'A frame depends on seek order');
  console.log('Gate 1  PASS  (5/5)');
}
