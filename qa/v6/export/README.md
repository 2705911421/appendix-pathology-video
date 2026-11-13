# 最终导出

一条命令，导出 1080p 成片和去掉元数据的盲审版。脚本每次只跑一个 ffmpeg，并加上 `-threads 2`。

```bash
python3 qa/v6/export/export_final.py \
  --video /workspace/病理科普视频/v5/qa/v6/animatic/粗剪_v16.mp4 \
  --out qa/v6/export/out
```

可选 `--music 配乐.wav`：与原声按原音量混合（不额外衰减，配乐里已有的闪避保持原样），再对整片做两遍 loudnorm，目标 I = −16 LUFS、TP = −1.5 dBTP。可选 `--credits 片尾.mp4`：片尾至少 12 秒，用来替换最后 12 秒画面，原声保留。

`--out` 目录里得到 `成片_1080p.mp4`、`成片_盲审版.mp4` 和 `verify.json`。成片为 1920×1080、30 fps、H.264 High、yuv420p、CRF 18、AAC 48 kHz 192 kbps 立体声、faststart。盲审版与成片逐帧、逐采样相同，并用 `-map_metadata -1 -map_chapters -1 -fflags +bitexact -flags:v +bitexact -flags:a +bitexact` 去掉容器元数据。`verify.json` 里 `ok` 为 true 才算通过。有 exiftool 时会一并扫描；没有则用 ffprobe 和文件字节扫描。

试跑记录：`trial_plain/verify.json`（粗剪_v16，无配乐、无片尾）和 `trial_music_credits/verify.json`（另加 `fixtures/sine_10s.wav` 与 `fixtures/credits_12s.mp4`）均为通过。
