"""Named keyframes, 200% crops, and the review sheet for S13."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

P = Path(__file__).resolve().parent
k = json.loads((P / 'keyframes.json').read_text())
font = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 28)

# 360×360 windows on the thing each sentence is actually showing.
BOX = {
    's49_start': (1000, 240, 1360, 600),
    's49_pressure': (1000, 240, 1360, 600),
    's50_squeeze': (1200, 150, 1640, 590),
    's50_thrombus': (1180, 430, 1660, 810),
    's51_necrosis': (1300, 250, 1760, 710),
    's51_bleed': (1340, 260, 1780, 700),
    's52_pigment': (1360, 200, 1800, 640),
    's53_gross': (1180, 180, 1720, 720),
    's53_end': (1120, 360, 1720, 860),
}

paper = (244, 239, 230)
rows = []
for p in k['picks']:
    im = Image.open(P / 'stills' / f"t_{p['t']:06.2f}.png").convert('RGB')
    im.save(P / f"{p['name']}.png")
    box = BOX[p['name']]
    dw, dh = box[2] - box[0], box[3] - box[1]
    detail = im.crop(box).resize((dw * 2, dh * 2), Image.Resampling.NEAREST)
    detail.save(P / f"{p['name']}_200pct.png")
    px = im.load()
    w, h = im.size
    worst = 0
    for y in range(950, h):
        for x in range(0, w, 8):
            r, g, b = px[x, y]
            worst = max(worst, abs(r - paper[0]), abs(g - paper[1]), abs(b - paper[2]))
    rows.append((p, im, detail, worst))

sheet_h = 40 + len(rows) * 760
sheet = Image.new('RGB', (1760, sheet_h), '#F4EFE6')
d = ImageDraw.Draw(sheet)
for i, (p, im, detail, worst) in enumerate(rows):
    y = 20 + i * 760
    d.text((20, y), f"{p['name']}  t={p['t']:.2f}s   底栏最大偏差 {worst}", font=font, fill='#2A2A35')
    sheet.paste(im.resize((900, 506)), (20, y + 40))
    # fit the 200% crop beside it
    detail.thumbnail((760, 680), Image.Resampling.NEAREST)
    sheet.paste(detail, (960, y + 40))
    d.text((960, y), '200% 局部', font=font, fill='#2A2A35')
sheet.save(P / 'review_sheet.png')
print('sheet', sheet.size)
for p, im, detail, worst in rows:
    print(f"{p['name']:16} bottom-band {worst}")
