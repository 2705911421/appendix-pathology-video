# 全片 QA

- 视频：`/workspace/病理科普视频/v5/qa/v6/final_assemble/picture_voice_cfr.mp4`
- 时长：338.833 s，1920×1080，30.000 fps
- 总结：通过

## 字幕同步

- 阈值：|Δstart| 与 |Δend| ≤ 0.05 s，且条数相同、首行文本为同一句
- 字幕条数 77，timeline 句数 77
- max |Δstart| = 0.0004999999996471161
- max |Δend| = 0.0004999999996471161
- 文本不一致 0，失败条数 0
- 结果：通过

## 音频起声

- 阈值：|onset − timeline start| ≤ 0.10 s
- 采用方法：energy
- 能量法 max |Δ| = 0.006250000000051159，失败 0
- silencedetect 法 max |Δ| = 0.006000333333311403，失败 0
- 结果：通过

## 黑帧

- blackdetect d=0.1 pic_th=0.98，段数 0
- 结果：通过

## 响度与削波

- ebur128 integrated -14.0 LUFS，LRA 2.2 LU，TP -2.0 dBTP
- astats 峰值 -2.04837 dB
- 削波样本 0
- silencedetect 静音段 241（-35 dB，d=0.1 s）

## 联系表与切点

- 联系表每 10 s 一帧，共 34 帧，8 列
- 场景切点 18 个（片内 18），coverage `/workspace/病理科普视频/v5/qa/v6/a02/coverage.json`
