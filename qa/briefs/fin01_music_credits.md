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

# fin01（Claude）：原创配乐 + 片尾字幕

工作目录 /workspace/病理科普视频/v5_final_dev（分支 final-music）。本线名 fin。产物放 qa/v6/fin/。

## 背景
整片约 340 s（参考 /workspace/病理科普视频/v5/qa/v6/animatic/粗剪_v16.mp4 与 自检_v16.md：全稿配音 327.83 s + 末尾 12 s 原片尾）。配音 /workspace/病理科普视频/配音/全稿_v3/（timeline.json 句号时间）。CT 署名原文：/workspace/病理科普视频/v5_ct_dev/qa/v6/ct_real/credits.md。

## 任务一：配乐（只许原创程序合成）
- 用 Python（numpy/scipy）从零合成整片配乐 music_v1.wav（48 kHz 立体声，时长 = 粗剪_v16 总时长 339.833 s），不得下载或使用任何第三方音乐、采样、音色库、AI 音乐服务。授权写入 qa/v6/fin/music/LICENSE.md："本片配乐为制作团队用程序代码原创合成（脚本 compose.py），无第三方素材"。
- 风格：轻柔、温暖的科普钢琴/电钢 + 柔和 pad，慢速（约 72–84 BPM），大调为主；句48–59（穿孔、并发症段，按 timeline.json 实际时间）转为稍紧张的小调/低音持续；句75–77 回到明亮并在片尾收束，最后 1.5 s 淡出。
- 闪避：以配音为侧链，口播时音乐比无口播时低约 8 dB；整体混音后配乐不抢人声（口播段音乐 RMS 比人声低 ≥ 15 dB）。
- 交付 mix_preview_v1.m4a：粗剪_v16 原音轨 + 配乐混合，整片响度 −16 LUFS ±1，真峰值 ≤ −1.5 dBTP（用 ffmpeg loudnorm 测量并记录数值）。另交 music_v1.wav（未混）。
## 任务二：片尾字幕 credits_v1.mp4
- 1920×1080、30 fps、时长 12.0 s，替换原 12 s 片尾；先看 粗剪_v16 末 12 s 现有内容，保留其中合适的部分。风格同全片：浅米色底、MixSans 字体（见 film/ 里的字体加载）、深灰字、浅紫小标题，所有内容 y<950，慢速上滚或分 3 屏淡入淡出，每屏停留 ≥ 3 s。
- 内容（只用下列来源原文，不得编造任何名字、单位、文献）：
  1. 片名《一根"香肠"的变质日记：阑尾的红→黄→黑》
  2. CT 图像来源：credits.md 中 4 条中文署名 + 许可链接，原样照抄。
  3. 配乐：本片配乐为团队用程序代码原创合成。
  4. AI 使用声明：本片绘图与动画代码在 AI 编程工具（Claude Code、Codex、Grok Build、WorkBuddy）辅助下编写，旁白配音使用 AI 语音合成；医学内容与画面经团队人工审核。镜下图、大体图为示意性绘制，非真实切片。
  5. 参考文献：只照抄 /workspace/病理科普视频/分镜/分镜_v1.md "研究卡/文献提示"表中已列出的引注（若表中没有完整引注，就不写这一项）。
  不出现任何人名、学校、单位（盲审要求）。
- 交付 credits_v1.mp4、每屏 PNG、credits_text.md（逐字文本）。
## 禁止
改 film/chapters 下任何场景、锁定文件（首尾 sha256 校验写日志）、其他 worktree；push；并发渲染。
## 验收（自查到全部满足）
1. music_v1.wav 时长误差 < 0.05 s；LICENSE.md 存在；compose.py 可重跑得到同一文件（sha256 相同）。
2. mix_preview_v1.m4a 测得 I=−16±1 LUFS、TP≤−1.5；口播段音乐/人声比测量表写入 自检.md。
3. credits_v1.mp4 时长 12.0±0.04 s，所有文字 y<950，无姓名学校；文字与 credits_text.md 一致。
4. 自检.md 列出以上测量值。提交信息含 "(Claude)"；git 写不进去就打 qa/v6/fin/fin-dev.bundle。
时间：14:30 前完成。
