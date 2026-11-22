import { NS } from '../../shared/canvasCore.js';
import { createCTAsset, CT_ROI, CT_ZOOM } from '../../shared/ctRenderer.js';
import { appear, label, penProgress } from './scene-tools.js';

export const mainBox = Object.freeze({ x: 800, y: 245, width: 520, height: 400 });
export const zoomBox = Object.freeze({ x: 1365, y: 245, width: 445, height: 400 });
const ink = '#BB4136';
const connectorInk = '#C9473B';
const noteX = 1135;
const anchors = [
  [[193, 155], [238, 197]],
  [[185, 147], [229, 169]],
  [[201, 155], [262, 162]],
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

function leaderGroup(index, lines) {
  const [[ax, ay], [bx, by]] = anchors[index].map(zoomPoint);
  const one = `M${ax} ${ay} L1423 653 L1110 703 V741 H1124`;
  const two = `M${bx} ${by} L1790 621 V797`;
  return `<g data-ct-notes="${index}">
    <g fill="none" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">
      <path data-ct-line="0" d="${one}" pathLength="1" stroke-dasharray="1"/>
      <path data-ct-line="1" d="${two}" pathLength="1" stroke-dasharray="1"/>
      <circle cx="${ax}" cy="${ay}" r="2.8" fill="${ink}" stroke="none"/>
      <circle cx="${bx}" cy="${by}" r="2.8" fill="${ink}" stroke="none"/>
    </g>
    ${label(lines[0], noteX, 750, { size: 28, anchor: 'start' })}
    ${label(lines[1], noteX, 806, { size: 28, anchor: 'start' })}
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
  const { axial, roi, outline } = studies[0];
  const main = place(assets[0].main, mainBox);
  const inset = place(assets[0].zoom, zoomBox);
  roi.setAttribute('data-ct-roi', '');
  panel(art, main, axial, fossa.placeholder, roi);
  panel(art, inset, closeup.placeholder, outline);
  const type = stage.lettering(`
    <g data-ct-guides fill="none" stroke="${connectorInk}" stroke-width="2.4" stroke-dasharray="7 6"><path/><path/></g>
    ${label('轴位 CT · 右髂窝（图像左侧 R 为患者右侧）', 1305, 196, { size: 25 })}
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
    upperTrace.setAttribute('d', `M${rx} ${top} L1320 333 L1364 289`);
    lowerTrace.setAttribute('d', `M${rx} ${bottom} L1320 566 L1364 605`);
    guide.setAttribute('stroke-dashoffset', -((elapsed * 13) % 13));
    guide.setAttribute('opacity', .73 + .13 * breath);

    notes.forEach((group, i) => group.toggleAttribute('hidden', i !== current));
    const [wall, surrounding] = paths[current];
    if (!drawnGeometry.has(current)) {
      const end = Math.min(1781, noteX + lowerLabels[current].getComputedTextLength() + 14);
      surrounding.setAttribute('d', `M${zoomPoint(anchors[current][1]).join(' ')} L1790 621 V797 H${end}`);
      drawnGeometry.add(current);
    }
    notes[current].setAttribute('opacity', noteOpacity);
    penProgress(wall, drawIn);
    penProgress(surrounding, appear(drawIn, .08, 1));
  };
}
