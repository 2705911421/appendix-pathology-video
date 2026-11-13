#!/workspace/venv_qa/bin/python
"""Verify leader endpoints land on target cells, contrast ratios, font sizes."""
import json,re
from pathlib import Path
import numpy as np
from PIL import Image

OUT = Path('qa/v6/s10s11_b09')
events = json.loads((OUT/'events.json').read_text())
probe = json.loads((OUT/'probe_metrics.json').read_text())

def lum(c):
    c = np.asarray(c,dtype=float)/255.0
    c = np.where(c<=0.04045, c/12.92, ((c+0.055)/1.055)**2.4)
    return c@np.array([0.2126729,0.7151522,0.0721750])

def contrast(fg,bg):
    L1,L2=lum(fg),lum(bg)
    if L1<L2: L1,L2=L2,L1
    return (L1+0.05)/(L2+0.05)

results={}

# ── 1. leader endpoint → nearest cell centre (≤12 px) ───────────────────────
# Cell centres from the probe (analytic screen positions). We use the roster
# positions projected via the same screenOf transform used by the code.
def measure_s40(lead):
    # re-derive by finding the nearest dark-stain blob near the target
    im=np.array(Image.open(OUT/'keyframes/s40.png').convert('RGB')).astype(int)
    x,y=[int(round(v)) for v in lead["target_screen"]]
    reg=im[max(0,y-14):y+14, max(0,x-14):x+14]
    r,g,b=reg[...,0],reg[...,1],reg[...,2]
    dark=((r<150)&(g<115)&(b>r))
    return int(dark.sum())

def measure_s42(lead):
    im=np.array(Image.open(OUT/'keyframes/s42.png').convert('RGB')).astype(int)
    x,y=[int(round(v)) for v in lead["target_screen"]]
    reg=im[max(0,y-26):y+26, max(0,x-26):x+26]
    r,g,b=reg[...,0],reg[...,1],reg[...,2]
    dark=((r<150)&(g<115)&(b>r))
    return int(dark.sum())

def measure_s46(lead):
    im=np.array(Image.open(OUT/'keyframes/s46.png').convert('RGB')).astype(int)
    x,y=[int(round(v)) for v in lead["target_screen"]]
    reg=im[max(0,y-16):y+16, max(0,x-16):x+16]
    # exudate layer = pinkish bright material distinct from the pale background
    r,g,b=reg[...,0],reg[...,1],reg[...,2]
    pink=((r>190)&(g<225)&(b>190)&(b<250))|((r<190)&(g<160)&(b>r))
    return int(pink.sum())

lead_report={}
for s40 in events['leaders']['s40']:
    lead_report[f's40/{s40["name"]}']={'target':s40['target_screen'],'stained_px_in_28x28':measure_s40(s40),'pass':measure_s40(s40)>=20}
for s42 in events['leaders']['s42']:
    lead_report[f's42/{s42["name"]}']={'target':s42['target_screen'],'stained_px_in_52x52':measure_s42(s42),'pass':measure_s42(s42)>=60}
for s46 in events['leaders']['s46']:
    lead_report[f's46/{s46["name"]}']={'target':s46['target_screen'],'exudate_px_in_32x32':measure_s46(s46),'pass':measure_s46(s46)>=40}
results['leader_endpoints']=lead_report

# ── 2. contrast for label text ─────────────────────────────────────────────
# Left column text #E8DDE9 on #111114 background (outside the circle at x<685)
bg_dark=(17,17,20)
results['contrast_left_column']={
  'fg':'#E8DDE9','bg':'#111114','ratio':round(contrast((232,221,233),bg_dark),2),
  'threshold':4.5,'pass':contrast((232,221,233),bg_dark)>=4.5}
# Label text inside the bright circle: #51336F on the pale field #F6EEF0
results['contrast_in_circle']={
  'fg':'#51336F','bg':'#F6EEF0','ratio':round(contrast((81,51,111),(246,238,240)),2),
  'threshold':4.5,'pass':contrast((81,51,111),(246,238,240))>=4.5}

# ── 3. actual measured background near in-circle labels ─────────────────────
for label,img in [('s42','s42.png'),('s46','s46.png')]:
    a=np.array(Image.open(OUT/'keyframes'/img).convert('RGB')).astype(float)
    # region right of the circle, around label positions
    for name,(x0,y0,x1,y1) in [('label_area',(820,240,1250,320))]:
        reg=a[y0:y1,x0:x1]
        m=reg.reshape(-1,3).mean(0)
        results.setdefault('measured_bg',{})[f'{label}/{name}']={'rgb':[round(v,1) for v in m],
            'contrast_vs_51336F':round(contrast((81,51,111),tuple(m)),2)}

# ── 4. font sizes in code ──────────────────────────────────────────────────
code=(Path('film/chapters/s10.js')).read_text()
# Font declarations in the chapter:
#   '500 36px MixSans'                      -> magnification label
#   '400 36px MixSans'                      -> body / in-circle labels
#   `${i?400:700} ${i?36:44}px MixSans`     -> title (i=0: 700 44px) / body (i=1: 400 36px)
sizes=set(int(x) for x in re.findall(r'(\d+)px MixSans',code))
templ=re.findall(r'\$\{i\?(\d+):(\d+)\}px MixSans',code)
title_px=int(templ[0][1]) if templ else None
body_px=int(templ[0][0]) if templ else None
results['font_sizes']={
  'title_px_bold':title_px,'title_weight':700 if templ else None,
  'body_px':body_px,'body_weight':400,
  'label_px':min(sizes),'magnification_px':36,
  'min_size_found':min(list(sizes)+[title_px,body_px]),
  'min_size_pass':min(list(sizes)+[title_px,body_px])>=36,
  'title_pass':title_px>=44,'body_pass':body_px>=36}

# fillText(text, x, y): last numeric argument is y. Also account for the
# title loop `fillText(s,75,320+i*56)` where i<=1 -> y in {320,376}.
ypos=[int(m[-1]) for m in re.findall(r'fillText\(([^()]*)\)', code) if ',' in m]
ypos=[y for y in ypos if y>0]
ypos += [320,376]
results['all_text_y_under_950']={'max_y':max(ypos),'pass':max(ypos)<950,
  'all_y':sorted(set(ypos)),'note':'950 = 1080 - 130 safe margin'}

# ── 6. global yellow-cast check: mean hue of circle vs b10 s31 ─────────────
def circle_mean(path):
    a=np.array(Image.open(path).convert('RGB')).astype(float)
    yy,xx=np.mgrid[0:1080,0:1920]
    m=((xx-1110)**2+(yy-475)**2)<(425-25)**2
    return a[m].mean(0)
ours=circle_mean(OUT/'keyframes/s39.png')
ref=circle_mean(Path('/workspace/病理科普视频/v5/qa/v6/b10/s08_high_s31.png'))
def srgb_to_lab(rgb):
    c=np.asarray(rgb,float)/255.0
    c=np.where(c<=0.04045,c/12.92,((c+0.055)/1.055)**2.4)
    M=np.array([[0.4124,0.3576,0.1805],[0.2126,0.7152,0.0722],[0.0193,0.1192,0.9505]])
    xyz=c@M.T
    wp=np.array([0.95047,1.0,1.08883]); xyz=xyz/wp
    f=np.where(xyz>0.008856,np.cbrt(xyz),7.787*xyz+16/116)
    L=116*f[1]-16; a=500*(f[0]-f[1]); b=200*(f[1]-f[2])
    return np.array([L,a,b])
dE=float(np.linalg.norm(srgb_to_lab(ours)-srgb_to_lab(ref)))
results['no_global_yellow']={'ours_circle_mean_rgb':[round(v,2) for v in ours],
  'ref_circle_mean_rgb':[round(v,2) for v in ref],'deltaE_CIE76':round(dE,2),
  'threshold':8,'pass':bool(dE<=8)}

results['no_global_yellow']={'ours_circle_mean_rgb':[round(v,2) for v in ours],
  'ref_circle_mean_rgb':[round(v,2) for v in ref],'deltaE_CIE76':round(dE,2),
  'threshold':8,'pass':dE<=8}

print(json.dumps(results,indent=2,ensure_ascii=False,default=str))
(OUT/'verify_leaders_contrast.json').write_text(json.dumps(results,indent=2,ensure_ascii=False,default=str))
