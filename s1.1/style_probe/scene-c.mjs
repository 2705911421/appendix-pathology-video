import { strokePath } from '../shared/canvasCore.js';
import { drawPathologyProgress, paintPathologyProgress } from '../shared/leftFloatNotes.js';
import { CT, HE_LENS as lens, createHistologyLens, drawAxialCT } from '../shared/charactersAndHistology.js';

export function sceneC() {
  const histology = createHistologyLens({ id: 'gate-lens', paintNotes: paintPathologyProgress });
  const notes = drawPathologyProgress({ id: 'gate-progress', wash: histology.notesWash });
  const ct = drawAxialCT({ id: 'gate-ct' });
  return {
    paint: `${notes.paint}${histology.paint}${ct.paint}`,
    lettering: `
      ${notes.lettering}
      <text class="note title" x="${lens.x}" y="157" text-anchor="middle" font-size="41">H&amp;E 光学视野</text>
      ${histology.lettering}
      <text class="note title" x="${CT.x + CT.width / 2}" y="157" text-anchor="middle" font-size="41">轴位 CT 示意</text>
      ${ct.lettering}
      ${strokePath('M1341 501 L1261 599 V754 H1280', '#E0463A', 3.15)}
      ${strokePath('M1308 492 L1211 567 V809 H1280', '#E0463A', 3.15)}
      <g fill="#1F1C19" style="font-family:var(--text);font-weight:750" font-size="41">
        <text x="1300" y="769">轻度增粗阑尾（&gt;6mm）</text>
        <text x="1300" y="824">周围脂肪间隙清晰</text>
      </g>
      <text class="note" x="${CT.x + CT.width / 2}" y="877" text-anchor="middle" font-size="36" font-weight="700">多层螺旋CT 敏感度 <tspan fill="#9A352F">&gt; 93%</tspan></text>`,
    caption: [
      { text: '镜下可见黏膜炎症，CT 上阑尾可轻度增粗。', highlights: ['黏膜炎症'] },
      'The mucosa is inflamed on microscopy, and CT may show mild appendiceal enlargement.',
    ],
    update: histology.update,
  };
}
