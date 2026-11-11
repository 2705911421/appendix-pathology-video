// Verify McBurney point geometry in the RENDERED frame (after camera transform) at time t.
import { loadChromium, launch, serve, openPage } from '/workspace/garden-skills/skills/motion-showreel/scripts/lib/browser.mjs';
import path from 'path';
const root = path.resolve(process.cwd()); const t = +(process.argv[2] || 17);
const chromium = await loadChromium(root); const b = await launch(chromium); const { server: srv, port } = await serve(root);
const p = await openPage(b, { port, rel: 'index.html', w: 1920, h: 1080 });
const out = await p.evaluate(async t => { await window.render(t); const c = window.__cam; const { FIG } = await import('./lib/figure.js');
  const S = q => [(q[0] - c.x) * c.zoom + 960, (q[1] - c.y) * c.zoom + 540]; const n = S(FIG.navel), a = S(FIG.asis), m = S(FIG.mcb);
  // pixel check: centroid of pure-vermilion (#D6453A ±6) pixels within 30 px of the drawn McBurney dot
  const d = document.getElementById('c').getContext('2d').getImageData(Math.round(m[0]) - 30, Math.round(m[1]) - 30, 61, 61).data; let sx = 0, sy = 0, k = 0;
  for (let y = 0; y < 61; y++) for (let x = 0; x < 61; x++) { const i = (y * 61 + x) * 4; if (Math.abs(d[i] - 214) < 7 && Math.abs(d[i + 1] - 69) < 7 && Math.abs(d[i + 2] - 58) < 7) { sx += x; sy += y; k++; } }
  const L = Math.hypot(n[0] - a[0], n[1] - a[1]), da = Math.hypot(m[0] - a[0], m[1] - a[1]);
  return { cam: c, navel: n, asis: a, mcb: m, ratioFromASIS: da / L, pixelCentroid: k ? [m[0] - 30 + sx / k, m[1] - 30 + sy / k] : null, redPixels: k }; }, t);
console.log(JSON.stringify(out, null, 1)); await b.close(); srv.close();
