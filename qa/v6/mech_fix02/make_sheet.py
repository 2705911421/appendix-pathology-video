"""Review sheet for mech_fix02 S13r (restored camera)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

P = Path(__file__).resolve().parent
K = P / 'keyframes'
font = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 30)
small = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 24)

NAMES = ['s49_pressure', 's50_squeeze', 's51_necrosis', 's51_bleed',
         's52_pigment', 's53_gross']
paper = (244, 239, 230)

cell_w, cell_h = 640, 360
sheet = Image.new('RGB', (cell_w * 3, (cell_h + 46) * 2), paper)
d = ImageDraw.Draw(sheet)
for i, n in enumerate(NAMES):
    im = Image.open(K / f'{n}.png').convert('RGB').resize((cell_w, cell_h), Image.LANCZOS)
    x = (i % 3) * cell_w
    y = (i // 3) * (cell_h + 46)
    sheet.paste(im, (x, y))
    d.rectangle([x, y + cell_h, x + cell_w, y + cell_h + 46], fill=paper)
    d.text((x + 14, y + cell_h + 8), n, font=font, fill=(58, 36, 56))
sheet.save(P / 'review_sheet.png')
print('review_sheet.png', sheet.size)
