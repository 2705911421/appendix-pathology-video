from pathlib import Path
from PIL import Image, ImageChops, ImageStat, ImageDraw, ImageFont
import shutil, hashlib, json

out = Path(__file__).resolve().parent
root = out.parents[2]
base = out.parent / 'b05'
font = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 22)
font_s = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 18)

frames = [
    ('s08_low', 1),
    ('s08_mid', 3.8),
    ('s08_high_s30', 9),
    ('s08_high_s31', 15),
    ('s08_high_s32', 21),
    ('s08_high_s33', 27),
    ('s08_high_s34', 33),
]
for name, t in frames:
    shutil.copyfile(out / f't_{t:06.2f}.png', out / f'{name}.png')

# Mid / s30–s33 must match b05 pixel-for-pixel (MAE < 0.5). Whole frame, no mask.
rows = []
for name, t in frames[1:-1]:
    a = Image.open(base / f'{name}.png').convert('RGB')
    b = Image.open(out / f'{name}.png').convert('RGB')
    d = ImageChops.difference(a, b)
    mae = sum(ImageStat.Stat(d).mean) / 3
    changed = sum(1 for p in d.getdata() if max(p) > 0)
    rows.append(dict(frame=name, t=t, RGB_MAE=mae, changed_pixels=changed, passed=mae < 0.5))
    assert mae < 0.5, f'{name} MAE {mae} >= 0.5'

(out / '像素一致性报告.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2))
(out / '像素一致性报告.md').write_text(
    '# g01 / b05 像素一致性\n\n1920×1080，RGB 0–255；整帧比较，无遮罩、配准或颜色校正。中倍与 s30–s33 必须 MAE<0.5。\n\n'
    '|帧|t|MAE|变化像素|通过|\n|---|---|---|---|---|\n'
    + ''.join(f"|{r['frame']}|{r['t']}|{r['RGB_MAE']:.4f}|{r['changed_pixels']}|{r['passed']}|\n" for r in rows)
)

def comparison(title, name, crop_box):
    """Side-by-side full frames (960×540) plus 200% crops of the same box."""
    canvas = Image.new('RGB', (1920, 1080), '#111114')
    dr = ImageDraw.Draw(canvas)
    for j, folder, label in [(0, base, 'b05'), (1, out, 'g01')]:
        full = Image.open(folder / f'{name}.png').convert('RGB')
        canvas.paste(full.resize((960, 540), Image.Resampling.LANCZOS), (j * 960, 36))
        crop = full.crop(crop_box).resize((960, 480), Image.Resampling.NEAREST)
        canvas.paste(crop, (j * 960, 590))
        dr.text((j * 960 + 24, 6), f'{label}  ·  {title}', font=font, fill='white')
        dr.text((j * 960 + 24, 560), f'{label}  ·  200% 局部', font=font_s, fill='#D8C8E0')
    canvas.save(out / f'{title}_b05_vs_g01.png')

# Low-mag: lower-right mucosa inside the eyepiece. s34: epithelium at the lens centre.
comparison('低倍', 's08_low', (1180, 500, 1180 + 480, 500 + 240))
comparison('s34', 's08_high_s34', (870, 380, 870 + 480, 380 + 240))

# Seven-frame review sheet: 2 columns × 4 rows (last cell empty).
sheet = Image.new('RGB', (1920, 4 * 398), '#111114')
dr = ImageDraw.Draw(sheet)
for i, (name, t) in enumerate(frames):
    x = i % 2 * 960
    y = i // 2 * 398
    sheet.paste(Image.open(out / f'{name}.png').convert('RGB').resize((640, 360), Image.Resampling.LANCZOS), (x + 160, y + 34))
    dr.text((x + 24, y + 3), f'{name}  ·  {t}s', font=font, fill='white')
sheet.save(out / 'review_sheet.png')

files = sorted(p for p in (root / 'engine/lib').rglob('*') if p.is_file()) + [root / 'parity_r4/chapters/04.js']
end = ''.join(hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + str(p.relative_to(root)) + '\n' for p in files)
(out / 'sha256_结束.txt').write_text(end)
start = (out / 'sha256_开工.txt').read_text()
assert end == start, 'locked-file sha256 changed'
assert end == (base / 'sha256_结束.txt').read_text(), 'locked files drifted from b05'
(out / 'sha256_校验.log').write_text('PASS: b05 结束 = g01 开工 = g01 结束；engine/lib 全部文件及 parity_r4/chapters/04.js sha256 一致\n')
print(json.dumps(rows, ensure_ascii=False, indent=2))
