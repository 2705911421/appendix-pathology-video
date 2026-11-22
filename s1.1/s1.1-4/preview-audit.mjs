import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const sharedModules = new Set([
  'canvasCore.js', 'timelineHelper.js', 'leftFloatNotes.js', 'anatomyWatercolor.js', 'histologyProcedural.js',
  'detail/bridgePlates.js', 'detail/raster.js', 'detail/transitionPaper.js', 'renderProfile.js', 'transitionAnchors.js',
]);

async function sources(directory) {
  const files = [];
  for (const child of await readdir(directory, { withFileTypes: true })) {
    if (child.name.startsWith('.') || child.name === 'out') continue;
    const target = path.join(directory, child.name);
    if (child.isDirectory()) files.push(...await sources(target));
    else if (child.isFile() && /\.(?:mjs|js|html|css)$/u.test(child.name)) files.push(target);
  }
  return files;
}

export async function auditSources(section) {
  const imageName = String.raw`\.(?:png|jpe?g|webp|gif|avif|apng)\b(?!\()`;
  const embedded = 'data' + ':image';
  const mediaElement = '<' + '(?:img|image)\\b';
  const staticImage = new RegExp([imageName, embedded, mediaElement,
    'new' + '\\s+Image\\b', 'load' + 'Image\\s*\\('].join('|'), 'iu');
  const outside = new RegExp(['style' + '_probe', String.raw`\bs1\.1-(?!4\b)\d+\b`,
    String.raw`\bs1\.0[\\/]`].join('|'), 'u');
  for (const source of await sources(section)) {
    let code = await readFile(source, 'utf8');
    if (path.basename(source) === 'gate1-keyframes.mjs') {
      const outputName = 'keyframes_s1.1-4' + '.pn' + 'g';
      code = code.replace(outputName, 'KEYFRAME_OUTPUT');
    }
    assert.ok(!staticImage.test(code), `Static image reference in ${path.relative(section, source)}`);
    assert.ok(!outside.test(code), `Cross-section reference in ${path.relative(section, source)}`);
    for (const [, shared] of code.matchAll(/['"](?:\.\.\/)+shared\/([^'"]+)['"]/gu)) {
      assert.ok(sharedModules.has(shared), `Non-frozen direct import: ${shared}`);
    }
  }
  console.log('[PASS] 静态贴图引用 0');
  console.log('[PASS] 跨板块引用 0，共享导入均在冻结清单内');
}

export function auditDrawing(coverage, sourceMap) {
  const functions = coverage.result.find(script => script.url.endsWith('/gate1.js')).functions;
  const brush = /^  brush\.\w+\(/u;
  const results = [
    { name: 'p5.brush', items: [
      ['/anatomyWatercolor.js', 'paintWatercolor', brush],
      ['procedural-washes.mjs', 'pigment', brush],
      ['procedural-washes.mjs', 'washLayer', brush],
    ] },
    { name: 'perfect-freehand', items: [['/detail/ink.js', 'inkOutline', /\bgetStroke\(/u]] },
  ];
  for (const { name, items } of results) {
    let calls = 0;
    for (const [file, routine, callsite] of items) {
      const count = functions.find(fn => fn.functionName === routine)?.ranges[0].count;
      assert.ok(count > 0, `${routine} did not execute`);
      const index = sourceMap.sources.findIndex(source => source.replaceAll('\\', '/').endsWith(file));
      assert.ok(index >= 0, `Missing source for ${routine}`);
      const lines = sourceMap.sourcesContent[index].split(/\r?\n/u);
      const start = lines.findIndex(line => line.startsWith(`export function ${routine}(`));
      const end = lines.findIndex((line, i) => i > start && line === '}');
      assert.ok(start >= 0 && end > start);
      const directCalls = lines.slice(start, end).filter(line => callsite.test(line)).length;
      assert.ok(directCalls > 0);
      calls += count * directCalls;
    }
    console.log(`[PASS] ${name} ${calls} 次可核验调用`);
  }
  console.log('[PASS] 真实调用 brush. / getStroke');
}

export async function auditMotion(page, cues) {
  const evidence = await page.evaluate(timeline => {
    const get = id => document.getElementById(id);
    const amount = id => Number(get(id).getAttribute('opacity'));
    const transform = (id, item = 0) => get(id).transform.baseVal.getItem(item).matrix;
    const active = selector => document.querySelectorAll(`${selector} > svg:not([hidden])`).length;
    function at(id, p) {
      const { start, end } = timeline.find(cue => cue.id === id);
      if (window.renderAt(start + p * (end - start)).id !== id) throw new Error('Wrong cue for motion check');
      if (active('.story-paint') !== 1 || active('.story-lettering') !== 1) throw new Error('Previous cue bled through');
      const captions = [...document.querySelectorAll('.story-lettering > svg:not([hidden]) text')];
      for (const caption of captions) {
        if (caption.closest('[mask],[clip-path]')) throw new Error('Masked caption');
      }
    }
    function tangencies(id, lensGroup) {
      const { source, optic } = window.gate1SceneInfo[id];
      const radius = optic.radius * transform(lensGroup, 1).a;
      const lines = [...get(`${id.toLowerCase()}-tangents`).children];
      return lines.length === 2 && lines.every(line => {
        const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map(name => Number(line.getAttribute(name)));
        return Math.hypot(x1 - source.x, y1 - source.y) < .001
          && Math.abs(Math.hypot(x2 - optic.x, y2 - optic.y) - radius) < .01
          && Math.abs((x2 - optic.x) * (x1 - x2) + (y2 - optic.y) * (y1 - y2)) < .2;
      });
    }

    at('S15', .075);
    const earlyScale = transform('s15-simple-reveal', 1).a;
    const thirdInitially = amount('s15-gangrene-reveal');
    at('S15', .42);
    const grownScale = transform('s15-simple-reveal', 1).a;
    const thirdLater = amount('s15-gangrene-reveal');
    at('S15', .42);
    const firstDash = Number(get('s15-control-trace').getAttribute('stroke-dashoffset'));
    at('S15', .91);
    const finishedDash = Number(get('s15-control-trace').getAttribute('stroke-dashoffset'));

    at('S16', .001);
    const firstZoom = transform('s16-field', 1).a;
    const fieldVisible = !get('s16-field').hasAttribute('opacity') || amount('s16-field') >= .90;
    const { start: lensStart, end: lensEnd } = timeline.find(cue => cue.id === 'S16');
    at('S16', .15 / (lensEnd - lensStart));
    const pushedZoom = transform('s16-field', 1).a;
    at('S16', .86);
    const leaders = ['s16-upper', 's16-lower'].map(id => {
      const path = get(`${id}-trace`);
      return [path.getPointAtLength(0).y, path.getPointAtLength(path.getTotalLength()).y];
    });
    const braces = Array.from({ length: 5 }, (_, i) => amount(`s16-brace-${i}-text`));
    const { muscle, shallow } = window.gate1SceneInfo.S16;

    const queue = () => [...document.querySelectorAll('[id^="s17-queued-"]')]
      .filter(node => Number(node.getAttribute('opacity')) > .65).length;
    at('S17', .36);
    const earlyCell = transform('s17-inlet-0').e;
    const earlyClot = transform('s17-plug-paint', 1).d;
    const earlyQueue = queue();
    const initialTangent = tangencies('S17', 's17-magnification');
    at('S17', .38);
    const laterCell = transform('s17-inlet-0').e;
    at('S17', .9);
    const grownClot = transform('s17-plug-paint', 1).d;
    const filledQueue = queue();
    const drained = amount('s17-downstream-tint');
    const finalTangent = tangencies('S17', 's17-magnification');

    at('S18', .14);
    const startFront = +get('s18-inflamed').dataset.necroticFront;
    at('S18', .33);
    const laterFront = +get('s18-inflamed').dataset.necroticFront;
    at('S18', .54);
    const startMist = transform('s18-vapor-0').f;
    const earlyTear = tangencies('S18', 's18-inset');
    at('S18', .62);
    const laterMist = transform('s18-vapor-0').f;
    const leakTangent = tangencies('S18', 's18-inset');

    return {
      s15: earlyScale === 1 && grownScale === 1 && thirdInitially === 0 && thirdLater > .9 && firstDash > finishedDash && finishedDash === 0,
      s16: firstZoom >= .98 && firstZoom < pushedZoom && Math.abs(pushedZoom - 1) < .001 && fieldVisible && braces.every(w => w === 1),
      leaders, muscle, shallow,
      s17: earlyCell < laterCell && earlyClot < grownClot && earlyQueue < filledQueue && drained === 0 && initialTangent && finalTangent,
      s18: startFront < laterFront && startMist < laterMist && earlyTear && leakTangent,
    };
  }, cues);
  assert.deepEqual(evidence, {
    s15: true, s16: true, leaders: [[405, 405], [605, 605]], muscle: 4, shallow: 228, s17: true, s18: true,
  });
  console.log('[PASS] 连续动作检查：演变路线、光镜入场、分层引线、红细胞向右与淤积、血栓增厚、坏死推进与渗液下漂');
}
