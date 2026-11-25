import { NS } from '../../shared/canvasCore.js';
import { createCTAsset, CT_ROI, CT_ZOOM } from '../../shared/ctRenderer.js';
import { CT } from '../../shared/detail/ct.js';
import { label } from './scene-tools.js';

const filmScale = 570 / CT.width;
export const mainBox = Object.freeze({ x: 776, y: 244, width: CT.width * filmScale, height: CT.height * filmScale });
const zoomHeight = CT_ROI.height * CT_ZOOM * filmScale;
export const zoomBox = Object.freeze({
  x: 1430, y: mainBox.y + (mainBox.height - zoomHeight) / 2,
  width: CT_ROI.width * CT_ZOOM * filmScale, height: zoomHeight,
});
const connectorInk = '#AF4E43';
const noteX = 1000;
const insetAnnotations = [
  [
    ['管壁轻增粗', [187, 137], [31, 50], [123, 72]],
    ['脂肪清晰', [244, 200], [219, 265], [282, 228]],
  ],
  [
    ['双环靶征', [177, 127], [30, 52], [125, 87]],
    ['偏心粪石', [186, 140], [217, 74], [227, 98]],
    ['脂肪条索', [222, 178], [210, 255], [253, 219]],
  ],
  [
    ['壁强化缺损', [201, 153], [31, 49], [114, 90]],
    ['盲肠旁脓肿', [240, 157], [188, 259], [287, 213]],
    ['游离气体', [245, 143], [202, 55], [300, 100]],
  ],
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

function insetArrows(index) {
  return insetAnnotations[index].map(([text, feature, position, knee]) => {
    const [desiredX, y] = zoomPoint(position);
    const fontSize = 17;
    const x = Math.max(zoomBox.x + 16, Math.min(desiredX, zoomBox.x + zoomBox.width - 16 - fontSize * text.length));
    const [tx, ty] = zoomPoint(feature);
    const [kx, ky] = zoomPoint(knee);
    const theta = Math.atan2(ty - ky, tx - kx);
    const wings = [-.56, .56].map(a => [tx - 5 * Math.cos(theta + a), ty - 5 * Math.sin(theta + a)]);
    const startX = x + fontSize * text.length * .55;
    return `<g data-ct-inset-arrow>
      <path d="M${startX} ${y + 5} L${kx} ${ky} L${tx} ${ty} M${wings[0].join(' ')} L${tx} ${ty} L${wings[1].join(' ')}"
        fill="none" stroke="#F5DF9C" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="${x}" y="${y}" font-size="${fontSize}" fill="#FFFFFF" stroke="#161310"
        stroke-width="2" stroke-linejoin="round" paint-order="stroke" style="font-family:var(--text);font-weight:820">${text}</text>
    </g>`;
  }).join('');
}

function leaderGroup(index, lines) {
  return `<g data-ct-notes="${index}">
    ${label(lines[0], noteX, 751, { size: 29, anchor: 'start' })}
    ${label(lines[1], noteX, 808, { size: 28, weight: 600, anchor: 'start' })}
    ${insetArrows(index)}
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
  const guide = type.querySelector('[data-ct-guides]');
  const [upperTrace, lowerTrace] = guide.querySelectorAll('path');
  const center = [CT_ROI.x + CT_ROI.width / 2, CT_ROI.y + CT_ROI.height / 2];
  return ({ current, weights, noteOpacity, elapsed, visibility }) => {
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
    notes[current].setAttribute('opacity', noteOpacity);
  };
}
