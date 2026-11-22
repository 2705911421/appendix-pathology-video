import { appendStorySvg, createStoryStage, lerp, prepareStorySubtitles } from '../shared/canvasCore.js';
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
const pageStarts = {
  S10: ['始终绕不开', 'centers on'],
  S11: ['缺血和细菌', 'Ischemia and bacteria'],
  S12: ['分叶核中性粒细胞', 'Neutrophils with lobed nuclei'],
  S13: ['最外面的浆膜', 'The outer serosa'],
  S14: ['这层', 'This fibrinous'],
};

function pairedCaptions({ id, zhText, highlightZh, enText }) {
  const [chineseStart, englishStart] = pageStarts[id];
  const zhCut = zhText.indexOf(chineseStart);
  const enCut = enText.indexOf(englishStart);
  if (zhCut <= 0 || enCut <= 0) throw new Error(`Missing subtitle break for ${id}`);
  const english = [enText.slice(0, enCut).trimEnd(), enText.slice(enCut)];
  return prepareStorySubtitles({ text: zhText, highlights: highlightZh }, english, { splitAt: zhCut });
}

await Promise.all([stage.ready, bridgePlates.ready]);
const subtitles = new Map(cues.filter(cue => cue.type === 'speech').map(cue => [cue.id, pairedCaptions(cue)]));
const exudation = byId.get('S12');
const exudationAfter = ['化脓时可浸润全层。', 'In suppurative disease'];
const splitExudation = [exudation.zhText.indexOf(exudationAfter[0]), exudation.enText.indexOf(exudationAfter[1])];
if (splitExudation.some(index => index < 0)) throw new Error('Missing subtitle break for S12');
const exudationPages = [
  pairedCaptions({ ...exudation, zhText: exudation.zhText.slice(0, splitExudation[0]),
    enText: exudation.enText.slice(0, splitExudation[1]) }),
  prepareStorySubtitles({ text: exudation.zhText.slice(splitExudation[0]), highlights: exudation.highlightZh },
    exudation.enText.slice(splitExudation[1]), { singlePage: true }),
];
exudationPages[0].breakAt = subtitles.get('S12').breakAt / .72;

function posed(cue, p, bridgeProgress = 0) {
  const entry = mountedScene(sceneIds[cue.id]);
  entry.scene.update(cue, p, bridgeProgress);
  return entry;
}

function renderFrame({ cue, p }) {
  const { id } = cue;
  const subtitle = id === 'S12' ? exudationPages[Number(p >= .72)] : subtitles.get(id);
  const captionProgress = id === 'S12' && p < .72 ? p / .72 : p;
  let layers;
  if (id === 'B03b') {
    const opening = posed(byId.get('S10'), 1, p);
    const vessel = posed(byId.get('S11'), 0);
    const spread = ramp(p, .05, .93);
    layers = [{ ...opening, opacity: 1 - ramp(p, .12, .67) },
      { ...vessel, scale: lerp(.66, 1, spread), opacity: ramp(p, .13, .76) }];
  } else if (id === 'B05') {
    const moving = bridgePlates.available ? ramp(p, .04, .84) : 0;
    const leave = bridgePlates.available ? ramp(p, .23, .92) : 0;
    layers = [{ ...posed(byId.get('S14'), 1), opacity: 1 - leave, scale: 1 - .07 * moving,
      dx: 172 * moving, dy: -92 * moving }];
  } else {
    layers = [posed(cue, p)];
  }
  paintArt(layers, subtitle, captionProgress);
  bridgePlates.show(id === 'B05' ? { notes: ramp(p, .06, .48), subject: ramp(p, .38, .89) } : {});
  stage.setSubtitles(subtitle, captionProgress);
  const collapse = ramp(p * (cue.end - cue.start), 0, .15);
  showMicroscopeHandoff({ opacity: id === 'S10' ? 1 - collapse : 0,
    paperOpacity: 1 - collapse, scale: lerp(.46, .29, collapse) });
  const dots = { S10: collapse, B03b: 1 - ramp(p, 0, .40), S13: ramp(p, .08, .23),
    B04: 1 - ramp(p, 0, .26), S14: ramp(p, .02, .16), B05: 1 - ramp(p, 0, .20) };
  showDots({ marker: 2, opacity: dots[id] ?? 0 });
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
