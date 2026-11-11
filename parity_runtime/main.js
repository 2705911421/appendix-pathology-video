// Entry: render(t) contract for garden-skills/motion-showreel (window.DUR, window.render, window.READY).
import { C, W, H, FONT } from './lib/tokens.js';
import { loadTimeline } from './lib/timeline.js';
import { initBaker, bake } from './lib/wash.js';
import { grid, setBoil, BOIL_FPS } from './lib/ink.js';
import { camAt, apply, view } from './lib/camera.js';
import * as SUB from './lib/subtitle.js';
import { label } from './lib/ann.js';
import CHAPTERS from './chapters/index.js';
import { moodAt } from './lib/mood.js';
import { scopeAt } from './lib/scope.js';
import { setDark } from './lib/ann.js';

const q = new URLSearchParams(location.search);
const cv = document.getElementById('c'); cv.width = W; cv.height = H; cv.style.width = W + 'px'; cv.style.height = H + 'px';
const ctx = cv.getContext('2d');
const END_CARD = 12;
const T = await loadTimeline();
window.TIMELINE = T;
window.DUR = T.DUR_CONTENT + END_CARD;
await document.fonts.load(`500 44px ${FONT}`); await document.fonts.load(`700 60px ${FONT}`);
await initBaker();
for (const ch of Object.values(CHAPTERS)) if (ch.bake) ch.bake(bake, T);   // fixed-seed washes, baked once
const chapterAt = t => { const ids = Object.keys(T.CH).sort(); let id = ids[0]; for (const k of ids) if (t >= T.CH[k].start) id = k; if (t >= T.DUR_CONTENT) id = '07'; return id; };
window.render = t => {
  const id = q.get('ch') && false ? q.get('ch') : chapterAt(t), ch = CHAPTERS[id];
  const mood = moodAt(t, T); mood.scope = scopeAt(t, T); window.__mood = mood; setDark(mood.scope);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = mood.paper; ctx.fillRect(0, 0, W, H);
  // mood_v2d: a chapter may force the boil on (boilAlways(t,T)) regardless of the shared speed hint (07 had it < .15 → frozen lines)
  const boilOn = ch && ch.boil !== false && ((ch.boilAlways && ch.boilAlways(t, T)) || mood.speedHint >= .15);
  setBoil(boilOn ? Math.floor(mood.ambientTime * BOIL_FPS + 1e-6) : null);
  let cam = ch && ch.camera ? camAt(ch.camera(T), t) : { x: W / 2, y: H / 2, zoom: 1 };
  // global slow drift (≈3–4 screen px) so no frame is ever fully static; chapter may opt out with drift:false
  // mood_v2: drift is continuous (no on/off gating → no frozen runs / abrupt restarts); chapters may still opt out.
  if (!ch || ch.drift !== false) cam = { ...cam, x: cam.x + 3.2 * Math.sin(t * .29) / cam.zoom, y: cam.y + 2.4 * Math.sin(t * .23 + 1) / cam.zoom };
  window.__cam = cam;
  // Outer SCREEN translation moves world, labels and subtitles together (never scales shake with zoom).
  const localShake = ch && ch.shake ? ch.shake(t, T) : { dx: 0, dy: 0 };
  ctx.save(); ctx.translate(mood.shake.dx + (localShake.dx || 0), mood.shake.dy + (localShake.dy || 0));
  ctx.save(); apply(ctx, cam); const v = view(cam);
  ctx.save(); ctx.globalAlpha *= mood.gridAlpha; grid(ctx, v[0] - 40, v[1] - 40, v[2] + 40, v[3] + 40); ctx.restore();
  if (ch && ch.world) ch.world(ctx, t, T, cam, mood);
  ctx.restore();
  if (ch && ch.screen) { ctx.save(); ch.screen(ctx, t, T, cam, mood); ctx.restore(); }
  if (!ch) label(ctx, `第 ${id} 章 · 待制作`, W / 2, H / 2, { size: 40, align: 'center', alpha: .4 });
  const sk = mood.scope, pr = mood.paper.match(/\d+/g).map(Number), bk = [17, 17, 20];
  SUB.safeFade(ctx, sk > 0 ? `rgb(${pr.map((v, i) => Math.round(v + (bk[i] - v) * sk)).join(',')})` : mood.paper, sk);
  if (ch && ch.title) { ctx.save(); ch.title(ctx, t, T); ctx.restore(); }
  SUB.draw(ctx, T.S, t, sk);
  setDark(0);
  ctx.restore();
};
window.READY = true;
