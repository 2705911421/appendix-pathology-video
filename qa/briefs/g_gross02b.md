# g_gross02b：接续 g_gross02（上一轮 Grok Build 因额度用完中断）

上一轮已在工作区改了 film/lib_ext/gross_appendix.js 和 film/chapters/gross_test.js，尚未提交。先 git diff 看清已有改动，在此基础上继续，不要推倒重来。中断前它发现：系膜被抹成米色，是因为墨线路径的 fill: none 仍被当成填充，开口曲线被纸色盖住，描边时要关掉填充。其余要求和交付与下面原 brief 完全一致。


接着 gross01（film/lib_ext/gross_appendix.js，?scene=gross_test）改。引擎 engine/lib/*.js 和 parity_r4/chapters/04.js 只读，开始和结束各做一次 sha256 校验，写进 qa/gross/sha256_02.log。不要动 .mimo.env，也不要打印任何密钥。

画风标准：v4_mix/qa/style/风格规范_v1.md。纸底 #F4EFE6，墨线 #2A2A35，大体脓苔 #CDB98A，水彩参数 hd/soft/grain .12/edge .3/bleed .5。画面上不出现任何数字。

## 必须修的问题
1. 立体感：管身要有圆柱的明暗，一侧受光、一侧背光，带浆膜高光。正常阑尾要是灰粉色，表面光滑有光泽，不能扁、不能淡到看不出来。尖端改成圆钝的盲端，不要尖。
2. 系膜：做成有体积的黄色脂肪组织，血管在系膜里走行，不要画成楔形或血管示意图。
3. 化脓（黄）：在充血肿胀的管身上，用斑片状、不规则的灰黄色 #CDB98A 脓苔覆盖，去掉 keepWhite 留下的浅色笔触条。脓苔边缘要不规则，不要发白。
4. 坏疽（黑）：只在局部，用接近黑色的暗紫黑色（不是暗红褐），可以带一点穿孔样凹陷；周围仍是红、黄。出血斑和充血底要分得开。
5. 四态的轮廓、大小和摆放保持一致，方便后面在片子里做"红→黄→黑"的连续过渡。如果能做，给 gross_appendix.js 加一个 0–3 的连续 stage 参数（stage 在 0.5 之类的中间值时两态之间平滑混合），再渲染一组 0、0.5、1、1.5、2、2.5、3 的过渡条 qa/gross/过渡条.png。

## 交付
- qa/gross/ 下重渲四张单图和 gross_四态.png（覆盖旧图前先把旧图移到 qa/gross/r1/）
- 过渡条.png
- 确定性检查通过（--determinism）
- 说明.md 更新：写清改了什么、还剩哪些不足
- 在 v5_gross_dev 里 git commit（git -c user.name=mini -c user.email=mini@local）
