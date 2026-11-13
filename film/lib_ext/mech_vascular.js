// Lane mech: paper-watercolour mural vessel for S13.
// Red cells follow the S06 disc being refined in v5 vascular_response.js:
// irregular rim, pale centre, darker perimarginal ring, baked grain.
// A few marginated neutrophils sit on the endothelium (unlabeled; same drawing
// convention, not a new claim). Flow is a short row of chevrons that stop at a
// waist or a clot — equally spaced, so they never pile into a letter-like mark.
// No numbers, no scale, no velocity.
import { bake, get } from '../lib/wash.js';
import { rng } from '../lib/motion.js';

const TAU = Math.PI * 2;
const cells = [];

export function prepareMechVascular() {
  cells.length = 0;
  const r = rng(91377);
  // Three loose rows. Jittered columns keep discs readable instead of a fused sausage.
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 18; col++) {
      cells.push({
        x: -320 + col * 38 + (r() - .5) * 16,
        y: (-.72 + row * .72) + (r() - .5) * .16,
        rot: (r() - .5) * .55,
        sz: .86 + r() * .28,
        view: r(),
        sat: r(),
        seed: r() * 8,
        tag: r(),
      });
    }
  }
  try { bake('mech.vascular', (b, P) => {
    P.fill(b, P.blob(0, 0, 330, 34, .18, 911), '#D98BA8', 44, .4, [.3, .4]);
    P.fill(b, P.blob(0, 0, 230, 34, .18, 912), '#C9455A', 33, .4, [.3, .4]);
  }, { seed: 911, scale: 1, hd: true, soft: true, grain: .22, edge: .4, bleed: .6 }); } catch {}
}

// One red cell. `flat` compresses the disc across the waist. Side-on cells are rods.
export function drawRBC(c, x, y, { rx = 20, rot = 0, alpha = 1, flat = 1, seed = 1, sat = .5, view = .6 } = {}) {
  const side = view < .2;
  const ry = rx * (side ? .30 : .86) * flat;
  c.save();
  c.globalAlpha *= alpha;
  c.translate(x, y);
  c.rotate(rot);
  c.beginPath();
  for (let j = 0; j <= 56; j++) {
    const th = j / 56 * TAU;
    const k = 1 + .04 * Math.sin(th * 3 + seed) + .02 * Math.cos(th * 5 + seed * 2);
    const xx = Math.cos(th) * rx * k;
    const yy = Math.sin(th) * ry * k * (side ? (1 - .35 * Math.cos(th) ** 2) : 1);
    j ? c.lineTo(xx, yy) : c.moveTo(xx, yy);
  }
  c.closePath();
  const g = c.createRadialGradient(0, 0, 1, 0, 0, rx);
  if (side) {
    g.addColorStop(0, '#CC8489');
    g.addColorStop(.55, '#C1717A');
    g.addColorStop(1, '#A64D60');
  } else {
    g.addColorStop(0, '#EDCFC9');
    g.addColorStop(.20, '#E9C5C2');
    g.addColorStop(.34, '#DFAEAF');
    g.addColorStop(.55, sat > .5 ? '#C97E88' : '#D09097');
    g.addColorStop(.78, '#C67E87');
    g.addColorStop(.92, '#CC878B');
    g.addColorStop(1, '#B15F6F');
  }
  c.fillStyle = g;
  c.fill();
  if (!side) {
    c.fillStyle = 'rgba(244,222,215,.86)';
    c.beginPath();
    c.ellipse(0, 0, rx * .42, ry * .40, 0, 0, TAU);
    c.fill();
  }
  c.strokeStyle = `rgba(131,48,68,${.28 + sat * .22})`;
  c.lineWidth = .55 + sat * .45;
  c.stroke();
  const tex = get('mech.vascular');
  if (tex) {
    c.save();
    c.clip();
    c.globalAlpha *= .22;
    c.drawImage(tex, -rx, -ry, rx * 2, ry * 2);
    c.restore();
  }
  c.restore();
}

// Marginated neutrophil: pale cytoplasm, 3–4 lobed nuclei in a cluster.
// Same construction as the S06 vessel (v5 vascular_response.js). Scaled by the caller.
export function drawNeutrophil(c, x, y, { sx = 1, sy = 1, rot = 0, alpha = 1 } = {}) {
  c.save();
  c.globalAlpha *= alpha;
  c.translate(x, y);
  c.rotate(rot);
  c.scale(sx, sy);
  c.beginPath();
  for (let j = 0; j <= 48; j++) {
    const a = j / 48 * TAU;
    const k = 1 + .05 * Math.sin(a * 5) + .028 * Math.cos(a * 3);
    const xx = Math.cos(a) * 27 * k, yy = Math.sin(a) * 24.5 * k;
    j ? c.lineTo(xx, yy) : c.moveTo(xx, yy);
  }
  c.closePath();
  const g = c.createRadialGradient(-4, -6, 3, 0, 0, 30);
  g.addColorStop(0, '#F4E7F1');
  g.addColorStop(.55, '#E3CEE5');
  g.addColorStop(.86, '#D0B7D8');
  g.addColorStop(1, '#B99FC8');
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = 'rgba(126,92,148,.60)';
  c.lineWidth = 1.05;
  c.stroke();
  c.fillStyle = 'rgba(150,110,164,.30)';
  for (let i = 0; i < 16; i++) {
    c.beginPath();
    c.arc(Math.sin(i * 4.7) * 16, Math.cos(i * 2.3) * 15, .9, 0, TAU);
    c.fill();
  }
  const lobes = [[-8, -7], [7, -6.5], [7.5, 6.5], [-6.5, 7]];
  const lr = 6.5;
  c.strokeStyle = '#6B4A85';
  c.lineWidth = 1.8;
  c.lineCap = 'round';
  for (const [px, py] of lobes) {
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(px * .62, py * .62);
    c.stroke();
  }
  for (let i = 0; i < lobes.length; i++) {
    const [px, py] = lobes[i];
    c.fillStyle = '#6B4A85';
    c.beginPath();
    for (let k = 0; k <= 28; k++) {
      const a = k / 28 * TAU;
      const rr = lr * (1 + .07 * Math.sin(a * 3 + i));
      const xx = px + Math.cos(a) * rr, yy = py + Math.sin(a) * rr;
      k ? c.lineTo(xx, yy) : c.moveTo(xx, yy);
    }
    c.closePath();
    c.fill();
  }
  c.restore();
}

function bump(x, cx, w) { const u = (x - cx) / w; return Math.exp(-u * u); }

function chevron(c, x, y, s, alpha) {
  c.save();
  c.globalAlpha *= alpha;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = 'rgba(244,239,230,.9)';
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(x - 12 * s, y - 8 * s);
  c.lineTo(x, y);
  c.lineTo(x - 12 * s, y + 8 * s);
  c.stroke();
  c.strokeStyle = '#5C2E3C';
  c.lineWidth = 3.1;
  c.stroke();
  c.restore();
}

// Section of a wall vessel, x = -L..L, lumen centred on y = 0.
// squeeze: waist at squeezeX. thrombus: occlusive clot from clotX toward +x.
export function drawVessel(c, {
  L = 330, h = 84, wall = 15, squeeze = 0, squeezeX = -40, squeezeW = 70,
  thrombus = 0, clotX = 40, alpha = 1, flow = 0, flowAlpha = 0,
  showWallNuclei = true, showNeutrophils = true, density = 1, cellSize = 1,
} = {}) {
  if (alpha <= .01) return;
  const outer = x => h + wall - (h * .50) * squeeze * bump(x, squeezeX, squeezeW);
  const inner = x => Math.max(8, h - (h * .86) * squeeze * bump(x, squeezeX, squeezeW));
  const ys = x => 4 * Math.sin(x / 150);

  function band(extra) {
    c.beginPath();
    for (let x = -L; x <= L; x += 8) c.lineTo(x, ys(x) - outer(x) - extra);
    for (let x = L; x >= -L; x -= 8) c.lineTo(x, ys(x) + outer(x) + extra);
    c.closePath();
  }
  function lumen() {
    c.beginPath();
    for (let x = -L; x <= L; x += 8) c.lineTo(x, ys(x) - inner(x));
    for (let x = L; x >= -L; x -= 8) c.lineTo(x, ys(x) + inner(x));
    c.closePath();
  }

  c.save();
  c.globalAlpha *= alpha;
  const ga = c.globalAlpha;

  // short collagen strokes in the wall, not full-width rules
  c.strokeStyle = 'rgba(190,140,158,.28)';
  c.lineWidth = 1.3;
  for (let i = 0; i < 10; i++) {
    const x0 = -L + (i * 67) % (L * 2);
    const yy = ys(0) + ((i % 5) - 2) * (h * .55);
    c.beginPath();
    c.moveTo(x0, yy);
    c.bezierCurveTo(x0 + 18, yy - 7, x0 + 40, yy + 6, x0 + 62, yy - 2);
    c.stroke();
  }

  band(5);
  c.fillStyle = 'rgba(229,206,217,.9)';
  c.fill();
  c.strokeStyle = 'rgba(171,134,161,.45)';
  c.lineWidth = 1.7;
  c.stroke();
  band(0);
  c.fillStyle = '#DDB8CA';
  c.fill();

  lumen();
  c.fillStyle = '#F7E4E0';
  c.fill();
  c.save();
  c.clip();
  const tex = get('mech.vascular');
  if (tex) { c.globalAlpha *= .16; c.drawImage(tex, -L, -h - 20, L * 2, (h + 20) * 2); }
  c.globalAlpha = ga;

  for (let i = 0; i < cells.length; i++) {
    const d = cells[i];
    if (d.tag > density) continue;
    const x = d.x;
    if (x < -L + 16 || x > L - 16) continue;
    const narrow = inner(x) / h;
    const y = ys(x) + d.y * (inner(x) - 12);
    let a = 1;
    if (squeeze > 0) {
      a *= .45 + .55 * narrow;
      // distal to a waist the stream thins: the wall beyond the pinch is ischemic
      if (x > squeezeX + 36) a *= 1 - squeeze * .82;
    }
    if (thrombus > 0 && x > clotX - 6) a *= Math.max(0, 1 - thrombus * 1.35);
    if (a <= .04) continue;
    drawRBC(c, x, y, {
      rx: 17 * d.sz * cellSize,
      rot: d.rot,
      alpha: a,
      flat: .42 + .58 * narrow,
      seed: d.seed,
      sat: d.sat,
      view: d.view,
    });
  }

  if (thrombus > .01) {
    const x0 = clotX, x1 = L - 18;
    const rr = rng(4711);
    const top = x => ys(x) - inner(x) * thrombus * (.82 + .1 * Math.sin(x / 23 + .4));
    const bot = x => ys(x) + inner(x) * thrombus * (.84 + .08 * Math.sin(x / 19 + 2.1));
    c.save();
    c.beginPath();
    c.moveTo(x0, ys(x0) - inner(x0) * .92);
    c.quadraticCurveTo(x0 - 16, ys(x0) - inner(x0) * .2, x0 + 8, ys(x0));
    c.quadraticCurveTo(x0 - 10, ys(x0) + inner(x0) * .35, x0, ys(x0) + inner(x0) * .92);
    for (let x = x0; x <= x1; x += 10) c.lineTo(x, bot(x));
    c.quadraticCurveTo(x1 + 16, ys(x1), x1 - 4, top(x1));
    for (let x = x1; x >= x0; x -= 10) c.lineTo(x, top(x));
    c.closePath();
    c.fillStyle = 'rgba(122,62,78,.94)';
    c.fill();
    c.strokeStyle = 'rgba(92,48,64,.6)';
    c.lineWidth = 1.6;
    c.stroke();
    c.clip();
    c.globalAlpha = ga;
    // Irregular pale fibrin/platelet laminae alternating with the red-cell-rich base.
    // Clipped to the attached clot: no free-floating plug or geometric concentric target.
    for(let j=0;j<4;j++) {
      c.strokeStyle=j%2?'rgba(240,212,220,.78)':'rgba(243,213,222,.65)';
      c.lineWidth=3.2; c.beginPath();
      for(let x=x0-8;x<=x1+12;x+=7){
        const yy=ys(x)+inner(x)*(-.65+j*.42)+2.4*Math.sin(x/31+j*1.6);
        x===x0-8?c.moveTo(x,yy):c.lineTo(x,yy);
      }
      c.stroke();
    }
    for (let i = 0; i < 18; i++) {
      const x = x0 + rr() * (x1 - x0), y = (rr() * 2 - 1) * inner(x) * .75;
      c.strokeStyle = i % 3 ? 'rgba(214,178,182,.75)' : 'rgba(96,52,76,.55)';
      c.lineWidth = .8 + rr();
      c.beginPath();
      c.moveTo(x - 16, y);
      c.bezierCurveTo(x - 4, y - 10, x + 8, y + 9, x + 18, y - 1);
      c.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const x = x0 + 12 + rr() * Math.max(20, x1 - x0 - 24);
      drawRBC(c, x, ys(x) + (rr() * 2 - 1) * inner(x) * .55, {
        rx: 11 + rr() * 4, rot: rr() * 3, alpha: .7, seed: rr() * 6, sat: .8, view: .7,
      });
    }
    c.restore();
  }
  c.restore();

  // Equally spaced chevrons. They march, but the gap never collapses into a pile.
  if (flowAlpha > .01) {
    const end = thrombus > .05 ? clotX - 28 : (squeeze > .45 ? squeezeX - 16 : L - 24);
    const start = -L + 28;
    const span = end - start;
    const n = 4;
    if (span > 90) {
      for (let k = 0; k < n; k++) {
        const u = ((k + flow) % n) / n;
        const x = start + u * span;
        chevron(c, x, ys(x), 1, ga * flowAlpha * .9);
      }
    }
    if (squeeze > .35 && squeeze < .9) {
      chevron(c, squeezeX + 8, ys(squeezeX), .65, ga * flowAlpha * .45 * (1 - squeeze));
    }
  }

  if (showWallNuclei) {
    for (const s of [-1, 1]) {
      for (let i = 0; i < 8; i++) {
        const x = -L + 36 + i * ((L * 2 - 72) / 7);
        const r = bump(x, squeezeX, squeezeW);
        c.fillStyle = 'rgba(146,114,153,.62)';
        c.beginPath();
        c.ellipse(x, ys(x) + s * (inner(x) + wall * .45), 10 - 2 * squeeze * r, 2.8, .04 * Math.sin(i), 0, TAU);
        c.fill();
      }
    }
  }

  if (showNeutrophils) {
    const spots = [[-220, 1], [-60, -1], [90, 1]];
    for (const [x, s] of spots) {
      if (x < -L + 24 || x > L - 24) continue;
      if (thrombus > .25 && x > clotX - 24) continue;
      if (squeeze > .5 && Math.abs(x - squeezeX) < 46) continue;
      const yy = ys(x) + s * (inner(x) - 1);
      drawNeutrophil(c, x, yy, { sx: .74, sy: .74, rot: s * .35 + x * .002, alpha: ga });
    }
  }
  c.restore();
}
