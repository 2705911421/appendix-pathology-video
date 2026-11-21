import {INK, blob, clamp, ellipse, layer, line, mix, polygon, prng, shape, wash} from './art.js';

const stagePalette = [
  ['#FFE8E1', '#F6D4CE', '#B97376'], ['#EC8E81', '#C83737', '#7F2329'],
  ['#D98A74', '#A73D3F', '#64272F'], ['#986066', '#592F44', '#44283A'],
  ['#FAE3D5', '#DDB9AB', '#986E69'],
];
const diameters = [46, 68, 98, 75, 93];
export const perforation = [639, 198];
export const mesentericVein = [432, 279];

function centre(t) { return [100 + 620 * t, 240 - 46 * Math.sin(t * 2.4) - 39 * t + 6 * Math.sin(t * 7)]; }

function tube(g, d) {
  const q = d / 2;
  return `M100 ${240 - q} C260 ${194 - q} 457 ${178 - q} 588 ${175 - q}
    C640 ${173 - q} 684 ${181 - q} 720 ${171 - q} C${750 + q * .18} ${157 - q} ${752 + q * .35} ${169 + q} 720 ${171 + q}
    C665 ${185 + q} 642 ${176 + q} 588 ${175 + q} C446 ${181 + q} 264 ${197 + q} 100 ${240 + q}
    Q${82 - q * .16} 245 100 ${240 - q} Z`;
}

function vessels(g, state, seed) {
  const rand = prng(seed);
  for (let i = 0; i < 23; i++) {
    const t = (i + rand()) / 24;
    const [x, y] = centre(t);
    const span = 8 + rand() * 27;
    const direction = rand() > .45 ? 1 : -1;
    const color = state === 0 ? '#D98888' : state === 3 ? '#793B41' : '#8F1D1D';
    shape(g, `M${x} ${y} q${span * .45} ${direction * 3} ${span} ${direction * 23}
      m${-span * .43} ${-direction * 12} q${span * .5} ${direction * 3} ${span * .65} ${direction * 5}`,
    null, color, state === 0 ? .8 : 1.8 + rand());
  }
}

function feather(g, x, y, rx, ry, color, seed, opacity = 1) {
  g.save(); g.translate(x, y); g.scale(1, ry / rx); g.globalAlpha *= opacity;
  const gradient = g.createRadialGradient(-rx * .12, -rx * .08, rx * .13, 0, 0, rx);
  gradient.addColorStop(0, color);
  gradient.addColorStop(.67, `${color.slice(0,7)}A2`);
  gradient.addColorStop(1, `${color.slice(0,7)}00`);
  blob(g, 0, 0, rx * 1.13, rx * 1.10, gradient, seed);
  g.restore();
}

function membrane(g, rand, state) {
  const meso = 'M106 235 C242 188 427 165 667 175 Q638 204 629 219 C603 262 558 252 513 281 Q461 315 411 310 C358 318 331 344 293 335 Q255 329 234 332 C193 329 173 301 151 299 Q123 281 106 235Z';
  g.save();
  g.globalAlpha = .55;
  const tint = g.createLinearGradient(0, 200, 0, 344);
  tint.addColorStop(0, '#FFF7D9'); tint.addColorStop(.53, '#F1DBA6'); tint.addColorStop(1, '#E5CB9B24');
  g.clip(shape(g, meso, tint, '#C1A27988', 1.3));
  wash(g, 'mesentery', 377, 257, 690, .72);
  for (let i = 0; i < 78; i++) {
    const x = 111 + rand() * 560, y = 184 + rand() * 154;
    feather(g, x, y, 12 + rand() * 24, 4 + rand() * 16,
      i % 4 ? '#FFF1CF' : '#BD986A', 333 + i, .24 + rand() * .18);
  }
  g.restore();
  g.save(); g.clip(new Path2D(meso));
  const venous = 'M139 286 C223 312 300 291 354 291 Q394 284 432 279 C493 271 547 257 600 207';
  const arterial = 'M134 279 C225 298 303 277 378 265 C476 249 565 237 609 197';
  shape(g, venous, null, state === 3 ? '#60516BDE' : '#675C87BF', 3.0);
  shape(g, arterial, null, '#AD6265C2', 2.4);
  const branches = [[192,293,198,279],[236,298,263,268],[285,294,313,255],[354,291,380,240],
    [393,285,421,234],[432,279,458,226],[482,271,513,226],[532,257,553,212],[579,228,590,195]];
  for (const [i, [a,b,c,d]] of branches.entries()) {
    shape(g, `M${a} ${b} Q${a+19} ${b-10} ${c} ${d} T${c+12} ${d-21}
      m-11 21 q15 -8 22 -6`, null, '#6A658F9A', 1.45 + (i % 3) * .25);
    shape(g, `M${a-4} ${b-9} Q${a+8} ${b-19} ${c-5} ${d-5}
      m-8 12 q9 -11 1 -23`, null, '#AF68678F', 1.25);
  }
  g.restore();
}

function drawGross(g, state, opened, ruptured = false) {
  const rand = prng(334 + state);
  const [light, medium, dark] = stagePalette[state];
  const diameter = diameters[state];
  membrane(g, rand, state);
  const outline = tube(g, diameter);
  const grad = g.createLinearGradient(0, 125, 0, 295);
  grad.addColorStop(0, light); grad.addColorStop(.5, medium); grad.addColorStop(1, dark);
  shape(g, outline, grad);
  g.save(); g.clip(new Path2D(outline));
  wash(g, ['pink', 'red', 'red', 'black', 'pink'][state], 410, 210, 730, .58);
  for (let i = 0; i < 1650; i++) {
    const x = 96 + rand() * 667, y = 112 + rand() * 183;
    g.fillStyle = i % 3 ? `${light}2C` : `${dark}37`;
    g.fillRect(x, y, 1 + rand() * 3, .8 + rand() * 1.3);
  }
  shape(g, 'M124 220 C232 190 309 185 397 173 M439 170 Q591 156 690 158', null, `${light}86`, state === 0 ? 2.8 : 1.8);
  vessels(g, state, state + 110);
  if (state === 2 || state === 3) {
    const film = [[173,221,62,21],[215,237,48,14],[267,212,107,23],[338,190,65,22],
      [408,205,58,28],[484,177,76,20],[553,166,91,31],[593,186,68,18],[665,168,56,16]];
    for (const [i,[x,y,rx,ry]] of film.entries()) {
      feather(g,x,y,rx,ry,'#C6B68E',175+i,.68);
      feather(g,x-11,y+8,rx*.74,ry*.68,'#E2D0A5',73+i,.37);
      g.save(); g.translate(x,y); g.scale(1,ry/rx);
      wash(g,'fibrin',0,0,rx*2.7,.36);
      g.restore();
      for (let j=0;j<9;j++) {
        const px=x+(rand()-.5)*rx*1.22, py=y+(rand()-.5)*ry*1.18;
        const endX=12+rand()*17, endY=8*(rand()-.5);
        shape(g,`M${px} ${py}q${endX*.5} ${endY-4} ${endX} ${endY} m${-endX*.6} ${-endY*.4}q4 7 ${endX*.47} 6`,
          null,'#EFE0B78C',.68+rand()*.55);
      }
    }
  }
  if (state === 3) {
    const scabs = [[171,240,61,37],[307,183,77,35],[489,191,93,41],[601,170,104,53],[699,184,53,35]];
    scabs.forEach(([x,y,rx,ry], i) => {
      feather(g, x, y, rx, ry, i % 2 ? '#382336' : '#2C2434', i + 300, .98);
      feather(g, x+18, y-11, rx*.6, ry*.52, '#653645', i+380, .68);
    });
    wash(g, 'black', 575, 189, 420, .43);
  }
  if (opened) {
    const slit = 'M109 244 C226 197 504 157 711 171 C663 201 359 256 109 244Z';
    const fluid = g.createLinearGradient(0,153,0,246);
    fluid.addColorStop(0, '#CA8B5A'); fluid.addColorStop(.55, '#D5AD70'); fluid.addColorStop(1, '#8E503F');
    shape(g, slit, fluid, '#6B3233', 3.5);
    g.save(); g.clip(new Path2D(slit));
    for (let i = 0; i < 75; i++) feather(g, 116 + rand() * 586, 167 + rand() * 86,
      13 + rand() * 24, 2 + rand() * 6, i % 2 ? '#ECD4A0' : '#9F5E45', i + 61, .37);
    g.restore();
    ellipse(g, 142, 233, 23, 13, '#64432F', '#402A25', 2, -.22);
    ellipse(g, 136, 229, 9, 3, '#CB9C6F', null, 1, -.22);
  }
  g.restore();
  shape(g, outline, null, '#59383DC7', 1.65);
  if (ruptured) {
    const [x,y] = perforation;
    feather(g, x, y, 41, 22, '#4E2636', 27);
    feather(g, x+5, y+1, 30, 15, '#874951', 119, .65);
    shape(g, 'M615 202 Q615 195 625 193 Q628 190 630 185 C636 188 642 186 646 183 Q650 191 662 189 C672 189 672 197 665 201 Q655 205 653 213 Q643 207 637 215 Q634 209 626 207 Q619 205 615 202Z',
      '#2B1C28', '#A95E626E', 1.55);
    feather(g, x+3, y+7, 16, 5, '#C4A876', 38, .76);
  }
}

export function grossAssets() {
  const gross = Array.from({length: 5}, (_, i) => layer(820, 402, g => drawGross(g, i, false)));
  return {gross, open: layer(820, 402, g => drawGross(g, 2, true)), rupture: layer(820, 402, g => drawGross(g, 3, false, true))};
}

export function cross(g, x, y, radius, phase) {
  const [light, medium, dark] = stagePalette[phase];
  g.save(); g.translate(x, y);
  const r = radius;
  blob(g, 0, 0, r, r * .94, light, 45, '#5D3B40');
  blob(g, 0, 0, r * .87, r * .82, medium, 82, dark);
  blob(g, 0, 0, r * .57, r * .56, phase === 3 ? '#775556' : '#F1AEAE', 36);
  const vertices = Array.from({length: 12}, (_, i) => {
    const theta = Math.PI * i / 6;
    const rr = r * (i % 2 ? .25 : .46);
    return [rr * Math.cos(theta), rr * Math.sin(theta)];
  });
  polygon(g, vertices, phase === 0 ? '#FFF1E7' : phase === 1 ? '#EDCFBC' : '#D8A449', dark, 2);
  if (phase >= 2 && phase <= 3) {
    const rand = prng(59);
    for (let i = 0; i < 30; i++) {
      const a = rand() * Math.PI * 2, d = rand() * r * .23;
      ellipse(g, Math.cos(a) * d, Math.sin(a) * d, r * .021, r * .017, '#906344');
    }
  }
  if (phase === 3) polygon(g, [[r * .38,0],[r * .59,-r*.1],[r*.75,r*.01],[r*.96,-r*.11],[r*.96,r*.26],
    [r*.66,r*.19],[r*.59,r*.11]], '#F4EFE6', '#4A2226', 2);
  g.restore();
}

export function leaks(g, x, y, elapsed, scale) {
  for (let i = 0; i < 12; i++) {
    const q = (elapsed * .24 + i / 12) % 1;
    const size = mix(4, 21, q) * scale;
    const xx = x + (16 + Math.sin(i * 3.8) * 43) * scale * q;
    const yy = y + (38 + i * 2.7) * scale * q;
    feather(g, xx, yy, size, size * .57, '#BC9B65', i + 37, Math.sin(Math.PI * q) * .43 * clamp(elapsed * 1.8));
  }
}

export function thrombosis(g, x, y, scale = 1) {
  g.save(); g.translate(x, y); g.scale(scale, scale);
  shape(g, 'M0 4 C31 -11 67 -10 115 3 L115 53 C67 68 30 65 0 53Z', '#D9869A', '#763F55', 2.7);
  shape(g, 'M0 14 C29 3 65 4 115 12 L115 43 C74 53 27 53 0 43Z', '#F2C1CC', '#893E55', 1.5);
  blob(g, 70, 28, 26, 21, '#662E4C', 53, '#431D3A');
  const rand = prng(15);
  for (let i = 0; i < 22; i++) ellipse(g, 56 + rand() * 30, 17 + rand() * 22, 2.7, 1.7, '#A15263');
  line(g, [[13, 28], [40, 28]], INK, 2, [4, 6]);
  g.restore();
}

