// Lane mech: appendiceal-wall field for ischemia → necrosis with hemorrhage (S13, 51–52).
// H&E teaching field with a viable-to-necrotic muscle transition. Smooth-muscle ribbons lose
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
const musclePlates = [];

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
    if (Math.hypot(x, y) > 300 || y < -100) continue;
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
  tissueAnchors.necro[0] = 50;
  tissueAnchors.necro[1] = -210;
  musclePlates.length = 0;
  for (const n of [0,1]) {
    const plate=document.createElement('canvas');plate.width=plate.height=2048;
    const ctx=plate.getContext('2d');ctx.translate(1024,1024);ctx.scale(2048/700,2048/700);
    paintMuscle(ctx,n);
    if(n===1) {
      const softened=document.createElement('canvas');softened.width=softened.height=2048;
      const sc=softened.getContext('2d');sc.filter='blur(4px)';sc.drawImage(plate,0,0);
      ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.beginPath();ctx.rect(0,0,1450,2048);ctx.clip();ctx.clearRect(0,0,2048,2048);ctx.drawImage(softened,0,0);ctx.restore();
    }
    musclePlates.push(plate);
  }

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

  // Two prepared tissue plates: stable HE texture, sentence-driven nuclear fading.
  const death = Math.min(1, n * 4);
  c.save();
  c.globalAlpha *= 1-death;
  c.drawImage(musclePlates[0], -350, -350, 700, 700);
  c.restore();
  c.save();c.globalAlpha *= death;
  c.drawImage(musclePlates[1], -350, -350, 700, 700);
  c.restore();

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

function paintMuscle(c,n) {
  // H&E smooth muscle: fine overlapping eosinophilic fibers, stable pigment grain.
  // Left vessel-adjacent territory loses nuclei; the right edge stays viable.
  const rand = rng(77099);
  for (let i=0;i<280;i++) {
    const yy=-360+rand()*720, xx=-360+rand()*720;
    const len=35+rand()*110, half=2+rand()*5, phase=rand()*6;
    const local=Math.max(0,Math.min(1,(210-xx)/170));
    const dead=Math.min(1,n*2.8*local);
    c.save();
    c.translate(xx,yy); c.rotate(.08+Math.sin(yy/130)*.12);
    // Pale overlapping pigment strokes soften the dead fibers without per-cell filters.
    for(let layer=0;layer<3;layer++) {
      c.fillStyle=dead>.45 ? `rgba(227,169,184,${.07+layer*.018})` : `rgba(217,139,168,${.10+layer*.025})`;
      c.beginPath();c.moveTo(-len,0);
      c.bezierCurveTo(-len*.4,-half*2, len*.5,-half, len,Math.sin(phase)*3);
      c.bezierCurveTo(len*.5,half, -len*.5,half*2,-len,0);c.fill();
    }
    c.filter='none';
    if(dead<.98) {
      c.fillStyle=`rgba(107,76,154,${.8*(1-dead)**2})`;
      c.beginPath();c.ellipse(0,0,5+rand()*4,1.6+rand()*.8,.04,0,TAU);c.fill();
      c.fillStyle=`rgba(63,42,102,${.65*(1-dead)**2})`;
      for(let j=0;j<3;j++){c.beginPath();c.ellipse(-3+j*3,0,.8,.65,0,0,TAU);c.fill();}
    }
    c.restore();
  }
  // Sparse karyorrhectic clusters at the viable/dead interface, baked and stationary.
  // Leave the anuclear core and its annotation target clear.
  if(n>0) {
    const debris=rng(77131);
    for(let i=0;i<48;i++) {
      const xx=-50+debris()*220, yy=-170+debris()*440;
      for(let k=0;k<3+Math.floor(debris()*4);k++) {
        const dx=(debris()-.5)*12,dy=(debris()-.5)*8,sz=.7+debris()*1.4;
        c.fillStyle='rgba(63,42,102,.58)';c.beginPath();
        c.moveTo(xx+dx-sz,yy+dy);c.lineTo(xx+dx,yy+dy-sz*.8);
        c.lineTo(xx+dx+sz*.8,yy+dy+sz*.6);c.closePath();c.fill();
      }
    }
  }
  // Watercolour pigment granulation, kept still throughout the microscopic insert.
  for(let i=0;i<4200;i++) {
    const px=-350+rand()*700,py=-350+rand()*700;
    c.fillStyle=i%3 ? 'rgba(217,139,168,.13)' : 'rgba(255,243,240,.32)';
    c.beginPath();c.ellipse(px,py,.35+rand()*1.6,.25+rand()*.8,0,0,TAU);c.fill();
  }

}
