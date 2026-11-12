from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json,shutil
P=Path(__file__).resolve().parent
key=json.loads((P/'keyframes.json').read_text());fnt=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',24)
sheet=Image.new('RGB',(1920,8*620),'#111114');d=ImageDraw.Draw(sheet)
for i,p in enumerate(key['picks']):
 im=Image.open(P/'stills'/f"t_{p['t']:06.2f}.png").convert('RGB');im.save(P/(p['name']+'.png'))
 crop=(910,300,1280,530) if p['name']!='s37_open_low' else (890,140,1260,370)
 crop=(790,315,1410,640) if p['name']=='s42' else crop
 detail=im.crop(crop).resize(((crop[2]-crop[0])*2,(crop[3]-crop[1])*2),Image.Resampling.NEAREST);detail.save(P/(p['name']+'_200pct.png'))
 y=i*620;sheet.paste(im.resize((960,540)),(0,y+45));sheet.paste(detail.resize((800,460)),(1080,y+70));d.text((20,y+5),p['name']+f" · {p['t']:.3f} s",font=fnt,fill='white');d.text((1080,y+5),'200% 局部',font=fnt,fill='white')
sheet.save(P/'review_sheet.png')
metrics=[]
for old,t in zip([1,3.8,9,15,21,27,33],json.loads((P/'s08_times.json').read_text())):
 a=np.array(Image.open(P.parent/'b10'/f't_{old:06.2f}.png').convert('RGB'),dtype=float);b=np.array(Image.open(P/'s08_parity'/f't_{t:06.2f}.png').convert('RGB'),dtype=float);mae=float(abs(a-b).mean());metrics.append({'legacy':old,'real_local':t,'MAE':mae})
(P/'s08_parity.json').write_text(json.dumps(metrics,indent=2));print(metrics);assert all(m['MAE']==0 for m in metrics)
