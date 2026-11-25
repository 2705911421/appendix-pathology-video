import { lerp } from '../../shared/canvasCore.js';
import { NUMERAL_FONT } from '../../shared/fonts.js';
import { dot, fade, fill, ink, letter, pathOf, roughPath } from './paint.js';

export const palette = [
  { key: 'pink', label: '粉白', color: '#F2B8B0' },
  { key: 'red', label: '暗红', color: '#C93430' },
  { key: 'yellow', label: '灰黄', color: '#DFB848' },
  { key: 'black', label: '焦黑', color: '#1C1719' },
];

const pane = 'M91 122 Q157 117 258 122 L255 291 Q172 289 92 293Z';
const moon = 'M219 149 C194 153 190 181 200 191 Q210 207 231 197 C216 196 203 176 219 149Z';

export function makeNotes(pigment) {
  const windowEdge = roughPath('M85 115 L265 115 L262 300 L86 300Z', 127, '#615445', 2);
  const clockEdge = roughPath('M141 355 C142 314 81 314 81 355 C81 395 142 396 141 355Z', 299, '#645649', 2);
  const nightStars = [[113, 152, 2], [126, 190, 1.6], [197, 155, 1.1], [238, 177, 2.3], [221, 216, 1.25]];
  return (ctx, motion) => {
    const { sunset, night, noteOpacity } = motion;
    fade(ctx, noteOpacity, () => {
      ctx.translate(0, 88);
      ctx.save();
      ctx.clip(pathOf(pane));
      fill(ctx, pane, '#D5DFDD');
      pigment(ctx, 'sky', 63, 76, 236, 259);
      fade(ctx, sunset, () => {
        fill(ctx, pane, '#ADB5BB');
        pigment(ctx, 'dusk', 61, 77, 239, 260);
      });
      fade(ctx, night * .86, () => {
        fill(ctx, pane, '#43546A');
        pigment(ctx, 'night', 49, 72, 263, 265);
      });
      fade(ctx, 1 - sunset * .98, () => {
        const x = 214 + 12 * sunset;
        const y = 160 + 119 * sunset ** 1.65;
        dot(ctx, x, y, 13, 12, '#DE7653');
        pigment(ctx, 'sun', x - 23, y - 24, 46, 46);
      });
      fade(ctx, sunset, () => {
        ctx.save();
        ctx.translate(0, 43 * (1 - sunset));
        pigment(ctx, 'ochre', 172, 125, 75, 85);
        fill(ctx, moon, '#F3D88F');
        ctx.restore();
        for (const [x, y, radius] of nightStars) dot(ctx, x, y, radius, radius, '#FFF1C8');
      });
      fade(ctx, .52, () => {
        fill(ctx, 'M78 278 C126 238 156 268 196 244 Q227 231 268 258 L269 301 H79Z', '#829695');
        fill(ctx, 'M79 293 Q127 268 168 284 Q217 253 267 271 L271 295 Z', '#657B7C');
      });
      ctx.restore();
      windowEdge(ctx);
      ink(ctx, 'M174 119 Q171 201 173 297', '#625545', 5.1);
      ink(ctx, 'M87 209 Q166 209 263 210', '#625545', 5);
      ink(ctx, 'M76 304 Q156 309 275 302', '#8B6F56', 6.5);

      ctx.save();
      ctx.translate(111, 335);
      ctx.scale(.74, .74);
      ctx.translate(-111, -355);
      clockEdge(ctx);
      for (let tick = 0; tick < 12; tick++) {
        const angle = tick / 12 * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(111 + 25 * Math.sin(angle), 355 + 25 * Math.cos(angle));
        ctx.lineTo(111 + 28 * Math.sin(angle), 355 + 28 * Math.cos(angle));
        ctx.strokeStyle = '#7E6C5D';
        ctx.lineWidth = 1.35;
        ctx.stroke();
      }
      const hour = 12 + 6 * sunset + 4 * night;
      const minutes = Math.round(hour * 60);
      for (const [angle, reach, width] of [[hour * Math.PI / 6, 14, 4.3], [hour * Math.PI * 2, 21, 2.85]]) {
        ctx.save();
        ctx.translate(111, 355);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(.3, 2);
        ctx.quadraticCurveTo(-1.1, -reach * .47, 0, -reach);
        ctx.strokeStyle = '#52463E';
        ctx.lineWidth = width;
        ctx.stroke();
        ctx.restore();
      }
      dot(ctx, 111, 355, 2.5, 2.5, '#4D4139');
      ctx.restore();
      const time = String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
      letter(ctx, time, 153, 347, { size: 32, weight: 700, color: '#1F1C19', font: NUMERAL_FONT });
      letter(ctx, night > .56 ? '急诊入院 · 病程 10h' : sunset > .75 ? '傍晚' : '午饭后', 88, 381,
        { size: 19, color: '#5C564E' });
    });
  };
}
