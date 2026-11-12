# v6 a01（Codex）：整片粗剪 v1（真实配音 + 双语字幕 + S08 成片画面 + 其余占位）

工作目录 /workspace/病理科普视频/v5，分支 v6-fresh，基于提交 66ff9d4（S08 定稿，tag v6-s08-final）。不许 git commit。

硬约束：
- 锁定文件（engine/lib/he.js、he_detail.js、wash.js、ann.js、scope.js、camera.js、parity_r4/chapters/04.js）开工和结束都做 sha256 校验，不得改动；也不改 v4_mix/。
- S08 的画面内容不得改变：在同一画面状态下，新渲染的帧与 qa/v6/b10/ 七帧必须逐像素一致（MAE<0.5）。只允许改时间轴（film/timeline.js），也就是"什么时刻到达哪个画面状态"。
- 不得打印或改动 /workspace/病理科普视频/配音/.mimo.env。不新增任何数字上屏。

任务：
1. 时间绑定：真实时间轴在 /workspace/病理科普视频/配音/全稿_v3/timeline.json（lines[n].start/end，单位秒，n=句号）。现在 film/timeline.js 的句 29–34 是每句 6 s 的占位。改成读取真实时长：S08 片段从句 29 开始，到句 34 结束后保留约 0.8 s，片段内的时间以句 29 的起点为 0。低倍→中倍的推进仍放在 s30 之前，各句画面状态（s30–s34）与对应句同步。如果某句太短，推进动作放不下，写进报告，不要擅自删掉画面状态。
2. 把 S08 片段渲染成 1920×1080、30 fps 的视频，使用 /workspace/garden-skills/skills/motion-showreel/scripts/render.mjs（先查看它支持的视频或帧序列输出方式；不支持视频就输出 PNG 序列，再用 ffmpeg 编码）。
3. 整片画面底板：长度等于 timeline.json 的 duration（约 327.8 s），底色 #F4EFE6。S08 视频放在句 29 起点对应的真实时刻。其余时段是占位：每个场景（按 分镜/分镜_v1.md 的 S01–S21 句号范围）在左上角用小号灰字写"草稿占位 S0x ／句 aa–bb"，只在粗剪里出现，并且必须在 y<950 之内。
4. 合成：用 assembly/pipeline/assemble.sh（先读 assembly/pipeline/README.md），--scene-video 用上一步的底板，配音用 /workspace/病理科普视频/配音/全稿_v3/旁白_v3.wav，字幕的时间来自真实时间轴（确认 loadCues 用的是 timeline.json 或 lines.json 的真实 start/end，不是估算公式；如果需要，就把真实时间轴生成一个 cues 快照传给 --cues）。不配音乐。保留片尾。--out-dir 用 /workspace/病理科普视频/v5/qa/v6/animatic，--out-name 用 粗剪_v1。同时导出一份 720p 预览。
5. 自检，写入 qa/v6/animatic/自检.md：
   - 总时长。
   - 字幕与配音的对齐抽查：句 01、31、34、50、77 的字幕出现时刻与 timeline.json 的差值。
   - S08 各画面状态与 b10 七帧的 MAE。
   - 渲染命令。
   - sha256 校验结果。
   另做一张 contact_sheet.png：从整片每 20 s 取一帧，并加上 S08 段内的 6 帧。
