import { RED, lerp } from '../shared/canvasCore.js';
import { ILEOCECAL_BOX, appendixCentreline, appendixWallRadius, terminalIleumPoint } from '../shared/anatomyWatercolor.js';
import { centeredSpecimen, opacity, phase, scaleAround } from './scene-tools.mjs';
import { arteryLens, veinLens } from './vein-lens.mjs';

const optic = { x: 1612, y: 530, radius: 145 };
const arteryOptic = { x: 1340, y: 234, radius: 126 };
export const acuteSpecimenPlacement = Object.freeze({ cx: 800, cy: 490, scale: 1.34, thrombusSite: .79 });
const veinGuideSite = .715;
const ileumSteps = 256;
const routeSteps = 64;

function cubicPoint(points, t) {
  const v = 1 - t;
  return [0, 1].map(axis => v ** 3 * points[0][axis] + 3 * v ** 2 * t * points[1][axis]
    + 3 * v * t ** 2 * points[2][axis] + t ** 3 * points[3][axis]);
}

function clearanceBound(segments, ileum, radius, ileumSamplingError) {
  return Math.min(...segments.map(points => {
    const maxEdge = Math.max(...points.slice(1).map(([x, y], index) =>
      Math.hypot(x - points[index][0], y - points[index][1])));
    const routeSamplingError = 3 * maxEdge / (2 * routeSteps);
    let nearest = Infinity;
    for (let i = 0; i <= routeSteps; i++) {
      const [x, y] = cubicPoint(points, i / routeSteps);
      for (const [u, v] of ileum) nearest = Math.min(nearest, Math.hypot(x - u, y - v));
    }
    // The derivative of a cubic is a convex combination of three control-edge vectors.
    return nearest - radius - 1 - ileumSamplingError - routeSamplingError;
  }));
}

const pathOf = segments => `M${segments[0][0].join(' ')} `
  + segments.map(segment => `C${segment.slice(1).map(point => point.join(' ')).join(' ')}`).join(' ');

function rim({ x, y, radius }, degrees, scale = 1) {
  const angle = degrees * Math.PI / 180;
  return [x + radius * scale * Math.cos(angle), y + radius * scale * Math.sin(angle)];
}

export function s17() {
  const placement = { ...acuteSpecimenPlacement, stage: 'phlegmon' };
  const patent = centeredSpecimen({ ...placement, id: 's17-patent', showThrombus: false, thrombusSite: veinGuideSite });
  const organ = centeredSpecimen({ ...placement, id: 's17-organ', showThrombus: true });
  const lens = veinLens(optic);
  const artery = arteryLens(arteryOptic);
  const compressionSites = [.52, .64].map((u, i) => {
    const [x, y, angle] = appendixCentreline('phlegmon', u);
    const radius = appendixWallRadius('phlegmon', organ.dimensions.appendix, u);
    const side = i === 0 ? 1 : -1;
    const position = distance => [organ.x + organ.scale * (x + Math.sin(angle) * distance * side),
      organ.y + organ.scale * (y - Math.cos(angle) * distance * side)];
    const [wallX, wallY] = position(radius);
    return { u, side, x: wallX, y: wallY, interior: position(radius - 2.6) };
  });
  const ileum = Array.from({ length: ileumSteps + 1 }, (_, i) => {
    const { x, y } = terminalIleumPoint(i / ileumSteps);
    return [organ.x + organ.scale * x, organ.y + organ.scale * y];
  });
  const veinAnchor = { x: patent.thrombusX, y: patent.thrombusY };
  const bluePrefixes = [0, 1].map(i => [
    [[veinAnchor.x, veinAnchor.y], [veinAnchor.x + 9, veinAnchor.y + 29 + 7 * i], [910, 724 + 11 * i], [970, 746 + 15 * i]],
    [[970, 746 + 15 * i], [1023, 765 + 15 * i], [1085, 765 + 15 * i], [1145, 756 + 15 * i]],
  ]);
  const blueCurves = (i, zoom) => [...bluePrefixes[i],
    [[1145, 756 + 15 * i], [1290, 747 + 12 * i], [1410, 707 + 8 * i], rim(optic, 151 - 19 * i, zoom)]];
  const redCurves = compressionSites.map(({ x, y }, i) => [
    [[x, y], [x + 38, y + 3], [916, 675 + 28 * i], [970, 686 + 28 * i]],
    [[970, 686 + 28 * i], [1020, 695 + 28 * i], [1076, 697 + 24 * i], [1145, 678 + 24 * i]],
    [[1145, 678 + 24 * i], [1190, 665 + 24 * i], [1178, 509 + 14 * i], rim(arteryOptic, 149 - 19 * i)],
  ]);
  const ileumRadius = organ.dimensions.ileum * organ.scale / 2;
  const ileumBottom = Math.max(...ileum.map(point => point[1])) + ileumRadius;
  const ileumSamplingError = 3 * Math.hypot(ILEOCECAL_BOX.width, ILEOCECAL_BOX.height) * organ.scale / (2 * ileumSteps);
  // All control points of the zoom-dependent third blue segments are on or right of x=1145.
  const blueSuffixGap = 1145 - Math.max(...ileum.map(point => point[0])) - ileumSamplingError - ileumRadius - 1;
  const guideClearance = Math.min(blueSuffixGap, clearanceBound([...redCurves.flat(), ...bluePrefixes.flat()],
    ileum, ileumRadius, ileumSamplingError));
  if (veinAnchor.y <= ileumBottom || guideClearance <= 2) throw new Error('S17 vessel guides intersect the terminal ileum');
  const audit = { source: { x: organ.thrombusX, y: organ.thrombusY }, veinAnchor, ileumBottom, guideClearance,
    optic, arteryOptic, ileum, walls: compressionSites, ileumRadius };
  return {
    paint: patent.paint + `<defs>
      <clipPath id="s17-gross-clot-mask"><ellipse id="s17-gross-clot-aperture"/></clipPath>
      </defs><g id="s17-clot-layer" clip-path="url(#s17-gross-clot-mask)">${organ.paint}</g>
      <g id="s17-right-insets"><g id="s17-arterial-inset">${artery.paint}</g>
      <g id="s17-magnification">${lens.paint}</g></g>`,
    lettering: `
      <text class="note title" x="800" y="121" text-anchor="middle" font-size="32" fill="#1F1C19">急性化脓性阑尾炎</text>
      <text id="s17-gross" class="note" x="800" y="804" text-anchor="middle" font-size="26"
        fill="#1F1C19" style="font-weight:750">浆膜灰黄脓苔与显著肿胀</text>
      <g id="s17-right-labels">
      <g id="s17-arterial-guides" fill="none" stroke="#C43428" stroke-width="2" stroke-linecap="round" stroke-dasharray="7 7">
        ${redCurves.map(route => `<path d="${pathOf(route)}"/>`).join('')}
        ${compressionSites.map(({ x, y }) => `<circle cx="${x}" cy="${y}" r="3.6" fill="#F5F1E9" stroke-dasharray="none"/>`).join('')}
      </g>
      <g id="s17-tangents" fill="none" stroke="#2F5D7C" stroke-width="2" stroke-linecap="round" stroke-dasharray="7 7">
        <path/><path/>
        <circle cx="${veinAnchor.x}" cy="${veinAnchor.y}" r="4.4" stroke-dasharray="none"/>
      </g>
      <g id="s17-arterial-label" class="note" text-anchor="middle">
        <text x="${arteryOptic.x}" y="63" font-size="31" fill="#8D342F" style="font-weight:800">阑尾壁动脉受压</text>
        <text x="${arteryOptic.x}" y="95" font-size="23" fill="#614C44">肿胀管壁使动脉变窄</text>
      </g>
      <g id="s17-venous-label" class="note" text-anchor="middle">
        <text x="${optic.x}" y="714" font-size="31" fill="#2F5D7C" style="font-weight:800">阑尾系膜静脉血栓</text>
        <text x="${optic.x}" y="747" font-size="24" fill="#536371">血栓堵腔 · 回流受阻</text>
      </g>
      <text id="s17-label" class="note" x="1466" y="829" text-anchor="middle" font-size="34"
        fill="${RED}" style="font-weight:800">动静脉双重受阻 → 阑尾缺血、坏死</text></g>`,
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
      const exit = phase(p, .92, 1);
      opacity(art, 's17-right-insets', 1 - exit);
      opacity(labels, 's17-right-labels', 1 - exit);
      const complete = p >= .92;
      const clotLayer = art.querySelector('#s17-clot-layer');
      if (complete) clotLayer.removeAttribute('clip-path');
      else clotLayer.setAttribute('clip-path', 'url(#s17-gross-clot-mask)');
      opacity(art, 's17-patent', Number(!complete));
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
        path.setAttribute('d', pathOf(blueCurves(i, zoom)));
      });
      const wallGuides = labels.querySelector('#s17-arterial-guides');
      wallGuides.setAttribute('opacity', .72 * phase(p, .15, .38));
      opacity(labels, 's17-gross', phase(p, .04, .22));
      opacity(labels, 's17-venous-label', phase(p, .36, .57));
      opacity(labels, 's17-label', phase(p, .64, .82));
    },
  };
}
