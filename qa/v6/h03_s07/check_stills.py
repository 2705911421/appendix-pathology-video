from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,numpy as np
P=Path(__file__).resolve().parent;k=json.loads((P/'keyframes.json').read_text());font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',24);r={}
for scene,source in [('s08','b10'),('s10','c03_s10'),('s11','d01_s11'),('s19','e02_s19'),('s14','f03_s14'),('s06','h04_s06')]:
 if scene=='s08':pairs=[(P.parent/source/f't_{old:06.2f}.png',t) for old,t in zip([1,3.8,9,15,21,27,33],json.loads((P.parent/'c03_s10/s08_times.json').read_text()))]
 else:pairs=[(P.parent/source/(p['name']+'.png'),p['t']) for p in json.loads((P.parent/source/'keyframes.json').read_text())['picks']]
 r[scene]=[{'frame':a.name,'MAE':float(abs(np.array(Image.open(a).convert('RGB'),dtype=float)-np.array(Image.open(P/(scene+'_parity')/f't_{t:06.2f}.png').convert('RGB'),dtype=float)).mean())} for a,t in pairs]
(P/'parity.json').write_text(json.dumps(r,indent=2));print(r)
assert all(x['MAE']==0 for s,frames in r.items() if s!='s11' for x in frames)
hist=json.loads((P.parent/'f03_s14/parity.json').read_text())['s11']
# S11 is a known historical difference from f03; only record it, allow sub-quantisation drift.
assert all(abs(a['MAE']-b['MAE'])<1e-4 for a,b in zip(r['s11'],hist)),([x['MAE'] for x in r['s11']],[x['MAE'] for x in hist])
sheet=Image.new('RGB',(1700,len(k['picks'])*650),'#F4EFE6');d=ImageDraw.Draw(sheet)
for i,p in enumerate(k['picks']):
 im=Image.open(P/'stills'/f"t_{p['t']:06.2f}.png").convert('RGB');im.save(P/(p['name']+'.png'));boxes={'handoff_start':(1260,340,1560,640),'handoff_mid':(1200,320,1500,620),'s25_fluid':(980,520,1280,820),'s26_protein':(1000,540,1300,840),'s27_adhesion':(1160,400,1460,700),'s27_crossing':(1140,390,1440,690),'s27_exited':(1220,480,1520,780),'s28_defense':(1380,600,1680,900),'s29_injury':(1380,590,1680,890),'s30_exudation':(1200,520,1500,820)}
 box=boxes[p['name']];detail=im.crop(box).resize((600,600),Image.Resampling.NEAREST);detail.save(P/(p['name']+'_200pct.png'));y=i*650;sheet.paste(im.resize((960,540)),(0,y+50));sheet.paste(detail,(1080,y+40));d.text((20,y+5),p['name'],font=font,fill='#2A2A35');d.text((1080,y+5),'200% 局部',font=font,fill='#2A2A35')
sheet.save(P/'review_sheet.png')
