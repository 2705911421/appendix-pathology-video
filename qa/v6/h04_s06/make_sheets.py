from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',24)
for folder in ['h04_s06','h03_s07']:
 p=Path('qa/v6')/folder;k=json.loads((p/'keyframes.json').read_text());sheet=Image.new('RGB',(1700,len(k['picks'])*650),'#F4EFE6');d=ImageDraw.Draw(sheet)
 for i,f in enumerate(k['picks']):
  im=Image.open(p/'stills'/f"t_{f['t']:06.2f}.png").convert('RGB');im.save(p/(f['name']+'.png'));box=(1100,345,1400,645) if folder=='h04_s06' else (1080,365,1380,665);detail=im.crop(box).resize((600,600));detail.save(p/(f['name']+'_200pct.png'));sheet.paste(im.resize((960,540)),(0,i*650+50));sheet.paste(detail,(1080,i*650+40));d.text((20,i*650+4),f['name'],font=font,fill='#2A2A35')
 sheet.save(p/'review_sheet.png')
p=Path('qa/v6/h04_s06');out=Image.new('RGB',(1920,2*1190),'#F4EFE6');d=ImageDraw.Draw(out)
for i,name in enumerate(['s24_before','s24_after']):
 for j,folder in enumerate(['h02_s06','h04_s06']):
  q=Path('qa/v6')/folder;im=Image.open(q/(name+'.png'));out.paste(im.resize((960,540)),(j*960,i*1190+45));detail=im.crop((1100,345,1400,645)).resize((600,600));out.paste(detail,(j*960+160,i*1190+585));d.text((j*960+20,i*1190+5),folder+' '+name+' / 200%',font=font,fill='#2A2A35')
out.save(p/'对比_h02_h04.png')
