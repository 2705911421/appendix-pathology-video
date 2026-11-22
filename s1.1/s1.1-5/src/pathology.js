import { createIleocecalAsset, ILEOCECAL_BOX } from '../../shared/anatomyWatercolor.js';
import { arrow, organic, pigment, washLayer } from '../../shared/canvasCore.js';
import { drawStageSwatch } from '../../shared/leftFloatNotes.js';
import { axialComparison } from './ct-film.js';
import { sheet } from './cue-sheet.js';
import { appear, CINNABAR, inkMask, label, penProgress, reveal, SOFT_INK } from './scene-tools.js';

export const cases = [
  { stage: 'simple', title: '单纯性', colorName: '暗红', start: 0,
    lines: ['阑尾轻度增粗 · 薄壁轻度均匀强化', '周围脂肪间隙清晰'] },
  { stage: 'phlegmon', title: '化脓性', colorName: '灰黄', start: .33,
    lines: ['双环靶征 · 厚壁强化、偏心粪石', '周围非对称斑片状脂肪条索'] },
  { stage: 'gangrene', title: '坏疽穿孔', colorName: '焦黑', start: .66,
    lines: ['强化管壁局部缺损 · 提示坏死', '盲肠旁脓肿与腔外游离气泡'] },
];

function specimen({ cx, cy, scale, ...appearance }) {
  return createIleocecalAsset({
    ...appearance, scale, x: cx - ILEOCECAL_BOX.width * scale / 2,
    y: cy - ILEOCECAL_BOX.height * scale / 2,
  });
}

const steps = [916, 1120, 1324];
const inactive = '#6D655B';
const halfDissolve = .03;
const gangreneStart = cases[2].start;
const comparisonCue = sheet.cues.find(cue => cue.id === 'S21');
const carryTime = (comparisonCue.end - comparisonCue.start) * (1 - gangreneStart);

function studyAt(p) {
  const current = cases.findLastIndex(study => p >= study.start);
  const start = cases[current].start;
  const stop = cases[current + 1]?.start ?? Infinity;
  const [second, third] = cases.slice(1).map(study =>
    appear(p, study.start - halfDissolve, study.start + halfDissolve));
  const opacity = stop === Infinity ? 1 : 1 - appear(p, stop - halfDissolve, stop);
  return {
    current,
    weights: [1 - second, second - third, third],
    noteOpacity: (current === 0 ? .82 + .18 * appear(p, start, start + .028) : appear(p, start, start + .028)) * opacity,
    drawIn: appear(p, start, start + .14),
  };
}

export function comparisonScene(stage) {
  const swatches = cases.map(study => drawStageSwatch({ stage: study.stage, y: 465 }));
  const organs = cases.map(({ stage }, i) => specimen({ id: `s115-gross-${i}`, cx: 490, cy: 465, scale: .86, stage }));
  const lighter = 'style="mix-blend-mode:plus-lighter"';
  const art = stage.paint(`
    <g data-color-dots style="isolation:isolate">${swatches.map(({ paint }, i) => `<g data-color-dot="${i}" ${lighter}>${paint}</g>`).join('')}</g>
    <g style="isolation:isolate">${organs.map(({ paint }, i) => `<g data-gross-stage="${i}" ${lighter}>${paint}</g>`).join('')}</g>`);
  const type = stage.lettering(`
    ${label('病理大体示意', 490, 217, { size: 26 })}
    ${label('→', 1018, 115, { size: 25, fill: inactive, weight: 550 })}
    ${label('→', 1222, 115, { size: 25, fill: inactive, weight: 550 })}
    ${cases.map(({ title, colorName }, i) => `<g data-step="${i}">
      ${label(title, steps[i], 115, { size: 26, fill: inactive, weight: 550 })}
    </g><g data-color-name="${i}">${label(colorName, 151, 467, { size: 27, anchor: 'start' })}</g>`).join('')}
    <path data-step-line fill="none" stroke="${CINNABAR}" stroke-width="2.6" stroke-linecap="round"/>`);
  const updateCt = axialComparison(stage, cases);
  const groups = [...art.querySelectorAll('[data-gross-stage]')];
  const dots = [...art.querySelectorAll('[data-color-dot]')];
  organs.forEach((organ, i) => organ.mount(groups[i]));
  const names = [...type.querySelectorAll('[data-color-name]')];
  const headings = [...type.querySelectorAll('[data-step] text')];
  const line = type.querySelector('[data-step-line]');

  return (p, cue) => {
    const state = studyAt(p);
    const { current, weights, noteOpacity } = state;
    const duration = cue.end - cue.start;
    for (const [index, heading] of headings.entries()) {
      const active = index === current;
      const weight = weights[index];
      groups[index].toggleAttribute('hidden', !weight);
      groups[index].setAttribute('opacity', weight);
      dots[index].toggleAttribute('hidden', !weight);
      dots[index].setAttribute('opacity', weight);
      names[index].toggleAttribute('hidden', !active);
      names[index].setAttribute('opacity', noteOpacity);
      heading.setAttribute('fill', active ? CINNABAR : inactive);
      heading.style.fontWeight = active ? '810' : '550';
    }
    if (weights[2]) {
      organs[2].update(groups[2], { time: Math.max(0, p - gangreneStart) * duration });
    }
    updateCt({ ...state, elapsed: p * duration, visibility: 1 });
    const center = steps.reduce((value, x, i) => value + x * weights[i], 0);
    const span = 47 + 28 * appear(p, 0, .15) + 2.2 * Math.sin(p * Math.PI * 6);
    line.setAttribute('d', `M${center - span / 2} 128 Q${center} 123 ${center + span / 2} 127`);
  };
}

function conclusionWash() {
  return washLayer(21430, () => {
    pigment(`M1120 652 C1220 626 1351 647 1469 634 Q1670 625 1771 622 Q1810 627 1800 642
      C1772 674 1706 663 1622 671 C1517 682 1437 674 1344 683 C1235 691 1168 689 1124 677 Q1102 667 1120 652Z`,
    '#CE5A49', 230, { bleed: .25, texture: .82, border: .51 });
  }, 'multiply', [1093, 598, 730, 119]);
}

function warningWash() {
  return washLayer(90721, () => {
    pigment(organic(935, 592, 109, 66, 217, .29, .28), '#D67A4F', 187,
      { bleed: .53, texture: .78, border: .20 });
  }, 'multiply', [781, 487, 312, 212]);
}

export function treatmentScene(stage) {
  const center = 1460;
  const options = { cy: 465, scale: .78 };
  const specimens = [
    specimen({ id: 's115-treatment-phlegmon', cx: 520, stage: 'phlegmon', ...options }),
    specimen({ id: 's115-treatment-gangrene', cx: 875, stage: 'gangrene', exudateBoost: 1.35, ...options }),
  ];
  const arrowLine = 'M1460 407 C1457 432 1464 473 1459 501';
  const art = stage.paint(`
    <g data-warning-wash>${warningWash()}</g>
    ${specimens.map(({ paint }, i) => `<g data-specimen="${i}">${paint}</g>`).join('')}
    ${inkMask('s115-urgency-brush', [1093, 598, 730, 119], [['M1118 668 C1320 659 1577 654 1787 642', 82]])}
    <g data-urgency-wash mask="url(#s115-urgency-brush)">${conclusionWash()}</g>
    ${inkMask('s115-urgency-arrow', [1414, 397, 92, 116], [[arrowLine, 22], ['M1441 473 L1459 501 L1480 475', 27]])}
    <g mask="url(#s115-urgency-arrow)">${arrow(arrowLine, { color: CINNABAR, size: 8.5, head: 23 })}</g>`);

  const type = stage.lettering(`
    <g data-treatment-heading>${label('先评估有无坏疽、穿孔或腹膜炎', center, 265, { size: 29, fill: SOFT_INK, weight: 620 })}</g>
    <g data-treatment-question>${label('怀疑坏疽或穿孔 · 尽快外科评估', center, 335, { size: 34 })}</g>
    <g data-urgency="0">${label('弥漫性腹膜炎 · 通常需紧急手术', center, 575,
      { size: 32, fill: CINNABAR, weight: 810 })}</g>
    <g data-urgency="1">${label('局限性脓肿 · 可先抗感染，必要时引流', center, 672,
      { size: 29, fill: '#4E4137', weight: 690, fit: 680 })}</g>
    <g data-specimen-label="0">${label('化脓性（灰黄）', 520, 714, { size: 26 })}</g>
    <g data-specimen-label="1">${label('坏疽穿孔（焦黑）', 875, 714, { size: 26 })}</g>`);

  const views = [...art.querySelectorAll('[data-specimen]')];
  specimens.forEach((organ, i) => organ.mount(views[i]));
  const labels = [...type.querySelectorAll('[data-specimen-label]')];
  const heading = type.querySelector('[data-treatment-heading]');
  const question = type.querySelector('[data-treatment-question]');
  const wash = art.querySelector('[data-urgency-wash]');
  const warning = art.querySelector('[data-warning-wash]');
  const washTrace = art.querySelector('#s115-urgency-brush path');
  const [shaft, arrowHead] = art.querySelectorAll('#s115-urgency-arrow path');
  const phrases = [...type.querySelectorAll('[data-urgency]')];

  return (p, cue) => {
    const elapsed = p * (cue.end - cue.start);
    reveal(views[0], 1, 17);
    reveal(labels[0], 1, 0);
    reveal(labels[1], 1, 0);
    specimens[1].update(views[1], { time: carryTime + elapsed });
    warning.setAttribute('opacity', (.068 + .032 * Math.sin(elapsed * 1.99)) * appear(p, .06, .25));
    reveal(heading, .9 + .1 * appear(elapsed, 0, .15), 5);
    reveal(question, appear(p, .18, .28), 6);
    penProgress(shaft, appear(p, .34, .51));
    penProgress(arrowHead, appear(p, .47, .57));
    penProgress(washTrace, appear(p, .62, .97));
    reveal(wash, .16 * appear(p, .64, .87), 0);
    for (const [i, phrase] of phrases.entries()) reveal(phrase, appear(p, .45 + .20 * i, .55 + .20 * i), 6);
  };
}
