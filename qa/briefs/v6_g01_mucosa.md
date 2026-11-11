# v6 g01（Grok Build）：S08 黏膜细化

你是负责动手的工程师，我（mini）是主管，会审查你的 diff 和出图。
项目：/workspace/病理科普视频/v5，分支 v6-fresh，工作目录 film/。这是一部 Canvas-2D 的病理科普片，当前状态是提交 0a640e2（b05）。
画风标准：这套引擎就是你在 r4 里画出"细化样张"的代码（engine/lib = 你的 r4 快照）。样张见 qa/ref/style_target/t_089.73.png，以及 /workspace/病理科普视频/v4_mix/film/qa/mini-detail/sample/。
出图命令：在 film/ 目录下执行 `node /workspace/garden-skills/skills/motion-showreel/scripts/render.mjs . --still <t> --out <绝对路径>`，确定性检查加 `--determinism`。

## 锁定（一个字节都不许改，开工和结束各记一次 sha256）
engine/lib/he.js、he_detail.js、wash.js、ann.js、scope.js、camera.js，parity_r4/chapters/04.js。
新细胞的画法放在 film/lib_ext/cells_ext.js，必须沿用 detailedNeutrophil 的视觉语言。

## 任务（另一个 CLI 两次都没做好，这次交给你）
1. 低倍（t=1）的黏膜：现在的隐窝从管腔往外一根根放射排开，像车轮辐条。上一次的尝试把它们画成了白色描边的蛋形圈，已否决，图在 qa/v6/b06_rejected/。
   要求：隐窝是管状腺，长短、粗细、间距都不均匀，略微弯曲，走向大致垂直于腔面；其中一部分被斜切或横切。腺上皮是一圈紧密排列的柱状细胞，核在基底，呈深紫色小点；腺腔窄、淡染，不要大块的白色，也不要粗描边。隐窝之间是固有层，里面密布淋巴细胞和浆细胞。整体在低倍下读起来应该是一圈"紫色细颗粒的腺体带"，参考真实 H&E 切片的观感。
2. s34（t=33）的上皮局灶缺损：要看得出一小段表面上皮缺失，两侧残留的柱状上皮边缘参差不齐；缺损表面附着少量纤维素（淡粉色的丝网）和中性粒细胞（用 detailedNeutrophil）；下方固有层充血，可以用现有水彩烘焙，参数照 04.js（hd:true, soft:true, grain:.12, edge:.3, bleed:.5）。上一次的尝试只抠出了一块白色矩形，已否决。
3. 中倍、s30、s31、s32、s33 必须和 qa/v6/b05/ 里对应的帧逐像素一致，MAE<0.5；自己做比较，把数值写进报告。
4. 输出到 qa/v6/g01/：t=1、3.8、9、15、21、27、33 秒的静帧，review_sheet.png，以及 `低倍_b05_vs_g01.png`、`s34_b05_vs_g01.png` 两张对比图，每张都附 200% 局部。再跑一次 determinism。
5. 不许改 assembly/、v4_mix/、parity_r4/，不许 git commit。最后在报告里列出改动的文件、sha256 校验结果和 MAE 数值。
