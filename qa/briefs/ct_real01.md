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


# ct_real01（Gisele 已批准：用公开授权真实 CT 替换四场代码绘制的 CT）

分支 ct-dev，工作区 `/workspace/病理科普视频/v5_ct_dev`，本线名 ct。Gisele 已确认 CT 图不再由 AI/代码绘制，并批准了下列真实病例图。本 brief **覆盖**上方通用规则里的「原创自绘，不用网图/照片」——但仅限这四场的 CT 窗；其余画面仍须自绘、不得编造数字、不出现姓名学校。

**不要做** `ct_adv01`。不要碰其他 worktree、不要 push、不要合并到 v6-fresh。不要读取、打印或改写 `/workspace/病理科普视频/配音/.mimo.env` 或任何密钥。

## 已批准的图像（必须用这些，不要另选 Commons / 未批准病例）

全部原图在 `/workspace/病理科普视频/ct_real/`。先把批准文件复制进本 worktree，例如 `film/assets/ct_real/`（保留原文件名与字节；复制后对一下 sha256）。出处与署名见 `/workspace/病理科普视频/ct_real/来源与授权.md`。

| 场景 | 句号 | 批准文件 | 作用 |
|---|---|---|---|
| S04 | 14–19（CT 大窗出现于 16–18，句 19 证据图里的 CT 小窗也可复用） | `ct_real/S04/S04_primary_rID197373_axial_s130_appendix-thick-wall_img67748644.jpeg` | 主图：40 岁男性，增强门脉期，管径增粗、壁增厚 |
| S04 | 同上，可选辅图 | `ct_real/S04/S04_primary_rID197373_axial_s135_appendicoliths_img67748649.jpeg` | 辅图：同病例腔内小结石（不要把“粪石/尺寸”写成新结论） |
| S09 | 35–36 | `ct_real/S09/S09_primary_rID30389_coronal_s024_key-coronal-mild-stranding_img7922572.jpg` | 主图：官方冠状位，mild stranding |
| S09 | 35–36 | `ct_real/S09/S09_primary_rID30389_axial_s058_appendix-near-cecum_img7922410.jpg` 或 `..._s060_...img7922413.jpg`（s059 也可） | 轴位对照，盲肠旁增粗阑尾 |
| S12 | 47–48 | `ct_real/S12/S12_primary_rID197370_axial_s128_dilated-appendix-extensive-stranding_img67747991.jpeg` | 主图：扩张积液阑尾、广泛脂肪条索 |
| S12 | 47–48 | `ct_real/S12/S12_primary_rID197370_coronal_s065_coronal-extensive-fat-stranding_img67748143.jpeg` | 冠状位，周围渗出更清楚 |
| S15 | 58–59 | `ct_real/S15/S15_primary_rID242634_axial_s285_wall-enhancement-defect-and-gas-abscess_img75885695.jpg` | **同一张图**先点壁强化中断（58），再点腔外气体/脓肿（59） |

不要使用 Commons 备选（有的带 17.1 mm 测量尺、英文标签或红圈），也不要用 rID 198519 / 198206，除非批准图缺失（它们没有缺失）。

## 像素红线（必须遵守）

- **禁止**重绘、涂改、AI 生成、滤波“美化”、伪彩色、或改动解剖像素。
- **允许**：裁去 CT 床缘和大块黑边、等比缩放、平移/轻微 Ken Burns、灰阶显示（保持原灰阶关系）、以及叠加上层（箭头、圆圈、细引线、中文短标签、按句高亮）。叠加必须画在独立层，不得写回原图文件。
- 病例描述里的 10 mm、12 mm、6×3 cm、17.1 mm 等 **一律不上屏**（分镜禁止测量值）。
- 四场是四位不同患者。必须让观众明白这不是同一根阑尾的连续复查：每场 CT 窗附近用「典型病例」作屏上/字幕提示（这四字可以上屏；不要写“同一患者”或编造病程时间）。

## 实现要求

现有实现：`film/chapters/s04.js`；S09/S12/S15 经 `film/lib_ext/ct_r3_compare.js` 的 `compareScene(35–36,1) / (47–48,2) / (58–59,3)`，CT 来自 `drawCTStatic` / `drawCTChanges`（`ct_r3_schematic.js`）。渲染入口 `film/main.js`（`scene=` 查询，时间用 `forScene` 对齐 全稿_v3 `timeline.json`）。交付脚本参考 `qa/v6/ct/deliver.mjs`，但**本轮输出目录改为 `qa/v6/ct_real/`**，不要覆盖 `qa/v6/ct/` 里已有的自绘稿。

1. 从这四场撤掉代码绘制的 CT 示意渲染；场景里不要再调用 `drawCTStatic` / `drawCTChanges` 来充当 CT 主图。
2. 组织窗：不得再画一个灰阶、看起来像 CT 的水彩窗。若保留水彩 HE 组织对照，必须明确是组织/镜下对照，且不能挤占真实 CT；真实 CT 看不清时，按分镜改成单窗大特写（优先保证真实 CT 可读）。
3. 非 CT 部分保持现有实现：S04 与 clin 统一的医生、超声/CT 选择、研究卡（2023、8项研究、1602人、敏感度95%、特异度94%、[1]，用词与时序对照分镜和配音 14–19；配音说「8项研究」不要写「8篇」）、句 19 临床–影像–病理证据关系；S09/S12/S15 左侧文字栏用分镜原句（管径增粗、壁增厚、周围脂肪轻度模糊；壁增厚强化、周围渗出明显；壁强化缺损：警惕坏死；腔外气体、脓肿：警惕穿孔 [3]）。标签规范不变：细引线 + 浅紫字、无框。内容 y<950。纸色/左栏/字幕沿用现稿，不要另起一套风格。
4. 时间全部按句号对齐 `配音/全稿_v3/timeline.json`，不要写死秒数。句间过渡约 0.7s。
5. 按句高亮（位置要落在真实解剖上，不要凭空指）：
   - S04 句 18：在 s130 上标出病变阑尾（「发现病变」）；句 16–17 研究卡逐项揭示。
   - S09 句 35：框选增粗管径/增厚管壁；句 36：扩到周围轻度模糊的脂肪。
   - S12 句 47：先壁增厚强化，再周围渗出；句 48：保持连读并框选对应区域。轴位 s128 与冠状 s065 都要用上（可轴冠并列或按句切换，但两张批准图都要出现）。
   - S15 **同一张** s285：句 58 只点亮局部壁强化中断；句 59 再标腔外气体、脓肿。每次一条对应引线。
6. 每张在用的真实 CT 图，窗角加小号署名，例如：`Radiopaedia.org rID 197373 · CC BY-NC-SA 3.0`（S09 为 rID 30389，S12 为 rID 197370，S15 为 rID 242634）。不要挡解剖，不要把作者姓名写成病人信息。
7. 把批准图对应的片尾署名（中英）写入 `qa/v6/ct_real/credits.md`，从 `ct_real/来源与授权.md` 原样抄录已用病例的现成署名句，供总装片尾使用，不要自撰作者或 rID。建议总块只列入实际用到的四个 rID：197373、30389、197370、242634。

## 交付

目录 `qa/v6/ct_real/`：

- `credits.md`
- 每场 `qa/v6/ct_real/SNN/`：每句 1–2 张关键帧 + 200% 局部、`review_sheet.png`、`SNN.mp4`、`SNN_带配音_720p.mp4`（配 全稿_v3 对应句真实配音）、`自检.md`（对照分镜、像素红线、署名、「典型病例」提示、句 58/59 高亮时序）。
- 可复用/改写 `qa/v6/ct/deliver.mjs`、`review.py`、`check.py`，但输出必须落到 `qa/v6/ct_real/`。单渲染进程、单浏览器实例；`--workers 1`。机器内存有限，不要并行多路渲染。

锁定文件开工/收工做 sha256，写入本轮日志：`engine/lib/{he,he_detail,wash,ann,scope,camera}.js`、`parity_r4/chapters/04.js`。

每场自检通过后 `git -c user.name=mini -c user.email=mini@local commit`，信息以 `ct real01:` 开头。git 元数据写不进去则把提交打成 `qa/v6/ct_real/ct-dev.bundle` 并在日志说明。不要 push、不要合并。

结束时用简短中文说明：四场各用了哪张图、组织窗如何处理、署名和「典型病例」加在何处。
