// Static style frames for the resected appendix (S01 / S06 / S11 / S13 / S14).
// t∈[0,1) normal · [1,2) red · [2,3) yellow · [3,4) black · [4,5) 2×2 contact.
import { C } from '../lib/tokens.js';
import { grid } from '../lib/ink.js';
import * as A from '../lib/ann.js';
import {
  prepare as bakeGross, drawAppendix, drawNotes, drawTitle,
  STATES, META,
} from '../lib_ext/gross_appendix.js';

const POSE = { x: 1210, y: 400, rot: -.16, sc: 1.48 };

function paper(ctx) {
  // Reset clip / composite leftovers from a previous render(t). Assigning width clears the stack.
  ctx.canvas.width = 1920;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, 1920, 1080);
  ctx.save(); ctx.globalAlpha = .85; grid(ctx, -40, -40, 1960, 1120, 40); ctx.restore();
}

function drawOne(ctx, state) {
  drawAppendix(ctx, state, POSE);
  drawTitle(ctx, state);
  drawNotes(ctx, state, POSE);
}

function cellPose(col, row) {
  const x0 = 80, y0 = 70, gap = 28;
  const cw = (1920 - x0 * 2 - gap) / 2, ch = (900 - y0 - gap) / 2;
  return {
    box: { x: x0 + col * (cw + gap), y: y0 + row * (ch + gap), w: cw, h: ch },
    pose: {
      x: x0 + col * (cw + gap) + cw * .52,
      y: y0 + row * (ch + gap) + ch * .56,
      rot: -.12,
      sc: .82,
    },
  };
}

const cellCv = document.createElement('canvas');
function blitCell(ctx, state, pose, box) {
  const w = Math.ceil(box.w), h = Math.ceil(box.h);
  if (cellCv.width !== w || cellCv.height !== h) { cellCv.width = w; cellCv.height = h; }
  const c = cellCv.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = C.paper;
  c.fillRect(0, 0, w, h);
  drawAppendix(c, state, { ...pose, x: pose.x - box.x, y: pose.y - box.y });
  ctx.drawImage(cellCv, box.x, box.y);
}

function drawGrid(ctx) {
  const layout = [[0, 0, 'normal'], [1, 0, 'red'], [0, 1, 'yellow'], [1, 1, 'black']];
  layout.forEach(([col, row, state]) => {
    const { box, pose } = cellPose(col, row);
    const m = META[state];
    blitCell(ctx, state, pose, box);
    A.label(ctx, m.diag, box.x + 18, box.y + 28, { size: 28, w: 800, col: m.tone, halo: true });
    A.label(ctx, m.sub, box.x + 18, box.y + 58, { size: 18, w: 500, alpha: .7, halo: true });
  });
  A.label(ctx, '大体标本 · 四态', 96, 980, { size: 22, w: 500, alpha: .5 });
}

export default {
  prepare() { bakeGross(); },
  draw(ctx, t) {
    paper(ctx);
    const i = Math.min(4, Math.max(0, Math.floor(t + 1e-9)));
    if (i < 4) drawOne(ctx, STATES[i]);
    else drawGrid(ctx);
  },
};
