import {
  clamp, createStoryStage, HEIGHT, PAPER, WIDTH, lerp, organic, prepareStorySubtitles,
} from '../../shared/canvasCore.js';
import { STAGE_DOT_CENTERS } from '../../shared/leftFloatNotes.js';
import { createRaster, logicalContext } from '../../shared/detail/raster.js';
import { phase, pushTo } from '../../shared/timelineHelper.js';
import { calls, circle, dotted, fill, glaze, ink, inkReveal, stroke, watercolor } from './brushwork.js';
import { CUES, resolveCue } from './cues.js';
import { appendixPoint, createGrossAnatomy, CUT, DIMENSIONS, LENS_SAMPLE, projectSpecimen, SPECIMEN } from './gross.js';
import { createMagnifier, createMicroscope, MAGNIFIER, MICROSCOPE_IN } from './optics.js';
import { addPaperGrain } from './paperGrain.js';

const notesY = 479;
const hand = '"Noto Serif SC", "KaiTi", "Microsoft YaHei", serif';
const dark = '#1F1C19';
const graphite = '#3E3934';
const tea = '#6B554A';
const red = '#C43428';
const closeNote = p => 1 - phase(p, .86, 1);
const focus = projectSpecimen(SPECIMEN)(appendixPoint(.73));
const zoom = 1.56 / SPECIMEN.scale;

const subtitleCuts = {
  S06: ['细长、', 'pale-pink,', .51],
  S07: ['通体暗红，', 'dark red,', .56],
  S08: ['灰黄色脓苔——', 'dark-red wall—', .53],
  S09: ['粪石。', 'fecalith.', .64],
};

const subtitles = new Map(CUES.map(({ id, zhText, highlightZh, enText }) => {
  const [anchor, translated, pageAt] = subtitleCuts[id];
  const splitAt = zhText.indexOf(anchor) + anchor.length;
  const translationAt = enText.indexOf(translated) + translated.length;
  return [id, prepareStorySubtitles({ text: zhText, highlights: highlightZh },
    [enText.slice(0, translationAt), enText.slice(translationAt)], { splitAt, pageAt })];
}));

function letter(ctx, text, x, y, { color = dark, size = 26, weight = 800, align = 'left', top = false, halo = true } = {}) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${hand}`;
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

function createFloatingNotes() {
  const colors = ['#DA8D88', '#852E2F', '#B39A5B', '#1C1719'];
  const labels = ['粉白', '暗红', '灰黄', '焦黑'];
  const dots = STAGE_DOT_CENTERS.map((x, i) => organic(x, notesY, 18, 17, 441 + i * 127, .17));
  const wash = watercolor([66, notesY - 31, 242, 62], 5568, wet => {
    dots.forEach((d, i) => wet(d, colors[i], [135, 218, 175, 225][i], .22, .72, .72));
  });
  return (ctx, { index, id, p, alpha }) => {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    dots.forEach((d, i) => fill(ctx, d, colors[i], i % 2 ? .39 : .26));
    glaze(ctx, wash);
    for (const [i, x] of STAGE_DOT_CENTERS.entries()) {
      letter(ctx, labels[i], x, notesY + 54, { align: 'center', size: 25, weight: 720, halo: false });
    }
    const from = Math.floor(index);
    const to = Math.min(from + 1, 2);
    const marker = lerp(STAGE_DOT_CENTERS[from], STAGE_DOT_CENTERS[to], index - from);
    ink(ctx, `M${marker - 18} ${notesY + 24} Q${marker - 3} ${notesY + 20} ${marker + 19} ${notesY + 23}`,
      '#A83C31', 3.7, .94);
    const noteAlpha = phase(p, .10, .25) * closeNote(p);
    ctx.globalAlpha *= noteAlpha;
    if (id === 'S06') {
      letter(ctx, '正常形态 · 约 6~8 cm', 80, notesY + 106, { size: 22, weight: 600, color: graphite, halo: false });
    } else if (id === 'S07') {
      letter(ctx, '大体观察 · 肿胀充血', 80, notesY + 106, { size: 24, halo: false });
    } else if (id === 'S08') {
      letter(ctx, '蜂窝织炎性', 80, notesY + 102, { size: 24, halo: false });
      letter(ctx, '（化脓性）阑尾炎', 76, notesY + 135, { size: 24, halo: false });
    }
    ctx.restore();
  };
}

function pinky(ctx, progress) {
  if (progress <= 0) return;
  const x = 1515;
  const y = 670;
  const shape = 'M-10.4 53 C-14.7 33 -14.2 12 -12.4 -9 C-11.6 -29 -13.5 -48 -5 -58.3 ' +
    'C1.2 -66.9 11.7 -61.4 13.2 -49.3 C15.4 -37.1 12 -19 12.6 -6.8 C13.4 15 17.7 31 14.8 51 Z';
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(.69);
  const detail = phase(progress, .52, 1);
  fill(ctx, shape, '#E0B39D', .14 * detail);
  ctx.save();
  ctx.globalAlpha *= .78;
  dotted(ctx, shape, '#5A5248', 2.8, 7.6, 5.4, progress);
  ctx.restore();
  inkReveal(ctx, 'M-6 -50 Q2 -58 9 -49 L8 -39 Q2 -34 -6 -39Z', '#7D695D', 1.55, detail, .72);
  stroke(ctx, 'M-8 -18 Q1 -14 8 -17 M-8 12 Q3 17 9 12', '#8D7061', 1.35, .63 * detail);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha *= phase(progress, .58, 1);
  letter(ctx, '约小指粗细', x, y + 89, { size: 24, weight: 660, color: graphite, align: 'center', halo: false });
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
  label(ctx, '回肠末端', 1324, 453, project({ x: 410, y: 291 }), { bend: -10, progress: trace(2) });
  label(ctx, '阑尾系膜', 1272, 587, project({ x: 335, y: 351 }), { bend: 17, progress: trace(3) });
  label(ctx, '粉白 · 正常阑尾', 1240, 695, project(appendixPoint(.81, 0)), { bend: 7, progress: trace(4) });
  pinky(ctx, phase(p, .45, .85));
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
  return { stage: 'phlegmon', cutaway: true, opening: phase(p, .25, MICROSCOPE_IN),
    cutProgress: phase(p, 0, .30), scissors: phase(p, 0, .035) * (1 - phase(p, .253, .30)),
    guide: 1 - phase(p, .28, .58), progress: p, push: 1, diameter: DIMENSIONS.phlegmon.appendix };
}

function lensOpening(p) {
  const easeOpen = phase(p, .30, .78);
  return clamp(easeOpen + .13 * Math.sin(easeOpen * 3 * Math.PI) * Math.sin(easeOpen * Math.PI) ** 2);
}

const root = document.querySelector('main');
const stage = createStoryStage(root, { paper: false });
const caption = root.querySelector('.story-caption');
addPaperGrain(root.querySelector('.story-grain'));
const main = createRaster(WIDTH, HEIGHT);
stage.paint.append(main);
const ctx = logicalContext(main);
const drawNotes = createFloatingNotes();
const { drawIleocecal, window: incisionWindow } = createGrossAnatomy();
const magnifier = createMagnifier();
const microscope = createMicroscope();

function render({ cue, p }) {
  const { id, start, end } = cue;
  const state = cueGeometry(id, p);
  const camera = pushTo(focus, 1, zoom, state.push);
  const center = camera.project(SPECIMEN);
  const breath = id === 'S06' ? 2 * Math.sin(p * 4 * Math.PI) * (1 - phase(p, .83, 1)) : 0;
  const pose = {
    x: center.x - 14 * state.push, y: center.y - 27 * state.push, scale: SPECIMEN.scale * camera.scale,
    stretchY: 2 * breath / 520,
  };
  const project = projectSpecimen(pose);
  const fading = id === 'S09' ? 1 - phase(p, MICROSCOPE_IN, .866) : 1;
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  if (fading > 0) {
    ctx.save();
    ctx.globalAlpha *= fading;
    drawIleocecal(ctx, { ...pose, ...state });
    ctx.restore();
  }

  const observing = id === 'S07' ? phase(p, .025, .56) : Number(id !== 'S06');
  const diagnosis = id === 'S08' ? phase(p, .06, .64) : Number(id === 'S09');
  drawNotes(ctx, { index: observing + diagnosis, id, p, alpha: fading });
  if (id === 'S06') normalLabels(ctx, p, project);

  const closing = id === 'S08' ? 1 - phase(p, 0, .14) : 1;
  const amount = id === 'S07' ? lensOpening(p) : id === 'S08' ? closing : 0;
  const lens = magnifier(ctx, {
    amount, opacity: closing, guide: id === 'S07' ? phase(p, .30, .52) : 1,
    focus: project(appendixPoint(LENS_SAMPLE, -.5)), time: lerp(start, end, p),
  });
  if (lens && id === 'S07') {
    ctx.save();
    ctx.globalAlpha *= lens.alpha * phase(p, .47, .64) * closeNote(p);
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

  if (id === 'S09' && fading > 0) {
    ctx.save();
    ctx.globalAlpha *= (1 - phase(p, MICROSCOPE_IN, .77)) * closeNote(p);
    label(ctx, '粪石梗阻', 717, 749, project(appendixPoint(CUT.stone)),
      { size: 28, align: 'right', bend: 30, progress: phase(p, .36, .51) });
    label(ctx, '管腔充满黄红色脓液', 1305, 741, project(appendixPoint(CUT.pus)),
      { size: 28, color: red, leader: red, bend: 12, progress: phase(p, .48, .641) });
    ctx.restore();
  }
  const micro = microscope.draw(ctx, id === 'S09' ? p : 0, project(appendixPoint(CUT.center)));
  const subtitle = subtitles.get(id);
  stage.setSubtitles(subtitle, p);
  const paragraph = phase(Math.abs(p - subtitle.breakAt), 0, .059);
  caption.style.opacity = paragraph * phase(p, .014, .063) * (1 - phase(p, .938, 1));
  return { id, p, diameter: state.diameter, camera: camera.scale, scale: pose.scale, lens, micro };
}

await stage.ready;
window.renderAt = t => render(resolveCue(CUES, t));
window.sceneMetrics = { calls, dimensions: DIMENSIONS, incisionWindow, specimen: SPECIMEN, histology: microscope.recipe };
window.renderAt(0);
window.ready = true;
