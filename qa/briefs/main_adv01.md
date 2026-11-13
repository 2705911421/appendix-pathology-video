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

# main_adv01（Codex 高级审核 + 修正，S06/S07）

注意：本 brief 在主线 worktree /workspace/病理科普视频/v5（分支 v6-fresh，当前 HEAD 8ca3570）执行，只改 S06/S07 相关文件（film/chapters/s06.js、s07.js、film/lib_ext/vascular_response.js、必要时 main.js 最小改动）及其交付目录，不碰其它场景。

main_fix01（提交 167bcc9 S06 红细胞中央淡染、203a011 S07 渗出与粗剪 v14）已过 mini 初审。请先做独立审核：对照分镜 23–30 句、风格规范_v1.md、细化样张（v5/qa/ref/style_target/），逐句看 qa/v6/h04_s06/、qa/v6/h03_s07/ 关键帧、200% 局部和带配音 720p，写 qa/v6/h06_adv/审核意见.md，然后修正你认为必要的问题。mini 初审已发现的小问题（必须处理）：

1. s27_crossing：左栏"白细胞"标签的引线指向间质里的一个小紫点，而不是正在穿壁的中性粒细胞；标签字压在圆窗左缘。改为引线终点在穿壁白细胞上，标签整体落在圆窗外的米色区或圆窗内空白处，不压边。s27_adhesion / s27_exited 同样核对。
2. 穿壁白细胞在圆窗全景下与红细胞差不多大，200% 特写才看清分叶核。全景中白细胞应比红细胞明显大（约 1.5–2 倍直径），分叶核在 1080p 全景下可辨。
3. s27_crossing 全景圆窗左侧 x≈450 处有一条从上到下的淡竖线（圆窗外），检查是否为遮罩/图层接缝并去掉；所有 S07 帧同样检查。
4. 血管下壁上 x≈578、x≈745 两处白色短竖线：若表示内皮间隙，需与分镜一致且在第 25 句前不出现、或改得更自然；若是瑕疵，去掉。

## 交付
qa/v6/h06_adv/：审核意见.md、修正前后对比、逐句关键帧与 200% 局部、review_sheet、S06/S07 各自带真实配音 720p、粗剪 v15（只替换 S06/S07 窗口，窗外视频/音频包校验一致）、自检.md。提交带 (Codex)；git 元数据只读时按 common.md 存 bundle。不要 push、不要合并到其它分支。单渲染进程。
