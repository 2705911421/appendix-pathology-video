from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,subprocess
P=Path(__file__).resolve().parent
font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',24)
for scene,old in [('s06','h04_s06'),('s07','h03_s07')]:
 k=json.loads((P/(scene+'_keyframes.json')).read_text());d=P/scene;d.mkdir(exist_ok=True)
 sheet=Image.new('RGB',(1600,480*len(k['picks'])),'#F4EFE6');dr=ImageDraw.Draw(sheet)
 comp=Image.new('RGB',(1600,490*len(k['picks'])),'#F4EFE6');cd=ImageDraw.Draw(comp)
 for i,p in enumerate(k['picks']):
  name=p['name'];im=Image.open(d/(name+'.png')).convert('RGB');before=Image.open(P.parent/old/(name+'.png')).convert('RGB')
  if name.startswith('s27'):box=(1100,355,1340,575)
  elif name=='s28_defense':box=(1410,545,1580,745)
  elif name=='s29_injury':box=(1460,650,1700,890)
  elif name=='s30_exudation':box=(1390,560,1610,780)
  elif name.startswith('s23'):box=(1080,330,1380,630)
  else:box=(1100,475,1400,775) if scene=='s07' else (1280,370,1580,670)
  detail=im.crop(box).resize(((box[2]-box[0])*2,(box[3]-box[1])*2));detail.save(d/(name+'_200pct.png'))
  y=i*480;sheet.paste(im.resize((800,450)),(0,y+30));small=detail.copy();small.thumbnail((760,445));sheet.paste(small,(820,y+30));dr.text((10,y),name,font=font,fill='#2A2A35')
  y=i*490;comp.paste(before.resize((800,450)),(0,y+35));comp.paste(im.resize((800,450)),(800,y+35));cd.text((10,y),name+' 修正前',font=font,fill='black');cd.text((810,y),'修正后',font=font,fill='black')
 sheet.save(d/'review_sheet.png');comp.save(d/'修正前后对比.png')
 # Original voiced deliverables: decode at each sentence pick for independent timing review.
 out=P/('原片_'+scene);out.mkdir(exist_ok=True)
 for p in k['picks']:
  subprocess.run(['ffmpeg','-v','error','-y','-threads','1','-ss',str(p['t']),'-i',str(P.parent/old/(scene.upper()+'_带配音_720p.mp4')),'-frames:v','1','-threads','1',str(out/(p['name']+'.png'))],check=True)
items=[]
for scene in ['s06','s07']:
 for p in json.loads((P/(scene+'_keyframes.json')).read_text())['picks']:items.append((scene,p['name']))
sheet=Image.new('RGB',(1920,310*((len(items)+3)//4)),'#F4EFE6');dr=ImageDraw.Draw(sheet)
for i,(scene,name) in enumerate(items):
 x=i%4*480;y=i//4*310;sheet.paste(Image.open(P/scene/(name+'.png')).resize((480,270)),(x,y+36));dr.text((x+8,y+4),scene.upper()+' '+name,font=font,fill='#2A2A35')
sheet.save(P/'review_sheet.png')
