import {
  appendStorySvg, arrow, createStoryStage, drawStorySubtitles, ease, prepareStorySubtitles, waitForWashes,
} from '../shared/canvasCore.js';
import { APPENDIX_TO_CECUM, createIleocecal } from '../shared/anatomyWatercolor.js';
import { createStoryWindow, drawPathologyProgress, drawStageDots, drawStoryClock } from '../shared/leftFloatNotes.js';
import { drawDoctor, drawPatient } from '../shared/charactersAndHistology.js';

const root = document.querySelector('#plate');
const stage = createStoryStage(root, { paper: new URLSearchParams(location.search).get('paper') !== '0' });
const windowView = createStoryWindow({ id: 'check-window' });
const clock = drawStoryClock({ hour: 10, minute: 14 });
const chronic = drawStageDots({ mode: 'chronic' });
const overview = ['normal', 'simple', 'phlegmon', 'gangrene', 'chronic'].map((key, i) =>
  createIleocecal({ x: 340 + 313 * i, y: 254, scale: .68, stage: key }));
const legend = ['正常', '单纯性', '化脓性', '坏疽性', '慢性'].map((label, i) =>
  `<text class="note" x="${486 + 313 * i}" y="183" font-size="34" text-anchor="middle">${label}</text>`).join('');
const progress = drawPathologyProgress({ stage: 'gangrene' });
const specimen = createIleocecal({ id: 'check-anatomy', x: 660, y: 90, scale: 1.68 });
const patient = drawPatient({ x: 795, y: 169, scale: .88, pose: 'recovered' });
const doctor = drawDoctor({ x: 1405, y: 240, scale: 1.14 });

const slides = [
  {
    paint: windowView.paint + clock.paint + chronic.paint + overview.map(organ => organ.paint).join(''),
    lettering: clock.lettering + chronic.lettering + legend,
    cue: ['同一正面解剖观下的五种状态。', 'Five appearances in the same anterior view.'],
  },
  {
    paint: progress.paint + specimen.paint,
    lettering: `${progress.lettering}<g id="check-anchor"></g>`,
    cue: [{ text: '从阑尾中段纵向开窗，可以看见管腔里的粪石和脓液。', highlights: ['粪石', '脓液'] },
      ['A longitudinal window opens in the mid-appendix,', 'revealing a fecalith and purulent material.']],
  },
  {
    paint: patient.paint + doctor,
    lettering: '<text class="note" x="795" y="140" text-anchor="middle" font-size="34">康复</text><text class="note" x="1405" y="202" text-anchor="middle" font-size="34">临床医生</text>',
    cue: ['康复后的青年与医生。', 'The recovered young man and his physician.'],
  },
].map(slide => ({
  paint: appendStorySvg(stage.paint, slide.paint, { hidden: true }),
  lettering: appendStorySvg(stage.lettering, slide.lettering, { hidden: true }),
  subtitles: prepareStorySubtitles(...slide.cue),
}));
const [drawPaper] = await Promise.all([stage.ready, waitForWashes()]);

function seekSpecimen(localTime) {
  return specimen.update(slides[1].paint, {
    fromStage: 'phlegmon', stage: 'gangrene', stageProgress: ease(localTime / 2), cutaway: 1, showThrombus: 1,
  });
}

function renderAt(t) {
  const index = t >= 8 ? 2 : t >= 4 ? 1 : 0;
  const time = t - 4 * index;
  for (const [position, slide] of slides.entries()) {
    slide.paint.toggleAttribute('hidden', position !== index);
    slide.lettering.toggleAttribute('hidden', position !== index);
  }
  if (index === 0) windowView.update(slides[0].paint, time / 4);
  if (index === 1) {
    const { thrombusX, thrombusY } = seekSpecimen(time);
    slides[1].lettering.querySelector('#check-anchor').innerHTML = `
      <text class="note" x="1398" y="549" font-size="38" fill="#54283F">系膜静脉血栓</text>
      ${arrow(`M1378 544 Q1255 547 ${thrombusX} ${thrombusY}`, { color: '#54283F', size: 3.7 })}`;
  }
  drawPaper(index);
  stage.setSubtitles(slides[index].subtitles, time / 4);
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

window.verifySharedComponents = () => {
  renderAt(0);
  const day = slides[0].paint.querySelector('#check-window-day');
  const night = slides[0].paint.querySelector('#check-window-night');
  check(day.getAttribute('opacity') === '1' && night.getAttribute('opacity') === '0', 'Day window opacity');
  renderAt(2);
  check(day.getAttribute('opacity') === '0.5' && night.getAttribute('opacity') === '0.5', 'Dusk blend');
  windowView.update(slides[0].paint, 1);
  check(day.getAttribute('opacity') === '0' && night.getAttribute('opacity') === '1', 'Night window opacity');
  check(slides[0].lettering.textContent.includes('慢性转化 · 增生登场'), 'Chronic status absent');
  const noteViewports = root.querySelectorAll('.story-layer > svg svg');
  for (const element of noteViewports) {
    check(+element.getAttribute('x') === 65 && +element.getAttribute('width') === 245, 'Note outside the left margin');
  }
  const organ = slides[1].paint;
  renderAt(4);
  const position = seekSpecimen(0);
  const full = seekSpecimen(2);
  const middle = seekSpecimen(1);
  check(position.diameter < middle.diameter && middle.diameter < full.diameter, 'Tube failed to swell progressively');
  check(position.cecum.x < position.valve.x && position.valve.x < position.ileum.x, 'Anterior orientation is mirrored');
  check(position.appendixBase.x < position.appendixTip.x && position.appendixBase.y < position.appendixTip.y, 'Appendix tip orientation');
  const clot = organ.querySelector('#check-anatomy-clot');
  const point = new DOMPoint(0, 0).matrixTransform(clot.getCTM());
  check(Math.hypot(point.x - middle.thrombusX, point.y - middle.thrombusY) < 1e-4, 'Thrombus coordinates do not match the vessel');
  check(Number(organ.querySelector('#check-anatomy-stone').getAttribute('opacity')) === 1, 'Fecalith absent from the window');
  const lumen = organ.querySelector('#check-anatomy-lumen-shape').getBBox();
  check(lumen.width > lumen.height && lumen.height > 0, 'Window should be longitudinal');
  specimen.update(organ, { stage: 'chronic', cutaway: 1 });
  check(organ.querySelector('#check-anatomy-pus').getAttribute('opacity') === '0', 'Chronic cutaway should show narrowing');

  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  const records = [];
  const fill = ctx.fillText.bind(ctx);
  ctx.fillText = (text, x, y) => {
    const matrix = ctx.getTransform();
    const left = matrix.transformPoint({ x, y });
    const right = matrix.transformPoint({ x: x + ctx.measureText(text).width, y });
    records.push({ text, left: left.x, right: right.x, baseline: left.y, color: ctx.fillStyle, font: ctx.font });
    fill(text, x, y);
  };
  drawStorySubtitles(ctx, { text: '病理切片：' + '阑'.repeat(105), highlights: ['切片'] }, 'It’s a test. '.repeat(45), .06);
  check(records.some(item => item.color === '#c43428' && item.font.includes('42px')), 'Canvas highlight missing');
  check(records.some(item => item.text.includes("It's") && item.font.includes('24px')), 'English apostrophe or font size');
  check(new Set(records.map(item => item.baseline)).size === 2, 'Canvas captions overlap');
  check(records.every(item => item.left >= 61.99 && item.right <= 1858.01), 'Canvas caption spills into the margin');
  return { lengthRatio: APPENDIX_TO_CECUM.toFixed(2), thrombus: [middle.thrombusX, middle.thrombusY] };
};

renderAt(0);
window.renderAt = renderAt;
