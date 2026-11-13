"""Assemble source-pixel comparisons; no baked numbers or artificial grain."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import sys,shutil
single,morph=map(Path,sys.argv[1:]);out=Path(__file__).resolve().parent
frame=lambda folder,t:folder/f't_{t:06.2f}.png'
font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',28)
def caption(im,xy,text):ImageDraw.Draw(im).text(xy,text,font=font,fill='#85718F')
grid=Image.new('RGB',(3840,2160),'#F4EFE6')
for i,name in enumerate(['正常','红','黄','黑']):
 src=frame(single,i);shutil.copyfile(src,out/f'gross_{name}.png')
 grid.paste(Image.open(src),(i%2*1920,i//2*1080))
for i in range(5):shutil.copyfile(frame(single,i),frame(out,i))
grid.save(out/'gross_四态.png')
strip=Image.new('RGB',(5880,520),'#F4EFE6')
for i in range(7):
 im=Image.open(frame(morph,i/2)).crop((420,300,1620,860))
 strip.paste(im.resize((840,392),Image.Resampling.LANCZOS),(i*840,55))
strip.save(out/'过渡条.png')
comparison=Image.new('RGB',(7680,2220),'#F4EFE6')
comparison.paste(Image.open(out/'r3/gross_四态.png'),(0,60));comparison.paste(grid,(3840,60))
caption(comparison,(70,10),'前版');caption(comparison,(3910,10),'本轮')
comparison.save(out/'对比_r3_r4.png')
normal=Image.new('RGB',(3840,1140),'#F4EFE6')
normal.paste(Image.open(out/'r3/gross_正常.png'),(0,60));normal.paste(Image.open(out/'gross_正常.png'),(1920,60))
caption(normal,(70,10),'正常态 · 前版');caption(normal,(1990,10),'正常态 · 本轮')
normal.save(out/'正常态_r3_vs_r4.png')
# Equal source window and equal enlargement for all three crops, with originals retained.
regions=[(out/'gross_正常.png',(850,418,1170,508),'本轮 · 正常管身'),
 (out/'gross_黄.png',(850,397,1170,487),'本轮 · 化脓管身'),
 (out.parent/'ref/style_target/t_089.73.png',(440,490,760,580),'细化样张 · 肌层与色素')]
detail=Image.new('RGB',(3000,370),'#F4EFE6')
for i,(file,box,label) in enumerate(regions):
 caption(detail,(i*1000+20,15),label)
 detail.paste(Image.open(file).crop(box).resize((960,270),Image.Resampling.LANCZOS),(i*1000+20,70))
detail.save(out/'细节对比_r4.png')
