from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import shutil,json
out=Path(__file__).resolve().parent
src=Path('/tmp/gross05_final')
font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',28)
def label(im,xy,t):ImageDraw.Draw(im).text(xy,t,font=font,fill='#85718F')
for i,name in enumerate(['正常','红','化脓','坏疽']):
 shutil.copyfile(src/f't_{i:06.2f}.png',out/f'gross_{name}.png')
for i,name in [(2,'黄'),(3,'黑')]:shutil.copyfile(src/f't_{i:06.2f}.png',out/f'gross_{name}.png')
for i in range(5):shutil.copyfile(src/f't_{i:06.2f}.png',out/f't_{i:06.2f}.png')
grid=Image.new('RGB',(3840,2160))
for i,name in enumerate(['正常','红','化脓','坏疽']):grid.paste(Image.open(out/f'gross_{name}.png'),(i%2*1920,i//2*1080))
grid.save(out/'gross_四态.png')
compare=Image.new('RGB',(7680,2220),'#F4EFE6')
compare.paste(Image.open(out/'r4/gross_四态.png'),(0,60));compare.paste(grid,(3840,60))
label(compare,(50,8),'r4');label(compare,(3890,8),'r5');compare.save(out/'对比_r4_r5.png')
detail=Image.new('RGB',(1920,940),'#F4EFE6')
for row,(old,new,box,title) in enumerate([('黄','化脓',(810,385,1260,575),'化脓态'),('黑','坏疽',(1200,310,1650,500),'坏疽态')]):
 for col,(folder,name,version) in enumerate([(out/'r4',old,'r4'),(out,new,'r5')]):
  label(detail,(col*960+25,row*470+12),title+' · '+version+' · 200%')
  im=Image.open(folder/f'gross_{name}.png').crop(box).resize((900,380),Image.Resampling.NEAREST)
  detail.paste(im,(col*960+25,row*470+65))
detail.save(out/'细节对比_r5.png')
checks={}
for name in ['正常','红']:
 a=Image.open(out/'r4'/f'gross_{name}.png').convert('RGB');b=Image.open(out/f'gross_{name}.png').convert('RGB')
 checks[name+'_pixel_identical']=ImageChops.difference(a,b).getbbox() is None
(out/'verification_r5.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
print(checks)
