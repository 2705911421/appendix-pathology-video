# 全片 QA

- 视频：`/workspace/病理科普视频/v5/qa/v6/animatic/粗剪_v16.mp4`
- 时长：339.833 s，1920×1080，30.000 fps
- 总结：未通过

## 字幕同步

- 阈值：|Δstart| 与 |Δend| ≤ 0.05 s，且条数相同、首行文本为同一句
- 字幕条数 32，timeline 句数 77
- max |Δstart| = 99.7555833333333
- max |Δend| = 104.36391666666663
- 文本不一致 32，失败条数 77
- 结果：未通过

失败样例（最多 12 条）：

- 句 1: Δstart=0.000 Δend=-0.321 text_match=False srt=`午饭后，你的肚脐周围开始隐隐作痛。` timeline=`这根形似小香肠的盲管，就是阑尾。`
- 句 2: Δstart=-0.271 Δend=0.549 text_match=False srt=`起初你以为只是吃坏了肚子，忍忍就过去了。` timeline=`发起炎来，它可能染上红、黄、黑。`
- 句 3: Δstart=0.599 Δend=7.472 text_match=False srt=`可到了半夜，这股疼突然“搬了家”——死死钉在右下腹，连咳嗽、按压都像针扎，体温也飙了上去。` timeline=`每一次颜色流转，都记录着组织的伤痕。`
- 句 4: Δstart=7.522 Δend=7.549 text_match=False srt=`急诊室里，医生敲定诊断：急性阑尾炎。` timeline=`循着这抹色彩，我们走进炎症的现场。`
- 句 5: Δstart=7.899 Δend=9.033 text_match=False srt=`切下来的这根阑尾，早已不是平时粉白细长的模样。` timeline=`病理学里的“变质”，不是食物变坏。`
- 句 6: Δstart=8.633 Δend=15.587 text_match=False srt=`它肿得像根暗红色的香肠，表面糊着一层灰黄色的脓苔，切开管腔，里面更是积满了浑浊的脓液。` timeline=`先听听身体发出的求救信号。`
- 句 7: Δstart=15.737 Δend=16.351 text_match=False srt=`这短短几小时里，你的右下腹究竟经历了什么？` timeline=`疼痛可能从肚脐周围，移向右下腹。`
- 句 8: Δstart=16.701 Δend=16.920 text_match=False srt=`把切片推到显微镜下，“案发现场”才真正显露：` timeline=`还可能恶心、发热，右下腹明显压痛。`
- 句 9: Δstart=16.970 Δend=25.758 text_match=False srt=`阑尾黏膜已经破溃缺损，成千上万的中性粒细胞像急行军一样，弥漫浸润了整层阑尾壁，连最外层的浆膜都在往外渗出纤维素。` timeline=`疼痛若持续加重，别抱着侥幸硬扛。`
- 句 10: Δstart=25.708 Δend=29.586 text_match=False srt=`病理医生会写下一行精准的判决：急性蜂窝织炎性阑尾炎——也就是典型的化脓性炎。` timeline=`相似的求救声，也可能来自其他腹部疾病。`
- 句 11: Δstart=29.936 Δend=31.463 text_match=False srt=`其实，在这根盲管里，战火是一步步升级的：` timeline=`有些人的信号，却并不典型。`
- 句 12: Δstart=31.413 Δend=34.413 text_match=False srt=`如果战火只局限在黏膜及黏膜下层，还只是温和的单纯性阑尾炎；` timeline=`医生先循着症状和体格检查寻找线索，`

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
- astats 峰值 -2.036914 dB
- 削波样本 0
- silencedetect 静音段 241（-35 dB，d=0.1 s）

## 联系表与切点

- 联系表每 10 s 一帧，共 34 帧，8 列
- 场景切点 18 个（片内 18），coverage `/workspace/病理科普视频/v5_open_dev/qa/v6/a02/coverage.json`
