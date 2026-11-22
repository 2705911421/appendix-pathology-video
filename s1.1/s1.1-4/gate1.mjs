import {
  appendStorySvg, createStoryStage, prepareStorySubtitles, waitForWashes,
} from '../shared/canvasCore.js';
import { createCueTimeline } from '../shared/timelineHelper.js';
import cueSheet from './out/cues_s1.1-4.json';
import { s15 } from './s15.mjs';
import { s16 } from './s16.mjs';
import { s17 } from './s17.mjs';
import { s18 } from './s18.mjs';

const CUES = createCueTimeline(cueSheet);
const resolveCue = (timeline, t) => timeline.at(t);
const root = document.querySelector('#plate');
const stage = createStoryStage(root);
const sceneFactories = { S15: s15, S16: s16, S17: s17, S18: s18 };
const secondPage = {
  S15: ['但请记住', 'yet not a rigid sequence'],
  S16: ['更深处的平滑肌层里', 'with only a few scattered'],
  S17: ['肿胀压迫血管', 'swelling and mesenteric'],
  S18: ['脆弱的管壁', 'its fragile wall'],
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

if (!master) for (const cue of cueSheet.cues) mountScene(cue);
const [drawPaper] = await Promise.all([stage.ready, waitForWashes(root)]);

function renderAt(t) {
  const { cue, p } = resolveCue(CUES, t);
  let scene = scenes.get(cue.id);
  if (!scene) {
    scene = mountScene(cue);
    waitForWashes(root);
  }
  for (const item of scenes.values()) {
    item.art.toggleAttribute('hidden', item !== scene);
    item.labels.toggleAttribute('hidden', item !== scene);
  }
  scene.update(scene.art, scene.labels, p);
  drawPaper(2);
  stage.setSubtitles(scene.captions, p);
  return { id: cue.id, p };
}

if (!master) renderAt(0);
Object.assign(window, {
  renderAt,
  gate1SceneInfo: sceneInfo,
});
