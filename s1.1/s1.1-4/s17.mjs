import { RED, lerp } from '../shared/canvasCore.js';
import { appendixCentreline, appendixWallRadius, ileocecalDimensions, terminalIleumPoint } from '../shared/anatomyWatercolor.js';
import { centeredSpecimen, opacity, phase, scaleAround } from './scene-tools.mjs';
import { arteryLens, veinLens } from './vein-lens.mjs';

const optic = { x: 1612, y: 530, radius: 145 };
const arteryOptic = { x: 1340, y: 234, radius: 126 };
const placement = { cx: 800, cy: 490, scale: 1.34, stage: 'phlegmon' };

export function s17() {
  const patent = centeredSpecimen({ ...placement, id: 's17-patent', showThrombus: false });
  const organ = centeredSpecimen({ ...placement, id: 's17-organ', showThrombus: true, thrombusSite: .79 });
  const lens = veinLens(optic);
  const artery = arteryLens(arteryOptic);
  const compressionSites = [.52, .64].map(u => {
    const [x, y, angle] = appendixCentreline('phlegmon', u);
    const radius = appendixWallRadius('phlegmon', organ.dimensions.appendix, u);
    const inner = radius - 2.6;
    return { u, x: organ.x + organ.scale * (x + Math.sin(angle) * radius),
      y: organ.y + organ.scale * (y - Math.cos(angle) * radius),
      interior: [organ.x + organ.scale * (x + Math.sin(angle) * inner),
        organ.y + organ.scale * (y - Math.cos(angle) * inner)] };
  });
  const rim = ({ x, y, radius }, degrees, scale = 1) => {
    const angle = degrees * Math.PI / 180;
    return `${x + radius * scale * Math.cos(angle)} ${y + radius * scale * Math.sin(angle)}`;
  };
  const ileum = Array.from({ length: 61 }, (_, i) => {
    const { x, y } = terminalIleumPoint(i / 60);
    return [organ.x + organ.scale * x, organ.y + organ.scale * y];
  });
  const audit = { source: { x: organ.thrombusX, y: organ.thrombusY }, optic, arteryOptic, ileum, walls: compressionSites,
    ileumRadius: ileocecalDimensions('phlegmon').ileum * organ.scale / 2 };
  return {
    paint: patent.paint + `<defs>
      <clipPath id="s17-gross-clot-mask"><ellipse id="s17-gross-clot-aperture"/></clipPath>
      </defs><g clip-path="url(#s17-gross-clot-mask)">${organ.paint}</g>
      <g id="s17-arterial-inset">${artery.paint}</g>
      <g id="s17-magnification">${lens.paint}</g>`,
    lettering: `
      <g id="s17-arterial-guides" fill="none" stroke="#C43428" stroke-width="2" stroke-linecap="round" stroke-dasharray="7 7">
        <path/><path/>
        ${compressionSites.map(({ x, y }) => `<circle cx="${x}" cy="${y}" r="3.6" fill="#F5F1E9" stroke-dasharray="none"/>`).join('')}
      </g>
      <g id="s17-tangents" fill="none" stroke="#2F5D7C" stroke-width="2" stroke-linecap="round" stroke-dasharray="7 7">
        <path/><path/>
        <circle cx="${organ.thrombusX}" cy="${organ.thrombusY}" r="4.4" stroke-dasharray="none"/>
      </g>
      <text id="s17-gross" class="note" x="800" y="804" text-anchor="middle" font-size="26"
        fill="#1F1C19" style="font-weight:750">浆膜灰黄脓苔与显著肿胀</text>
      <g id="s17-arterial-label" class="note" text-anchor="middle">
        <text x="${arteryOptic.x}" y="63" font-size="31" fill="#8D342F" style="font-weight:800">阑尾壁动脉受压</text>
        <text x="${arteryOptic.x}" y="95" font-size="23" fill="#614C44">肿胀管壁使动脉变窄</text>
      </g>
      <g id="s17-venous-label" class="note" text-anchor="middle">
        <text x="${optic.x}" y="714" font-size="31" fill="#2F5D7C" style="font-weight:800">阑尾系膜静脉血栓</text>
        <text x="${optic.x}" y="747" font-size="24" fill="#536371">血栓堵腔 · 回流受阻</text>
      </g>
      <text id="s17-label" class="note" x="1466" y="829" text-anchor="middle" font-size="34"
        fill="${RED}" style="font-weight:800">动静脉双重受阻 → 阑尾缺血、坏死</text>`,
    audit,
    mount(art) {
      patent.mount(art);
      organ.mount(art);
      lens.mount(art);
      artery.mount(art);
    },
    update(art, labels, p) {
      const { thrombusX, thrombusY } = organ.update(art, { showThrombus: true });
      const growth = lens.update(p);
      audit.arteryDiameter = artery.update(p);
      opacity(art, 's17-arterial-inset', phase(p, .08, .24));
      opacity(art, 's17-pressure-cues', phase(p, .19, .33));
      opacity(labels, 's17-arterial-label', phase(p, .10, .24));
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
      const bloodGuides = labels.querySelector('#s17-tangents');
      bloodGuides.setAttribute('opacity', .74 * reveal * phase(p, .27, .43));
      [...bloodGuides.querySelectorAll('path')].forEach((path, i) => {
        const d = 12 * i;
        path.setAttribute('d', `M${thrombusX} ${thrombusY}
          C${thrombusX + 22} ${thrombusY - 3 + i} 906 ${668 + i * 2} 949 ${692 + d}
          C1110 ${726 + d} 1341 ${703 + d} ${rim(optic, 151 - 19 * i, zoom)}`);
      });
      const wallGuides = labels.querySelector('#s17-arterial-guides');
      wallGuides.setAttribute('opacity', .72 * phase(p, .15, .38));
      [...wallGuides.querySelectorAll('path')].forEach((path, i) => {
        const { x, y } = compressionSites[i];
        const d = 8 * i;
        path.setAttribute('d', `M${x} ${y} C${x + 23} ${y - 12} 924 ${651 + d} 999 ${667 + d}
          C1040 ${676 + d} 1085 ${676 + d} 1133 ${661 + d}
          C1171 ${638 + d} 1132 497 ${rim(arteryOptic, 149 - 19 * i)}`);
      });
      opacity(labels, 's17-gross', phase(p, .04, .22));
      opacity(labels, 's17-venous-label', phase(p, .36, .57));
      opacity(labels, 's17-label', phase(p, .64, .82));
    },
  };
}
