import { NS } from '../../shared/canvasCore.js';
import { createCTAsset, CT_ROI, CT_ZOOM } from '../../shared/ctRenderer.js';
import { CT } from '../../shared/detail/ct.js';
import { appear, label, penProgress } from './scene-tools.js';

const filmScale = 570 / CT.width;
export const mainBox = Object.freeze({ x: 776, y: 244, width: CT.width * filmScale, height: CT.height * filmScale });
const zoomHeight = CT_ROI.height * CT_ZOOM * filmScale;
export const zoomBox = Object.freeze({
  x: 1430, y: mainBox.y + (mainBox.height - zoomHeight) / 2,
  width: CT_ROI.width * CT_ZOOM * filmScale, height: zoomHeight,
});
const ink = '#A24336';
const connectorInk = '#AF4E43';
const noteX = 1000;
const mainBottom = mainBox.y + mainBox.height;
const zoomBottom = zoomBox.y + zoomBox.height;
const anchors = [
  [[193, 147], [238, 197]],
  [[175, 130], [229, 169]],
  [[201, 155], [264, 165]],
];

function place(source, box) {
  const sx = box.width / source.width;
  const sy = box.height / source.height;
  return {
    transform: `matrix(${sx} 0 0 ${sy} ${box.x - source.x * sx} ${box.y - source.y * sy})`,
    point: (x, y) => [box.x + (x - source.x) * sx, box.y + (y - source.y) * sy],
  };
}

function bounds(name, { x, y, width, height }) {
  return `<rect data-ct-box="${name}" x="${x}" y="${y}" width="${width}" height="${height}" fill="none"/>`;
}

function nativeStudy(document, asset) {
  const host = document.createElementNS(NS, 'g');
  host.innerHTML = asset.paint;
  asset.mount(host);
  const native = host.firstElementChild;
  const [axial, fossa, roi, , zoom, outline] = native.children;
  if (fossa?.localName !== 'foreignObject' || roi?.localName !== 'rect' || zoom?.localName !== 'foreignObject') {
    throw new Error('The frozen CT asset layout changed');
  }
  return { axial, fossa, roi, zoom, outline };
}

function panel(art, placement, ...contents) {
  const group = art.ownerDocument.createElementNS(NS, 'g');
  group.setAttribute('transform', placement.transform);
  group.append(...contents);
  art.append(group);
}

function blendCanvases(source) {
  const placeholder = source[0].cloneNode(true);
  placeholder.removeAttribute('id');
  placeholder.removeAttribute('data-drawn');
  const inputs = source.map(item => item.firstElementChild);
  const canvas = placeholder.firstElementChild;
  const ctx = canvas.getContext('2d');
  let last;
  return {
    placeholder,
    draw(weights) {
      const key = weights.join(',');
      if (key === last) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Add premultiplied weights so the two opaque films remain opaque during a dissolve.
      ctx.globalCompositeOperation = 'lighter';
      inputs.forEach((input, i) => {
        if (!weights[i]) return;
        ctx.globalAlpha = weights[i];
        ctx.drawImage(input, 0, 0);
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      last = key;
    },
  };
}

function zoomPoint([x, y]) {
  return [zoomBox.x + x * zoomBox.width / Math.round(CT_ROI.width * CT_ZOOM),
    zoomBox.y + y * zoomBox.height / Math.round(CT_ROI.height * CT_ZOOM)];
}

function lowerLeader(anchor, end) {
  const [x, y] = zoomPoint(anchor);
  const edge = Math.round(zoomBox.x + zoomBox.width + 16);
  return `M${x} ${y} C${x + 46} ${y + 12} ${edge} ${zoomBottom - 18} ${edge} ${zoomBottom + 20}
    V789 Q${edge} 802 ${edge - 13} 802 H${end}`;
}

function leaderGroup(index, lines) {
  const [[ax, ay], [bx, by]] = anchors[index].map(zoomPoint);
  const one = `M${ax} ${ay} C${ax - 25} ${ay + 36} 1483 ${zoomBottom + 16} 1410 ${mainBottom + 17}
    C1366 ${mainBottom + 39} 1150 704 995 704 Q973 704 973 726 V734 Q973 741 983 741`;
  const two = lowerLeader(anchors[index][1], 1410);
  return `<g data-ct-notes="${index}">
    <g fill="none" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">
      <path data-ct-line="0" d="${one}" pathLength="1" stroke-dasharray="1"/>
      <path data-ct-line="1" d="${two}" pathLength="1" stroke-dasharray="1"/>
      <circle cx="${ax}" cy="${ay}" r="2.8" fill="${ink}" stroke="none"/>
      <circle cx="${bx}" cy="${by}" r="2.8" fill="${ink}" stroke="none"/>
    </g>
    ${label(lines[0], noteX, 751, { size: 29, anchor: 'start' })}
    ${label(lines[1], noteX, 811, { size: 29, anchor: 'start' })}
  </g>`;
}

export function axialComparison(stage, cases) {
  const assets = cases.map(({ stage }, i) => createCTAsset({ id: `s115-ct-${i}`, stage }));
  for (const [i, asset] of assets.entries()) {
    if (!asset.audit.sameSource || asset.zoomFactor !== 2.4 || asset.audit.noise.effectiveSigma <= 0
      || asset.audit.gasBubbles !== (i === 2 ? 4 : 0)) throw new Error('Invalid frozen CT diagnostics');
  }
  const art = stage.paint(`${bounds('main', mainBox)}${bounds('zoom', zoomBox)}`);
  const studies = assets.map(asset => nativeStudy(art.ownerDocument, asset));
  const fossa = blendCanvases(studies.map(study => study.fossa));
  const closeup = blendCanvases(studies.map(study => study.zoom));
  fossa.placeholder.setAttribute('data-ct-scan', 'fossa');
  closeup.placeholder.setAttribute('data-ct-scan', 'inset');
  const { axial, roi, outline } = studies[0];
  const main = place(assets[0].main, mainBox);
  const inset = place(assets[0].zoom, zoomBox);
  roi.setAttribute('data-ct-roi', '');
  panel(art, main, axial, fossa.placeholder, roi);
  panel(art, inset, closeup.placeholder, outline);
  const type = stage.lettering(`
    <g data-ct-guides fill="none" stroke="${connectorInk}" stroke-width="2.4" stroke-dasharray="7 6"><path/><path/></g>
    ${label('增强轴位 CT 示意 · 图像左侧 R 为患者右侧', 1260, 190, { size: 25 })}
    ${label('影像辅助判断严重程度 · 亚型由病理判定', 1260, 222, { size: 21, weight: 550 })}
    <g data-ct-orientation>${assets[0].lettering}</g>
    ${cases.map(({ lines }, i) => leaderGroup(i, lines)).join('')}`);

  const [right, left, zoomTitle] = type.querySelectorAll('[data-ct-orientation] text');
  right.setAttribute('x', mainBox.x + 16);
  left.setAttribute('x', mainBox.x + mainBox.width - 16);
  for (const letter of [right, left]) {
    letter.setAttribute('y', mainBox.y + 16);
    letter.setAttribute('dominant-baseline', 'text-before-edge');
  }
  zoomTitle.dataset.zoomTitle = '';
  zoomTitle.setAttribute('x', zoomBox.x + zoomBox.width / 2);
  zoomTitle.setAttribute('y', zoomBox.y - 12);
  zoomTitle.setAttribute('font-size', 22);
  zoomTitle.setAttribute('font-weight', 690);
  zoomTitle.style.fontFamily = 'var(--text)';
  zoomTitle.setAttribute('fill', '#4E4842');
  zoomTitle.textContent = '右髂窝 · 2.4× 局部放大';

  const notes = [...type.querySelectorAll('[data-ct-notes]')];
  const paths = notes.map(group => [...group.querySelectorAll('[data-ct-line]')]);
  const lowerLabels = notes.map(group => group.querySelector('text:last-child'));
  const drawnGeometry = new Set();
  const guide = type.querySelector('[data-ct-guides]');
  const [upperTrace, lowerTrace] = guide.querySelectorAll('path');
  const center = [CT_ROI.x + CT_ROI.width / 2, CT_ROI.y + CT_ROI.height / 2];
  return ({ current, weights, noteOpacity, drawIn, elapsed, visibility }) => {
    fossa.draw(weights);
    closeup.draw(weights);
    art.dataset.ctStage = String(current);
    art.setAttribute('opacity', visibility);
    type.setAttribute('opacity', visibility);

    const breath = Math.sin(elapsed * 2.35);
    const pulse = 1 + .018 * breath;
    roi.setAttribute('transform', `translate(${center.join(' ')}) scale(${pulse}) translate(${-center[0]} ${-center[1]})`);
    roi.setAttribute('opacity', .86 + .12 * breath);
    const [rx, top] = main.point(center[0] + pulse * CT_ROI.width / 2, center[1] - pulse * CT_ROI.height / 2);
    const [, bottom] = main.point(center[0] + pulse * CT_ROI.width / 2, center[1] + pulse * CT_ROI.height / 2);
    upperTrace.setAttribute('d', `M${rx} ${top} L${zoomBox.x} ${zoomBox.y + 13}`);
    lowerTrace.setAttribute('d', `M${rx} ${bottom} L${zoomBox.x} ${zoomBox.y + zoomBox.height - 13}`);
    guide.setAttribute('stroke-dashoffset', -(2.8 * elapsed % 13));
    guide.setAttribute('opacity', .72 + .06 * breath);

    notes.forEach((group, i) => group.toggleAttribute('hidden', i !== current));
    const [wall, surrounding] = paths[current];
    if (!drawnGeometry.has(current)) {
      const end = Math.min(zoomBox.x + zoomBox.width, noteX + lowerLabels[current].getComputedTextLength() + 17);
      surrounding.setAttribute('d', lowerLeader(anchors[current][1], end));
      drawnGeometry.add(current);
    }
    notes[current].setAttribute('opacity', noteOpacity);
    penProgress(wall, drawIn);
    penProgress(surrounding, appear(drawIn, .08, 1));
  };
}
