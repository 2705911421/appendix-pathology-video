import {
  cellDot, clamp, fillPath, ink, inkLines, organic, pencil, pigment, roughProp, washLayer,
} from '../../shared/canvasCore.js';
import { logicalContext, sizeRaster } from '../../shared/detail/raster.js';
import { drawMinimalDoctor } from '../../shared/minimalistCharacters.js';
import { appear, CINNABAR, inkMask, label, penProgress, reveal } from './scene-tools.js';

const pivot = { x: 1345, y: 265 };
const doctorBox = { x: 415, y: 214, width: 460, height: 556 };
const baseY = 555;
const loadedAngle = -11;
const radians = angle => angle * Math.PI / 180;
const arms = [-230, 240].map(x => x / Math.cos(radians(loadedAngle)));
const suspension = 477 - 17 - pivot.y - arms[0] * Math.sin(radians(loadedAngle));
const panLabels = [{ x: 1115, bottom: 477 }, { x: 1585, bottom: 400 }];
const beamPath = `M${arms[0]} 0 Q-151 -3 -83 -5 Q-35 -9 0 -13 Q53 -9 101 -5 Q176 -3 ${arms[1]} 0`;

function stand() {
  const upright = 'M-17 16 Q-9 115 -13 233 L-17 280 Q-9 285 0 284 Q11 285 18 280 L13 232 Q9 114 17 16Z';
  const foot = 'M-38 -4 Q-35 -9 -24 -9 L24 -9 Q33 -8 38 -4 Q35 0 28 0 L-28 0 Q-35 0 -38 -4Z';
  const profile = fillPath(upright, '#B9AC96', .58)
    + fillPath('M-13 28 Q-7 129 -10 233 L-14 281 L2 285 L4 28Z', '#FAF1DF', .73)
    + ink(upright, { size: 4.6, color: '#5E5043', taperStart: 3, taperEnd: 3 })
    + ink('M8 47 Q4 136 9 224 Q11 249 13 268', { size: 3.8, opacity: .51, color: '#8D7966' });
  return `${profile}<g data-scale-foot transform="translate(0 ${baseY - pivot.y})">${fillPath(foot, '#DDD1BC', .9)}
    ${ink(foot, { size: 3.4, color: '#5E5043', taperStart: 2, taperEnd: 2 })}
    ${ink('M-28 -4 Q4 -7 28 -4', { size: 1.9, opacity: .49, color: '#967E65' })}</g>`;
}

function beam() {
  const outline = `${beamPath} Q229 10 187 10 Q66 10 17 18 Q2 23 -17 18 Q-71 8 -177 10 Q-218 9 ${arms[0]} 0Z`;
  return fillPath(outline, '#BAA68F', .88) + roughProp('path', [outline], 611, '#6D5948', 3.9, .34)
    + ink(beamPath, { size: 5.8, color: '#574638', taperStart: 9, taperEnd: 9 })
    + ink('M-194 4 Q-59 4 -14 -5 M17 -5 Q97 5 195 4', { size: 2.85, color: '#F2DEBF' })
    + cellDot(arms[0], 0, 6, 6, '#736050') + cellDot(arms[1], 0, 6, 6, '#736050');
}

function pan(width, warm) {
  const y = suspension;
  const tray = `M${-width} ${y} Q0 ${y - 8} ${width} ${y} Q${width * .76} ${y + 17} 1 ${y + 17}
    Q${-width * .76} ${y + 17} ${-width} ${y}Z`;
  return inkLines([`M0 6 Q${-.40 * width} ${y * .62} ${-width + 13} ${y - 2}`,
    `M0 6 Q${.40 * width} ${y * .62} ${width - 13} ${y - 2}`],
    { color: '#786957', size: 4, taperStart: 1, taperEnd: 2 })
    + fillPath(tray, warm ? '#DDAD93' : '#DCD3C1', .84)
    + roughProp('path', [tray], warm ? 319 : 421, '#68584A', 3.3, .37)
    + ink(`M${-width + 9} ${y + 2} Q0 ${y + 10} ${width - 8} ${y + 2}`, { size: 3.3, color: '#856B58' })
    + ink(`M${-width * .67} ${y + 8} Q-1 ${y + 15} ${width * .61} ${y + 8}`,
      { size: 3.9, color: '#F6E6CC', opacity: .76 });
}

function bearing(arm, angle) {
  const a = radians(angle);
  return [arm * Math.cos(a), arm * Math.sin(a)];
}

function settle(p, start, end) {
  const u = clamp((p - start) / (end - start));
  if (u === 0 || u === 1) return u;
  const time = 12.6 * u;
  return 1 - Math.exp(-9.2 * u) * (Math.cos(time) + Math.sin(time) * 9.2 / 12.6);
}

function scanner() {
  const outer = 'M-34 -6 Q-39 -13 -39 -38 Q-39 -73 -2 -75 Q37 -76 39 -39 Q41 -12 31 -6Z';
  return fillPath(outer, '#EDE8DF') + ink(outer, { color: '#6D6C66', size: 3.3, taperStart: 2, taperEnd: 2 })
    + cellDot(0, -40, 23, 24, '#CACBCD') + cellDot(0, -40, 17, 18, '#647177')
    + roughProp('ellipse', [0, -40, 46, 47], 1324, '#747A7C', 1.35, .27)
    + fillPath('M-8 -30 H21 Q24 -29 24 -25 H-12 Q-12 -29 -8 -30Z', '#ECE7DD')
    + fillPath('M12 -25 H18 L21 -9 H10Z', '#BBBAB3')
    + ink('M-34 -6 Q0 -5 31 -6', { color: '#807267', size: 2.4 });
}

function inkWash() {
  return washLayer(38512, () => {
    pigment(organic(1115, 438, 134, 24, 478, .18, -.04), '#AC4338', 227,
      { bleed: .28, border: .68, texture: .82 });
    pencil('M1038 439 Q1113 450 1191 438 Q1159 457 1063 450Z', 'HB', '#AF7165',
      { distance: 5.1, angle: 27, weight: .33 });
  }, 'multiply', [947, 384, 335, 101]);
}

function statisticWash() {
  return washLayer(8613, () => {
    const tail = `M1025 698 C1080 666 1202 675 1307 672 C1423 668 1562 674 1691 660
      Q1731 671 1694 690 C1610 719 1501 711 1373 714 C1217 715 1104 726 1043 721 Q1018 717 1025 698Z`;
    pigment(tail, '#C95043', 227, { bleed: .21, border: .50, texture: .86 });
  }, 'multiply', [995, 642, 750, 109]);
}

export function diagnosisScene(stage) {
  const base = stand();
  const crossbar = beam();
  const pans = [pan(115, true), pan(105, false)];
  const hub = cellDot(0, 0, 18, 18, '#E5D2B0')
    + roughProp('ellipse', [0, 0, 36, 36], 721, '#665243', 3.7, .29) + cellDot(0, 0, 5.5, 5.5, '#88725C');
  const miniature = `<g data-entry-part="icon" transform="translate(185 296) scale(.255)" opacity=".59">${base}
    <g transform="rotate(${loadedAngle})">${crossbar}</g>
    ${arms.map((arm, i) => `<g transform="translate(${bearing(arm, loadedAngle).join(' ')})">${pans[i]}</g>`).join('')}
    ${hub}</g>`;
  const art = stage.paint(`
    <g data-diagnosis-figures>
      ${miniature}
      <g data-entry-part="subject">
      <foreignObject data-doctor x="${doctorBox.x}" y="${doctorBox.y}" width="${doctorBox.width}" height="${doctorBox.height}">
        <canvas xmlns="http://www.w3.org/1999/xhtml" width="${doctorBox.width}" height="${doctorBox.height}" style="display:block"></canvas>
      </foreignObject>
      <g data-clinical-wash>${inkWash()}</g>
      <g data-scale transform="translate(${pivot.x} ${pivot.y})">${base}
        <g data-beam>${crossbar}</g><g data-pan="left">${pans[0]}</g>
        <g data-pan="right"><g data-ct-weight>${scanner()}</g>${pans[1]}</g>${hub}
      </g>
      </g>
    </g>
    ${inkMask('s115-stat-brush', [990, 638, 760, 112], [['M1018 711 C1209 683 1447 699 1710 678', 80]])}
    <g data-stat-wash mask="url(#s115-stat-brush)">${statisticWash()}</g>`);

  const type = stage.lettering(`
    <g data-diagnosis-notes data-entry-part="subject">
      <g data-question>${label('怀疑急性阑尾炎，先做什么？', 1120, 110, { size: 34 })}</g>
      <g data-clinical-caption>
        <g data-symptoms>${label('典型症状（转移性右下腹痛）', 1115, 526, { size: 26 })}</g>
        <g data-exam>${label('+ 体格检查（麦氏点压痛、反跳痛）', 1115, 562, { size: 25, fit: 368 })}</g>
        <g data-labs>${label('+ 化验结果', 1115, 598, { size: 24, weight: 570 })}</g>
      </g>
      <g data-ct-caption>
        ${label('CT 检查', 1585, 450, { size: 26, fill: CINNABAR })}
        ${label('（重要辅助工具，非人人必做）', 1585, 484, { size: 24, fill: '#5C564E', weight: 600 })}
      </g>
    </g>
    <g data-stat>${label(`多层螺旋 CT 诊断敏感度 <tspan font-size="56" fill="${CINNABAR}" font-weight="820">&gt; 93%</tspan>`,
      1365, 695, { size: 30 })}</g>
    <g data-stat-scope>${label('成人疑似急性阑尾炎 · 文献汇总', 1365, 746, { size: 22, weight: 550 })}</g>`);

  const doctor = art.querySelector('[data-doctor]');
  const doctorCtx = logicalContext(sizeRaster(doctor.firstElementChild, doctorBox.width, doctorBox.height));
  const scale = art.querySelector('[data-scale]');
  const wash = art.querySelector('[data-clinical-wash]');
  const beamGroup = art.querySelector('[data-beam]');
  const panGroups = [...art.querySelectorAll('[data-pan]')];
  const weight = art.querySelector('[data-ct-weight]');
  const statBrush = art.querySelector('#s115-stat-brush path');
  const statWash = art.querySelector('[data-stat-wash]');
  const question = type.querySelector('[data-question]');
  const clinicalCaption = type.querySelector('[data-clinical-caption]');
  const symptoms = type.querySelector('[data-symptoms]');
  const exam = type.querySelector('[data-exam]');
  const labs = type.querySelector('[data-labs]');
  const auxiliary = type.querySelector('[data-ct-caption]');
  const stat = type.querySelector('[data-stat]');
  const statScope = type.querySelector('[data-stat-scope]');

  return (p, cue) => {
    const second = cue.id === 'S20';
    const opening = second ? 1 : p;
    const clinical = appear(opening, .20, .57);
    const elapsed = (cue.end - cue.start) * p;
    const ct = second ? .88 + .12 * appear(elapsed, 0, .15) : 0;
    const statistic = second ? appear(p, .43, .79) : 0;
    const angle = second ? loadedAngle + 4 * settle(p, .035, .35) : loadedAngle * settle(p, 0, .70);
    const landed = appear(elapsed, 0, .15);
    const seconds = cue.start + elapsed;
    doctorCtx.clearRect(0, 0, doctorBox.width, doctorBox.height);
    drawMinimalDoctor(doctorCtx, { x: 595 - doctorBox.x, y: 224 - doctorBox.y, scale: 2.04,
      pose: 'explain', breathPhase: seconds * 2 * Math.PI / 3.85, nod: .58 });
    reveal(doctor, 1, 18);
    scale.setAttribute('opacity', 1);
    beamGroup.setAttribute('transform', `rotate(${angle})`);
    const positions = arms.map(arm => bearing(arm, angle));
    [clinicalCaption, auxiliary].forEach((caption, i) => {
      const [x, y] = positions[i];
      const { x: baselineX, bottom } = panLabels[i];
      const panBottom = pivot.y + y + suspension + 17;
      panGroups[i].setAttribute('transform', `translate(${x} ${y})`);
      caption.setAttribute('transform', `translate(${pivot.x + x - baselineX} ${panBottom - bottom})`);
    });
    const [x, y] = positions[0];
    wash.setAttribute('transform', `translate(${pivot.x + x - 1115} ${pivot.y + y + suspension - 460})`);
    wash.setAttribute('opacity', .16 * clinical);
    weight.setAttribute('transform', `translate(0 ${suspension - 4 * (1 - landed)})`);
    weight.setAttribute('opacity', ct);
    reveal(question, 1, 0);
    reveal(symptoms, appear(opening, .27, .44), 4);
    reveal(exam, appear(opening, .43, .60), 4);
    reveal(labs, appear(opening, .59, .74), 4);
    auxiliary.setAttribute('opacity', ct);
    penProgress(statBrush, statistic);
    statWash.setAttribute('opacity', .16 * appear(statistic, 0, .20));
    reveal(stat, second ? appear(p, .40, .52) : 0, 6);
    reveal(statScope, second ? appear(p, .46, .60) : 0, 6);
  };
}
