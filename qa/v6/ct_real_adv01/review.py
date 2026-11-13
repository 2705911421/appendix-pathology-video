import sys,json
from pathlib import Path
from PIL import Image,ImageDraw
scene=sys.argv[1];p=Path('qa/v6/ct_real_adv01')/scene
picks=json.load(open(p/'keyframes.json'))['picks']
files=sorted((p/'stills').glob('*.png'))
files=[f for f in files if 'sheet' not in f.name]
sheet=Image.new('RGB',(960,310*((len(picks)+1)//2)),'#F4EFE6');d=ImageDraw.Draw(sheet)

def crop2(im,box,name):
    w=box[2]-box[0];h=box[3]-box[1]
    im.crop(box).resize((w*2,h*2),Image.LANCZOS).save(p/name)

for i,(f,pick) in enumerate(zip(files,picks)):
    im=Image.open(f).convert('RGB');im.save(p/(pick['name']+'.png'))
    n=int(pick['name'][1:3])
    if scene=='S04':
        if n==14:
            crop2(im,(760,260,1340,940),pick['name']+'_200.png')
        elif n==15:
            crop2(im,(760,240,1760,940),pick['name']+'_200.png')
        elif n<=18:
            crop2(im,(850,250,1510,800),pick['name']+'_200.png')
        else:
            crop2(im,(560,220,1880,960),pick['name']+'_200.png')
        crop2(im,(40,140,540,760),pick['name']+'_sidebar_200.png')
    else:
        crop2(im,(610,125,1870,850),pick['name']+'_200.png')

    sheet.paste(im.resize((480,270),Image.LANCZOS),((i%2)*480,(i//2)*310))
    d.text(((i%2)*480+12,(i//2)*310+276),pick['name'],fill='#2A2A35')
sheet.save(p/'review_sheet.png')
print('review_sheet',scene,len(picks))
