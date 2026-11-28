import {
  appendStorySvg, createStoryStage, waitForWashes,
} from '../../shared/canvasCore.js';
import { prepareProductionSubtitles } from '../../shared/cueCaptions.js';
import { selectEntryPart } from '../../shared/detail/bridgePlates.js';
import { mountPaperBridge } from '../../shared/detail/transitionPaper.js';
import { mountStageDotOverlay } from '../../shared/leftFloatNotes.js';
import { phase } from '../../shared/timelineHelper.js';
import { CUES, resolveCue, sceneFades } from './cue-sheet.js';
import { createCreditPlate } from './credit.js';
import { chronicSpecimen } from './chronic-specimen.js';
import { chronicSlide } from './chronic-slide.js';
import { homecoming } from './homecoming.js';

const root = document.querySelector('#plate');
const stage = createStoryStage(root);
const storyLayers = [...root.children];
const showPaper = mountPaperBridge(root);
const speech = CUES.filter(cue => cue.type === 'speech');
const scenes = [chronicSpecimen(), chronicSlide(), homecoming()].map((scene, i) => {
  const art = appendStorySvg(stage.paint, scene.paint, { hidden: true });
  const labels = appendStorySvg(stage.lettering, scene.lettering, { hidden: true });
  scene.mount?.(art);
  return { ...scene, art, labels, cueId: speech[i].id, caption: prepareProductionSubtitles(speech[i]) };
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
    const creditOpacity = credit.draw(p);
    return { id: cue.id, p, creditOpacity };
  }

  const bridge = cue.id === 'B08';
  const index = bridge ? 2 : scenes.findIndex(scene => scene.cueId === cue.id);
  const scene = scenes[index];
  const fadeEnd = Math.max(sceneFades.homecomingStart + .001, 1 - sceneFades.paperHoldSeconds / cue.duration);
  const outro = cue.id === 'S25' ? phase(p, sceneFades.homecomingStart, fadeEnd) : 0;
  const outgoing = bridge ? 1 - phase(p, 0, .44) : 0;
  const incoming = bridge ? phase(p, .48, 1) : 1 - outro;
  scenes.forEach((item, i) => {
    const alpha = i === index ? incoming : bridge && i === 1 ? outgoing : 0;
    for (const layer of [item.art, item.labels]) {
      layer.toggleAttribute('hidden', alpha <= 0);
      layer.style.opacity = String(alpha);
    }
    if (alpha > 0) item.update(item.art, item.labels, bridge ? Number(i === 1) : p,
      bridge ? speech[i].duration : cue.duration);
  });
  drawPaper(bridge ? 1 : index);
  showPaper(outro);
  const gray = bridge ? 1 - phase(p, .04, .81) : index < 2 ? 1 : 0;
  const chronic = bridge ? outgoing : index === 0 ? phase(p, 0, .13) : Number(index === 1);
  const marker = bridge ? 3 * (1 - phase(p, .12, .98)) : index < 2 ? 3 : 3 * phase(p, .07, .63);
  showDots({ marker, gray, chronic, opacity: capture ? 0 : 1 - outro });
  const caption = capture || bridge || outro === 1 ? null : scene.caption;
  stage.setSubtitles(caption, p);
  if (caption) stage.caption.style.opacity = String((1 - outro) * Number(stage.caption.style.opacity));
  return { id: cue.id, p, outgoing, incoming, closingPaper: outro, sceneOpacity: incoming };
}

renderAt(0);
window.renderAt = renderAt;
window.renderBridgeEntry = part => {
  renderAt(0, true);
  selectEntryPart(root, part);
};
