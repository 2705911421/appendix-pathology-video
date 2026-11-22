import {
  appendStorySvg, createStoryStage, prepareStorySubtitles, waitForWashes,
} from '../../shared/canvasCore.js';
import { prepareCTBackdrop } from '../../shared/ctRenderer.js';
import { CUES, resolveCue, sheet } from './cue-sheet.js';
import { diagnosisScene } from './diagnosis.js';
import { mountWashes } from './live-watercolor.js';
import { cases, comparisonScene, treatmentScene } from './pathology.js';

const root = document.querySelector('#plate');
const stage = createStoryStage(root);

function layers(draw) {
  const views = [];
  const mount = (layer, markup) => {
    const svg = appendStorySvg(layer, markup, { hidden: true });
    views.push(svg);
    return svg;
  };
  const update = draw({
    paint(markup) {
      const svg = mount(stage.paint, markup);
      mountWashes(svg);
      return svg;
    },
    lettering: markup => mount(stage.lettering, markup),
  });
  return { update, show: shown => views.forEach(svg => svg.toggleAttribute('hidden', !shown)) };
}

const diagnosis = layers(diagnosisScene);
await prepareCTBackdrop();
const comparison = layers(comparisonScene);
const treatment = layers(treatmentScene);

const [drawPaper] = await Promise.all([stage.ready, waitForWashes()]);

const captionCuts = {
  S19: [[.49, '答案首先是：', 'First and foremost:']],
  S20: [[.47, '而在需要确诊', 'when needed,']],
  S21: [[.10, '单纯性', 'mild thickening'],
    [cases[1].start, '化脓性', 'thick wall'], [cases[2].start, '坏疽性', 'focal wall']],
  S22: [[.38, '——这直接决定', '—directly dictating'], [.56, '一旦发展为', 'Both phlegmonous']],
};

function splitCaption(text, markers) {
  const edges = [0, ...markers.map(marker => text.indexOf(marker)), text.length];
  if (edges.some((edge, index) => index > 0 && edge <= edges[index - 1])) {
    throw new Error('A bilingual cue is missing a phrase boundary');
  }
  return edges.slice(0, -1).map((edge, i) => text.slice(edge, edges[i + 1]).trim());
}

function captionPage(text, highlights, en) {
  const prepared = prepareStorySubtitles({ text, highlights }, en);
  if (prepared.pages.length === 1) return prepared;
  // Keep the hand-timed phrase on a single line while retaining the shared highlight runs.
  const [left, right] = prepared.pages.map(page => page.zh);
  const length = runs => runs.reduce((sum, run) => sum + run.text.length, 0);
  const gap = text.slice(length(left), text.length - length(right));
  return { pages: [{ zh: [...left, { text: gap, highlight: false }, ...right], en }], breakAt: 1 };
}

function captionWindows({ id, zhText, enText, highlightZh }) {
  const cuts = captionCuts[id];
  const chinese = splitCaption(zhText, cuts.map(([, marker]) => marker));
  const english = splitCaption(enText, cuts.map(([, , marker]) => marker));
  return [0, ...cuts.map(([start]) => start)].map((start, i) =>
    ({ start, caption: captionPage(chinese[i], highlightZh, english[i]) }));
}

const captions = new Map(sheet.cues.map(cue => [cue.id, captionWindows(cue)]));
const scenes = { S19: diagnosis, S20: diagnosis, S21: comparison, S22: treatment };

function renderAt(time) {
  const { cue, p } = resolveCue(CUES, time);
  const { id } = cue;
  const active = scenes[id];
  [diagnosis, comparison, treatment].forEach(scene => scene.show(scene === active));
  active.update(p, cue);
  drawPaper(active === comparison ? 2 : 0);

  const windows = captions.get(id);
  const captionIndex = windows.findLastIndex(({ start }) => p >= start);
  const { start, caption } = windows[captionIndex];
  const end = windows[captionIndex + 1]?.start ?? 1;
  stage.setSubtitles(caption, (p - start) / (end - start));
  root.dataset.cue = id;
  root.dataset.progress = String(p);
}

renderAt(0);
window.renderAt = renderAt;
window.seek = renderAt;
window.ready = true;
