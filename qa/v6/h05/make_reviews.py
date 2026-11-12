from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,numpy as np,subprocess,io
ROOT=Path(__file__).resolve().parents[3];out=Path(__file__).resolve().parent
font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',22)
for lane in ['h04_s06','h03_s07']:
 p=out.parent/lane;k=json.loads((p/'keyframes.json').read_text());picks=k['picks'];sheet=Image.new('RGB',(1520,len(picks)*470),'#F4EFE6');d=ImageDraw.Draw(sheet)
 for i,pick in enumerate(picks):
  name=pick['name'];im=Image.open(p/'stills'/f"t_{pick['t']:06.2f}.png").convert('RGB');im.save(p/(name+'.png'))
  if name=='s27_crossing':box=(1165,400,1285,520)
  elif name.startswith('s27'):box=(1110,370,1410,670)
  elif name.startswith('s23'):box=(1080,330,1380,630)
  else:box=(1120,480,1420,780) if lane=='h03_s07' else (1280,370,1580,670)
  crop=im.crop(box);detail=crop.resize((crop.width*2,crop.height*2),Image.Resampling.NEAREST);detail.save(p/(name+'_200pct.png'))
  y=i*470;sheet.paste(im.resize((768,432)),(0,y+32));show=detail.copy();show.thumbnail((700,420));sheet.paste(show,(800,y+35));d.text((10,y+3),name,font=font,fill='#2A2A35')
 sheet.save(p/'review_sheet.png')
p=out.parent/'h03_s07';a=Image.open(p/'s25_fluid.png');b=Image.open(p/'s30_exudation.png');box=(900,490,1650,870)
comp=Image.new('RGB',(1500,420),'#F4EFE6');comp.paste(a.crop(box),(0,40));comp.paste(b.crop(box),(750,40));d=ImageDraw.Draw(comp);d.text((10,5),'s25',font=font,fill='black');d.text((760,5),'s30',font=font,fill='black');comp.save(out/'s25_vs_s30.png')
# Crop only: same screen magnification on the left, reference left panel on the right.
wbc=Image.open(p/'s27_crossing_200pct.png');sample=Image.open(ROOT/'qa/ref/style_target/sample_zoom.png').crop((16,16,616,496));comp=Image.new('RGB',(880,530),'#F4EFE6');comp.paste(wbc,(10,70));comp.paste(sample,(270,40));d=ImageDraw.Draw(comp);d.text((10,5),'S07 200%',font=font,fill='black');d.text((280,5),'sample_zoom 左图（原尺寸）',font=font,fill='black');comp.save(out/'wbc_vs_sample.png')
report={}
for name in ['s25_fluid','s30_exudation']:
 im=np.array(Image.open(p/(name+'.png')).convert('RGB'));area=im[520:820,1050:1500];report[name]={'mean_RGB':area.mean(axis=(0,1)).tolist(),'mean_luma':float((area@np.array([.2126,.7152,.0722])).mean())}
old=np.array(Image.open(io.BytesIO(subprocess.check_output(['git','show','HEAD:qa/v6/h03_s07/s25_fluid.png'],cwd=ROOT))).convert('RGB'))[520:820,1050:1500]
report['baseline_s25']={'mean_luma':float((old@np.array([.2126,.7152,.0722])).mean())}
(out/'visual_metrics.json').write_text(json.dumps(report,indent=2))
