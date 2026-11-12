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
# card_adv01（Codex 进阶审核 + 修改：S05 / S17 / S20）

分支 card-dev。mini 初审已通过 card_fix01（人物统一到 clin 人物库、全身落地、S17 64–65 动作、S20 窗内字号）。请先**独立审核**（不要只信 自检.md），把意见写进 `qa/v6/card/审核意见.md`，再逐条修改、重渲、提交（带 (Codex)）。

审核时对照：qa/ref/style_target/ 细化样张的整体质感、lane_briefs/common.md、配音 timeline 逐句。

mini 已注意到、请重点核查的点：
1. **安全区不一致**：clin 线按 y<810 留字幕区，card 的 verify.py 只查 y>950。S17 句65 的「马上手术/观察后择期」选项窗、S20 句74 下窗底边看起来进入了 810–950。请统一按 common.md / 主线的字幕区规定（如 common.md 没写清，以主线 v6-fresh 已定稿场景 S08/S14 的字幕区为准），所有内容移出字幕区。
2. **医生发型**：card 用外部叠画给医生加了近白短发+眼镜，clin 线（clin_fix01 正在跑）会在 clin_draw.js 里统一改医生造型。不要再保留 card 自己的叠画：等合并时以 clin_draw.js 为准；本轮把叠画做成可开关的参数，默认关闭，并在审核意见里说明。若 `git show clin-dev:film/lib_ext/clin_draw.js` 已含医生区分特征，直接同步过来。
3. 病人手捂位置应在右下腹（McBurney 点附近），不在髂前上棘水平；如需新增手臂姿势，做成向后兼容的新参数。
4. S20 句73 情境窗内只有一个小人和四个字，仍偏空；判断是否需要加一个与"择期"语义相符的简单图示（日历小图标等），不得引入分镜外的医学信息。
5. S17 句63 大体阑尾为临时资产，保持占位即可，不要在本轮重画。

交付：审核意见.md、修改提交哈希、重出的 review_sheet / 关键帧 / 带配音 720p、仍存在的不足。
