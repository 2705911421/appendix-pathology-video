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
    ('s66_loop', 't_002.40.png', (1250, 180), '句66 反复发作：手绘回环，两处顺时针箭头；不用日历、天数或次数刻度'),
    ('s66_end', 't_003.10.png', (700, 480), '句66 末：纸色收束在“反复发作→可转慢性”，即将进入镜下段'),
    ('s67_iris', 't_003.35.png', (940, 150), '句67 起：0.7s 句号对齐的圆形视野转场，18px 羽化，纸色同步压暗'),
    ('s67_open', 't_004.05.png', (900, 120), '句67：急性阑尾壁中倍，黏膜面破坏、渗出、充血血管与水肿'),
    ('s67_meta', 't_004.85.png', (500, 230), '句67“变质”：黏膜坏死、上皮连续中断、核碎屑与组织碎屑'),
    ('s67_exudate', 't_005.95.png', (900, 430), '句67“渗出”：中性粒细胞弥漫浸润、脓细胞与肌层水肿'),
    ('s68_morph', 't_006.75.png', (600, 150), '句68：单视野收回左侧小窗，慢性窗开始出现'),
    ('s68_compare', 't_007.95.png', (1320, 300), '句68：急性（左）／慢性（右）对照，慢性侧才显示纤维组织增生'),
    ('s68_end', 't_009.10.png', (1250, 280), '句68 末：对照停稳，暗底保持到片尾，与 S19 直连'),
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
