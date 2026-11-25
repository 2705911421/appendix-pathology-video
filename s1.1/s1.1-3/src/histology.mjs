import { RED, ink, lerp } from '../../shared/canvasCore.js';
import { HISTOLOGY_DIAMETER, createHistologyAsset } from '../../shared/histologyProcedural.js';
import { pushTo } from '../../shared/timelineHelper.js';
import { group, ramp, selectIds } from './geometry.mjs';
import { inkTrail } from './ink-trail.mjs';
import { createSerosaDetail, detailView } from './serosa.mjs';

const lens = Object.freeze({ x: 960, y: 465, diameter: 580 });
const frame = { x: 856, y: 633, width: 208, height: 104 };
const focus = { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
const initialScale = frame.width / (2 * detailView.rx);
const layers = ['管腔', '黏膜', '黏膜下', '肌层', '浆膜'];
const lensTop = lens.y - lens.diameter / 2;
const lensLeft = lens.x - lens.diameter / 2;
const lensScale = lens.diameter / HISTOLOGY_DIAMETER;
const spread = [
  { text: '链球菌等细菌', y: 232, start: .18 },
  { text: '链激酶 + 透明质酸酶', y: 308, start: .27, note: '链激酶激活纤溶酶原' },
  { text: '降解纤维素与透明质酸', y: 413, start: .43 },
  { text: '沿组织间隙迅速蔓延至浆膜', y: 491, start: .62, note: '穿透肌层 · 蜂窝织性' },
];

function spreadNotes() {
  return spread.map(({ text, y, note }, i) => group(`he-spread-${i}`, `
    ${i ? `<text class="note" x="1308" y="${y - 20}" text-anchor="middle" font-size="30" fill="#9C5145">↓</text>` : ''}
    <text class="note title" x="1340" y="${y}" font-size="30" fill="${i === 3 ? RED : '#523B34'}">${text}</text>
    ${note ? `<text class="note" x="1340" y="${y + 34}" font-size="27" fill="#443D37">${note}</text>` : ''}`)).join('')
    + group('he-spread-reference',
      '<text class="note" x="1340" y="586" font-size="25" fill="#443D37">渗出详细过程见前</text>');
}

function serosalNote() {
  const { x, y, width, height } = frame;
  const border = `<rect id="he-target-dash" x="${x}" y="${y}" width="${width}" height="${height}" fill="none"
    stroke="${RED}" stroke-width="3" stroke-dasharray="9 7"/>`;
  const segment = 14;
  const corners = [
    `M${x} ${y + segment}v-${segment}h${segment}`,
    `M${x + width - segment} ${y}h${segment}v${segment}`,
    `M${x + width} ${y + height - segment}v${segment}h-${segment}`,
    `M${x + segment} ${y + height}h-${segment}v-${segment}`,
  ].map((path, i) => ink(path, { color: RED, size: 3.2, seed: i * 9 + 53 })).join('');
  return group('he-target', border + corners)
    + '<g id="he-surface-leader"></g>'
    + `<text class="note title" x="1275" y="671" font-size="30" fill="${RED}">浆膜面 · 纤维素性脓性渗出物</text>`
    + '<text class="note" x="1275" y="715" font-size="25" fill="#1F1C19">纤维素丝网内含变性、坏死的中性粒细胞</text>';
}

export function createHistologySequence(pixelScale = 1) {
  const micro = createHistologyAsset({
    id: 'he-phlegmon', stage: 'phlegmon', seed: 8053, x: lensLeft, y: lensTop, scale: lensScale,
  });
  const closeup = createSerosaDetail(pixelScale);
  const braces = layers.map((name, i) => {
    const first = lensTop + micro.layers[i] * lensScale + 2.4;
    const last = lensTop + micro.layers[i + 1] * lensScale - 2.4;
    const mid = (first + last) / 2;
    const bend = Math.min(8, (last - first) * .22);
    const x = lensLeft - 23;
    const d = `M${x + 9} ${first} Q${x} ${first} ${x} ${first + bend}
      L${x} ${mid - bend} Q${x} ${mid} ${x - 10} ${mid}
      Q${x} ${mid} ${x} ${mid + bend} L${x} ${last - bend}
      Q${x} ${last} ${x + 9} ${last}`;
    return { trace: inkTrail(d, { color: '#715A4C', size: 3.65, seed: i * 13 + 82 }),
      markup: `<g id="he-brace-${i}"></g><text id="he-layer-${i}" x="${x - 17}" y="${mid + 8}"
        class="micro-layer" text-anchor="end" font-size="29">${name}</text>` };
  });
  const leader = inkTrail('M1286 683 C1212 685 1130 691 1071 694', { size: 3.8, color: '#875954', head: 17, seed: 73 });
  const drawn = [];
  let drawnLeader;
  let artNodes;
  let labelNodes;
  let labelRoot;
  return {
    paint: group('he-micro-lens', micro.paint) + group('he-high-power', closeup.paint),
    lettering: group('he-layer-labels', braces.map(item => item.markup).join(''))
      + group('he-surface-note', serosalNote())
      + spreadNotes()
      + group('he-macro-labels', closeup.lettering),
    mount(art, lettering) {
      micro.mount(art);
      closeup.mount(art, lettering);
      artNodes = selectIds(art, ['he-micro-lens', 'he-high-power']);
      labelNodes = selectIds(lettering, ['he-layer-labels', 'he-surface-note', 'he-target', 'he-target-dash',
        'he-surface-leader', 'he-macro-labels', 'he-spread-reference', ...spread.map((_, i) => `he-spread-${i}`),
        ...layers.flatMap((_, i) => [`he-layer-${i}`, `he-brace-${i}`])]);
      labelRoot = lettering;
    },
    audit() {
      return {
        ...closeup.audit,
        lens: micro.lens,
        infiltrate: micro.audit.shallow + micro.audit.muscle,
        serosalPus: micro.audit.serosalPus,
        overviewFibers: micro.audit.fibrin,
        visiblePus: closeup.audit.visiblePus, wovenFraction: closeup.audit.wovenFraction,
      };
    },
    update(cue, p) {
      const zooming = cue.id === 'B04';
      const macro = cue.id === 'S14';
      const progression = zooming ? ramp(p, 0, .65) : Number(macro);
      const camera = pushTo(focus, 1, 1 / initialScale, progression);
      const x = lerp(focus.x, detailView.x, progression);
      const y = lerp(focus.y, detailView.y, progression);
      artNodes['he-micro-lens'].setAttribute('transform', `translate(${x - focus.x} ${y - focus.y}) ${camera.transform}`);
      artNodes['he-micro-lens'].setAttribute('opacity', zooming ? 1 - ramp(p, .14, .65) : 1 - Number(macro));
      const size = camera.scale * initialScale;
      artNodes['he-high-power'].setAttribute('transform',
        `translate(${x} ${y}) scale(${size}) translate(${-detailView.x} ${-detailView.y})`);
      artNodes['he-high-power'].setAttribute('opacity', zooming ? ramp(p, .17, .62) : Number(macro));
      const outgoingLabels = zooming ? 1 - ramp(p, 0, .21) : 1 - Number(macro);
      labelNodes['he-layer-labels'].setAttribute('opacity', outgoingLabels);
      spread.forEach(({ start }, i) => {
        labelNodes[`he-spread-${i}`].setAttribute('opacity', outgoingLabels * ramp(p, start, start + .10));
      });
      labelNodes['he-spread-reference'].setAttribute('opacity', outgoingLabels * ramp(p, .61, .73));
      labelNodes['he-macro-labels'].toggleAttribute('hidden', !macro);
      if (zooming || macro) closeup.update(labelRoot, macro ? p : 0, zooming ? ramp(p, .45, .96) : 1);
      const overview = zooming || macro ? 1 : p;
      braces.forEach(({ trace }, i) => {
        const start = .105 + .034 * i;
        const completion = ramp(overview, start, start + .185);
        if (drawn[i] !== completion) {
          labelNodes[`he-brace-${i}`].innerHTML = trace(completion);
          drawn[i] = completion;
        }
        labelNodes[`he-layer-${i}`].setAttribute('opacity', ramp(overview, start + .035, start + .15));
      });
      labelNodes['he-surface-note'].setAttribute('opacity', outgoingLabels * ramp(overview, .35, .50));
      labelNodes['he-target'].setAttribute('opacity', .72 + .28 * ramp(overview, .49, .90));
      labelNodes['he-target-dash'].setAttribute('stroke-dashoffset', -56 * ramp(overview, .35, 1));
      const completion = ramp(overview, .39, .57);
      if (drawnLeader !== completion) {
        labelNodes['he-surface-leader'].innerHTML = leader(completion);
        drawnLeader = completion;
      }
    },
  };
}
