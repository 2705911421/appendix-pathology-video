# gross01（Grok Build）：大体阑尾标本画风样张（正常 / 红 / 黄 / 黑）

工作目录 /workspace/病理科普视频/v5_gross_dev（git worktree，分支 gross-dev）。只在这个目录里工作，不许 git commit。不许碰 /workspace/病理科普视频/v5（主工作区，Codex 正在用），也不许碰 v4_mix/。不打印、不改动 /workspace/病理科普视频/配音/.mimo.env。

## 目标

给视频的大体标本场景（S01、S06、S11、S13、S14）定一个画风。这一轮只做静态样张，不做动画。

## 画风依据（必须读）

- /workspace/病理科普视频/v4_mix/qa/style/风格规范_v1.md：墨线用 Rough.js 风格，墨色 #2A2A35；纸色 #F4EFE6；水彩只在 bake 里生成；大体脓苔只用 #CDB98A；出血红褐色用规范里的色值。
- 引擎：engine/lib 下的 wash.js、ink.js、figure.js（specimenOutline）、ann.js。只能读，不能改。新代码放在 film/lib_ext/gross_appendix.js。
- 参考旧样张：/workspace/病理科普视频/风格样张/02_阑尾大体.jpg。
- 镜下段已定稿的成品可以作为整体质感的参考，见 /workspace/病理科普视频/v5/qa/v6/c03_s10/review_sheet.png：通透、淡染、手绘水彩，不要扁平饱和的矢量感。

## 要画的

在 1920×1080 的纸色底上，右主画面区域（x=570–1860，y=50–780）放一根大的阑尾标本（盲管状、略弯、带系膜），手绘墨线加水彩。四种状态各出一张：

1. **正常**：灰粉色，浆膜光滑有光泽，系膜血管细。
2. **红（单纯性）**：朱红充血，表面血管扩张，轻度肿胀。
3. **黄（化脓性）**：明显肿胀增粗，浆膜面附着斑驳的灰黄色脓苔（#CDB98A，不规则、片状、半透明的水彩，不能整根涂黄），血管充血。
4. **黑（坏疽性）**：只是局部暗红到黑褐色的坏死区，不能整根涂黑；周围仍有黄、红改变，可以有局部出血斑。

另外出一张 2×2 拼图 `gross_四态.png`。

## 实现

用 film/ 的多场景机制新增 ?scene=gross_test（读 film/main.js 了解它的写法）。出图用 /workspace/garden-skills/skills/motion-showreel/scripts/render.mjs 的 --still，并跑一次 --determinism。形状用固定种子，禁止 Math.random。

## 交付

交付到 qa/gross/：四张单图、2×2 拼图、说明.md。说明里写：用到了哪些颜色和函数，以及你自己认为哪里还不够好。
