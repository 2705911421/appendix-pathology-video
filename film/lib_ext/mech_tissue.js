// Lane mech: appendiceal-wall field for ischemia → necrosis with hemorrhage (S13, 51–52).
// Not an H&E plate and not a sheet of epithelial polygons. Smooth-muscle ribbons lose
// their spindle nuclei next to an occluded mural vessel; red cells leak between the
// ghost fibers; brown-black mottles are haemoglobin breakdown, with no concentration
// and no clock. Anchors are local offsets from the field centre for the labels.
import { rng } from '../lib/motion.js';
import { bake, get } from '../lib/wash.js';
import { drawRBC, drawVessel } from './mech_vascular.js';

const TAU = Math.PI * 2;
const bands = [];
const bleeds = [];
const pigments = [];

export const tissueAnchors = { necro: [80, 70], bleed: [150, 130], pigment: [36, -10] };

export function prepareTissue() {
  bands.length = bleeds.length = pigments.length = 0;
  const R = rng(77021);
  try { bake('mech.tissue', (b, P) => {
    P.fill(b, P.blob(0, 0, 280, 48, .18, 771), '#E7C4CE', 36, .45, [.3, .4]);
    P.fill(b, P.blob(40, 30, 180, 36, .2, 772), '#C9A0A4', 28, .4, [.3, .4]);
    P.fill(b, P.blob(-80, 80, 140, 30, .2, 773), '#8E3A3E', 22, .35, [.3, .4]);
  }, { seed: 771, scale: 1, hd: true, soft: true, grain: .2, edge: .35, bleed: .55 }); } catch {}

  for (let i = 0; i < 8; i++) {
    const nuclei = [];
    for (let k = 0; k < 7; k++) {
      nuclei.push({
        x: -300 + k * 96 + (R() - .5) * 22,
        dy: (R() - .5) * 8,
        len: 16 + R() * 8,
        rot: (R() - .5) * .5,
      });
    }
    bands.push({
      y: -270 + i * 74 + (R() - .5) * 10,
      phase: R() * 6,
      amp: 7 + R() * 8,
      half: 15 + R() * 5,
      nuclei,
    });
  }

  // haemorrhage: confluent beside the occluded vessel, sparse farther into the wall
  for (let i = 0; i < 16; i++) {
    const near = i < 9;
    const x = near ? -70 + R() * 200 : 40 + R() * 240;
    const y = near ? -40 + R() * 250 : -180 + R() * 400;
    if (Math.hypot(x, y) > 300) continue;
    const n = 4 + Math.floor(R() * 4), list = [];
    for (let k = 0; k < n; k++) list.push({
      dx: (R() - .5) * 54,
      dy: (R() - .5) * 40,
      rx: 11 + R() * 5,
      rot: (R() - .5) * 1.4,
      seed: R() * 7,
      sat: .5 + R() * .45,
      view: R(),
    });
    bleeds.push({ x, y, list });
  }
  tissueAnchors.bleed[0] = bleeds[2] ? bleeds[2].x + 10 : 140;
  tissueAnchors.bleed[1] = bleeds[2] ? bleeds[2].y + 8 : 120;
  tissueAnchors.necro[0] = 96;
  tissueAnchors.necro[1] = 36;

  for (let i = 0; i < 9; i++) {
    const b = bleeds[i % Math.max(1, bleeds.length)] || { x: 40, y: 20 };
    pigments.push({
      x: b.x + (R() - .5) * 48,
      y: b.y + (R() - .5) * 36,
      r: 22 + R() * 20,
      seed: R() * 8,
      a: .7 + R() * .3,
    });
  }
  // A few mottles sit in the open muscle, not under the vessel, so the label has a target.
  pigments.push({ x: 78, y: -36, r: 38, seed: 3.1, a: .95 });
  pigments.push({ x: 150, y: 46, r: 34, seed: 4.2, a: .9 });
  pigments.push({ x: 28, y: 128, r: 30, seed: 5.4, a: .85 });
  tissueAnchors.pigment[0] = 78;
  tissueAnchors.pigment[1] = -36;
  tissueAnchors.necro[0] = 36;
  tissueAnchors.necro[1] = 78;
}

function bandY(f, x) {
  return f.y + Math.sin(x / 88 + f.phase) * f.amp + Math.sin(x / 34 + f.phase * 1.7) * 3;
}

// n necrosis, b haemorrhage, g pigment. All 0..1, driven by sentence progress.
export function drawTissueField(c, { x, y, r = 350, n = 0, b = 0, g = 0, alpha = 1 }) {
  if (alpha <= .01) return;
  c.save();
  c.globalAlpha *= alpha;
  c.translate(x, y);
  c.beginPath();
  c.arc(0, 0, r, 0, TAU);
  c.clip();

  c.fillStyle = '#F6EEEA';
  c.fillRect(-r, -r, r * 2, r * 2);
  const tex = get('mech.tissue');
  if (tex) {
    c.save();
    c.globalAlpha *= .34;
    c.drawImage(tex, -r, -r, r * 2, r * 2);
    c.restore();
  }

  // smooth-muscle ribbons. Nuclei drop out beside the blocked vessel first.
  for (const f of bands) {
    c.beginPath();
    const top = [], bot = [];
    for (let i = 0; i <= 26; i++) {
      const px = -340 + i * (680 / 26);
      const py = bandY(f, px);
      top.push([px, py - f.half]);
      bot.push([px, py + f.half]);
    }
    c.moveTo(top[0][0], top[0][1]);
    for (const p of top) c.lineTo(p[0], p[1]);
    for (let i = bot.length - 1; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]);
    c.closePath();
    // a ribbon is a mix: the left (near the vessel) dies, the right may still have nuclei
    const ribbon = c.createLinearGradient(-40, 0, 220, 0);
    const dead = Math.min(1, n * 1.2);
    ribbon.addColorStop(0, `rgba(${(210 + (142 - 210) * dead) | 0},${(176 + (132 - 176) * dead) | 0},${(182 + (134 - 182) * dead) | 0},${.55})`);
    ribbon.addColorStop(.45, `rgba(${(220 + (168 - 220) * dead) | 0},${(188 + (156 - 188) * dead) | 0},${(196 + (158 - 196) * dead) | 0},${.46})`);
    ribbon.addColorStop(1, 'rgba(228,198,206,.42)');
    c.fillStyle = ribbon;
    c.fill();

    for (const q of f.nuclei) {
      const py = bandY(f, q.x) + q.dy;
      // 1 beside the occluded vessel, 0 toward the far wall. Steep so the near zone is anuclear by mid-sentence.
      const local = Math.max(0, Math.min(1, 1 - (q.x + 40) / 240));
      const w = Math.min(1, n * 1.85 * (0.15 + 0.85 * local));
      if (w < .62) {
        c.save();
        c.translate(q.x, py);
        c.rotate(q.rot);
        c.fillStyle = `rgba(214, 176, 190, ${(1 - w) * .45})`;
        c.beginPath();
        c.ellipse(0, 0, q.len, 5.2, 0, 0, TAU);
        c.fill();
        c.fillStyle = `rgba(107, 74, 140, ${.78 * (1 - w / .62)})`;
        c.beginPath();
        c.ellipse(0, 0, q.len * .62, 2.5, 0, 0, TAU);
        c.fill();
        c.restore();
      } else {
        c.fillStyle = `rgba(90, 64, 96, ${.28 * w})`;
        for (let k = 0; k < 5; k++) {
          c.beginPath();
          c.arc(q.x + Math.sin(q.len + k * 1.7) * 8, py + Math.cos(k * 2.1) * 4, 1.15, 0, TAU);
          c.fill();
        }
      }
    }
  }

  if (n > .02) {
    const gr = c.createRadialGradient(10, 30, 12, 20, 40, 300);
    gr.addColorStop(0, `rgba(132, 118, 122, ${.5 * n})`);
    gr.addColorStop(.5, `rgba(158, 142, 144, ${.22 * n})`);
    gr.addColorStop(1, 'rgba(168, 150, 152, 0)');
    c.fillStyle = gr;
    c.beginPath();
    c.arc(0, 0, r, 0, TAU);
    c.fill();
    // ghost outline of the ribbons once nuclei are gone, so the field is not a blank wash
    c.strokeStyle = `rgba(120, 96, 104, ${.28 * n})`;
    c.lineWidth = 1.15;
    for (const f of bands) {
      c.beginPath();
      for (let i = 0; i <= 16; i++) {
        const px = -300 + i * (220 / 16);
        const py = bandY(f, px);
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke();
    }
  }

  // occluded mural vessel running through the field. No flow glyphs here:
  // the backed-up discs and the plug are the block. Chevrons belong to sentence 50.
  c.save();
  c.translate(-150, 10);
  c.rotate(Math.PI / 2);
  drawVessel(c, {
    L: 330, h: 54, wall: 12, squeeze: 0, thrombus: 1, clotX: 70,
    flowAlpha: 0, showWallNuclei: true, showNeutrophils: true,
    density: .85, cellSize: .92,
  });
  c.restore();

  if (b > .01) {
    for (const s of bleeds) {
      const gr = c.createRadialGradient(s.x, s.y, 2, s.x, s.y, 46);
      gr.addColorStop(0, `rgba(150, 42, 52, ${.14 * b})`);
      gr.addColorStop(1, 'rgba(150, 42, 52, 0)');
      c.fillStyle = gr;
      c.beginPath();
      c.arc(s.x, s.y, 46, 0, TAU);
      c.fill();
    }
    for (const s of bleeds) {
      for (const q of s.list) {
        drawRBC(c, s.x + q.dx, s.y + q.dy, {
          rx: q.rx, rot: q.rot, alpha: Math.min(1, b * 1.25) * .95,
          flat: .95, seed: q.seed, sat: q.sat, view: q.view,
        });
      }
    }
  }

  // Pigment sits on top of the leaked red cells so the mottles stay readable.
  if (g > .01) {
    for (const p of pigments) {
      const rr = p.r * (.4 + .6 * g);
      const gr = c.createRadialGradient(p.x, p.y, 2, p.x, p.y, rr);
      const dark = Math.round(62 - 28 * g);
      gr.addColorStop(0, `rgba(${dark},${Math.round(dark * .38)},${Math.round(dark * .34)},${.92 * p.a * Math.min(1, g * 1.2)})`);
      gr.addColorStop(.42, `rgba(96, 40, 38, ${.55 * p.a * g})`);
      gr.addColorStop(1, 'rgba(120, 48, 44, 0)');
      c.fillStyle = gr;
      c.beginPath();
      c.arc(p.x, p.y, rr, 0, TAU);
      c.fill();
      c.fillStyle = `rgba(42, 22, 24, ${.5 * g * p.a})`;
      for (let k = 0; k < 5; k++) {
        c.beginPath();
        c.arc(
          p.x + Math.sin(p.seed + k * 2.2) * rr * .35,
          p.y + Math.cos(p.seed * 1.4 + k) * rr * .3,
          1.3 + (k % 2), 0, TAU,
        );
        c.fill();
      }
    }
  }

  c.restore();
}
