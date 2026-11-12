from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,numpy as np
P=Path(__file__).resolve().parent;k=json.loads((P/'keyframes.json').read_text());font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',24)
results={}
for scene,source in [('s08','b10'),('s10','c03_s10'),('s11','d01_s11'),('s19','e02_s19')]:
 results[scene]=[]
 if scene=='s08':pairs=[(P.parent/source/f't_{old:06.2f}.png',t) for old,t in zip([1,3.8,9,15,21,27,33],json.loads((P.parent/'c03_s10/s08_times.json').read_text()))]
 else:pairs=[(P.parent/source/(p['name']+'.png'),p['t']) for p in json.loads((P.parent/source/'keyframes.json').read_text())['picks']]
 for old,t in pairs:
  a=np.array(Image.open(old).convert('RGB'),dtype=float);b=np.array(Image.open(P/(scene+'_parity')/f't_{t:06.2f}.png').convert('RGB'),dtype=float);mae=float(abs(a-b).mean());results[scene].append({'frame':old.name,'MAE':mae})
(P/'parity.json').write_text(json.dumps(results,indent=2));print(results)
picks=k['picks']+[{'name':'iris_enter','file':'iris/enter/010.png'},{'name':'iris_exit','file':'iris/exit/010.png'}]
sheet=Image.new('RGB',(2560,len(picks)*650),'#111114');d=ImageDraw.Draw(sheet)
for i,p in enumerate(picks):
 im=Image.open(P/p['file'] if 'file' in p else P/'stills'/f"t_{p['t']:06.2f}.png").convert('RGB');im.save(P/(p['name']+'.png'));detail=im.crop({'s54_low':(970,65,1270,365),'s54_middle':(900,300,1200,600),'s55':(1030,350,1330,650),'s56':(1000,330,1300,630),'s57':(820,330,1120,630),'iris_enter':(960,70,1260,370),'iris_exit':(980,270,1280,570)}[p['name']]).resize((600,600),Image.Resampling.NEAREST);detail.save(P/(p['name']+'_200pct.png'));y=i*650;sheet.paste(im.resize((960,540)),(0,y+50));sheet.paste(detail,(1140,y+40));d.text((20,y+5),p['name'],font=font,fill='white');d.text((1140,y+5),'200% 局部',font=font,fill='white')
# Both native source crops use 300x300 pixels, displayed at exactly 200%.
ref=Image.open('qa/ref/style_target/t_089.73.png').convert('RGB')
refdetail=ref.crop((480,340,780,640)).resize((600,600),Image.Resampling.NEAREST)
refdetail.save(P/'style_target_200pct.png')
for i,p in enumerate(picks):
 y=i*650;sheet.paste(refdetail,(1900,y+40));d.text((1900,y+5),'细化样张 同为200%',font=font,fill='white')
sheet.save(P/'review_sheet.png')

baseline=json.loads((P.parent/'e01_s19/parity.json').read_text())
assert results['s11']==baseline['s11'], 'S11 differs from known e01 baseline'
assert all(f["MAE"]==0 for scene,frames in results.items() if scene != "s11" for f in frames), "S08/S10/S19 parity failed"

