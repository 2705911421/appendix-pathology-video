// Lane mech: appendix cross-section for the intraluminal-pressure beat (S13, sentence 49).
// Paper watercolour, ink outline. The lumen distends as pressure rises while the wall and its
// intramural vessels are squeezed; short radial arrows are the only pressure cue (no scale).
import { bake, get } from '../lib/wash.js';
import { rng } from '../lib/motion.js';

const TAU = Math.PI * 2;
const speck = [];

export function prepareCross() {
  speck.length = 0;
  const r = rng(55201);
  for (let i = 0; i < 90; i++) speck.push({ a: r() * TAU, d: Math.sqrt(r()), s: .5 + r() * 1.4 });
  try { bake('mech.cross', (b, P) => {
    P.fill(b, P.blob(0, 0, 300, 38, .16, 551), '#C9455A', 38, .4, [.3, .4]);
    P.fill(b, P.blob(0, 0, 210, 30, .16, 552), '#8E3A3E', 30, .4, [.3, .4]);
  }, { seed: 551, scale: 1, hd: true, soft: true, grain: .24, edge: .42, bleed: .6 }); } catch {}
}

const wob = (a, k, p) => 1 + .016 * Math.sin(a * 5 + 1.2 + p) + .009 * Math.sin(a * 9 + .4);

function ring(c, cx, cy, ro, ri, wobA, wobB, p) {
  c.beginPath();
  for (let i = 0; i <= 96; i++) {
    const a = i / 96 * TAU, r = ro * wob(a, 0, p) * wobA;
    c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  for (let i = 96; i >= 0; i--) {
    const a = i / 96 * TAU, r = ri * wob(a, 1, p) * wobB;
    c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  c.closePath();
}

export function drawCrossSection(c, { x, y, R, press = 0, alpha = 1 }) {
  if (alpha <= .01) return;
  const p = press;
  // lumen distends; the wall layers thin while the outer serosal line stays put
  const rLum = R * (.285 + .065 * p);
  const rMuc = rLum + R * (.155 - .012 * p);
  const rSub = rMuc + R * (.165 - .004 * p);
  const rMus = rSub + R * (.285 - .050 * p);
  const rSer = R * (.995 + .005 * p);

  c.save();
  c.globalAlpha *= alpha;
  c.translate(x, y);

  // soft cast shadow on paper
  const sh = c.createRadialGradient(4, 8, R * .4, 4, 8, R * 1.06);
  sh.addColorStop(0, 'rgba(90,60,66,.10)');
  sh.addColorStop(1, 'rgba(90,60,66,0)');
  c.fillStyle = sh;
  c.beginPath(); c.arc(4, 8, R * 1.06, 0, TAU); c.fill();

  // serosa / subserosa
  ring(c, 0, 0, rSer, rMus, 1, 1, p);
  c.fillStyle = '#E9CFD2'; c.fill();
  c.strokeStyle = 'rgba(150,104,116,.55)'; c.lineWidth = 2; c.stroke();

  // muscularis — congested, watercolour mottling
  ring(c, 0, 0, rMus, rSub, 1, 1, p);
  const mg = c.createRadialGradient(-R * .3, -R * .35, R * .2, 0, 0, rMus);
  mg.addColorStop(0, '#C06A66');
  mg.addColorStop(.55, '#AE4F52');
  mg.addColorStop(1, '#8E3A42');
  c.fillStyle = mg; c.fill();
  c.save(); c.clip();
  const tex = get('mech.cross');
  if (tex) { c.globalAlpha *= .42; c.drawImage(tex, -rMus, -rMus, rMus * 2, rMus * 2); }
  c.restore();
  c.strokeStyle = 'rgba(110,52,60,.55)'; c.lineWidth = 2; c.stroke();

  // submucosa
  ring(c, 0, 0, rSub, rMuc, 1, 1, p);
  c.fillStyle = '#E7D2CC'; c.fill();
  c.strokeStyle = 'rgba(150,104,116,.42)'; c.lineWidth = 1.6; c.stroke();

  // mucosa — irregular folds
  c.beginPath();
  for (let i = 0; i <= 120; i++) {
    const a = i / 120 * TAU;
    const r = rMuc * (1 + .045 * Math.sin(a * 11 + .7 + p * 2) + .02 * Math.sin(a * 19));
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  for (let i = 120; i >= 0; i--) {
    const a = i / 120 * TAU;
    const r = rLum * (1 + .035 * Math.sin(a * 9 + 1.5));
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
  c.fillStyle = '#C98390'; c.fill();
  c.strokeStyle = 'rgba(120,58,74,.45)'; c.lineWidth = 1.5; c.stroke();

  // lumen: murky residual content (yellowish, not a bright stain)
  c.beginPath();
  for (let i = 0; i <= 96; i++) {
    const a = i / 96 * TAU;
    const r = rLum * (1 + .035 * Math.sin(a * 9 + 1.5));
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
  c.fillStyle = '#D8C7A2'; c.fill();
  c.save(); c.clip();
  for (let i = 0; i < speck.length; i++) {
    const s = speck[i], a = s.a + p * .04;
    c.fillStyle = 'rgba(120,100,70,.30)';
    c.beginPath();
    c.arc(Math.cos(a) * s.d * rLum, Math.sin(a) * s.d * rLum, s.s, 0, TAU);
    c.fill();
  }
  c.restore();
  c.strokeStyle = 'rgba(130,102,66,.45)'; c.lineWidth = 1.4; c.stroke();

  // intramural vessels: five small sections in the muscularis, flattened where pressure squeezes
  const vs = [[-.55, .84, 13], [-.05, .87, 15], [.55, .8, 12], [1.55, .86, 14], [2.5, .85, 12], [3.6, .87, 13], [4.7, .86, 12]];
  vs.forEach(([a, k, rr], i) => {
    const squeeze = Math.max(0, Math.cos(a - .55)) ** 6;
    const rad = rSub + (rMus - rSub) * k;
    c.save();
    c.translate(Math.cos(a) * rad, Math.sin(a) * rad);
    c.rotate(a + Math.PI / 2);
    c.beginPath();
    c.ellipse(0, 0, rr * (1 + .25 * p), rr * (.62 - .42 * p * squeeze), 0, 0, TAU);
    c.fillStyle = `rgba(150,38,46,${.62 + .2 * p})`;
    c.fill();
    c.strokeStyle = 'rgba(92,24,34,.6)'; c.lineWidth = 1;
    c.stroke();
    c.restore();
  });

  // pressure arrows: short radial marks, no scale, only inside the lumen
  if (p > .02) {
    const N = 9;
    for (let i = 0; i < N; i++) {
      const a = -2.5 + i / (N - 1) * 4.6;
      const r0 = rLum * .18, r1 = rLum * (.62 + .2 * p), r2 = rLum * (.78 + .2 * p);
      const k = .5 + .5 * p;
      c.strokeStyle = `rgba(66,42,52,${.26 + .46 * k})`;
      c.lineWidth = 3.2;
      c.beginPath();
      c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      c.stroke();
      const hw = .15;
      c.beginPath();
      c.moveTo(Math.cos(a - hw) * r2 * .86, Math.sin(a - hw) * r2 * .86);
      c.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      c.lineTo(Math.cos(a + hw) * r2 * .86, Math.sin(a + hw) * r2 * .86);
      c.stroke();
    }
  }
  c.restore();
}
