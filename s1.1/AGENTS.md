# s1.1 共享绘制与交付

`s1.1-1` 至 `s1.1-6` 的浏览器入口统一 `import` 下列共享组件，按分镜组合。纸基、字幕、左侧注释、人物、回盲部、H&E 与轴位 CT 的绘制实现集中在 `shared/`。各板块编排自己的镜头、字幕文本、标注和时间线。

- `../shared/canvasCore.js` 提供 `createStoryStage`、`appendStorySvg`、`waitForWashes`、`prepareStorySubtitles`、`drawStorySubtitles` 和 Gate 0.5 画笔。先构建镜头与挂载图层，再等待 `stage.ready` 和 `waitForWashes()`。`stage.ready` 返回宣纸颗粒的绘制函数。DOM 字幕调用 `stage.setSubtitles(prepared, progress)`，Canvas 2D 字幕调用 `drawStorySubtitles(ctx, zh, en, progress)`。`progress` 为本条 cue 的 `0–1`，`zh` 接受字符串或 `{ text, highlights: [...] }`。长中文分两屏时，`en` 可传两段人工对齐的译文，也可传由共享函数分页的字符串。
- `../shared/leftFloatNotes.js` 提供 `createStoryWindow`、`drawStoryClock`、`drawStageDots`、`drawPathologyProgress`。窗景挂载后传 `windowView.update(art, phase)`，从 `0` 的日景渐变至 `1` 的月景。慢性镜头使用 `{ mode: 'chronic' }`。左侧组件使用 `x=65–310` 的宣纸留白。
- `../shared/anatomyWatercolor.js` 提供 `createIleocecal({ id, x, y, scale, stage })`，`x, y` 为升结肠图样的左上角。挂载返回的 `paint`，调用 `organ.update(art, { fromStage, stage, stageProgress, cutaway, showThrombus })` 逐帧推进。`stageProgress` 和 `cutaway` 范围为 `0–1`。初始组件与 `update` 的回传值均含 `thrombusX`、`thrombusY`。连线使用当帧回传坐标。构图统一用正面解剖观。
- `../shared/charactersAndHistology.js` 提供 `drawPatient({ pose: 'pain' | 'recovered' })`、`drawDoctor`、`createInflammationField`、`createHistologyLens`、`drawAxialCT` 与单项细胞结构。人物 `x, y` 为头顶中心。`createHistologyLens` 的 `x, y` 为镜心，`drawAxialCT` 的 `x, y` 为片面左上角。CT 的 `R/L` 和病灶虚线圈来自同一组件的 `lettering`。同画面多个实例使用各自的 `id`。

```js
import {
  appendStorySvg, createStoryStage, prepareStorySubtitles, waitForWashes,
} from '../shared/canvasCore.js';
import { createIleocecal } from '../shared/anatomyWatercolor.js';

const stage = createStoryStage(document.querySelector('main'));
const organ = createIleocecal({ x: 690, y: 110, scale: 1.65 });
const art = appendStorySvg(stage.paint, organ.paint);
const caption = prepareStorySubtitles({ text: '阑尾逐渐肿胀。', highlights: ['肿胀'] }, 'The appendix gradually swells.');
await Promise.all([stage.ready, waitForWashes()]);

window.renderAt = time => {
  const progress = Math.min(1, Math.max(0, time / 5));
  organ.update(art, { fromStage: 'normal', stage: 'simple', stageProgress: progress });
  stage.setSubtitles(caption, progress);
};
window.renderAt(0);
```

分镜清单位于各板块的 `out/cues_s1.1-n.json`，每句带 `id`、`defaultDuration` 和双语字幕。默认原生时间线为口播 303.73 秒、九段桥接 14.52 秒及 6.5 秒片尾，总计 324.75 秒。母带脚本读取 `shared/renderProfile.js`，外部配音齐全时按实测时长写入 `out/master_timeline.json`，并在渲染时使用同一份时间轴。字幕、画面标注和时间表通过共享盲审文字校验，素材与元数据同样采用匿名内容。

在 `s1.1` 目录运行 `npm test`。`npm run render -- --verify` 用原审定 PNG 做回归比对，`npm run render -- --components` 检查新增组件。六段时间表齐备后运行 `npm run verify:cues` 核对连续拼接与总时长。
