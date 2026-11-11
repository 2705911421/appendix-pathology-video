// 01 疼痛搬家 — sentences 0–3. All beats keyed to sentence index (T.at / T.frac), never hard-coded seconds.
import { C, W } from '../lib/tokens.js';
import { drawWash } from '../lib/wash.js';
import { FIG, painPts, drawFigure, drawArmR, drawInsitu, INSITU } from '../lib/figure.js';
import { ink, shape, draw } from '../lib/ink.js';
import * as A from '../lib/ann.js';
import { win, fade, clamp, titleBlock } from '../lib/chapter.js';
import { ease, seg, pulse } from '../lib/motion.js';
import { holdAfter } from '../lib/mood.js';
const I0 = 0; // first sentence index of this chapter
const s = i => I0 + i;
export const EXIT_CAM = { x: 922, y: 468, zoom: 1.11 };   // settle near end-of-s2 framing so head stays under the title through 22s; 02 zooms from here

// ---- v4 establishing context (lunch table + window day→night + ghost abdominal map). Left zone only; right zone = labels/clock/thermo.
function scene(ctx, t, T) {
  const kS = win(t, 0, 1.8), night = win(t, T.at(s(2)) - .8, T.at(s(2)) + .8), dim = 1 - .55 * night;
  const out = 1 - win(t, T.at(s(3)), T.frac(s(3), .3));                       // clear before the anatomy reveal
  if (out <= 0) return;
  ctx.save(); ctx.globalAlpha = out;
  // window (day → night)
  const wx = 250, wy = 300, ww = 340, wh = 250;
  if (night > 0) { ctx.save(); ctx.globalAlpha *= .04 * night; ctx.fillStyle = C.ink; ctx.fillRect(wx, wy, ww, wh); ctx.restore(); }
  draw(ctx, shape('c01.win', 'rectangle', [wx, wy, ww, wh], { strokeWidth: 2.4, seed: 101 }), { k: kS });
  draw(ctx, shape('c01.winV', 'line', [wx + ww / 2, wy, wx + ww / 2, wy + wh], { strokeWidth: 1.8, seed: 102 }), { k: kS });
  draw(ctx, shape('c01.winH', 'line', [wx, wy + wh / 2, wx + ww, wy + wh / 2], { strokeWidth: 1.8, seed: 103 }), { k: kS });
  draw(ctx, shape('c01.sill', 'line', [wx - 24, wy + wh + 10, wx + ww + 24, wy + wh + 10], { strokeWidth: 3, seed: 104 }), { k: kS });
  const day = 1 - night, sx = wx + 90 + 30 * win(t, 0, T.at(s(2))), sy = wy + 70 + 20 * win(t, 0, T.at(s(2)));
  if (day > 0) { A.ring(ctx, [sx, sy], 26, { k: kS * day, col: C.red, w: 2.6 });
    for (let i = 0; i < 8; i++) { const g = i / 8 * Math.PI * 2 + t * .25; A.line(ctx, [sx + Math.cos(g) * 34, sy + Math.sin(g) * 34], [sx + Math.cos(g) * 44, sy + Math.sin(g) * 44], { k: kS * day, col: C.red, w: 2 }); } }
  if (night > 0) { const mx = wx + ww - 90, my = wy + 72; ctx.save(); ctx.globalAlpha *= night;
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(mx, my, 24, 0, 7); ctx.fill(); ctx.fillStyle = C.paper; ctx.beginPath(); ctx.arc(mx + 10, my - 6, 21, 0, 7); ctx.fill(); ctx.restore();
    [[wx + 60, wy + 40], [wx + 130, wy + 180], [wx + 250, wy + 190], [wx + 300, wy + 150], [wx + 40, wy + 200]].forEach((q, i) => A.dot(ctx, q, { r: 2.4, k: night * (.5 + .5 * Math.sin(t * 3 + i * 1.7)) })); }
  // lunch table + bowl + chopsticks + steam
  ctx.save(); ctx.globalAlpha *= dim;
  draw(ctx, shape('c01.table', 'line', [150, 880, 720, 880], { strokeWidth: 3, seed: 110 }), { k: kS });
  draw(ctx, shape('c01.tableE', 'line', [150, 900, 720, 900], { strokeWidth: 1.6, seed: 111 }), { k: kS });
  draw(ctx, shape('c01.legL', 'line', [190, 900, 190, 1060], { strokeWidth: 2.4, seed: 112 }), { k: kS });
  draw(ctx, shape('c01.legR', 'line', [680, 900, 680, 1060], { strokeWidth: 2.4, seed: 113 }), { k: kS });
  draw(ctx, shape('c01.bowl', 'arc', [430, 846, 200, 120, 0, Math.PI, false], { strokeWidth: 2.6, seed: 114 }), { k: kS });
  draw(ctx, shape('c01.rim', 'ellipse', [430, 846, 200, 28], { strokeWidth: 2, seed: 115 }), { k: kS });
  draw(ctx, shape('c01.foot', 'line', [400, 878, 460, 878], { strokeWidth: 2.4, seed: 116 }), { k: kS });
  draw(ctx, shape('c01.chop1', 'line', [520, 822, 650, 772], { strokeWidth: 2.4, seed: 117 }), { k: kS });
  draw(ctx, shape('c01.chop2', 'line', [528, 834, 660, 790], { strokeWidth: 2.4, seed: 118 }), { k: kS });
  const kst = kS * (1 - win(t, T.at(s(1)), T.frac(s(1), .6)));                  // lunch steam cools down
  for (let j = 0; j < 3; j++) { let prev = null; for (let i = 0; i <= 10; i++) { const u = i / 10, x = 395 + j * 35 + 9 * Math.sin(u * 6 + t * 2.2 + j), y = 820 - u * 120;
    if (prev) A.line(ctx, prev, [x, y], { k: kst * (1 - u) * .8, w: 1.8 }); prev = [x, y]; } }
  ctx.restore();
  // ghost abdominal map (four quadrants through the navel) — a faint "地图" that the pain will travel across
  const kg = .22 * win(t, .6, 2.4) * (1 - win(t, T.frac(s(2), .2), T.frac(s(2), .4)));
  if (kg > 0) { ctx.save(); ctx.globalAlpha *= kg; const n = FIG.navel;
    A.dashed(ctx, [n[0], n[1] - 170], [n[0], n[1] + 170], { w: 1.6, dash: [6, 8] }); A.dashed(ctx, [n[0] - 140, n[1]], [n[0] + 140, n[1]], { w: 1.6, dash: [6, 8] });
    A.ring(ctx, n, 150, { w: 1.4, dash: [4, 9] }); ctx.restore(); }
  ctx.restore();
}
export default {
  id: '01', drift: false, boil: false,   // mood_v2: no 8/10 fps ink boil here — its stepped cadence read as stutter; life comes from breath + tremor
  bake(bake) {
    bake('c01.navel', (b, P) => { P.fill(b, P.blob(0, 0, 230, 26, .35, 3), C.red, 80, .35); }, { seed: 11 });
    bake('c01.bloom', (b, P) => { P.fill(b, P.blob(0, 0, 330, 30, .3, 9), C.red, 120, .32, [.5, .6]); P.fill(b, P.blob(20, 10, 160, 22, .3, 4), C.red, 110, .2); }, { seed: 12 });
    bake('c01.app', (b, P) => { P.fill(b, P.blob(0, 0, 300, 26, .45, 5), C.red, 150, .3, [.5, .6]); P.fill(b, P.blob(-30, -20, 140, 20, .4, 6), C.ink, 40, .3); }, { seed: 13 });
  },
  // Three distinct velocities: slow ache → false reassurance hold → 0.20 s whip → diagnosis stop.
  camera: T => [
    [T.at(s(0)), { x: 960, y: 500, zoom: 1 }],
    [T.at(s(1)), { x: 958, y: 494, zoom: 1.018 }, ease.linear],
    [T.at(s(2)), { x: 958, y: 494, zoom: 1.018 }],
    [T.at(s(2), .20), { x: 950, y: 478, zoom: 1.045 }, ease.outExpo],
    [T.at(s(2), .64), { x: 950, y: 478, zoom: 1.045 }],
    [T.frac(s(2), .5), { x: 936, y: 462, zoom: 1.08 }],
    [T.at(s(3)), { x: 928, y: 458, zoom: 1.10 }],
    [T.at(s(3), .16), EXIT_CAM, ease.outExpo],
    [T.at(s(3), .56), EXIT_CAM],
    [T.end(s(3)), EXIT_CAM],
  ],
  world(ctx, t, T) {
    const t2 = T.at(s(2)), t3 = T.at(s(3));
    const mt = holdAfter(holdAfter(t, t2 + .24, .4), t3 + .16 - .4, .4);
    // mood_v2: the 'false reassurance' beat is QUIETER, never frozen (v1c: calm=.08 + no boil/drift → 22–44-frame freezes).
    const smk = (a, b) => { const k = clamp((t - a) / (b - a)); return k * k * (3 - 2 * k); };
    const calm = 1 - .5 * smk(T.at(s(1)), T.at(s(1), .7)) * (1 - smk(t2 - .35, t2));
    // Pain tremor (body, not camera): restrained, irregular, intermittent; rises with the pain story.
    const nz = (f, ph) => (Math.sin(t * f * 1.00 + ph) + .62 * Math.sin(t * f * 1.37 + ph * 2.1) + .41 * Math.sin(t * f * 1.81 + ph * 3.3)) / 2.03;
    const gate = clamp((Math.sin(t * 1.27 + .4) + .7 * Math.sin(t * 2.93 + 1.1) + .45 * Math.sin(t * .61 + 2) + .55) / 1.6) ** 1.6;
    const pinT = clamp((t - T.frac(s(2), .62)) / (T.frac(s(2), .8) - T.frac(s(2), .62))), pinB = Math.max(0, Math.sin(pinT * Math.PI * 2));
    const env = .30 * smk(.4, T.frac(s(0), .55)) * (1 - smk(T.at(s(1)), T.at(s(1), .5))) + .16 * smk(T.at(s(1)), T.at(s(1), .5)) * (1 - smk(t2 - .2, t2))
      + (t >= t2 ? (.55 + .45 * Math.exp(-(t - t2) / 1.2)) * (1 - .7 * smk(t3, T.frac(s(3), .4))) : 0) + .55 * pinB;
    const E = env * (.3 + .7 * gate);
    const TR = { rot: .0048 * E * nz(41, .3), sy: 1 - .0042 * E * (.5 + .5 * nz(36, 1.7)), dx: 1.3 * E * nz(47, 2.9), hand: [2.6 * E * nz(52, 4.1), 1.8 * E * nz(44, 5.3)] };
    const tremor = (fn) => { ctx.save(); ctx.translate(960 + TR.dx, 830); ctx.rotate(TR.rot); ctx.scale(1, TR.sy); ctx.translate(-960, -830); fn(); ctx.restore(); };
    const see = 1 - .55 * win(t, T.frac(s(3), 0), T.frac(s(3), .35));   // figure goes translucent: anatomy shows through
    const pain = t >= t2;
    // navel ache (early): wash grows by mask, then fades when pain migrates
    const kn = win(t, T.frac(s(0), .15), T.frac(s(0), .8)) * (1 - .72 * win(t, T.at(s(1)), T.at(s(1), .4))) * (1 - win(t, t2, t2 + .18));
    const puls = 1 + .07 * calm * Math.sin(mt * 2 * Math.PI / 1.6), pa = .75 + .25 * calm * Math.sin(mt * 2 * Math.PI / 1.6);
    drawWash(ctx, 'c01.navel', ...FIG.navel, 150 * puls, { grow: kn, alpha: kn * pa });
    // McBurney bloom
    const kb = win(t, t2 + .16, t2 + .36), fast = win(t, T.frac(s(2), .28), T.frac(s(2), .5)), beat = Math.sin((mt-t2) * (3 + 5 * fast));
    drawWash(ctx, 'c01.bloom', FIG.mcb[0] + 6, FIG.mcb[1] + 6, 200 * (1 + (.025 + .055 * fast) * beat), { grow: kb, alpha: kb * (.88 + .12 * beat) * (1 - .5 * win(t, t3, T.frac(s(3), .4))) });
    // in-situ appendix wash appears under translucent skin
    const ka = win(t, T.frac(s(3), .15), T.frac(s(3), .6));
    drawWash(ctx, 'c01.app', 898, 795, 120 * (1 + .03 * Math.sin(t * 2.4)), { grow: ka, alpha: ka });
    scene(ctx, t, T);
    const breath = calm * Math.sin(mt * 2 * Math.PI / 3.6), sway = calm * (1.2 * Math.sin(mt * .45) + (pain ? .35 * Math.sin(mt * 7.1) : 0));
    const bt = [T.frac(s(0),.45),T.frac(s(1),.6),T.frac(s(2),.32),T.frac(s(2),.74)].some(b => t >= b && t < b + .13) ? 1 : 0;   // occasional blink
    const hatch = 1 - .75 * win(t, T.frac(s(3), 0), T.frac(s(3), .35));
    ctx.save(); ctx.globalAlpha = see;
    tremor(() => drawFigure(ctx, { face: pain ? 'pain' : 'mild', breath, sway, blink: bt, hatch }));
    ctx.restore();
    drawInsitu(ctx, { k: win(t, T.frac(s(3), .05), T.frac(s(3), .5)), alpha: 1 - see * .0 });
    // arm: rest (hand over navel area) → clutch RLQ at "搬了家"
    const kc = win(t, t2, t2 + .22);
    const press = Math.max(0, Math.sin(clamp((t - T.frac(s(2), .62)) / (T.frac(s(2), .8) - T.frac(s(2), .62))) * Math.PI * 2)) ;
    ctx.save(); ctx.globalAlpha = see; tremor(() => { drawArmR(ctx, { pose: 'rest', alpha: 1 - kc, rub: [sway + 6 * calm * Math.sin(mt * 1.9) + TR.hand[0], 3 * calm * Math.sin(mt * 3.8) + TR.hand[1]] }); drawArmR(ctx, { pose: 'clutch', alpha: kc, press, rub: [sway + TR.hand[0], TR.hand[1]] }); }); ctx.restore();
    // pain line: navel → McBurney (draw-on via dash reveal of a fixed-seed rough path)
    const kp = ease.outExpo(seg(t, t2, t2 + .22));
    draw(ctx, shape('c01.pain', 'curve', [painPts(48)], { stroke: C.red, strokeWidth: 5, roughness: .7, bowing: .5, seed: 40 }), { k: kp, alpha: 1 - .6 * win(t, t3, T.frac(s(3), .3)) });
    if (t >= t2 && t < t2 + .30) { const pts = painPts(100), q = pts[Math.min(100, Math.floor(kp * 100))]; A.dot(ctx, q, { r: 9, col: C.red }); }
    // ---- Manim layer ----
    const n = FIG.navel, a = FIG.asis, m = FIG.mcb, dx = a[0] - n[0], dy = a[1] - n[1], L = Math.hypot(dx, dy), u = [dx / L, dy / L], nn = [-u[1], u[0]];
    const out = 1 - win(t, t3, T.frac(s(3), .3));       // annotations clear before the anatomy reveal (one focus)
    const kr = win(t, T.frac(s(0), .4), T.frac(s(0), .7)) * (1 - win(t, t2, t2 + .18));
    A.ring(ctx, n, 44, { k: kr, col: C.red, w: 2, dash: [6, 7] });
    A.leader(ctx, [n[0] + 30, n[1] - 30], [1180, 560], [1330, 560], { k: kr }); A.label(ctx, '脐周', 1190, 540, { size: 28, k: kr });
    const kd = win(t, T.frac(s(2), .42), T.frac(s(2), .52)) * out;
    A.dot(ctx, n, { r: 4, k: kd }); A.dashed(ctx, n, a, { k: kd, w: 2 }); A.dot(ctx, a, { r: 5, k: win(t, T.frac(s(2), .5), T.frac(s(2), .53)) * out });
    const kt = win(t, T.frac(s(2), .53), T.frac(s(2), .57)) * out;
    [1 / 3, 2 / 3].forEach(f => A.tick(ctx, [n[0] + dx * f, n[1] + dy * f], u, { k: kt, len: 6 }));
    const o = 16; A.brace(ctx, [a[0] + nn[0] * o, a[1] + nn[1] * o], [m[0] + nn[0] * o, m[1] + nn[1] * o], { k: kt, depth: 4 });
    A.label(ctx, '外 1/3', (a[0] + m[0]) / 2 + nn[0] * 34, (a[1] + m[1]) / 2 + nn[1] * 34, { size: 22, align: 'center', k: kt, halo: true, track: .04 });
    const kl = win(t, T.frac(s(2), .5), T.frac(s(2), .56)) * out;
    A.leader(ctx, a, [a[0] - 60, a[1] - 4], [a[0] - 170, a[1] - 4], { k: kl, elbow: true, halo: true }); A.label(ctx, '右髂前上棘', a[0] - 170, a[1] - 22, { size: 24, k: kl, halo: true, track: .04 });
    const km = win(t, t2 + .22, t2 + .42) * out;
    A.ring(ctx, m, 9 + 4 * km, { k: km, col: C.red, w: 2.4 }); A.dot(ctx, m, { r: 4, col: C.red, k: km });
    // detail: lift the McBurney text block 40 px up-left, clear of the red wash.
    A.leader(ctx, [m[0] - 12, m[1] - 6], [760, 650], [680, 650], { k: km, col: C.red, elbow: true, halo: true }); A.label(ctx, '麦氏点', 680, 636, { size: 32, w: 700, col: C.red, k: km, halo: true, track: .04 }); A.label(ctx, 'McBurney point', 680, 660, { size: 18, col: C.red, k: km, alpha: .8, halo: true, track: .04, minSize: 20 });
    // "咳嗽、按压都像针扎": sharp burst ticks at McBurney on each press
    [.64, .73].forEach((f, j) => { const tp = T.frac(s(2), f), k = clamp((t - tp) / .45); if (k <= 0 || k >= 1) return;
      for (let i = 0; i < 9; i++) { const g = i / 9 * Math.PI * 2 + j * .3, r1 = 14 + 14 * k, r2 = r1 + 10 * (1 - k); A.line(ctx, [m[0] + Math.cos(g) * r1, m[1] + Math.sin(g) * r1], [m[0] + Math.cos(g) * r2, m[1] + Math.sin(g) * r2], { col: C.red, w: 2.4 }); } });
    // diagnosis tag beside the revealed appendix
    const kx = win(t, T.frac(s(3), .3), T.frac(s(3), .5));
    A.leader(ctx, [912, 818], [940, 800], [1000, 800], { k: kx, col: C.red, halo: true });
    // detail: move the ileum label 30 px outward and connect it to the existing bowel anchor.
    A.leader(ctx, INSITU.ileum[0], [1015, 694], [1130, 694], { k: kx, elbow: true, halo: true });
    A.label(ctx, '盲肠', 832, 740, { size: 28, align: 'right', k: kx, alpha: .9, halo: true }); A.label(ctx, '回肠末端', 1015, 676, { size: 28, k: kx, alpha: .9, halo: true });
  },
  screen(ctx, t, T) {
    const kT = fade(t, .3, 1.3, T.at(s(1)) - .9, T.at(s(1)) - .1);
    if (kT > 0) { ctx.save(); ctx.globalAlpha = kT;
      A.label(ctx, '疼会“搬家”的', 1500, 290, { size: 56, w: 700, align: 'center', k: kT });
      A.label(ctx, '7厘米盲管', 1500, 370, { size: 64, w: 700, align: 'center', col: C.red, k: win(t, .7, 1.7) });
      A.line(ctx, [1330, 418], [1670, 418], { k: win(t, 1.1, 2.0), col: C.red, w: 3 });
      A.label(ctx, '从急性阑尾炎，看懂身体的炎症保卫战', 1500, 456, { size: 24, align: 'center', alpha: .7, k: win(t, 1.4, 2.3) });
      ctx.restore(); }
    const kd = fade(t, T.at(s(3)), T.at(s(3), .16), T.end(s(3), -.15), T.end(s(3), .1));
    if (kd > 0) { const slam = 1 + .07 * pulse(t, T.at(s(3)), .055); ctx.save(); ctx.translate(1430, 390); ctx.scale(slam, slam);
      A.label(ctx, '急性阑尾炎', 0, 0, { size: 58, w: 800, col: C.red, align: 'center', k: kd });
      A.line(ctx, [-180, 48], [180, 48], { col: C.red, w: 3, k: kd }); ctx.restore(); }
    // clock: 午饭后 → 半夜 (Manim-style counter + dial)
    const kc = fade(t, T.frac(s(1), .2), T.frac(s(1), .45), T.frac(s(2), .3), T.frac(s(2), .42));
    if (kc > 0) { const hr = 13 + 12.5 * win(t, T.frac(s(1), .5), T.frac(s(2), .1)); const c = [1680, 190];
      ctx.save(); ctx.globalAlpha = kc; A.ring(ctx, c, 54, { w: 2.4 }); for (let i = 0; i < 12; i++) { const g = i / 12 * Math.PI * 2; A.line(ctx, [c[0] + Math.cos(g) * 46, c[1] + Math.sin(g) * 46], [c[0] + Math.cos(g) * 52, c[1] + Math.sin(g) * 52], { w: 1.4 }); }
      const gm = (hr % 1) * Math.PI * 2 - Math.PI / 2, gh = (hr % 12) / 12 * Math.PI * 2 - Math.PI / 2;
      A.line(ctx, c, [c[0] + Math.cos(gh) * 28, c[1] + Math.sin(gh) * 28], { w: 4 }); A.line(ctx, c, [c[0] + Math.cos(gm) * 42, c[1] + Math.sin(gm) * 42], { w: 2, col: C.red });
      const h24 = Math.floor(hr) % 24, mm = Math.floor((hr % 1) * 60); A.label(ctx, `${String(h24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, c[0], c[1] + 88, { size: 30, w: 700, align: 'center' });
      A.label(ctx, hr < 20 ? '午饭后' : '后半夜', c[0], c[1] + 124, { size: 20, align: 'center', alpha: .7 }); ctx.restore(); }
    // thermometer: 体温也飙了上去
    const kth = fade(t, T.frac(s(2), .66), T.frac(s(2), .72), T.frac(s(3), .35), T.frac(s(3), .5));
    if (kth > 0) { const v = 36.8 + 2.5 * ease.inQuad(seg(t, T.frac(s(2), .65), T.frac(s(2), .96))); /* case value 39.3 ℃ */ const x = 1700, y0 = 640, y1 = 380, lv = y0 - (y0 - y1) * (v - 35) / 6;
      ctx.save(); ctx.globalAlpha = kth; A.line(ctx, [x, y0], [x, y1], { w: 2 }); for (let d = 35; d <= 41; d++) { const yy = y0 - (y0 - y1) * (d - 35) / 6; A.line(ctx, [x - 8, yy], [x, yy], { w: 1.4 }); if (d % 2) A.label(ctx, String(d), x - 14, yy, { size: 16, align: 'right', alpha: .6 }); }
      A.line(ctx, [x + 6, y0], [x + 6, lv], { w: 8, col: C.red }); A.dot(ctx, [x + 6, y0 + 10], { r: 13, col: C.red });
      A.counter(ctx, v, x + 30, lv, { unit: ' ℃', size: 34, col: C.red }); ctx.restore(); }
  },
  title(ctx, t, T) { titleBlock(ctx, t, T.at(s(2)), '01 · 疼会“搬家”', '转移性右下腹痛', T.end(s(2)) - T.at(s(2)) - 1); },
};
