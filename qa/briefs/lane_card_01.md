# 并行线通用规则（所有并行线必读）

你在一个独立 git worktree 里工作（分支见下），与其他并行线同时进行。主线是 /workspace/病理科普视频/v5 的 v6-fresh 分支（另有线在 v5 和 v5_s19_dev 改 S06/S07/S19，不要碰这些目录）。

**只在你自己的 worktree 里改文件。** 新场景写成 film/chapters/sNN.js；本线专用的绘图库写在 film/lib_ext/<本线名>_*.js。尽量不改共享文件（film/main.js、film/timeline.js、已有 lib_ext）；为了能单独渲染可以改 main.js，但改动要最小、集中，便于我之后合并。
**锁定文件不许改**，开工和收工各做一次 sha256 校验并写入日志：engine/lib/{he,he_detail,wash,ann,scope,camera}.js、parity_r4/chapters/04.js。

先读这些再动手：
- 分镜：分镜/分镜_v1.md（本线场景的行、素材库 B–J 说明、"研究卡/文献提示"表）。
- 配音与时间：配音/全稿_v3/（timeline.json，所有时间按句号对齐，不要写死秒数，后面会重新配音）。
- 风格：/workspace/病理科普视频/v4_mix/qa/style/风格规范_v1.md；版式参考已做好的 S06（qa/v6/h02_s06/s23_red.png、s24_after.png）：浅米色底、左侧标题/要点文字栏、右侧主画面；手绘水彩质感，不要扁平饱和的矢量风。标签规范：细引线 + 浅紫字、无框；所有内容 y<950。
- 渲染：/workspace/garden-skills/skills/motion-showreel/scripts/render.mjs（用法参考 qa/briefs/v6_d01_s11.md 和 qa/v6/ 下已有的 build/render 脚本）。
- brief 格式与交付习惯参考 qa/briefs/v6_d01_s11.md、v6_e01_s19.md。

内容红线：
- 画面文字只能来自定稿解说词/分镜，**不得编造任何数字、研究或文献**；分镜"研究卡/文献提示"表里列出的数字和引注才能上屏，且原样照抄。
- 原创自绘，不用网图/照片；不出现姓名、学校。
- 医学上要准确；拿不准的地方在 自检.md 里列出，不要猜着画。

每个场景交付（qa/v6/<本线名>/<场景>/）：每句 1–2 张关键帧 + 200% 局部、review_sheet.png（关键帧总览）、SNN.mp4 与 SNN_带配音_720p.mp4（配上对应句的真实配音）、自检.md（逐条对照分镜要求和风格规范）。一个场景完成并自检通过就在本分支 commit（`git -c user.name=mini -c user.email=mini@local commit`，信息以本线名开头），然后做下一个场景，全部做完再结束。不要 push，不要合并到 v6-fresh。

# 并行线 card：路径分支、手术时机与来源卡 + S05、S17、S20
worktree：/workspace/病理科普视频/v5_card_dev（分支 card-dev），本线名 card。

1. 先建素材库 I（分镜"路径分支、手术时机、研究与来源卡"）：红→黄→黑三色导航（与片名《一根"香肠"的变质日记：阑尾的红→黄→黑》一致）、"非固定路径"分支图形、卡片版式。出一张 库总览.png。措辞和证据边界严格按分镜。
2. 按分镜做 S05（句20–22）、S17（63–65）、S20（71–74）。右侧需要大体阑尾小图时，先用 v5_gross_dev 里第四轮的 film/lib_ext/gross_appendix.js（只读引用或复制到本线 lib_ext，大体画法还没定稿，之后会统一替换），不要自己另画一套。
