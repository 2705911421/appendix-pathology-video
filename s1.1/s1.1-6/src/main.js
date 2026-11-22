import {
  appendStorySvg, createStoryStage, PAPER, prepareStorySubtitles, waitForWashes,
} from '../../shared/canvasCore.js';
import { phase } from '../../shared/timelineHelper.js';
import { CUES, resolveCue, sceneFades } from './cue-sheet.js';
import { createCreditPlate } from './credit.js';
import { chronicSpecimen } from './chronic-specimen.js';
import { chronicSlide } from './chronic-slide.js';
import { homecoming } from './homecoming.js';

const subtitleBreaks = [
  { at: [.42], zh: ['？'], en: ['inflammation?'] },
  { at: [.23, .55], zh: ['浸润。', '择期切除；'], en: ['infiltration.', 'usually advised;'] },
  { at: [.54], zh: ['求救信号。'], en: ['an SOS.'] },
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
  return splitAfter(zhText, breaks.zh).map((text, i) => {
    const prepared = prepareStorySubtitles({ text, highlights: highlightZh }, translation[i]);
    return { pages: [{ zh: prepared.pages.flatMap(page => page.zh), en: translation[i] }], breakAt: 1 };
  });
}

const root = document.querySelector('#plate');
const stage = createStoryStage(root);
const storyLayers = [...root.children];
const captionLayer = storyLayers.at(-1);
const plainPaper = document.createElement('div');
plainPaper.setAttribute('aria-hidden', 'true');
plainPaper.style.cssText = `position:absolute;inset:0;background:${PAPER};pointer-events:none`;
root.prepend(plainPaper);
const scenes = [chronicSpecimen(), chronicSlide(), homecoming()].map((scene, i) => {
  const art = appendStorySvg(stage.paint, scene.paint, { hidden: true });
  const labels = appendStorySvg(stage.lettering, scene.lettering, { hidden: true });
  scene.mount?.(art);
  return { ...scene, art, labels, cueId: CUES[i].id, breaks: subtitleBreaks[i].at,
    captions: cueSubtitles(CUES[i], subtitleBreaks[i]) };
});
const credit = createCreditPlate();
root.append(credit.canvas);

const [drawPaper] = await Promise.all([stage.ready, waitForWashes()]);

function renderAt(time) {
  const { cue, p } = resolveCue(CUES, time);
  root.dataset.cue = cue.id;
  plainPaper.hidden = cue.id !== 'S25';
  plainPaper.style.opacity = cue.id === 'S25' ? phase(p, sceneFades.homecomingStart, 1) : 0;
  for (const layer of storyLayers) layer.toggleAttribute('hidden', Boolean(cue.isCredits));
  credit.canvas.hidden = !cue.isCredits;
  if (cue.isCredits) {
    credit.draw(p);
    return;
  }

  const index = scenes.findIndex(scene => scene.cueId === cue.id);
  const scene = scenes[index];
  const sceneOpacity = scene.fade?.(p) ?? 1;
  for (const layer of storyLayers) layer.style.opacity = sceneOpacity;
  for (const other of scenes) {
    other.art.toggleAttribute('hidden', other !== scene);
    other.labels.toggleAttribute('hidden', other !== scene);
  }
  scene.update(scene.art, scene.labels, p);
  drawPaper(index);
  const page = scene.breaks.filter(boundary => p >= boundary).length;
  stage.setSubtitles(scene.captions[page], p);
  const captionOpacity = Number(captionLayer.style.opacity);
  captionLayer.style.opacity = captionOpacity * sceneOpacity * (cue.id === 'S23' ? 1 - phase(p, .94, 1) : 1);
}

renderAt(0);
window.renderAt = renderAt;
