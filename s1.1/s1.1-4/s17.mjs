import { RED, lerp } from '../shared/canvasCore.js';
import { drawStageSwatch } from '../shared/leftFloatNotes.js';
import { centeredSpecimen, opacity, phase, scaleAround, setTangents, tangentPair } from './scene-tools.mjs';
import { veinLens } from './vein-lens.mjs';

const optic = { x: 1525, y: 325, radius: 165 };
const placement = { cx: 800, cy: 490, scale: 1.34, stage: 'phlegmon' };

export function s17() {
  const swatch = drawStageSwatch({ stage: 'phlegmon', y: 405 });
  const patent = centeredSpecimen({ ...placement, id: 's17-patent', showThrombus: false });
  const organ = centeredSpecimen({ ...placement, id: 's17-organ', showThrombus: true });
  const lens = veinLens(optic);
  return {
    paint: swatch.paint + patent.paint + `<defs>
      <clipPath id="s17-gross-clot-mask"><ellipse id="s17-gross-clot-aperture"/></clipPath>
      </defs><g clip-path="url(#s17-gross-clot-mask)">${organ.paint}</g>
      <g id="s17-magnification">${lens.paint}</g>`,
    lettering: swatch.lettering + tangentPair('s17-tangents') + `
      <text id="s17-gross" class="note" x="800" y="804" text-anchor="middle" font-size="26"
        fill="#1F1C19" style="font-weight:750">浆膜灰黄脓苔与显著肿胀</text>
      <text id="s17-label" class="note" x="${optic.x}" y="550" text-anchor="middle" dominant-baseline="hanging"
        font-size="27" fill="${RED}" style="font-weight:800">阑尾系膜静脉血栓 · 回流受阻</text>`,
    audit: { source: { x: organ.thrombusX, y: organ.thrombusY }, optic },
    mount(art) {
      patent.mount(art);
      organ.mount(art);
      lens.mount(art);
    },
    update(art, labels, p) {
      const { thrombusX, thrombusY } = organ.update(art, { showThrombus: true });
      const growth = lens.update(p);
      const sizing = art.querySelector('#s17-gross-clot-aperture');
      sizing.setAttribute('cx', thrombusX);
      sizing.setAttribute('cy', thrombusY);
      sizing.setAttribute('rx', 17.4 * growth ** .58);
      sizing.setAttribute('ry', 6.8 * growth ** .75);
      sizing.setAttribute('transform', `rotate(${organ.thrombusAngle} ${thrombusX} ${thrombusY})`);

      const reveal = phase(p, .22, .43);
      const zoom = lerp(.76, 1, reveal);
      art.querySelector('#s17-magnification').setAttribute('transform', scaleAround(optic.x, optic.y, zoom));
      opacity(art, 's17-magnification', reveal);
      setTangents(labels, 's17-tangents', { x: thrombusX, y: thrombusY }, { ...optic, radius: optic.radius * zoom },
        .86 * reveal * phase(p, .27, .38));
      opacity(labels, 's17-gross', phase(p, .04, .22));
      opacity(labels, 's17-label', phase(p, .61, .83));
    },
  };
}
