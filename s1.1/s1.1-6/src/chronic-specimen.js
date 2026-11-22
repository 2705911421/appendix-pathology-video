import { createIleocecalAsset, ILEOCECAL_BOX, makeCanvas } from '../../shared/anatomyWatercolor.js';
import { drawStageDots } from '../../shared/leftFloatNotes.js';
import { RED, arrow, ease, lerp } from '../../shared/canvasCore.js';
import { drawRaster, drawRasterCrop, logicalContext, logicalSize, rasterScale, sizeRaster } from '../../shared/detail/raster.js';
import { phase } from '../../shared/timelineHelper.js';
import { scaleAround, settleScale, tracedInk, traceTo } from './motion.js';

const charcoal = '#1F1C19';

export function chronicNotes() {
  const dots = drawStageDots({ mode: 'chronic', y: 240, showStatus: false });
  return {
    paint: `<g class="chronic-swatches" opacity=".25" style="filter:grayscale(1)">${dots.paint}</g>`,
    lettering: dots.lettering + `<g>
      <text class="note note-acute" x="73" y="398" font-size="22" fill="${RED}" style="font-weight:750">急性期：变质 + 渗出</text>
      <g class="note-arrow">${arrow('M83 424 C77 444 79 458 82 470', { color: '#8B7B70', size: 2.4, head: 12 })}</g>
      <text class="note note-chronic" x="73" y="515" font-size="22" fill="${RED}" style="font-weight:750">慢性期：出现“增生”</text>
    </g>`,
  };
}

function evolution() {
  const ink = { color: charcoal, size: 2.9, head: 13, opacity: .91 };
  return `<g id="s23-evolution" transform="translate(1090 115)" fill="${charcoal}" text-anchor="middle">
    <text class="note" x="-258" y="0" font-size="30" fill="${charcoal}" style="font-weight:750">急性发作</text>
    <g id="s23-cycle">${arrow('M-174 -20 C-174 -33 -149 -42 -137 -25 C-126 -8 -142 7 -157 3 C-167 0 -168 -10 -162 -15', ink)}</g>
    <text class="note" x="-45" y="0" font-size="30" fill="${charcoal}" style="font-weight:750">反复拉锯</text>
    ${arrow('M42 -10 Q83 -14 132 -11', ink)}
    <text class="note" x="244" y="0" font-size="30" fill="${charcoal}" style="font-weight:750">慢性阑尾炎</text>
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
  const inset = logicalContext(sizeRaster(art.querySelector('#s23-cross-section canvas'), center * 2, center * 2));
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
  const cross = inset.centre.map((u, i) => [x, y][i] + u * scale);
  const insetSize = inset.diameter + 6;
  const wall = [x + (inset.anchor[0] - 5) * scale, y + (inset.anchor[1] + 7) * scale];
  const linkStart = [x + (inset.anchor[0] + 4) * scale, y + (inset.anchor[1] + 7) * scale];
  const linkPath = `M${linkStart.join(' ')} Q${linkStart[0] + 60} ${linkStart[1] + 72}
    ${cross[0] - 31} ${cross[1] - 24}`;
  const link = `<path d="${linkPath}" fill="none" stroke="#84675D" stroke-width="1.7"
    stroke-dasharray="5 5" stroke-linecap="round" opacity=".80"/>`;
  let colorSpecimen;
  const marks = [
    ['cecum', .06, .20], ['ileum', .17, .31], ['mesentery', .28, .44],
    ['wall', .38, .57], ['inset', .63, .88],
  ];

  return {
    paint: notes.paint + `<g id="s23-body">${specimen.paint}
      ${tracedInk('s23-link', linkPath, link, 12)}
      <g id="s23-cross-section">
        <foreignObject x="${cross[0] - insetSize / 2}" y="${cross[1] - insetSize / 2}" width="${insetSize}" height="${insetSize}">
          <canvas xmlns="http://www.w3.org/1999/xhtml" width="${insetSize}" height="${insetSize}"
            style="display:block;width:100%;height:100%"></canvas>
        </foreignObject>
      </g></g>`,
    lettering: notes.lettering + `<g id="s23-labels">${evolution()}
        ${callout('s23-cecum', '盲肠', 556, 547, 'M617 549 Q673 541 730 566')}
        ${callout('s23-ileum', '回肠末端', 1176, 442, 'M1225 459 Q1259 494 1207 540')}
        ${callout('s23-mesentery', '系膜纤维化牵拉', 1280, 605, 'M1262 596 C1181 579 1056 570 971 588')}
        ${callout('s23-wall', '苍白管壁明显增厚僵硬', 559, 767, `M829 754 C880 754 914 731 ${wall.join(' ')}`)}
        ${callout('s23-inset', '横切面：纤维化厚壁、管腔显著狭窄', 1195, 802,
          `M1180 791 C1147 799 1114 790 ${cross.join(' ')}`, RED)}
      </g>`,
    mount(art) {
      colorSpecimen = specimenLayers(specimen, art);
    },
    update(art, labels, p) {
      const leave = 1 - phase(p, .92, 1);
      art.querySelector('#s23-body').setAttribute('opacity', leave);
      labels.querySelector('#s23-labels').setAttribute('opacity', leave);
      colorSpecimen(1 - phase(p, 0, .55));
      labels.querySelector('#s23-cycle').setAttribute('transform', `rotate(${300 * p} -151 -13)`);
      for (const [selector, opacity] of [
        ['.note-acute', lerp(.58, 1, phase(p, 0, .13))],
        ['.note-arrow', phase(p, .07, .26)],
        ['.note-chronic', phase(p, .16, .37)],
      ]) labels.querySelector(selector).setAttribute('opacity', opacity);
      const insetProgress = Math.max(0, Math.min(1, (p - .45) / .45));
      const detail = art.querySelector('#s23-cross-section');
      detail.setAttribute('transform', scaleAround(...cross, settleScale(insetProgress, .12)));
      detail.setAttribute('opacity', phase(p, .45, .62));
      traceTo(art, 's23-link', phase(p, .46, .75));
      for (const [name, start, end] of marks) {
        traceTo(labels, `s23-${name}`, phase(p, start, end));
        labels.querySelector(`#s23-${name}-caption`).setAttribute('opacity', phase(p, start + .03, end));
      }
    },
  };
}
