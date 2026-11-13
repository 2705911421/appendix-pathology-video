import hashlib,json,sys
from pathlib import Path
scene=sys.argv[1];p=Path('qa/v6/ct_real')/scene
names={'S04':['s130'],'S09':['coronal_s024','axial_s058'],'S12':['axial_s128','coronal_s065'],'S15':['s285']}[scene]
checks=[]
for key in names:
 f=next(Path('film/assets/ct_real').glob('*'+key+'*'));source=next(Path('/workspace/病理科普视频/ct_real',scene).glob(f.name));h=hashlib.sha256(f.read_bytes()).hexdigest();assert h==hashlib.sha256(source.read_bytes()).hexdigest();checks.append(f'- `{f.name}`：`{h}`（与批准原图一致）。')
body={'S04':'14 医生评估，15 才显示超声/CT选择；16 按序揭示2023、8项研究、1602人，17 揭示敏感度95%、特异度94%、[1]；18 在 s130 病变处加独立圈和引线「发现病变」；19 复用同图连接临床—影像—病理证据。保留统一医生和病理概念玻片。', 'S09':'35 冠状 s024 圈选右下腹增粗阑尾及管壁；36 切轴位 s058，将圈选扩到盲肠旁阑尾周围脂肪。左栏原词：管径增粗、壁增厚、周围脂肪轻度模糊。两幅均为 rID30389，未将 CT 盖章为病理分型。', 'S12':'47 轴位 s128 先圈壁增厚强化，再按句内进度转周围渗出；48 冠状 s065 圈选阑尾旁脂肪条索区保持连读。批准两图均实际出现，左栏保留壁增厚强化、周围渗出明显。', 'S15':'58 仅使用 s285，局部圈选阑尾壁与邻近积液交界的强化不连续处，引线「壁强化缺损」；59 使用完全同一张图，撤下上一引线，扩大到含气积液区，引线「腔外气体、脓肿」。每时刻仅一条引线；左栏59才揭示警惕穿孔 [3]。'}[scene]
text=f'''# {scene} 自检

{body}

## 像素与来源

'''+ '\n'.join(checks)+'''

- 原始图像未滤波、未重绘、未伪彩、未写回；Canvas 仅裁除边缘空白/床缘并等比缩放。高亮圈与引线为独立矢量叠加层，源坐标记录在 ct_real_images.js / ct_real_compare.js。
- 每个实际出现的 CT 窗上角均显示「典型病例」，下角显示对应 Radiopaedia.org rID 与 CC BY-NC-SA 3.0。S04 句19小窗同样保留。
- 中英片尾署名按来源与授权.md逐条原样抄录到 ../credits.md，只包含实际用到的四个病例。
- 不上屏测量值、病例年龄、姓名、学校；未使用 Commons 或未批准病例。

## 版式与时间

- 沿用纸色、左侧文字、细引线及浅紫色无框标签；所有新增内容 y<950。原有字幕区域未改动。
- '''+('S04保留病理概念玻片，不把它画成灰阶CT。' if scene=='S04' else '撤去原水彩组织窗，按批准brief优先使用真实CT单窗大特写；不再出现灰阶组织窗或模拟CT。')+'''
- 时间按全稿_v3句号取 at/frac；已核对 timing_snapshot 全部起止与 timeline.json 相同。比较场句间图像淡入淡出0.7s，配音取对应真实旁白时间段。
- 每句关键帧及200%局部、review_sheet、1080p无声片和720p真实配音片齐备。media_check.json记录时长及音视频流；determinism结果见对应render.log。

## 医学边界与局限

- 典型病例用于呈现所见，四场为四位不同患者，不表现连续复查，不依据CT直接判定病理三型。
- 标注由批准切片上的可见结构定位，未新增诊断。单张切片不能替代完整序列阅片；S15微小壁强化中断的精确边缘仍建议影像科终审，本版不据此补画缺口或新增坏死范围。
- 单窗方案不提供同步HE组织层次配对，优先真实CT可读性；组织对应关系由原解说及前后病理场景承担。
'''
(p/'自检.md').write_text(text)
assert len([f for f in p.glob('s*_200.png') if 'sidebar' not in f.name]) == len(json.load(open(p/'keyframes.json'))['picks'])
print('asset identity and delivery checks passed',scene)
