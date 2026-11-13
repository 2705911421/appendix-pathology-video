#!/workspace/venv_qa/bin/python
"""Build keyframes, 200% crops, compare sheet, review_sheet, events.json, metrics.json."""
import json, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np

ROOT = Path('.')
OUT  = ROOT / 'qa/v6/s10s11_b09'
KF   = OUT / 'keyframes'
RAW  = OUT / 'kf_raw'
REF  = Path('/workspace/病理科普视频/v5/qa/v6/b10')
timeline = json.load(open('/workspace/病理科普视频/配音/全稿_v3/timeline.json'))
rows = {l['n']: l for l in timeline['lines']}
origin = rows[37]['start']
def at(n): return rows[n]['start'] - origin
def end(n): return rows[n]['end'] - origin
def frac(n, f): return at(n) + (end(n)-at(n))*f

try:
    font = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 22)
    font_sm = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 18)
except Exception:
    font = font_sm = ImageFont.load_default()

# label → scene time
PICKS = [
    ('s37',   frac(37,.25), '37 广角低倍'),
    ('s38',   frac(38,.25), '38 中倍 肌层浸润'),
    ('s39',   frac(39,.25), '39 高倍 中性粒细胞浸润'),
    ('s40',   frac(40,.25), '40 高倍 脓液(前半句)'),
    ('s40_b', frac(40,.80), '40 高倍 脓液(后半句)'),
    ('s41',   frac(41,.25), '41 中倍 渗出肿胀'),
    ('s42',   frac(42,.25), '42 油镜 脓细胞(前半句)'),
    ('s42_b', frac(42,.80), '42 油镜 脓细胞(后半句)'),
    ('s43',   frac(43,.25), '43 高倍 纤维素网(前半句)'),
    ('s43_b', frac(43,.85), '43 高倍 纤维素网(后半句)'),
    ('s44',   frac(44,.25), '44 高倍 纤维脓性渗出物'),
    ('s45_a', frac(45,.15), '45 高倍 纤维素为主(前半句)'),
    ('s45_b', frac(45,.75), '45 高倍 脓细胞为主(后半句)'),
    ('s46',   frac(46,.25), '46 中倍 浆膜面'),
]

raw_files = sorted(RAW.glob('t_*.png'))
def raw_for(t):
    return min(raw_files, key=lambda p: abs(float(p.stem[2:]) - t))

frames = {}
for label, t, desc in PICKS:
    src = raw_for(t)
    dst = KF / f'{label}.png'
    Image.open(src).convert('RGB').save(dst)
    frames[label] = (dst, t, desc)

# ── 200% crops ───────────────────────────────────────────────────────────────
def crop_200(src, label, cx=1110, cy=475, r=425, half_w=240, half_h=180):
    im = Image.open(src).convert('RGB')
    x0 = max(0, min(im.width-half_w*2, cx - half_w))
    y0 = max(0, min(im.height-half_h*2, cy - half_h))
    crop = im.crop((x0, y0, x0+half_w*2, y0+half_h*2))
    crop.resize((crop.width*2, crop.height*2), Image.NEAREST).save(KF/f'{label}_200pct.png')

for label,(dst,t,desc) in frames.items():
    crop_200(dst, label)

# ── compare vs b10 s31 / s34 ────────────────────────────────────────────────
def side_by_side(left, right, out, labels, crop):
    L = Image.open(left).convert('RGB').crop(crop)
    R = Image.open(right).convert('RGB').crop(crop)
    W, H = L.width*2, L.height + 40
    sheet = Image.new('RGB', (W, H), '#111114')
    d = ImageDraw.Draw(sheet)
    sheet.paste(L, (0, 40)); sheet.paste(R, (W//2, 40))
    d.text((10, 8), labels[0], font=font, fill='white')
    d.text((W//2+10, 8), labels[1], font=font, fill='white')
    sheet.save(out)

# s39 vs b10 s08_high_s31: crop the circle region, 200%
CROP39 = (685, 50, 1165, 530)
L = Image.open(frames['s39'][0]).convert('RGB').crop(CROP39).resize((960,960), Image.NEAREST)
R = Image.open(REF/'s08_high_s31.png').convert('RGB').crop(CROP39).resize((960,960), Image.NEAREST)
sheet = Image.new('RGB',(1920,1000),'#111114'); d=ImageDraw.Draw(sheet)
sheet.paste(L,(0,40)); sheet.paste(R,(960,40))
d.text((10,8),'S10/S11 句39 (s10s11_b09) 200%',font=font,fill='white')
d.text((970,8),'b10 s08_high_s31 200%',font=font,fill='white')
sheet.save(OUT/'compare_vs_ref_200pct.png')
print('compare_vs_ref_200pct.png saved')

# ── review_sheet ─────────────────────────────────────────────────────────────
SHEET_ORDER = ['s37','s38','s39','s40','s40_b','s41','s42','s42_b','s43','s43_b','s44','s45_a','s45_b','s46']
COLS, TW, TH = 2, 640, 360
rn = math.ceil(len(SHEET_ORDER)/COLS)
sheet = Image.new('RGB',(TW*COLS, rn*(TH+30)+10),'#111114'); d=ImageDraw.Draw(sheet)
for i,lab in enumerate(SHEET_ORDER):
    dst,t,desc = frames[lab]
    sheet.paste(Image.open(dst).resize((TW,TH)), ((i%COLS)*TW, (i//COLS)*(TH+30)+30))
    d.text(((i%COLS)*TW+8, (i//COLS)*(TH+30)+6), f'{desc}  t={t:.2f}s', font=font_sm, fill='white')
sheet.save(OUT/'review_sheet.png')
print('review_sheet.png saved')

# ── events.json ──────────────────────────────────────────────────────────────
events = {
  'timeline_source':'/workspace/病理科普视频/配音/全稿_v3/timeline.json',
  'origin_s37_start': round(origin,4),
  'sentences':[{'n':n,'start':round(at(n),4),'end':round(end(n),4)} for n in range(37,47)],
  'camera':{
    's37':{'center_field':[120,120],'z':0.226,'mag':'低倍','pxPerUm':0.4787},
    's38':{'center_field':[-160,95],'z':0.40,'mag':'中倍','pxPerUm':0.842},
    's39':{'center_field':[-180,60],'z':0.85,'mag':'高倍','pxPerUm':1.852},
    's40':{'center_field':[0,-305],'z':0.85,'mag':'高倍','pxPerUm':1.685},
    's41':{'center_field':[280,100],'z':0.40,'mag':'中倍','pxPerUm':0.833},
    's42':{'center_field':[102,60],'z':2.45,'mag':'油镜','pxPerUm':4.294},
    's43_45':{'center_field':[80,300],'z':0.78,'mag':'高倍','pxPerUm':1.794},
    's46':{'center_field':[80,300],'z':0.40,'mag':'中倍','pxPerUm':0.846},
  },
  'leaders':{
    's40':[
      {'name':'脓液','field':[12,-375],'label_xy':[175,310],'target_screen':[1108.16,534.85]},
      {'name':'脓细胞','field':[2.39,-367.57],'label_xy':[195,366],'target_screen':[1103.91,527.85]},
      {'name':'组织碎屑','field':[95.12,-386.34],'label_xy':[231,422],'target_screen':[1149.14,551.65]},
      {'name':'渗出液','field':[150,-330],'label_xy':[195,478],'target_screen':[1201.78,514.39]},
    ],
    's42':[
      {'name':'中性粒细胞','label_xy':[835,270],'from':[990,278],'target_screen':[950.44,453.28]},
      {'name':'脓细胞_1','label_xy':[1230,700],'from':[1248,688],'target_screen':[1098.78,533.12]},
      {'name':'脓细胞_2','label_xy':[1230,700],'from':[1248,688],'target_screen':[1235.09,506.0]},
      {'name':'脓细胞_3','label_xy':[1230,700],'from':[1248,688],'target_screen':[1145.96,412.54]},
    ],
    's46':[
      {'name':'浆膜','field':[80,265],'label_xy':[995,572],'target_screen':[1105.21,488.35]},
      {'name':'纤维素性脓性渗出','field':[80,315],'label_xy':[1240,308],'target_screen':[1112.05,469.28]},
    ],
  },
  'keyframes':[{'label':l,'t':round(t,4),'file':f'keyframes/{l}.png','desc':desc} for l,t,desc in
               [(a,b,c) for a,b,c in [(x[0],x[1],x[2]) for x in PICKS]]],
}
(OUT/'events.json').write_text(json.dumps(events,indent=2,ensure_ascii=False))
print('events.json saved')
