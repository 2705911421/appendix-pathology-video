// 03 镜下病理 — sentences 7–9. Entry = 02 exit (cross-section disc, EXIT_CAM2). Signature: pain line dives into the wall → eyepiece opens.
// Exit = LENS_EXIT with full HE state (04 continues on the same wall, in place).
import { C } from '../lib/tokens.js';
import * as A from '../lib/ann.js';
import { toScreen } from '../lib/camera.js';
import { drawLens, fieldToScreen, bakeHE, BANDS, ULCER, CELLS, drawNeutrophil } from '../lib/he.js';
import { win, fade, clamp, titleBlock } from '../lib/chapter.js';
import c02, { XS, XS_WALL, EXIT_CAM2 } from './02.js';
import { ease, seg, pulse } from '../lib/motion.js';
import { holdAfter } from '../lib/mood.js';
import { drawSurround, drawPointer, offFor, POINTER } from '../lib/scope.js';
const I0 = 7, s = i => I0 + i;
export const LENS_EXIT = { x: 640, y: 480, r: 340 };
export const HE_EXIT = { ulcer: 1, neut: 1, fibrin: 1 };
const lerp = (a, b, k) => a + (b - a) * k;
const sm = (t, a, b) => { const k = clamp((t - a) / (b - a)); return k * k * (3 - 2 * k); };
export function lensAt(t, T) {
  const ko = sm(t, T.at(s(0), .08), T.frac(s(0), .80)), km = sm(t, T.frac(s(1), .82), T.end(s(1)));
  return { x: lerp(960, LENS_EXIT.x, km), y: lerp(500, LENS_EXIT.y, km), r: lerp(380 * ko, LENS_EXIT.r, km) };
}
export function heAt(t, T) {
  const u=seg(t,T.at(s(1)),T.frac(s(1),.96)), d=Math.max(0,t-T.at(s(1)));
  const mt=holdAfter(t,T.at(s(2))+.58,.45);
  return {ulcer:win(t,T.frac(s(1),.03),T.frac(s(1),.18)),neut:.13*u+.87*u*u,
    fibrin:win(t,T.frac(s(1),.70),T.frac(s(1),.94)),t:mt+.055*Math.min(d,12)**2};
}
// mood_v2 stage tour: the eyepiece pointer is FIXED; the stage (off) + magnification (fs) move so each structure the VO
// names lands under the pointer tip: ulcer (mucosal defect) → transmural infiltrate (muscularis) → serosal fibrin.
// Offsets are kept inside the drawn field (|off| ≤ 430 − 420/fs) so no blank edge enters the field of view.
const ULC = (ULCER[0] + ULCER[1]) / 2;
const stop = (fs, g) => ({ fs, off: g ? offFor({ r: 1 }, g, fs) : [0, 0] });
const fieldAt = (t,T) => {
  const ko=sm(t,T.at(s(0),.08),T.frac(s(0),.88)), F=(i,k)=>T.frac(s(i),k);
  if (t < F(1,.05)) return { fs: (.5+.5*ko)*1.0, blur: 9*(1-ko), off: [0,0] };
  const keys = [[F(1,.05), stop(1.0)], [F(1,.15), stop(1.9, [ULC, -205])], [F(1,.44), stop(1.9, [ULC, -205])],
    [F(1,.54), stop(1.3, [60, 90])], [F(1,.68), stop(1.3, [60, 90])], [F(1,.77), stop(2.3, [150, 285])], [F(1,.88), stop(2.3, [150, 285])],
    [F(2,.04), stop(1.05)]];
  let a = keys[0], b = keys[keys.length - 1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { a = keys[i - 1]; b = keys[i]; break; } else a = b = keys[i];
  const k = a === b ? 1 : sm(t, a[0], b[0]);
  // interpolate magnification in log space so the zoom speed feels even
  return { fs: Math.exp(lerp(Math.log(a[1].fs), Math.log(b[1].fs), k)), blur: 0, off: [lerp(a[1].off[0], b[1].off[0], k), lerp(a[1].off[1], b[1].off[1], k)] };
};
export default {
  id: '03', drift: false,
  bake(bake) { bakeHE(bake); },
  // the camera DIVES into the wall point (log-zoom 3.6 → 40) while the eyepiece opens: real optical zoom, no cut
  // longer, gentler dive: brief hold on the disc, ease toward the wall, then log-zoom through it (no velocity spike near 44.3s)
  camera: T => [
    [T.at(s(0)), EXIT_CAM2],
    [T.frac(s(0), .22), { x: EXIT_CAM2.x + (XS_WALL[0] - EXIT_CAM2.x) * .12, y: EXIT_CAM2.y + (XS_WALL[1] - EXIT_CAM2.y) * .12, zoom: 3.85 }],
    [T.frac(s(0), .50), { x: XS_WALL[0], y: XS_WALL[1], zoom: 6.0 }],
    [T.frac(s(0), .90), { x: XS_WALL[0], y: XS_WALL[1], zoom: 40 }],
  ],
  world(ctx, t, T, cam) {
    // frozen 02 end state; it dissolves into paper as the camera passes through the wall (canvas blur on huge-scaled washes is
    // unreliable in software GL, so defocus is simulated by fading the world and blurring only the eyepiece image)
    const fa = 1 - sm(t, T.frac(s(0), .40), T.frac(s(0), .68));
    if (fa > 0) { ctx.save(); ctx.globalAlpha = fa; c02.world(ctx, T.end(s(-1)) - 1e-3, T, cam); ctx.restore(); }
    const kd = win(t, T.at(s(0)), T.frac(s(0), .48)), p0 = [XS.x - 150, XS.y - 120];
    if (kd > 0 && kd < 1) { const e = [lerp(p0[0], XS_WALL[0], kd), lerp(p0[1], XS_WALL[1], kd)]; A.line(ctx, [lerp(p0[0], XS_WALL[0], Math.max(0, kd - .35)), lerp(p0[1], XS_WALL[1], Math.max(0, kd - .35))], e, { w: 4, col: C.red }); A.dot(ctx, e, { r: 5 + 3 * kd, col: C.red }); }
    if (kd >= 1) A.dot(ctx, XS_WALL, { r: 6, col: C.red, k: 1 - sm(t, T.frac(s(0), .48), T.frac(s(0), .64)) });
  },
  screen(ctx, t, T, cam) {
    const L = lensAt(t, T), st = heAt(t, T), F = fieldAt(t, T);
    // mood_v2: no paper veil. Looking INTO the eyepiece: an iris-like near-black surround closes from the frame edge
    // onto the field stop while the field opens (motivated by the lens, not a global mood filter).
    const dim = sm(t, T.at(s(0), .08), T.frac(s(0), .80));
    drawSurround(ctx, L, Math.min(1, dim * 2.2), lerp(1180, L.r + 8, sm(dim, 0, 1)));
    if (L.r <= 1) return;
    drawLens(ctx, L, st, F.fs, { off: F.off, blur: F.blur });
    const kp = sm(t, T.frac(s(0), .82), T.frac(s(0), .94)); drawPointer(ctx, L, kp);
    const kpl = sm(t, T.frac(s(0), .86), T.frac(s(0), .96)) * (1 - sm(t, T.frac(s(1), .04), T.frac(s(1), .1)));
    if (kpl > 0) { const a = POINTER.ang, bx = L.x + Math.cos(a) * (L.r + 26), by = L.y + Math.sin(a) * (L.r + 26); A.label(ctx, '目镜指针（固定）', bx, by - 4, { size: 22, alpha: .8 * kpl }); }
    // Focus catch is one soft paper glint; HE-purple impact stays on the microscope rim, NOT tissue.
    const flash = pulse(t, T.frac(s(0), .80), .035);
    if (flash > .01) { ctx.save(); ctx.globalAlpha *= .23 * flash; ctx.fillStyle = C.paper; ctx.beginPath(); ctx.arc(L.x,L.y,L.r,0,Math.PI*2); ctx.fill(); ctx.restore(); }
    const vf = window.__mood.tint.heFlash;
    if (vf > 0) { ctx.save(); ctx.globalAlpha *= vf*.7; ctx.strokeStyle=C.vio; ctx.lineWidth=9; ctx.beginPath();ctx.arc(L.x,L.y,L.r+9,0,Math.PI*2);ctx.stroke();ctx.restore(); }
    const fts = p => fieldToScreen(L, p, F.fs, F.off), inLens = y => y > L.y - L.r * .9 && y < L.y + L.r * .9;
    const kv = 1 - win(t, T.frac(s(2), 0), T.frac(s(2), .15));
    const kb = win(t, T.frac(s(0), .72), T.frac(s(0), .92)), xl = L.x - L.r - 26;
    [['管腔（脓液）', BANDS.lumen], ['黏膜', BANDS.mucosa], ['黏膜下层', BANDS.submucosa], ['肌层', BANDS.muscularis], ['浆膜', BANDS.serosa]].forEach(([n, b], i) => {
      const y = fts([0, (b[0] + b[1]) / 2])[1]; if (!inLens(y)) return;
      A.label(ctx, n, xl, y, { size: 24, align: 'right', k: win(t, T.frac(s(0), .72 + i * .04), T.frac(s(0), .88 + i * .02)), alpha: .75 }); });
    A.label(ctx, 'HE 染色 · 阑尾壁', L.x, L.y - L.r - 34, { size: 22, align: 'center', k: kb * kv, alpha: .7 });
    const ku = win(t, T.frac(s(1), .06), T.frac(s(1), .14)) * kv * (1 - sm(t, T.frac(s(1), .68), T.frac(s(1), .74))), up = fts([(ULCER[0] + ULCER[1]) / 2, -280]);
    A.leader(ctx, up, [L.x + L.r * .55, L.y - L.r * .92], [L.x + L.r + 40, L.y - L.r * .92], { k: ku, col: C.red }); A.label(ctx, '黏膜破溃缺损', L.x + L.r + 50, L.y - L.r * .92, { size: 30, w: 700, col: C.red, k: ku });
    // neutrophil inset: a mix of 2–5 lobed nuclei
    const ki = fade(t, T.frac(s(1), .2), T.frac(s(1), .28), T.frac(s(2), 0), T.frac(s(2), .12));
    if (ki > 0) { const c = { x: 1640, y: 236, r: 96 }; ctx.save(); ctx.globalAlpha = ki; ctx.fillStyle = '#F6EEF0'; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 6.283); ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = C.ink; ctx.stroke();
      ctx.save(); ctx.clip(); [[-42, -30, 2, -.3], [36, -34, 3, -1.9], [-30, 40, 4, -1.5], [44, 38, 5, -1.6]].forEach(([dx, dy, n, r]) => drawNeutrophil(ctx, c.x + dx, c.y + dy, { lobes: n, rot: r }, 3.6)); ctx.restore(); ctx.restore();
      A.label(ctx, '中性粒细胞', c.x, c.y + c.r + 30, { size: 30, w: 700, col: C.red, align: 'center', k: ki }); A.label(ctx, '核分 2–5 叶', c.x, c.y + c.r + 66, { size: 24, align: 'center', k: ki, alpha: .85 }); }
    // full-thickness brace
    const kf = win(t, T.frac(s(1), .52), T.frac(s(1), .62)) * kv, a = fts([0, BANDS.mucosa[0]]), b = fts([0, BANDS.serosa[1]]), xr = L.x + L.r + 22;
    const ya = Math.max(a[1], L.y - L.r * .8), yb = Math.min(b[1], L.y + L.r * .8);
    A.brace(ctx, [xr, ya], [xr, yb], { k: kf, depth: -14 }); A.label(ctx, '大量 · 弥漫浸润全层', xr + 34, Math.max((ya + yb) / 2, 470), { size: 28, w: 700, k: kf });   // stays clear of the neutrophil inset
    // fibrin on the serosal surface (field pans to reveal it); label fully inside frame, right of lens
    const kfi = win(t, T.frac(s(1), .78), T.frac(s(1), .86)) * kv, fp = fts([150, 320]), fy = Math.min(L.y + L.r * .72, 820);
    A.leader(ctx, fp, [L.x + L.r * .85, fy], [xr + 34, fy], { k: kfi }); A.label(ctx, '浆膜面纤维素渗出', xr + 40, fy - 22, { size: 28, w: 700, k: kfi });
    const vx=1060, vd=T.at(s(2)), name='急性蜂窝织炎性阑尾炎';
    const kt=seg(t,vd,vd+.58), k1=win(t,vd,vd+.10), k3=win(t,T.frac(s(2),.55),T.frac(s(2),.68)), k4=win(t,T.frac(s(2),.82),T.end(s(2)));
    A.label(ctx,'病理诊断',vx,330,{size:26,k:k1,alpha:.65}); A.line(ctx,[vx,356],[vx+640,356],{k:k1,w:1.6});
    const typed=t<vd?'':name.slice(0,Math.max(1,Math.floor(kt*name.length)));
    if(typed){const slam=1+.028*pulse(t,vd+.58,.05);ctx.save();ctx.translate(vx,420);ctx.scale(slam,slam);A.label(ctx,typed,0,0,{size:62,w:800,k:1});ctx.restore();}
    A.label(ctx,'＝ 化脓性炎',vx,510,{size:52,w:800,col:C.red,k:k3});
    A.brace(ctx,[vx,566],[vx+600,566],{k:k4,depth:12});A.label(ctx,'中性粒细胞弥漫浸润全层',vx+300,612,{size:26,align:'center',k:k4});

  },
  title(ctx, t, T) { titleBlock(ctx, t, T.frac(s(0), .6), '03 · 镜下病理', '案发现场', 4); },
};
