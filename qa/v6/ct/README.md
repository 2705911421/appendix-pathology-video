# ct_fix01 / r3 交付（Codex）

本轮处理 S09、S12、S15、S04。审核依据与逐条处理记录见 `r3/审核意见.md`；每场目录包含逐句关键帧、200%局部、review_sheet.png、r2/r3 before_after.png、1080p视频、带真实配音720p视频与自检.md。

本轮入口使用 `film/lib_ext/ct_r3_schematic.js`、`ct_r3_compare.js`、`ct_r3_clinical.js`、`ct_r3_doctor.js`，保留原库，不改main.js或timeline.js。医生实现复制自clin_draw.js，来源文件只读，函数一致性见 `r3/doctor_identity_check.log`。

复现：`node qa/v6/ct/deliver.mjs S09`，支持S12、S15、S04。单进程、workers=1，分镜文字以定稿/本次明确意见为准，句时序与全稿_v3/timeline.json精确对应。重新配音后先执行film/generate_timeline.mjs。真实旁白从旁白_v3.wav按首句start至末句end截取。

画面为原创Canvas教学示意，无网图、照片、姓名、学校、HU、测量尺度或新增研究数据。放射学横断位患者右侧对应图左，小框及细线将阑尾和放大窗相连；S09轻度改变、S12明显强化与渗出、S15局部不强化及腔外气体/脓肿。组织窗为形态对应，不能凭此独立确定病理分型。S04的2023、1602人见研究卡原表，8项研究按本次要求与配音原文；第18句仅突出发现病变，第19句才显示结合临床。

原worktree Git元数据只读，创建index.lock失败。按任务指定备用方式，在 `/tmp/ct-fix01-r3.git` 的ct-dev分支逐场提交，交付 `ct-dev.bundle`。bundle以前提提交 `baf3b0f`（本worktree r2 HEAD）为基础，包含四个r3场景提交，列表见 `r3/commits.log`。没有更改原分支引用，也未合并、push或写入其他并行线。

有Git写权限时可执行 `git fetch <本目录绝对路径>/ct-dev.bundle ct-dev`，再审阅FETCH_HEAD中的四个提交。最终bundle校验见 `bundle_verify.log`、`bundle.sha256`。锁定文件开工/收工校验见 `r3/sha256_start.log`、`r3/sha256_end.log`、`r3/sha256_check.log`。
