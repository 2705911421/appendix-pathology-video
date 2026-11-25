import { appendStorySvg, createStoryStage, lerp } from '../shared/canvasCore.js';
import { cueCaptionAt, prepareCueCaptionPages } from '../shared/cueCaptions.js';
import { mountBridgePlates } from '../shared/detail/bridgePlates.js';
import { mountMicroscopeHandoff } from '../shared/detail/microscopeHandoff.js';
import { mountStageDotOverlay } from '../shared/leftFloatNotes.js';
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
const root = document.querySelector('#plate');
const stage = createStoryStage(root, { paper: false });
const paintArt = createArtSurface(stage.paint, pixelScale);
const showMicroscopeHandoff = mountMicroscopeHandoff(root, pixelScale);
const bridgePlates = mountBridgePlates(root);
const showDots = mountStageDotOverlay(root, pixelScale);
const artParts = document.createDocumentFragment();
const byId = new Map(cues.map(cue => [cue.id, cue]));
const factories = { S10: createInkOpening, S11: () => createVascularScene(byId.get('S11').start, pixelScale) };
const sceneIds = { S10: 'S10', S11: 'S11', S12: 'S11', S13: 'S13', B04: 'S13', S14: 'S13' };
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
const captionCuts = {
  S10: [['眼里，急性阑尾炎的本质，', 'acute appendicitis']],
  S11: [
    ['堵塞管腔，', 'blocks the lumen,'],
    ['急剧升高。', 'rise sharply.'],
    ['破溃、脱落', 'and sloughing,'],
  ],
  S12: [
    ['炎症介质参与反应。', 'the inflammatory response.'],
    ['血浆被动漏出。', 'leaks out passively.'],
    ['边集、滚动、黏附，', 'roll and adhere.'],
  ],
  S13: [
    ['浸润阑尾壁全层。', 'the full appendiceal wall.'],
    ['链激酶和透明质酸酶。', 'streptokinase and hyaluronidase.'],
    ['促进纤维素降解；', 'fibrin breakdown.'],
    ['降解透明质酸。', 'hyaluronic acid.'],
    ['穿透肌层直达浆膜。', 'to the serosa.'],
  ],
  S14: [
    ['化脓性炎症。', 'a suppurative inflammation.'],
    ['这些是脓细胞。', 'called pus cells.'],
    ['混在一起，', 'a mesh of fibrin'],
    ['纤维素性脓性渗出物。', 'a fibrinopurulent exudate.'],
  ],
};

await Promise.all([stage.ready, bridgePlates.ready]);
const subtitles = new Map(cues.filter(cue => cue.type === 'speech')
  .map(cue => [cue.id, prepareCueCaptionPages(cue, captionCuts[cue.id])]));

function posed(cue, p, bridgeProgress = 0) {
  const entry = mountedScene(sceneIds[cue.id]);
  entry.scene.update(cue, p, bridgeProgress);
  return entry;
}

function renderFrame({ cue, p }) {
  const { id } = cue;
  const subtitle = subtitles.has(id) ? cueCaptionAt(subtitles.get(id), p) : null;
  let layers;
  let seam;
  if (id === 'B03b') {
    const opening = posed(byId.get('S10'), 1, p);
    const vessel = posed(byId.get('S11'), 0);
    const spread = ramp(p, .40, .98);
    layers = [{ ...opening, opacity: 1 - ramp(p, .24, .55) },
      { ...vessel, scale: lerp(.73, 1, spread), opacity: spread }];
    seam = { outgoing: layers[0].opacity, incoming: spread, branchOpacity: 1 - ramp(p, 0, .45) };
  } else if (id === 'B05') {
    const moving = bridgePlates.available ? ramp(p, 0, .42) : 0;
    const leave = moving;
    layers = [{ ...posed(byId.get('S14'), 1), opacity: 1 - leave, scale: 1 - .07 * moving,
      dx: 172 * moving, dy: -92 * moving }];
    seam = { outgoing: 1 - leave, incoming: bridgePlates.available ? ramp(p, .48, 1) : 0 };
  } else {
    layers = [posed(cue, p)];
  }
  const opening = id === 'S10';
  paintArt(layers, opening ? null : subtitle, p);
  bridgePlates.show(id === 'B05' ? { subject: ramp(p, .48, 1) } : {});
  stage.setSubtitles(subtitle, p);
  stage.caption.style.visibility = opening && p > 0 ? 'visible' : '';
  stage.caption.style.zIndex = opening ? '9' : '';
  if (opening) stage.caption.style.opacity = String(ramp(p, 0, .043));
  const collapse = ramp(p, 0, .28);
  showMicroscopeHandoff({ opacity: id === 'S10' ? 1 - collapse : 0,
    paperOpacity: 1 - collapse, scale: lerp(1, .34, collapse) });
  showDots({ marker: id === 'B05' ? lerp(2, 1, ramp(p, .46, .98)) : 2 });
  return seam;
}

function renderAt(t) {
  const selected = resolveCue(CUES, t);
  return { ...selected, ...renderFrame(selected) };
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
