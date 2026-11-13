"""Assemble r3 frames without modifying archived r2b artifacts."""
from pathlib import Path
from PIL import Image
import sys, shutil
single, morph = map(Path, sys.argv[1:])
out = Path(__file__).resolve().parent
frame = lambda folder, t: folder / f't_{t:06.2f}.png'
grid = Image.new('RGB', (3840, 2160), '#F4EFE6')
for i, name in enumerate(['正常', '红', '黄', '黑']):
    src = frame(single, i)
    shutil.copyfile(src, out / f'gross_{name}.png')
    grid.paste(Image.open(src), (i % 2 * 1920, i // 2 * 1080))
grid.save(out / 'gross_四态.png')
strip = Image.new('RGB', (5880, 520), '#F4EFE6')
for i in range(7):
    im = Image.open(frame(morph, i / 2)).crop((420, 300, 1620, 860))
    strip.paste(im.resize((840, 392), Image.Resampling.LANCZOS), (i * 840, 55))
strip.save(out / '过渡条.png')
comparison = Image.new('RGB', (7680, 2160), '#F4EFE6')
old = Image.open(out / 'r2b/gross_四态.png')
assert old.size == grid.size
comparison.paste(old, (0, 0))
comparison.paste(grid, (3840, 0))
comparison.save(out / '对比_r2b_r3.png')
