import {INK, blob, ellipse, layer, line, mix, polygon, prng, shape, wash} from './art.js';

export const SIMPLE_MUSCLE = [[153, 356, 2], [261, 392, 3], [367, 349, 4], [431, 405, 5]];
export const LAYERS = [['管腔（脓液）', 72], ['黏膜', 164], ['黏膜下层', 259], ['肌层', 383], ['浆膜', 498]];
const vessels = [[274,263,69,23],[422,239,36,12]];
const chronicVessels = [[167,257,40,14]];
const nuclearLobes = {
  2: [[-.48,-.09],[.47,.14]],
  3: [[-.51,.22],[-.10,-.43],[.51,.14]],
  4: [[-.52,.31],[-.49,-.25],[.08,-.46],[.53,.06]],
  5: [[-.50,.32],[-.54,-.20],[-.12,-.52],[.41,-.39],[.53,.17]],
};

export function neutrophil(g, x, y, r, lobes, seed, dead = false) {
  const rand = prng(seed);
  blob(g, x, y, 1.05 * r, r, dead ? '#F1E5E9' : '#EADCF5', seed,
    r >= 7 ? '#5A3778' : '#936C9F');
  const spin = rand() * 6.283;
  const [cos, sin] = [Math.cos(spin), Math.sin(spin)];
  const centres = nuclearLobes[lobes].map(([u,v]) => [x + r * (u*cos - v*sin), y + r * (u*sin + v*cos)]);
  if (!dead) line(g, centres, '#43186E', Math.max(.45, r * .066));
  for (const [cx, cy] of centres) {
    const radius = r * (dead ? .07 + rand() * .09 : lobes <= 3 ? .228 : .188);
    ellipse(g, cx, cy, radius * 1.13, radius, dead ? '#714764' : '#43186E', null, 1, rand() * 4);
    if (!dead && r > 9) ellipse(g, cx - radius * .17, cy - radius * .2, radius * .34, radius * .22, '#8251A67D');
  }
  for (let i = 0; i < (r > 9 ? 12 : 3); i++) {
    const a = rand() * 6.28, d = r * (.63 + rand() * .19);
    ellipse(g, x + Math.cos(a) * d, y + Math.sin(a) * d, Math.max(.38, r * .048), Math.max(.37, r * .041), dead ? '#A56D8D' : '#BC78A0A0');
  }
}

function gobletCell(g, x, y, width, height) {
  const top = y - height / 2, bottom = top + height, half = width / 2;
  const fill = g.createLinearGradient(x - half, y, x + half, y);
  fill.addColorStop(0, '#FFF7F0B0');
  fill.addColorStop(.55, '#FFFDF9');
  fill.addColorStop(1, '#F8E8EE');
  shape(g, `M${x-half} ${top+height*.26} C${x-half} ${top-height*.04} ${x+half} ${top-height*.04} ${x+half} ${top+height*.23}
    C${x+half} ${y+height*.13} ${x+half*.46} ${bottom-height*.22} ${x+half*.43} ${bottom-height*.07}
    Q${x} ${bottom+height*.05} ${x-half*.44} ${bottom-height*.06} C${x-half*.45} ${bottom-height*.30} ${x-half} ${y+height*.15} ${x-half} ${top+height*.26}Z`, fill, '#9D6A91', Math.max(.55, width*.04));
  ellipse(g, x, bottom - height * .104, width*.245, height*.065, '#583064', null, 1, -.08);
}

function band(g, top, bottom, color, seed) {
  const path = new Path2D();
  const wave = x => 8 * Math.sin(x / 59 + seed) + 3 * Math.sin(x / 16 + seed);
  path.moveTo(-20, top);
  for (let x = 0; x <= 600; x += 10) path.lineTo(x, top + wave(x));
  for (let x = 600; x >= -20; x -= 10) path.lineTo(x, bottom + wave(x + 45));
  path.closePath();
  shape(g, path, color);
}

function crypts(g, mode) {
  const rand = prng(350);
  for (let i = 0; i < 11; i++) {
    const x = 48 + i * 44;
    const y = 112 + rand() * 16;
    const lo = 176 + rand() * 32;
    if (mode !== 'normal' && mode !== 'chronic' && i >= 5 && i <= 6) continue;
    const p = `M${x - 16} ${y} C${x - 25} ${y + 38} ${x - 17} ${lo} ${x - 4} ${lo}
      C${x + 22} ${lo + 4} ${x + 13} ${y + 38} ${x + 14} ${y}Z`;
    shape(g, p, '#F2C4D4', '#CB86A5', 2.1);
    shape(g, `M${x - 3} ${y - 2} Q${x-12} ${lo - 6} ${x - 3} ${lo - 10} Q${x + 8} ${lo-9} ${x + 3} ${y}`, '#FFF0EA', '#E9A8BF', 1.1);
    for (let j = 0; j < 8; j++) {
      for (const side of [-1, 1]) {
        const px = x + side * (9 + rand() * 4), py = y + 5 + j * (lo - y - 12) / 8;
        const goblet = (j + i + (side === 1 ? 1 : 0)) % 3 === 0;
        if (goblet) gobletCell(g, px, py, 9, 13);
        else {
          ellipse(g, px, py, 3.2, 5.9, '#F6D0DC', '#BD7D9F', .65, .16);
          ellipse(g, px + 1, py + 1.8, 1.9, 2.7, '#683960', null, 1, -.04);
        }
      }
    }
  }
  if (mode === 'normal' || mode === 'chronic') return;
  blob(g, 286, 137, 68, 31, '#F6AEB75F', 16);
  line(g, [[229,124],[246,138],[266,134],[275,155],[307,154],[327,126],[345,125]], '#A55A80', 2.5, [5, 6]);
  for (let i = 0; i < 68; i++) {
    const x = 239 + rand() * 105, y = 116 + rand() * 48;
    ellipse(g, x, y, .65 + rand() * 2, .74 + rand() * 1.2, i % 3 ? '#A75E85B9' : '#E9939D');
  }
}

function vessel(g, x, y, rx, ry, seed) {
  const rand = prng(seed);
  ellipse(g, x, y, rx + 6, ry + 5, '#C880A279', '#BE759B', 1.8, -.06);
  ellipse(g, x, y, rx, ry, '#FFE8E2', '#AC5D81', 2, -.06);
  for (let i = 0; i < 95; i++) {
    const a = 2 * Math.PI * rand(), d = .91 * Math.sqrt(rand());
    const px = x + Math.cos(a) * d * rx, py = y + Math.sin(a) * d * ry;
    const rot = (rand() - .5) * 1.8;
    ellipse(g, px, py, 2.6 + rand() * 3.7, 2 + rand() * 2.7, i % 4 ? '#D63031B8' : '#AE284A', '#9E365165', .45, rot);
    ellipse(g, px, py, 1.9, 1.1, '#FFD2C9B8', null, 0, rot);
  }
  for (let i = 0; i < 13; i++) {
    const a = i * Math.PI / 6.5;
    ellipse(g, x + Math.cos(a) * (rx + 2), y + Math.sin(a) * (ry + 2), 4.9, 1.45, '#603B6C', null, 1, a + Math.PI / 2);
  }
}

function flowingBlood(g, x, y, rx, ry, elapsed, scale = 1) {
  g.save();
  const lumen = new Path2D();
  lumen.ellipse(x,y,(rx-1)*scale,(ry-1)*scale,-.06,0,2*Math.PI);
  g.clip(lumen);
  for (let i = 0; i < 24; i++) {
    const q = (elapsed * (.14 + (i % 5) * .016) + i * .173) % 1;
    const dx = 2 * q - 1;
    const py = y + ry * scale * .67 * Math.sqrt(Math.max(0, 1 - dx ** 2)) * Math.sin(i * 2.8 + elapsed*.8);
    g.globalAlpha *= .50 + .42*Math.sin(Math.PI*q);
    const px = x + dx*rx*scale;
    ellipse(g, px, py, (3.3 + i % 3 * .63)*scale, 2.7*scale,
      i % 3 ? '#BF424D' : '#D76A69', '#A53954', .5*scale, -.14);
    ellipse(g, px + .25, py, 1.8*scale, 1.1*scale, '#F1ABA0');
    g.globalAlpha /= .50 + .42*Math.sin(Math.PI*q);
  }
  g.restore();
}

export function tissueMotion(g, mode, topic, x, y, radius, elapsed) {
  const k = radius / 280;
  g.save(); g.translate(x-radius,y-radius); g.scale(k,k);
  const plane = new Path2D(); plane.arc(280,280,268,0,Math.PI*2); g.clip(plane);
  const visibleVessels = mode === 'chronic' ? chronicVessels : vessels;
  for (const [cx,cy,rx,ry] of visibleVessels) flowingBlood(g,cx,cy,rx,ry,elapsed);
  if (mode === 'phlegmon' && ['vessel','cells','phlegmon','serosa'].includes(topic)) {
    const destY = topic === 'serosa' ? 512 : topic === 'vessel' ? 357 : 441;
    for (let i = 0; i < 7; i++) {
      const raw = (elapsed / 5.5 + i / 7) % 1;
      const startX = 242 + i * 11 + 5 * Math.sin(i);
      const route = Math.sin(raw*Math.PI);
      const px = startX + (i - 3) * 16 * raw + 10 * route;
      const py = mix(267, destY - i * 5, raw ** 1.25);
      g.globalAlpha = Math.sin(Math.PI * raw) ** .64;
      neutrophil(g, px, py, 7.1 + raw * 1.1, i % 4 + 2, 812 + i);
    }
  }
  g.restore();
}

export function vesselInsetMotion(g, x, y, radius, elapsed) {
  const k = radius / 90;
  flowingBlood(g, x, y - 18*k, 69, 25, elapsed, k);
}

function gangrenousField(g, rand) {
  const haemorrhage = g.createRadialGradient(251,250,19,270,256,151);
  haemorrhage.addColorStop(0,'#A52E43E0'); haemorrhage.addColorStop(.55,'#AB385AB5');
  haemorrhage.addColorStop(1,'#AB385A00');
  blob(g,271,258,146,162,haemorrhage,346);
  const necrotic = 'M315 108 C357 100 397 115 434 145 C472 177 475 201 491 249 Q513 278 504 314 C520 350 529 413 500 438 C469 483 426 502 384 491 C363 475 342 455 332 440 C305 426 291 393 307 356 Q269 318 286 282 Q266 247 287 211 C264 180 289 129 315 108Z';
  const stain = g.createRadialGradient(396,322,26,390,301,218);
  stain.addColorStop(0,'#65546E'); stain.addColorStop(.53,'#A18196'); stain.addColorStop(1,'#CE9BA887');
  g.save(); g.clip(shape(g,necrotic,stain));
  wash(g,'lilac',393,307,364,.50);
  for (let i=0;i<1100;i++) {
    const x=275+rand()*237, y=115+rand()*388;
    const color=y<241 || x>446 ? '#9A304B84' : i%2 ? '#5A4265AA' : '#D5A8B39B';
    ellipse(g,x,y,.65+rand()*3.4,.44+rand()*2,color,null,1,rand()*3.14);
  }
  g.restore();
  const bleed = g.createRadialGradient(352,178,18,347,205,119);
  bleed.addColorStop(0,'#A12E4DBD'); bleed.addColorStop(1,'#A12E4D00');
  blob(g,348,194,100,115,bleed,981);
  const defect = 'M550 330 C536 334 519 336 500 331 Q477 327 463 343 C453 355 462 360 449 374 Q440 386 421 392 Q429 402 449 405 C469 403 466 423 484 439 C510 444 533 429 554 441Z';
  const debris = g.createLinearGradient(427,374,552,418);
  debris.addColorStop(0,'#B98E96'); debris.addColorStop(.38,'#E8C6C3'); debris.addColorStop(1,'#F6DCCE');
  shape(g,defect,debris,'#84516679',2.4);
  shape(g,'M446 392 Q467 386 474 369 M472 336 Q485 329 496 333 M455 407 Q472 412 485 437',null,'#733D52AA',3.1);
  for (let i=0;i<34;i++) {
    const x=449+rand()*56, y=352+rand()*77;
    ellipse(g,x,y,1+rand()*3,1+rand()*1.6,i%3?'#B0788A86':'#79475B94');
  }
}

function fibre(g, y, seed, color, width) {
  const rand = prng(seed);
  const dx = rand() * 270;
  shape(g, `M${-30 + dx} ${y} C${40 + dx} ${y + 20 * rand()} ${105 + dx} ${y - 14 * rand()} ${202 + dx} ${y + (rand() - .5) * 23}
    S${377 + dx} ${y + (rand() - .5) * 22} ${460 + dx} ${y + 12}`, null, color, width);
}

function lymphocyte(g, x, y, r) {
  ellipse(g, x, y, r, r, '#B0BCE2', '#724F82', Math.max(.55,r*.08));
  ellipse(g, x, y, .8*r, .82*r, '#402456');
}

function plasmaCell(g, x, y, r) {
  ellipse(g, x, y, r, r*.79, '#B4ADDD', '#955887', Math.max(.7,r*.06), -.40);
  const nx = x + r*.32, ny = y - r*.13;
  ellipse(g, nx, ny, r*.5, r*.46, '#67477D');
  ellipse(g, x - r*.34, y + r*.17, r*.26, r*.29, '#F6ECF1');
  for (let theta = 0; theta < 6.1; theta += 1.05) {
    ellipse(g, nx + r*.364*Math.cos(theta), ny + r*.34*Math.sin(theta), r*.10, r*.11, '#3F2555');
  }
}

function chronicCells(g, rand) {
  for (let i = 0; i < 104; i++) {
    const x = 22 + rand() * 527, y = 149 + rand() * 356;
    if (i % 3 === 0) plasmaCell(g, x, y, 7);
    else lymphocyte(g, x, y, 5);
  }
}

function fibrin(g, rand, x0, y0, width, height, amount, seed) {
  g.save();
  const area = new Path2D(); area.rect(x0, y0, width, height); g.clip(area);
  for (let i = 0; i < amount; i++) {
    const x = x0 + rand() * width, y = y0 + rand() * height;
    neutrophil(g, x, y, 3.8 + rand() * Math.min(9, height / 10), 3 + i % 3, i + seed, true);
  }
  for (let i = 0; i < 48; i++) {
    const x = x0 + rand() * width, y = y0 + rand() * height;
    const dx = 12 + rand() * width * .35, dy = (rand() - .5) * height;
    shape(g, `M${x - dx / 2} ${y}q${dx * .4} ${dy / 2} ${dx} ${dy}`, null,
      i % 4 ? '#E6C078B9' : '#AC7D516F', .85 + rand() * 2.2);
  }
  g.restore();
}

function drawTissue(g, mode) {
  const rand = prng(579);
  const suppurative = mode === 'phlegmon' || mode === 'gangrene';
  const chronic = mode === 'chronic';
  g.fillStyle = '#F9E7E6'; g.fillRect(0, 0, 560, 560);
  band(g, -30, 119, suppurative ? '#F1D7AD' : '#FAE9E4', 3);
  band(g, 110, 221, '#EBA8C3', 1.4);
  band(g, 209, 323, '#F5D3DE', 1.4);
  band(g, 316, 465, chronic ? '#DE9BB7' : '#E8ACBD', 2);
  band(g, 461, 508, '#D58BA4', 1);
  band(g, 505, 590, suppurative ? '#F1D2B5' : '#F1D6DF', 1);
  for (let i = 0; i < 12; i++) wash(g, i % 3 ? 'pink' : 'lilac', i % 4 * 150 - 14, Math.floor(i / 4) * 165 + 99, 260, .12);
  for (let i = 0; i < 7100; i++) {
    const x = rand() * 560, y = rand() * 560;
    const q = .7 + rand() * 1.6;
    g.fillStyle = i % 4 === 0 ? '#6A326233' : i % 3 === 0 ? '#FFF2EF66' : '#B9638837';
    g.fillRect(x, y, q * 2, q * .64);
  }
  for (let i = 0; i < 75; i++) {
    const y = 229 + rand() * 227;
    fibre(g, y, 5 + i, y < 319 ? '#FBF0EBA2' : '#FFF0F17E', y > 320 ? 1.8 + rand() * 5 : 1.25 + rand() * 2.8);
  }
  for (let i = 0; i < 95; i++) {
    fibre(g, 326 + rand() * 126, i + 78, '#9F4C7F33', 1.6 + rand() * 3.9);
    ellipse(g, rand() * 560, 324 + rand() * 137, 5 + rand() * 7, .7 + rand() * 1.25, '#83397AA1', null, 1, (rand() - .49) * .36);
  }
  crypts(g, mode);
  if (chronic) {
    for (let i = 0; i < 55; i++) {
      const x = -55 + rand() * 275, y = 137 + rand() * 319, a = 12 + rand() * 17;
      shape(g, `M${x} ${y}c45 ${-a} 78 ${a} 122 0s85 ${-a} 130 0 85 ${a} 131 0 76 ${-a} 132 0`,
        null, i % 3 ? '#E88FA891' : '#F9C2CBAE', 3.5 + rand() * 5.5);
    }
    for (let i = 0; i < 62; i++) ellipse(g, rand() * 560, 112 + rand() * 383, 6.5 + rand() * 8, 1.4, '#8C4B7DA9', null, 1, (rand() - .5) * .4);
    chronicCells(g, rand);
    vessel(g, ...chronicVessels[0], 77);
    return;
  }
  if (mode === 'normal') return;
  for (let i = 0; i < 46; i++) {
    const x = 60 + rand() * 442, y = 213 + rand() * 96;
    blob(g, x, y, 20 + rand() * 25, 4 + rand() * 7, '#FFF4C968', 120 + i);
  }
  vessel(g, ...vessels[0], 75); vessel(g, ...vessels[1], 52);
  for (let i = 0; i < (suppurative ? 380 : 116); i++) {
    const x = rand() * 560, y = 121 + rand() * (suppurative ? 197 : 172);
    neutrophil(g, x, y, 2.9 + rand() * (suppurative ? 3.1 : 2), 2 + i % 4, 40 + i);
  }
  if (mode === 'simple') {
    for (const [x, y, lobes] of SIMPLE_MUSCLE) neutrophil(g, x, y, 8.6, lobes, x);
  }
  if (suppurative) {
    for (let i = 0; i < 940; i++) {
      const x = rand() * 560, y = 320 + rand() * 162;
      neutrophil(g, x, y, 1.85 + rand() * 2.9, 2 + i % 4, 400 + i);
    }
    for (let i = 0; i < 98; i++) neutrophil(g, 30 + rand() * 509, 31 + rand() * 68, 2.9 + rand() * 3, i % 4 + 2, i + 885, true);
    fibrin(g, rand, 0, 478, 560, 100, 134, 2465);
  }
  if (mode === 'gangrene') gangrenousField(g, rand);
}

export function histologyAssets() {
  const sections = Object.fromEntries(['normal', 'simple', 'phlegmon', 'gangrene', 'chronic'].map(mode => [mode,
    layer(560, 560, g => {
      const p = new Path2D(); p.arc(280, 280, 272, 0, Math.PI * 2); g.clip(p);
      drawTissue(g, mode);
    }),
  ]));
  const mag = (mode, draw) => [mode, layer(360, 360, g => {
    g.scale(2, 2);
    const p = new Path2D(); p.arc(90, 90, 85, 0, Math.PI * 2); g.clip(p);
    ellipse(g, 90, 90, 90, 90, '#F5D6E3'); draw(g);
  })];
  return {sections, insets: Object.fromEntries([
    mag('cells', g => {
      const points = [[55,49],[100,45],[128,76],[48,90],[89,91],[67,130],[111,129]];
      points.forEach(([x, y], i) => neutrophil(g, x, y, 16, 2 + i % 4, 54 + i));
    }),
    mag('goblet', g => {
      shape(g, 'M0 116 Q78 99 180 119L180 180L0 180Z', '#D892AC');
      for (const x of [27, 49, 72, 109, 132, 153]) {
        shape(g, `M${x-10} 65Q${x-4} 58 ${x+8} 65 L${x+9} 124 Q${x} 131 ${x-9} 124Z`, '#EDACCA', '#AB658A', 1.4);
        ellipse(g, x, 109, 4, 9, '#814975', null, 1, .13);
      }
      gobletCell(g, 90, 95, 35, 65);
      line(g, [[9,130],[67,132],[103,130],[166,134]], '#A26A90', 2);
    }),
    mag('serosa', g => fibrin(g, prng(441), 2, 1, 176, 178, 46, 717)),
    mag('vessel', g => { vessel(g, 90, 72, 69, 26, 739);
      for (let i = 0; i < 6; i++) neutrophil(g, 30 + i * 25, 119 + (i % 2) * 9, 11.5, 2 + i % 4, i + 182); }),
    mag('chronic', g => {
      for (let i = 0; i < 14; i++) {
        const y = 12 + 12 * i;
        shape(g, `M-14 ${y}q35 -19 65 0t69 0 76 0`, null, i % 2 ? '#E88FA8A8' : '#F3BACD', 5);
      }
      lymphocyte(g, 50, 91, 21);
      plasmaCell(g, 121, 93, 30);
    }),
  ])};
}

export function lens(g, image, x, y, radius) {
  if (radius < 2) return;
  ellipse(g, x, y, radius, radius, '#E9D6CE', '#32292F', Math.min(4,radius*.20));
  g.drawImage(image, x - radius + 1, y - radius + 1, radius * 2 - 2, radius * 2 - 2);
  const rim = radius - Math.min(7,radius*.24);
  ellipse(g, x, y, rim, rim, null, '#4F3B4B', Math.min(2,radius*.09));
  g.save(); g.strokeStyle = '#FFFFF0AE'; g.lineWidth = Math.min(4,radius*.15); g.lineCap = 'round';
  g.beginPath(); g.arc(x, y, radius - Math.min(14,radius*.38), 3.74, 4.65); g.stroke(); g.restore();
}

export function highlight(g, x, y, radius, phase) {
  g.save(); g.lineWidth = 3; g.setLineDash([9, 7]);
  g.lineDashOffset = -phase * 16;
  g.strokeStyle = '#713350';
  g.beginPath(); g.ellipse(x, y, radius, radius * .72, 0, 0, Math.PI * 2); g.stroke();
  g.restore();
}
