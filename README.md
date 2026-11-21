# 一根“香肠”的变质日记

**阑尾的粉→红→黄→黑 · 急性阑尾炎的色彩密码与炎症保卫战**

这是《2026 病理学科普大赛》阑尾炎视频的 V2 验收版源码。运行构建后，`out/submission.mp4` 为 5 分钟、1920×1080、30 fps 的 H.264／AAC 成片，内嵌中英双语字幕。工程使用 Rough.js／p5.brush 绘制水彩医学插画，再逐帧编码。CT 为原创横断面教学示意。

## 七幕时间表

| 开始 | 画面与配音重点 |
| --- | --- |
| 00:00 | 粉白、暗红、灰黄、焦黑渐变，主标题与正常横断面 |
| 00:25 | 午饭、脐周痛、右下腹麦氏点、急诊化验与暗红标本 |
| 01:14 | 浆膜水彩伪膜、管腔积脓，从大体推入 H&E 切片，展示流动红细胞、游出及纤维素性脓性渗出物 |
| 02:14 | 三型对照。单纯性由浅至深观察浸润，坏疽展示侧壁穿孔和系膜静脉血栓 |
| 03:16 | 病历问诊。03:24 起总览三型 MSCT，03:27 起随口播依次聚焦，随后展示两项诊断敏感度依据 |
| 04:06 | 慢性转化与纤维化增生，区分缓解期择期切除和急性发作时的评估 |
| 04:40 | 康复患者半身挥手，四色依次亮起，随旁白揭示就医信号 |
| 04:53–05:00 | 全屏居中、无正文侧栏的静音创作说明 |

[`film/script.psv`](film/script.psv) 保存 63 句旁白、字幕与镜头关联。Edge TTS 音频逐句解码，去除低于阈值的边缘填充，并保留语音保护余量。变速后的完整片段按视频帧取整，每句独立添加 21 帧（0.7 秒）缓冲。时间轴分配给旁白片段 248.90 秒，另有 44.10 秒句间缓冲和 7.00 秒终幕。普通话中的 CT 以 C T 分开合成，中英文字幕均保留 CT。配乐以原创程序化音符、包络和节拍合成。

## 重建

在本目录使用 PowerShell。需要 Node、uv、Google Chrome 和 PATH 中的 `ffmpeg`／`ffprobe`。已有逐句音频缓存时，重建音频可离线运行。Chrome 路径也可由 `CHROME_PATH` 指定。

```powershell
npm ci
uv venv --python 3.12 .venv
uv pip install --python .venv/Scripts/python.exe -r requirements.txt
& '.venv/Scripts/python.exe' 'tools/audio.py'
npm run samples
npm run render
npm run check
```

可设 `RENDER_WORKERS=1`～`5` 控制渲染进程数量。中断后可重跑 `npm run render`。源文件和时间轴签名一致且帧数正确的章节会复用。`qa/audio.json` 保存逐句样本边界，`qa/canvas.json` 保存字幕实际字形范围、标注字号与任意顺序寻帧检查，`qa/final.json` 保存成片复验结果。

## 参赛文案的医学口径

- **97%** 是 2024 年 IDSA 指南中 28 项成人疑似阑尾炎初始 CT 观察研究的敏感度中位数，范围为 83%–100%。2026 年单中心 195 例成人术前队列中，128 层增强 CT 的敏感度为 **98.7%**。三型 MSCT 征象有重叠，精确分型还需结合病理。 [IDSA 初始影像指南](https://pubmed.ncbi.nlm.nih.gov/38963819/) · [128 层增强 CT 队列](https://advradiology.org/articles/correlation-of-ct-findings-with-pathology-and-interobserver-agreement-in-patients-undergoing-appendectomy-for-suspected-acute-appendicitis-a-single-center-retrospective-study/AdvRadiolImaging.galenos.2026.58077) · [2025 年分型研究](https://pubmed.ncbi.nlm.nih.gov/39294319/)
- 外科评估有手术指征且病情允许时，蜂窝织炎性、坏疽性阑尾炎需尽早手术切除。并发局限脓肿时另行评估抗感染、引流及手术时机。 [WSES 耶路撒冷指南 2025 版，JAMA Surg 2026](https://pubmed.ncbi.nlm.nih.gov/41604201/)
- 单纯性切片的浅层细胞集中、深部零星细胞由观察引出。急性期主要表现变质与渗出，持续或反复炎症转为慢性时，纤维性增生往往更突出。慢性段两句按反馈恢复缓解期择期切除和急性发作视情况急诊手术的表述。 [阑尾病理综述](https://pubmed.ncbi.nlm.nih.gov/38217538/)
- 求医提示强调及时评估，保留由医师判断镇痛和治疗的空间。 [急性阑尾炎镇痛随机对照研究](https://pubmed.ncbi.nlm.nih.gov/20137360/)

片尾题录来自 [references.js](film/references.js)，含作者、出版信息、研究数据及可检索的 PMID 或出版社链接。多层增强 CT 敏感度单列为 `msctSensitivity`，与 `msct` 分型研究分别维护。片尾按实际工序披露制作工具。医学内容的人工签核由参赛方完成。
