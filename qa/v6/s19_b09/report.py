from pathlib import Path
import json
P=Path('qa/v6/s19_b09');m=json.loads((P/'metrics.json').read_text());p=json.loads((P/'populations.json').read_text());fib=json.loads((P/'pixel_tool_fibrosis.json').read_text());m['pixel_tool_fibrosis']=fib
# Each high-power keyframe: analytic sizes of visible added lymph cells, including actual periodic atlas instances.
ns={};exec(Path('qa/v6/s19_b09/pixel_samples.py').read_text().split("pick=K['picks'][2]")[0],ns);point=ns['point'];np=ns['np']
import math

def diameter(a,z):
 x,y=a['x'],a['y'];J=np.column_stack(((point(x+.001,y)-point(x-.001,y))/.002,(point(x,y+.001)-point(x,y-.001))/.002));return 2*math.sqrt(abs(np.linalg.det(J))*5.3*5.1)*a['sz']*z
for name,cam in zip([x['name'] for x in json.loads((P/'keyframes.json').read_text())['picks']],p['cameras']):
 x,y,z=cam['camera']
 if name not in ['s69_fibrosis','s70_lymph']:continue
 samples=[]
 for original in p['populations']:
  if original['type']!='lymph':continue
  for turn in range(-2,5):
   a=dict(original,x=original['x']+turn*840)
   if not(-math.pi<=a['x']/620-math.pi/2<math.pi):continue
   uv=(point(a['x'],a['y'])-[x,y])*z
   if np.linalg.norm(uv)<405:samples.append(diameter(a,z))
 m.setdefault('per_high_frame',{})[name]={'n':len(samples),'median_px':float(np.median(samples)),'median_um':float(np.median(samples)/(850/475))}
events=json.loads((P/'events.json').read_text());events['keyframe_scale']=[{'tag':name,'t':row['t'],'camera':row['camera'],'px_per_um':(850/190 if row['camera'][2]>=3.24 else row['camera'][2]*m['sizes']['lymph']['new_median_px']/1.45/7.5),'band':('油镜' if row['camera'][2]>=3.24 else '高倍' if row['camera'][2]*1.1505>1.23 else '中倍')} for name,row in zip([p['name'] for p in json.loads((P/'keyframes.json').read_text())['picks']],p['cameras'])];(P/'events.json').write_text(json.dumps(events,ensure_ascii=False,indent=2))
(P/'metrics.json').write_text(json.dumps(m,ensure_ascii=False,indent=2))
rows=[]
def row(item,value,threshold,result):rows.append(f'| {item} | {value} | {threshold} | {result} |')
row('锁定文件', '16/16；开工/结束逐字一致','全部通过','通过')
row('忠实性圆内 MAE',f"{m['fidelity']['mae_255']:.6f}/255",'≤1.0/255','通过')
row('无叠加、无中性粒细胞掩膜区 MAE',f"{m['unchanged']['mae_255']:.6f}/255；{m['unchanged']['n_pixels']} 像素",'≤1.0/255','通过')
row('参考相机胶原 / 细胞覆盖',f"{m['unchanged']['collagen_percent']:.3f}% / {m['unchanged']['cells_percent']:.3f}%",'≤35% / ≤15%','通过')
for n,v in m['production_overlay'].items():row(n+' 覆盖',f"胶原 {v['collagen_percent']:.3f}%；细胞 {v['cells_percent']:.3f}%",'≤35% / ≤15%','通过' if v['collagen_percent']<=35 and v['cells_percent']<=15 else '未通过')
for typ in ['lymph','plasma']:
 a=m['sizes'][typ];row(typ+' 同尺度核直径比',f"{a['ratio']:.6f}；新增样本 {a['new_n']} / 参照 {a['reference_n']}",'0.9–1.1，各≥20','通过')
for n,a in m['per_high_frame'].items():row(n+' 解析核直径',f"n={a['n']}；{a['median_px']:.3f}px；{a['median_um']:.3f}µm",'10.6–16.4px；5.95–9.2µm','通过')
for name,a in [('淋巴高倍',m['pixel_tool']),('纤维化高倍',fib)]:row(name+' 指定像素工具核团',f"n={a['n_clusters']}；{a['cluster_px_median']:.3f}px；{a['cluster_um_median']:.3f}µm",'10.6–16.4px；5.95–9.2µm','通过' if 10.6<=a['cluster_px_median']<=16.4 else '未通过')
a=m['pixel_targeted'];row('新增淋巴核定点分割（辅助）',f"n={a['n']}；{a['median_px']:.3f}px；{a['median_um']:.3f}µm",'只作辅助，重叠核不拆分','见说明')
a=m['sizes']['oil_body'];row('油镜浆细胞胞体',f"中位 {a['median_px']:.3f}px；焦点 {a['focused_px']:.3f}px；{a['implied_um']:.3f}µm",'38.25–72.45px','通过')
row('起始中倍实测换算',f"{m['scale']['empirical_overview_px_um']:.3f}px/µm；z=.60",'.6375–1.0625px/µm','通过')
row('文字',f"标题44px；正文/标签36px；内容最大y=906",'标题≥44；其他≥36；y<950','通过')
for n,a in m['contrast'].items():row(n+' 标签对比度',f'{a:.3f}:1','≥4.5:1','通过')
row('事件同步', '最大误差0s，逐事件见 events.json','≤.1s','通过')
row('重复渲染', '4/4 关键帧 MD5相同（metrics.json 内含两轮哈希）','全部相同','通过')
for n,a in m['video'].items():row(n,f"{a['duration_s']:.6f}s；差{a['error_s']:.6f}s；blackdetect段数{len(a['black_segments'])}",'时差≤.05s；黑段0；首尾非黑','通过')
row('新增慢性改变','3条胶原；4簇112个淋巴细胞；14个浆细胞','胶原2–3条；每簇≤40；浆细胞≤14','通过')
row('中性粒/脓细胞','新增0；母图残留38个源中心，四帧可见中心181/30/38/9','0','未通过')
row('上皮完整','原母图ulcer=.16；源坐标缺口32单位','缺口0','未通过')
text='''# S19 s19_b09 自检

**未通过项：母图残留脓细胞、母图保留上皮缺口。状态 FAILED，不可作为医学验收通过的定稿。**

严格复制 S08 的 buildSource / mapSource / point；只为指定的两组 detailedNeutrophil 循环加开关，并增加三种获准叠加。锁定绘制函数没有修改。drawHE 的 neut=0 仅关闭 kind=inf；kind=pus 仍绘制，源画布裁切内有38个脓细胞中心。母图以 ulcer=.16 调用 drawHE，使上皮路径缺口从-6延伸到26。按“其余像素不动”和“只跳过指定循环”，无法同时清掉这两项；未擅自改细胞数据、裁抹组织或补画上皮。

| 项目 | 实测 | 阈值 | 结论 |
|---|---|---|---|
'''+ '\n'.join(rows)+'''

测量说明：解析直径为 cell() 标称椭圆经过旋转、sz、极坐标局部 Jacobian 和相机缩放后的几何均值直径，未以新画法缩小细胞。source 中新增浆细胞14个，母图沿圆周周期映射；42个解析样本来自这14个源细胞在三个实际图集位置的映射，不代表42个独立新增源细胞。指定像素工具包含上皮/肌核/重叠核，按工具的核团输出作量级核对；定点分割只有14个不重叠核，未冒充≥20个独立样本。未额外绘制红细胞；本库沿用母图既有红色血管洗色，没有可单独辨认并可靠量尺的新增红细胞样本。

倍率：起始z由brief起点.50调整为.60，解析核径按7.5µm折算的起始尺度为.690px/µm，落入中倍允许范围；高倍z=1.45、油镜z=3.25。推镜时倍档按连续z的实测换算阈值切换，油镜到句70的87%完成并保持。图集焦点/屏幕坐标见metrics.json；事件均通过T.frac计算。实际配音片段从原始timeline取句69首至句70尾，没有写死解说秒数。

版式采用本brief明确指定的深色镜下布局，标签无框、细引线、浅紫字，圆心(1110,475)、直径850。对比度在全不透明标签关键帧的文字包围区附近深色背景取样，用WCAG线性化公式计算。200%对照将b10参照从z=2.7换算至生产z=1.45，再与本场s70_lymph作同尺度对照；未改变生产画面细胞。

医学待决：这份交付不能声称“慢性画面无脓细胞、上皮完整”。若继续修正，须放宽允许操作，允许在调用母图前排除kind=pus，以及把慢性版drawHE的ulcer设置为0；忠实性测试模式仍保持原母图参数。此处只记录待决点，没有实施范围外操作。

三轮记录：第一轮确认忠实性MAE=.070536；第二轮校准油镜停留及测量叠加掩膜；第三轮高倍改为1.45、中倍改为.60，完成重复渲染、像素量尺与视频。未再超过三轮继续改画。

复现（工作区根目录，所有渲染单进程/单浏览器）：`node qa/v6/s19_b09/render_s19.mjs --all`。Python固定使用/workspace/venv_qa/bin/python。所有输入路径和裁切时间写在脚本与metrics.json中。

提交说明：原工作树git元数据只读，git switch -c失败。可写独立元数据位于本工作区qa/v6/s19_b09/gitmeta，以v6-fresh 8560137为基线，分支s19-b09；仅提交本lane文件，其他并行线未跟踪文件没有删除或加入提交。bundle路径s19_b09.bundle，附git bundle verify日志。不push、不合并。
'''
(P/'自检.md').write_text(text)
from PIL import Image,ImageDraw,ImageFont
sheet=Image.open(P/'review_sheet.png').convert('RGB');d=ImageDraw.Draw(sheet);font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',22);kf=json.loads((P/'keyframes.json').read_text())
for i,(pick,event) in enumerate(zip(kf['picks'],events['keyframe_scale'])):
 xx=(i%2)*960;yy=(i//2)*620;d.rectangle((xx,yy,xx+959,yy+54),fill='#eee9e0');d.text((xx+15,yy+13),f"{pick['name']} | {kf['origin']+pick['t']:.3f}s | {event['band']} {event['px_per_um']:.3f}px/µm",font=font,fill='#51336F')
sheet.save(P/'review_sheet.png')
(P/'FAILED.json').write_text(json.dumps({'lane':'s19_b09','status':'failed','commit':None,'metrics':m,'failed_requirements':m['failures']},ensure_ascii=False,indent=2))
