import { appendStorySvg, createStoryStage, prepareStorySubtitles } from '../shared/canvasCore.js';
import '../shared/leftFloatNotes.js';
import { displayDensity } from '../shared/renderProfile.js';
import { createArtSurface } from './src/canvas-art.mjs';
import { ramp } from './src/geometry.mjs';
import { createInkOpening } from './src/ink-opening.mjs';
import { createVascularScene } from './src/vessel.mjs';
import { createHistologySequence } from './src/histology.mjs';
import { prepareTimeline, resolveCue } from './src/timeline.mjs';
import sheet from './out/cues_s1.1-3.json';

const { CUES, cues } = prepareTimeline(sheet);
const pixelScale = new URLSearchParams(location.search).has('preview') ? .5 : displayDensity();
const stage = createStoryStage(document.querySelector('#plate'), { paper: false });
const paintArt = createArtSurface(stage.paint, pixelScale);
const artParts = document.createDocumentFragment();
const factories = { S10: createInkOpening, S11: () => createVascularScene(cues[1].start, pixelScale) };
const sceneIds = { S10: 'S10', S11: 'S11', S12: 'S11', S13: 'S13', S14: 'S13' };
const scenes = new Map();
// Bake the frozen procedural slide before the local brushes bind a separate target.
const master = Boolean(globalThis.__sectionCueSheet);
let histology = master ? undefined : createHistologySequence(pixelScale);
function mountedScene(id) {
  if (!scenes.has(id)) {
    const scene = id === 'S13' ? (histology ??= createHistologySequence(pixelScale)) : factories[id]();
    const art = appendStorySvg(artParts, scene.paint);
    const lettering = appendStorySvg(artParts, scene.lettering);
    scene.mount(art, lettering);
    scenes.set(id, { scene, art, lettering });
  }
  return scenes.get(id);
}
const pageStarts = {
  S10: ['始终绕不开', 'always revolves'],
  S11: ['迅速坏死', 'breaks down'],
  S12: ['穿过内皮间隙', 'through endothelial gaps'],
  S13: ['请仔细看', 'Look closely'],
  S14: ['这种', 'This fibrinous'],
};

function pairedCaptions({ id, zhText, highlightZh, enText }) {
  const [chineseStart, englishStart] = pageStarts[id];
  const zhCut = zhText.indexOf(chineseStart);
  const enCut = enText.indexOf(englishStart);
  if (zhCut <= 0 || enCut <= 0) throw new Error(`Missing subtitle break for ${id}`);
  const english = [enText.slice(0, enCut).trimEnd(), enText.slice(enCut)];
  return prepareStorySubtitles({ text: zhText, highlights: highlightZh }, english, { splitAt: zhCut });
}

await stage.ready;
const subtitles = new Map(cues.map(cue => [cue.id, pairedCaptions(cue)]));
let outgoingBattlefield;

function renderFrame({ cue, p }) {
  const { id } = cue;
  const subtitle = subtitles.get(id);
  const { scene, art, lettering } = mountedScene(sceneIds[id]);
  let prior;
  if (id === 'S13' && p < .24) {
    if (!outgoingBattlefield) {
      const vessel = mountedScene('S11');
      vessel.scene.update(cues[2], 1);
      outgoingBattlefield = paintArt.bake(vessel.art);
    }
    prior = { canvas: outgoingBattlefield, opacity: 1 - ramp(p, 0, .24) };
  }
  scene.update(cue, p);
  paintArt(art, lettering, id, p, subtitle, prior);
  stage.setSubtitles(subtitle, p);
}

function renderAt(t) {
  const selected = resolveCue(CUES, t);
  renderFrame(selected);
  return selected;
}

if (!master) renderAt(0);
window.renderAt = renderAt;
window.renderCue = (id, p) => renderFrame(CUES.seek(id, p));
window.retainedHistologyCanvas = () => mountedScene('S13').art.querySelector('foreignObject canvas');
window.artCounts = () => {
  const { scene: lens, art, lettering } = mountedScene('S13');
  const vessel = mountedScene('S11').scene;
  return {
    ...lens.audit(),
    ...vessel.audit(),
    layerLabels: lettering.querySelectorAll('.micro-layer').length,
    liveHistologyCanvases: art.querySelectorAll('canvas').length,
    rasterNodes: [...scenes.values()].reduce((count, { art }) => count + art.querySelectorAll('img, image').length, 0),
  };
};
