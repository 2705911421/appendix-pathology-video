# ct 线交付

本目录的 CT 与组织图全部由 Canvas 原创绘制，无外部影像、照片、姓名或学校。库总览是同一腹部断面、同一阑尾锚点的三个表现预设，不表示 CT 能直接确定病理三型。

代码：film/lib_ext/ct_schematic.js、ct_compare.js；入口仅在 film/main.js 增加场景范围与按需初始化。未修改 timeline.js、既有 lib_ext 或锁定库。时间取自真实 timeline.json 的句号边界；运行前如更换配音，应先执行 film/generate_timeline.mjs。

复现：node qa/v6/ct/deliver.mjs S09（也支持 S12、S15、S04）。render.mjs 使用浏览器原画布导出；音频从旁白_v3.wav 按 timeline 的首句 start 截取至末句 end，不使用估算秒数。

200% 图：每张关键帧分别提供 CT 与 tissue 两处局部；review_sheet.png 是关键帧总览。完整时长与流检查见各场景 media_check.json。

图像约定：放射学横断位，患者右侧对应画面左侧；三场阑尾中心均位于腹部左下部。为教学而简化腹部器官、强化与组织层次，无测量尺度、HU 或数字阈值。组织窗是对应关系示意，未伪装为真实组织切片。局部壁强化缺损与可能并发症分句显示，不暗示所有坏疽必然穿孔。
