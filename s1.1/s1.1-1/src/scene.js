import { HEIGHT, WIDTH, clamp, createRaster, lerp } from '../../shared/canvasCore.js';
import { displayDensity } from '../../shared/renderProfile.js';
import { phase } from '../../shared/timelineHelper.js';
import sheet from '../out/cues_s1.1-1.json';
import { mountCaptions } from './captions.js';
import { makeLabs } from './labs.js';
import { makeNotes } from './notes.js';
import { captionPaper, fade, makePaper, makePigments } from './paint.js';
import { drawOpeningPatient } from './patient.js';
import { drawAnatomy } from './symptoms.js';
import { makeTitle, swatchesAt } from './title.js';
import { resolveCue } from './timing.js';
import { brushCalls } from './watercolorCanvas.js';

const CUES = sheet.cues;
const root = document.querySelector('#plate');
const density = new URLSearchParams(window.location.search).has('preview') ? .5 : displayDensity();
const canvas = createRaster(WIDTH, HEIGHT, density);
canvas.id = 'opening-stage';
canvas.setAttribute('aria-hidden', 'true');
root.append(canvas);
const ctx = canvas.getContext('2d', { alpha: false });
const drawCaptions = mountCaptions(root, CUES);

await Promise.all([
  document.fonts.load('700 68px KaiTi'),
  document.fonts.load('750 42px "Noto Sans SC"'),
  document.fonts.load('500 24px "Noto Sans SC"'),
]);
await document.fonts.ready;
const paper = makePaper();
const pigment = makePigments();
const drawNotes = makeNotes(pigment);
const drawLabs = makeLabs(pigment);
const drawTitle = makeTitle(pigment);

const lunchView = { scale: 1, x: 9, y: -12 };
const closeView = { scale: 1.38, x: 160, y: -48 };
const duskView = { scale: 1.18, x: -4, y: -18 };
const hospitalView = { scale: 1.02, x: -37, y: -16 };

function dolly(from, to, progress) {
  return {
    scale: lerp(from.scale, to.scale, progress),
    x: lerp(from.x, to.x, progress),
    y: lerp(from.y, to.y, progress),
  };
}

function camera(view) {
  const { scale } = view;
  const x = 528 * (1 - scale) + view.x;
  const y = 574 * (1 - scale) + view.y;
  return {
    apply: context => context.transform(scale, 0, 0, scale, x, y),
    scale,
    worldX: pixel => (pixel - x) / scale,
  };
}

function storyMotion(id, p, t) {
  const motion = {
    t,
    camera: lunchView,
    portraitX: 920,
    portraitScale: 1,
    hipY: 747,
    patientPose: { pose: 'navel_pain' },
    patientOpacity: 1,
    diagramOpacity: 0,
    diagramSlide: 0,
    neural: 0,
    neuralLabel: 0,
    migrating: false,
    markings: 0,
    lock: 0,
    migration: 0,
    sunset: 0,
    night: 0,
    noteOpacity: 1,
    paletteOpacity: 1,
    labsProgress: 0,
    labsExit: 0,
    labsOpacity: 0,
    titleProgress: 0,
    swatches: null,
  };
  if (id === 'S01') {
    motion.camera = dolly({ scale: 1, x: 0, y: 0 }, lunchView, phase(p, 0, 1));
    motion.patientPose = { fromPose: 'eat', pose: 'navel_pain', progress: clamp((p - .25) / (.91 - .25)) };
  } else if (id === 'S02') {
    const split = phase(p, 0, .30);
    motion.camera = dolly(lunchView, closeView, phase(p, 0, 1));
    motion.portraitX = lerp(920, 690, split);
    motion.portraitScale = lerp(1, .92, split);
    motion.hipY += 7 * phase(p, 0, .91);
    motion.diagramOpacity = phase(p, .13, .30);
    motion.diagramSlide = 42 * (1 - split);
    motion.neural = phase(p, .13, .63);
    motion.neuralLabel = phase(p, .22, .49);
  } else if (id === 'S03') {
    const migrate = phase(p, .15, .72);
    motion.camera = dolly(closeView, duskView, phase(p, 0, .76));
    motion.portraitX = 690;
    motion.portraitScale = .92;
    // The approved renderer applies the same smoothstep to the normalized pose progress.
    motion.patientPose = { fromPose: 'navel_pain', pose: 'rlq_acute', progress: clamp((p - .15) / (.72 - .15)) };
    motion.hipY += 7 + 10 * migrate;
    motion.diagramOpacity = 1;
    motion.neural = 1 - phase(p, 0, .23);
    motion.neuralLabel = 1 - phase(p, 0, .19);
    motion.migrating = true;
    motion.migration = migrate;
    motion.markings = phase(p, .056, .28);
    motion.lock = phase(p, .64, .81);
    motion.sunset = phase(p, 0, .56);
  } else {
    const entering = id === 'S04';
    const exit = entering ? phase(p, 0, .57) : 1;
    motion.camera = dolly(duskView, hospitalView, exit);
    motion.portraitX = 690 - 467 * exit;
    motion.portraitScale = .92;
    motion.hipY += 17 + 11 * exit;
    motion.patientPose = { pose: 'rlq_acute' };
    motion.migrating = true;
    motion.migration = 1;
    motion.diagramOpacity = entering ? 1 - phase(p, 0, .22) : 0;
    motion.markings = 1;
    motion.lock = 1;
    motion.sunset = 1;
    motion.night = entering ? phase(p, 0, .36) : 1;
    motion.patientOpacity = entering ? 1 - phase(p, 0, .12) : 0;
    motion.labsProgress = entering ? p : 1;
    motion.labsOpacity = entering ? phase(p, .035, .29) * (1 - phase(p, .85, 1)) : 0;
    motion.noteOpacity = entering ? 1 : 1 - phase(p, 0, .12);
    motion.paletteOpacity = entering ? 1 : lerp(1, .71, phase(p, 0, .68));
    motion.titleProgress = entering ? 0 : p;
    if (!entering) {
      motion.swatches = swatchesAt(p);
      motion.redCarry = 1 - phase(p, 0, .18);
    }
  }
  return motion;
}

function ambientLight(motion) {
  const twilight = motion.sunset;
  const washY = 18 + 37 * Math.sin(twilight * Math.PI);
  fade(ctx, .24 * Math.sin(Math.PI * twilight) * (1 - motion.night), () =>
    pigment(ctx, 'ochre', 1110 + 115 * twilight, -195 + washY, 1026, 593));
  const cool = clamp(twilight * .83 + motion.night * .39);
  fade(ctx, cool, () => {
    const nightAir = ctx.createRadialGradient(1558, 20, 54, 1579, 74, 1114);
    nightAir.addColorStop(0, '#9BAEB94B');
    nightAir.addColorStop(.56, '#A7B0B72E');
    nightAir.addColorStop(1, '#A7B0B700');
    ctx.fillStyle = nightAir;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    fade(ctx, .11, () => pigment(ctx, 'dusk', 954 + 85 * motion.night, -309, 1332, 740));
  });
}

function renderFrame(t) {
  const { cue, p } = resolveCue(CUES, t);
  const motion = storyMotion(cue.id, p, t);
  const view = camera(motion.camera);
  ctx.setTransform(density, 0, 0, density, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.drawImage(paper, 0, 0, WIDTH, HEIGHT);
  ambientLight(motion);
  ctx.save();
  if (cue.id === 'S04') {
    ctx.beginPath();
    ctx.rect(400, 0, WIDTH - 400, HEIGHT);
    ctx.clip();
  }
  view.apply(ctx);
  const portrait = drawOpeningPatient(ctx, motion, view);
  ctx.restore();
  const anatomy = drawAnatomy(ctx, motion, pigment);
  drawLabs(ctx, motion);
  const headlineProgress = drawTitle(ctx, motion);
  drawNotes(ctx, motion);
  captionPaper(ctx);
  drawCaptions(ctx, cue, p);
  return {
    id: cue.id,
    p,
    anatomy,
    portrait,
    transition: {
      labsOpacity: motion.labsOpacity,
      patientOpacity: motion.patientOpacity,
      noteOpacity: motion.noteOpacity,
      headlineProgress,
      firstSwatch: motion.swatches?.[0] ?? 0,
    },
  };
}

window.renderAt = t => {
  const { id, p } = renderFrame(t);
  return { id, p };
};
window.anatomyAt = t => renderFrame(t).anatomy;
window.openingPatientAt = t => renderFrame(t).portrait;
window.openingTransitionAt = t => renderFrame(t).transition;
window.brushCallCounts = () => ({ ...brushCalls });
window.renderAt(0);
