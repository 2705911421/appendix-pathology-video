"""Assemble rendered frames: python3 qa/gross/assemble_02.py SINGLE MORPH."""
from pathlib import Path
from PIL import Image
import sys, shutil
single, morph = map(Path, sys.argv[1:])
out = Path(__file__).resolve().parent
names = [f'gross_{n}.png' for n in ['正常', '红', '黄', '黑']]
frame = lambda folder, t: folder / f't_{t:06.2f}.png'
(out / 'r1').mkdir(exist_ok=True)
for name in names + ['gross_四态.png']:
    if (out / name).exists() and not (out / 'r1' / name).exists():
        shutil.move(out / name, out / 'r1' / name)
grid = Image.new('RGB', (3840, 2160), '#F4EFE6')
for i, name in enumerate(names):
    shutil.copyfile(frame(single, i), out / name)
    grid.paste(Image.open(frame(single, i)), (i % 2 * 1920, i // 2 * 1080))
grid.save(out / 'gross_四态.png')
strip = Image.new('RGB', (5880, 520), '#F4EFE6')
for i in range(7):
    im = Image.open(frame(morph, i / 2)).crop((420, 300, 1620, 860))
    strip.paste(im.resize((840, 392), Image.Resampling.LANCZOS), (i * 840, 55))
strip.save(out / '过渡条.png')
