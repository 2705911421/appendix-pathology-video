from pathlib import Path
import json,hashlib
P=Path('qa/v6/a02');A=P.parent/'animatic';mae=json.loads((P/'mae.json').read_text());v=json.loads((A/'verification_v16.json').read_text());c=json.loads((P/'coverage.json').read_text());t=json.load(open('/workspace/病理科普视频/配音/全稿_v3/timeline.json'));rows={r['n']:r for r in t['lines']}
assert all(x['max_MAE']<.5 for x in mae)
assert (P/'sha256_start.txt').read_bytes()==(P/'sha256_end.txt').read_bytes()
s=['# 粗剪 v16 并线验收（Codex）','',f"全稿内容 {t['duration']:.6f} 秒；保留原 12 秒片尾。1080p / 720p 实测总时长均为 {v['1080p']['probe']['format']['duration']} 秒，30 fps。",'', '## 覆盖区间','', '|场景|句号|真实口播起止（秒）|可见覆盖帧区间（30fps，左闭右开）|合成说明|','|---|---|---|---|---|']
for scene,(a,b) in c['ranges'].items():
 note='使用既有 v15 已完成镜下段' if scene in ['s08','s10','s11','s14'] else '最新验收成片替换；末帧覆盖至下一句起点'
 if scene=='s19':note='最新 S19；开镜从句69起点前0.45秒开始，保留0.7秒切出'
 start=rows[a]['start'];end=rows[b+1]['start'] if b<77 else t['duration']
 if scene=='s19':start-=.45;end=max(end,rows[b]['end']+.7)
 import math
 s.append(f'|{scene.upper()}|{a:02}–{b:02}|{rows[a]["start"]:.6f}–{rows[b]["end"]:.6f}|[{math.ceil(start*30)}, {math.ceil(end*30)})|{note}|')
s+=['','仍为占位：S01 句01–05、S05 句20–22、S17 句63–65、S18 句66–68、S20 句71–74、S21 句75–77。S19 出镜动画短暂覆盖句71开始前后的静默及首段画面，未新增 S20 场景。','','S07 按 v15 约定覆盖句25–30；S08 保持原句29时钟但从句31开始可见。S10/S11 共用句37原点，句42→43保持已有连续镜下画面。这里只修合成，不改场景画法、文字或医学内容。','','## 逐像素验收','','使用各线 keyframes.json 的原始选帧时刻（标准 renderer 选帧保留6位小数，h06直接精度与原脚本相同）；1920×1080 RGB 像素 MAE。CT/mech/clin 直接读取指定工作树的定稿 PNG，其余读取当前工作树最新定稿 PNG。','','|场景|帧数|最大 MAE|结果|','|---|---:|---:|---|']
for m in mae:s.append(f'|{m["scene"].upper()}|{len(m["frames"])}|{m["max_MAE"]:.9f}|通过|')
s+=['','明细与参考路径：`../a02/mae.json`。本轮全部通过，无需修改 main.js、timeline.js、场景或共享库。MAE 指未编码关键帧，不将 H.264 的有损编码误差混入场景并线判据。','','## 合成和验证','','- 顺序处理单个场景补片，ffmpeg threads=1、filter_complex_threads=1；验收采用单浏览器逐页渲染，无并发渲染。脚本：`../a02/parity.mjs`、`build_v16.py`、`verify_v16.py`。','- 沿用 h06_adv/v15 的全稿_v3真实配音、真实字幕时间轴和片尾；仅覆盖 y<950（720p 对应 y<634）。两版音频 AAC 数据 SHA256 与 v15 完全一致，见 verification_v16.json。字幕没有重算时刻；视频重编码会产生细微像素色差。','- 按30fps对真实时间向上取整分配区间。segments.json 的所有区间首尾严格相接，总帧数与成片一致；两版完整顺序解码成功。补片不足部分保持末帧，不插入空帧。所有接点前后帧均抽查；S19开镜首帧/闭镜末帧为源成片自带的深色闭合状态，已与源片逐像素比对（iris_boundary_verification.json），不算意外空帧。其余接点均非空白，阈值及结果见 ../a02/boundary_metrics.json；抽帧位于 ../a02/boundaries/。','- contact_sheet_v16.png 每15秒一帧，包含片尾；原始抽帧位于 ../a02/contact/。','- S19.mp4 自带提前0.45秒开镜包装，使用相应的成片原点，避免直接用句69起点导致画面迟到。其他镜下场景保留已有 v15 过渡。','','## 锁定文件','','开工与收工七文件 SHA256 完全一致；未修改锁定文件。','','```text',(P/'sha256_end.txt').read_text().strip(),'```','','## 范围与局限','','本次是并线与技术验收，没有修改或重新审核各场原创病理画法。字幕带与片尾继承 v15；占位段仍待后续制作。接点图与 contact sheet 供人工复核，未宣称全片逐秒人工听审。']
(A/'自检_v16.md').write_text('\n'.join(s)+'\n')
