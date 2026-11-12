from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import numpy as np,json
P=Path(__file__).resolve().parent;old=P.parent/'c01_s10'
f=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',28)
# Full frames plus matching 200% crops.
out=Image.new('RGB',(2560,3*1350),'#111114');d=ImageDraw.Draw(out)
for i,n in enumerate(['s37_open_low','s40','s42']):
 for j,root in enumerate([old,P]):
  im=Image.open(root/(n+'.png')).convert('RGB');y=i*1350
  out.paste(im.resize((960,540)),(j*1280,y+40));d.text((j*1280+25,y+3),n+' · '+('c01' if j==0 else 'c02'),font=f,fill='white')
  box=(840,180,1260,420) if i==0 else ((790,315,1410,640) if i==2 else (900,310,1320,550))
  out.paste(im.crop(box).resize(((box[2]-box[0])*2,(box[3]-box[1])*2)),(j*1280+60,y+600))
out.save(P/'对比_c01_c02.png')
metrics=[]
for n in ['s38','s39','s41']:
 a=np.array(Image.open(old/(n+'.png')),dtype=float);b=np.array(Image.open(P/(n+'.png')),dtype=float);metrics.append({'frame':n,'MAE':float(abs(a-b).mean())})
(P/'unchanged_sentences.json').write_text(json.dumps(metrics,indent=2))
print(metrics)
