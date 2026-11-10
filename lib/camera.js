// Camera on a 2D world. keys: [[t, {x,y,zoom}], ...] — piecewise eased. World point (x,y) lands at screen centre.
import { W, H } from './tokens.js';
const io = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
export function camAt(keys, t) { if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, a] = keys[i - 1], [t1, b, easing] = keys[i], k = (easing || io)((t - t0) / (t1 - t0));
    const z = Math.exp(Math.log(a.zoom) + (Math.log(b.zoom) - Math.log(a.zoom)) * k);   // log-zoom: perceptually even push-in
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, zoom: z }; }
  return keys.at(-1)[1]; }
export function apply(ctx, c) { ctx.translate(W / 2, H / 2); ctx.scale(c.zoom, c.zoom); ctx.translate(-c.x, -c.y); }
export const toScreen = (c, p) => [(p[0] - c.x) * c.zoom + W / 2, (p[1] - c.y) * c.zoom + H / 2];
export const toWorld = (c, p) => [(p[0] - W / 2) / c.zoom + c.x, (p[1] - H / 2) / c.zoom + c.y];
export const view = c => { const a = toWorld(c, [0, 0]), b = toWorld(c, [W, H]); return [a[0], a[1], b[0], b[1]]; };
