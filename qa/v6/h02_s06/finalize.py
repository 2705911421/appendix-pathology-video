from pathlib import Path
import hashlib,json,subprocess
P=Path(__file__).resolve().parent;root=P.parents[2]
files=['engine/lib/'+n+'.js' for n in ['he','he_detail','wash','ann','scope','camera']]+['parity_r4/chapters/04.js']
(P/'sha256_结束.txt').write_text(''.join(hashlib.sha256((root/f).read_bytes()).hexdigest()+'  '+f+'\n' for f in files))
assert (P/'sha256_结束.txt').read_bytes()==(P/'sha256_开工.txt').read_bytes()
with (P/'sha256_校验.log').open('w') as f:subprocess.run(['sha256sum','-c',str(P/'sha256_结束.txt')],cwd=root,stdout=f,check=True)
subprocess.run(['sha256sum','-c',str(P/'gross_source.sha256')],cwd=root,check=True)
par=json.loads((P/'parity.json').read_text());v=json.loads((P/'video_check.json').read_text());safe=json.loads((P/'safe_area.json').read_text());k=json.loads((P/'keyframes.json').read_text())
det=(P/'determinism.log').read_text();assert 'deterministic:' in det
report=f'''# S06 h02 自检

## 构图与逐句对应

- 句 23：大体改为斜置特写，右侧占幅约 x=645–1745、y=60–935，明显大于 h01 的横向条状构图。只读调用原 gross r4，正常态平滑过渡到红态，轻度肿胀，浆膜表面细血管随充血显现。未进入化脓态。
- 左栏说明和两处标签均为 36px；标签保持浅紫字、1.6px 引线、无底框。“充血”指向浆膜充血部位。
- 句 24：同一壁上部位保留细线圆形定位框，阑尾平滑缩小移至圆窗左侧；两条细引线连接右侧纸底浅色边大圆窗。圆窗从该定位点平滑放大，最终半径 390px，保持到句末。
- 圆窗内只画一段壁内小血管。扩张前管腔窄、红细胞稀疏单行；扩张后管腔明显变宽、红细胞连续渐显并形成拥挤重叠，壁略薄、腔内略加深红染。双凹盘形用不规则轮廓、中央淡染区与烘焙水彩纹理表达。没有白细胞、外渗、箭头、刻度、数字或速度表达。
- 纸底 #F4EFE6、墨色 #2A2A35；新增内容位于 y<950。全段 {safe['decoded_frames']} 帧逐帧检查 y≥950 纸底，最大通道误差 {safe['y950_and_below_max_paper_channel_error']}（视频色彩转换/压缩误差）。粗剪保留原 light 字幕带。

## 时间、渲染与合成

使用 film/timeline.js 的 forScene(23,24,0) 和 T.at/frac；无硬编码旁白时间。起点 {k['origin']:.9f}，时长 {k['duration']:.9f}。六张关键帧沿用 h01 的逐句采样位置。

首次并行验证发生 screenshot / READY 超时，随后串行重试；最终检查以成功日志为准。

S06.mp4 由指定 render.mjs 输出，1920×1080、30fps、CRF16，单 worker。v12 基于 v11，仅替换句 23–24 的量化窗口 [2720,3024)，音轨 stream copy。新场景先 CRF16 编码，边界 GOP 用 CRF0 保持窗口外像素，GOP 外视频包原样复制；最终粗剪不是全片重新压制。

两版窗口外抽检 MAE 均为零，含紧邻替换窗口及 GOP 接点；边界 GOP 内窗口外每帧解码哈希相同；GOP 外全部视频包哈希相同。底部字幕带六个采样 MAE 均为零。音轨压缩数据 SHA256 以及所有音频包 PTS/DTS/时长相同。详见 video_check.json、audio_timing.json。

## 场景 parity 与 determinism

| 场景 | 关键帧数 | 结果 |
|---|---:|---|
'''
for scene,rows in par.items():
 desc='全部 MAE=0' if scene!='s11' else '仅沿用 f03 记录的三张句 43 历史差异，其余为零'
 report+=f"| {scene.upper()} | {len(rows)} | {desc} |\n"
report+='\n'+next(x for x in det.splitlines() if 'deterministic:' in x)+'\n'
report+='''

## 文件锁与范围

七个锁定文件开工/结束 SHA256 一致；gross_appendix.js 开工/结束 SHA256 一致，未修改实现或接口。代码仅修改 film/chapters/s06.js 和 film/lib_ext/vascular_response.js。没有修改两个开发目录、.mimo.env 或其他场景；没有 git commit。

## 仍不足之处

- gross r4 的圆柱光泽与系膜色块仍较规整，本次按要求保留库原文件。
- 放大窗是定位关系明确的教学示意，不代表精确比例的组织切面；红细胞纹理、色素边缘仍较细化样张规整。
- 红细胞增多以原位渐显、位置连续展开表达，没有模拟血流或表达数量关系。

复现：node qa/v6/h02_s06/render_all.mjs；node qa/v6/h02_s06/parity.mjs；python3 qa/v6/h02_s06/check_stills.py；python3 qa/v6/h02_s06/make_comparison.py；python3 qa/v6/h02_s06/build_v12.py；python3 qa/v6/h02_s06/check_video.py；python3 qa/v6/h02_s06/check_audio_timing.py；python3 qa/v6/h02_s06/check_safe.py；python3 qa/v6/h02_s06/finalize.py。
'''
(P/'自检.md').write_text(report)
outputs=[P/'S06.mp4',P/'S06_带配音_720p.mp4',P/'review_sheet.png',P/'对比_h01_h02.png',P/'自检.md',P.parent/'animatic/粗剪_v12.mp4',P.parent/'animatic/粗剪_v12_720p.mp4']+list(P.glob('s2*.png'))
(P/'outputs.sha256').write_text(''.join(hashlib.sha256(f.read_bytes()).hexdigest()+'  '+str(f.relative_to(root))+'\n' for f in sorted(outputs)))
print('All h02 checks and deliverables complete.')
