from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
P=Path(__file__).resolve().parent
picks=json.loads((P/'keyframes.json').read_text())['picks']
f=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',24)
out=Image.new('RGB',(1920,6*590),'#F4EFE6');d=ImageDraw.Draw(out)
for i,p in enumerate(picks):
 y=i*590;d.text((20,y+4),p['name']+' — h01',font=f,fill='#2A2A35');d.text((980,y+4),p['name']+' — h02',font=f,fill='#2A2A35')
 for j,folder in enumerate(['h01_s06','h02_s06']):
  out.paste(Image.open(P.parent/folder/(p['name']+'.png')).convert('RGB').resize((960,540)),(j*960,y+45))
out.save(P/'对比_h01_h02.png')
