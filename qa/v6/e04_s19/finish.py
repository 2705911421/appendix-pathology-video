from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,numpy as np,hashlib
P=Path(__file__).resolve().parent;k=json.loads((P/'keyframes.json').read_text());font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',24)
results={}
for scene,source in [('s08','b10'),('s10','c03_s10'),('s11','d01_s11')]:
 results[scene]=[]
 if scene=='s08':pairs=[(P.parent/source/f't_{old:06.2f}.png',t) for old,t in zip([1,3.8,9,15,21,27,33],json.loads((P.parent/'c03_s10/s08_times.json').read_text()))]
 else:pairs=[(P.parent/source/(p['name']+'.png'),p['t']) for p in json.loads((P.parent/source/'keyframes.json').read_text())['picks']]
 for old,t in pairs:
  a=np.array(Image.open(old).convert('RGB'),dtype=float);b=np.array(Image.open(P/(scene+'_parity')/f't_{t:06.2f}.png').convert('RGB'),dtype=float);results[scene].append({'frame':old.name,'MAE':float(abs(a-b).mean())})
(P/'parity.json').write_text(json.dumps(results,indent=2));print(results)
assert all(f['MAE']==0 for scene,frames in results.items() if scene!='s11' for f in frames)
assert results['s11']==json.loads((P.parent/'e02_s19/parity.json').read_text())['s11']
picks=k['picks']+[{'name':'iris_enter'},{'name':'iris_exit'}]
sheet=Image.new('RGB',(1920,len(picks)*650),'#111114');d=ImageDraw.Draw(sheet)
for i,p in enumerate(picks):
 im=Image.open(P/(p['name']+'.png') if p['name'].startswith('iris') else P/'stills'/f"t_{p['t']:06.2f}.png").convert('RGB');im.save(P/(p['name']+'.png'));box=(960,70,1260,370) if p['name'] in ['s69_low','iris_enter'] else (960,350,1260,650);detail=im.crop(box).resize((600,600),Image.Resampling.NEAREST);detail.save(P/(p['name']+'_200pct.png'));y=i*650;sheet.paste(im.resize((960,540)),(0,y+50));sheet.paste(detail,(1140,y+40));d.text((20,y+5),p['name'],font=font,fill='white');d.text((1140,y+5),'200% 局部',font=font,fill='white')
sheet.save(P/'review_sheet.png')
# Equal raw-pixel crops at 200%, never resize an individual cell to force a match.
comparison=Image.new('RGB',(1800,2100),'#111114');d=ImageDraw.Draw(comparison)
for row,name in enumerate(['s70_plasma','s70_lymph','s69_fibrosis']):
 for col,v in enumerate(['e03_s19','e04_s19','样张']):
  if col<2:
   base=Image.open(P.parent/v/(name+'.png'));factor=1
   im=base.crop((round(1110-150*factor),round(500-150*factor),round(1110+150*factor),round(500+150*factor)))
  else:im=Image.open(P.parents[1]/'ref/style_target/sample_zoom.png').crop((16,180,316,480))
  comparison.paste(im.resize((600,600),Image.Resampling.NEAREST),(col*600,row*700+65));d.text((col*600+12,row*700+18),('样张 · 细胞/间质风格 · 200%' if col==2 else v+' · '+['浆细胞','淋巴细胞','纤维化'][row]+(' · 倍率归一' if False else ' · 200%')),font=font,fill='#E8DDE9')
comparison.save(P/'对比_e03_e04_样张.png')
files=[line.split('  ')[1] for line in (P/'sha256_开工.txt').read_text().splitlines()]
end=''.join(hashlib.sha256(Path(x).read_bytes()).hexdigest()+'  '+x+'\n' for x in files);(P/'sha256_结束.txt').write_text(end);assert end==(P/'sha256_开工.txt').read_text();(P/'sha256_校验.log').write_text('七项开工/结束 SHA256 完全一致；与 e02 基准一致。\n');assert end==(P.parent/'e02_s19/sha256_开工.txt').read_text()
