import {
  arrow, cellDot, clamp, fillPath, ink, inkLines, organic, pencil, pigment, roughProp, washLayer,
} from '../../shared/canvasCore.js';
import { logicalContext, sizeRaster } from '../../shared/detail/raster.js';
import { drawMinimalDoctor } from '../../shared/minimalistCharacters.js';
import { appear, CINNABAR, inkMask, label, penProgress, reveal } from './scene-tools.js';

const pivot = { x: 1368, y: 265 };
const doctorBox = { x: 282, y: 228, width: 343, height: 459 };
const baseY = 555;
const loadedAngle = -11;
const radians = angle => angle * Math.PI / 180;
const arms = [-193, 192].map(x => x / Math.cos(radians(loadedAngle)));
const suspension = 477 - 17 - pivot.y - arms[0] * Math.sin(radians(loadedAngle));
const beamPath = `M${arms[0]} 0 Q-151 -3 -83 -5 Q-35 -9 0 -13 Q53 -9 101 -5 Q176 -3 ${arms[1]} 0`;
const indigo = '#2F5D7C';
const navel = [888, 279];
const rightAsis = [840, 396];
const mcburney = rightAsis.map((value, i) => value + (navel[i] - value) / 3);
const routeEnd = [895, 423];
const clinicalX = 1039;
const symptomLabel = { x: clinicalX, y: 564 };
const examLabel = { x: clinicalX, y: symptomLabel.y + 26 };
const labsBaseline = examLabel.y + 26;
const statDrop = 34;
const painRoute = `M${navel.join(' ')} C905 326 902 374 ${routeEnd.join(' ')}`;
const examGuide = `M${rightAsis.join(' ')} L${navel.join(' ')}`;
const locatorLinks = [
  { id: 's19-symptom-link', color: CINNABAR,
    d: `M${clinicalX - 36} ${symptomLabel.y - 8} C971 549 955 522 943 493 Q927 452 ${routeEnd.join(' ')}` },
  { id: 's19-exam-link', color: indigo,
    d: `M${clinicalX - 40} ${examLabel.y - 7} C944 592 891 584 865 536 C842 491 852 407 ${mcburney.join(' ')}` },
];

function abdominalLocator() {
  const pelvis = inkLines([
    'M836 223 C838 248 828 270 819 291 Q811 315 811 340',
    'M930 221 C928 247 938 267 944 290 Q951 316 948 342',
    'M869 323 Q886 331 900 323 L899 350 Q885 368 874 349Z',
    'M873 339 Q851 319 830 330 C805 340 801 371 818 395 Q833 407 847 401 C861 393 865 361 873 339Z',
    'M898 339 Q921 319 942 332 C963 343 962 375 946 395 Q931 407 918 401 C904 390 910 360 898 339Z',
    'M828 394 Q820 411 834 430 Q844 443 863 446 Q875 461 886 462 Q902 460 912 445 Q932 439 942 419 L945 395',
    'M843 413 C850 403 873 407 874 422 Q871 436 855 434 Q844 428 843 413Z',
    'M931 413 C924 403 902 407 899 422 Q903 436 918 434 Q929 428 931 413Z',
    'M877 354 Q886 361 895 354',
    'M885 447 Q880 454 886 462',
  ], { color: '#697C7E', opacity: .78, size: 1.8, taperStart: 5, taperEnd: 7 });
  const links = locatorLinks.map(({ id, color, d }) =>
    `${inkMask(id, [835, 338, 254, 307], [[d, 36]])}
    <g data-locator-link="${id}" fill="${color}" mask="url(#${id})">
      ${arrow(d, { color, size: 5.4, head: 17 })}
    </g>`).join('');
  return {
    paint: `<g data-abdominal-locator>
      <g data-pelvis-linework>${pelvis}</g>
      <path d="${examGuide}" stroke="${indigo}" stroke-width="1.35" stroke-dasharray="3 5" opacity=".47"/>
      <path id="s19-pain-route" d="${painRoute}" fill="none" stroke="${CINNABAR}" stroke-width="2.7"
        stroke-dasharray="5 7" stroke-linecap="round" opacity=".78"/>
      <circle id="s19-navel" cx="${navel[0]}" cy="${navel[1]}" r="3.9" fill="#745649"/>
      <circle id="s19-right-asis" cx="${rightAsis[0]}" cy="${rightAsis[1]}" r="2.6" fill="#816E65"/>
      <circle id="s19-mcburney" cx="${mcburney[0]}" cy="${mcburney[1]}" r="8.3" fill="#F5F1E9"
        stroke="${indigo}" stroke-width="2.2"/>
      <circle cx="${mcburney[0]}" cy="${mcburney[1]}" r="3.4" fill="${CINNABAR}"/>
      ${links}
    </g>`,
    lettering: `<g data-abdominal-locator-labels>
      ${label('肚脐', 908, 270, { size: 20, weight: 680, anchor: 'start' })}
      ${label('麦氏点', 826, 360, { size: 21, fill: indigo, weight: 720, anchor: 'end' })}
      ${label('脐周 → 右下腹', 867, 198, { size: 22, fill: CINNABAR, weight: 720 })}
    </g>`,
  };
}

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
  const pans = [pan(108, true), pan(105, false)];
  const hub = cellDot(0, 0, 18, 18, '#E5D2B0')
    + roughProp('ellipse', [0, 0, 36, 36], 721, '#665243', 3.7, .29) + cellDot(0, 0, 5.5, 5.5, '#88725C');
  const locator = abdominalLocator();
  const art = stage.paint(`
    <g data-diagnosis-figures>
      <g data-entry-part="subject">
      <foreignObject data-doctor x="${doctorBox.x}" y="${doctorBox.y}" width="${doctorBox.width}" height="${doctorBox.height}">
        <canvas xmlns="http://www.w3.org/1999/xhtml" width="${doctorBox.width}" height="${doctorBox.height}" style="display:block"></canvas>
      </foreignObject>
      <g data-clinical-wash>${inkWash()}</g>
      <g data-scale transform="translate(${pivot.x} ${pivot.y})">${base}
        <g data-beam>${crossbar}</g><g data-pan="left">${pans[0]}</g>
        <g data-pan="right"><g data-ct-weight>${scanner()}</g>${pans[1]}</g>${hub}
      </g>
      ${locator.paint}
      </g>
    </g>
    <g transform="translate(0 ${statDrop})">
      ${inkMask('s115-stat-brush', [990, 638, 760, 112], [['M1018 711 C1209 683 1447 699 1710 678', 80]])}
      <g data-stat-wash mask="url(#s115-stat-brush)">${statisticWash()}</g>
    </g>`);

  const type = stage.lettering(`
    <g data-diagnosis-notes data-entry-part="subject">
      <g data-question>${label('怀疑急性阑尾炎，先做什么？', 1120, 110, { size: 34 })}</g>
      ${locator.lettering}
      <g data-clinical-caption>
        <g data-symptoms>${label('典型症状：转移性右下腹痛', symptomLabel.x, symptomLabel.y,
          { size: 21, fill: CINNABAR, anchor: 'start' })}</g>
        <g data-exam>${label('体格检查：麦氏点压痛、<tspan font-weight="790">反跳痛与腹肌紧张</tspan>（腹膜刺激征）', examLabel.x, examLabel.y,
          { size: 21, fill: indigo, anchor: 'start' })}</g>
        <g data-labs>${label('化验结果', clinicalX, labsBaseline, { size: 21, weight: 570, anchor: 'start' })}</g>
      </g>
      <g data-ct-caption>
        ${label('CT 检查', 1560, 450, { size: 26, fill: CINNABAR })}
        ${label('（重要辅助工具，非人人必做）', 1560, 484, { size: 24, fill: '#5C564E', weight: 600 })}
      </g>
    </g>
    <g data-stat>${label(`多层螺旋 CT 诊断敏感度 <tspan font-size="56" fill="${CINNABAR}" font-weight="820">&gt; 93%</tspan>`,
      1365, 695 + statDrop, { size: 30 })}</g>
    <g data-stat-scope>${label('成人疑似急性阑尾炎 · 文献汇总', 1365, 746 + statDrop, { size: 22, weight: 550 })}</g>`);

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
  const locationSketch = art.querySelector('[data-abdominal-locator]');
  const locationLabels = type.querySelector('[data-abdominal-locator-labels]');
  const linkMasks = locatorLinks.map(({ id }) => art.querySelector(`#${id} path`));
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
    const ct = second ? appear(p, .16, .36) : 0;
    const statistic = second ? appear(p, .43, .79) : 0;
    const angle = second ? loadedAngle + 4 * settle(p, .035, .35) : loadedAngle * settle(p, 0, .70);
    const landed = appear(elapsed, 0, .15);
    const seconds = cue.start + elapsed;
    doctorCtx.clearRect(0, 0, doctorBox.width, doctorBox.height);
    drawMinimalDoctor(doctorCtx, { x: 405 - doctorBox.x, y: 249 - doctorBox.y, scale: .97,
      pose: 'explain', breathPhase: seconds * 2 * Math.PI / 3.85, nod: .58 });
    reveal(doctor, 1, 18);
    scale.setAttribute('opacity', 1);
    beamGroup.setAttribute('transform', `rotate(${angle})`);
    const positions = arms.map(arm => bearing(arm, angle));
    positions.forEach(([x, y], i) => panGroups[i].setAttribute('transform', `translate(${x} ${y})`));
    const [rightX, rightY] = positions[1];
    auxiliary.setAttribute('transform', `translate(${pivot.x + rightX - 1560} ${pivot.y + rightY + suspension + 17 - 400})`);
    const [x, y] = positions[0];
    wash.setAttribute('transform', `translate(${pivot.x + x - 1115} ${pivot.y + y + suspension - 460})`);
    wash.setAttribute('opacity', .16 * clinical);
    weight.setAttribute('transform', `translate(0 ${suspension - 4 * (1 - landed)})`);
    weight.setAttribute('opacity', ct);
    reveal(question, 1, 0);
    const symptomReveal = appear(opening, .27, .44);
    const examReveal = appear(opening, .43, .60);
    const guideReveal = second ? 0 : 1 - appear(p, .90, 1);
    locationSketch.setAttribute('opacity', guideReveal);
    locationLabels.setAttribute('opacity', guideReveal);
    reveal(symptoms, symptomReveal, 0);
    reveal(exam, examReveal, 0);
    penProgress(linkMasks[0], symptomReveal);
    penProgress(linkMasks[1], examReveal);
    reveal(labs, appear(opening, .59, .74), 4);
    auxiliary.setAttribute('opacity', ct);
    penProgress(statBrush, statistic);
    statWash.setAttribute('opacity', .16 * appear(statistic, 0, .20));
    reveal(stat, second ? appear(p, .40, .52) : 0, 6);
    reveal(statScope, second ? appear(p, .46, .60) : 0, 6);
  };
}
