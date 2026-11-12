from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,numpy as np
P=Path(__file__).resolve().parent;k=json.loads((P/'keyframes.json').read_text());font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',24)
results={}
for scene,source in [('s08','b10'),('s10','c03_s10'),('s11','d01_s11')]:
 results[scene]=[]
 if scene=='s08':pairs=[(P.parent/source/f't_{old:06.2f}.png',t) for old,t in zip([1,3.8,9,15,21,27,33],json.loads((P.parent/'c03_s10/s08_times.json').read_text()))]
 else:pairs=[(P.parent/source/(p['name']+'.png'),p['t']) for p in json.loads((P.parent/source/'keyframes.json').read_text())['picks']]
 for old,t in pairs:
  a=np.array(Image.open(old).convert('RGB'),dtype=float);b=np.array(Image.open(P/(scene+'_parity')/f't_{t:06.2f}.png').convert('RGB'),dtype=float);mae=float(abs(a-b).mean());results[scene].append({'frame':old.name,'MAE':mae})
(P/'parity.json').write_text(json.dumps(results,indent=2));print(results)
picks=k['picks']+[{'name':'iris_enter','file':'iris/enter/010.png'},{'name':'iris_exit','file':'iris/exit/010.png'}]
sheet=Image.new('RGB',(1920,len(picks)*650),'#111114');d=ImageDraw.Draw(sheet)
for i,p in enumerate(picks):
 im=Image.open(P/p['file'] if 'file' in p else P/'stills'/f"t_{p['t']:06.2f}.png").convert('RGB');im.save(P/(p['name']+'.png'));detail=im.crop((960,70,1260,370) if p['name'] in ['s69_low','iris_enter'] else (960,350,1260,650)).resize((600,600),Image.Resampling.NEAREST);detail.save(P/(p['name']+'_200pct.png'));y=i*650;sheet.paste(im.resize((960,540)),(0,y+50));sheet.paste(detail,(1140,y+40));d.text((20,y+5),p['name'],font=font,fill='white');d.text((1140,y+5),'200% 局部',font=font,fill='white')
sheet.save(P/'review_sheet.png')

baseline=json.loads((P.parent/'e01_s19/parity.json').read_text())
assert results['s11']==baseline['s11'], 'S11 differs from known e01 baseline'
assert all(f["MAE"]==0 for scene,frames in results.items() if scene != "s11" for f in frames), "S08/S10 parity failed"

# Identical crop rectangles and nearest-neighbour enlargement for both versions.
comparison=Image.new('RGB',(1600,1400),'#111114');cd=ImageDraw.Draw(comparison)
for row,name in enumerate(['s70_plasma','s69_fibrosis']):
 for col,version in enumerate(['e01','e02']):
  source=P.parent/'e01_s19'/(name+'.png') if col==0 else P/(name+'.png')
  im=Image.open(source).convert('RGB')
  comparison.paste(im.crop((910,300,1310,600)).resize((800,600),Image.Resampling.NEAREST),(col*800,row*700+70))
  cd.text((col*800+20,row*700+20),version+' · '+('浆细胞' if row==0 else '纤维化')+' · 200%',font=font,fill='#E8DDE9')
comparison.save(P/'对比_e01_e02.png')
