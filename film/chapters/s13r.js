import { prepareMechVascular, drawVessel } from '../lib_ext/mech_vascular.js';
import { prepareCross, drawCrossSection } from '../lib_ext/mech_cross.js';
import { prepareTissue, drawTissueField, tissueAnchors } from '../lib_ext/mech_tissue.js';
import { prepare as prepareGross, drawAppendix, frameAt, toScreen, tubeRadius, swellAt } from '../lib_ext/mech_gross_appendix.js';

const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const mix = (a, b, p) => a + (b - a) * p;
const TAU = Math.PI * 2;

// thin leader + light-violet text, no box (same convention as S06)
function tag(c, lines, x, y, px, py, a = 1, { align = 'left', size = 33, color = '#9276A6' } = {}) {
  if (a <= .01) return;
  if(size===36){window.__rescaleLabels??=[];window.__rescaleLabels.push({text:lines,x,y,px,py,targetScreen:[px,py]});}
  c.save();
  c.globalAlpha = a;
  c.font = `500 ${size}px MixSans`;
  const arr = Array.isArray(lines) ? lines : [lines];
  const w = Math.max(...arr.map(s => c.measureText(s).width));
  const sx = align === 'right' ? x + w + 6 : x - 6;
  const sy = y - size * .28;
  const dir = px > sx ? 1 : -1;
  c.strokeStyle = '#AC98B7';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(sx, sy);
  c.lineTo(sx + dir * 30, sy);
  c.lineTo(px, py);
  c.stroke();
  c.strokeStyle = 'rgba(244,239,230,.88)';
  c.lineWidth = 5;
  c.lineJoin = 'round';
  arr.forEach((s, i) => c.strokeText(s, x, y + i * (size + 7)));
  c.fillStyle = color;
  arr.forEach((s, i) => c.fillText(s, x, y + i * (size + 7)));
  c.restore();
}

export default {
  prepare() {
    prepareMechVascular();
    prepareCross();
    prepareTissue();
    try { prepareGross(); } catch {}
  },
  draw(c, t, T) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#F4EFE6';
    c.fillRect(0, 0, 1920, 1080);

    const s50 = T.at(50), s51 = T.at(51), s52 = T.at(52), s53 = T.at(53);

    // ── left column ─────────────────────────────────────────────────────────────────
    const t0 = smooth(t / .55);
    c.save();
    c.globalAlpha = t0;
    c.fillStyle = '#3A2438';
    c.font = '800 58px MixSans';
    c.fillText('终局黑', 85, 268);
    c.restore();

    const l49 = smooth((t - T.frac(49, .18)) / .5);
    const l50 = smooth((t - T.frac(50, .16)) / .45);
    const l51 = smooth((t - T.frac(51, .14)) / .45);
    const l52 = smooth((t - T.frac(52, .10)) / .45);
    const l53 = smooth((t - T.frac(53, .10)) / .45);
    c.save();
    c.fillStyle = '#2A2A35';
    c.font = '500 36px MixSans';
    c.globalAlpha = l49; c.fillText('腔内压力升高', 85, 372);
    c.globalAlpha = l50; c.fillText('受压／血栓 → 缺血', 85, 438);
    c.globalAlpha = l51; c.fillText('组织坏死、出血', 85, 504);
    c.globalAlpha = l52; c.fillText('坏死与血红蛋白', 85, 570);
    c.fillText('分解产物', 85, 616);
    c.globalAlpha = l53; c.fillText('局部暗红、发黑', 85, 682);
    c.restore();

    // ── 49: cross-section, intraluminal pressure rising ─────────────────────────────
    const press = smooth((t - T.frac(49, .10)) / (T.frac(49, .82) - T.frac(49, .10)));
    const shrink = smooth((t - s50) / .85);
    const cx = mix(1180, 762, shrink), cy = mix(420, 462, shrink), cr = mix(268, 148, shrink);
    const crossA = 1 - smooth((t - s53) / .24);

    if (crossA > .01) {
      drawCrossSection(c, { x: cx, y: cy, R: cr, press, alpha: crossA });
      tag(c, '腔内压力', 1460, 148, cx + Math.cos(-.9) * (cr * .16), cy + Math.sin(-.9) * (cr * .16),
        smooth((t - T.frac(49, .34)) / .5) * crossA * (1 - smooth((t - s50) / .28)));
    }

    // locator for the wall detail (appears as the inset opens)
    const locA = smooth((t - s50 - .1) / .45) * crossA;
    const loc = [cx + Math.cos(-.55) * (cr * .84), cy + Math.sin(-.55) * (cr * .84)];
    if (locA > .01) {
      c.save();
      c.globalAlpha = locA * (1 - smooth((t - s50) / .3));
      c.strokeStyle = '#AC98B7';
      c.lineWidth = 1.6;
      c.beginPath(); c.arc(loc[0], loc[1], 24, 0, TAU); c.stroke();
      c.restore();
    }

    // ── inset window (50–52) ────────────────────────────────────────────────────────
    const open = smooth((t - s50 - .02) / .72);
    const wx = 1432, wy = 452, wr = 350;
    const tissueA = smooth((t - s51 - .04) / .32);
    const grossA = smooth((t - s53 - .20) / .42);
    const insetA = (1 - smooth((t - s53) / .24)) * open;
    const contentA = open;

    if (open > .01 && grossA < .99) {
      const r = wr * open;
      if (locA > .01) {
        c.save();
        c.globalAlpha = locA * insetA * contentA;
        c.strokeStyle = '#AC98B7';
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(loc[0] + 14, loc[1] - 20);
        c.lineTo(wx - r * .70, wy - r * .72);
        c.moveTo(loc[0] + 14, loc[1] + 20);
        c.lineTo(wx - r * .70, wy + r * .72);
        c.stroke();
        c.restore();
      }
      c.save();
      c.globalAlpha = insetA;
      c.beginPath(); c.arc(wx, wy, r, 0, TAU);
      c.fillStyle = '#F4EFE6'; c.fill();
      c.save();
      c.clip();

      // 50: two routes in the wall — external compression and thrombosis
      const mechA = 1 - tissueA;
      if (mechA > .01) {
        const sq = smooth((t - T.frac(50, .10)) / (T.frac(50, .62) - T.frac(50, .10)));
        const th = smooth((t - T.frac(50, .16)) / (T.frac(50, .66) - T.frac(50, .16)));
        const fl = (t % 10) / 10;
        c.save();
        c.globalAlpha = mechA * contentA;
        c.translate(wx, wy);

        c.fillStyle = '#F4E8E4';
        c.fillRect(-r, -r, r * 2, r * 2);

        // upper vessel: squeezed from outside. Chevrons stop at the waist.
        c.save();
        c.translate(0, -128);
        drawVessel(c, {
          L: 300, h: 48, wall: 11, squeeze: sq, squeezeX: -24, density: .72,
          flow: fl, flowAlpha: .85 * sq,
        });
        c.restore();
        // external squeeze arrows, no scale. Filled heads so they don't read as a Y.
        const sa = smooth((t - T.frac(50, .25)) / .5);
        if (sa > .01) {
          c.save();
          c.globalAlpha = sa;
          c.strokeStyle = 'rgba(90,48,64,.92)';
          c.fillStyle = 'rgba(90,48,64,.92)';
          c.lineWidth = 3.2;
          c.lineCap = 'round';
          for (const s of [-1, 1]) for (const dx of [-78, -24, 30]) {
            const tip = -128 + s * 86, tail = -128 + s * 148;
            c.beginPath();
            c.moveTo(dx, tail);
            c.lineTo(dx, tip + s * 16);
            c.stroke();
            c.beginPath();
            c.moveTo(dx - 11, tip + s * 18);
            c.lineTo(dx, tip);
            c.lineTo(dx + 11, tip + s * 18);
            c.closePath();
            c.fill();
          }
          c.restore();
        }

        // lower vessel: occlusive thrombus
        c.save();
        c.translate(0, 132);
        drawVessel(c, { L: 300, h: 48, wall: 11, thrombus: th, clotX: 36, flow: fl, flowAlpha: .9, density: .78 });
        c.restore();
        c.restore();
      }

      // 51–52: wall tissue dying, bleeding, then pigment
      if (tissueA > .01) {
        const n = smooth((t - T.frac(51, .16)) / (T.end(51) - T.frac(51, .16)));
        const b = smooth((t - T.frac(51, .63)) / (T.end(51) - T.frac(51, .63)));
        const g = smooth((t - T.frac(52, .12)) / (T.end(52) - T.frac(52, .12)));
        // Camera only: widen the same seeded field; preserve the screen aperture.
        const z = .49;
        c.save();c.translate(wx,wy);c.scale(z,z);c.translate(-wx,-wy);
        drawTissueField(c, { x: wx, y: wy, r:r/z, n, b, g, flow: (t % 9) / 9, alpha: tissueA * contentA });
        c.restore();
        window.__rescaleCamera={x:0,y:0,z,cx:wx,cy:wy,r,pxPerUm:700/391.176470588};
      }
      c.restore();
      c.strokeStyle = '#C6B6C9';
      c.lineWidth = 1.6;
      c.beginPath(); c.arc(wx, wy, r, 0, TAU); c.stroke();
      c.restore();

      // Microscope caption follows measured scale; no change to non-microscope sentences.
      if(t>=s51&&t<s53){c.fillStyle='#51336F';c.font='500 36px MixSans';c.fillText('高倍',1130,76);}
      // labels
      const labA = insetA * contentA;
      tag(c, '受压', 1180, 176, wx - 30, wy - 128 - 42, labA * smooth((t - T.frac(50, .34)) / .4) * (1 - tissueA));
      tag(c, '血栓', 1594, 676, wx + 150, wy + 132, labA * smooth((t - T.frac(50, .5)) / .4) * (1 - tissueA));
      tag(c, '缺血', 1610, 228, wx + 120, wy - 150, labA * smooth((t - T.frac(50, .74)) / .3) * (1 - tissueA));
      tag(c, '坏死', 1810, 470, wx + tissueAnchors.necro[0] * .49, wy + tissueAnchors.necro[1] * .49, labA * smooth((t - T.frac(51, .38)) / .4) * tissueA, {size:36,color:'#51336F'});
      tag(c, '出血', 1688, 760, wx + tissueAnchors.bleed[0] * .49, wy + tissueAnchors.bleed[1] * .49, labA * smooth((t - T.frac(51, .74)) / .35) * tissueA, {size:36,color:'#51336F'});
      tag(c, ['血红蛋白', '分解产物'], 1560, 150, wx + tissueAnchors.pigment[0] * .49, wy + tissueAnchors.pigment[1] * .49, labA * smooth((t - T.frac(52, .3)) / .45) * (1 - grossA), {size:36,color:'#51336F'});
    }

    // ── 53: gross close-up, dark red → black ────────────────────────────────────────
    if (grossA > .01) {
      const grow = smooth((t - T.frac(53, .08)) / (T.end(53) - T.frac(53, .08)));
      const stage = mix(2.52, 3, grow);
      const sc = mix(1.12, 1.17, grow);
      const rot = .95;
      // Pin the black plaque in the right panel so the dark-red shaft and the tip both stay on screen.
      const f = frameAt(.8), w = tubeRadius(.8, swellAt(3)), lx = f.p[0] + f.nx * w * -.08, ly = f.p[1] + f.ny * w * -.08;
      const co = Math.cos(rot), si = Math.sin(rot);
      const tx = 1430, ty = 700;
      const pose = { x: tx - (lx * co - ly * si) * sc, y: ty - (lx * si + ly * co) * sc, sc, rot };
      c.save();
      c.globalAlpha = grossA;
      drawAppendix(c, stage, pose, { pit: false });
      c.restore();
      const swell = swellAt(stage);
      const fBlack = frameAt(.80);
      const pDark = toScreen(pose, [fBlack.p[0] + fBlack.nx * tubeRadius(.80, swell) * -.12, fBlack.p[1] + fBlack.ny * tubeRadius(.80, swell) * -.12]);
      tag(c, '发黑', 1628, 360, pDark[0], pDark[1], grossA * smooth((t - T.frac(53, .28)) / .35));
      // Distal red serosa, past the black plaques (those sit around s .75–.85) and off the mesoappendix.
      const fRed = frameAt(.744);
      const pRed = toScreen(pose, [fRed.p[0] + fRed.nx * tubeRadius(.744, swell) * .32, fRed.p[1] + fRed.ny * tubeRadius(.744, swell) * .32]);
      tag(c, '暗红', 1188, 800, pRed[0], pRed[1], grossA * smooth((t - T.frac(53, .42)) / .35));
    }
  },
};
