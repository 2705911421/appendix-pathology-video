import {
  appendStorySvg, createStoryStage, lerp, prepareStorySubtitles, waitForWashes,
} from '../../shared/canvasCore.js';
import { prepareCTBackdrop } from '../../shared/ctRenderer.js';
import { prepareProductionSubtitles } from '../../shared/cueCaptions.js';
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

function prepareComparisonCaption({ highlightZh }) {
  const pages = cases.map(({ zh, en }) =>
    prepareStorySubtitles({ text: zh, highlights: highlightZh }, en, { singlePage: true }).pages[0]);
  return { pages, pageEnds: [...cases.slice(1).map(({ start }) => start), 1] };
}

const captions = new Map(sheet.cues.filter(cue => cue.type === 'speech')
  .map(cue => [cue.id, cue.id === 'S21' ? prepareComparisonCaption(cue) : prepareProductionSubtitles(cue)]));
const scenes = { S19: diagnosis, S20: diagnosis, S21: comparison, S22: treatment };
const lastSpeech = sheet.cues.find(cue => cue.id === 'S22');

function renderAt(time, entryPart) {
  const { cue, p: progress } = resolveCue(CUES, time);
  const p = Math.round(progress * 1e12) / 1e12;
  const { id } = cue;
  const bridge = id === 'B07';
  const active = bridge ? treatment : scenes[id];
  const leave = bridge && bridgePlates.available ? phase(p, 0, .42) : 0;
  const mix = bridge && bridgePlates.available ? phase(p, .48, 1) : 0;
  const ctJoin = id === 'S20' ? phase(p, .92, 1) : id === 'S21' ? 1 - phase(p, 0, .08) : 0;
  const sceneOpacity = 1 - leave - ctJoin;
  [diagnosis, comparison, treatment].forEach(scene => scene.show(scene === active));
  active.setOpacity(sceneOpacity);
  const comparisonState = active.update(bridge ? 1 : p, bridge ? lastSpeech : cue);
  drawPaper(active === comparison ? 2 : 0);
  showPaper(ctJoin);
  const gray = bridge ? phase(p, .08, .95) : 0;
  const marker = id === 'S19' ? 0 : id === 'S20' ? phase(p, .87, 1)
    : id === 'S21' ? comparisonState.marker
      : bridge ? lerp(2, 3, gray) : 3 - phase(p, 0, .14);
  showDots({ marker, opacity: entryPart ? 0 : 1, gray });
  bridgePlates.show(bridge ? { subject: mix } : {});

  const caption = entryPart ? null : captions.get(id);
  stage.setSubtitles(caption, p);
  if (caption) stage.caption.style.opacity = String(sceneOpacity * Number(stage.caption.style.opacity));
  root.dataset.cue = id;
  root.dataset.progress = String(p);
  return { id, p, sceneOpacity, ctStage: comparisonState?.current };
}

renderAt(0);
window.renderAt = renderAt;
window.renderBridgeEntry = part => {
  renderAt(0, part);
  selectEntryPart(root, part);
};
window.seek = renderAt;
window.ready = true;
