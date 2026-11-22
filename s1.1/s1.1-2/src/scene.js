import {
  createStoryStage, HEIGHT, PAPER, WIDTH, lerp, prepareStorySubtitles,
} from '../../shared/canvasCore.js';
import { terminalIleumPoint } from '../../shared/anatomyWatercolor.js';
import { SERIF_FONT } from '../../shared/fonts.js';
import { mountStageDotOverlay, STAGE_DOT_Y } from '../../shared/leftFloatNotes.js';
import { mountMicroscopeHandoff } from '../../shared/detail/microscopeHandoff.js';
import { createRaster, logicalContext } from '../../shared/detail/raster.js';
import { mountPaperBridge } from '../../shared/detail/transitionPaper.js';
import { phase, phaseOut, pushTo } from '../../shared/timelineHelper.js';
import { calls, circle, inkReveal } from './brushwork.js';
import { CUES, resolveCue } from './cues.js';
import { appendixPoint, createGrossAnatomy, CUT, DIMENSIONS, LENS_SAMPLE, projectSpecimen, SPECIMEN } from './gross.js';
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

const subtitleCuts = {
  S06: ['后内侧，', 'cecum.', .51],
  S07: ['通体暗红，', 'dark red,', .56],
  S08: ['灰黄色脓苔，', 'purulent coating,', .53],
  S09: ['窄腔。', 'lumen.', .52],
};

const subtitles = new Map(CUES.filter(cue => cue.type === 'speech').map(({ id, zhText, highlightZh, enText }) => {
  const [anchor, translated, pageAt] = subtitleCuts[id];
  if (!zhText.includes(anchor) || !enText.includes(translated)) throw new Error(`Missing subtitle break for ${id}`);
  const splitAt = zhText.indexOf(anchor) + anchor.length;
  const translationAt = enText.indexOf(translated) + translated.length;
  return [id, prepareStorySubtitles({ text: zhText, highlights: highlightZh },
    [enText.slice(0, translationAt), enText.slice(translationAt)], { splitAt, pageAt })];
}));

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
  } else if (id === 'S08') {
    letter(ctx, '大体提示 · 化脓性阑尾炎', 80, notesY + 106, { size: 21, halo: false });
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
  return { stage: 'phlegmon', cutaway: true, opening: phase(p, .23, .68),
    cutProgress: phase(p, 0, .30), scissors: phase(p, 0, .035) * (1 - phase(p, .253, .30)),
    guide: 1 - phase(p, .28, .58), progress: p, push: 1, diameter: DIMENSIONS.phlegmon.appendix };
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
  const fading = microBridge ? 1 - phase(p, .46, .76) : 1;
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
  showDots({ marker: observing + diagnosis, opacity: captureEntry ? 0 : microBridge ? 1 - phase(p, .25, .76) : 1 });
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
    letter(ctx, '浆膜面血管剧烈扩张充血', MAGNIFIER.x, MAGNIFIER.labelTop, { align: 'center', top: true, halo: false });
    ctx.restore();
  }

  const coatLabel = id === 'S08' ? phase(p, .58, .84) : 0;
  if (coatLabel > 0) {
    ctx.save();
    ctx.globalAlpha *= closeNote(p);
    label(ctx, '浆膜面灰黄色脓苔', 1315, 632, project(appendixPoint(.69, -4.5)),
      { size: 30, color: red, leader: red, bend: -18, progress: coatLabel });
    ctx.restore();
  }

  if ((id === 'S09' || microBridge) && fading > 0) {
    ctx.save();
    ctx.globalAlpha *= microBridge ? 1 - phase(p, 0, .25) : 1;
    label(ctx, '粪石梗阻', 717, 749, project(appendixPoint(CUT.stone)),
      { size: 28, align: 'right', bend: 30, progress: phase(poseP, .36, .51) });
    label(ctx, '管腔充满黄红色脓液', 1305, 741, project(appendixPoint(CUT.pus)),
      { size: 28, color: red, leader: red, bend: 12, progress: phase(poseP, .48, .641) });
    ctx.restore();
  }
  const micro = microscope.draw(ctx, microBridge ? p : 0, project(appendixPoint(CUT.center)));
  const subtitle = captureEntry ? null : subtitles.get(id);
  stage.setSubtitles(subtitle, p);
  showPaper(id === 'S06' && !captureEntry ? 1 - phase(p, 0, .10) : 0);
  showMicroscopeHandoff({ opacity: microBridge ? phase(p, .68, .78) : 0,
    scale: lerp(1, .46, phase(p, .81, 1)) });
  return { id, p, diameter: state.diameter, camera: camera.scale, scale: pose.scale, lens, micro, specimenOpacity: fading };
}

await stage.ready;
window.renderAt = t => render(resolveCue(CUES, t));
window.renderBridgeEntry = () => render(resolveCue(CUES, 0), true);
window.sceneMetrics = { calls, dimensions: DIMENSIONS, incisionWindow, specimen: SPECIMEN, histology: microscope.recipe };
window.renderAt(0);
window.ready = true;
