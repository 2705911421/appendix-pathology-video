# 一根“香肠”的变质日记

`s1.1` 是六段水彩阑尾病理科普动画。画面使用 1920×1080 逻辑坐标，母带以原生 3840×2160、60 fps 渲染。

## 安装与合成

准备 Node.js 22.12 以上版本、带 `libx264` 的 FFmpeg 和 `ffprobe`（加入 `PATH`），以及 Noto Sans SC、Noto Serif SC 中文字体。使用 Playwright Chromium，也可安装系统 Chrome 或通过环境变量 `CHROME_PATH` 指定浏览器。

```sh
npm ci
npx playwright install chromium
npm run smoke
npm run build:master -- --workers=2
```

`npm run smoke` 在内存中截取第一段和第三段各一帧，检查完整 4K 画幅、原生画布像素及右下象限的绘制内容。`build:master` 将六段逐帧送入 FFmpeg，默认两路并行，每 360 帧重载场景页。终稿写入 `s1.1/out/`，自动检查视频规格、时长、黑屏及画面冻结。片尾 `S26` 预留 8 秒。

## 外部配音

执行 `npm run export:tts` 导出 `s1.1/out/tts_cue_sheet.json`，同时创建音频目录。把外部录制的 `S01` 到 `S25` 放入 `s1.1/external_tts/`，每个编号使用一份 WAV 或 MP3。团队通过独立渠道传递音频文件。

合成时，25 份音频齐全会自动回填时长、生成连续人声轨和时间轴，并在人声播放时压低钢琴配乐。缺少音频时，生成按默认分镜时长合成的纯配乐版（308 秒）。
