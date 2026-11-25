import {
  appendStorySvg, createStoryStage, lerp, prepareStorySubtitles, waitForWashes,
} from '../../shared/canvasCore.js';
import { prepareCTBackdrop } from '../../shared/ctRenderer.js';
import { mountBridgePlates, selectEntryPart } from '../../shared/detail/bridgePlates.js';
import { mountPaperBridge } from '../../shared/detail/transitionPaper.js';
import { mountStageDotOverlay } from '../../shared/leftFloatNotes.js';
import { phase } from '../../shared/timelineHelper.js';
import { CUES, resolveCue, sheet } from './cue-sheet.js';
import { diagnosisScene } from './diagnosis.js';
import { mountWashes } from './live-watercolor.js';
import { cases, comparisonScene, treatmentScene } from './pathology.js';

const root = document.querySelector('#plate');
const stage = createStoryStage(root);
const showPaper = mountPaperBridge(root);
const showDots = mountStageDotOverlay(root);
const bridgePlates = mountBridgePlates(root);

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
  return { update, show: shown => views.forEach(svg => svg.toggleAttribute('hidden', !shown)),
    setOpacity: opacity => views.forEach(svg => { svg.style.opacity = String(opacity); }) };
}

const diagnosis = layers(diagnosisScene);
await prepareCTBackdrop();
const comparison = layers(comparisonScene);
const treatment = layers(treatmentScene);

const [drawPaper] = await Promise.all([stage.ready, waitForWashes(), bridgePlates.ready]);

const captionCuts = {
  S19: [[.41, '先问典型症状', 'They ask about']],
  S20: [[.48, '成人疑似病例中', 'In adults']],
  S21: [[.12, '单纯性', 'In simple appendicitis'],
    [cases[1].start, '化脓性', 'In phlegmonous appendicitis'],
    [cases[2].start, '坏疽穿孔', 'In perforated gangrenous appendicitis']],
  S22: [[.28, '未穿孔者', 'Without perforation'], [.47, '怀疑坏疽', 'Suspected gangrene'],
    [.63, '弥漫性腹膜炎', 'Diffuse peritonitis'], [.80, '局限性脓肿', 'A localized abscess']],
};

function splitCaption(text, markers) {
  const edges = [0, ...markers.map(marker => text.indexOf(marker)), text.length];
  if (edges.some((edge, index) => index > 0 && edge <= edges[index - 1])) {
    throw new Error('A bilingual cue is missing a phrase boundary');
  }
  return edges.slice(0, -1).map((edge, i) => text.slice(edge, edges[i + 1]).trim());
}

function captionPage(text, highlights, en) {
  return prepareStorySubtitles({ text, highlights }, en, { singlePage: true });
}

function captionWindows({ id, zhText, enText, highlightZh }) {
  const cuts = captionCuts[id];
  const chinese = splitCaption(zhText, cuts.map(([, marker]) => marker));
  const english = splitCaption(enText, cuts.map(([, , marker]) => marker));
  return [0, ...cuts.map(([start]) => start)].map((start, i) =>
    ({ start, caption: captionPage(chinese[i], highlightZh, english[i]) }));
}

const captions = new Map(sheet.cues.filter(cue => cue.type === 'speech').map(cue => [cue.id, captionWindows(cue)]));
const scenes = { S19: diagnosis, S20: diagnosis, S21: comparison, S22: treatment };
const lastSpeech = sheet.cues.find(cue => cue.id === 'S22');

function renderAt(time, entryPart) {
  const { cue, p } = resolveCue(CUES, time);
  const { id } = cue;
  const bridge = id === 'B07';
  const active = bridge ? treatment : scenes[id];
  const leave = bridge && bridgePlates.available ? phase(p, 0, .42) : 0;
  const mix = bridge && bridgePlates.available ? phase(p, .48, 1) : 0;
  [diagnosis, comparison, treatment].forEach(scene => scene.show(scene === active));
  active.setOpacity(1 - leave);
  active.update(bridge ? 1 : p, bridge ? lastSpeech : cue);
  drawPaper(active === comparison ? 2 : 0);
  showPaper(0);
  const gray = bridge ? phase(p, .08, .95) : 0;
  const marker = id === 'S19' ? 0 : id === 'S20' ? phase(p, .87, 1)
    : id === 'S21' ? 1 + phase(p, cases[1].start - .035, cases[1].start + .05)
      + phase(p, cases[2].start - .025, cases[2].start + .05)
      : bridge ? lerp(2, 3, gray) : 3 - phase(p, 0, .14);
  showDots({ marker, opacity: entryPart ? 0 : 1, gray });
  bridgePlates.show(bridge ? { subject: mix } : {});

  const windows = captions.get(id);
  if (!windows || entryPart) stage.setSubtitles(null, 0);
  else {
    const captionIndex = windows.findLastIndex(({ start }) => p >= start);
    const { start, caption } = windows[captionIndex];
    const end = windows[captionIndex + 1]?.start ?? 1;
    stage.setSubtitles(caption, (p - start) / (end - start));
  }
  root.dataset.cue = id;
  root.dataset.progress = String(p);
  return { id, p };
}

renderAt(0);
window.renderAt = renderAt;
window.renderBridgeEntry = part => {
  renderAt(0, part);
  selectEntryPart(root, part);
};
window.seek = renderAt;
window.ready = true;
