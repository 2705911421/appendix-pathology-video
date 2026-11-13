import subprocess,sys,io
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
scene,key=sys.argv[1],sys.argv[2]
p=Path('qa/v6/ct')/scene
old=Image.open(io.BytesIO(subprocess.check_output(['git','show',f'baf3b0f:qa/v6/ct/{scene}/{key}.png']))).convert('RGB')
new=Image.open(p/(key+'.png')).convert('RGB')
W,H=960,540
old=old.resize((W,H),Image.LANCZOS);new=new.resize((W,H),Image.LANCZOS)
canvas=Image.new('RGB',(1920,620),'#F4EFE6');d=ImageDraw.Draw(canvas)
font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',34,index=0)
d.text((20,14),'改前（r2）',font=font,fill='#6B4C9A')
d.text((980,14),'改后（r3 / Codex）',font=font,fill='#6B4C9A')
canvas.paste(old,(0,70));canvas.paste(new,(960,70))
d.rectangle((958,70,962,610),fill='#E2D8E8')
canvas.save(p/'before_after.png')
print(p/'before_after.png')
