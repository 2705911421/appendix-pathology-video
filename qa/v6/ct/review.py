import sys,json
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
p=Path('qa/v6/ct')/sys.argv[1]
picks=json.load(open(p/'keyframes.json'))['picks']
files=sorted((p/'stills').glob('*.png'))
# Renderer filenames are sequential padded frame indices.
files=[f for f in files if 'sheet' not in f.name]
sheet=Image.new('RGB',(960,310*((len(picks)+1)//2)), '#F4EFE6');d=ImageDraw.Draw(sheet)
for i,(f,pick) in enumerate(zip(files,picks)):
 im=Image.open(f).convert('RGB');im.save(p/(pick['name']+'.png'))
 if sys.argv[1]=='S04':
  box=(950,200,1450,550) if int(pick['name'][1:3])<=15 else (1100,330,1600,680)
  im.crop(box).resize((1000,700)).save(p/(pick['name']+'_200.png'))
  im.crop((60,150,560,500)).resize((1000,700)).save(p/(pick['name']+'_sidebar_200.png'))
 else:
  im.crop((610,350,1110,700)).resize((1000,700)).save(p/(pick['name']+'_200.png'))
  im.crop((1280,330,1780,680)).resize((1000,700)).save(p/(pick['name']+'_tissue_200.png'))
 sheet.paste(im.resize((480,270)),((i%2)*480,(i//2)*310));d.text(((i%2)*480+12,(i//2)*310+276),pick['name'],fill='#2A2A35')
sheet.save(p/'review_sheet.png')
