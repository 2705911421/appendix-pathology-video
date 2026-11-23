import { getStroke } from 'perfect-freehand';
import { createStoryWindow, drawStageDots, STAGE_DOT_CENTERS, STAGE_DOT_Y } from '../../shared/leftFloatNotes.js';
import { RED, closedCurve, fillPath, lerp, samplePath } from '../../shared/canvasCore.js';
import { logicalContext, sizeRaster } from '../../shared/detail/raster.js';
import { drawMinimalPatient } from '../../shared/minimalistCharacters.js';
import { phase } from '../../shared/timelineHelper.js';
import { tracedInk, traceTo } from './motion.js';

const helpLines = [
  { text: '腹痛转移到右下腹，或持续加重', y: 365, size: 37, color: '#1F1C19', start: .30, end: .43 },
  { text: '尤其伴发热或腹部拒按', y: 422, size: 30, color: '#5C564E', start: .36, end: .47 },
  { text: '尽快就医', y: 500, size: 48, color: RED, start: .43, end: .55 },
];
const warmStroke = 'M1332 522 C1403 515 1496 522 1584 517';
const patientBox = { x: 402, y: 236, width: 518, height: 600 };
const patient = { x: 649, y: 267, scale: 1.55, pose: 'recovered' };

function morningLight() {
  return `<defs>
    <linearGradient id="s25-ray-pigment" gradientUnits="userSpaceOnUse" x1="255" y1="263" x2="752" y2="432">
      <stop stop-color="#AC8054"/><stop offset=".42" stop-color="#C0A071" stop-opacity=".74"/>
      <stop offset="1" stop-color="#C0A071" stop-opacity="0"/>
    </linearGradient>
    <filter id="s25-ray-edge" x="-.18" y="-.33" width="1.36" height="1.66" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="17"/>
    </filter>
  </defs>
  <g id="s25-light" opacity=".07">
    <path d="M275 244 Q485 275 753 414 L722 474 Q454 352 275 278Z"
      fill="url(#s25-ray-pigment)" filter="url(#s25-ray-edge)"/>
  </g>`;
}

function swatchRecap() {
  const dots = drawStageDots({ stage: null });
  return {
    paint: STAGE_DOT_CENTERS.map((x, i) => `<defs><clipPath id="s25-dot-crop-${i}">
      <rect x="${x - 25}" y="${STAGE_DOT_Y - 27}" width="50" height="55"/></clipPath></defs>
      <g id="s25-dot-${i}" clip-path="url(#s25-dot-crop-${i})">${dots.paint}</g>`).join(''),
    lettering: dots.lettering,
    update(art, p) {
      for (const [i] of STAGE_DOT_CENTERS.entries()) {
        const hit = .085 + i * .166;
        const pulse = phase(p, hit, hit + .115) * (1 - .39 * phase(p, hit + .12, hit + .30));
        art.querySelector(`#s25-dot-${i}`).setAttribute('opacity', .23 + .76 * pulse);
      }
    },
  };
}

function pressureUnderline() {
  const points = samplePath(warmStroke, 5).map(([x, y], i) => [x, y, .60 + .19 * Math.sin(i * .46)]);
  const outline = getStroke(points, { size: 6.4, thinning: .56, simulatePressure: false, last: true,
    start: { taper: 18 }, end: { taper: 22 } });
  return tracedInk('s25-underline', warmStroke, fillPath(closedCurve(outline), RED, .88), 18);
}

export function homecoming() {
  const window = createStoryWindow({ id: 's25-daybreak', phase: 0, y: 159 });
  const dots = swatchRecap();
  const { x, y, width, height } = patientBox;
  let portrait;
  return {
    paint: window.paint + dots.paint + morningLight() + `
      <foreignObject id="s25-minimal-patient" x="${x}" y="${y}" width="${width}" height="${height}">
        <canvas xmlns="http://www.w3.org/1999/xhtml" width="${width}" height="${height}"
          style="display:block;width:100%;height:100%"></canvas>
      </foreignObject>`,
    lettering: dots.lettering + helpLines.map((line, i) => `
      <text id="s25-action-${i}" class="note" x="1458" y="${line.y}" font-size="${line.size}" fill="${line.color}"
        text-anchor="middle" style="font-weight:${i === 2 ? 850 : 800}">${line.text}</text>`).join('') + pressureUnderline(),
    mount(art) {
      portrait = logicalContext(sizeRaster(art.querySelector('#s25-minimal-patient canvas'), width, height));
    },
    update(art, labels, p) {
      dots.update(art, p);
      portrait.clearRect(0, 0, width, height);
      portrait.save();
      portrait.translate(-x, -y);
      drawMinimalPatient(portrait, { ...patient, breathPhase: p * 2 * Math.PI * 3.15 });
      portrait.restore();
      art.querySelector('#s25-light').setAttribute('opacity', lerp(.040, .07, phase(p, .04, .49)));
      for (const [i, line] of helpLines.entries()) {
        const entered = phase(p, line.start, line.end);
        const element = labels.querySelector(`#s25-action-${i}`);
        element.setAttribute('opacity', entered);
        element.setAttribute('transform', `translate(0 ${6 * (1 - entered)})`);
      }
      traceTo(labels, 's25-underline', phase(p, .46, .60));
    },
  };
}
