import { createIleocecalAsset, ILEOCECAL_BOX, makeCanvas, terminalIleumPoint } from '../../shared/anatomyWatercolor.js';
import { RED, arrow, ease, ink, lerp } from '../../shared/canvasCore.js';
import { drawRaster, drawRasterCrop, logicalContext, logicalSize, rasterScale, sizeRaster } from '../../shared/detail/raster.js';
import { phase } from '../../shared/timelineHelper.js';
import { scaleAround, settleScale, tracedInk, traceTo } from './motion.js';

const charcoal = '#1F1C19';

export function chronicNotes() {
  return {
    paint: '',
    lettering: `<g>
      <text class="note note-acute" x="73" y="515" font-size="22" fill="${RED}" style="font-weight:750">急性期：变质 + 渗出</text>
      <text class="note note-chronic" data-entry-part="chronic" x="73" y="578" font-size="22" fill="${RED}"
        style="font-weight:750">慢性期：修复性增生</text>
    </g>`,
  };
}

function evolution() {
  const ink = { color: charcoal, size: 2.9, head: 13, opacity: .91 };
  return `<g id="s23-evolution" data-entry-part="chronic" transform="translate(1090 115)" fill="${charcoal}" text-anchor="middle">
    <text class="note" x="-312" y="0" font-size="30" fill="${charcoal}" style="font-weight:750">慢性阑尾炎</text>
    ${arrow('M-165 -10 Q-120 -13 -72 -10', ink)}
    <text class="note" x="-118" y="-26" font-size="19" fill="#695950">可表现为</text>
    <text class="note" x="143" y="0" font-size="28" fill="${charcoal}">反复或持续右下腹痛</text>
  </g>`;
}

function callout(id, text, x, y, path, color = charcoal) {
  const stroke = arrow(path, { color, size: 2.85, head: 13, opacity: .86 });
  return `${tracedInk(id, path, stroke, 38)}
    <text id="${id}-caption" class="note callout" x="${x}" y="${y}" font-size="26" fill="${color}"
      style="font-weight:750">${text}</text>`;
}

function specimenLayers(specimen, art) {
  specimen.mount(art);
  const shown = art.querySelector('#s23-specimen-body canvas');
  const { width, height } = logicalSize(shown);
  const display = logicalContext(shown);
  const { centre: [x, y], anchor: [sx, sy], diameter } = specimen.audit.crossSection;
  const half = diameter / 2;
  const center = (diameter + 6) / 2;
  const insetCanvas = sizeRaster(art.querySelector('#s23-cross-section canvas'), center * 2, center * 2);
  Object.assign(insetCanvas.style, { width: '100%', height: '100%' });
  const inset = logicalContext(insetCanvas);
  drawRaster(inset, shown, center - x, center - y);
  inset.globalCompositeOperation = 'destination-in';
  inset.beginPath();
  inset.arc(center, center, half + .25, 0, 2 * Math.PI);
  inset.fill();

  const base = makeCanvas(width, height);
  const clean = logicalContext(base, { willReadFrequently: true });
  drawRaster(clean, shown);
  clean.globalCompositeOperation = 'destination-out';
  clean.beginPath();
  clean.arc(x, y, half + 1.4, 0, 2 * Math.PI);
  clean.fill();
  clean.globalCompositeOperation = 'source-over';

  // Remove the old connector from the transparent paper around the specimen.
  const guide = logicalContext(makeCanvas(width, height), { willReadFrequently: true });
  guide.lineWidth = 5;
  guide.stroke(new Path2D(`M${sx + 4} ${sy + 7} Q${sx + 44} ${sy + 49} ${x - half * .79} ${y - half * .57}`));
  const pixels = clean.getImageData(0, 0, base.width, base.height);
  const guidePixels = guide.getImageData(0, 0, base.width, base.height).data;
  for (let i = 3; i < guidePixels.length; i += 4) {
    if (guidePixels[i] > 0 && pixels.data[i] < 230) pixels.data[i] = 0;
  }
  clean.putImageData(pixels, 0, 0);

  const tint = makeCanvas(width, height);
  const tintContext = logicalContext(tint);
  tintContext.strokeStyle = '#7D2734';
  tintContext.lineWidth = 21;
  tintContext.lineCap = 'round';
  tintContext.filter = `blur(${2 * rasterScale(tint).x}px)`;
  tintContext.stroke(new Path2D('M238 330 C244 352 256 375 278 388 C307 407 346 425 380 418'));
  tintContext.filter = 'none';
  tintContext.globalCompositeOperation = 'destination-in';
  drawRaster(tintContext, base);

  const mixing = makeCanvas(width, height);
  const mix = logicalContext(mixing);
  let lastWeight;
  return weight => {
    if (weight === lastWeight) return;
    lastWeight = weight;
    display.clearRect(0, 0, width, height);
    if (weight === 0) {
      drawRaster(display, base);
      return;
    }
    mix.clearRect(0, 0, width, height);
    mix.globalAlpha = 1;
    drawRaster(mix, base);
    mix.globalAlpha = weight * .69;
    drawRaster(mix, tint);

    // Extend the distal ribbon slightly at onset, keeping the ileocecal junction fixed.
    const transitionRow = 367;
    const pivot = 235;
    drawRasterCrop(display, mixing, 0, 0, width, transitionRow, 0, 0, width, transitionRow);
    for (let row = transitionRow; row < height; row++) {
      const stretch = 1 + .09 * weight * ease((row - transitionRow) / 44);
      drawRasterCrop(display, mixing, 0, row, width, 1, pivot * (1 - stretch), row, width * stretch, 1);
    }
  };
}

export function chronicSpecimen() {
  const notes = chronicNotes();
  const scale = 1.38;
  const x = 960 - ILEOCECAL_BOX.width * scale / 2;
  const y = 485 - ILEOCECAL_BOX.height * scale / 2;
  const specimen = createIleocecalAsset({ id: 's23-specimen', stage: 'chronic', x, y, scale });
  const inset = specimen.audit.crossSection;
  const cross = [x + inset.centre[0] * scale + 6, y + inset.centre[1] * scale + 13];
  const insetSize = (inset.diameter + 6) * 1.61;
  const ileum = terminalIleumPoint(.18);
  const ileumTarget = [x + ileum.x * scale, y + ileum.y * scale];
  const wall = [x + (inset.anchor[0] - 5) * scale, y + (inset.anchor[1] + 7) * scale];
  const linkStart = [x + (inset.anchor[0] + 4) * scale, y + (inset.anchor[1] + 7) * scale];
  const linkPath = `M${linkStart.join(' ')} Q${linkStart[0] + 60} ${linkStart[1] + 72}
    ${cross[0] - 49} ${cross[1] - 42}`;
  const link = `<path d="${linkPath}" fill="none" stroke="#84675D" stroke-width="1.7"
    stroke-dasharray="5 5" stroke-linecap="round" opacity=".80"/>`;
  const insetEmphasis = 'M1202 850 C1326 847 1482 849 1617 851';
  let colorSpecimen;
  const marks = [
    ['cecum', .06, .20], ['ileum', .17, .31], ['mesentery', .28, .44],
    ['wall', .38, .57], ['inset', .53, .75],
  ];

  return {
    paint: notes.paint + `<g id="s23-body" data-entry-part="subject">${specimen.paint}
      ${tracedInk('s23-link', linkPath, link, 12)}
      <g id="s23-cross-section">
        <foreignObject x="${cross[0] - insetSize / 2}" y="${cross[1] - insetSize / 2}" width="${insetSize}" height="${insetSize}">
          <canvas xmlns="http://www.w3.org/1999/xhtml" width="${insetSize}" height="${insetSize}"
            style="display:block;width:100%;height:100%"></canvas>
        </foreignObject>
      </g></g>`,
    lettering: `<g data-entry-part="notes">${notes.lettering}</g><g id="s23-labels" data-entry-part="subject">${evolution()}
        ${callout('s23-cecum', '盲肠', 556, 547, 'M617 549 Q673 541 730 566')}
        ${callout('s23-ileum', '回肠末端', 1176, 442, `M1225 459 Q1259 494 ${ileumTarget.join(' ')}`)}
        ${callout('s23-mesentery', '系膜纤维化牵拉', 1280, 655, 'M1262 646 C1156 652 1094 642 1009 623')}
        ${callout('s23-wall', '苍白管壁明显增厚僵硬', 559, 767, `M829 754 C880 754 914 731 ${wall.join(' ')}`)}
        ${callout('s23-inset', '横切面 · 纤维化厚壁、狭窄星形管腔', 1200, 835,
          `M1186 827 Q1148 836 ${cross[0] + 53} ${cross[1] + 11}`, RED)}
        ${tracedInk('s23-inset-emphasis', insetEmphasis, ink(insetEmphasis,
          { color: RED, size: 3.7, opacity: .78, taperStart: 6, taperEnd: 11 }), 18)}
      </g>`,
    mount(art) {
      colorSpecimen = specimenLayers(specimen, art);
    },
    update(art, labels, p) {
      colorSpecimen(1 - phase(p, 0, .55));
      const insetProgress = Math.max(0, Math.min(1, (p - .37) / .43));
      const detail = art.querySelector('#s23-cross-section');
      detail.setAttribute('transform', scaleAround(...cross, settleScale(insetProgress, .12)));
      detail.setAttribute('opacity', phase(p, .37, .56));
      traceTo(art, 's23-link', phase(p, .39, .66));
      traceTo(labels, 's23-inset-emphasis', phase(p, .68, .99));
      for (const [name, start, end] of marks) {
        traceTo(labels, `s23-${name}`, phase(p, start, end));
        labels.querySelector(`#s23-${name}-caption`).setAttribute('opacity', phase(p, start + .03, end));
      }
    },
  };
}
