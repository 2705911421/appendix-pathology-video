import { RED, clamp, lerp } from '../shared/canvasCore.js';
import { makeCanvas } from '../shared/anatomyWatercolor.js';
import { drawRaster, logicalContext, logicalSize, rasterScale } from '../shared/detail/raster.js';
import { drawStageSwatch } from '../shared/leftFloatNotes.js';
import { ruptureMist } from './rupture-mist.mjs';
import { centeredSpecimen, histologyLens, opacity, phase, scaleAround, setTangents, tangentPair } from './scene-tools.mjs';

const optic = { x: 1515, y: 415, radius: 215 };
const specimen = { cx: 760, cy: 475, scale: 1.28 };
const exudateBoost = 1.48;

function perforationSource(art, organ) {
  const canvas = art.querySelector('#s18-gangrene-body canvas');
  const scale = organ.scale;
  const x0 = Math.round((organ.appendixTip.x - organ.x) / scale) - 39;
  const y0 = Math.round((organ.appendixTip.y - organ.y) / scale) + 16;
  const density = rasterScale(canvas);
  const width = Math.round(27 * density.x);
  const height = Math.round(19 * density.y);
  const { data } = canvas.getContext('2d').getImageData(Math.round(x0 * density.x), Math.round(y0 * density.y), width, height);
  // The frozen rupture has a solid #22161B cavity at the distal lower wall.
  let count = 0;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] !== 34 || data[i + 1] !== 22 || data[i + 2] !== 27 || data[i + 3] !== 255) continue;
    const pixel = i / 4;
    sumX += x0 + (pixel % width + .5) / density.x;
    sumY += y0 + (Math.floor(pixel / width) + .5) / density.y;
    count++;
  }
  if (count < 8) throw new Error('No perforation cavity found in the frozen distal canvas');
  return { x: organ.x + scale * sumX / count, y: organ.y + scale * sumY / count };
}

function spreadingNecrosis(destination, gangrenous, organ, rupture) {
  const { width, height } = logicalSize(destination);
  const phlegmonous = makeCanvas(width, height);
  drawRaster(logicalContext(phlegmonous), destination);
  const necrotic = makeCanvas(width, height);
  drawRaster(logicalContext(necrotic), gangrenous);
  const blend = makeCanvas(width, height);
  const wash = logicalContext(blend);
  const out = logicalContext(destination);
  const localX = x => (x - organ.x) / organ.scale;
  const start = localX(organ.appendixBase.x) - 35;
  const breach = localX(rupture.x);
  return p => {
    out.clearRect(0, 0, width, height);
    if (p <= 0 || p >= .45) {
      drawRaster(out, p >= .45 ? necrotic : phlegmonous);
      return p >= .45 ? width : start;
    }
    const front = p < .40
      ? lerp(start, breach, clamp(p / .40) ** .91)
      : lerp(breach, localX(organ.appendixTip.x) + 68, phase(p, .40, .45));
    const gradient = out.createLinearGradient(front - 39, 0, front, 0);
    gradient.addColorStop(0, '#000');
    gradient.addColorStop(.37, 'rgba(0,0,0,.85)');
    gradient.addColorStop(1, 'transparent');
    wash.clearRect(0, 0, width, height);
    drawRaster(wash, necrotic);
    wash.globalCompositeOperation = 'destination-in';
    wash.fillStyle = gradient;
    wash.fillRect(0, 0, width, height);
    wash.globalCompositeOperation = 'source-over';

    // Add the complementary premultiplied layers to keep the shared anatomy opaque through the advancing edge.
    drawRaster(out, phlegmonous);
    out.globalCompositeOperation = 'destination-out';
    out.fillStyle = gradient;
    out.fillRect(0, 0, width, height);
    out.globalCompositeOperation = 'lighter';
    drawRaster(out, blend);
    out.globalCompositeOperation = 'source-over';
    return front;
  };
}

export function s18() {
  const swatch = drawStageSwatch({ stage: 'gangrene', y: 405 });
  const inflamed = centeredSpecimen({ ...specimen, id: 's18-inflamed', stage: 'phlegmon', showThrombus: true });
  const organ = centeredSpecimen({ ...specimen, id: 's18-gangrene', stage: 'gangrene', exudateBoost, showThrombus: true });
  const slide = histologyLens({ mode: 'gangrene', id: 's18-micro', ...optic });
  const mist = ruptureMist();
  const audit = { histology: slide.audit, optic, exudateBoost, plume: organ.audit };
  let paintInjury;
  return {
    paint: swatch.paint + inflamed.paint + organ.paint + mist.paint + `<g id="s18-inset">${slide.paint}</g>`,
    lettering: swatch.lettering + tangentPair('s18-tangents') + `
      <text id="s18-micro-title" class="note title" x="${optic.x}" y="167" text-anchor="middle"
        font-size="24" fill="#1F1C19">镜下：出血坏死与全层穿孔</text>
      <text id="s18-warning" class="note" x="${optic.x}" y="715" text-anchor="middle" font-size="32"
        fill="${RED}" style="font-weight:800">管壁坏死穿孔 → 弥漫性腹膜炎</text>`,
    audit,
    mount(art) {
      inflamed.mount(art);
      organ.mount(art);
      slide.mount(art);
      audit.source = perforationSource(art, organ);
      paintInjury = spreadingNecrosis(art.querySelector('#s18-inflamed-body canvas'),
        art.querySelector('#s18-gangrene-body canvas'), organ, audit.source);
      opacity(art, 's18-gangrene-body', 0);
      mist.mount(art, audit.source);
    },
    update(art, labels, p) {
      const front = paintInjury(p);
      art.querySelector('#s18-inflamed').dataset.necroticFront = front;
      organ.update(art, { time: Math.max(0, p - .40) * 13.5, exudateBoost });
      opacity(art, 's18-gangrene-bleed', phase(p, .407, .548));
      mist.update(p);

      const zoom = phase(p, .35, .71);
      const magnification = lerp(.78, 1, zoom) + .042 * Math.sin(Math.PI * zoom) * zoom ** 3;
      art.querySelector('#s18-inset').setAttribute('transform', scaleAround(optic.x, optic.y, magnification));
      opacity(art, 's18-inset', zoom);
      setTangents(labels, 's18-tangents', audit.source, { ...optic, radius: optic.radius * magnification },
        .87 * zoom * phase(p, .410, .56));
      opacity(labels, 's18-micro-title', phase(p, .46, .69));
      opacity(labels, 's18-warning', phase(p, .59, .81));
    },
  };
}
