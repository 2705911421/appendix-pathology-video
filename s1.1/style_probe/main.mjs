import {
  appendStorySvg, createStoryStage, prepareStorySubtitles, waitForWashes,
} from '../shared/canvasCore.js';
import { sceneA } from './scene-a.mjs';
import { sceneB } from './scene-b.mjs';
import { sceneC } from './scene-c.mjs';

const paper = new URLSearchParams(location.search).get('paper') !== '0';
const stage = createStoryStage(document.querySelector('#plate'), { paper });
const scenes = [sceneA(), sceneB(), sceneC()].map(scene => {
  const art = appendStorySvg(stage.paint, scene.paint, { hidden: true });
  const labels = appendStorySvg(stage.lettering, scene.lettering, { hidden: true });
  return { ...scene, art, labels, subtitles: prepareStorySubtitles(...scene.caption) };
});

const [drawPaper] = await Promise.all([stage.ready, waitForWashes()]);

function renderAt(t) {
  if (!Number.isFinite(t)) throw new TypeError('renderAt(t) requires a finite time in seconds');
  const plate = t >= 8 ? 2 : t >= 4 ? 1 : 0;
  const time = Math.max(0, t - plate * 4);
  const scene = scenes[plate];
  for (const [index, { art, labels }] of scenes.entries()) {
    art.toggleAttribute('hidden', index !== plate);
    labels.toggleAttribute('hidden', index !== plate);
  }
  scene.update(scene.art, scene.labels, time);
  drawPaper(plate);
  stage.setSubtitles(scene.subtitles, time / 4);
}

renderAt(0);
window.renderAt = renderAt;
