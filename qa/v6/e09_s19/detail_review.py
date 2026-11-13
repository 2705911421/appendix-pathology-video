from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
P=Path(__file__).resolve().parent
f=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',23)
# Fixed source pixels, no interpolated repainting; three known fibrosis problem regions.
boxes=[(790,545,890,645),(725,390,825,490),(1300,620,1400,720)]
out=Image.new('RGB',(1200,880),'#111114');d=ImageDraw.Draw(out)
for row,v in enumerate(['e08_s19','e09_s19']):
 im=Image.open(P.parent/v/'s69_fibrosis.png')
 for col,box in enumerate(boxes):
  out.paste(im.crop(box).resize((400,400),Image.Resampling.NEAREST),(col*400,row*440+40));d.text((col*400+8,row*440+7),v+' '+['左下','左边缘','右下'][col]+' · 400%',font=f,fill='white')
out.save(P/'三处碎点_400pct_对比.png')
# Same source-pixel scale throughout. Reference has acute cells: compare stain texture, not cell type.
ref=Image.open('/workspace/病理科普视频/v5/qa/ref/style_target/t_089.73.png')
out=Image.new('RGB',(1200,780),'#111114');d=ImageDraw.Draw(out)
for row,name in enumerate(['s70_plasma','s70_lymph']):
 for col,v in enumerate(['e08_s19','e09_s19','样张']):
  im=Image.open(P.parent/v/(name+'.png')).crop((1010,385,1190,565)) if col<2 else ref.crop((450,510,630,690))
  out.paste(im.resize((360,360),Image.Resampling.NEAREST),(col*400,row*390+30));d.text((col*400,row*390),v+' · 同像素尺度 200%',font=f,fill='white')
out.save(P/'细胞同尺度对比.png')
for name in ['s69_low','s69_middle','s69_fibrosis']:
 im=Image.open(P/(name+'.png'));im.resize((3840,2160),Image.Resampling.NEAREST).save(P/(name+'_全画面200pct.png'))
