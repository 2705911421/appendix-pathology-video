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

# v6_a02（Codex）：并线验收 + 整片粗剪 v16

工作目录 /workspace/病理科普视频/v5（分支 v6-fresh，HEAD 7a48943）。mini 刚把 ct-dev（S04/S09/S12/S15 真实 CT）、mech-dev（S13）、clin-dev（S02/S03/S16）并入 v6-fresh，film/main.js 合成了统一场景表。不改任何场景画法；只修并线造成的问题。

任务：
1. 对每个已注册场景（s02 s03 s04 s06 s07 s08 s09 s10 s11 s12 s13 s14 s15 s16 s19）在 v6-fresh 上渲染关键帧，与各自线的定稿关键帧逐像素对比（MAE<0.5）：ct 用 /workspace/病理科普视频/v5_ct_dev/qa/v6/ct_real_adv01/S*/，mech 用 /workspace/病理科普视频/v5_mech_dev/qa/v6/mech/s13_adv01/，clin 用 /workspace/病理科普视频/v5_clin_dev/qa/v6/clin/S*/，其余用 v6-fresh 现有 qa/v6 定稿帧。如有不一致，找出并线原因（main.js 时钟/洗色开关、共享库冲突、资产路径），最小改动修复，写明原因。
2. 按现有 animatic 流程（参考 qa/briefs/v6_a01_animatic.md 与最近一版 粗剪_v14/h06_adv 的 v15 做法）出 粗剪_v16（1080p + 720p）到 qa/v6/animatic/：所有已完成场景用成片画面替换占位，其余仍占位；真实配音全稿_v3；字幕真实时间轴。单进程渲染、workers=1。
3. 自检写入 qa/v6/animatic/自检_v16.md：总时长、各场覆盖区间表、仍是占位的句号区间、逐场 MAE 结果、相接处是否有空帧、锁定文件 sha256 首尾一致。另做 contact_sheet_v16.png（每 15 s 一帧）。
4. 提交带 "(Codex)"（能 commit 就 commit；git 只读则打 bundle 到 qa/v6/a02/a02.bundle 并验证）。不 push、不改其他 worktree。
