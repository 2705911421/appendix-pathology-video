import flubber from 'flubber';
import { ellipse, lerp, mulberry32, organic, samplePath } from '../../shared/canvasCore.js';
import { histologyRecipe } from '../../shared/histologyProcedural.js';
import { phase } from '../../shared/timelineHelper.js';
import { MICROSCOPE_HANDOFF } from '../../shared/transitionAnchors.js';
import { calls, circle, dotted, fill, glaze, ink, liveLayer, roughCircle, stroke, watercolor } from './brushwork.js';

export const MAGNIFIER = Object.freeze({ x: 1590, y: 275, radius: 142, labelTop: 460 });
export const MICROSCOPE = Object.freeze({ x: MICROSCOPE_HANDOFF.cx, y: MICROSCOPE_HANDOFF.cy, radius: MICROSCOPE_HANDOFF.radius });

const serosalTrunks = [
  'M-166 96 C-125 89 -119 53 -78 50 C-36 49 -35 9 4 3 C45 -3 47 -42 92 -53 Q127 -61 165 -92',
  'M-84 51 C-63 24 -74 -5 -99 -26 C-112 -42 -103 -75 -125 -91 Q-142 -101 -151 -123',
  'M2 5 C18 19 18 45 35 57 C53 69 91 63 111 94 Q123 118 149 133',
  'M54 -28 C49 -50 28 -65 28 -85 C27 -109 54 -123 48 -153',
  'M-33 30 C-20 46 -17 72 -34 94 Q-48 118 -34 154',
];

function serosalField() {
  const crop = [-173, -173, 346, 346];
  const edge = organic(0, 0, 166, 165, 68422, .07, .21, 35);
  const wash = watercolor(crop, 45431, (wet, charcoal) => {
    wet(edge, '#BD383A', 201, .29, .82, .49);
    wet(organic(-81, 60, 116, 63, 2634, .32, -.64, 24), '#6A2639', 176, .38, .8, .54);
    wet(organic(32, -59, 117, 62, 9382, .30, -.43, 29), '#E1816D', 151, .37, .65, .39);
    wet(organic(92, 74, 103, 49, 11176, .27, .42, 24), '#942940', 126, .34);
    charcoal(organic(-96, 79, 87, 77, 12621, .23, -.41, 24), '#7A3038', .16);
  });
  const pigment = liveLayer(crop);
  const ctx = pigment.ctx;
  ctx.fillStyle = '#BC544C';
  ctx.fillRect(...crop);
  glaze(ctx, wash);
  const rand = mulberry32(9860);
  for (let i = 0; i < 630; i++) {
    const x = (rand() - .5) * 321;
    const y = (rand() - .5) * 317;
    circle(ctx, x, y, .50 + rand() * 1.85, .27 + rand() * 1.24,
      i % 5 ? '#74303A' : '#F9B393', .09 + rand() * .34, rand() * 3.14);
  }

  const tree = liveLayer(crop);
  for (const [index, trunk] of serosalTrunks.entries()) {
    const weight = index === 0 ? 11.2 : 6.4 - index * .41;
    ink(tree.ctx, trunk, '#572033', weight + 4.7, .53, 89 + index * 137);
    ink(tree.ctx, trunk, '#7C1F34', weight, .95, 89 + index * 137);
    stroke(tree.ctx, trunk, '#A73E4B', index === 0 ? 1.45 : .83, .82);
    const points = samplePath(trunk, 23);
    for (let j = 1; j < points.length - 1; j++) {
      const [x, y] = points[j];
      const [nx, ny] = points[j + 1];
      const side = (j + index) % 2 ? 1 : -1;
      const a = Math.atan2(ny - y, nx - x) + side * (.44 + rand() * .86);
      const length = 17 + rand() * 38;
      const dx = Math.cos(a) * length;
      const dy = Math.sin(a) * length;
      const qx = x + dx * .38 - dy * .24;
      const qy = y + dy * .45 + dx * .13;
      const ex = x + dx;
      const ey = y + dy;
      ink(tree.ctx, `M${x} ${y} Q${qx} ${qy} ${x + dx * .73} ${y + dy * .70} T${ex} ${ey}`,
        '#7A2535', 1.65 + rand() * 2.0, .86, 591 + j * 11 + index * 177);
      stroke(tree.ctx, `M${x + dx * .64} ${y + dy * .66} q${dx * .21 - dy * .4} ${dy * .20 + dx * .4} ${dx * .40 - dy * .44} ${dy * .40 + dx * .48}`,
        '#802C3B', .66 + rand() * .98, .70);
    }
  }
  return { pigment, tree };
}

function tangentPoints(focus, r) {
  const dx = focus.x - MAGNIFIER.x;
  const dy = focus.y - MAGNIFIER.y;
  const angle = Math.atan2(dy, dx);
  const spread = Math.acos(Math.min(1, r / Math.hypot(dx, dy)));
  return [angle - spread, angle + spread].map(a => ({
    x: MAGNIFIER.x + Math.cos(a) * r, y: MAGNIFIER.y + Math.sin(a) * r,
  })).sort((a, b) => a.y - b.y);
}

function tangentControl(focus, end, length) {
  const distance = Math.hypot(focus.x - end.x, focus.y - end.y);
  return `${end.x + (focus.x - end.x) * length / distance} ${end.y + (focus.y - end.y) * length / distance}`;
}

export function createMagnifier() {
  const { pigment, tree } = serosalField();
  return (ctx, { amount, opacity, focus, time, guide = 1 }) => {
    if (amount <= 0 || opacity <= 0) return null;
    const { x, y, radius, labelTop } = MAGNIFIER;
    const r = radius * lerp(.20, 1, amount);
    const alpha = opacity * Math.min(1, amount * 2.7);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.save();
    ctx.translate(focus.x, focus.y);
    ctx.rotate(focus.angle);
    const box = 'M-13 -10 L-17 -10 -17 -4 M12 -10 L17 -10 17 -4 ' +
      'M-17 4 L-17 10 -12 10 M17 4 L17 10 12 10';
    stroke(ctx, box, '#FBDBAA', 3, .76);
    stroke(ctx, box, '#96392E', 1.5, .99);
    ctx.restore();
    const [upper, lower] = tangentPoints(focus, r);
    const first = `M${focus.x + 12} ${focus.y - 7} C${focus.x + 172} ${focus.y - 82} ` +
      `${tangentControl(focus, upper, 111)} ${upper.x} ${upper.y}`;
    // Guide strokes stay above the lower rim before they enter the label's horizontal span.
    const lowerKnee = Math.min(y + r - 10, lower.y + 9);
    const lowerRun = Math.hypot(focus.x - lower.x, focus.y - lower.y);
    const tangentLength = Math.min(66, lowerRun * Math.max(1, y + r - lower.y - 2) /
      Math.max(1, focus.y - lower.y));
    const second = `M${focus.x + 14} ${focus.y + 6} C${focus.x + 184} ${focus.y - 7} 1329 ${lowerKnee + 6} 1411 ${lowerKnee} ` +
      `C1455 ${lowerKnee - 3} ${tangentControl(focus, lower, tangentLength)} ${lower.x} ${lower.y}`;
    dotted(ctx, first, '#AD4A3E', 2.55, 10, 7, guide);
    dotted(ctx, second, '#AD4A3E', 2.55, 10, 7, guide);

    ctx.save();
    ctx.clip(new Path2D(ellipse(x, y, r, r)));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(r / radius, r / radius);
    glaze(ctx, pigment);
    const pulse = Math.sin(time * 3.1);
    ctx.scale(1 + .008 * pulse, 1 + .006 * pulse);
    glaze(ctx, tree);
    ctx.restore();
    roughCircle(ctx, x, y, r * 2 - 3.1, '#5C372E', 2.7, 4236);
    roughCircle(ctx, x, y, r * 2 - 13, '#EFD2A0', 1.2, 6142);
    ctx.restore();
    ctx.restore();
    return { x, y, radius: r, labelTop, cleanGap: labelTop - (y + r), alpha };
  };
}

function boundsOf(d) {
  const points = samplePath(d, 4.5, 640);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  return { x: (left + right) / 2, y: (top + bottom) / 2, width: right - left, height: bottom - top };
}

export function createMicroscope() {
  const { x, y, radius } = MICROSCOPE;
  let previous, tween;
  return {
    recipe: histologyRecipe(MICROSCOPE_HANDOFF.mode),
    at(p, outline) {
      const growth = phase(p, 0, .58);
      const opacity = phase(p, .015, .25);
      const paperOpacity = phase(p, .28, .58);
      if (growth >= 1) return { growth, opacity: 1, paperOpacity: 1, x, y, width: 2 * radius, height: 2 * radius };
      if (outline !== previous) {
        tween = flubber.toCircle(outline, x, y, radius, { maxSegmentLength: 8 });
        calls.toCircle++;
        previous = outline;
      }
      const mask = tween(growth);
      const box = boundsOf(mask);
      const overscan = lerp(1.43, 1.04, growth);
      return { growth, opacity, paperOpacity, mask, ...box,
        placement: { x: box.x, y: box.y, sx: overscan * box.width / (2 * radius), sy: overscan * box.height / (2 * radius) } };
    },
  };
}
