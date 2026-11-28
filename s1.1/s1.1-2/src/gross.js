import flubber from 'flubber';
import {
  appendixCentreline, appendixWallRadius, correctAppendixPigment, createIleocecalAsset, ILEOCECAL_BOX,
  ileocecalDimensions, makeCanvas, PHLEGMON_CUT,
} from '../../shared/anatomyWatercolor.js';
import { clamp, closedCurve, ease, lerp, mulberry32 } from '../../shared/canvasCore.js';
import { drawRaster, logicalContext, rasterScale } from '../../shared/detail/raster.js';
import { calls, fill, glaze, inkReveal, stroke, trace, watercolor } from './brushwork.js';

export const SPECIMEN = Object.freeze({ x: 990, y: 450, scale: 1.40 });
export const LENS_SAMPLE = .61;
export const DIMENSIONS = Object.freeze(Object.fromEntries(
  ['normal', 'simple', 'phlegmon'].map(stage => [stage, ileocecalDimensions(stage)]),
));

const { width, height } = ILEOCECAL_BOX;

function position(u) {
  const [x, y, angle] = appendixCentreline('phlegmon', u);
  return { x, y, angle };
}

const guide = [{ u: 0, distance: 0, ...position(0) }];
for (let i = 1; i <= 512; i++) {
  const u = i / 512;
  const point = position(u);
  const before = guide.at(-1);
  guide.push({ u, distance: before.distance + Math.hypot(point.x - before.x, point.y - before.y), ...point });
}

function uAt(fraction) {
  const distance = clamp(fraction) * guide.at(-1).distance;
  const i = guide.findIndex(point => point.distance >= distance);
  if (i <= 0) return 0;
  const a = guide[i - 1];
  const b = guide[i];
  return lerp(a.u, b.u, (distance - a.distance) / (b.distance - a.distance));
}

function offset(u, normalDistance) {
  const { x, y, angle } = position(u);
  return { x: x - Math.sin(angle) * normalDistance, y: y + Math.cos(angle) * normalDistance, angle };
}

export const appendixPoint = (fraction, distance = 0) => offset(uAt(fraction), distance);

function radius(diameter, u) {
  return appendixWallRadius('phlegmon', diameter, u);
}

function ribbon(from, to, inner, outer, steps = 55) {
  const sample = distance => Array.from({ length: steps + 1 }, (_, i) => {
    const u = lerp(from, to, i / steps);
    const { x, y } = offset(u, distance(u, i / steps));
    return [x, y];
  });
  return closedCurve([...sample(inner), ...sample(outer).reverse()]);
}

const silhouette = diameter => ribbon(0, 1, u => -radius(diameter, u) - .8, u => radius(diameter, u) + .8);

export function projectAppendixSilhouette(project) {
  const edge = direction => Array.from({ length: 46 }, (_, i) => {
    const fraction = i / 45;
    const { x, y } = project(appendixPoint(fraction, direction * radius(DIMENSIONS.phlegmon.appendix, uAt(fraction))));
    return [x, y];
  });
  return closedCurve([...edge(1), ...edge(-1).reverse()]);
}

function modelPath(from, to, distance = () => 0, segments = 42) {
  return trace(Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments;
    const { x, y } = appendixPoint(lerp(from, to, t), distance(t));
    return [x, y];
  }));
}

export function mountSurface(asset) {
  const mount = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  mount.innerHTML = asset.paint;
  asset.mount(mount);
  return mount.querySelector('canvas');
}

function simpleGlaze(source) {
  const canvas = makeCanvas(width, height);
  const ctx = logicalContext(canvas);
  drawRaster(ctx, source);
  const diameter = DIMENSIONS.simple.appendix;
  const edge = u => radius(diameter, u);
  const coat = ribbon(.22, .999, u => -.93 * edge(u), u => .96 * edge(u));
  const wash = watercolor([213, 305, 233, 158], 66117, wet => {
    wet(coat, '#B83237', 153, .32, .77, .46);
    wet(ribbon(.26, .986, u => .06 * edge(u), u => edge(u)), '#8F283A', 134, .26, .78, .56);
  });
  ctx.save();
  ctx.clip(new Path2D(coat));
  ctx.globalCompositeOperation = 'multiply';
  fill(ctx, coat, '#BA4C4D', .37);
  ctx.globalAlpha = .56;
  glaze(ctx, wash);
  ctx.restore();
  return canvas;
}

function phlegmonFibers(source) {
  const canvas = makeCanvas(width, height);
  const ctx = logicalContext(canvas);
  drawRaster(ctx, source);
  const diameter = DIMENSIONS.phlegmon.appendix;
  const top = u => radius(diameter, u) * (-.77 + .13 * Math.sin(53 * u));
  const bottom = u => radius(diameter, u) * (.59 + .13 * Math.cos(37 * u));
  const coat = ribbon(.285, .990, top, bottom);
  const tint = watercolor([228, 329, 214, 139], 39174, wet => {
    wet(coat, '#D0BA78', 158, .50, .6, .4);
    wet(ribbon(.40, .979, u => top(u) * .62, u => bottom(u) * .65), '#E4D9AF', 130, .42, .6, .4);
  });
  const outline = new Path2D(silhouette(diameter));
  ctx.save();
  ctx.clip(outline);
  ctx.globalAlpha = .46;
  glaze(ctx, tint);
  ctx.globalAlpha = 1;
  const rand = mulberry32(11191);
  for (let i = 0; i < 101; i++) {
    const u = .305 + rand() * .665;
    const v = lerp(top(u), bottom(u), rand());
    const { x, y, angle } = offset(u, v);
    const direction = angle + (rand() - .50) * 2.9;
    const length = 1.7 + rand() ** 1.55 * 4.4;
    const dx = Math.cos(direction) * length;
    const dy = Math.sin(direction) * length;
    stroke(ctx, `M${x - dx} ${y - dy} Q${x + dy * .45} ${y - dx * .37} ${x + dx} ${y + dy}`,
      i % 5 ? '#FFF2C9' : '#A48B61', .34 + rand() * .51, .30 + rand() * .44);
  }
  ctx.restore();
  correctAppendixPigment(ctx, outline);
  return canvas;
}

function palate(source, diameter, pigment, opacity) {
  const canvas = makeCanvas(width, height);
  const ctx = logicalContext(canvas);
  drawRaster(ctx, source);
  const wall = radius.bind(null, diameter);
  ctx.globalCompositeOperation = 'source-atop';
  fill(ctx, ribbon(.20, 1, u => -wall(u) - .8, u => wall(u) + .8), pigment, opacity);
  return canvas;
}

function watercolorEdge() {
  const canvas = makeCanvas(width * 2, height);
  const ctx = canvas.getContext('2d');
  const pixels = ctx.createImageData(canvas.width, canvas.height);
  const scale = rasterScale(canvas);
  const rand = mulberry32(11642);
  const offset = rand() * Math.PI;
  for (let y = 0; y < canvas.height; y++) {
    const crest = 7.6 * Math.sin(y / scale.y * .11 + offset) + 3.1 * Math.sin(y / scale.y * .30 - offset);
    for (let x = 0; x < canvas.width; x++) {
      const grain = (rand() - .5) * 3.3;
      const i = (y * canvas.width + x) * 4;
      pixels.data[i + 3] = 255 * ease((width + crest + grain + 16 - x / scale.x) / 32);
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

function overlay(ctx, scratch, surface, progress, { clip, front, feather, wash }) {
  if (progress <= 0) return;
  scratch.clearRect(0, 0, width, height);
  scratch.save();
  if (clip) scratch.clip(clip);
  drawRaster(scratch, surface);
  scratch.restore();
  if (progress < 1) {
    scratch.save();
    scratch.globalCompositeOperation = 'destination-in';
    if (wash) drawRaster(scratch, wash, front - width, 0);
    else {
      const edge = scratch.createLinearGradient(front - feather / 2, 0, front + feather / 2, 0);
      edge.addColorStop(0, '#fff');
      edge.addColorStop(.53, 'rgba(255,255,255,.64)');
      edge.addColorStop(1, 'rgba(255,255,255,0)');
      scratch.fillStyle = edge;
      scratch.fillRect(0, 0, width, height);
    }
    scratch.restore();
  }
  drawRaster(ctx, scratch.canvas);
}

function createVessels() {
  const rand = mulberry32(98136);
  const root = f => 2.8 * Math.sin(f * 21) + 1.9 * Math.sin(f * 41);
  const trunk = modelPath(.265, .977, t => root(lerp(.265, .977, t)));
  const branches = Array.from({ length: 19 }, (_, i) => {
    const f = .29 + i * .035;
    const side = i % 2 ? 1 : -1;
    const from = appendixPoint(f, root(f));
    const bend = appendixPoint(f + .023, root(f) + side * (2.0 + 1.9 * rand()));
    const to = appendixPoint(f + .033 + rand() * .036, side * (6.5 + 3.2 * rand()));
    const path = `M${from.x} ${from.y} Q${bend.x} ${bend.y} ${to.x} ${to.y}`;
    return { path, start: .12 + i * .038, width: 1.15 + rand() * .67, seed: 117 + i * 79 };
  });
  return (ctx, p) => {
    inkReveal(ctx, trunk, '#6F1E34', 2.7, ease(p / .86), .90, 611);
    for (const { path, start, width, seed } of branches) {
      inkReveal(ctx, path, '#86263A', width, ease((p - start) / .17), .88, seed);
    }
  };
}

function settle(ctx, scratch, plate, mix) {
  if (mix <= 0) return;
  scratch.clearRect(0, 0, width, height);
  scratch.save();
  scratch.globalAlpha = 1 - mix;
  drawRaster(scratch, ctx.canvas);
  scratch.globalCompositeOperation = 'lighter';
  scratch.globalAlpha = mix;
  drawRaster(scratch, plate);
  scratch.restore();
  ctx.clearRect(0, 0, width, height);
  drawRaster(ctx, scratch.canvas);
}

export function createGrossAnatomy() {
  const normal = createIleocecalAsset({ id: 's12-normal', stage: 'normal' });
  const simple = createIleocecalAsset({ id: 's12-simple', stage: 'simple' });
  const phlegmon = createIleocecalAsset({ id: 's12-phlegmon', stage: 'phlegmon' });
  const crossSection = createIleocecalAsset({ id: 's12-cross-section', stage: 'phlegmon', cutaway: true });
  const normalCanvas = mountSurface(normal);
  const simpleSource = mountSurface(simple);
  const simpleCanvas = simpleGlaze(simpleSource);
  const phlegmonCanvas = phlegmonFibers(mountSurface(phlegmon));
  const crossSectionCanvas = mountSurface(crossSection);
  const pinkWall = palate(simpleSource, simple.dimensions.appendix, '#EDAFA4', .66);
  const swollenWall = palate(phlegmonCanvas, phlegmon.dimensions.appendix, '#AA4645', .84);
  const wave = watercolorEdge();
  const drawVessels = createVessels();
  const vascularCanvas = makeCanvas(width, height);
  const vascular = logicalContext(vascularCanvas);
  drawRaster(vascular, simpleCanvas);
  vascular.save();
  vascular.clip(new Path2D(silhouette(simple.dimensions.appendix)));
  drawVessels(vascular, 1);
  vascular.restore();
  const scratch = logicalContext(makeCanvas(width, height));
  const composite = logicalContext(makeCanvas(width, height));
  const expand = flubber.interpolate(silhouette(normal.dimensions.appendix), silhouette(simple.dimensions.appendix),
    { maxSegmentLength: 2.7 });
  const thicken = flubber.interpolate(silhouette(simple.dimensions.appendix), silhouette(phlegmon.dimensions.appendix),
    { maxSegmentLength: 2.7 });
  calls.interpolate += 2;
  const from = uAt(PHLEGMON_CUT.start);
  const to = uAt(PHLEGMON_CUT.end);
  const lip = (u, t) => radius(phlegmon.dimensions.appendix, u) * Math.min(1, t * 10, (1 - t) * 10) ** .58;
  const sectionMask = new Path2D(ribbon(from, to, (u, t) => -lip(u, t), lip));

  function shade(shell, clip, progress) {
    composite.save();
    composite.clip(clip);
    composite.globalAlpha *= ease(progress / .25);
    drawRaster(composite, shell);
    composite.restore();
  }

  function drawIleocecal(ctx, {
    x, y, scale, stretchY = 0, stage, morphProgress = 1, dyeProgress = morphProgress, coat = 1,
    vesselProgress = dyeProgress, sectionOpacity = 0,
  }) {
    composite.clearRect(0, 0, width, height);
    if (stage === 'normal' || stage === 'simple' && morphProgress <= 0) {
      drawRaster(composite, normalCanvas);
    } else if (stage === 'simple') {
      const complete = morphProgress >= 1 && dyeProgress >= 1 && vesselProgress >= 1;
      drawRaster(composite, complete ? vascularCanvas : normalCanvas);
      if (!complete) {
        const clip = new Path2D(expand(morphProgress));
        shade(pinkWall, clip, morphProgress);
        overlay(composite, scratch, simpleCanvas, dyeProgress, { clip, front: lerp(206, 447, dyeProgress), wash: wave });
        composite.save();
        composite.clip(clip);
        drawVessels(composite, vesselProgress);
        composite.restore();
        settle(composite, scratch, vascularCanvas, ease((Math.min(dyeProgress, vesselProgress) - .88) / .12));
      }
    } else if (stage === 'phlegmon') {
      const complete = morphProgress >= 1 && coat >= 1;
      drawRaster(composite, complete ? phlegmonCanvas : vascularCanvas);
      if (!complete && morphProgress > 0) {
        const clip = new Path2D(thicken(morphProgress));
        shade(swollenWall, clip, morphProgress * (1 - coat) + .25 * coat);
        overlay(composite, scratch, phlegmonCanvas, coat, { clip, front: lerp(208, 447, coat), wash: wave });
        settle(composite, scratch, phlegmonCanvas, ease((coat - .92) / .08));
      }
      if (sectionOpacity > 0) {
        composite.save();
        composite.clip(sectionMask);
        composite.globalAlpha *= sectionOpacity;
        drawRaster(composite, crossSectionCanvas);
        composite.restore();
      }
    }
    const verticalScale = scale + stretchY;
    ctx.drawImage(composite.canvas, x - width * scale / 2, y - height * verticalScale / 2,
      width * scale, height * verticalScale);
  }
  return { drawIleocecal, dimensions: DIMENSIONS, window: crossSection.audit.cutaway };
}

export const projectSpecimen = ({ x, y, scale, stretchY = 0 }) => point => ({
  x: x + (point.x - width / 2) * scale, y: y + (point.y - height / 2) * (scale + stretchY), angle: point.angle,
});
