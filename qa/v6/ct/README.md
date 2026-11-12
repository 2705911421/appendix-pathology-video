# ct 线交付

本目录的 CT 与组织图全部由 Canvas 原创绘制，无外部影像、照片、姓名或学校。库总览是同一腹部断面、同一阑尾锚点的三个表现预设，不表示 CT 能直接确定病理三型。

代码：film/lib_ext/ct_schematic.js、ct_compare.js；入口仅在 film/main.js 增加场景范围与按需初始化。未修改 timeline.js、既有 lib_ext 或锁定库。时间取自真实 timeline.json 的句号边界；运行前如更换配音，应先执行 film/generate_timeline.mjs。

复现：node qa/v6/ct/deliver.mjs S09（也支持 S12、S15、S04）。render.mjs 使用浏览器原画布导出；音频从旁白_v3.wav 按 timeline 的首句 start 截取至末句 end，不使用估算秒数。

200% 图：每张关键帧分别提供 CT 与 tissue 两处局部；review_sheet.png 是关键帧总览。完整时长与流检查见各场景 media_check.json。

图像约定：放射学横断位，患者右侧对应画面左侧；三场阑尾中心均位于腹部左下部。为教学而简化腹部器官、强化与组织层次，无测量尺度、HU 或数字阈值。组织窗是对应关系示意，未伪装为真实组织切片。局部壁强化缺损与可能并发症分句显示，不暗示所有坏疽必然穿孔。

## Git交付限制与导入

原worktree的 `.git` 指向 `/workspace/病理科普视频/v5/.git/worktrees/v5_ct_dev`，本环境对该位置只读，标准git add/commit报错 `Unable to create .../index.lock: Read-only file system`。未更改该位置、原分支引用或其他并行线目录。

因此逐场提交保存在 `/tmp/ct-dev-delivery.git` 的ct-dev分支，并导出到本目录 `ct-dev.bundle`。bundle以原HEAD `586ce3e3c90d1a45f294e1a7fa3a33ce7c8c1d75` 为前提，包含本线四个提交（按S09→S12→S15→S04）。完整提交列表见 `commits.log`。

在具有Git写权限的原仓库中，可以先执行 `git fetch <本目录绝对路径>/ct-dev.bundle ct-dev`，再按需要审阅或逐个cherry-pick这四个提交。本线未执行push、merge或向主线写入。
