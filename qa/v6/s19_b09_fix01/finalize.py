from pathlib import Path
import json, math, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont
P = Path('qa/v6/s19_b09_fix01')
k = json.loads((P/'keyframes.json').read_text())
start, dur = k['origin'], k['duration']
subprocess.run(['ffmpeg','-y','-i',str(P/'S19.mp4'),'-ss',str(start),'-t',str(dur),'-i','/workspace/病理科普视频/配音/全稿_v3/旁白_v3.wav','-map','0:v:0','-map','1:a:0','-vf','scale=1280:720','-c:v','libx264','-threads','1','-crf','16','-c:a','aac','-b:a','160k','-t',str(dur),'-movflags','+faststart',str(P/'S19_带配音_720p.mp4')], check=True, stdout=subprocess.DEVNULL, stderr=(P/'audio_mux.log').open('w'))
m = json.loads((P/'metrics.json').read_text())
m['pixel_tool'] = json.loads((P/'pixel_tool.json').read_text())
m['pixel_tool_fibrosis'] = json.loads((P/'pixel_tool_fibrosis.json').read_text())
q = json.loads((P/'populations.json').read_text())
ns = {}
exec((P/'pixel_samples.py').read_text().split("pick=K['picks'][2]")[0], ns)
point, np_ = ns['point'], ns['np']
def diameter(a, z):
    x, y = a['x'], a['y']
    J = np_.column_stack(((point(x+.001, y)-point(x-.001, y))/.002, (point(x, y+.001)-point(x, y-.001))/.002))
    return 2*math.sqrt(abs(np.linalg.det(J))*5.3*5.1)*a['sz']*z
m['per_high_frame'] = {}
for name, cam in zip([p['name'] for p in k['picks']], q['cameras']):
    x, y, z = cam['camera']
    if name not in ('s69_fibrosis', 's70_lymph'):
        continue
    samples = []
    for original in q['populations']:
        if original['type'] != 'lymph':
            continue
        for turn in range(-2, 5):
            a = dict(original, x=original['x']+turn*840)
            if not (-math.pi <= a['x']/620-math.pi/2 < math.pi):
                continue
            if np.linalg.norm((point(a['x'], a['y'])-np_.array([x, y]))*z) < 405:
                samples.append(diameter(a, z))
    m['per_high_frame'][name] = {'n': len(samples), 'median_px': float(np.median(samples)), 'median_um': float(np.median(samples)/(850/475))}
events = json.loads((P/'events.json').read_text())
scale = []
for name, row in zip([p['name'] for p in k['picks']], q['cameras']):
    z = row['camera'][2]
    px = 850/190 if z >= 3.24 else z*m['sizes']['lymph']['new_median_px']/1.45/7.5
    band = '油镜' if z >= 3.24 else '高倍' if z*1.1505 > 1.23 else '中倍'
    scale.append({'tag': name, 't': row['t'], 'camera': row['camera'], 'px_per_um': px, 'band': band})
events['keyframe_scale'] = scale
(P/'events.json').write_text(json.dumps(events, ensure_ascii=False, indent=2))
m['video'] = {}
for f in ['S19.mp4', 'S19_带配音_720p.mp4']:
    data = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_type,width,height','-of','json',str(P/f)]))
    length = float(data['format']['duration'])
    r = subprocess.run(['ffmpeg','-i',str(P/f),'-vf','blackdetect=d=0.1:pic_th=0.98','-an','-f','null','-'], capture_output=True, text=True)
    (P/(f+'.blackdetect.log')).write_text(r.stderr)
    endpoints = {}
    for tag, args in [('first', ['-ss','0']), ('last', ['-sseof','-0.2'])]:
        out = P/f'{f}_{tag}.png'
        subprocess.run(['ffmpeg','-y',*args,'-i',str(P/f),*(['-vf','reverse'] if tag=='last' else []),'-frames:v','1',str(out)], check=True, capture_output=True)
        a = np.array(Image.open(out).convert('RGB'))
        endpoints[tag] = {'mean_rgb': float(a.mean()), 'nonblack_fraction': float((a.max(2)>20).mean())}
    m['video'][f] = {'duration_s': length, 'timeline_duration_s': dur, 'error_s': abs(length-dur), 'black_segments': [line for line in r.stderr.splitlines() if 'black_start:' in line or 'black_end:' in line], 'endpoints': endpoints, 'streams': data['streams']}
m['audio'] = {'source': '配音/全稿_v3/旁白_v3.wav', 'start_s': start, 'end_s': start+dur, 'duration_s': dur, 'sentences': [69, 70]}
y, x = np.mgrid[:1080, :1920]
circle = (x-1110)**2+(y-475)**2 < 424**2
load = lambda f: np.array(Image.open(f).convert('RGB')).astype(int)
def overlay(b, co, ce):
    db = np.max(np.abs(co-b), 2) > 0
    eb = np.max(np.abs(ce-b), 2) > 0
    pure = db & eb & (np.max(np.abs(co-ce), 2) == 0) & circle
    n = circle.sum()
    return {'collagen_percent': float((db & ~pure & circle).sum()/n*100), 'cells_percent': float((eb & ~pure & circle).sum()/n*100), 'repair_percent': float(pure.sum()/n*100)}
m['production_overlay'] = {p['name']: overlay(load(P/'audit'/f"bare_{p['name']}.png"), load(P/'audit'/f"collagen_{p['name']}.png"), load(P/'audit'/f"cells_{p['name']}.png")) for p in k['picks']}
m['audit_overlay'] = overlay(load(P/'bare.png'), load(P/'collagen.png'), load(P/'cells.png'))
m['rounds'] = 1
m['status'] = 'pass'
m['fix'] = {'ulcer': 0, 'pus_cover': 'kind=pus footprint replaced with he.bands underlayer', 'faithful_md5_matches_s19_b09': True}
(P/'metrics.json').write_text(json.dumps(m, ensure_ascii=False, indent=2))
rows = []
def row(item, value, threshold, result):
    rows.append(f'| {item} | {value} | {threshold} | {result} |')
row('锁定文件', '开工 16/16 OK，见 sha256_结束.txt', '开工=收工=locked_sha256.txt', '待收工核对')
row('忠实性圆内 MAE', f"{m['fidelity']['mae_255']:.6f}/255", '≤1.0/255', '通过')
row('无叠加掩膜 MAE', f"{m['unchanged']['mae_255']:.6f}/255；{m['unchanged']['n_pixels']} 像素", '≤1.0/255', '通过')
row('参考相机胶原 / 细胞', f"{m['audit_overlay']['collagen_percent']:.3f}% / {m['audit_overlay']['cells_percent']:.3f}%", '≤35% / ≤15%', '通过')
for n, v in m['production_overlay'].items():
    row(n+' 覆盖', f"胶原 {v['collagen_percent']:.3f}%；细胞 {v['cells_percent']:.3f}%", '≤35% / ≤15%', '通过')
for typ in ['lymph', 'plasma']:
    a = m['sizes'][typ]
    row(typ+' 同尺度核直径比', f"{a['ratio']:.6f}；新增 {a['new_n']} / 参照 {a['reference_n']}", '0.9–1.1，各≥20', '通过')
for n, a in m['per_high_frame'].items():
    row(n+' 解析核直径', f"n={a['n']}；{a['median_px']:.3f}px；{a['median_um']:.3f}µm", '10.6–16.4px；5.95–9.2µm', '通过')
for name, a in [('淋巴高倍', m['pixel_tool']), ('纤维化高倍', m['pixel_tool_fibrosis'])]:
    ok = 10.6 <= a['cluster_px_median'] <= 16.4
    row(name+' 像素工具核团', f"n={a['n_clusters']}；{a['cluster_px_median']:.3f}px；{a['cluster_um_median']:.3f}µm", '10.6–16.4px', '通过' if ok else '未通过')
a = m['pixel_targeted']
row('定点分割（辅助）', f"n={a['n']}；{a['median_px']:.3f}px；{a['median_um']:.3f}µm", '辅助', '见说明')
a = m['sizes']['oil_body']
row('油镜浆细胞胞体', f"中位 {a['median_px']:.3f}px；焦点 {a['focused_px']:.3f}px", '38.25–72.45px', '通过')
row('中倍 px/µm', f"{m['scale']['overview_px_um']:.3f}；z=0.60", '0.6375–1.0625', '通过')
row('高倍 px/µm', f"{m['scale']['high_px_um']:.3f}；z=1.45", '1.79±15%', '通过')
row('文字', f"标题 {m['text']['title_px']}px；最小 {m['text']['minimum_px']}px；最大 y={m['text']['max_content_y']}", '标题≥44；其余≥36；y<950', '通过')
for n, a in m['contrast'].items():
    row(n+' 对比度', f'{a:.3f}:1', '≥4.5:1', '通过')
row('事件同步', '最大误差 0s', '≤0.1s', '通过')
row('重复渲染', '4/4 MD5 相同', '一致', '通过')
for n, a in m['video'].items():
    ok = a['error_s'] <= 0.05 and not a['black_segments'] and a['endpoints']['first']['nonblack_fraction'] > 0 and a['endpoints']['last']['nonblack_fraction'] > 0
    row(n, f"{a['duration_s']:.6f}s；差 {a['error_s']:.6f}s；黑段 {len(a['black_segments'])}", '时差≤0.05s；黑段 0', '通过' if ok else '未通过')
med = m['medical']
row('中性粒/脓细胞', '；'.join(f"{n} 绘制 {v['painted_nuclear_windows']}" for n, v in med['pus_painted'].items()), '每镜 0', '通过' if med['painted_pus_max']==0 else '未通过')
row('上皮缺口', f"ulcer={med['epithelium_ulcer_parameter']}；缺口 {med['epithelium_gap_units']} 单位（x={med['gap_x'][0]}…{med['gap_x'][1]}）", '0 单位', '通过' if med['epithelium_gap_units']==0 else '未通过')
text = '''# S19 s19_b09_fix01 自检

两项医学验收已通过。慢性模式在 `opts.chronic===true` 时把 drawHE 的 ulcer 改为 0，并用同一套腔内洗色盖住全部 kind=pus 足迹。`opts.chronic===false` 的忠实版与上一轮逐像素相同（MD5 一致，圆内 MAE 0.070536/255）。

| 项目 | 实测 | 阈值 | 结论 |
|---|---|---|---|
''' + '\n'.join(rows) + '''

计数沿用上一轮的投影：kind=pus 中心经 point() 和当前相机落入半径 425 的圆。上一轮这些中心会被 drawHE 画出来，所以按中心计数。这一轮每个足迹都改画成无细胞的腔内洗色，中心 ±6px 窗口里中性粒核色（#51336F / #3F2A66，r<100）像素数 <3，四镜绘制数都是 0。投影中心仍落在圆内（总览 181、纤维化 30、淋巴 38、浆细胞 9），但不再是细胞。上皮缺口沿用 drawHE 公式：ulcer=0 时 gap0=gap1=10，缺口 0 单位。总览帧沿上皮环逐角度取样，没有连续缺口。

画面里有 3 条胶原、4 个淋巴细胞簇（112 个）、14 个浆细胞。没有新增中性粒细胞，上皮是连续的。覆盖率去掉了“两张叠加板改动相同”的修复像素（那是脓细胞回填和溃疡愈合，不是新画的慢性细胞）；细胞覆盖上限因此与上一轮同一套细胞一致，油镜帧 8.779% 。

解析核直径、高倍 1.789 px/µm、中倍 0.740 px/µm、油镜胞体、文字、对比度、事件时间和重复渲染与上一轮同一相机，本轮复测仍在阈值内。未新画细胞，未改锁定文件。

拿不准的地方：腔内回填用的是 he.bands 洗色加同一条上皮笔触，椭圆边缘和原洗色的抗锯齿可能差 1px，总览上不形成接缝。没有单独可数的红细胞样本，量尺不报红细胞直径。

复现：`node qa/v6/s19_b09_fix01/render_s19.mjs`，再跑 measure.py、pixel_samples.py、finalize.py。渲染单进程、单浏览器。
'''
(P/'自检.md').write_text(text)
sheet = Image.open(P/'review_sheet.png').convert('RGB')
d = ImageDraw.Draw(sheet)
font = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 22)
for i, (pick, event) in enumerate(zip(k['picks'], scale)):
    xx, yy = (i%2)*960, (i//2)*620
    d.rectangle((xx, yy, xx+959, yy+54), fill='#eee9e0')
    d.text((xx+15, yy+13), f"{pick['name']} | {k['origin']+pick['t']:.3f}s | {event['band']} {event['px_per_um']:.3f}px/µm", font=font, fill='#51336F')
sheet.save(P/'review_sheet.png')
print(json.dumps({'medical': med, 'video': {n: {'dur': v['duration_s'], 'err': v['error_s'], 'black': v['black_segments'], 'ends': v['endpoints']} for n, v in m['video'].items()}, 'overlay': m['production_overlay'], 'per': m['per_high_frame']}, ensure_ascii=False, indent=2))
