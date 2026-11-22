import { HEIGHT, WIDTH, clamp, createRaster, drawSubtitlePaper, lerp } from '../../shared/canvasCore.js';
import { mountBridgePlates } from '../../shared/detail/bridgePlates.js';
import { mountPaperBridge } from '../../shared/detail/transitionPaper.js';
import { mountStageDotOverlay } from '../../shared/leftFloatNotes.js';
import { ENGLISH_FONT, HAND_FONT, SANS_FONT } from '../../shared/fonts.js';
import { displayDensity } from '../../shared/renderProfile.js';
import { phase } from '../../shared/timelineHelper.js';
import sheet from '../out/cues_s1.1-1.json';
import { mountCaptions } from './captions.js';
import { makeLabs } from './labs.js';
import { makeNotes } from './notes.js';
import { fade, makePaper, makePigments } from './paint.js';
import { drawOpeningPatient } from './patient.js';
import { drawAnatomy } from './symptoms.js';
import { makeTitle, swatchesAt } from './title.js';
import { resolveCue } from './timing.js';
import { brushCalls } from './watercolorCanvas.js';

const CUES = sheet.cues;
const root = document.querySelector('#plate');
root.style.position = 'relative';
const density = new URLSearchParams(window.location.search).has('preview') ? .5 : displayDensity();
const canvas = createRaster(WIDTH, HEIGHT, density);
canvas.id = 'opening-stage';
canvas.setAttribute('aria-hidden', 'true');
root.append(canvas);
const ctx = canvas.getContext('2d', { alpha: false });
const drawCaptions = mountCaptions(root, CUES);
const paperBridge = mountPaperBridge(root, density);
const stageDots = mountStageDotOverlay(root, density);
const bridgePlates = mountBridgePlates(root);

await Promise.all([
  document.fonts.load(`700 68px ${HAND_FONT}`),
  document.fonts.load(`750 46px ${SANS_FONT}`),
  document.fonts.load(`500 31px ${ENGLISH_FONT}`),
  bridgePlates.ready,
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

function storyMotion(cue, p, t) {
  const { id, start } = cue;
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
    labsProgress: 0,
    labsOpacity: 0,
    labsEntry: 0,
    chartEntry: 0,
    titleProgress: 0,
    titleAccent: 1,
    swatches: null,
  };
  if (id === 'S01') {
    motion.camera = dolly({ scale: 1, x: 0, y: 0 }, lunchView, phase(p, 0, 1));
    motion.patientPose = { fromPose: 'eat', pose: 'navel_pain', progress: clamp((p - .13) / (.72 - .13)) };
    const makeRoom = phase(p, .90, 1);
    motion.portraitX = lerp(920, 690, makeRoom);
    motion.portraitScale = lerp(1, .92, makeRoom);
    motion.hipY += 7 * makeRoom;
  } else if (id === 'S02') {
    motion.camera = dolly(lunchView, closeView, phase(p, 0, 1));
    motion.portraitX = 690;
    motion.portraitScale = .92;
    motion.hipY += 7;
    motion.sunset = phase(p, .83, 1);
    const entry = phase(t - start, 0, .15);
    motion.diagramOpacity = .79 + .21 * entry;
    motion.diagramSlide = 8 * (1 - entry);
    motion.neural = phase(p, 0, .58);
    motion.neuralLabel = phase(p, .035, .32);
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
    motion.sunset = 1;
  } else {
    const hospital = id === 'S04' || id === 'B01';
    const bridge = id === 'B01';
    const exit = bridge ? phase(p, .07, .83) : 1;
    motion.camera = dolly(duskView, hospitalView, exit);
    motion.portraitX = 690 - 176 * exit;
    motion.portraitScale = .92;
    motion.hipY += 17 + 11 * exit;
    motion.patientPose = { pose: 'rlq_acute' };
    motion.migrating = true;
    motion.migration = 1;
    motion.diagramOpacity = bridge ? 1 - exit : 0;
    motion.markings = 1;
    motion.lock = 1;
    motion.sunset = 1;
    motion.night = bridge ? exit : 1;
    motion.patientOpacity = bridge ? 1 - exit : 0;
    motion.labsProgress = bridge ? 0 : p;
    motion.labsEntry = bridge ? phase(p, .10, .89) : 1;
    motion.chartEntry = bridge ? phase(p, .44, .94) : 1;
    motion.labsOpacity = hospital ? motion.labsEntry : 0;
    motion.noteOpacity = hospital ? 1 : 0;
    motion.titleProgress = hospital ? 0 : 1;
    motion.titleAccent = id === 'S05' ? p : 1;
    if (!hospital) {
      motion.swatches = swatchesAt(1);
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
    nightAir.addColorStop(0, '#2F5D7C21');
    nightAir.addColorStop(.56, '#2F5D7C14');
    nightAir.addColorStop(1, '#2F5D7C00');
    ctx.fillStyle = nightAir;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    fade(ctx, .055, () => pigment(ctx, 'dusk', 954 + 85 * motion.night, -309, 1332, 740));
  });
}

function renderFrame(t) {
  const { cue, p } = resolveCue(CUES, t);
  const motion = storyMotion(cue, p, t);
  const titleBridge = cue.id === 'B02';
  const view = camera(motion.camera);
  ctx.setTransform(density, 0, 0, density, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.drawImage(paper, 0, 0, WIDTH, HEIGHT);
  ambientLight(motion);
  ctx.save();
  view.apply(ctx);
  const portrait = drawOpeningPatient(ctx, motion, view);
  ctx.restore();
  const anatomy = drawAnatomy(ctx, motion, pigment);
  drawLabs(ctx, motion);
  ctx.save();
  const bloom = titleBridge ? phase(p, .30, .85) : 0;
  ctx.translate(1110, 459);
  ctx.scale(1 + .05 * bloom, 1 + .025 * bloom);
  ctx.translate(-1110, -459);
  const headlineProgress = drawTitle(ctx, motion);
  ctx.restore();
  drawNotes(ctx, motion);
  if (cue.type === 'speech') drawSubtitlePaper(ctx);
  drawCaptions(ctx, cue, p);
  const handoff = titleBridge && bridgePlates.available;
  // The first blush of the next specimen overlaps the thinning title wash.
  const visible = handoff ? 1 - phase(p, .38, .86) : 1;
  canvas.style.opacity = String(visible);
  paperBridge(1 - visible);
  bridgePlates.show(handoff ? { subject: phase(p, .43, .90) } : {});
  const marker = titleBridge ? lerp(3, 0, phase(p, .30, .85)) : cue.id === 'S05' ? 3 : motion.sunset;
  const hospital = cue.id === 'B01' || cue.id === 'S04';
  const dotOpacity = hospital ? 1 - phase(motion.night, .16, .53) : 1;
  stageDots({ marker, opacity: dotOpacity });
  return {
    id: cue.id,
    p,
    anatomy,
    portrait,
    transition: {
      labsOpacity: motion.labsOpacity,
      patientOpacity: motion.patientOpacity,
      noteOpacity: motion.noteOpacity,
      night: motion.night,
      labsEntry: motion.labsEntry,
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
