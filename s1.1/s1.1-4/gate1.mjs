import {
  appendStorySvg, createStoryStage, prepareStorySubtitles, waitForWashes,
} from '../shared/canvasCore.js';
import { mountBridgePlates, selectEntryPart } from '../shared/detail/bridgePlates.js';
import { mountPaperBridge } from '../shared/detail/transitionPaper.js';
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
const showPaper = mountPaperBridge(root);
const bridgePlates = mountBridgePlates(root);
const sceneFactories = { S15: s15, S16: s16, S17: s17, S18: s18 };
const secondPage = {
  S15: ['但请记住', 'The course varies'],
  S16: ['更深处的平滑肌层里', 'with only a few scattered'],
  S17: ['阑尾系膜静脉', 'A thrombus can form'],
  S18: ['脆弱的管壁', 'The weakened wall'],
};

const scenes = new Map();
const sceneInfo = {};
const master = Boolean(globalThis.__sectionCueSheet);

function mountScene({ id, zhText, highlightZh, enText }) {
  const scene = sceneFactories[id]();
  const art = appendStorySvg(stage.paint, scene.paint, { hidden: true });
  const labels = appendStorySvg(stage.lettering, scene.lettering, { hidden: true });
  const [zhStart, enStart] = secondPage[id];
  const splitAt = zhText.indexOf(zhStart);
  const enBreak = enText.indexOf(enStart);
  if (splitAt <= 0 || enBreak <= 0) throw new Error(`Bilingual subtitle break missing for ${id}`);
  const captions = prepareStorySubtitles({ text: zhText, highlights: highlightZh },
    [enText.slice(0, enBreak), enText.slice(enBreak)], { splitAt });
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
  const leave = handoff ? phase(p, .23, .84) : 0;
  const visibility = 1 - leave;
  scene.art.style.opacity = String(visibility);
  scene.labels.style.opacity = String(handoff ? 1 - phase(p, .14, .54) : 1);
  const departure = scene.art.querySelector('[data-b06-departure]');
  if (departure) departure.style.opacity = String(handoff ? 1 - phase(p, .05, .48) : 1);
  for (const layer of [scene.art, scene.labels]) {
    layer.style.transform = leave ? `translate(${68 * leave}px, ${-38 * leave}px) scale(${1 - .075 * leave})` : '';
  }
  stage.setSubtitles(isBridge || capture ? null : scene.captions, p);
  showPaper(capture ? 0 : isBridge ? phase(p, .32, .9) : cue.id === 'S15' ? 1 - phase(p, 0, .10) : 0);
  bridgePlates.show(handoff ? { icon: phase(p, .06, .48), subject: leave } : {});
  return { id: cue.id, p };
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
