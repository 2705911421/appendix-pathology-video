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


**机器负载**：现在有 8 条线同时在这台 8 核/15GB 的机器上跑，渲染时只开 1 个渲染进程/1 个浏览器实例，不要并发多路渲染；预览可先用低分辨率，定稿再出全尺寸。
**提交**：每完成一个场景就在本分支 commit；如果 git 元数据写不进去，把提交打成 qa/v6/<本线名>/<本线名>-dev.bundle 并在日志里说明。

# mech_adv01（Codex 高级审核 + 修改，S13，最后一轮）

分支 mech-dev，当前 HEAD 含 mech_fix01（14d9ac7）。按加速要求，这是 S13 的唯一一轮高级审核，之后定稿；只修真正的问题（病理错误、画面穿帮、对照风格规范和 细化样张 明显不足之处），不要大改构图。

1. 先独立审核：看 qa/v6/mech/s13_fix01/ 的 review_sheet、每句关键帧和 200% 局部、S13_带配音_720p.mp4，对照分镜 S13（句 49–53：腔压升高→静脉受压/血栓→坏死出血→色素/坏疽大体）、风格规范和医学准确性。把意见写到 qa/v6/mech/s13_adv01/审核意见.md（逐条：问题、句号/时间码、严重度、是否修）。
2. 再修改：只修标为"修"的条目。重点核查：横截面结构层次是否正确（黏膜/黏膜下/肌层/浆膜），受压静脉与血栓画法，HE 坏死出血区红细胞外渗和核碎裂是否可信，大体坏疽暗紫黑与周围出血带过渡（与 gross-dev 的大体风格一致即可，不要另起风格）。标签细引线 + 浅紫字，y<950。
3. 交付到 qa/v6/mech/s13_adv01/：关键帧 + 200% 局部、review_sheet.png、S13.mp4、S13_带配音_720p.mp4、自检.md（确定性、锁定文件 SHA、音视频检查）。提交信息 "mech_adv01 (Codex): ..."；git 元数据写不进去就打 bundle 到 qa/v6/mech/s13_adv01/mech_adv01-dev.bundle。单进程渲染，不 push、不合并。
