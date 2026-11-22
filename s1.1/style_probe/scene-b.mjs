import { RED, arrow } from '../shared/canvasCore.js';
import { EXTRAVASATION, createInflammationField } from '../shared/charactersAndHistology.js';

export function sceneB() {
  const field = createInflammationField({ id: 'gate-inflammation' });
  const { x: crossingX, y: crossingY } = EXTRAVASATION;
  return {
    paint: field.paint,
    lettering: `
      <text class="note title" x="124" y="124" font-size="47">黏膜破溃 <tspan fill="${RED}">· 变质</tspan></text>
      ${arrow('M479 116 C662 119 813 136 895 250', { color: '#743A40', size: 4.5, head: 24 })}
      <defs><radialGradient id="b-soft-note">
        <stop offset=".58" stop-color="#FAF5E9" stop-opacity=".69"/>
        <stop offset="1" stop-color="#FAF5E9" stop-opacity="0"/>
      </radialGradient></defs>
      <ellipse cx="1534" cy="102" rx="308" ry="73" fill="url(#b-soft-note)"/>
      <text class="note title" x="1330" y="124" font-size="46" fill="#1F1C19">白细胞游出 · <tspan fill="${RED}">渗出</tspan></text>
      ${arrow(`M1337 141 C1261 175 1256 243 1214 294 C1199 352 1151 426 ${crossingX + 12} ${crossingY - 8}`,
      { color: '#77374C', size: 3.9, head: 21 })}
      <text class="note callout" x="1093" y="881" font-size="43">纤维素性脓性渗出物<tspan fill="#715326" font-size="36">（灰黄色来源）</tspan></text>
      ${arrow('M1064 868 C1028 863 991 842 954 811', { color: '#866226', size: 3.85, head: 19 })}`,
    caption: [
      { text: '血管扩张，中性粒细胞游向破溃的黏膜。', highlights: ['中性粒细胞'] },
      'Neutrophils leave dilated vessels and migrate toward the damaged mucosa.',
    ],
    update: field.update,
  };
}
