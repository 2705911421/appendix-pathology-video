import {prepare, drawAppendix, frameAt, toScreen, sidePt, SWELL} from '../lib_ext/gross_swap_canonical.js';
import {prepare as prepareClin, abdomen} from '../lib_ext/clin_draw.js';
import {prepareBlooms, smooth, mix, rich, text, tag, bloom, VIO, RED, YEL, BLK} from '../lib_ext/open_intro.js';

const PAPER = '#F4EFE6';
const CX = 1225, CY = 430;
const CLIP = [548, 0, 1336, 950];
const TRIO = [
  {x: 878, key: 'red', ch: '红'},
  {x: 1225, key: 'yellow', ch: '黄'},
  {x: 1572, key: 'black', ch: '黑'},
];

// Drawn arrow (the font may not carry "→"); hairline + small head.
function tinyArrow(c, x, y, len, alpha = 1, col = '#2A2A35') {
  c.save(); c.globalAlpha *= alpha; c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y); c.lineTo(x + len, y); c.stroke();
  const h = 7;
  c.beginPath(); c.moveTo(x + len, y);
  c.lineTo(x + len - h * Math.cos(-.5), y - h * Math.sin(-.5));
  c.lineTo(x + len - h * Math.cos(.5), y - h * Math.sin(.5));
  c.closePath(); c.fill(); c.restore();
}

// The specimens never move: bake each state once, then blit. Same pixels, far less per-frame work
// (the gross renderer uses ctx.filter blur, which is very costly in software GL).
const SPR = {};
function bakeSprite(key, sc, rot) {
  const R = Math.ceil(560 * sc + 90);
  const cv = document.createElement('canvas'); cv.width = cv.height = R * 2;
  const cc = cv.getContext('2d'); cc.translate(R, R);
  drawAppendix(cc, key, {x: 0, y: 0, sc, rot});
  return {cv, sc};
}
function blit(c, spr, x, y, sc, alpha = 1) {
  if (alpha <= .004) return;
  const k = sc / spr.sc, w = spr.cv.width * k;
  c.save(); c.globalAlpha *= alpha;
  c.drawImage(spr.cv, x - w / 2, y - w / 2, w, w);
  c.restore();
}

export default {
  prepare() {
    prepare(); brush.scaleBrushes(2.4); prepareClin(); prepareBlooms();
    SPR.normal = bakeSprite('normal', 1.06, -.78);
    SPR.red = bakeSprite('red', .70, -1.2);
    SPR.yellow = bakeSprite('yellow', .70, -1.2);
    SPR.black = bakeSprite('black', .70, -1.2);
    SPR.yellowBig = bakeSprite('yellow', 1.16, -1.2);
  },
  draw(c, t, T) {
    const F = (id, a) => T.frac(id, a);
    const since = (t0, d = .45) => smooth((t - t0) / d);

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = PAPER; c.fillRect(0, 0, 1920, 1080);

    // ── right: 01 location → normal specimen → 02 three appearances → 03 wall push ──
    const abA = smooth(t / .55) * (1 - smooth((t - F(1, .30)) / (F(1, .52) - F(1, .30))));
    const apA = smooth((t - F(1, .40)) / (F(1, .60) - F(1, .40)));
    const g = smooth((t - F(1, .40)) / (F(1, .74) - F(1, .40)));
    const lx = 1069, ly = 567;
    const pose1 = {x: 1215, y: 420, sc: mix(.90, 1.06, g), rot: -.78};
    const shrink = smooth((t - T.at(2)) / (F(2, .38) - T.at(2)));
    const normalA = apA * (1 - smooth((t - T.at(2)) / (F(2, .30) - T.at(2))));
    const scN = pose1.sc * (1 - .42 * shrink);
    const outP = smooth((t - F(3, .10)) / (F(3, .26) - F(3, .10))) * (1 - smooth((t - F(4, .12)) / (F(4, .30) - F(4, .12))));
    const closeP = smooth((t - F(3, .26)) / (F(3, .44) - F(3, .26))) * (1 - smooth((t - T.at(4)) / (F(4, .15) - T.at(4))));
    const dim = 1 - .18 * smooth((t - T.at(5)) / (F(5, .30) - T.at(5)));

    c.save(); c.beginPath(); c.rect(...CLIP); c.clip();

    // 01 — the abdomen, with the appendix site marked on the lower right
    if (abA > .01) {
      c.save(); c.globalAlpha = abA;
      c.save(); c.translate(1230, 400); c.scale(1.45, 1);
      abdomen(c, 0, 0, 1.7, 1, 'atypical'); c.restore();
      // Costal margin arcs: enough anatomy for the lower chest to read as a torso.
      c.strokeStyle = VIO; c.globalAlpha = abA * .34; c.lineWidth = 1.4;
      for (const s of [-1, 1]) {
        c.beginPath(); c.moveTo(1230, 415 - 150 * 1.7);
        c.bezierCurveTo(1230 + s * 40 * 2.465, 415 - 120 * 1.7, 1230 + s * 95 * 2.465, 415 - 100 * 1.7, 1230 + s * 104 * 2.465, 415 - 62 * 1.7);
        c.stroke();
      }
      c.globalAlpha = abA;
      c.strokeStyle = VIO; c.lineWidth = 2;
      c.beginPath(); c.arc(lx, ly, 42, 0, 7); c.stroke();
      c.beginPath(); c.moveTo(lx - 5, ly - 12); c.bezierCurveTo(lx + 14, ly - 9, lx + 11, ly + 11, lx - 5, ly + 12); c.stroke();
      c.restore();
    }
    // normal appendix (slender, then shrinks away as the three states arrive)
    if (normalA > .01) {
      blit(c, SPR.normal, pose1.x, pose1.y, scN, normalA * dim);
    }

    // 02–05 — three appearances, no serial arrows
    const trioA = 1 - outP;
    if (trioA > .01) TRIO.forEach((s, i) => {
      const a = smooth((t - (T.at(2) + .04 + i * .10)) / .42) * trioA;
      if (a <= .01) return;
      blit(c, SPR[s.key], s.x, 440, .70, a * dim);
    });
    // 03 — the yellow wall alone, large: the camera has moved in
    if (closeP > .01) {
      blit(c, SPR.yellowBig, 1240, 385, 1.02, closeP * dim);
    }

    // tags (screen space, anchored at each cut face)
    // Leaders sit on the lit serosa (red wall, pus, necrotic pole), not the cut face.
    const tagA = dim * (1 - closeP) * (1 - outP);
    const FEAT = {red: .32, yellow: .42, black: .80};
    if (tagA > .01) {
      TRIO.forEach((s, i) => {
        const a = smooth((t - (T.at(2) + .04 + i * .10)) / .42) * tagA;
        if (a <= .01) return;
        const pose = {x: s.x, y: 440, sc: .70, rot: -1.2};
        const q = toScreen(pose, sidePt(FEAT[s.key], SWELL[s.key], 8));
        tag(c, s.ch, q[0] - 78, q[1] - 18, q[0], q[1], {alpha: a, size: 32});
      });
    }

    // 01 — "阑尾" on the body, then "盲管" on the specimen
    if (abA > .02 && t < F(1, .52)) tag(c, '阑尾', 1195, 614, lx + 42, ly + 4, {alpha: abA, size: 36, side: -1});
    if (normalA > .02 && g > .55) {
      const f = frameAt(.965);
      const q = toScreen({...pose1, sc: scN}, [f.p[0], f.p[1]]);
      tag(c, '盲管', q[0] + 34, q[1] + 50, q[0] + 6, q[1] + 18, {alpha: normalA * .95 * smooth((g - .55) / .3), size: 30, side: -1});
    }
    c.restore();

    // ── left column ──
    const k1 = since(F(1, .36)), k2 = since(F(2, .22)), k3 = since(F(3, .42)), k4 = since(F(4, .08));
    rich(c, [['一根“香肠”的', '#2A2A35', 700]], 88, 206, 56, k1, k1, (1 - k1) * 10);
    rich(c, [['变质', '#2A2A35', 800]], 88, 274, 56, k2, k2, (1 - k2) * 10);
    rich(c, [['日记', '#2A2A35', 800]], 88 + 112, 274, 56, k2, k2, (1 - k2) * 10);
    // 05 — light up "变质" in place, never re-worded
    const h5 = since(F(5, .08), .5);
    if (h5 > .01) {
      rich(c, [['变质', RED, 800]], 88, 274, 56, h5, 1, 0);
      c.save(); c.globalAlpha = h5; c.strokeStyle = RED; c.lineWidth = 2.4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(88, 292); c.lineTo(88 + 112 * h5, 292); c.stroke(); c.restore();
    }

    // title third line: 阑尾的红 → 黄 → 黑 (arrows drawn, not typed)
    const y3 = 352, s3 = 44, rise3 = (1 - k3) * 8;
    let xx = 88;
    xx += rich(c, [['阑尾的', '#2A2A35', 500]], xx, y3, s3, k3, 1, rise3);
    xx += 4; xx += rich(c, [['红', RED, 800]], xx, y3, s3, k3, 1, rise3);
    tinyArrow(c, xx + 10, y3 - 15 + rise3, 34, k3); xx += 58;
    xx += rich(c, [['黄', YEL, 800]], xx, y3, s3, k3, 1, rise3);
    tinyArrow(c, xx + 10, y3 - 15 + rise3, 34, k3); xx += 58;
    rich(c, [['黑', BLK, 800]], xx, y3, s3, k3, 1, rise3);

    // rule + colour navigation (a legend, not a progression)
    c.save(); c.globalAlpha = .28 * k3; c.strokeStyle = '#2A2A35'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(88, 398); c.lineTo(88 + 300 * k3, 398); c.stroke(); c.restore();
    const nav = [[96, '红', RED, 'open.redT'], [232, '黄', YEL, 'open.yelT'], [368, '黑', BLK, 'open.blkT']];
    nav.forEach(([x, ch, col, key], i) => {
      const a = smooth((t - (F(2, .16) + i * .10)) / .45);
      if (a <= .01) return;
      bloom(c, key, x, 441, 34, a * .9);
      text(c, ch, x + 27, 455, 30, 700, col, a);
    });

    // 05 — light the title word; the spoken clarification, not the definition (that stays at 33)
    const n5 = since(F(5, .34), .5);
    text(c, '病理学里的“变质”', 88, 530, 32, 500, '#2A2A35', n5 * .9);
    text(c, '不是食物变坏', 88, 578, 32, 500, '#2A2A35', n5 * .9);
  },
};
