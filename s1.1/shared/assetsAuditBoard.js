import { assertBlindReviewText, createPaper, NS, waitForWashes } from './canvasCore.js';
import { createIleocecalAsset } from './anatomyWatercolor.js';
import { createHistologyAsset, HISTOLOGY_DIAMETER, waitForHistologyTextures } from './histologyProcedural.js';
import { createCTAsset } from './ctRenderer.js';

const width = 2400;
const height = 1800;
const margin = 72;
const column = (width - margin * 2) / 5;
const cases = [
  { key: 'normal', label: '正常', color: '#A45C55', gross: '16.5 px · 纤细粉白', micro: '40 个隐窝 · 6 个淋巴滤泡' },
  { key: 'simple', label: '单纯性', color: '#A93130', gross: '25.5 px · 浆膜血管充盈', micro: '216 个浅层中性粒细胞 · 肌层 4 个' },
  { key: 'phlegmon', label: '化脓性', color: '#89621F', gross: '37.5 px · 厚壁、脓腔及粪石', micro: '858 个中性粒细胞 · 浆膜纤维素脓苔' },
  { key: 'gangrene', label: '坏疽穿孔', color: '#572D38', gross: '40.5 px · 坏死与穿孔渗出', micro: '出血坏死、核溶解及全层裂隙' },
  { key: 'chronic', label: '慢性纤维化', color: '#8C5263', gross: '24.0 px · 短缩，横切面厚壁窄腔', micro: '层间胶原、淋巴细胞与浆细胞' },
];
const notes = {
  simple: '轻度增粗（>6 mm）· 薄壁强化 · 周围脂肪清晰',
  phlegmon: '厚壁靶征 · 粪石 · 脂肪条索',
  gangrene: '壁强化中断 · 邻近脓肿与腔外气泡',
};
const caption = (text, x, y, cls, attributes = '') =>
  `<text x="${x}" y="${y}" class="${cls}" ${attributes}>${assertBlindReviewText(text)}</text>`;
const centre = (text, x, y, cls, color) =>
  caption(text, x, y, cls, `text-anchor="middle"${color ? ` fill="${color}"` : ''}`);
const rule = y => `<path d="M${margin} ${y}H${width - margin}" stroke="#A88A73" stroke-width="1.2" opacity=".52"/>`;
const heading = (y, title, detail) => caption(title, margin, y, 'section-title')
  + caption(detail, width - margin, y, 'section-detail', 'text-anchor="end"');

const specimens = cases.map(({ key }, i) => createIleocecalAsset({
  id: `audit-organ-${key}`, stage: key, x: margin + column * i - 74, y: 228, scale: .92,
  cutaway: key === 'phlegmon',
  showThrombus: key === 'gangrene',
}));
const slices = cases.map(({ key }, i) => {
  const hasLayers = key === 'simple' || key === 'chronic';
  const scale = .635;
  const shift = hasLayers ? 67 : (column - HISTOLOGY_DIAMETER * scale) / 2;
  return createHistologyAsset({ id: `audit-he-${key}`, stage: key,
    seed: 8053 + i * 1709, x: margin + column * i + shift, y: 823, scale, showLayers: hasLayers });
});
const imaging = cases.slice(1, 4).map(({ key }, i) => createCTAsset({
  id: `audit-ct-${key}`, stage: key, x: margin + i * (width - margin * 2) / 3 + 22, y: 1385, scale: .66,
}));

function svg(host, markup) {
  const layer = document.createElementNS(NS, 'svg');
  layer.setAttribute('viewBox', `0 0 ${width} ${height}`);
  layer.innerHTML = markup;
  document.querySelector(host).append(layer);
  return layer;
}

const art = svg('#assets', [...specimens, ...slices, ...imaging].map(asset => asset.paint).join(''));
svg('#notes', [
  caption('s1.1 核心医学资产全检板', margin, 91, 'board-title'),
  caption('Gate 0.8 · 程序绘制教学示意', width - margin, 90, 'section-detail', 'text-anchor="end"'),
  rule(128),
  heading(176, '回盲部 · 正面观', '标本同尺度　盲肠 150 px　回肠末端 63 px'),
  ...cases.map(({ label, color, gross }, i) => {
    const x = margin + (i + .5) * column;
    return centre(label, x, 228, 'stage-name', color) + centre(gross, x, 698, 'feature');
  }),
  rule(721),
  heading(769, 'H&E · 阑尾组织', '正常全横断面　四种病变局部视野'),
  ...cases.map(({ label, color, micro }, i) => {
    const x = margin + (i + .5) * column;
    return centre(label, x, 812, 'stage-name', color) + slices[i].lettering + centre(micro, x, 1237, 'feature');
  }),
  rule(1267),
  heading(1313, '轴位 CT · 右髂窝', '图像左侧为患者右侧　虚线框对应同源 2.4× 放大窗'),
  ...cases.slice(1, 4).map(({ key, label, color }, i) => {
    const ct = imaging[i];
    const x = margin + (i + .5) * (width - margin * 2) / 3;
    return centre(label, x, 1363, 'stage-name', color) + ct.lettering + centre(notes[key], x, 1747, 'feature');
  }),
].join(''));

const [paper] = await Promise.all([
  createPaper(document.querySelector('#paper'), { width, height }),
  waitForWashes(),
  waitForHistologyTextures(),
  document.fonts.ready,
]);
paper(-1);
window.renderAt = time => specimens[3].update(art, { time });
window.renderAt(1.6);
document.querySelector('main').setAttribute('data-ready', 'true');
