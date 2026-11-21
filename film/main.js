import {PAPER, INK, MUTED, COLORS, STAGES, arrow, box, clamp, ease, ellipse, label,
  line, measureAnnotations, mix, note, paper, prepareWash, shape, wash} from './art.js';
import {figureAssets, migration, organs, waveHand} from './anatomy.js';
import {cross, grossAssets, leaks, mesentericVein, perforation, thrombosis} from './gross.js';
import {histologyAssets, highlight, LAYERS, lens, SIMPLE_MUSCLE, tissueMotion, vesselInsetMotion} from './histology.js';
import {ctAssets, drawScanCards, scanWeights} from './ct.js';
import {textbook, imaging, msct, msctSensitivity, treatment, histologySource} from './references.js';

const chapters = [
  ['片头悬念', '四种颜色', '病程示意'], ['临床警报', '从脐周到右下腹', '症状与体征'],
  ['灰黄的真相', '变质与渗出', '大体与镜下'], ['经典三型', '炎症可以加深', '病例路径可不同'],
  ['诊断与处理', '临床判断与影像', '治疗紧迫性'], ['慢性改变', '反复炎症与修复', '病程延至数月'],
  ['及时就医', '读懂身体警报', '复习四色演变'],
];
const focus = {
  pink: 0, red: 1, yellow: 2, black: 3, title: 0, noon: 0, navel: 0, migrate: 1, target: 1, fever: 1, alarm: 1,
  coat: 2, open: 2, layers: 2, mucosa: 2, vessel: 2, cells: 2, serosa: 2,
  compare: 1, simple: 1, phlegmon: 2, thrombus: 3, rupture: 3, doctor: 1, ct0: 1, ct1: 2, ct2: 3, triage: 3,
};
const palette = ['#8C4C58', '#AA3332', '#846017', '#393039'];
const sectionNames = ['正常阑尾', '单纯性阑尾炎', '蜂窝织炎性阑尾炎', '坏疽性阑尾炎', '慢性改变'];
const keywords = /(粉白|暗红|灰黄|焦黑|麦氏点|右下腹|变质|渗出|增生|脓细胞|脓苔|中性粒细胞|坏疽|穿孔|纤维化|淋巴细胞|浆细胞|尽快就医)/gu;
const canvas = document.querySelector('#frame');
const g = canvas.getContext('2d', {alpha: false});

window.ready = false;
const timelineResponse = await fetch('./timeline.json');
if (!timelineResponse.ok) throw Error('Cannot open timeline.json');
const timeline = await timelineResponse.json();
const {fps, cues, creditsFrame} = timeline;
await document.fonts.load('700 44px Notes', '一根香肠的变质日记 Acute appendicitis');
await document.fonts.ready;
await prepareWash();
const background = paper();
const creditPaper = paper(false);
const figures = figureAssets();
const specimens = grossAssets();
const histology = histologyAssets();
const ct = ctAssets();
const actStarts = cues.filter((cue, index) => !index || cue.act !== cues[index - 1].act)
  .map(cue => cue.startFrame).concat(creditsFrame);

const shotRuns = cues.map((cue, index) => {
  let first = index;
  let last = index;
  while (first > 0 && cues[first - 1].act === cue.act && cues[first - 1].shot === cue.shot) first--;
  while (last < cues.length - 1 && cues[last + 1].act === cue.act && cues[last + 1].shot === cue.shot) last++;
  return {start: cues[first].startFrame, end: cues[last].endFrame, first};
});

function cueAt(frame) {
  let left = 0, right = cues.length - 1;
  while (left < right) {
    const mid = (left + right) >>> 1;
    if (frame >= cues[mid].endFrame) left = mid + 1;
    else right = mid;
  }
  return left;
}

function colourState(cue, phase, elapsed, frame) {
  if (cue.act === 6) return {label:'慢性转化 · 纤维化增生', grey:true, lights:[0,0,0,0]};
  if (cue.act === 5) {
    if (!/^ct[0-2]$/u.test(cue.shot)) return {label:'临床分型评估', lights:[0,.36,.36,.36]};
    const weights = scanWeights(Number(cue.shot.at(-1)), elapsed);
    const overview = 1-Math.max(...weights);
    return {label:overview > .98 ? '临床分型评估' : '影像分型', lights:[0,...weights.map(w => .3*overview + w)]};
  }
  if (cue.act === 7) {
    const opening = cues.find(item => item.shot === 'recover');
    const spoken = opening.audioFrames/fps;
    const t = (frame-opening.startFrame)/fps;
    const lights = [.05,.24,.43,.59].map(fraction => {
      const age=t-fraction*spoken;
      return ease(age/.24) * (.28+.72*(1-ease((age-.42)/.74)));
    });
    return {label:'四色回顾',lights};
  }
  return {label:'颜色标尺',lights:STAGES.map((_,i)=>i===phase?1:0)};
}

function swatches(ctx, state, elapsed) {
  const y = 732;
  label(ctx, state.label, 54, y - 27, 28, INK, 820);
  STAGES.forEach((text, i) => {
    const x = 55 + 105*i, glow = state.lights[i];
    const edge = 63+(12+2*Math.sin(elapsed*2.3))*glow;
    const shift = (78 - edge) / 2;
    const tone = state.grey ? ['#ECE5DF','#CAC0BA','#B3ABA7','#867D7A'][i] : COLORS[i];
    box(ctx, x + shift, y + shift, edge, 48+12*glow, 8, tone, glow > .18 ? '#61444A' : '#987F74', 1.2+3.7*glow);
    if (i < 3) arrow(ctx, x + 79, y + 33, x + 95, y + 33, '#947C76', 1.9);
    label(ctx, text, x + 39, y + 98, 28, INK, 610+220*glow, 'center');
  });
}

function clockPanel(ctx, moment, k) {
  const labels = [['12:00', '午饭后'], ['18:00', '疼痛转移'], ['22:00', '急诊入院']];
  const [clock, time] = labels[moment];
  const x = 123, y = 301;
  ellipse(ctx, x, y, 62, 62, '#F8EEE5', '#876759', 2.5);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    line(ctx, [[x + 49 * Math.cos(a), y + 49 * Math.sin(a)], [x + 55 * Math.cos(a), y + 55 * Math.sin(a)]], '#826455', i % 3 ? 1.4 : 2.5);
  }
  const hh = [0, Math.PI, Math.PI * 5 / 3][moment] + .07 * k;
  line(ctx, [[x,y],[x + 34 * Math.sin(hh),y - 34 * Math.cos(hh)]], INK, 4);
  line(ctx, [[x,y],[x,y - 47]], '#A63D39', 2.2);
  ellipse(ctx, x, y, 5, 5, INK);
  box(ctx, 218, 244, 212, 113, 11, moment === 2 ? '#65576A' : moment === 1 ? '#F0B892' : '#F7D6A0', '#80685E', 2.4);
  shape(ctx, 'M221 334 Q271 295 328 323 T427 327 L427 353 L221 353Z', moment === 2 ? '#857591' : '#BA827C');
  if (moment === 2) {
    ellipse(ctx, 370, 277, 22, 22, '#F8DBA1'); ellipse(ctx, 379, 269, 18, 18, '#65576A');
    for (const [a,b] of [[248,278],[288,292],[306,269],[342,289],[399,303]]) ellipse(ctx, a, b, 2.3, 2.3, '#FFDEAC');
  } else ellipse(ctx, moment === 0 ? 285 : 368, moment === 0 ? 280 : 319, 18, 18, '#FFE6A0', '#BA8054', 1.2);
  line(ctx, [[220,302],[429,302]], '#FFF5DB78', 1.7);
  line(ctx, [[323,246],[323,355]], '#FFF5DB82', 2.2);
  label(ctx, `${clock}  ${time}`, 58, 414, 37, INK, 800);
  const temp = [36.9, 38.0, 39.3][moment];
  box(ctx, 398, 428, 26, 131, 13, '#FCF9F2', '#665151', 1.6);
  ellipse(ctx, 411, 566, 20, 20, '#F7DCD1', '#665151', 1.6);
  box(ctx, 405, 547 - (temp - 36.4) * 32, 12, 11 + (temp - 36.4) * 32, 6, '#C94B42');
  ellipse(ctx, 411, 566, 11, 11, '#C94B42');
  for (const y1 of [454,477,500,523]) line(ctx, [[425,y1],[438,y1]], '#806966', 1.4);
  label(ctx, `${temp.toFixed(1)} ℃`, 59, 489, 49, '#A33232', 850);
  if (moment === 2) {
    note(ctx, '白细胞 13×10⁹/L', 60, 545);
    note(ctx, '中性粒细胞 87%', 60, 588);
  } else note(ctx, moment ? '转移性右下腹痛' : '脐周疼痛 · 恶心', 60, 545);
}

function sidebar(ctx, cue, state, k, elapsed, frame) {
  const act = cue.act - 1;
  const [chapter, subtitle] = chapters[act];
  label(ctx, `第${'一二三四五六七'[act]}幕  /  共七幕`, 54, 86, 28, '#473336', 760);
  label(ctx, chapter, 51, 153, 51, INK, 880);
  label(ctx, subtitle, 54, 201, 30, '#3C3234', 700);
  line(ctx, [[54,226],[452,226]], '#C9AE9F', 1.8);
  if (cue.act === 2) {
    const moment = ['noon','navel'].includes(cue.shot) ? 0 : ['migrate','target'].includes(cue.shot) ? 1 : 2;
    clockPanel(ctx, moment, k);
  } else if (cue.act === 1) {
    label(ctx, '病程记录', 54, 294, 34, '#3C3234', 770);
    label(ctx, '0h → 10h', 53, 376, 63, '#802F34', 850);
    line(ctx, [[73,480],[415,480]], '#B7897B', 2.2);
    [76, 187, 298, 411].forEach((x, i) => ellipse(ctx, x, 480, 8, 8, focus[cue.shot] >= i ? palette[i] : PAPER, '#9B7270', 1.8));
  } else {
    const text = [null, null, ['形态线索', '灰黄色脓苔', '病理过程', '变质 ＋ 渗出'],
      ['典型演变', '单纯性 → 化脓性 → 坏疽性', '可进展为穿孔', '并非每个患者都必须经历'],
      ['诊断判断', '症状 ＋ 查体 ＋ 化验', '按需选择影像检查', '疑复杂病例尽快评估'],
      ['时间跨度', '数月／反复发作', '急性期以变质、渗出为主', '慢性期纤维性增生更突出'],
      ['行动提示', '腹痛转移到右下腹', '伴发热或按压痛', '尽快就医'],
    ][act];
    label(ctx, text[0], 55, 288, 31, '#3C3234', 760);
    label(ctx, text[1], 53, 354, act === 3 ? 28 : act === 4 ? 34 : 38, act === 6 ? '#A23032' : INK, 820);
    label(ctx, text[2], 57, 420, 28, '#3C3234', 700);
    label(ctx, text[3], 57, 469, 28, act === 3 || act === 6 ? '#8B292F' : '#3C3234', 700);
    if (act === 2) {
      const position = 59 + 352 * clamp((frame - actStarts[act]) / (actStarts[act + 1] - actStarts[act]));
      line(ctx, [[59,525],[411,525]], '#C8A4A0', 4);
      line(ctx, [[59,525],[position,525]], '#995561', 4);
      ellipse(ctx, position, 525, 8, 8, '#995561');
    }
    if (act === 4) {
      line(ctx, [[72,529],[412,529]], '#B56958', 3.1);
      ellipse(ctx, cue.shot === 'triage' ? 403 : 206, 529, 11, 11, cue.shot === 'triage' ? '#A23032' : '#C29856', PAPER, 2);
    }
  }
  swatches(ctx, state, elapsed);
  const segments = 7;
  for (let i = 0; i < segments; i++) {
    const x = 57 + i * 55;
    box(ctx, x, 853, 46, i === act ? 9 : 6, 4, i <= act ? '#8C5056' : '#CEBEB0');
  }
}

function stageNote(ctx, text, x, y, accent = '#823F4D') {
  line(ctx, [[x, y - 32], [x, y + 6]], accent, 5);
  label(ctx, text, x + 21, y, 34, accent, 760);
}

function specimen(ctx, state, scene, options = {}) {
  const {elapsed, shot, beat, beatProgress} = scene;
  const {prior = null, enlarged = false, rupture = false} = options;
  const accent = palette[Math.min(state, 3)];
  const s = (enlarged ? 1.40 : 1.20) + .10*ease(elapsed/2.1) + .023*Math.sin(elapsed*.79);
  const xx = 545 + Math.sin(elapsed*.72)*10, yy = (enlarged ? 128 : 168) + 11*Math.cos(elapsed*.80);
  const image = rupture ? specimens.rupture : specimens.gross[state];
  const opened = shot === 'open' ? ease(elapsed / 1.25) : 0;
  const tilt = .018 * Math.sin(elapsed*.93);
  ctx.save(); ctx.translate(xx, yy); ctx.rotate(tilt); ctx.scale(s,s);
  if (prior !== null && elapsed < .7) {
    const reveal = ease(elapsed / .7);
    ctx.save();
    ctx.globalAlpha = 1 - reveal;
    ctx.drawImage(specimens.gross[prior], 0, 0);
    ctx.globalAlpha = reveal;
    ctx.drawImage(image, 0, 0);
    ctx.restore();
  } else ctx.drawImage(image, 0, 0);
  if (opened > 0) {
    ctx.save();
    const aperture = new Path2D(); aperture.rect(0,0,opened*830,402);
    ctx.clip(aperture); ctx.drawImage(specimens.open, 0, 0); ctx.restore();
  }
  const matrix = ctx.getTransform();
  const point = coordinates => matrix.transformPoint({x:coordinates[0],y:coordinates[1]});
  if (rupture) leaks(ctx, ...perforation, elapsed, 1);
  ctx.restore();
  if (state === 3 && enlarged) {
    const source = point(mesentericVein);
    const centerX = 1655, centerY = 612;
    const r = 86 * (.76+.24*ease(elapsed/.7))+1.7*Math.sin(elapsed*1.16);
    const joinX = centerX - r * .90, joinY = centerY - r * .42;
    ctx.save(); ctx.lineDashOffset = -elapsed*15;
    line(ctx, [[source.x,source.y],[source.x+121,source.y+80],[joinX,joinY]], '#664B62',3.4,[10,7]);
    ctx.restore();
    ellipse(ctx,source.x,source.y,10+2*Math.sin(elapsed*2.15),10+2*Math.sin(elapsed*2.15),'#F8D4B934','#69435D',3);
    ellipse(ctx,centerX,centerY,r,r,'#F2DCD8','#684254',3.8);
    ctx.save();
    const aperture = new Path2D(); aperture.arc(centerX,centerY,r-3,0,Math.PI*2); ctx.clip(aperture);
    thrombosis(ctx,centerX-r*.97,centerY-r*.40,r*.0168);
    ctx.restore();
    label(ctx,'系膜静脉内血栓',centerX,centerY+r+43,28,accent,770,'center');
  } else {
    cross(ctx, 1705, 447, 95+11*ease(elapsed/.9)+2.9*Math.sin(elapsed*1.22), state);
    label(ctx, '横断面', 1705, 602, 28, accent, 720, 'center');
  }
  if (['alarm','coat','open','rupture'].includes(shot)) {
    const [coordinates,text,bx,by] = shot === 'rupture' ? [perforation,'中远段侧壁破口',1615,257]
      : shot === 'open' ? [[beat===0?405:145,beat===0?205:231],beat===0?'管腔积脓':'近端可见粪石',790,286]
        : shot === 'coat' ? [[475,169],'浆膜纤维素性脓苔',1174,248]
          : [[480,190],beat===0?'肿胀的阑尾壁':'暗红色浆膜充血',1129,248];
    const anchor = point(coordinates);
    const show = shot === 'rupture' ? 1 : ease((beatProgress-.03)/.35);
    ctx.save(); ctx.globalAlpha *= show;
    line(ctx, [[bx,by+19],[bx-20,by+36],[anchor.x,anchor.y]],accent,1.8);
    ellipse(ctx,anchor.x,anchor.y,5,5,'#FFF4DF',accent,2);
    label(ctx,text,bx,by,29,accent,760);
    ctx.restore();
  }
  if (state === 0) {
    const left = point([101,240]).x, right = point([720,171]).x;
    line(ctx, [[left,605],[right,605]], '#8E6A65', 2.1);
    line(ctx, [[left,593],[left,618]], '#8E6A65', 2.1);
    line(ctx, [[right,593],[right,618]], '#8E6A65', 2.1);
    label(ctx, '约 7 cm', (left + right) / 2, 665, 32, accent, 740, 'center');
  }
  const tags = ['粉白 · 盲端 · 管腔通畅', '充血暗红 · 管径增粗', opened > .7 ? '粪石 · 管腔内黄红色脓液' : '灰黄色脓苔覆于浆膜面',
    enlarged && rupture ? '缺血坏死 · 穿孔外溢' : '焦黑坏死 · 管壁脆弱', '壁增厚 · 发硬 · 可见纤维化'];
  stageNote(ctx, shot === 'alarm' ? '大体观察 · 肿胀充血' : sectionNames[state], 569, 143, accent);
  label(ctx, tags[state], 570, 784, 42, INK, 760);
}

function titleCard(ctx, p, elapsed) {
  wash(ctx, 'pink', 1295+25*Math.sin(elapsed*.75), 485, 1000, .22);
  const y = 193 + 14 * (1 - ease(p * 3.2));
  label(ctx, '一根“香肠”的', 563, y, 82, INK, 870);
  label(ctx, '变质日记', 561, y + 111, 116, '#823440', 910);
  label(ctx, '阑尾的', 568, y + 197, 40, INK, 740);
  const single = ['粉', '红', '黄', '黑'];
  single.forEach((value, i) => {
    const x = 730 + i * 132;
    label(ctx, value, x, y + 197, 54, palette[i], 900);
    if (i < 3) arrow(ctx, x + 65, y + 178, x + 109, y + 178, '#9C7A73', 2.6);
  });
  line(ctx, [[568,y + 227],[1760,y + 227]], '#BE968D', 2.1);
  label(ctx, '急性阑尾炎的色彩密码与炎症保卫战', 570, y + 288, 42, INK, 680);
  specimens.gross.slice(0, 4).forEach((art, i) => {
    const arrival = ease((elapsed-i*.32)/.85);
    ctx.save(); ctx.globalAlpha *= arrival;
    ctx.drawImage(art, 556+i*318,558+17*(1-arrival)+4*Math.sin(elapsed*1.12+i),345,211);
    ctx.restore();
  });
}

function clinical(ctx, shot, p, elapsed) {
  const figureX = 574, figureY = 122;
  const q = ['navel','noon'].includes(shot) ? 0 : shot === 'migrate' ? ease(elapsed / 2.7) : 1;
  wash(ctx,'mesentery',808,506,650,.26);
  ellipse(ctx, figureX + 214, 839, 142, 19, '#AE8C7B28');
  ctx.save(); ctx.translate(figureX + 4*Math.sin(elapsed*1.72), figureY);
  ctx.scale(1.03,1.025 + .009*Math.sin(elapsed*1.94));
  ctx.drawImage(shot === 'noon' ? figures.calm : figures.pain,0,0);
  if (shot !== 'noon') migration(ctx,0,0,q,.5+.5*Math.sin(elapsed*3),1);
  ctx.restore();
  box(ctx, 1028, 174, 788, 612, 25, '#FAF3EACF', '#BA9690', 2.2);
  stageNote(ctx, '右下腹定位 · 正面解剖', 1061, 234);
  const body = 'M1277 286 C1282 349 1254 390 1248 442 Q1239 508 1220 551 C1213 597 1249 664 1328 703 Q1455 746 1574 700 C1648 671 1703 624 1693 553 Q1669 505 1666 449 C1662 382 1631 339 1641 286';
  shape(ctx, `${body}Z`, '#F0D7CE35');
  shape(ctx,body,null,'#9F999E64',3.1);
  shape(ctx,'M1290 592 C1232 577 1224 516 1264 496 Q1334 473 1380 562 Q1403 620 1458 666 C1508 625 1522 590 1546 553 Q1601 477 1652 496 Q1697 511 1679 554 Q1662 600 1615 607 M1325 650 Q1448 723 1584 646',
    null,'#9F999E64',3.4);
  line(ctx, [[1458,290],[1458,690]], '#9E8D8A80', 1.8,[6,7]);
  ctx.save(); ctx.globalAlpha = .64; organs(ctx, 1171, 335, 1.04, false); ctx.restore();
  const navel = [1458, 419], hip = [1290, 592];
  const target = [mix(hip[0],navel[0],1/3),mix(hip[1],navel[1],1/3)];
  line(ctx, [navel, hip], '#795466', 2.5, [8, 7]);
  ellipse(ctx, ...navel, 7, 6, '#F4EDE5', '#6B555B',2);
  ellipse(ctx, ...hip, 7, 7, '#F4EDE5', '#6B555B',2);
  line(ctx,[[1064,397],[1281,397],[1361,398]],'#8D6067',1.9);
  label(ctx,'盲肠',1061,388,29,INK,710);
  line(ctx,[[1526,286],[1510,310],[1465,412]],'#736267',1.9);
  label(ctx,'肚脐 · 腹部中线',1518,278,28,INK,710);
  line(ctx,[[1602,450],[1575,450],[1555,480]],'#8D6067',1.9);
  label(ctx,'回肠末端',1605,443,28,INK,710);
  line(ctx,[[1577,681],[1470,681],[1381,643]],'#8D6067',1.9);
  label(ctx,'阑尾',1580,690,29,INK,710);
  line(ctx,[[1064,648],[1206,648],[1282,599]],'#736267',1.9);
  label(ctx,'右髂前上棘',1065,676,28,INK,710);
  if (shot !== 'noon') {
    const mx = mix(navel[0], target[0], q), my = mix(navel[1], target[1], q) - 25 * Math.sin(Math.PI * q);
    wash(ctx, 'red', mx, my, 138 + 13 * Math.sin(elapsed * 3.1), .30);
    if (q > .05) {
      shape(ctx, `M${navel[0]} ${navel[1]} Q${mix(navel[0],mx,.7)} ${mix(navel[1],my,.31)} ${mx} ${my}`, null, '#B43134', 3);
      arrow(ctx, mx + 10, my - 18, mx, my, '#B43134', 2.7);
    }
    if (q > .96) {
      ellipse(ctx, ...target, 13,13,'#FFF1DB99','#B53032',2.8);
      ellipse(ctx, ...target, 4,4,'#A73339');
      line(ctx, [[target[0]+11,target[1]+9],[1490,569],[1552,569]], '#973335', 2.4);
      label(ctx,'麦氏点',1555,574,31,'#973335',820);
      label(ctx,'自右髂前上棘向脐约 1/3',1479,630,26,'#5A4248',690);
    }
  }
  label(ctx, shot === 'noon' ? '午饭后出现不适' : shot === 'navel' ? '疼痛最初在脐周' : shot === 'migrate' ? '疼痛转向右下腹' : '麦氏点压痛、反跳痛', 1060, 750, 38, INK, 800);
}

const scopeTopics = {
  layers: ['HE 染色 · 阑尾壁各层', '从管腔向外读', '寻找变质与渗出', 'cells', 0],
  mucosa: ['黏膜破溃缺损 · 变质', '乳白半透明黏液空泡', '底部扁平深紫细胞核', 'goblet', 1],
  vessel: ['血管扩张充血', '渗出 · 组织水肿', '血浆成分漏入组织', 'vessel', 2],
  cells: ['中性粒细胞', '分叶核：2–5 叶', '叶间有细染色质丝相连', 'cells', 3],
  serosa: ['纤维素性脓性渗出物', '纤维素网 ＋ 变性坏死的', '中性粒细胞（脓细胞）', 'serosa', 4],
  simple: ['单纯性阑尾炎', '炎细胞聚于黏膜和黏膜下层', '深部肌层零星可见', 'cells', 3],
  phlegmon: ['蜂窝织炎性阑尾炎', '肌层密集浸润', '可累及阑尾壁全层', 'cells', 3],
  fibrosis: ['阑尾壁纤维化', '粉红色胶原纤维束增生', '成纤维细胞呈梭形', 'chronic', 3],
  lymph: ['慢性炎性细胞浸润', '淋巴细胞：致密圆核', '浆细胞：偏位核、核旁晕', 'chronic', 3],
};

const backOut = value => {
  const d = clamp(value) - 1;
  return 1 + 2.20*d**3 + 1.20*d**2;
};

function tangentLeads(ctx, x1, y1, r1, x2, y2, r2, opacity) {
  const angle = Math.atan2(y2-y1,x2-x1), d = Math.hypot(x2-x1,y2-y1);
  const wing = Math.acos(clamp((r1-r2)/d,-1,1));
  ctx.save(); ctx.globalAlpha *= opacity * .53;
  for (const side of [-1,1]) {
    const a = angle+wing*side, dx = Math.cos(a), dy = Math.sin(a);
    line(ctx, [[x1+r1*dx,y1+r1*.72*dy],[x2+r2*dx,y2+r2*dy]],'#956477',2.1);
  }
  ctx.restore();
}

function micro(ctx, topic, phase, scene) {
  const {p,elapsed,beat} = scene;
  const [heading, a, b, inset, layerIndex] = scopeTopics[topic];
  const active = topic === 'simple' ? [1,2,3][beat] : layerIndex;
  const x = 1105+7*Math.sin(elapsed*.95), y = 480+4*Math.sin(elapsed*1.13);
  const radius = 283+12*ease(elapsed/2.4)+3*Math.sin(elapsed*.92);
  const blend = topic === 'layers' ? ease((elapsed-.13)/1.30) : 1;
  if (blend < 1) {
    const zoom = ease(elapsed/1.55);
    ctx.save(); ctx.globalAlpha *= 1 - blend;
    ctx.translate(1082,438); ctx.scale(1.22 + .56*zoom,1.22 + .56*zoom);
    ctx.drawImage(specimens.open,-427,-194);
    ctx.restore();
    if (blend < .38) stageNote(ctx,'从大体标本到组织切片',553,139);
  }
  ctx.save(); ctx.globalAlpha *= blend;
  const shownRadius = radius * (.58+.42*blend);
  lens(ctx, histology.sections[phase], x, y, shownRadius);
  tissueMotion(ctx,phase,topic,x,y,shownRadius,elapsed);
  if (topic === 'vessel') {
    const spread = 35 + 48 * ease(p*1.3) + 4*Math.sin(elapsed*2);
    const halo = ctx.createRadialGradient(x - 7, y + 26, 14, x - 7, y + 26, spread);
    halo.addColorStop(0, '#FFEEAC48'); halo.addColorStop(1, '#FFEEAC00');
    ellipse(ctx,x-7,y+26,spread,spread,halo);
  }
  LAYERS.forEach(([value, offset], i) => {
    const yy = y+(offset-280)*shownRadius/280;
    const dx = Math.sqrt(Math.max(0,(shownRadius-8)**2 - (yy-y)**2));
    const end = x - dx + 4;
    label(ctx, i === 0 && ['simple','chronic'].includes(phase) ? '管腔' : value, 749, yy + 9, 29, active === i ? '#78334B' : MUTED, active === i ? 830 : 560, 'right');
    line(ctx, [[774,yy - 13],[774,yy + 13]], '#9F6E83', active === i ? 3 : 1.5);
    line(ctx, [[774,yy],[end,yy]], active === i ? '#8A3856' : '#B48E9B', active === i ? 2.5 : 1.3);
  });
  const markers = [[-34,-199,64],[7,-135,58],[-8,-15,67],[46,84,71],[32,199,56]];
  const [kx,ky,region] = markers[active], mx = x+kx*shownRadius/280, my=y+ky*shownRadius/280;
  const insetX = 1617+3*Math.sin(elapsed*.95), insetY = 408+4*Math.sin(elapsed*1.2);
  const appearance = ease((elapsed-(topic === 'layers' ? 1.12 : .14))/.54);
  if (appearance > 0) {
    const insetRadius = 111*backOut(appearance);
    highlight(ctx,mx,my,region,elapsed);
    tangentLeads(ctx,mx,my,region,insetX,insetY,insetRadius,appearance);
    lens(ctx,histology.insets[inset],insetX,insetY,insetRadius);
    if (inset==='vessel') vesselInsetMotion(ctx,insetX,insetY,insetRadius,elapsed);
  }
  if (blend >= .38) stageNote(ctx,heading,553,139);
  const insetLabels = {
    cells: '高倍 · 中性粒细胞', goblet: '高倍 · 杯状细胞', serosa: '高倍 · 纤维素网与脓细胞',
    vessel: '高倍 · 充血血管', chronic: '左为淋巴细胞 · 右为浆细胞',
  };
  label(ctx, insetLabels[inset], 1614, 271, 28, MUTED, 720, 'center');
  label(ctx, a, 1437, 634, 29, '#642E4E', 810);
  label(ctx, b, 1437, 683, 28, MUTED, 590);
  if (topic === 'serosa') note(ctx, '两者构成灰黄色脓苔', 1437, 734, '#845427');
  label(ctx, 'H&E 染色示意', 1112, 810, 29, '#685358', 620, 'center');
  ctx.restore();
}

function compare(ctx, p, elapsed) {
  const xs = [544, 978, 1412];
  const keys = ['simple','phlegmon','gangrene'];
  const desc = [['单纯性', '浅层浸润为主', '少量累及肌层'], ['化脓性', '全层弥漫浸润', '浆膜纤维脓性渗出'], ['坏疽性', '出血与组织坏死', '局灶管壁缺损']];
  xs.forEach((x, i) => {
    const [title, a, b] = desc[i];
    const swing = .5 + .5*Math.cos(elapsed*1.14-i*1.55);
    box(ctx, x, 175, 410, 620, 17, '#FCF5EB84', '#BFA18C', 1.5+2.5*swing);
    box(ctx, x + 21, 203, 15, 34, 4, COLORS[i + 1], palette[i + 1], 1.2);
    label(ctx, title, x + 48, 231, 37, palette[i + 1], 850);
    ctx.drawImage(specimens.gross[i + 1], x - 20+5*swing, 258+6*Math.sin(elapsed*1.4-i), 310, 175);
    cross(ctx, x + 350, 346, 43, i + 1);
    line(ctx, [[x+22,434],[x+388,434]], '#C7A6A0', 1.5);
    const radius = 106 + 4*ease(p*4)+4*swing;
    lens(ctx, histology.sections[keys[i]], x + 205, 558, radius);
    if (i < 2) tissueMotion(ctx,keys[i],'compare',x+205,558,radius,elapsed);
    label(ctx, a, x + 205, 725, 32, palette[i + 1], 810, 'center');
    label(ctx, b, x + 205, 767, 28, MUTED, 550, 'center');
  });
}

function cueRows(ctx, items, x, y, width, cursor, step = 99, fontSize = 33) {
  const active = Math.min(items.length-1,Math.floor(cursor));
  for (const [i, item] of items.entries()) {
    const reveal = ease((cursor-i+.03)/.33);
    if (reveal <= 0) continue;
    const rowY = y+i*step+11*(1-reveal);
    ctx.save(); ctx.globalAlpha *= reveal;
    if (i===active) box(ctx,x-13,rowY-46,width+26,64,12,'#E9C7B964');
    ellipse(ctx,x+1,rowY-12,i===active?8:5,i===active?8:5,i===active?'#93464E':'#A27B77');
    line(ctx,[[x+26,rowY+21],[x+width,rowY+21]],'#D4B8AD',1.2);
    ctx.restore();
    if (reveal >= .12) label(ctx,item,x+28+17*(1-reveal),rowY,fontSize,
      i===active?'#7C2B40':'#494143',i===active?800:650);
  }
}

function doctorMotion(ctx, pose, elapsed) {
  const timing = pose === 'timing';
  wash(ctx,'lilac',810+18*Math.sin(elapsed*.75),478,617,.11);
  const x = pose === 'imaging' ? 507 : 545;
  ctx.save(); ctx.translate(x+9*Math.sin(elapsed*(timing ? .92 : 1.16)),154+4*Math.sin(elapsed*1.96));
  if (timing) { ctx.translate(237,275); ctx.rotate(.016*Math.sin(elapsed*1.6)); ctx.translate(-237,-275); }
  ctx.scale(1.06,1.17+.012*Math.sin(elapsed*(timing?1.5:1.96)));
  ctx.drawImage(figures.doctor[pose],0,0);
  ctx.restore();
}

function doctor(ctx, action, scene) {
  const {elapsed,beat,beatProgress} = scene;
  const pose = action === 'doctor' ? beat === 0 ? 'consult' : 'imaging'
    : action === 'triage' ? 'gesture' : 'timing';
  doctorMotion(ctx,pose,elapsed);
  box(ctx,1040,223,773,531,23,'#FCF4EBEB','#B68981',2.2);
  const title = action === 'triage' ? '何时需要尽早切除' : action === 'elective' ? '慢性阑尾炎 · 手术时机' : '急诊的检查顺序';
  stageNote(ctx,title,1081,307);
  const items = action === 'triage'
    ? ['外科确认有手术指征且病情允许', '蜂窝织炎性、坏疽性阑尾炎需尽早手术切除', '合并局限性脓肿时，另评估治疗方式和时机']
    : action === 'elective'
      ? ['手术时机的核心原则是：', '一旦确诊，通常建议在症状缓解期择期切除；', '若正处于急性发作期，则视情况急诊手术。']
      : ['症状和体格检查', '结合化验判断风险', '按需要安排 CT'];
  const cursor = action === 'doctor'
    ? beat === 0 ? beatProgress*1.92+.12 : 2+beatProgress
    : beat+beatProgress;
  cueRows(ctx,items,1083,417,669,cursor,110,action === 'doctor' ? 32 : 29);
}

function ctEvidence(ctx, scene) {
  const {elapsed,beat,beatProgress}=scene;
  doctorMotion(ctx,'imaging',elapsed);
  box(ctx,1040,219,773,548,23,'#FCF4EBEB','#B68981',2.2);
  stageNote(ctx,'CT 诊断敏感度',1081,304);
  const cards=[
    [imaging.sensitivity,'成人初始 CT · 指南中位数',`IDSA ${imaging.year} · ${imaging.studies} 项（${imaging.range}）`],
    [msctSensitivity.sensitivity,'128 层增强 CT · 成人术前队列',`${msctSensitivity.year} · ${msctSensitivity.cohort} 例 · 单中心研究`],
  ];
  for (const [i,[value,meaning,source]] of cards.entries()) {
    const appear=ease((beat+beatProgress-i+.08)/.48);
    if (appear<.12) continue;
    const y=348+i*154+13*(1-appear);
    box(ctx,1077,y,697,127,13,beat===i?'#EAD0BF81':'#F4EAE0');
    label(ctx,value,1101,y+79,54,beat===i?'#8A3C4A':INK,840);
    label(ctx,meaning,1323,y+51,28,INK,750);
    label(ctx,source,1323,y+91,25,MUTED,660);
  }
  note(ctx,'适用范围取决于人群、检查方案和判读条件。',1081,718);
}

function ending(ctx, scene, colors) {
  const {shot,elapsed,beat,beatProgress} = scene;
  wash(ctx,'pink',818,525,634,.18);
  ctx.save(); ctx.translate(546+5*Math.sin(elapsed*1.22),145+7*Math.sin(elapsed*1.35));
  ctx.scale(1.21+.012*Math.sin(elapsed*1.75),1.20);
  ctx.drawImage(figures.recovery,0,0);
  waveHand(ctx,elapsed);
  ctx.restore();
  box(ctx,1109,231,703,503,26,'#FAEEE5EE','#B8847E',2.5);
  if (shot === 'recover') {
    stageNote(ctx,'从颜色读出炎症的变化',1145,330);
    STAGES.forEach((name,i) => {
      const light=colors.lights[i], x=1151+154*i, y=446-16*light;
      box(ctx,x,y,117,81,13,COLORS[i],palette[i],1.1+3.4*light);
      label(ctx,name,x+58,590,31,INK,650+170*light,'center');
      if (i<3) arrow(ctx,x+124,479,x+146,479,'#89716C',2.1);
    });
    return;
  }
  stageNote(ctx,'记住这些就医信号',1145,330);
  const cursor = beat===0 ? .10+beatProgress*1.88 : 2+beatProgress;
  cueRows(ctx,['转移性的右下腹痛','伴发热、右下腹按压痛','出现以上信号，尽快就医'],1151,428,600,cursor,100,36);
}

function creditCard(ctx, elapsed) {
  wash(ctx,'pink',960+76*Math.sin(elapsed*.68),541,1440,.14);
  wash(ctx,'mesentery',660+42*Math.sin(elapsed*.88),560,1240,.21);
  const scale=.987+.013*ease(elapsed/6.8);
  ctx.save(); ctx.translate(960,540); ctx.scale(scale,scale); ctx.translate(-960,-540);
  box(ctx,237,112,1446,851,34,'#FCF6EDEB','#B98E81',2.5);
  label(ctx,'创作说明',960,243,72,'#663845',880,'center');
  line(ctx,[[321,290],[1599,290]],'#C6A097',1.7);
  line(ctx,[[821,351],[821,878]],'#D5BAB2',1.4);
  label(ctx,'制作工具',326,376,36,'#663845',830);
  const tools = [
    ['脚本、翻译与编程','OpenAI Codex'],
    ['医学插画与动效','Canvas 2D · Rough.js · p5.brush'],
    ['旁白、音乐及合成','Microsoft Edge TTS · FFmpeg'],
  ];
  tools.forEach(([title,detail],i)=>{
    const y=457+i*116;
    label(ctx,title,326,y,29,INK,755);
    label(ctx,detail,326,y+41,27,'#534548',540);
  });
  label(ctx,'解剖、H&E 与 CT 均为原创教学示意。',326,870,25,'#58464B',580);
  label(ctx,'主要参考资料',874,376,36,'#663845',830);
  const records = [
    [`${textbook.author}《${textbook.title}》`,`${textbook.publisher}，${textbook.year}`],
    ...[imaging,msctSensitivity,msct,treatment,histologySource].map(r=>[
      r.label,`${r.journal}, ${r.year} · ${r.pages}${r.pmid?' · PMID '+r.pmid:''}`,
    ]),
  ];
  records.forEach(([title,detail],i)=>{
    const y=425+i*86;
    label(ctx,title,874,y,28,INK,760);
    label(ctx,detail,874,y+33,25,'#59494C',550);
  });
  ctx.restore();
}

const subtitleSafeX = [130, 1790];
const subtitles = cues.map(cue => {
  g.font = '800 44px Notes'; g.textAlign = 'left';
  const zh = cue.zh.split(keywords).filter(Boolean).map(text => [text, g.measureText(text)]);
  const highlights = new Set(cue.zh.match(keywords) || []);
  const zw = zh.reduce((sum, [,metric]) => sum + metric.width, 0);
  let x = 960 - zw / 2;
  const zhInk = [Infinity, -Infinity];
  for (const [,metric] of zh) {
    zhInk[0] = Math.min(zhInk[0], x - metric.actualBoundingBoxLeft);
    zhInk[1] = Math.max(zhInk[1], x + metric.actualBoundingBoxRight);
    x += metric.width;
  }
  g.font = '500 26px Arial, sans-serif'; g.textAlign = 'center';
  const en = cue.en;
  const metric = g.measureText(en);
  const enInk = [960 - metric.actualBoundingBoxLeft, 960 + metric.actualBoundingBoxRight];
  const safe = ([left, right]) => Number.isFinite(left + right) && left >= subtitleSafeX[0] && right <= subtitleSafeX[1];
  if (!cue.zh.trim() || !en.trim() || /[\r\n\u2018\u2019]/u.test(en) || !safe(zhInk) || !safe(enInk)) {
    throw Error(`Single-line subtitle exceeds its safe area: ${cue.zh}`);
  }
  return {zh: zh.map(([text, {width}]) => [text, width]), zw, en, ew: metric.width, zhInk, enInk, highlights};
});

function subtitle(ctx, index) {
  const {zh, zw, en, highlights} = subtitles[index];
  box(ctx, 90, 902, 1740, 151, 22, 'rgba(28,28,30,.88)');
  let x = (1920 - zw) / 2;
  ctx.font = '800 44px Notes'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  for (const [text, width] of zh) {
    ctx.fillStyle = highlights.has(text) ? '#FFD666' : '#FFFFFF';
    ctx.fillText(text, x, 966); x += width;
  }
  ctx.font='500 26px Arial, sans-serif'; ctx.fillStyle='#EEEEEC'; ctx.textAlign='center';
  ctx.fillText(en,960,1015);
}

function sceneAt(seconds) {
  const frame = Math.min(timeline.frames - 1, Math.max(0, Math.round(seconds * fps)));
  const index = cueAt(frame), cue = cues[index];
  const {start, end, first} = shotRuns[index];
  const elapsed = (frame - start) / fps;
  const p = clamp((frame - start) / (end - start));
  const credits = frame >= creditsFrame;
  const phase = focus[cue.shot] ?? -1;
  const beat = index-first, beatProgress = clamp((frame-cue.startFrame)/cue.audioFrames);
  return {cue, shot:cue.shot, frame,index,elapsed,p,credits,phase,beat,beatProgress,
    colors:credits ? null : colourState(cue,phase,elapsed,frame)};
}

function render(seconds) {
  const scene = sceneAt(seconds);
  const {cue,frame,index,elapsed,p,credits,phase,colors} = scene;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  if (credits) {
    g.drawImage(creditPaper,0,0); creditCard(g,(frame-creditsFrame)/fps);
    return frame;
  }
  g.drawImage(background, 0, 0);
  g.save();
  const sidebarClip = new Path2D(); sidebarClip.rect(50, 50, 430, 835); g.clip(sidebarClip);
  sidebar(g, cue, colors, p, elapsed, frame);
  g.restore();
  g.save(); const clip = new Path2D(); clip.rect(510, 50, 1360, 835); g.clip(clip);
  if (cue.act === 1) {
    if (cue.shot === 'title') titleCard(g,p,elapsed);
    else specimen(g,phase,scene,{prior:phase > 0 ? phase-1 : null});
  } else if (cue.act === 2) {
    if (cue.shot === 'alarm') specimen(g,1,scene);
    else clinical(g, cue.shot, p, elapsed);
  } else if (cue.act === 3) {
    if (cue.shot === 'coat' || cue.shot === 'open') specimen(g,2,scene);
    else micro(g,cue.shot,'phlegmon',scene);
  } else if (cue.act === 4) {
    if (cue.shot === 'compare') compare(g,p,elapsed);
    else if (['simple','phlegmon'].includes(cue.shot)) micro(g,cue.shot,cue.shot,scene);
    else specimen(g,3,scene,{enlarged:true,rupture:cue.shot==='rupture'});
  } else if (cue.act === 5) {
    if (cue.shot === 'ctOverview' || /^ct[0-2]$/u.test(cue.shot)) {
      drawScanCards(g,ct,cue.shot==='ctOverview'?-1:Number(cue.shot.at(-1)),elapsed,figures.doctor.imaging);
    } else if (cue.shot==='ctEvidence') ctEvidence(g,scene);
    else doctor(g,cue.shot,scene);
  } else if (cue.act === 6) {
    if (cue.shot === 'months') specimen(g,4,scene);
    else if (cue.shot === 'elective') doctor(g,cue.shot,scene);
    else micro(g,cue.shot,'chronic',scene);
  } else ending(g,scene,colors);
  if (frame > 0 && elapsed < .20) {
    g.globalAlpha = (1 - ease(elapsed / .20)) * .16;
    g.fillStyle = PAPER; g.fillRect(510, 50, 1360, 835);
  }
  g.restore();
  subtitle(g,index);
  return frame;
}

window.render = render;
window.DUR = timeline.frames / fps;
window.checks = {
  subtitleMetrics: subtitles.map(({zw,ew,zhInk,enInk}) => ({
    chinese: zw, english: [ew], chineseInkX: zhInk, englishInkX: enInk,
  })),
  simpleMuscle: SIMPLE_MUSCLE, timeline,
};
window.inspectFrame = sceneAt;
window.inspectAnnotations = seconds => measureAnnotations(() => render(seconds));
render(0);
window.ready = true;
