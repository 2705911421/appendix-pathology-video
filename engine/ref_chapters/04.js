import { prepareGangrene, gangrene } from '../lib/he_detail.js';
// 04 三型演变 — sentences 10–13. Entry = 03 exit (LENS_EXIT, HE_EXIT, verdict on the right → wiped).
// Same patch of wall evolves IN PLACE: rewind → 单纯性 (黏膜+黏膜下层) → 蜂窝织炎性 (全层弥漫) → 坏疽性 (缺血坏死发黑 → 穿孔).
// A Manim-style vertical "stage track" on the right carries a marker through the three named types (one focus at a time).
import { C } from '../lib/tokens.js';
import * as A from '../lib/ann.js';
import { drawWash } from '../lib/wash.js';
import { drawLens, fieldToScreen as FTS, BANDS, VESSELS } from '../lib/he.js';
import { win, fade, titleBlock } from '../lib/chapter.js';
import { tween, ease, seg, clamp } from '../lib/motion.js';
import { moodAt, burstShake, holdAfter } from '../lib/mood.js';
import { drawSurround, drawPointer, offFor } from '../lib/scope.js';
import { LENS_EXIT, HE_EXIT } from './03.js';
prepareGangrene(VESSELS);
const I0 = 10, s = i => I0 + i;
const L = LENS_EXIT, lerp = (a, b, k) => a + (b - a) * k;
const PERF = [190, 0];                                   // perforation x in field coords (away from the 03 ulcer)
export const EXIT_04 = { lens: L, he: { ulcer: 1, neut: 1, fibrin: 1 }, necro: 1, perf: 1 };
// HE state as a function of t: 03 end → rewind to early (few cells, intact mucosa) → full → (gangrene overlay handles the rest)
export function heAt(t, T) {
  const rw = win(t, T.frac(s(0), .25), T.frac(s(0), .8));           // rewind
  const up = win(t, T.frac(s(2), .05), T.frac(s(2), .9));            // escalate to full wall
  const detail = ease.inOutCubic(seg(t, T.at(s(0)), T.frac(s(0), .8)));
  const early = { ulcer: .08, neut: .2, fibrin: 0 };
  const m = k => ({ ulcer: lerp(early.ulcer, 1, k), neut: lerp(early.neut, 1, k), fibrin: lerp(early.fibrin, 1, k) });
  const acc = win(t, T.at(s(1)), T.end(s(1)));                       // slow accumulation while still confined to mucosa/submucosa
  const e2 = { ulcer: lerp(early.ulcer, .16, acc), neut: lerp(early.neut, .36, acc), fibrin: 0 };
  if (up > 0) return { ulcer: lerp(e2.ulcer, 1, up), neut: lerp(e2.neut, 1, up), fibrin: lerp(0, 1, up), detail, t };
  if (acc > 0) return { ...e2, detail, t };
  return { ulcer: lerp(HE_EXIT.ulcer, early.ulcer, rw), neut: lerp(HE_EXIT.neut, early.neut, rw), fibrin: lerp(HE_EXIT.fibrin, early.fibrin, rw), detail, t };
}
// Deliberate tempo changes in SCREEN space (the lens is not drawn through the world camera).
// Every beat follows the measured sentence axis; repeated keys are intentional rests.
const peakAt = T => T.frac(s(3), .78);
const heldClock = (t, T) => Math.min(holdAfter(t, peakAt(T), .45), T.end(s(3), -.55));
// mood_v2: after the peak settles, a very slow continuous push so the 0.8 s VO gap into 05 is not a frozen frame
export const creep04 = (t, T) => 1 + .006 * Math.max(0, t - T.end(s(3), -.55));
export function fsAt(t, T) { return tween(t, [
  [T.at(s(0)), 1.06], [T.end(s(0)), 1.065],
  [T.at(s(1)), 1.065], [T.end(s(1)), 1.085, ease.inOutSine],
  [T.at(s(2)), 1.085], [T.frac(s(2), .62), 1.15, ease.outCubic], [T.end(s(2)), 1.15],
  [T.at(s(3)), 1.15], [T.frac(s(3), .55), 1.24, ease.inQuad],
  [peakAt(T), 1.48, ease.inQuad], [peakAt(T) + .45, 1.48],
  [T.end(s(3), -.55), 1.45, ease.outCubic], [T.end(s(3)), 1.45],
]); }
// mood_v2: stage moves so the fixed eyepiece pointer lands in the perforation channel at the peak (no move before .55).
export function offAt(t, T) { return tween(t, [[T.at(s(0)), [0, 0]], [T.frac(s(3), .55), [0, 0]], [peakAt(T), offFor({ r: 1 }, [180, 60], 1.48), ease.inOutSine], [T.end(s(3)), offFor({ r: 1 }, [180, 60], 1.48)]]); }
export function lensAt(t, T) { const [dx, dy] = tween(t, [
  [T.at(s(0)), [0, 0]], [T.end(s(1)), [3, -2], ease.inOutSine],
  [T.frac(s(2), .62), [6, -4], ease.outCubic], [T.end(s(2)), [6, -4]],
  [T.frac(s(3), .55), [10, -6], ease.inQuad], [peakAt(T), [14, -8], ease.inQuad],
  [peakAt(T) + .45, [14, -8]], [T.end(s(3), -.55), [0, 0], ease.outCubic], [T.end(s(3)), [0, 0]],
]); return { x: L.x + dx, y: L.y + dy, r: L.r }; }
export function gangAt(t, T) { return {
  kv: win(t, T.frac(s(3), .02), T.frac(s(3), .2)),
  kn: win(t, T.frac(s(3), .18), T.frac(s(3), .6)),
  kp: clamp((t - T.frac(s(3), .55)) / (peakAt(T) - T.frac(s(3), .55))) ** 1.7,
  ko: win(t, T.frac(s(3), .72), peakAt(T)),
}; }
export function drawLens04(ctx, Lx, st, fs, g, off = [0, 0]) {
  drawLens(ctx, Lx, { ...st, necrosis: g.kn * (st.detail || 0) }, fs, { off }); const { kv, kn, kp, ko } = g;
  if (kv > 0) { ctx.save(); ctx.beginPath(); ctx.arc(Lx.x, Lx.y, Lx.r, 0, 6.283); ctx.clip(); ctx.translate(Lx.x, Lx.y); const z = Lx.r / 420 * fs; ctx.scale(z, z); ctx.translate(-off[0], -off[1]);
    for (const v of VESSELS) drawWash(ctx, 'c04.thromb', v[0], v[1], v[2] * 3.4, { alpha: kv * .9, grow: kv });
    gangrene(ctx, g);
    if(ko > 0) drawWash(ctx, 'c04.leak', PERF[0], BANDS.serosa[1] + 43, 145, { grow: ko, alpha: ko * .32, blend: 'source-over', origin: [.5, .2] });
    ctx.restore(); } }
// 05 calls this with its own (shrinking) lens; everything else is 04's exact last frame
export function drawExit04(ctx, T, Lx, t) { const te = T.end(s(3)) - 1e-3; drawLens04(ctx, Lx, { ...heAt(te, T), t: heldClock(te, T) }, fsAt(te, T), gangAt(te, T), offAt(te, T)); }
export const DIM = .985;   // 03 leaves the world layer dimmed by a paper veil; 04 keeps it, 05 lifts it
export default {
  id: '04',
  shake: (t, T) => burstShake(t, T.frac(s(3), .76), { frames: 6, amp: 3.6, seed: 404 }),
  drift: false, boil: false, // quiet really means quiet; no perpetual global drift/ink boil
  bake(bake) {
    for (let i = 0; i < 4; i++) {
      const wash = bake(`c04.necro.${i}`, (b, P) => {
        P.fill(b, P.blob(0, 0, 290 + i * 13, 36, .38, 460 + i), i % 2 ? C.ink : '#3A1F2A', 105 + i * 22, .42, [.65, .55]);
        P.fill(b, P.blob(45, -25, 195, 32, .45, 470 + i), '#3A1F2A', 65 + i * 12, .5);
      }, { seed: 460 + i, hd: true, soft: true, grain: .12, edge: .3, bleed: .5 });
      // Soften pigment boundaries once in the cached watercolour bitmap.
      const soft = document.createElement('canvas'); soft.width = wash.width; soft.height = wash.height;
      const sc = soft.getContext('2d'); sc.filter = 'blur(15px)'; sc.drawImage(wash, 0, 0);
      const wc = wash.getContext('2d'); wc.clearRect(0, 0, wash.width, wash.height);
      wc.drawImage(soft, 0, 0);
    }
    bake('c04.thromb', (b, P) => { P.fill(b, P.blob(0, 0, 300, 22, .2, 43), '#3A1F2A', 200, .15); }, { seed: 43, hd: true, soft: true, grain: .12, edge: .3, bleed: .5 });
    bake('c04.leak', (b, P) => { P.fill(b, P.blob(0, 0, 330, 26, .5, 44), C.pus, 170, .3, [.6, .5]); }, { seed: 44, hd: true, soft: true, grain: .12, edge: .3, bleed: .5 });
    bake('c04.mark', (b, P) => { P.fill(b, P.blob(0, 0, 360, 26, .3, 45), C.red, 110, .3); }, { seed: 45, hd: true, soft: true, grain: .12, edge: .3, bleed: .5 });
  },
  camera: T => [[T.at(s(0)), { x: 960, y: 540, zoom: 1 }], [T.end(s(3)), { x: 960, y: 520, zoom: 1 }]],
  screen(ctx, t, T, cam, mood = moodAt(t, T)) {
    // The global atmosphere stays behind pathology. This existing veil reads the SAME paper colour.
    // mood_v2: still at the eyepiece → near-black surround (replaces the paper veil).
    const Lx0 = lensAt(t, T); drawSurround(ctx, Lx0, mood.scope ?? 1);
    const sceneT = heldClock(t, T);
    const st = { ...heAt(t, T), t: sceneT }, fs = fsAt(t, T) * creep04(t, T);
    const Lx = Lx0, off = offAt(t, T); drawLens04(ctx, Lx, st, fs, gangAt(t, T), off); drawPointer(ctx, Lx, 1);
    const L = Lx, fieldToScreen = (L, p, fs) => FTS(L, p, fs, off);
    // perforation accent lives on the LENS RIM (local object), not on the paper
    const fr = mood.tint.flashRed; if (fr > 0) { ctx.save(); ctx.globalAlpha *= .85 * fr; ctx.strokeStyle = C.red; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(L.x, L.y, L.r + 8, 0, 6.283); ctx.stroke(); ctx.restore(); }
    // ---- wipe 03's verdict text (it is still on screen at entry) ----
    const kw = 1 - win(t, T.at(s(0)), T.at(s(0), .6));
    if (kw > 0) { ctx.save(); ctx.globalAlpha = kw; A.label(ctx, '病理诊断', 1060, 330, { size: 26, alpha: .65 }); A.line(ctx, [1060, 356], [1700, 356], { w: 1.6 });
      A.label(ctx, '急性蜂窝织炎性阑尾炎', 1060, 420, { size: 62, w: 800 }); A.label(ctx, '＝ 化脓性炎', 1060, 510, { size: 52, w: 800, col: C.red });
      A.brace(ctx, [1060, 566], [1660, 566], { depth: 12 }); A.label(ctx, '中性粒细胞弥漫浸润全层', 1360, 612, { size: 26, align: 'center' }); ctx.restore(); }
    // ---- band names (left), as in 03 ----
    const xl = L.x - L.r - 26, kbn = fade(t, T.at(s(0)), T.frac(s(0), .2), T.frac(s(3), .2), T.frac(s(3), .35));
    [['黏膜', BANDS.mucosa], ['黏膜下层', BANDS.submucosa], ['肌层', BANDS.muscularis], ['浆膜', BANDS.serosa]].forEach(([n, b]) => { const y = fieldToScreen(L, [0, (b[0] + b[1]) / 2], fs)[1];
      if (y > L.y - L.r * .9 && y < L.y + L.r * .9) A.label(ctx, n, xl, y, { size: 24, align: 'right', alpha: .75 * kbn }); });
    // ---- rewind cue ----
    const kr = fade(t, T.frac(s(0), .2), T.frac(s(0), .35), T.frac(s(0), .8), T.end(s(0)));
    A.label(ctx, '时间倒回：发病早期', L.x, L.y - L.r - 34, { size: 26, w: 700, align: 'center', col: C.red, k: kr });
    // ---- stage track (right): three stations, marker travels ----
    const kend = 1 - win(t, T.end(s(3), -.7), T.end(s(3), -.05)); ctx.save(); ctx.globalAlpha = kend;
    const tx = 1120, ys = [300, 480, 660], names = ['单纯性', '蜂窝织炎性', '坏疽性'], subs = ['黏膜及黏膜下层', '全层 · 中性粒细胞弥漫浸润', '缺血坏死 · 发黑 · 穿孔'];
    const kt = win(t, T.frac(s(0), .45), T.end(s(0)));
    A.line(ctx, [tx, ys[0]], [tx, ys[2]], { k: kt, w: 2 }); ys.forEach((y, i) => A.tick(ctx, [tx, y], [0, 1], { k: kt, len: 10 }));
    A.label(ctx, '急性阑尾炎 · 三型（同一段管壁）', tx - 10, ys[0] - 70, { size: 22, alpha: .65, k: kt });
    const arrive = [win(t, T.at(s(1)), T.frac(s(1), .15)), win(t, T.at(s(2)), T.frac(s(2), .15)), win(t, T.at(s(3)), T.frac(s(3), .15))];
    const pos = arrive[2] > 0 ? lerp(ys[1], ys[2], arrive[2]) : arrive[1] > 0 ? lerp(ys[0], ys[1], arrive[1]) : ys[0];
    if (arrive[0] > 0) { A.dot(ctx, [tx, pos], { r: 11, col: C.red, k: arrive[0] }); A.ring(ctx, [tx, pos], 18 + 4 * Math.sin(sceneT * 3.1), { col: C.red, k: arrive[0], w: 2 }); }
    names.forEach((n, i) => { const k = arrive[i], cur = i === 2 ? 1 : 1 - arrive[i + 1] * .55;
      A.label(ctx, n, tx + 40, ys[i] - 14, { size: 40, w: 800, col: i === 2 ? C.ink : C.red, k, alpha: cur });
      A.label(ctx, subs[i], tx + 42, ys[i] + 30, { size: 24, k: win(t, T.frac(s(1 + i), .15), T.frac(s(1 + i), .3)), alpha: .8 * cur }); });
    ctx.restore();
    // ---- in-lens annotations, one at a time ----
    const top = fieldToScreen(L, [0, BANDS.mucosa[0]], fs), msb = fieldToScreen(L, [0, BANDS.submucosa[1]], fs), ser = fieldToScreen(L, [0, BANDS.serosa[1]], fs), bx = L.x + L.r + 22;
    const k1 = fade(t, T.frac(s(1), .2), T.frac(s(1), .35), T.frac(s(2), .05), T.frac(s(2), .15));
    A.brace(ctx, [bx, top[1]], [bx, msb[1]], { k: k1, depth: -14, col: C.red });
    const k2 = fade(t, T.frac(s(2), .35), T.frac(s(2), .5), T.frac(s(3), .02), T.frac(s(3), .12));
    A.brace(ctx, [bx, Math.max(top[1], L.y - L.r * .85)], [bx, Math.min(ser[1], L.y + L.r * .85)], { k: k2, depth: -14, col: C.red });
    // gangrene leaders (inside → left side so the track stays clean)
    const kl1 = fade(t, T.frac(s(3), .35), T.frac(s(3), .45), T.end(s(3), -.6), T.end(s(3), -.1)), np = fieldToScreen(L, [-160, 40], fs);
    A.label(ctx, '血管受压闭塞 → 缺血坏死、发黑', L.x, L.y - L.r - 34, { size: 26, w: 700, align: 'center', k: kl1 });
    const kl2 = fade(t, T.frac(s(3), .7), peakAt(T), T.end(s(3), -.6), T.end(s(3), -.1)), pp = fieldToScreen(L, [PERF[0], BANDS.serosa[0]], fs);
    A.ring(ctx, pp, 52, { k: kl2, col: C.red, w: 3 }); A.label(ctx, '穿孔 → 可致弥漫性腹膜炎', pp[0] + 58, pp[1] + 6, { size: 28, w: 800, col: C.red, k: kl2 });
  },
  title(ctx, t, T) { titleBlock(ctx, t, T.frac(s(0), .1), '04 · 三型演变', '战火升级', 4); },
};
