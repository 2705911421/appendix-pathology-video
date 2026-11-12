# v6 clin：人物库 G、S02 / S03 / S16

基于 clin-dev 工作区，只修改本 worktree。交付在 qa/v6/clin/，每场景有逐句早晚帧、200% 局部、review_sheet.png、1080p 画面版、720p 真实配音版、关键帧时码、自检及验证记录。

## 内容

- 素材库 G：原创患者及医生、正面和侧面、平静及疼痛表情、查体手势；右下腹定位、无刻度温度计、就医、无数值化验、离体阑尾容器、切片和手术概念图。
- S02 句06–10：脐周向右下腹迁移；医生查体；持续加重就医；相似症状需鉴别。无新增症状或疾病名单。
- S03 句11–13：等大典型/非典型对照，依次问诊、查体、化验。非典型未增加人群、概率或新的临床表现。
- S16 句60–62：评估紧迫性；切除后送检及病理确认；CT 并发症线索。文献仅“2023、2026”“[3][4]”，无补写作者、题名、研究结果。

## 接入与复现

场景为 film/chapters/s02.js、s03.js、s16.js；本线库 film/lib_ext/clin_draw.js。main.js 集中改三行：选择名单、句号范围、临床场景跳过无关 HE 烘焙。film/timeline.js 与全部已有 lib_ext 均未修改。

node qa/v6/clin/build.mjs s02
node qa/v6/clin/build.mjs s03
node qa/v6/clin/build.mjs s16

默认按时间轴导出；STILLS_ONLY=1 仅导出关键帧与确定性；REUSE=1 仅重新整理关键帧、局部、总览并检查已有成片。音轨读取 /workspace/病理科普视频/配音/全稿_v3/旁白_v3.wav，与 timeline.json 的 n 一致。

不将同目录旧 sentences.tsv 当新句号来源。若重配音，先按现有 generate_timeline.mjs 更新 timing_snapshot.js，再运行本线构建。独立场景无字幕，主线可保持统一双语字幕层。

## Git

本线在分支 clin-dev 上按场景逐个提交（S02、S03、S16 各一个提交，信息以 clin 开头并注明 WorkBuddy）。未 push，未合并到 v6-fresh，未改动其他 worktree。此前 Codex 因沙箱无法写 .git 而临时使用的独立元数据仓库已废弃，相关内容仅存于 qa/v6/clin/git_delivery.log 作记录，正式历史以本分支提交为准。
