任务：搭建新片 v5 项目骨架，并出第一批风格样帧。这是一部全新视频，不是改旧片。
项目根目录：/workspace/病理科普视频/v5/（已存在 qa/、分镜/，其余由你创建）。初始化 git（git init，在 v5 根目录）。
必读：
- 分镜：/workspace/病理科普视频/v5/分镜/分镜_v1.md（项目结构、渲染约定、旧库迁移清单、左栏设计，照此实施）
- 解说词定稿：/workspace/病理科普视频/解说词_v2/解说词_定稿.md
- 画风规范（硬性）：/workspace/病理科普视频/v4_mix/qa/style/风格规范_v1.md
- 病理验收清单：/workspace/病理科普视频/v5/qa/病理验收清单.md
- 旧项目（只读参考与迁移来源，绝对不要修改）：/workspace/病理科普视频/v4_mix/film/（render.mjs、lib/*.js、vendor、fonts）

本轮范围：
1. 骨架：按分镜"v5 新项目结构"建立 index.html、main.js、render.mjs（离线抽帧：--still t、--determinism，契约 window.render(t)/READY/DUR）、data/script.json（从定稿解析 77 句：句号、中文、英文卡、画面建议）、data/timeline.preview.json（明确标 preview 的估时，按每字约 0.22 s + 0.4 s 句间停顿估算，正式音轨到后替换）、lib/timeline.js（以句号 01–77 为键，T.atId/endId/fracId）。
2. 迁移旧库到 v5/lib：tokens、motion、ink、wash、ann、he、he_detail、he_guide、figure、icons、alive（复制后按迁移清单修改）。tokens 里字幕区上沿 SAFE.contentBottom=810，所有画面元素 y<810。vendor 与字体一起复制。
3. 新写 lib/layout.js + lib/sidebar.js：左栏宽 460、x 从 60 起、y 60–770，卡片类型 definition/path/research/compare/timing/source，先测量再画，不溢出。右侧主画面区约 x 560–1860。
4. 字幕：先放占位 lib/subtitle_bilingual.js（中文 68px 一行 + 英文 42px 一行，在 y≥810 区域），Grok Bot 的正式版之后替换。
5. 场景：先只实现 scenes/s01_intro.js 的静态关键状态，和 scenes/s08_red_histology.js 的静态关键状态（其余场景放空壳占位，渲染纸色背景+场景号）。
   - s01：右侧大幅阑尾大体，红、黄、黑三种外观横向并列（不画串行箭头，不画食物），左栏片名《一根"香肠"的变质日记：阑尾的红→黄→黑》分行 + 颜色导航。
   - s08：单纯性阑尾炎大 HE 层次视野（黏膜、黏膜下层、肌层、浆膜），中性粒细胞集中在黏膜和黏膜下层，肌层只散在 3–6 个，浆膜干净仅轻度充血；有局部黏膜上皮缺损（定稿第 34 句）；左栏层次说明卡。
   画法沿用旧项目 he_detail 的细节画法（分叶核、红细胞、水彩底、低饱和），不要扁平卡通。
   病理组额外要求：切片上不得出现粗黑斜线/粗指针，引线一律细线；脓细胞（若出现）要有核固缩、碎成小深蓝点的形态。
6. 渲染样帧到 /workspace/病理科普视频/v5/qa/samples/：s01 关键帧、s08 关键帧各 1 张（1920×1080），以及 s08 的 200% 局部（黏膜缺损处、肌层）。再出一张手机竖屏全屏模拟图（把 1920×1080 缩到 390pt 宽）检查字号。
7. 跑 render.mjs --determinism（在可渲染的场景上）通过；检查所有元素包围盒 y<810。
8. git commit："v5 scaffold + s01/s08 style samples (Codex)"。
不要编造任何数字上屏。不要改动 v4_mix 下任何文件。
输出：创建/迁移的文件清单、样帧路径、确定性与安全区检查结果、提交哈希，最后一行 EXIT 0。
