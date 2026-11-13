import {prepareHospital, hospital} from '../lib_ext/open_hospital.js';
import {prepare as prepareClin, person, pain} from '../lib_ext/clin_draw.js';
import {prepareBlooms, smooth, mix, text, bloom, sectorWash, VIO, RED, YEL, BLK} from '../lib_ext/open_intro.js';

const PAPER = '#F4EFE6';
const NAV = [[110, '红', RED, 'open.redT'], [250, '黄', YEL, 'open.yelT'], [390, '黑', BLK, 'open.blkT']];
// Compass card sits clear of the hospital. The needle is the only moving part.
const CCX = 1120, CCY = 392, CR = 220;

function compass(c, cx, cy, r, alpha, needle) {
  if (alpha <= .01) return;
  const gap = .12, each = (Math.PI * 2 - gap * 3) / 3, a0 = -Math.PI / 2;
  const cols = [['open.redT', RED], ['open.yelT', YEL], ['open.blkT', BLK]];
  c.save();
  c.globalAlpha = alpha * .32; c.strokeStyle = VIO; c.lineWidth = 1.4;
  c.beginPath(); c.arc(cx, cy, r + 10, 0, Math.PI * 2); c.stroke();
  c.restore();
  cols.forEach(([key, col], i) => {
    const aa = a0 + i * (each + gap), ab = aa + each;
    sectorWash(c, key, cx, cy, r * .46, r, aa, ab, alpha * .9, 980);
    c.save(); c.globalAlpha = alpha * .35; c.strokeStyle = col; c.lineWidth = 1.5;
    c.beginPath(); c.arc(cx, cy, r, aa, ab); c.stroke();
    c.beginPath(); c.arc(cx, cy, r * .46, aa, ab); c.stroke();
    c.restore();
  });
  // Two-ended needle. No ticks, numerals, or a second hand.
  const L = r * .62, tail = r * .28;
  c.save(); c.globalAlpha = alpha; c.translate(cx, cy); c.rotate(needle);
  c.fillStyle = '#2A2A35';
  c.beginPath(); c.moveTo(L, 0); c.lineTo(0, 7); c.lineTo(0, -7); c.closePath(); c.fill();
  c.globalAlpha = alpha * .55;
  c.beginPath(); c.moveTo(-tail, 0); c.lineTo(0, 5.5); c.lineTo(0, -5.5); c.closePath(); c.fill();
  c.globalAlpha = alpha; c.fillStyle = '#2A2A35';
  c.beginPath(); c.arc(0, 0, 5.5, 0, Math.PI * 2); c.fill();
  c.restore();
}

export default {
  prepare() { prepareClin(); prepareBlooms(); prepareHospital(); },
  draw(c, t, T) {
    const F = (id, a) => T.frac(id, a);
    const since = (t0, d = .5) => smooth((t - t0) / d);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = PAPER; c.fillRect(0, 0, 1920, 1080);

    const form = smooth((t - F(75, .22)) / (F(75, .62) - F(75, .22)));
    const gather = smooth((t - F(75, .02)) / (F(75, .48) - F(75, .02)));
    // 76 — the needle turns toward the hospital, then the card leaves before the building is solid.
    const turn = smooth((t - F(76, .06)) / (F(76, .40) - F(76, .06)));
    const cardOut = smooth((t - F(76, .30)) / (F(76, .58) - F(76, .30)));
    const hospitalA = smooth((t - F(76, .48)) / (F(76, .78) - F(76, .48)));
    const walk = smooth((t - F(77, .06)) / (F(77, .52) - F(77, .06)));
    const ground = smooth((t - F(76, .46)) / (F(76, .70) - F(76, .46)));
    const cardA = form * (1 - cardOut);
    const needle = mix(-.55, .62, turn);

    if (ground > .01) {
      c.save(); c.globalAlpha = ground * .4; c.strokeStyle = '#B9A6C4'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(760, 808); c.lineTo(1780, 808); c.stroke(); c.restore();
    }

    // Hospital behind the patient. Base sits on the ground line.
    if (hospitalA > .01) {
      const hy = 671 - 16 * (1 - hospitalA);
      c.save(); c.globalAlpha = hospitalA;
      hospital(c, 1548, hy);
      c.restore();
    }

    // 75 — three colours gather into a card with no scale.
    if (gather < .998) {
      const starts = [[760, 640], [1180, 150], [1680, 620]];
      const ends = [[CCX + 150, CCY - 40], [CCX + 20, CCY + 160], [CCX - 150, CCY + 20]];
      ['open.redT', 'open.yelT', 'open.blkT'].forEach((k, i) => {
        const x = mix(starts[i][0], ends[i][0], gather), y = mix(starts[i][1], ends[i][1], gather);
        bloom(c, k, x, y, mix(210, 120, gather), (1 - form) * .9);
      });
    }
    if (cardA > .01) {
      compass(c, mix(CCX, CCX + 30, cardOut), mix(CCY, CCY - 16, cardOut), CR, cardA, needle);
    }

    // 77 — the patient stops at the hospital. Front view so the right lower abdomen reads.
    if (walk > .01) {
      const px = mix(860, 1008, walk), py = 80, sc = 1.18;
      c.save(); c.globalAlpha = Math.min(1, walk * 1.35);
      person(c, {x: px, y: py, scale: sc, face: 'pain', arm: 'pain'});
      pain(c, px - 16 * sc, py + 338 * sc, .72);
      c.restore();
    }

    // Observation nav. The dashed stroke leaves the row and stops in blank space.
    const navA = smooth(t / .55);
    NAV.forEach(([x, ch, col, key], i) => {
      const a = navA * smooth((t - i * .08) / .4);
      bloom(c, key, x, 168, 36, a * .9);
      text(c, ch, x + 28, 182, 30, 700, col, a);
    });
    c.save(); c.globalAlpha = navA * .55; c.strokeStyle = VIO; c.lineWidth = 1.6; c.setLineDash([7, 7]);
    c.beginPath(); c.moveTo(268, 196); c.bezierCurveTo(330, 236, 400, 268, 458, 292); c.stroke();
    c.setLineDash([]);
    c.beginPath(); c.arc(458, 292, 5.5, 0, Math.PI * 2); c.stroke();
    c.restore();

    const a75 = since(F(75, .12)) * (1 - since(F(76, .04), .35));
    if (a75 > .01) {
      text(c, '洞察微观病变的', 88, 400, 40, 500, '#2A2A35', a75);
      text(c, '罗盘', 88, 470, 56, 800, '#2A2A35', a75);
    }
    const a76 = since(F(76, .08)) * (1 - since(F(77, .04), .28));
    if (a76 > .01) {
      text(c, '不是等待病情', 88, 378, 38, 500, '#2A2A35', a76);
      text(c, '演进的时钟', 88, 430, 38, 500, '#2A2A35', a76);
      text(c, '别等病情加重', 88, 508, 40, 700, RED, a76);
    }
    const a77 = since(F(77, .12));
    if (a77 > .01) {
      text(c, '持续右下腹痛、发热', 88, 386, 38, 700, '#2A2A35', a77);
      text(c, '请及时就诊', 88, 460, 52, 800, RED, a77);
    }

    // Entry only. Names and publishers stay off the end card.
    const refA = since(F(77, .58), .55);
    if (refA > .01) {
      c.save(); c.globalAlpha = refA * .28; c.strokeStyle = '#2A2A35'; c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(88, 668); c.lineTo(250, 668); c.stroke(); c.restore();
      text(c, '参考文献 [1]–[5]', 88, 706, 26, 500, VIO, refA * .9);
    }
  },
};
