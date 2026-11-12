from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
P=Path(__file__).resolve().parent
im=Image.open(P/'s40.png').convert('RGB').crop((880,280,1280,540)).resize((800,520),Image.Resampling.NEAREST)
out=Image.new('RGB',(800,630),'#17151b');out.paste(im,(0,70));d=ImageDraw.Draw(out);f=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',23)
d.text((18,15),'句40 · 200% 成分自查（不进成片）',font=f,fill='white')
for box,label,col in [((350,380,422,457),'脓细胞','#782580'),((292,399,348,477),'碎屑','#A64A39'),((140,330,245,400),'渗出液','#35716C')]:
 d.rectangle(box,outline=col,width=3);x,y=box[:2];d.text((x,max(72,y-30)),label,font=f,fill=col)
d.text((18,595),'框内依次可辨：固缩核、淡染残片、柔边淡粉液体',font=f,fill='white');out.save(P/'s40_成分自查.png')
