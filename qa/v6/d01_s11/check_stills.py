from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,numpy as np
P=Path(__file__).resolve().parent;k=json.loads((P/'keyframes.json').read_text());font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',24)
sheet=Image.new('RGB',(1920,len(k['picks'])*650),'#111114');d=ImageDraw.Draw(sheet)
for i,p in enumerate(k['picks']):
 im=Image.open(P/'stills'/f"t_{p['t']:06.2f}.png").convert('RGB');im.save(P/(p['name']+'.png'));detail=im.crop((910,330,1310,580)).resize((800,500),Image.Resampling.NEAREST);detail.save(P/(p['name']+'_200pct.png'));y=i*650;sheet.paste(im.resize((960,540)),(0,y+50));sheet.paste(detail,(1080,y+70));d.text((20,y+5),p['name'],font=font,fill='white');d.text((1080,y+5),'200% 局部',font=font,fill='white')
sheet.save(P/'review_sheet.png')
results={}
results['S08']=[]
for old,t in zip([1,3.8,9,15,21,27,33],json.loads((P.parent/'c03_s10/s08_times.json').read_text())):
 a=np.array(Image.open(P.parent/'b10'/f't_{old:06.2f}.png').convert('RGB'),dtype=float);b=np.array(Image.open(P/'s08_parity'/f't_{t:06.2f}.png').convert('RGB'),dtype=float);results['S08'].append(float(abs(a-b).mean()))
results['S10']=[]
for p in json.loads((P.parent/'c03_s10/keyframes.json').read_text())['picks']:
 a=np.array(Image.open(P.parent/'c03_s10'/(p['name']+'.png')).convert('RGB'),dtype=float);b=np.array(Image.open(P/'s10_parity'/f"t_{p['t']:06.2f}.png").convert('RGB'),dtype=float);results['S10'].append({'name':p['name'],'MAE':float(abs(a-b).mean())})
(P/'parity.json').write_text(json.dumps(results,indent=2));print(results);assert all(x==0 for x in results['S08']);assert all(x['MAE']==0 for x in results['S10'])
