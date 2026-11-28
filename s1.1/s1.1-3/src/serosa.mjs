import {
  HEIGHT, RED, WIDTH, cellDot, clamp, closedCurve, createRaster, drawRasterCrop, fillPath, ink, lerp, logicalContext, mulberry32, organic,
  roughProp, strokePath,
} from '../../shared/canvasCore.js';
import { drawMicroNeutrophil, histologyRecipe } from '../../shared/histologyProcedural.js';
import { canvasSlot, createSurface, mountSurface, paintSurface, wash } from './brush.mjs';
import { band, edgePath, group, ramp, selectIds } from './geometry.mjs';
import { inkTrail } from './ink-trail.mjs';

export const detailView = Object.freeze({ x: 980, y: 445, rx: 560, ry: 275 });
const { x: cx, y: cy, rx, ry } = detailView;
const left = cx - rx;
const right = cx + rx;
const face = x => 335 + 8 * Math.sin((x - 528) / 131) + 4 * Math.sin(x / 51);
const ground = band(x => face(x) - 3, () => 735, left - 20, right + 20, 8);
const phlegmon = histologyRecipe('phlegmon');
const initialCoverage = .70;
const initialReveal = (count, index) => clamp(count * initialCoverage - index);

const bundles = [
  [.13, 13, .4, '#CF5E88'], [.29, 15, 1.9, '#C64877'], [.45, 15, 2.7, '#AA426D'],
  [.61, 21, .9, '#CE5783'], [.80, 14, 2.2, '#AA3658'],
];
const bundleY = (x, [depth, , phase]) => lerp(170, face(x), depth)
  + 9 * Math.sin((x - 570) / 151 + phase) + 4.7 * Math.sin(x / 67 + phase);
const inside = (x, y, pad = 0) => ((x - cx) / (rx - pad)) ** 2 + ((y - cy) / (ry - pad)) ** 2 < 1;
const halfWidthAt = y => rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2));

function pigmentBed() {
  const pools = [
    [559, 440, 146, 74, '#DBAB57', 61], [801, 404, 172, 73, '#DAC281', 72],
    [1040, 477, 212, 92, '#C7AB74', 65], [1307, 443, 166, 73, '#DBAE57', 77],
    [1433, 522, 146, 108, '#BAA06B', 71], [681, 565, 168, 86, '#CCB071', 69],
    [917, 595, 189, 93, '#DFBF63', 64], [1193, 643, 177, 79, '#DDB451', 71],
    [1016, 689, 202, 45, '#BFAA75', 61], [1254, 552, 139, 63, '#E8CB8E', 69],
  ];
  const muscle = paintSurface(33112, () => {
    const pink = band(x => 174 + 6 * Math.sin(x / 77), face, left - 16, right + 16, 10);
    wash(pink, '#D991AD', 59, { bleed: .25, texture: .76, border: .42 });
    for (const bundle of bundles) {
      const [, width, phase, color] = bundle;
      const outline = band(x => bundleY(x, bundle) - width * (.66 + .26 * Math.sin(x / 89 + phase)),
        x => bundleY(x, bundle) + width * (.74 + .24 * Math.sin(x / 123 + phase)), left - 16, right + 16);
      wash(outline, color, 113, { bleed: .19, texture: .84, border: .43, angle: 162 });
    }
    wash(band(x => face(x) - 21, x => face(x) + 10, left - 12, right + 12), '#9B364E', 105,
      { bleed: .23, texture: .89, border: .57, split: .25 });
  });
  const liquid = paintSurface(35187, () => {
    wash(ground, '#DFBC54', 52, { bleed: .45, texture: .55, border: .35 });
    pools.forEach(([x, y, a, b, color, alpha], i) => {
      wash(organic(x, y, a, b, 1781 + i * 379, .24, .27 - .078 * i, 22), color, alpha,
        { bleed: .25 + (i % 5) * .024, texture: .81, border: .42, split: .27 });
    });
  });
  return { muscle, liquid };
}

function muscleFibres() {
  const rand = mulberry32(2637);
  const contour = ink(edgePath(left - 8, right + 8, x => face(x) - 2, 8),
    { color: '#9B3C54', size: 5.1, opacity: .65, seed: 1907 });
  const strokes = Array.from({ length: 430 }, (_, i) => {
    const bundle = bundles[i % bundles.length];
    const x = left + rand() * (right - left);
    const shift = (rand() - .5) * (bundle[1] * 1.78 + 3);
    const y = bundleY(x, bundle) + shift;
    const width = 13 + rand() * 74;
    const dye = ['#F7D1DD', '#A94669', '#F0AFC7', '#C45B7C', '#BC436C'][i % 5];
    const trail = strokePath(`M${x} ${y} Q${x + width * .44} ${bundleY(x + width * .44, bundle) + shift - 1.6}
      ${x + width} ${bundleY(x + width, bundle) + shift}`, dye, .51 + rand() * 1.49, .20 + rand() * .40);
    if (i % 3 !== 0) return trail;
    const nx = x + width * .28;
    const ny = bundleY(nx, bundle) + shift;
    const rotation = 180 / Math.PI * Math.atan2(bundleY(nx + 5, bundle) - bundleY(nx - 5, bundle), 10);
    return trail + cellDot(nx, ny, 4.5 + rand() * 6.1, .93 + rand() * .9, '#713056', rotation, .48 + rand() * .32);
  }).join('');
  const smallCongestion = [[582, 313, 32], [828, 308, 26], [1197, 324, 42], [1405, 314, 36]].map(([x, y, r], i) => {
    const bed = organic(x, y, r, 9 + i, 985 + i * 89, .36, -.06, 16);
    const discs = Array.from({ length: 9 }, (_, j) => {
      const tx = x + (j / 8 - .5) * r * 1.52;
      return cellDot(tx, y + (rand() - .5) * 10, 2.8 + rand() * 1.6, 1.46 + rand() * 1.08,
        j % 3 ? '#B9334C' : '#CD6574', rand() * 165, .53 + rand() * .31);
    }).join('');
    return fillPath(bed, '#A84A62', .47) + strokePath(bed, '#9A405B', 1, .67) + discs;
  }).join('');
  return `<defs><clipPath id="macro-muscle-clip"><path d="${band(() => 158, x => face(x) + 7, left - 24, right + 24, 9)}"/></clipPath></defs>
    <g clip-path="url(#macro-muscle-clip)">${strokes}${smallCongestion}</g>${contour}`;
}

function fibrin() {
  const rand = mulberry32(9504);
  const levels = [350, 385, 430, 477, 520, 566, 612, 654, 686];
  const rows = levels.map((y, i) => {
    const ext = halfWidthAt(y) - 28;
    const n = Math.round(2 * ext / 85);
    return Array.from({ length: n }, (_, j) => [
      cx + lerp(-ext, ext, (j + .3 + rand() * .4) / n),
      y + (rand() - .5) * (19 + i % 3 * 9),
    ]);
  });
  const woven = [];
  rows.slice(0, -1).forEach((row, i) => {
    row.forEach(([x, y], j) => {
      const next = rows[i + 1];
      const idx = Math.min(next.length - 1, Math.max(0, Math.round((j + (i % 2 ? .5 : -.15)) / row.length * next.length)));
      const [tx, ty] = next[idx];
      const bend = (rand() - .5) * 123;
      const arc = `M${x} ${y} C${lerp(x, tx, .36) + bend} ${lerp(y, ty, .28) - 9}
        ${lerp(x, tx, .64) + bend * .18} ${lerp(y, ty, .69) + 11} ${tx} ${ty}`;
      woven.push(arc);
      if (j % 2 === i % 2 && j + 1 < row.length) {
        const [nx, ny] = row[j + 1];
        woven.push(`M${x} ${y} C${lerp(x, nx, .34)} ${y + Math.sin(j + 2) * 29}
          ${lerp(x, nx, .71)} ${ny + Math.cos(i + j) * 17} ${nx} ${ny}`);
      }
    });
  });
  const flows = [
    'M510 397 C621 422 671 382 741 420 S863 465 957 438 1122 410 1187 451',
    'M474 471 C554 441 591 471 660 486 S781 452 843 487 947 539 1088 498',
    'M549 593 C626 530 698 576 769 541 S919 539 982 569 1119 614 1238 562',
    'M647 638 C715 600 807 662 920 618 S1062 592 1165 635 1346 601 1381 563',
    'M1044 502 C1170 466 1185 514 1251 494 S1361 490 1423 522 Q1469 540 1512 510',
    'M743 684 C843 658 908 686 1015 665 S1140 649 1241 652',
    'M1124 358 C1080 399 1167 419 1213 426 S1408 424 1462 467',
  ];
  const under = [];
  const over = [];
  const weaveCount = Math.ceil(phlegmon.fibrin * 1.40) - flows.length;
  const selected = woven.filter((_, i) =>
    Math.floor(i * weaveCount / woven.length) !== Math.floor((i + 1) * weaveCount / woven.length));
  const threads = [...selected, ...flows].map((d, i) => {
    const forward = i % 6 === 2 || i >= selected.length - 1;
    const target = forward ? over : under;
    const id = `macro-thread-${i}`;
    const dye = i % 4 === 1 ? '#D48086' : '#B87B1A';
    const stout = i >= selected.length ? 2.1 + rand() * 1.3 : .76 + rand() * 1.37;
    const frontStroke = strokePath(d, dye, stout, .58 + rand() * .23);
    const relief = stout > 1.9
      ? `<g transform="translate(.65 .9)">${strokePath(d, '#946036', stout + .95, .22)}</g>`
        + frontStroke + `<g transform="translate(-.52 -.76)">${strokePath(d, '#FFF0B8', .67, .65)}</g>`
      : frontStroke;
    target.push(group(id, relief));
    const arrival = i < selected.length ? .19 + .33 * (i / selected.length) + rand() * .038
      : .13 + .043 * (i - selected.length);
    return { id, arrival, travel: .13 + .07 * rand() };
  });
  return { under: under.join(''), over: over.join(''), threads };
}

function pusCells() {
  const rand = mulberry32(17645);
  const count = Math.round(phlegmon.serosalPus * .84);
  const anchor = [542, 460];
  const points = [anchor];
  const clusters = [[592,421,83,38],[715,492,87,56],[820,394,110,53],[946,562,104,96],
    [1094,445,114,50],[1208,546,94,84],[1386,476,90,52],[1140,658,109,50],[778,615,113,72]];
  for (let k = 0; points.length < count && k < 16000; k++) {
    const [cx, cy, a, b] = clusters[k % clusters.length];
    const x = cx + (rand() + rand() - 1) * a * 1.55;
    const y = cy + (rand() + rand() - 1) * b * 1.28;
    if (inside(x, y, 14) && y > face(x) + 18
      && points.every(([px, py]) => (x - px) ** 2 + (y - py) ** 2 >= 20 ** 2)) {
      points.push([x, y]);
    }
  }
  if (points.length !== count) throw new Error('Could not place all high-power pus cells');
  const tile = 32;
  const across = 12;
  const atlas = createRaster(tile * across, tile * Math.ceil(count / across));
  const ctx = logicalContext(atlas);
  // Remap the frozen recipe's two pigments while keeping its seeded fragments intact.
  const pigments = new Map([['#2B123E', '#2B0F54'], ['rgba(245,240,224,.48)', 'transparent']]);
  const fragmentContext = new Proxy(ctx, {
    get(target, key) {
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, key, value) {
      return Reflect.set(target, key, key === 'fillStyle' ? pigments.get(value) ?? value : value, target);
    },
  });
  const sprites = points.map(([positionX, positionY], i) => {
    const tx = (i % across) * tile;
    const ty = Math.floor(i / across) * tile;
    const x = tx + tile / 2;
    const y = ty + tile / 2;
    const diameter = i === 0 ? 20 : 16 + 4 * rand();
    const r = diameter / 2;
    const tear = Math.floor(rand() * 16);
    const angle = rand() * 6;
    const cells = Array.from({ length: 18 }, (_, j) => {
      const theta = j * Math.PI / 9 + angle;
      const radius = r * (j === tear || j === tear + 1 ? .67 : .88 + rand() * .20);
      return [x + Math.cos(theta) * radius, y + Math.sin(theta) * radius * (.81 + (i % 5) * .036)];
    });
    const wall = new Path2D(closedCurve(cells));
    ctx.fillStyle = i % 3 ? 'rgba(247,230,211,.44)' : 'rgba(238,222,219,.44)';
    ctx.fill(wall);
    ctx.strokeStyle = i % 5 ? 'rgba(154,100,126,.63)' : 'rgba(157,110,90,.59)';
    ctx.lineWidth = .69;
    ctx.stroke(wall);
    drawMicroNeutrophil(fragmentContext, x, y, 334 + i * 971, {
      karyorrhexis: true, scale: diameter / 9.6, alpha: i % 7 === 4 ? .64 : 1,
    });
    return { x: positionX, y: positionY, tx, ty,
      begins: .22 + .054 * (i % 8) + .018 * rand(), phase: 2 * Math.PI * rand() };
  });
  return {
    count, anchor,
    draw(canvas, p, prime) {
      const draw = canvas.getContext('2d');
      draw.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
      draw.clearRect(0, 0, WIDTH, HEIGHT);
      let visible = 0;
      let coverage = 0;
      for (const [i, { x, y, tx, ty, begins, phase }] of sprites.entries()) {
        const emergence = Math.max(initialReveal(count, i) * prime, ramp(p, begins * .57, begins * .57 + .11));
        if (emergence === 0) continue;
        coverage += emergence;
        const wave = p * Math.PI * 5.8 + phase;
        const spread = tile * (.92 + .08 * emergence + .015 * Math.sin(wave));
        draw.globalAlpha = emergence * (.965 + .035 * Math.sin(wave + .5));
        drawRasterCrop(draw, atlas, tx, ty, tile, tile,
          x + .70 * Math.sin(wave) - spread / 2,
          y + 1.15 * Math.cos(wave * .89) - spread / 2, spread, spread);
        visible++;
      }
      draw.globalAlpha = 1;
      return { visible, fraction: coverage / count };
    },
  };
}

function granules() {
  const rand = mulberry32(7711);
  const tint = ['#9C6D4D', '#BDE0C2', '#DCAB6B', '#BB8584', '#AF9357'];
  return Array.from({ length: 1050 }, (_, i) => {
    const x = left + rand() * (right - left);
    const y = lerp(face(x) + 3, 720, rand());
    if (!inside(x, y, 4)) return '';
    return cellDot(x, y, .45 + rand() * 1.08, .41 + rand() * .83, tint[i % tint.length],
      rand() * 180, .17 + rand() * .26);
  }).join('');
}

export function createSerosaDetail(pixelScale = 1) {
  const pigment = pigmentBed();
  const network = fibrin();
  const pus = pusCells();
  const [cellX, cellY] = pus.anchor;
  const ellipse = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"`;
  const rings = roughProp('ellipse', [cx, cy, rx * 2 + 11, ry * 2 + 11], 8198, '#665047', 2.7, .30)
    + roughProp('ellipse', [cx, cy, rx * 2 + 1, ry * 2 + 1], 6481, '#B58B64', 1.75, .29);
  const calloutCell = inkTrail(`M473 213 C425 251 403 311 433 378 Q467 446 ${cellX - 4} ${cellY - 1}`,
    { color: '#704451', head: 15, size: 3.8, seed: 28 });
  const calloutMesh = inkTrail('M1625 213 C1646 284 1612 413 1560 470 Q1507 524 1423 522',
    { color: '#87622C', head: 15, size: 3.8, seed: 64 });
  const initialThreadRanks = new Map(network.threads.map((thread, i) => ({ id: thread.id, order: (i * 73) % network.threads.length }))
    .sort((a, b) => a.order - b.order).map(({ id }, index) => [id, index]));
  const audit = { highPowerCells: pus.count, fibrinThreads: network.threads.length, highPowerLens: detailView };
  let threads;
  let washNode;
  let cellsCanvas;
  let labels;
  let cellTrail;
  let meshTrail;
  return {
    audit,
    paint: `<defs>
      <clipPath id="macro-oval">${ellipse}/></clipPath>
      <clipPath id="macro-serosal-bed"><path d="${ground}"/></clipPath>
    </defs>
    <g clip-path="url(#macro-oval)">
      ${ellipse} fill="#FEFAFB"/>
      ${fillPath(ground, '#DED0A4', .17)}
      ${group('macro-upper', canvasSlot('macro-muscle-wash') + muscleFibres(), 'data-paint-cache=""')}
      <g clip-path="url(#macro-serosal-bed)">
        ${group('macro-spreading-wash', canvasSlot('macro-watercolor'))}
        ${group('macro-granules', granules(), 'data-paint-cache=""')}
        ${network.under}${canvasSlot('macro-pus')}${network.over}
      </g>
    </g>${rings}`,
    lettering: `
      ${group('macro-view', `<rect x="340" y="112" width="330" height="47" rx="23" fill="#DCE9E9" fill-opacity=".84"
        stroke="#81A2AB" stroke-width="1.1" stroke-opacity=".66"/>
        <text class="note title" x="505" y="143" text-anchor="middle" font-size="22" fill="#315665">【视角切换 · 浆膜面高倍观】</text>`)}
      ${group('macro-pus-label', `<text class="note title" x="340" y="201" font-size="24" fill="#1F1C19">变性坏死的中性粒细胞（脓细胞）</text>
        <g id="macro-pus-trail"></g>`)}
      ${group('macro-fibrin-label', `<text class="note title" x="1610" y="201" font-size="24" fill="#1F1C19">交织纤维素</text>
        <g id="macro-mesh-trail"></g>`)}
      ${group('macro-result', `<text class="note title" x="980" y="786" text-anchor="middle" font-size="28"
        fill="#2A2622">浆膜面外观真相：变性坏死的中性粒细胞（脓细胞）+ 交织纤维素</text>
        <text class="note title" x="980" y="827" text-anchor="middle" font-size="30"
          fill="${RED}">= 纤维素性脓性渗出物 → 肉眼呈灰黄色脓苔</text>`)}`,
    mount(art, lettering) {
      mountSurface(art, 'macro-muscle-wash', pigment.muscle);
      mountSurface(art, 'macro-watercolor', pigment.liquid);
      cellsCanvas = mountSurface(art, 'macro-pus', createSurface(pixelScale));
      washNode = art.querySelector('#macro-spreading-wash');
      threads = network.threads.map(thread => {
        const node = art.querySelector(`#${thread.id}`);
        const strokes = [...node.querySelectorAll('path')];
        return { ...thread, node, strokes, length: strokes[0].getTotalLength() + 1,
          initial: initialReveal(network.threads.length, initialThreadRanks.get(thread.id)) };
      });
      labels = selectIds(lettering, ['macro-view', 'macro-pus-label', 'macro-fibrin-label', 'macro-pus-trail',
        'macro-mesh-trail', 'macro-result']);
    },
    update(_lettering, p, prime) {
      const diffusion = lerp(.34 + .33 * prime, 1, ramp(p, .03, .56));
      washNode.setAttribute('opacity', diffusion);
      washNode.setAttribute('transform',
        `translate(${cx} 332) scale(${lerp(.65, 1, diffusion)} ${lerp(.24, 1, diffusion)}) translate(${-cx} -332)`);
      const cells = pus.draw(cellsCanvas, p, prime);
      audit.visiblePus = cells.visible;
      audit.pusFraction = cells.fraction;
      let woven = 0;
      for (const thread of threads) {
        const { node, strokes, length, arrival, travel, initial } = thread;
        const f = Math.max(initial * prime, ramp(p, arrival * .61, (arrival + travel) * .66));
        woven += f;
        if (thread.previous === f) continue;
        node.setAttribute('opacity', f > 0 ? 1 : 0);
        for (const stroke of strokes) {
          stroke.setAttribute('stroke-dasharray', f === 1 ? '' : `${length} ${length}`);
          stroke.setAttribute('stroke-dashoffset', (1 - f) * length);
        }
        thread.previous = f;
      }
      audit.wovenFraction = woven / threads.length;
      labels['macro-view'].setAttribute('opacity', ramp(p, 0, .10));
      labels['macro-pus-label'].setAttribute('opacity', ramp(p, .035, .19));
      labels['macro-fibrin-label'].setAttribute('opacity', ramp(p, .04, .20));
      const stopCell = ramp(p, .055, .28);
      const stopMesh = ramp(p, .065, .30);
      if (cellTrail !== stopCell) {
        labels['macro-pus-trail'].innerHTML = calloutCell(stopCell);
        cellTrail = stopCell;
      }
      if (meshTrail !== stopMesh) {
        labels['macro-mesh-trail'].innerHTML = calloutMesh(stopMesh);
        meshTrail = stopMesh;
      }
      const result = ramp(p, .23, .36);
      labels['macro-result'].setAttribute('opacity', result);
      labels['macro-result'].setAttribute('transform', `translate(0 ${6 * (1 - result)})`);
    },
  };
}
