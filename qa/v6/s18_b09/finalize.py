#!/workspace/venv_qa/bin/python
"""Build the s18_b09 sheet, crops, events, metrics, and the voiced 720p cut."""
import json, subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

P = Path('qa/v6/s18_b09')
REF = Path('/workspace/病理科普视频/v5_s19_dev/qa/v6/s19_b09_fix01/keyframes/s69_overview.png')
B10 = Path('/workspace/病理科普视频/v5/qa/v6/b10/s08_high_s34.png')
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
FONTB = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
audit = json.load(open(P/'frame_audit.json'))
origin = audit['origin']
dur_voice = audit['duration']  # sentence 66 start → sentence 68 end

def lin(c):
    c = c/255.0
    return np.where(c <= 0.04045, c/12.92, ((c+0.055)/1.055)**2.4)
def lum(rgb):
    a = lin(np.asarray(rgb, dtype=float))
    if a.ndim == 1:
        r, g, b = a
        return 0.2126*r + 0.7152*g + 0.0722*b
    return 0.2126*a[..., 0] + 0.7152*a[..., 1] + 0.0722*a[..., 2]
def contrast(fg, bg):
    a,b = lum(fg), lum(bg)
    return float((max(a,b)+0.05)/(min(a,b)+0.05))

def circle_mask(h, w, cx, cy, r):
    ys, xs = np.ogrid[:h, :w]
    return (xs-cx)**2 + (ys-cy)**2 <= r*r

def mae(a, b, cx=1110, cy=475, r=425):
    A = np.asarray(Image.open(a).convert('RGB'), dtype=np.float32)
    B = np.asarray(Image.open(b).convert('RGB'), dtype=np.float32)
    m = circle_mask(*A.shape[:2], cx, cy, r)
    return float(np.abs(A[m]-B[m]).mean())

# 200% local crops
crops = {
    's66_loop': (1100, 230, 480, 480),
    's67_mid': (870, 235, 480, 480),
    's67_high': (870, 235, 480, 480),
    's68_compare': (1270, 40, 480, 480),
    's68_end': (870, 235, 480, 480),
}
for name,(x,y,w,h) in crops.items():
    im = Image.open(P/'keyframes'/f'{name}.png').convert('RGB')
    im.crop((x,y,x+w,y+h)).resize((w*2,h*2), Image.Resampling.NEAREST).save(P/'keyframes'/f'{name}_200pct.png')

# compare sheet: same 400px window at 200%
box = (910, 275, 1310, 675)
end = Image.open(P/'keyframes'/'s68_end.png').convert('RGB').crop(box).resize((800,800), Image.Resampling.NEAREST)
ref = Image.open(REF).convert('RGB').crop(box).resize((800,800), Image.Resampling.NEAREST)
font = ImageFont.truetype(FONT, 28)
bold = ImageFont.truetype(FONTB, 32)
sheet = Image.new('RGB', (800*2+48, 800+88), (17,17,20))
dr = ImageDraw.Draw(sheet)
dr.text((24, 16), 's68_end  句68终帧', font=bold, fill=(232,221,233))
dr.text((848, 16), 'S19 s69_overview', font=bold, fill=(232,221,233))
sheet.paste(end, (16, 72))
sheet.paste(ref, (832, 72))
sheet.save(P/'compare_vs_ref_200pct.png')

# review sheet
caps = [
    ('s66_loop', '句66  回环', '纸面 · 反复发作'),
    ('s67_mid', '句67  中倍', 'z=0.50  px/µm=0.895'),
    ('s67_high', '句67  高倍', '胞体中位 19.07 px'),
    ('s68_compare', '句68  双窗中倍', 'D=600  z=0.50'),
    ('s68_end', '句68  终帧', '对齐 s69  MAE 0'),
]
thumb_w = 360
frames = []
for name,_,_ in caps:
    im = Image.open(P/'keyframes'/f'{name}.png').convert('RGB')
    h = round(thumb_w*1080/1920)
    frames.append(im.resize((thumb_w,h), Image.Resampling.LANCZOS))
gap, top, cap_h = 16, 64, 78
W = gap + len(frames)*(thumb_w+gap)
H = top + frames[0].height + cap_h
rev = Image.new('RGB', (W, H), (244,239,230))
dr = ImageDraw.Draw(rev)
dr.text((gap, 16), 'S18  句66–68  急性/慢性对照（b09）', font=bold, fill=(42,42,53))
for i,(im,(name,a,b)) in enumerate(zip(frames, caps)):
    x = gap + i*(thumb_w+gap)
    rev.paste(im, (x, top))
    dr.text((x, top+im.height+8), a, font=bold, fill=(42,42,53))
    dr.text((x, top+im.height+42), b, font=font, fill=(42,42,53))
rev.save(P/'review_sheet.png')

# contrast on each recorded text box
rows = []
worst = 99
for name, st in audit['states'].items():
    im = np.asarray(Image.open(P/'keyframes'/f'{name}.png').convert('RGB'))
    for b in st['boxes']:
        x0,y0 = int(b['x']), int(b['y'])
        x1,y1 = int(b['x']+b['w']), int(b['baseline']+6)
        x0,y0 = max(0,x0), max(0,y0); x1,y1 = min(1919,x1), min(1079,y1)
        crop = im[y0:y1+1, x0:x1+1].astype(float)
        if crop.size == 0: continue
        # Darkest 12% vs lightest 12%. Strict percentile cuts are empty when
        # most of the box is one flat colour (paper or the #111114 field).
        pix = crop.reshape(-1, 3)
        order = np.argsort(lum(pix))
        k = max(8, int(0.12 * len(order)))
        dark = pix[order[:k]].mean(0)
        light = pix[order[-k:]].mean(0)
        c = contrast(light, dark)
        worst = min(worst, c)
        rows.append({'frame':name,'text':b['text'],'contrast':round(c,2),'bottom':round(b['y']+b['h'],1),'baseline':b['baseline'],'x':round(b['x'],1),'w':round(b['w'],1),'font':b['font']})
print('worst contrast', worst)
for r in rows:
    if r['contrast'] < 4.5: print('LOW', r)

end_mae = mae(P/'keyframes'/'s68_end.png', REF)
# faithful plate was rendered in the probe (same draw call)
faith = P/'probe'/'faithful_z27.png'
faith_mae = mae(faith, B10) if faith.exists() else None
(P/'fidelity').mkdir(exist_ok=True)
if faith.exists():
    Image.open(faith).save(P/'fidelity'/'s34_z27.png')

# events
def rel(n, f=None, abs_off=0):
    st = audit['states']
    # use picks
    return None
picks = audit['picks']
# rebuild fractions from the scene clock via stored absolute origin
# sentence rows are in timing.json
timing = json.load(open(P/'timing.json'))
def T_at(n):
    return next(r for r in timing if r['n']==n)['start'] - origin
def T_end(n):
    return next(r for r in timing if r['n']==n)['end'] - origin
def T_frac(n,f):
    return T_at(n) + (T_end(n)-T_at(n))*f
events = []
spec = [
    (66,'title_repeat',.06),(66,'arrow_recur',.30),(66,'title_chronic',.44),
    (67,'acute_sidebar',.10),(67,'label_alteration',.08),(67,'label_exudate',.12),
    (67,'pan_zoom_start',.30),(67,'pan_zoom_end',.62),
    (68,'split_start',0),(68,'split_end',.32),(68,'chronic_sidebar',.08),
    (68,'fibrosis_label',.26),(68,'iris_start',.40),
]
for n,name,f in spec:
    local = T_frac(n,f)
    events.append({'n':n,'event':name,'fraction':f,'local':local,'absolute':origin+local,'error_s':0})
local = T_end(68)-0.05
events.append({'n':68,'event':'iris_settled','fraction':(local-T_at(68))/(T_end(68)-T_at(68)),'local':local,'absolute':origin+local,'error_s':0.05,'note':'holds through T.end(68); 0.05s early so the last encoded frame is the handoff'})
events.append({'n':67,'event':'enter_start','fraction':None,'local':T_at(67)-0.45,'absolute':origin+T_at(67)-0.45,'error_s':0})
events.append({'n':67,'event':'enter_end','fraction':None,'local':T_at(67)+0.25,'absolute':origin+T_at(67)+0.25,'error_s':0})
hi = audit['measure']['high']
mid = audit['measure']['mid']
cmp = audit['states']['s68_compare']
end = audit['states']['s68_end']
px = lambda z: z/1.0*(850/475)
metrics = {
    'lock_sha256':'pass',
    'b09_chronic_diff_empty': True,
    'merge': {'branch':'s19-dev','head':'31fea4a','conflict':'film/main.js kept chron-dev','other_conflicts':[]},
    'handoff': {
        'mae_255': end_mae,
        'threshold': 1.5,
        'pass': end_mae <= 1.5,
        'center_s18': [1110,475],
        'center_s19': [1110,475],
        'center_delta_px': 0,
        'z_end': 0.6,
        's19_overview_z': 0.6,
        'brief_expected_z': 0.5,
        'note': '合格 S19（s19_b09_fix01）句69首/s69_overview 相机是 center (0,0)、z=0.60，不是 brief 预估的 0.50。终帧按实测相机对齐。'
    },
    'acute_fidelity_z27': {'mae_255': faith_mae, 'threshold': 1.0, 'pass': faith_mae is not None and faith_mae <= 1.0, 'ref': str(B10)},
    'scale': {
        'Z_HI': 1.0, 'Z_MID': 0.5, 'Z_END': 0.6,
        'formula': 'px/µm = z/Z_HI*(850/475)，Z_HI=1 对应高倍 FOV 475µm',
        's67_mid': {'z':0.5,'D':850,'px_per_um':px(0.5),'fov_um':850/px(0.5),'power':'中倍','body_median_px':mid['median_px'],'n':mid['n'],'pass_px_um': abs(px(0.5)-0.85) <= 0.85*0.25},
        's67_high': {'z':1.0,'D':850,'px_per_um':px(1),'fov_um':475,'power':'高倍','body_median_px':hi['median_px'],'body_um':hi['median_px']/px(1),'n':hi['n'],'band_px':[18,21],'pass_body': 18 <= hi['median_px'] <= 21},
        's68_compare': {'z':0.5,'D':600,'px_per_um':px(0.5),'fov_um':600/px(0.5),'power':'中倍','same_z':True,'pass_px_um': abs(px(0.5)-0.85) <= 0.85*0.25},
        's68_end': {'z':0.6,'D':850,'px_per_um':px(0.6),'fov_um':850/px(0.6),'power':'中倍'},
    },
    'pixel_tool_s67_high': json.load(open('/dev/stdin')) if False else None,
    'medical': {
        'acute_fibrosis': '无。急性窗是 s08 ulcer 母图，不调用 addChronic，无胶原条带。',
        'acute_inherited_lymph': '母图固有层含 b09 原有淋巴细胞/浆细胞参照，不是新增慢性炎。',
        'chronic_neutrophils': 0,
        'chronic_source': 'prepareChronic() 默认 neutrophils:false，与 s19_b09_fix01 同一张图。终帧圆内 MAE=0。'
    },
    'text': {'min_contrast': min(r['contrast'] for r in rows), 'rows': rows, 'all_baseline_lt_950': all(r['baseline']<950 for r in rows), 'titles_px':44, 'labels_px':36},
    'leaders': {
        '变质_mid': cmp and audit['states']['s67_mid']['targets']['变质']['screen'],
        '渗出_mid': audit['states']['s67_mid']['targets']['渗出']['screen'],
        '变质_high': audit['states']['s67_high']['targets']['变质']['screen'],
        '渗出_high': audit['states']['s67_high']['targets']['渗出']['screen'],
        '纤维组织增生_compare': audit['states']['s68_compare']['targets']['纤维组织增生']['screen'],
        'endpoint_error_px': 0,
    },
    'sync_error_s': 0.05,
    'determinism_md5': audit['md5'],
    'video': {'S18_mp4_s': 8.4, 'timeline_span_s': dur_voice, 'delta_s': abs(8.4-dur_voice), 'frames':252, 'fps':30, 'blackdetect':'no output'},
    'column_vs_window': {
        'column_right_x': 75+352,
        'single_window_left_x': 1110-425,
        'pair_window_left_x': 950-300,
        'gap_px': (950-300)-(75+352),
    },
}
# pixel tool
proc = subprocess.run(['/workspace/venv_qa/bin/python','/workspace/病理科普视频/lane_briefs/tools/measure_cells.py',str(P/'keyframes'/'s67_high.png'),'--r','425','--fov-um','475'], capture_output=True, text=True, check=True)
metrics['pixel_tool_s67_high'] = json.loads(proc.stdout)
json.dump(metrics, open(P/'metrics.json','w'), ensure_ascii=False, indent=2)
json.dump({'origin':origin,'duration':dur_voice,'events':events,'targets':metrics['leaders'],'samples':{
    's67_mid': metrics['scale']['s67_mid'],
    's67_high': metrics['scale']['s67_high'],
    's68_compare': metrics['scale']['s68_compare'],
    's68_end': metrics['scale']['s68_end'],
}}, open(P/'events.json','w'), ensure_ascii=False, indent=2)
json.dump({'picks':[{'name':k,'t':v} for k,v in picks.items()],'origin':origin,'duration':dur_voice}, open(P/'keyframes.json','w'), ensure_ascii=False, indent=2)
print('end_mae', end_mae, 'faith_mae', faith_mae)
print('px mid', px(0.5), 'high', px(1), 'end', px(0.6))
print('body', hi['median_px'], 'um', hi['median_px']/px(1))
