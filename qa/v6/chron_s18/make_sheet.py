import textwrap
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
P = Path(__file__).resolve().parent
S = P / 'stills'
BG = (17, 17, 20)
FG = (232, 221, 233)
DIM = (176, 160, 190)
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
rows = [
    ('s66_loop', 't_002.40.png', (1190, 320), '句66 反复发作：回环中心是细长阑尾，这一帧正在泛红；没有天数、次数或日历'),
    ('s66_end', 't_003.10.png', (1190, 320), '句66 末：同位置阑尾已褪成更深的暗沉，没有回到最初的灰粉'),
    ('s67_iris', 't_003.35.png', (1140, 220), '句67 起：0.7s 句号对齐的圆形视野转场，18px 羽化，纸色同步压暗'),
    ('s67_open', 't_004.05.png', (1160, 140), '句67：急性阑尾壁中倍，黏膜面破坏、渗出、充血血管与水肿'),
    ('s67_meta', 't_004.85.png', (1190, 30), '句67“变质”：引线终点在圆窗内黏膜坏死上缘，淡染、细胞碎裂处'),
    ('s67_exudate', 't_005.95.png', (1231, 325), '句67“渗出”：引线终点在黏膜下炎细胞浸润与水肿处'),
    ('s68_morph', 't_006.75.png', (700, 180), '句68：单视野移向左侧，慢性窗开始出现'),
    ('s68_compare', 't_007.95.png', (1400, 60), '句68：两窗直径约画面高度 62%；“慢性”标题 42px'),
    ('s68_end', 't_009.10.png', (1188, 730), '句68 末：“纤维组织增生”34px，引线进入右窗胶原；暗底停住'),
]
f30 = ImageFont.truetype(FONT, 30, index=0)
f22 = ImageFont.truetype(FONT, 22, index=0)
LW, LH, CW = 960, 540, 600
W = 40 + LW + 40 + CW + 40
rowH = 40 + CW + 62
sheet = Image.new('RGB', (W, rowH * len(rows)), BG)
d = ImageDraw.Draw(sheet)
for i, (name, fn, (cx, cy), cap) in enumerate(rows):
    y = i * rowH
    im = Image.open(S / fn).convert('RGB')
    sheet.paste(im.resize((LW, LH), Image.LANCZOS), (40, y + 40))
    crop = im.crop((cx, cy, cx + 300, cy + 300))
    crop.resize((CW, CW), Image.NEAREST).save(P / f'{name}_200pct.png')
    sheet.paste(crop.resize((CW, CW), Image.NEAREST), (40 + LW + 40, y + 40))
    im.save(P / f'{name}.png')
    d.text((40, y + 6), name, font=f30, fill=FG)
    d.text((40 + LW + 40, y + 6), '200% 局部', font=f30, fill=FG)
    for k, line in enumerate(textwrap.wrap(cap, 42)[:2]):
        d.text((40, y + 40 + LH + 4 + k * 26), line, font=f22, fill=DIM)
sheet.save(P / 'review_sheet.png')
print(sheet.size, len(rows))

# S18 tail frame beside the current S19 opening frame (e09 delivery). Read-only.
import subprocess
s19mp4 = '/workspace/病理科普视频/v5_s19_dev/qa/v6/e09_s19/S19.mp4'
frame = P / '._s19_frame0.png'
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', '0', '-i', s19mp4, '-frames:v', '1', str(frame)], check=True)
a = Image.open(P / 's68_end.png').convert('RGB')
b = Image.open(frame).convert('RGB')
frame.unlink()
cap_h = 64
W = a.width + b.width + 24
handoff = Image.new('RGB', (W, a.height + cap_h), (17, 17, 20))
handoff.paste(a, (0, cap_h))
handoff.paste(b, (a.width + 24, cap_h))
d2 = ImageDraw.Draw(handoff)
d2.text((16, 16), 'S18 尾帧  s68_end  暗底双窗停住', font=f30, fill=FG)
d2.text((a.width + 40, 16), 'S19 首帧  e09 S19.mp4 第0帧  虹膜打开前', font=f30, fill=FG)
handoff.save(P / 'handoff_s19.png')
print('handoff', handoff.size)
