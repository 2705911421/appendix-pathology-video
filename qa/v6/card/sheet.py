from PIL import Image,ImageDraw
import json,sys,os
p=sys.argv[1];picks=json.load(open(p+'/keyframes.json'))['picks']
w=640;h=390;sheet=Image.new('RGB',(w*3,h*((len(picks)+2)//3)), '#e5ded4');d=ImageDraw.Draw(sheet)
for i,q in enumerate(picks):
 im=Image.open(p+'/'+q['name']+'.png').convert('RGB');im.crop((620,150,1900,940)).resize((2560,1580)).save(p+'/'+q['name']+'_200pct.png');im.thumbnail((640,360));x=(i%3)*w;y=(i//3)*h;sheet.paste(im,(x,y));d.text((x+12,y+366),q['name'],fill='#302b36')
sheet.save(p+'/review_sheet.png')
