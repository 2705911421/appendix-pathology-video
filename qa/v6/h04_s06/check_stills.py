from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,numpy as np
P=Path(__file__).resolve().parent;k=json.loads((P/'keyframes.json').read_text());font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',24);r={}
for scene,source in [('s08','b10'),('s10','c03_s10'),('s11','d01_s11'),('s19','e02_s19'),('s14','f03_s14')]:
 if scene=='s08':pairs=[(P.parent/source/f't_{old:06.2f}.png',t) for old,t in zip([1,3.8,9,15,21,27,33],json.loads((P.parent/'c03_s10/s08_times.json').read_text()))]
 else:pairs=[(P.parent/source/(p['name']+'.png'),p['t']) for p in json.loads((P.parent/source/'keyframes.json').read_text())['picks']]
 r[scene]=[{'frame':a.name,'MAE':float(abs(np.array(Image.open(a).convert('RGB'),dtype=float)-np.array(Image.open(P/(scene+'_parity')/f't_{t:06.2f}.png').convert('RGB'),dtype=float)).mean())} for a,t in pairs]
(P/'parity.json').write_text(json.dumps(r,indent=2));print(r)
assert all(x['MAE']==0 for s,frames in r.items() if s!='s11' for x in frames)
assert r['s11']==json.loads((P.parent/'f03_s14/parity.json').read_text())['s11']
sheet=Image.new('RGB',(1700,6*650),'#F4EFE6');d=ImageDraw.Draw(sheet)
for i,p in enumerate(k['picks']):
 im=Image.open(P/'stills'/f"t_{p['t']:06.2f}.png").convert('RGB');im.save(P/(p['name']+'.png'));box=(1080,330,1380,630) if i<3 else (1280,370,1580,670);detail=im.crop(box).resize((600,600),Image.Resampling.NEAREST);detail.save(P/(p['name']+'_200pct.png'));y=i*650;sheet.paste(im.resize((960,540)),(0,y+50));sheet.paste(detail,(1080,y+40));d.text((20,y+5),p['name'],font=font,fill='#2A2A35');d.text((1080,y+5),'200% 局部',font=font,fill='#2A2A35')
sheet.save(P/'review_sheet.png')
