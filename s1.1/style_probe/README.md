# s1.1 · 绘本水彩留白风

在 `s1.1` 目录使用 Node.js 20.9 以上版本和本机字体 Noto Sans SC、Noto Serif SC。

```powershell
npm ci
npm test
npm run render
npm run render -- --verify
npm run render -- --components
```

Playwright 使用已安装的 Chromium，找不到时使用系统 Chrome。也可通过 `CHROME_PATH` 指定浏览器。共享层的重渲染输出到 `out/shared/`，包括三张 1920×1080 的 `frame_*_v2.png` 和竖排拼图。`--verify` 读取 `out/` 中的审定原图进行比对。B、C 比对全部像素，A 比对新版左侧留白与字幕之外的画面。`--components` 输出共享组件的五种回盲部状态、开窗近景和人物立绘自检图。样张统一从 `../shared/` 加载画笔及组件。

页面通过 `window.renderAt(t)` 读取秒数。三张样张取在 2.8、6.15、10.45 秒。固定种子生成 p5.brush 笔触，运行时按时间计算水彩轨迹、红细胞位移与切面到圆镜的轮廓插值。WebGL 宣纸颗粒最多 3.4%，在标注和字幕处减弱。命令行加 `-- --no-paper` 可关闭颗粒并用同名输出重新渲染。浏览器入口对应参数为 `?paper=0`。

## 样张依据

- 画面参考工作区 v4 和《AI 做动画视频完全操作教程》第 2、3 章。宣纸留白、稳定笔触与箭头落点也参考了 motion-showreel 的风格和审片规则。 [motion-showreel](https://github.com/ConardLi/garden-skills/tree/main/skills/motion-showreel)
- C 帧为代码绘制的轴位教学示意。`> 93%` 对应成人疑似急性阑尾炎研究中的多层 CT 表现。例如一项纳入 2,871 名成人的研究报告敏感度 98.5%。 [原始研究](https://pubmed.ncbi.nlm.nih.gov/21690593/)
- C 帧的 `>6mm` 标注描述示意中的阑尾外径。判读时还需结合阑尾形态、周围征象和临床表现。 [CT 对照人群研究](https://pmc.ncbi.nlm.nih.gov/articles/PMC2773125/)
