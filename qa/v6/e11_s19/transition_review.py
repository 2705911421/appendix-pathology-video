from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json,numpy as np
P=Path(__file__).resolve().parent
names=['transition_1','transition_2','transition_3'];font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',24)
im=Image.new('RGB',(1920,1200),'#111114');d=ImageDraw.Draw(im)
for i,n in enumerate(names):
 a=Image.open(P/(n+'.png'));im.paste(a.resize((640,360)),(i*640,50));im.paste(a.crop((810,175,1410,775)).resize((640,640)),(i*640,450));d.text((i*640+10,10),['句69末','句70推进中','句70接近淋巴区'][i],font=font,fill='#E8DDE9')
im.save(P/'句69至70_三帧过渡.png')
a=np.asarray(Image.open(P.parent/'e10_s19/s70_plasma.png')).astype(float);b=np.asarray(Image.open(P/'s70_plasma.png')).astype(float)
(P/'plasma_parity.json').write_text(json.dumps({'full_frame_MAE':float(abs(a-b).mean()),'central_300px_MAE':float(abs(a[350:650,960:1260]-b[350:650,960:1260]).mean())},indent=2))
