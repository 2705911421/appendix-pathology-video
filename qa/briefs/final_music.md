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


---

# brief 标准 v1（Gisele 2026-11-13 12:54 要求：brief 必须精确，不再允许 10 轮以上返工）

> 本文件对所有 11-13 起的 brief 生效。与 common.md 冲突时，以本文件和各 brief 正文为准。
> 工具：Python 一律用 `/workspace/venv_qa/bin/python`（已装 numpy/scipy/opencv/scikit-image/pillow）；渲染用 /workspace/garden-skills/skills/motion-showreel/scripts/render.mjs（用法见各 brief 引用的现成脚本）；视频用 ffmpeg/ffprobe。禁止使用 `timeout` 包裹任何命令。

## 一、每份 brief 必须包含的八块（本 brief 已逐块写好，你照做）
- (a) **唯一目标**：一句话。不做目标之外的任何事。
- (b) **参照文件**：绝对路径 + 具体帧/时间 + 要对齐什么。
- (c) **输入素材与唯一允许的操作**，以及**禁止清单**（含锁定文件 sha256）。
- (d) **逐镜规格表**：句号（全稿_v3）、起止时间、素材来源及裁切/相机参数、缩放起止、标签原文（逐字）、标签位置、箭头目标坐标。
- (e) **数值验收**：必须自己跑、自己报数字。
- (f) **交付物**：精确路径。
- (g) **自循环**：任何一项验收不过，就继续改、重新测量，直到全部通过（内部最多 3 轮）。**不许交不合格的东西**；3 轮后仍不过，就在 自检.md 和 DONE/FAILED 标记里写明是哪一项指标、实测值、原因。
- (h) **范围外清单**。

## 二、全局硬规则（所有 brief 共用）
1. **复用现有像素/代码**：优先裁切、平移缩放、叠字、叠已有素材；能重新渲染现成场景代码（改相机参数、开关已有参数）就不要重画。新增“画”的东西只限 brief 点名的最小叠加物，并且必须调用 b09/b10 现成的细胞/洗色函数（cell()/detailedNeutrophil()/bake/drawWash 等），不另写新的细胞画法。
2. **锁定文件不许改**，开工、收工各校验一次 sha256（见 /workspace/病理科普视频/lane_briefs/locked_sha256.txt，用 `cd <工作区根> && sha256sum -c` 的格式逐行核对；结果写入 qa/v6/<lane>/sha256_开工.txt 与 sha256_结束.txt）。包含 engine/lib 与 film/lib 的 he/he_detail/wash/ann/scope/camera、parity_r4/chapters/04.js、film/lib_ext/cells_ext.js、film/lib_ext/he_mucosa.js、film/chapters/s08.js（b10 定稿，只读；要用就**复制**到新文件里改）。
3. 画面文字只能来自定稿解说词/分镜；**不得编造数字、研究、文献、比例尺数字、放大倍数数字**（量尺规则只用于控制画面，不上屏）。不出现姓名、学校。
4. 文字规格（1080p 画面）：标题 ≥44 px 粗体，正文/标签 ≥36 px；所有内容 y<950；深色底（#111114）上用浅色字 #E8DDE9 或 #D8C5E7；亮色圆视野内用深紫 #51336F。对比度 ≥4.5:1（用 WCAG 公式在标签包围框附近采样背景实测）。标签用细引线 + 字，无框。
5. 时间：全部按 配音/全稿_v3/timeline.json 的句号取 start/end，**不得写死秒数**。标签/镜头事件相对句首/句尾的位置用比例（T.frac）表示，且 事件时间与 timeline 的差 ≤0.1 s。
6. 提交：`git -c user.name=mini -c user.email=mini@local commit`，信息以 lane 名开头；git 元数据写不进就打 bundle 到 qa/v6/<lane>/<lane>.bundle 并 `git bundle verify`。不 push、不合并到 v6-fresh、不动其他 worktree。
7. 永远不做：删除 配音/.mimo.env 或打印任何密钥；`git reset --hard` / `git filter-repo` / 强推；添加 GitHub remote；写 `timeout`。
8. 机器：8 核 15GB，渲染单进程（workers=1）、单浏览器；`free -g` 可用内存 <2 GB 时暂停等待。
9. 交付完成标记：通过后写 `qa/v6/<lane>/DONE.json`（{"lane","status":"pass","commit","metrics":{...全部数值}}）；不通过写 FAILED.json。mini 的调度脚本以这个文件为准。

## 三、显微镜量尺规则（Gisele 2026-11-13 12:55，所有镜下 brief 必须满足；适用 S08/S10/S11/S13/S14/S18/S19）
真实 40× 物镜 × 10× 目镜视野直径 ≈ 0.45–0.5 mm（取 475 µm）。画面里圆形视野直径 D（px）对应 FOV：**px/µm = D / FOV_µm**。
本片标准镜下圆视野 D=850 px（圆心 (1110,475)、半径 425）。双窗并列时每窗 D 另行指定，按同一公式换算。

| 档位 | 对应 | FOV | D=850 时 px/µm | 中性粒细胞(10–12µm) | 淋巴细胞(7–8µm) | 红细胞(7.5µm) | 浆细胞(10–14µm) |
|---|---|---|---|---|---|---|---|
| 高倍(≈400×) | 40×物镜 | 475 µm | 1.79 | 18–21 px | 12.5–14.3 px | 13.4 px | 18–25 px |
| 中倍(≈200×) | 20×物镜 | 约 1 mm | 0.85 | 8.5–10 px | 6–7 px | 6.4 px | 8.5–12 px |
| 低倍(≈100×) | 10×物镜 | 约 2 mm | 0.43 | 4–5 px | 3–3.4 px | 3.2 px | 4–6 px |
| 油镜(≈1000×，仅限“单细胞特写”例外) | 100×物镜 | 190 µm | 4.47 | 45–54 px | 31–36 px | 33 px | 45–63 px |

（Gisele 给的 2.2–2.4 px/µm 对应 1080 px 的视野；本片圆视野 850 px，所以按 850/1080 折算，像素范围见上表。若某镜头想用更大视野，必须在 brief 里写明新 D。）
- **验收（每个标“高倍”的镜头，逐镜头）**：实测细胞/核直径的中位数（≥20 个样本）及换算的 µm，落在上表范围 ±15% 内。必须报 px 与隐含 µm。
- **油镜例外**：只允许 brief 点名的“单细胞特写”镜头（S10 句 42 脓细胞，S19 句 70 浆细胞）；这些镜头左上角标注改为“油镜”，细胞尺寸落在油镜行 ±15%；除此之外任何镜头不得超过高倍行的比例。
- **标注与倍率一致**：画面上写“低倍/中倍/高倍”的镜头，其 px/µm 必须落在对应行 ±25% 内（中倍、低倍用 ±25%）。
- **怎么达到**：用更宽的视野——改相机缩放（zoom 变小）、改用 b09/b10 的中倍/低倍画面区域；**重新渲染现成场景代码（同样的细胞绘制代码、同样画风、只改相机倍率/视野）算“重新渲染”，不算“重画”**。不许为了凑尺寸把细胞按比例缩小重画，不许新画细胞。
- **测量方法**（两种都报，互相印证）：
  1. 解析法：渲染前在代码里给每次细胞绘制记录“标称直径（代码单位，如 detailedNeutrophil 胞体 20.4×19.2、cell() 各类型）× 当前变换缩放（相机 z × 图集到屏幕的水平/垂直系数）”，输出每帧的中位数 px；
  2. 像素法：`/workspace/病理科普视频/lane_briefs/tools/measure_cells.py frame.png --r <半径> --fov-um 475`（按核/核团测量，粗测，用于量级核对）。
- **起点参考（解析估算，须你实测校准）**：b10 的 s08.js 里中性粒细胞胞体直径≈20.4×sz 个源单位，高倍镜头 z=2.7 时胞体约 55–66 px（≈ 31–37 µm，约为真实的 3 倍）。因此高倍应落在 **s08.js 相机 z≈1.0**（胞体≈20 px）；S10 图集（6800×4800 图集画在 3400×2400，水平系数 1.6）高倍起点 **z≈0.75**；你必须先量一帧，按 `z_new = z_now × 19.7 / 实测胞体 px` 校准，再复测直至进入范围。
- 对 S13 句 51–52 与 S14 同样适用（它们保留自己的画，但相机倍率必须按本表重设）。

## 四、统一交付目录与文件（每个 lane）
`qa/v6/<lane>/` 下：
- `review_sheet.png`：每句 1–2 帧总览（含句号、时间码、倍档与实测 px/µm 水印不要上屏，写在文件名/图旁的说明文字里）；
- `keyframes/sNN_<tag>.png`（1920×1080）+ `keyframes/sNN_<tag>_200pct.png`（局部 200%）；
- `compare_vs_ref_200pct.png`：与指定参照在同缩放下左右并排；
- `<Scene>.mp4`（1080p，无音频）、`<Scene>_带配音_720p.mp4`（配对应句真实配音，时长=配音时间 ±0.05 s）；
- `自检.md`：逐条列出本 brief 每一项验收的**数值**（实测/阈值/通过与否）、锁定文件 sha256 开工/收工比对、拿不准的医学点；
- `metrics.json`（同样的数值，机器可读）；
- `DONE.json` 或 `FAILED.json`。
通用检查（每个视频都做）：`ffmpeg -i X.mp4 -vf blackdetect=d=0.1:pic_th=0.98 -an -f null -` 无输出；`ffprobe` 时长与 timeline 一致；首尾帧非纯黑。

## 五、医学底线
急性期（单纯性/化脓性/坏疽性）以变质、渗出为主：中性粒细胞、水肿、纤维素、脓；**慢性**才出现增生：纤维组织增生/纤维化 + 淋巴细胞、浆细胞等慢性炎细胞浸润。不得把慢性画面画成脓细胞，不得在急性画面里凭空放纤维化。

## 六、倍档标注规则（左上角文字，36px）
按该镜头实测 px/µm 决定：<0.6 写“低倍”；0.6–1.23 写“中倍”；>1.23 写“高倍”；单细胞油镜特写写“油镜”。标注必须与实测一致，实测值写进 events.json。

## 七、与 common.md 的关系（覆盖说明）
common.md 里“不要碰 v5 / v5_s19_dev 等目录”的提示，以**本 brief 点名的工作区**为准：该工作区就是你的工作区。common.md 里“新场景写成 film/chapters/sNN.js”“不改共享文件”等照常，但 main.js 的场景表注册允许最小改动。common.md 里“原创自绘、不用网图”不适用于 CT 真实图（已获授权）与片尾字幕。


## 附：锁定文件 sha256（相对工作区根；v5 为基准）
```
a2e658fc107c4a43c689607337db996fe8da13ea7e4b730f76d9789442b771bf  engine/lib/he.js
899d24ba596208caa026512c824025a5eb648b86d6bdfd7bc4920bab143544d0  engine/lib/he_detail.js
889bacbc5c54cd57b7c6018afa33fb1df6bbcb9e8a3b744efece3539826308b9  engine/lib/wash.js
a1168fc75660bf23424cffff32533dc7289672ffe943537bc6276d6d04742ed6  engine/lib/ann.js
6c6079ad8a12ded36b5c203f9a3416d51d83c46c757a50d06768dda6bac9a0b2  engine/lib/scope.js
25ada270e774274d72d5eb0789f9f9c8e5167cd49b28e3b16b55c6bf7c59ee83  engine/lib/camera.js
4f83add26190441d4c71ed39f2ba83a950fef9933cbdaae95cabda2106542fb4  parity_r4/chapters/04.js
a2e658fc107c4a43c689607337db996fe8da13ea7e4b730f76d9789442b771bf  film/lib/he.js
899d24ba596208caa026512c824025a5eb648b86d6bdfd7bc4920bab143544d0  film/lib/he_detail.js
889bacbc5c54cd57b7c6018afa33fb1df6bbcb9e8a3b744efece3539826308b9  film/lib/wash.js
a1168fc75660bf23424cffff32533dc7289672ffe943537bc6276d6d04742ed6  film/lib/ann.js
6c6079ad8a12ded36b5c203f9a3416d51d83c46c757a50d06768dda6bac9a0b2  film/lib/scope.js
25ada270e774274d72d5eb0789f9f9c8e5167cd49b28e3b16b55c6bf7c59ee83  film/lib/camera.js
1bc748dfdbe817dceae192163dfda9c9568ad012c8d57e6ed6a4407c91b179bb  film/lib_ext/cells_ext.js
c60b7f4a9ba3cbf8bd08d8903b99e256f8de2f6120ad95d9ca32c25b274b2554  film/lib_ext/he_mucosa.js
5da021aa808f28c235c0691280a5391b14b78d0c3bc6fcbb1beeb1978f52e67f  film/chapters/s08.js
```

---


# final_music（Codex）——授权背景音乐：选曲、核验授权、混音脚本与试混

工作区 /workspace/病理科普视频/v5_final_dev（分支 final-music，已从 v6-fresh 新建，空闲）。

## (a) 唯一目标
选定一首**授权明确**的背景音乐，核验并记录来源与授权，做出可重复运行的混音脚本（旁白 + 配乐，配乐低于旁白、闪避、响度达标），并用现成旁白做一次试混验收。

## (b) 参照文件
- 已有曲库：`/workspace/病理科普视频/music/*.mp3`（Kevin MacLeod，incompetech.com，共 17 首；时长：Clean Soul 306.7 s、Wholesome 363.8 s、Healing 520.1 s、Unwritten Return 309.1 s、Inspired 286.1 s、Daily Beetle 316.9 s、Carefree 205.1 s、Dreamer 204.1 s 等）。
- 已有授权说明（仅 Clean Soul）：`/workspace/病理科普视频/music/配乐授权说明.md`。
- 旁白：`/workspace/病理科普视频/配音/全稿_v3/旁白_v3.wav`（48 kHz 单声道，327.83 s，-16 LUFS，TP -1.6 dBTP）、`timeline.json`。
- 成片总长预计 = 旁白 327.83 s + 片尾字幕 ≈14 s ≈ 342 s（脚本里做成参数 `--total`）。

## (c) 输入素材与唯一允许的操作
- 只用**有明确授权文本**的音乐：Kevin MacLeod 的 incompetech 曲目（CC BY 4.0）或 Pixabay Music（Pixabay Content License）等同等清晰的来源。**不得编造署名**，授权必须在来源页面上核验：用 curl/WebFetch 打开该曲目 incompetech 页面（https://incompetech.com/music/royalty-free/index.html?isrc=… 或曲名搜索）确认作者、授权类型、署名格式，保存页面快照（html 或文本）到 `music/license_evidence/<曲名>.html`，记录检索日期时间（Asia/Shanghai）。
- 选曲标准（按顺序）：无人声；风格平稳、明亮、不悬疑（旁白要求“不要悬疑感”）；时长 ≥345 s 或可用 acrossfade 4 s 无缝循环一次；响度范围小（用 ffmpeg ebur128 取 LRA，≤8 LU 优先）；曲库里候选至少评估 5 首，列表打分写入 `music/配乐选择.md`（曲名、incompetech 风格标签、时长、LRA、短时响度峰谷、是否选用及理由）。**你无法听音，不要写“听起来”；只写可测量或页面上写明的属性。**
- 混音只允许：裁切/循环（acrossfade）、淡入 2 s、淡出 4 s、音量与闪避（sidechaincompress）、总响度归一（loudnorm 两遍）。不改旋律、不变速变调。
- **禁止**：使用来源不明/未核验的曲目；使用 Content ID 风险曲目；改旁白音频样本；删 .mimo.env 或打印密钥。

## (d) 混音规格（逐项）
| 项 | 规格 |
|---|---|
| 输入 | 旁白 `旁白_v3.wav`（0→327.83 s），配乐已选曲 |
| 配乐位置 | 0 s 起，整片总长 `--total`（默认 342.0 s），到 `--total` 结束 |
| 淡入/淡出 | 配乐淡入 0→2.0 s；淡出 `--total`-4.0 → `--total` |
| 配乐电平 | 先把配乐单独归一到 -30 LUFS（integrated），旁白保持 -16 LUFS；旁白有声时用 sidechaincompress（threshold 0.03，ratio 8，attack 20 ms，release 400 ms）再压；旁白间隙配乐自然回升但不得超过 -26 LUFS（短时）|
| 总输出 | 立体声 48 kHz 16-bit：`music/mix/audio_final_test.wav`；两遍 loudnorm 到 I=-16 LUFS，TP≤-1.5 dBTP，LRA≤11 |
| 脚本 | `lane_briefs/../v5_final_dev/assembly/make_audio_mix.sh --voice <wav> --music <mp3> --total <秒> --out <wav>`（脚本写在本工作区 `assembly/make_audio_mix.sh`，同时在 `qa/v6/final_music/` 留一份副本）|

## (e) 数值验收（自己跑、写进 自检.md 与 metrics.json）
1. 试混输出：总时长 = `--total` ±0.02 s；integrated LUFS ∈ [-16.5,-15.5]；TP ≤ -1.5 dBTP；样本峰值 <0.98、无削波（零个样本 ≥0.979）。
2. 旁白可懂度保护：在旁白有声区间（由 timeline.json 各句 start/end 取，共 77 句），配乐短时响度（3 s 窗口）中位数比旁白低 ≥14 LU（报每句中位数的最小差值；不足 14 的句号列出）。
3. 旁白不变：把混音在旁白区间内与旁白做相关/残差估计，旁白成分电平变化 ≤1.0 dB（报）。
4. 首尾：0 s 起配乐在 2.0 s 内达到稳态（淡入曲线检查）；`--total` 最后 4 s 单调下降到 ≤ -60 dBFS（报）。
5. 授权记录完整：`music/来源与授权.md` 含 曲名、作者、官方页面 URL、授权类型与授权全文链接、原文署名格式（逐字照页面）、检索时间、证据文件路径、使用方式（裁切/循环/淡入淡出/降低音量，未改编旋律）、中英文片尾署名句；信息每一项都能在 license_evidence 里找到对应原文。
6. 可重复：同参数脚本连续运行两次，输出 WAV 的 sha256 一致（报）。

## (f) 交付物
`/workspace/病理科普视频/music/来源与授权.md`、`music/配乐选择.md`、`music/license_evidence/`、`music/mix/audio_final_test.wav`（不提交 git，太大；提交脚本与文档）、`assembly/make_audio_mix.sh`、`qa/v6/final_music/{自检.md,metrics.json,mix_loudness.json,DONE.json}`。commit 信息以 `final_music:` 开头。

## (g) 自循环
验收不过就调整电平/闪避参数再测，最多 3 轮；授权无法核验的曲目一律弃用并换下一首（再核验）。仍不过写 FAILED.json。预算 50 分钟。

## (h) 范围外
画面、字幕、片尾画面文字（另一 lane 做 credits）；最终视频封装；merge；push。
