# 一根“香肠”的变质日记

`s1.1` 是六段水彩阑尾病理科普动画。画面使用 1920×1080 逻辑坐标，母带以原生 3840×2160、60 fps 渲染。

## 安装与合成

准备 Node.js 22.12 以上版本、带 `libx264` 的 FFmpeg 和 `ffprobe`，并将两个命令加入 `PATH`。母带构建需要输出盘至少 10 GiB 可用空间。构建时从锁定的 npm 依赖本地加载 Noto Sans SC、Noto Serif SC 和 LXGW WenKai，字体软件采用 SIL Open Font License 1.1。

安装依赖后，已有系统 Chrome 可以直接开始检查。需要 Playwright 的锁定版本时，运行 `npx playwright install chromium`。脚本优先使用锁定版本，也可以用 `CHROME_PATH` 指定浏览器。

```sh
npm ci
npm test
node s1.1/scripts/verify_science_invariants.mjs
npm run smoke
npm run build:master
```

`npm run smoke` 在内存中渲染第一、第三和第五段的关键帧，核对 4K 画布和双语字幕边界。Linux 可用 `npx playwright install --with-deps chromium` 配齐 Chromium 系统依赖。

`build:master` 按 3840×2160、60 fps 输出 H.264 High@5.2 和 AAC 立体声。PNG 帧在浏览器与 FFmpeg 之间走管道。每 360 帧完整关闭 Chromium 并启动下一批次。母带默认单路，在总内存超过 24 GiB、可用内存至少 8 GiB 且至少有 4 个可用逻辑核时才使用两路。可传 `--workers=1` 降低并发。

已校验的分段留在 `s1.1/out/.render-cache/master/`。中断后重跑同一命令即可续渲，同一分段按画面源码、时间轴、帧数、时长和文件校验和确认可复用。传 `--force` 可强制重渲。低清审片可用 `npm run build:master -- --profile=review15 --workers=2`，使用独立的分段缓存。终稿写入 `s1.1/out/`，自动检查规格、时长、黑帧、连续同帧、响度与元数据。片尾 `S26` 为 6.5 秒。

## DeepSeek harness 导出 1080p / 36 fps

在 harness 中打开仓库根目录，通过终端执行以下命令。使用上节的 Node.js、Chromium 和 FFmpeg 环境，输出盘至少预留 3 GiB。

```sh
npm ci
npm run smoke -- --profile=teammate_1080p36
npm run build:master -- --profile=teammate_1080p36 --workers=1
```

- 规格为原生 `1920×1080`、`36 fps` 恒定帧率、`deviceScaleFactor=1`、H.264 High@4.2、`yuv420p` 和 44.1 kHz AAC 立体声。脚本按原时间线逐帧采样。
- 纯配乐输出为 `s1.1/out/teammate_s1.1_1080p_36fps.mp4`，默认全片 `330.000` 秒、11,880 帧。放齐 25 条外部配音后，输出为 `s1.1/out/teammate_s1.1_1080p_36fps_voice.mp4`，时长和帧数随配音实测时间线计算。
- 分段缓存在 `s1.1/out/.render-cache/teammate_1080p36/`。中断后重跑同一构建命令。合成通过视频规格、黑帧、连续同帧和响度检查后才发布到输出路径。
- 视频、配音和 `.env*` 留在 Git 工作树之外的交付渠道或本地忽略路径。

纯配乐版可用下面的命令复核尺寸、编码、帧率、帧数和时长。配音版将输入路径改为带 `_voice` 的文件。

```sh
ffprobe -v error -show_entries stream=codec_name,profile,level,width,height,pix_fmt,avg_frame_rate,nb_frames,duration,sample_rate,channels:format=duration -of json s1.1/out/teammate_s1.1_1080p_36fps.mp4
```

## 外部配音

执行 `npm run export:tts` 导出 `s1.1/out/tts_cue_sheet.json`，同时创建音频目录。把外部录制的 `S01` 到 `S25` 放入 `s1.1/external_tts/`，每个编号使用一份 WAV 或 MP3。团队通过独立渠道传递音频文件。

合成时，25 份音频齐全会统一为 44.1 kHz 立体声，回填 `s1.1/out/master_timeline.json` 并生成 `s1.1/audio/voice_master.wav`。口播按音频实长排定，每条向上取整到毫秒，桥段和片尾的人声轨用静音填齐。导出的配音清单包含 1.08 的推荐语速与标点停顿参数。配乐在人声出现时压低，审片与带配音成片的两遍响度归一化目标为 −16 LUFS，纯配乐母带与纯配乐 1080p 交付版为 −24 LUFS。目录为空时，按 329.980 秒的默认时间线生成纯配乐版，并将总时长量化到输出帧网格。部分文件缺失或同一编号重复时，构建会列出问题并退出。
