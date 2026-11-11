// 06 全身反应与三种结局 — sentences 24–27. Entry = 05's tissue field contracting into the McBurney point of the patient (zoom-out).
// 24: 全身警报 — thermometer climbs to the case temperature (39.3 ℃), blood report WBC ↑ with neutrophils multiplying.
// 25–27: three outcomes branch from the appendix: 痊愈 / 慢性炎症 / 蔓延 → 穿孔 → 弥漫性腹膜炎（可能危及生命）.
import { C } from '../lib/tokens.js';
import * as A from '../lib/ann.js';
import { drawWash } from '../lib/wash.js';
import { ink } from '../lib/ink.js';
import { FIG, drawFigure, drawArmR, drawInsitu, INSITU } from '../lib/figure.js';
import { drawNeutrophil } from '../lib/he.js';
import { toScreen } from '../lib/camera.js';
import { win, fade, clamp, titleBlock } from '../lib/chapter.js';
import { tween, ease } from '../lib/motion.js';
import { moodAt, burstShake } from '../lib/mood.js';
import c05, { EXIT_CAM5 } from './05.js';
import { apply as applyCam } from '../lib/camera.js';
import { grid } from '../lib/ink.js';
const I0 = 24, s = i => I0 + i;
const lerp = (a, b, k) => a + (b - a) * k;
let _off = null; const OFF = () => (_off ||= Object.assign(document.createElement('canvas'), { width: 1920, height: 1080 }));
const CAM = { x: 1230, y: 590, zoom: .8 };
export const EXIT_CAM6 = CAM;
const z0 = 1;
const TH = { x: 640, y0: 600, y1: 250 };                 // thermometer column (world)
const ROOT = INSITU.appendix[2];
const BR = [{ y: 300, name: '痊愈', sub: '炎症消退 · 组织修复' }, { y: 500, name: '慢性炎症', sub: '致炎因子持续存在 · 反复拉锯' }, { y: 700, name: '蔓延', sub: '' }];
const BX = 1330;
// Abdominal cavity silhouette (world px) — inside the shirt, clear of the clutching arm / outside air.
// Diffuse peritonitis must fill THIS region, never spill onto the limb or past the torso.
const ABD = [[860,545],[960,525],[1060,545],[1088,630],[1095,720],[1075,805],[960,828],[845,805],[825,720],[832,630]];
function clipAbd(ctx, draw) {
  ctx.save(); ctx.beginPath(); ABD.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath(); ctx.clip(); draw(); ctx.restore();
}
const peakAt = T => T.frac(s(3), .78);
const spreadAt = (t, T) => tween(t, [[T.frac(s(3), .3), 0], [T.frac(s(3), .58), .28, ease.inQuad], [T.frac(s(3), .72), .85, ease.inQuad], [peakAt(T), 1, ease.outCubic]]);
export default {
  id: '06',
  shake: (t, T) => burstShake(t, T.frac(s(3), .76), { frames: 6, amp: 3.4, seed: 606 }),
  drift: false, boil: true,   // mood_v2d: same 10 fps Rough.js line boil as 01–05 (was off → figure read as frozen)
  bake(bake) {
    bake('c06.focus', (b, P) => { P.fill(b, P.blob(0, 0, 300, 26, .4, 61), C.red, 150, .3, [.5, .6]); }, { seed: 61 });
    // elongated abdomen wash (wider than tall); still clipped to ABD in world()
    bake('c06.perit', (b, P) => { P.fill(b, P.blob(0, -20, 480, 40, .25, 62), C.red, 130, .35, [.55, .55]); P.fill(b, P.blob(40, 10, 360, 34, .3, 63), C.red, 100, .3, [.6, .55]); P.fill(b, P.blob(-80, 30, 220, 26, .35, 64), C.pus, 80, .28); }, { seed: 62 });
  },
  camera: T => [
    [T.at(s(0)), EXIT_CAM5], [T.frac(s(0), .22), CAM],
    [T.frac(s(0), .4), CAM], [T.frac(s(0), .56), { x: 1220, y: 590, zoom: .84 }], [T.end(s(0)), { x: 1220, y: 590, zoom: .84 }],
    [T.frac(s(1), .35), CAM], [T.at(s(2)), { ...CAM, zoom: .815 }, ease.inOutSine], // healing: relaxed camera and a held explanation
    [T.frac(s(2), .2), { ...CAM, x: 1225, zoom: .822 }], [T.frac(s(2), .55), { ...CAM, x: 1234, zoom: .834 }], [T.end(s(2)), { ...CAM, x: 1229, zoom: .842 }],
    [T.at(s(3)), { ...CAM, x: 1229, zoom: .842 }], [T.frac(s(3), .3), { x: 1232, y: 594, zoom: .848 }],
    [T.frac(s(3), .58), { x: 1220, y: 596, zoom: .862 }], [peakAt(T), { x: 1200, y: 600, zoom: .9 }],
    [peakAt(T) + .4, { x: 1200, y: 600, zoom: .9 }], // 0.4 s held after peritonitis peak
    [T.end(s(3), -.4), CAM], [T.end(s(3)), CAM], // exact EXIT_CAM6 for 07
  ],
  world(ctx, t, T, cam) {
    const k0 = win(t, T.at(s(0)), T.frac(s(0), .2));
    // patient (translucent) + in-situ anatomy
    ctx.save(); ctx.globalAlpha = .9; const br = 2.4 * Math.sin(t * 2 * Math.PI / 3.6), sw = 5 * Math.sin(t * .52) + 1.6 * Math.sin(t * 1.13 + 1);
    // mood_v2d: visible breathing (≈1.7% chest rise) + sway (±6 px)
    drawFigure(ctx, { face: 'pain', breath: br, sway: sw }); drawArmR(ctx, { pose: 'clutch', rub: [sw, -.6 * br + .4 * Math.sin(t * .9)] }); ctx.restore();
    const kheal = win(t, T.frac(s(1), .2), T.frac(s(1), .7)) * (1 - win(t, T.at(s(2)), T.frac(s(2), .2)));
    drawWash(ctx, 'c06.focus', 896, 792, 150, { alpha: 1 - .7 * kheal });
    drawInsitu(ctx, { alpha: 1 });
    // 27: spread → perforation → diffuse peritonitis (wash floods the abdomen)
    // Paper darkness and the bounded peak impulse come from shared mood, not this anatomy layer.
    const kp = spreadAt(t, T);
    // From McBurney (RLQ) → fill whole abdomen; clipped so the wash never leaves the torso.
    const wx = lerp(FIG.mcb[0], FIG.navel[0], kp * .85), wy = lerp(FIG.mcb[1], FIG.navel[1] + 30, kp * .7);
    const wsz = lerp(160, 520, kp);
    if (kp > 0) clipAbd(ctx, () => {
      drawWash(ctx, 'c06.perit', wx, wy, wsz, { grow: Math.min(1, .35 + .75 * kp), alpha: kp * .9, origin: [.42, .72] });
    });
    const kh = win(t, T.frac(s(3), .2), T.frac(s(3), .32)); if (kh > 0) { A.ring(ctx, INSITU.appendix[3], 14, { k: kh, col: C.ink, w: 3 }); }
    // Spread arrows stay inside the abdomen (shorter radial reach, biased across the belly).
    for (let j = 0; j < 8 && kp > 0; j++) {
      const a = -2.55 + j * .52, reach = 28 + 48 * kp;
      const x0 = INSITU.appendix[3][0] + Math.cos(a) * 16, y0 = INSITU.appendix[3][1] + Math.sin(a) * 16;
      const x1 = INSITU.appendix[3][0] + Math.cos(a) * reach, y1 = INSITU.appendix[3][1] + Math.sin(a) * reach;
      A.arrow(ctx, [x0, y0], [x1, y1], { k: kp, col: C.red, w: 2, head: 9 });
    }
  },
  screen(ctx, t, T, cam, mood = moodAt(t, T)) {
    // Shared paper is global; only the existing entry mask needs the same colour here.
    // entry: 05's field collapses into the lesion (ring closing on McBurney)
    const ke = win(t, T.at(s(0)), T.frac(s(0), .18)), m = toScreen(cam, [896, 792]);
    // mood_v2c: MATCH TRANSITION tissue → patient (≈1.1 s). 05's last tissue frame becomes a round "microscope field"
    // (iris closes from the frame edge to a 470 px disc while the patient appears around it), then the disc travels and
    // shrinks onto McBurney's point and turns into the red lesion spot. Same clock as 05 (cells keep moving).
    const u = (t - T.at(s(0))) / 1.15;
    if (u < 1.45) { const sm3 = x => { x = clamp(x); return x * x * (3 - 2 * x); };
      const eA = sm3(u / .32), eB = sm3((u - .32) / .68), C0 = [960, 540];
      const r = u < .32 ? lerp(1300, 470, eA) : lerp(470, 30, eB), c = [lerp(C0[0], m[0], eB), lerp(C0[1], m[1], eB)];
      const sc = Math.min(1, r / 640), ka = 1 - sm3((u - .82) / .18), kr = 1 - sm3((u - 1.05) / .4);
      // patient is revealed AROUND the field (paper veil outside the disc fades out during the iris)
      if (eA < 1) { ctx.save(); ctx.globalAlpha = 1 - eA; ctx.fillStyle = mood.paper; ctx.beginPath(); ctx.rect(0, 0, 1920, 1080); ctx.arc(c[0], c[1], r, 0, 6.283, true); ctx.fill('evenodd'); ctx.restore(); }
      if (ka > 0 && u < 1) {
        // render the tissue full-frame OFFSCREEN first (an arc clip + huge multiply washes drops washes in this Skia build)
        const o = OFF(), oc = o.getContext('2d'); oc.setTransform(1, 0, 0, 1, 0, 0); oc.globalAlpha = 1; oc.globalCompositeOperation = 'source-over';
        oc.fillStyle = mood.paper; oc.fillRect(0, 0, 1920, 1080); oc.save(); applyCam(oc, EXIT_CAM5);
        oc.save(); oc.globalAlpha *= mood.gridAlpha; grid(oc, -200, -200, 2120, 1280); oc.restore(); c05.world(oc, t, T, EXIT_CAM5); oc.restore();
        // mood_v2d: the tissue OUTSIDE the closing field fades over ~0.3 s (no instant loss of the surround on frame 1)
        const kout = 1 - sm3((t - T.at(s(0))) / .3);
        if (kout > 0) { ctx.save(); ctx.globalAlpha = kout; ctx.translate(c[0], c[1]); ctx.scale(sc, sc); ctx.translate(-C0[0], -C0[1]); ctx.drawImage(o, 0, 0); ctx.restore(); }
        ctx.save(); ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, 6.283); ctx.clip(); ctx.globalAlpha = ka;
        ctx.translate(c[0], c[1]); ctx.scale(sc, sc); ctx.translate(-C0[0], -C0[1]); ctx.drawImage(o, 0, 0); ctx.restore();
        // field stop rim: ink, so it reads as the same round view we had under the microscope
        ctx.save(); ctx.globalAlpha = ka * Math.min(1, eA * 3); ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, 6.283); ctx.stroke(); ctx.restore(); }
      // red ring takes over as the disc lands, and stays a moment on McBurney's point
      A.ring(ctx, c, Math.max(r + 8, 30), { col: C.red, w: 3, k: kr * Math.min(1, eA * 2) }); }
    // ---- 24: systemic alarm ----
    const ka = fade(t, T.frac(s(0), .18), T.frac(s(0), .3), T.end(s(0), -.3), T.end(s(0), .4));
    if (ka > 0) { const a = toScreen(cam, [TH.x, TH.y0]), b = toScreen(cam, [TH.x, TH.y1]), lev = win(t, T.frac(s(0), .25), T.frac(s(0), .55));
      ctx.save(); ctx.globalAlpha = ka; { // shapes are cached by key, so build them in fixed local coords (camera-independent) and place with a transform
        const H = TH.y0 - TH.y1, z = (a[1] - b[1]) / H; ctx.save(); ctx.translate(a[0], a[1]); ctx.scale(z, z);
        ink(ctx, 'c06.thtube', 'rectangle', [-14 / z0, -H, 28 / z0, H], { strokeWidth: 2.6, seed: 71 }); ink(ctx, 'c06.thbulb', 'circle', [0, 18 / z0, 46 / z0], { fill: C.red, fillStyle: 'solid', seed: 72 }); ctx.restore(); }
        ctx.fillStyle = C.red; const top = lerp(a[1], b[1] + 50, lev); ctx.fillRect(a[0] - 6, top, 12, a[1] - top);
        for (let i = 0; i <= 6; i++) A.tick(ctx, [a[0] + 20, lerp(a[1] - 30, b[1] + 30, i / 6)], [1, 0], { len: 6 }); ctx.restore();
        A.counter(ctx, lerp(36.8, 39.3, lev), a[0] + 44, top, { fmt: v => v.toFixed(1), unit: ' ℃', size: 40, col: C.red, alpha: ka });
        A.label(ctx, '发热', a[0] - 30, b[1] - 34, { size: 30, w: 800, align: 'center', k: ka });
        // blood report: WBC ↑ with neutrophils multiplying in a smear circle
        const rx = 1080, ry = 250, kr = win(t, T.frac(s(0), .5), T.frac(s(0), .62)) * ka;
        A.label(ctx, '血常规', rx, ry, { size: 26, alpha: .7, k: kr }); A.line(ctx, [rx, ry + 24], [rx + 420, ry + 24], { k: kr, w: 1.6 });
        A.label(ctx, '白细胞（WBC）', rx, ry + 70, { size: 32, w: 700, k: kr }); const ku = win(t, T.frac(s(0), .62), T.frac(s(0), .7)) * ka;
        A.label(ctx, '↑', rx + 270, ry + 70 - 12 * win(t, T.frac(s(0), .62), T.frac(s(0), .72)), { size: 54, w: 800, col: C.red, k: ku }); A.label(ctx, '以中性粒细胞为主', rx, ry + 118, { size: 22, k: ku, alpha: .8 });
        const c = { x: rx + 200, y: ry + 270, r: 100 }, n = lerp(2, 14, win(t, T.frac(s(0), .56), T.frac(s(0), .78)));
        if (kr > 0) { ctx.save(); ctx.globalAlpha = kr; ctx.fillStyle = '#F6EEF0'; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 6.283); ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.clip();
          for (let i = 0; i < 18; i++) { const x = c.x - 80 + ((i * 53) % 160), y = c.y - 70 + ((i * 37) % 140); ctx.fillStyle = 'rgba(214,69,58,.55)'; ctx.beginPath(); ctx.ellipse(x, y, 9, 7, 0, 0, 6.283); ctx.fill(); }
          for (let i = 0; i < 14; i++) { const on = clamp(n - i); if (on <= 0) continue; const a = i * 2.4, dt = t - T.frac(s(0), .56), x = c.x + Math.cos(a) * (18 + (i * 29) % 62) + 4 * Math.sin(dt * 3 + a), y = c.y - 70 + (((i * 37 - dt * 64) % 140 + 140) % 140); drawNeutrophil(ctx, x, y, { lobes: 3 + (i % 2), rot: a }, 1.4 * on); } ctx.restore();
          A.label(ctx, '血涂片示意 · 中性粒细胞增多', c.x, c.y + c.r + 28, { size: 20, align: 'center', k: kr, alpha: .75 }); }
        A.label(ctx, '免疫系统紧急调兵', 1080, 760, { size: 30, w: 700, col: C.red, k: win(t, T.frac(s(0), .78), T.frac(s(0), .9)) * ka }); }
    // ---- 25–27: three outcomes branch from the appendix ----
    const motionT = Math.min(t, peakAt(T)), dt = Math.max(0, motionT - T.at(s(3)));
    const alert = .82 + .18 * Math.sin(dt * 3.5 + dt * dt * .15) ** 2; // restrained annotation pulse, not a full-screen flash
    const r0 = toScreen(cam, ROOT), kt = win(t, T.at(s(1)), T.frac(s(1), .15));
    A.dot(ctx, r0, { r: 7, col: C.red, k: kt });
    BR.forEach((b, i) => { const k = win(t, T.frac(s(1 + i), .02), T.frac(s(1 + i), .2)), end = [BX, b.y], fork = [1020, r0[1]], elbow = [1080, b.y];
      const live = i === 2 ? 1 : 1 - .5 * win(t, T.at(s(i + 2)), T.frac(s(i + 2), .1));
      if (k <= 0) return; ctx.save(); ctx.globalAlpha = live * (i === 2 ? alert : 1);
      A.line(ctx, r0, fork, { k: Math.min(1, k * 3), col: i === 2 ? C.red : C.ink, w: 2.2 }); A.line(ctx, fork, elbow, { k: clamp(k * 3 - 1), col: i === 2 ? C.red : C.ink, w: 2.2 }); A.arrow(ctx, elbow, end, { k: clamp(k * 3 - 2), col: i === 2 ? C.red : C.ink, w: 2.2 });
      A.label(ctx, b.name, BX + 24, b.y - 4, { size: 44, w: 800, col: i === 2 ? C.red : C.ink, k: clamp(k * 2 - 1) });
      if (b.sub) A.label(ctx, b.sub, BX + 24, b.y + 42, { size: 24, k: win(t, T.frac(s(1 + i), .2), T.frac(s(1 + i), .35)), alpha: .8 }); ctx.restore(); });
    // 痊愈 glyph: check mark; 慢性: oscillating "tug-of-war" line
    const kc = win(t, T.frac(s(1), .3), T.frac(s(1), .45)); A.line(ctx, [BX + 140, BR[0].y - 6], [BX + 156, BR[0].y + 10], { k: kc, col: C.red, w: 4 }); if (kc >= 1) A.line(ctx, [BX + 156, BR[0].y + 10], [BX + 190, BR[0].y - 26], { k: win(t, T.frac(s(1), .45), T.frac(s(1), .55)), col: C.red, w: 4 });
    const kw = win(t, T.frac(s(2), .3), T.frac(s(2), .7));
    if (kw > 0) { ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.4; ctx.globalAlpha = 1 - .5 * win(t, T.at(s(3)), T.frac(s(3), .1)); ctx.beginPath();
      for (let x = 0; x <= 220 * kw; x += 4) ctx.lineTo(BX + 230 + x, BR[1].y - 6 + Math.sin(x / 14 + Math.min(t, T.end(s(2))) * 2.5) * 9 * Math.exp(-x / 400)); ctx.stroke(); ctx.restore(); }
    // 蔓延 chain
    const cx0 = BX + 24;
    const kc1 = win(t, T.frac(s(3), .2), T.frac(s(3), .32)), kc2 = win(t, T.frac(s(3), .38), T.frac(s(3), .5)), kc3 = win(t, T.frac(s(3), .58), T.frac(s(3), .7)), yc = BR[2].y + 52;
    A.label(ctx, '阑尾穿孔', cx0, yc, { size: 26, w: 700, k: kc1 }); A.arrow(ctx, [cx0 + 110, yc], [cx0 + 140, yc], { k: kc2, w: 2, head: 10 });
    A.label(ctx, '脓液入腹腔', cx0 + 148, yc, { size: 26, w: 700, k: kc2 }); A.arrow(ctx, [cx0 + 284, yc], [cx0 + 314, yc], { k: kc3, w: 2, head: 10 });
    A.label(ctx, '弥漫性腹膜炎', cx0 + 322, yc, { size: 26, w: 800, col: C.red, k: kc3 });
    const kd = win(t, T.frac(s(3), .67), peakAt(T)), xd = cx0 + 322, yd = yc + 70;
    if (kd > 0) { ctx.save(); ctx.globalAlpha = kd; ctx.strokeStyle = C.red; ctx.lineWidth = 2.4; ctx.strokeRect(xd - 10, yd - 26, 192, 52); ctx.restore(); A.arrow(ctx, [xd + 80, yc + 18], [xd + 80, yd - 28], { k: kd, col: C.red, w: 2, head: 9 }); }
    A.label(ctx, '可能危及生命', xd, yd, { size: 28, w: 800, col: C.red, k: kd });
  },
  title(ctx, t, T) { titleBlock(ctx, t, T.frac(s(0), .05), '06 · 全身反应与结局', '全身警报', 4); },
};
