import { createStoryStage, HEIGHT, PAPER, WIDTH, lerp, mulberry32 } from '../../shared/canvasCore.js';
import { terminalIleumPoint } from '../../shared/anatomyWatercolor.js';
import { prepareProductionSubtitles } from '../../shared/cueCaptions.js';
import { SERIF_FONT } from '../../shared/fonts.js';
import { drawMicroNeutrophil } from '../../shared/histologyProcedural.js';
import { mountStageDotOverlay, STAGE_DOT_Y } from '../../shared/leftFloatNotes.js';
import { mountMicroscopeHandoff } from '../../shared/detail/microscopeHandoff.js';
import { createRaster, logicalContext } from '../../shared/detail/raster.js';
import { mountPaperBridge } from '../../shared/detail/transitionPaper.js';
import { phase, phaseOut, pushTo } from '../../shared/timelineHelper.js';
import { calls, circle, inkReveal } from './brushwork.js';
import { CUES, resolveCue } from './cues.js';
import { appendixPoint, createGrossAnatomy, DIMENSIONS, LENS_SAMPLE, projectAppendixSilhouette, projectSpecimen, SPECIMEN } from './gross.js';
import { createMagnifier, createMicroscope, MAGNIFIER } from './optics.js';
import { addPaperGrain } from './paperGrain.js';

const notesY = STAGE_DOT_Y;
const dark = '#1F1C19';
const graphite = '#3E3934';
const tea = '#6B554A';
const red = '#C43428';
const closeNote = p => 1 - phase(p, .86, 1);
const focus = projectSpecimen(SPECIMEN)(appendixPoint(.73));
const zoom = 1.56 / SPECIMEN.scale;

const subtitles = new Map(CUES.filter(cue => cue.type === 'speech')
  .map(cue => [cue.id, prepareProductionSubtitles(cue)]));

function letter(ctx, text, x, y, { color = dark, size = 26, weight = 800, align = 'left', top = false, halo = true } = {}) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${SERIF_FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  const baseline = top ? y + ctx.measureText(text).actualBoundingBoxAscent : y;
  if (halo) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4.3;
    ctx.strokeStyle = PAPER;
    ctx.strokeText(text, x, baseline);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, baseline);
  ctx.restore();
}

function label(ctx, text, x, y, target, {
  align = 'left', size = 26, color = dark, leader = tea, bend = 15, progress = 1,
} = {}) {
  if (progress <= 0) return;
  const from = { x: x + (align === 'left' ? -11 : 12), y: y - size * .30 };
  const mid = { x: lerp(from.x, target.x, .52), y: lerp(from.y, target.y, .46) + bend };
  inkReveal(ctx, `M${target.x} ${target.y} Q${mid.x} ${mid.y} ${from.x} ${from.y}`, leader, 2.65, progress, .90);
  circle(ctx, target.x, target.y, 2.15, 2.15, leader, .9 * phase(progress, 0, .24));
  const lettering = phase(progress, .52, 1);
  if (lettering > 0) {
    ctx.save();
    ctx.globalAlpha *= lettering;
    letter(ctx, text, x, y, { align, color, size });
    ctx.restore();
  }
}

function drawObservationNotes(ctx, id, p) {
  ctx.save();
  ctx.globalAlpha *= phase(p, .10, .25) * closeNote(p);
  if (id === 'S06') {
    letter(ctx, '正常形态 · 约 6~8 cm', 80, notesY + 106, { size: 22, weight: 600, color: graphite, halo: false });
  } else if (id === 'S07') {
    letter(ctx, '大体观察 · 肿胀充血', 80, notesY + 106, { size: 24, halo: false });
  }
  ctx.restore();
}

function normalLabels(ctx, p, project) {
  const alpha = closeNote(p);
  if (!alpha) return;
  const trace = index => phase(p, .10 + index * .076, .246 + index * .076);
  ctx.save();
  ctx.globalAlpha *= alpha;
  label(ctx, '升结肠', 625, 269, project({ x: 149, y: 127 }), { align: 'right', bend: -10, progress: trace(0) });
  label(ctx, '盲肠', 633, 548, project({ x: 161, y: 328 }), { align: 'right', bend: 5, progress: trace(1) });
  label(ctx, '回肠末端', 1324, 453, project(terminalIleumPoint(.39)), { bend: -10, progress: trace(2) });
  label(ctx, '阑尾系膜', 1272, 587, project({ x: 335, y: 351 }), { bend: 17, progress: trace(3) });
  label(ctx, '粉白 · 正常阑尾', 1240, 695, project(appendixPoint(.81, 0)), { bend: 7, progress: trace(4) });
  ctx.restore();
}

function cueGeometry(id, p) {
  if (id === 'S06') return { stage: 'normal', diameter: DIMENSIONS.normal.appendix, push: 0 };
  if (id === 'S07') {
    const morphProgress = phase(p, 0, .55);
    return { stage: 'simple', morphProgress, dyeProgress: phase(p, 0, .55),
      vesselProgress: phase(p, .035, .55), push: 0,
      diameter: lerp(DIMENSIONS.normal.appendix, DIMENSIONS.simple.appendix, morphProgress) };
  }
  if (id === 'S08') {
    const morphProgress = phase(p, 0, .70);
    return { stage: 'phlegmon', morphProgress, coat: phase(p, .15, .85), push: phase(p, 0, .70),
      diameter: lerp(DIMENSIONS.simple.appendix, DIMENSIONS.phlegmon.appendix, morphProgress) };
  }
  return { stage: 'phlegmon', sectionOpacity: phase(p, .35, .68), push: 1, diameter: DIMENSIONS.phlegmon.appendix };
}

const wallLayers = [
  ['浆膜', '#E1B6C1'], ['肌层', '#D995A7'], ['黏膜下层', '#E9C7CE'], ['黏膜', '#DCA6BD'],
];
const wallWidth = 330;
const wallRowHeight = 28;

function makeWallLayers() {
  const tile = createRaster(wallWidth, 128);
  const pen = logicalContext(tile);
  const random = mulberry32(13472);
  const waves = (y, index) =>
    `Q55 ${y - 4} 110 ${y + 1} T220 ${y + index % 2 * 3} T${wallWidth} ${y}`;
  pen.fillStyle = '#BAA16A';
  pen.fill(new Path2D(`M0 6 ${waves(6, 0)} L${wallWidth} 19 H0Z`));
  for (const [index, [, shade]] of wallLayers.entries()) {
    const y = 15 + index * wallRowHeight;
    const band = new Path2D(`M0 ${y} ${waves(y, index)} V${y + wallRowHeight + 3} H0Z`);
    pen.fillStyle = shade;
    pen.fill(band);
    pen.save();
    pen.clip(band);
    for (let i = 0; i < 24; i++) {
      const x = (i + random()) / 24 * wallWidth;
      drawMicroNeutrophil(pen, x, y + 6 + random() * 15, index * 100 + i + 771,
        { scale: .95 + random() * .42, alpha: .82 });
    }
    pen.restore();
  }
  return tile;
}

function drawWallMechanism(ctx, alpha, progress) {
  if (alpha <= 0) return;
  const x = 1284;
  const textX = x + 23;
  const layerNameX = textX + wallWidth + 17;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.beginPath();
  ctx.roundRect(x, 270, 488, 284, 13);
  ctx.fillStyle = '#F3EBE0';
  ctx.fill();
  ctx.strokeStyle = '#DCCDBB';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  letter(ctx, '外观成因 · 组织学透视', textX, 311, { size: 24, halo: false });
  letter(ctx, '阑尾壁各层浸润大量中性粒细胞 →', textX, 348, { size: 20, weight: 700, halo: false });
  letter(ctx, '肉眼观管壁明显肿胀、外表面覆盖一层灰黄色脓苔', textX, 380,
    { size: 20, weight: 600, color: '#4E4740', halo: false });
  ctx.drawImage(wallLayerArt, textX, 402, wallWidth, 128);
  // Guide the eye down the fixed layers before the larger microscope view takes over.
  const focus = phase(progress, .65, .98);
  const visibility = phase(focus, 0, .12) * (1 - phase(focus, .86, 1));
  if (visibility > 0) {
    const y = lerp(430, 517, focus);
    const wash = ctx.createLinearGradient(0, y - 17, 0, y + 17);
    wash.addColorStop(0, '#672D4B00');
    wash.addColorStop(.5, '#672D4B52');
    wash.addColorStop(1, '#672D4B00');
    ctx.save();
    ctx.globalAlpha *= visibility;
    ctx.fillStyle = wash;
    ctx.fillRect(textX, 417, wallWidth, 113);
    ctx.beginPath();
    ctx.moveTo(textX - 13, y - 9);
    ctx.quadraticCurveTo(textX - 15, y, textX - 13, y + 9);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8E4A57';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
  letter(ctx, '灰黄色脓苔', layerNameX, 418, { size: 15, color: '#765C35', halo: false });
  for (const [i, [name]] of wallLayers.entries()) {
    letter(ctx, name, layerNameX, 438 + i * wallRowHeight, { size: 16, color: graphite, halo: false });
  }
  ctx.restore();
}

function lensOpening(p) {
  return phaseOut(p, .31, .75);
}

const root = document.querySelector('main');
const stage = createStoryStage(root, { paper: false });
addPaperGrain(root.querySelector('.story-grain'));
const main = createRaster(WIDTH, HEIGHT);
stage.paint.append(main);
const ctx = logicalContext(main);
const showPaper = mountPaperBridge(root);
const showDots = mountStageDotOverlay(root);
const showMicroscopeHandoff = mountMicroscopeHandoff(root);
const { drawIleocecal, window: incisionWindow } = createGrossAnatomy();
const magnifier = createMagnifier();
const microscope = createMicroscope();
const wallLayerArt = makeWallLayers();

function render({ cue, p }, captureEntry = false) {
  const { id, start, end } = cue;
  const microBridge = id === 'B03';
  const poseP = microBridge ? 1 : p;
  const state = cueGeometry(id, poseP);
  const camera = pushTo(focus, 1, zoom, state.push);
  const center = camera.project(SPECIMEN);
  const breath = id === 'S06' ? 2 * Math.sin(p * 4 * Math.PI) * (1 - phase(p, .83, 1)) : 0;
  const pose = {
    x: center.x - 14 * state.push, y: center.y - 27 * state.push, scale: SPECIMEN.scale * camera.scale,
    stretchY: 2 * breath / 520,
  };
  const project = projectSpecimen(pose);
  const fading = microBridge ? 1 - phase(p, .12, .58) : 1;
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  if (fading > 0) {
    ctx.save();
    ctx.globalAlpha *= fading;
    drawIleocecal(ctx, { ...pose, ...state });
    ctx.restore();
  }

  const observing = id === 'S07' ? phase(p, .025, .56) : Number(id !== 'S06');
  const diagnosis = id === 'S08' ? phase(p, .06, .64) : Number(id === 'S09' || microBridge);
  drawObservationNotes(ctx, id, p);
  showDots({ marker: observing + diagnosis, opacity: captureEntry ? 0 : 1 });
  if (id === 'S06') normalLabels(ctx, p, project);

  const closing = id === 'S08' ? 1 - phase(p, 0, .14) : 1;
  const amount = id === 'S07' ? lensOpening(p) : id === 'S08' ? closing : 0;
  const lens = magnifier(ctx, {
    amount, opacity: closing, guide: id === 'S07' ? phase(p, .30, .52) : 1,
    focus: project(appendixPoint(LENS_SAMPLE, -.5)), time: lerp(start, end, p),
  });
  if (lens && id === 'S07') {
    ctx.save();
    ctx.globalAlpha *= lens.alpha * phase(p, .42, .56);
    letter(ctx, '浆膜血管扩张充血', MAGNIFIER.x, MAGNIFIER.labelTop, { align: 'center', top: true, halo: false });
    letter(ctx, '像烧红的铁丝网', MAGNIFIER.x, MAGNIFIER.labelTop + 41,
      { align: 'center', top: true, size: 25, color: red, halo: false });
    ctx.restore();
  }

  const coatLabel = id === 'S08' ? phase(p, .48, .72) : 0;
  if (coatLabel > 0) {
    ctx.save();
    ctx.globalAlpha *= closeNote(p);
    label(ctx, '浆膜面灰黄色脓苔', 1315, 632, project(appendixPoint(.69, -4.5)),
      { size: 30, color: red, leader: red, bend: -18, progress: coatLabel });
    ctx.restore();
  }

  if (id === 'S08') {
    ctx.save();
    ctx.globalAlpha *= phase(p, .20, .47) * closeNote(p);
    letter(ctx, '急性化脓性阑尾炎（又称急性蜂窝织性阑尾炎）的外观特征', 1175, 219,
      { size: 24, halo: false });
    ctx.restore();
  }

  if ((id === 'S09' || microBridge) && fading > 0) {
    const cardOpacity = microBridge ? 1 - phase(p, 0, .25) : phase(p, .32, .59);
    drawWallMechanism(ctx, cardOpacity, poseP);
  }
  const micro = microBridge ? microscope.at(p, projectAppendixSilhouette(project)) : null;
  const subtitle = captureEntry ? null : subtitles.get(id);
  stage.setSubtitles(subtitle, p);
  showPaper(id === 'S06' && !captureEntry ? 1 - phase(p, 0, .10) : 0);
  showMicroscopeHandoff(micro ?? {});
  return { id, p, diameter: state.diameter, camera: camera.scale, scale: pose.scale, lens, micro,
    specimenOpacity: fading, sectionOpacity: state.sectionOpacity };
}

await stage.ready;
window.renderAt = t => render(resolveCue(CUES, t));
window.renderBridgeEntry = () => render(resolveCue(CUES, 0), true);
window.sceneMetrics = { calls, dimensions: DIMENSIONS, incisionWindow, specimen: SPECIMEN, histology: microscope.recipe };
window.renderAt(0);
window.ready = true;
