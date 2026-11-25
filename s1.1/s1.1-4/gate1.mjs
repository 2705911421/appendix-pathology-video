import {
  appendStorySvg, createStoryStage, waitForWashes,
} from '../shared/canvasCore.js';
import { cueCaptionAt, prepareCueCaptionPages } from '../shared/cueCaptions.js';
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
const captionCuts = {
  S15: [['典型演变路径。', 'a typical course.']],
  S16: [
    ['仍处于早期。', 'shows early inflammation.'],
    ['在黏膜和黏膜下层。', 'the mucosa and submucosa.'],
  ],
  S17: [
    ['管壁张力升高，', 'the appendiceal wall,'],
    ['压迫阑尾壁动脉。', 'wall artery.'],
    ['堵塞回流。', 'and block outflow.'],
    ['彻底切断血供，', 'in severe cases,'],
  ],
  S18: [
    ['可形成坏疽，', 'can cause gangrene.'],
    ['典型外观。', 'in gangrenous appendicitis.'],
    ['容易穿孔，', 'prone to perforation,'],
  ],
};

const scenes = new Map();
const sceneInfo = {};
const master = Boolean(globalThis.__sectionCueSheet);

function mountScene(cue) {
  const { id } = cue;
  const scene = sceneFactories[id]();
  const art = appendStorySvg(stage.paint, scene.paint, { hidden: true });
  const labels = appendStorySvg(stage.lettering, scene.lettering, { hidden: true });
  const captions = prepareCueCaptionPages(cue, captionCuts[id]);
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
  const visibility = 1 - leave;
  scene.art.style.opacity = String(visibility);
  scene.labels.style.opacity = String(visibility);
  for (const layer of [scene.art, scene.labels]) {
    layer.style.transform = leave ? `translate(${68 * leave}px, ${-38 * leave}px) scale(${1 - .075 * leave})` : '';
  }
  stage.setSubtitles(isBridge || capture ? null : cueCaptionAt(scene.captions, p), p);
  const marker = isBridge ? 3 * (1 - phase(p, .35, .99))
    : cue.id === 'S15' ? 1 + phase(p, .12, .29) + phase(p, .30, .49)
      : cue.id === 'S16' ? 1 : cue.id === 'S17' ? 2 : 3;
  showDots({ marker, opacity: capture ? 0 : 1 });
  bridgePlates.show(handoff ? { subject: incoming } : {});
  return { id: cue.id, p, outgoing: isBridge ? visibility : 0, incoming };
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
