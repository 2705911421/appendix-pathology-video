import {
  appendStorySvg, createStoryStage, prepareStorySubtitles, waitForWashes,
} from '../../shared/canvasCore.js';
import { selectEntryPart } from '../../shared/detail/bridgePlates.js';
import { mountPaperBridge } from '../../shared/detail/transitionPaper.js';
import { mountStageDotOverlay } from '../../shared/leftFloatNotes.js';
import { phase } from '../../shared/timelineHelper.js';
import { CUES, resolveCue } from './cue-sheet.js';
import { createCreditPlate } from './credit.js';
import { chronicSpecimen } from './chronic-specimen.js';
import { chronicSlide } from './chronic-slide.js';
import { homecoming } from './homecoming.js';

const subtitleBreaks = [
  { at: [.49], zh: ['阑尾炎。'], en: ['abdominal pain.'] },
  { at: [.32, .63], zh: ['浸润。', '择期切除；'], en: ['infiltration.', 'symptoms have subsided.'] },
  { at: [.45], zh: ['病理变化。'], en: ['changes in the appendix.'] },
];

function splitAfter(text, markers) {
  let start = 0;
  const pages = markers.map(marker => {
    const index = text.indexOf(marker, start);
    if (index < 0) throw new Error(`Missing subtitle break after ${marker}`);
    const end = index + marker.length;
    const page = text.slice(start, end).trim();
    start = end;
    return page;
  });
  return [...pages, text.slice(start).trim()];
}

function cueSubtitles({ zhText, highlightZh, enText }, breaks) {
  const translation = splitAfter(enText, breaks.en);
  return splitAfter(zhText, breaks.zh).map((text, i) =>
    prepareStorySubtitles({ text, highlights: highlightZh }, translation[i], { singlePage: true }));
}

const root = document.querySelector('#plate');
const stage = createStoryStage(root);
const storyLayers = [...root.children];
const showPaper = mountPaperBridge(root);
const scenes = [chronicSpecimen(), chronicSlide(), homecoming()].map((scene, i) => {
  const art = appendStorySvg(stage.paint, scene.paint, { hidden: true });
  const labels = appendStorySvg(stage.lettering, scene.lettering, { hidden: true });
  scene.mount?.(art);
  return { ...scene, art, labels, cueId: CUES[i].id, breaks: subtitleBreaks[i].at,
    captions: cueSubtitles(CUES[i], subtitleBreaks[i]) };
});
const credit = createCreditPlate();
root.append(credit.canvas);
const showDots = mountStageDotOverlay(root);

const [drawPaper] = await Promise.all([stage.ready, waitForWashes()]);

function renderAt(time, capture = false) {
  const { cue, p } = resolveCue(CUES, time);
  root.dataset.cue = cue.id;
  const credits = cue.type === 'credits';
  for (const layer of storyLayers) layer.toggleAttribute('hidden', credits);
  credit.canvas.hidden = !credits;
  if (credits) {
    showPaper(0);
    showDots({ opacity: 0 });
    credit.draw(p);
    return { id: cue.id, p };
  }

  const index = scenes.findIndex(scene => scene.cueId === cue.id);
  const scene = scenes[index];
  for (const other of scenes) {
    other.art.toggleAttribute('hidden', other !== scene);
    other.labels.toggleAttribute('hidden', other !== scene);
  }
  scene.update(scene.art, scene.labels, p);
  drawPaper(index);
  showPaper(cue.id === 'S23' && !capture ? 1 - phase(p, 0, .10) : 0);
  showDots({ gray: 1, opacity: capture || cue.id === 'S25' ? 0 : .55 });
  const page = scene.breaks.filter(boundary => p >= boundary).length;
  stage.setSubtitles(capture ? null : scene.captions[page], p);
  return { id: cue.id, p };
}

renderAt(0);
window.renderAt = renderAt;
window.renderBridgeEntry = part => {
  renderAt(0, true);
  selectEntryPart(root, part);
};
