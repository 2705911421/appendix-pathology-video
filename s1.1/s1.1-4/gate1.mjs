import {
  appendStorySvg, createStoryStage, waitForWashes,
} from '../shared/canvasCore.js';
import { prepareProductionSubtitles } from '../shared/cueCaptions.js';
import { mountBridgePlates, selectEntryPart } from '../shared/detail/bridgePlates.js';
import { mountStageDotOverlay } from '../shared/leftFloatNotes.js';
import { createCueTimeline, phase, timeCueSheet } from '../shared/timelineHelper.js';
import rawSheet from './out/cues_s1.1-4.json';
import { s15 } from './s15.mjs';
import { s16 } from './s16.mjs';
import { s17 } from './s17.mjs';
import { s18 } from './s18.mjs';

const cueSheet = timeCueSheet(rawSheet);
const CUES = createCueTimeline(cueSheet);
const resolveCue = (timeline, t) => timeline.at(t);
const root = document.querySelector('#plate');
const stage = createStoryStage(root);
const bridgePlates = mountBridgePlates(root);
const showDots = mountStageDotOverlay(root);
const sceneFactories = { S15: s15, S16: s16, S17: s17, S18: s18 };
const scenes = new Map();
const sceneInfo = {};
const master = Boolean(globalThis.__sectionCueSheet);

function mountScene(cue) {
  const { id } = cue;
  const scene = sceneFactories[id]();
  const art = appendStorySvg(stage.paint, scene.paint, { hidden: true });
  const labels = appendStorySvg(stage.lettering, scene.lettering, { hidden: true });
  const captions = prepareProductionSubtitles(cue);
  scene.mount(art, labels);
  const mounted = { art, labels, update: scene.update, captions };
  sceneInfo[id] = scene.audit;
  scenes.set(id, mounted);
  return mounted;
}

if (!master) for (const cue of cueSheet.cues.filter(cue => cue.type === 'speech')) mountScene(cue);
const [drawPaper] = await Promise.all([stage.ready, waitForWashes(root), bridgePlates.ready]);

function renderAt(t, capture = false) {
  const { cue, p } = resolveCue(CUES, t);
  const isBridge = cue.type === 'bridge';
  const source = isBridge ? CUES.seek('S18', 1) : { cue, p };
  let scene = scenes.get(source.cue.id);
  if (!scene) {
    scene = mountScene(source.cue);
    waitForWashes(root);
  }
  for (const item of scenes.values()) {
    item.art.toggleAttribute('hidden', item !== scene);
    item.labels.toggleAttribute('hidden', item !== scene);
  }
  scene.update(scene.art, scene.labels, source.p, source.cue.duration);
  drawPaper(2);
  const handoff = isBridge && bridgePlates.available;
  const leave = handoff ? phase(p, 0, .42) : 0;
  const incoming = handoff ? phase(p, .48, 1) : 0;
  const cueFade = cue.id === 'S16' ? 1 - phase(p, .92, 1) : cue.id === 'S17' ? phase(p, 0, .08) : 1;
  const visibility = (1 - leave) * cueFade;
  scene.art.style.opacity = String(visibility);
  scene.labels.style.opacity = String(visibility);
  for (const layer of [scene.art, scene.labels]) {
    layer.style.transform = leave ? `translate(${68 * leave}px, ${-38 * leave}px) scale(${1 - .075 * leave})` : '';
  }
  stage.setSubtitles(isBridge || capture ? null : scene.captions, p);
  const marker = isBridge ? 3 * (1 - phase(p, .35, .99))
    : cue.id === 'S15' ? 1 + phase(p, .12, .29) + phase(p, .30, .49)
      : cue.id === 'S16' ? 1 : cue.id === 'S17' ? 2 : 3;
  showDots({ marker, opacity: capture ? 0 : 1 });
  bridgePlates.show(handoff ? { subject: incoming } : {});
  return { id: cue.id, p, outgoing: isBridge ? visibility : 0, incoming, artOpacity: visibility };
}

if (!master) renderAt(0);
Object.assign(window, {
  renderAt,
  renderBridgeEntry(part) {
    renderAt(0, true);
    selectEntryPart(root, part);
  },
  gate1SceneInfo: sceneInfo,
});
