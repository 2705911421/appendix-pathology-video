from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json,hashlib,math
out=Path(__file__).resolve().parent;root=out.parents[2];base=out.parent/'b05'
font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',24)
times=[1,3.8,9,15,21,27,33];names=['low','mid','high_s30','high_s31','high_s32','high_s33','high_s34']
rows=[]
for t,name in zip(times,names):
 im=Image.open(out/f't_{t:06.2f}.png').convert('RGB');im.save(out/f's08_{name}.png')
 if t in [3.8,9,15,21,27]:
  a=np.array(Image.open(base/f't_{t:06.2f}.png').convert('RGB')).astype(float);b=np.array(im).astype(float);rows.append({'t':t,'MAE':float(np.abs(a-b).mean()),'pass':bool(np.abs(a-b).mean()<.5)})
# Same annular ROI for every version; CIE L* D65 from linear sRGB.
mask=Image.new('1',(1920,1080));d=ImageDraw.Draw(mask)
for y,fill in [(-150,1),(-290,0)]:
 pts=[]
 for i in range(720):
  a=i/720*math.tau;r=(390 if y==-150 else 170)+12*math.sin(a*3)+9*math.sin(a*5)+22*math.sin(a*4+.7);u=1.6*math.cos(a)*r;v=math.sin(a)*r;rot=math.pi/6
  pts.append((1110+.576*(u*math.cos(rot)-v*math.sin(rot)),475+.576*(u*math.sin(rot)+v*math.cos(rot))))
 d.polygon(pts,fill=fill)
roi=np.array(mask).astype(bool);mask.save(out/'mucosa_ROI.png');Ls={}
for label,folder in [('b05',base),('g01',out.parent/'g01'),('b07',out)]:
 a=np.array(Image.open(folder/'t_001.00.png').convert('RGB')).astype(float)/255;s=np.where(a<=.04045,a/12.92,((a+.055)/1.055)**2.4);Y=s@np.array([.2126729,.7151522,.072175]);L=116*np.where(Y>.008856,np.cbrt(Y),7.787*Y+16/116)-16;Ls[label]=float(L[roi].mean())
for title,t,crop in [('低倍_b05_vs_b07',1,(820,230,1190,430)),('s34_b05_vs_b07',33,(880,395,1290,565))]:
 sheet=Image.new('RGB',(1920,540+70+(crop[3]-crop[1])*2),'#111114');d=ImageDraw.Draw(sheet)
 for i,folder in enumerate([base,out]):
  im=Image.open(folder/f't_{t:06.2f}.png').convert('RGB');sheet.paste(im.resize((960,540)),(i*960,35));detail=im.crop(crop).resize(((crop[2]-crop[0])*2,(crop[3]-crop[1])*2));sheet.paste(detail,(i*960+30,610));d.text((i*960+25,3),['b05','b07'][i]+' / 下方 200% 局部',font=font,fill='white')
 sheet.save(out/(title+'.png'))
review=Image.new('RGB',(1920,1592),'#111114');d=ImageDraw.Draw(review)
for i,(t,name) in enumerate(zip(times,names)):
 x=i%2*960;y=i//2*398;review.paste(Image.open(out/f't_{t:06.2f}.png').resize((640,360)),(x+160,y+34));d.text((x+24,y+3),f'{name} · {t}s',font=font,fill='white')
review.save(out/'review_sheet.png')
(out/'metrics.json').write_text(json.dumps({'MAE':rows,'mucosa_CIE_L_star':Ls},indent=2))
assert all(r['pass'] for r in rows)
print(json.dumps({'MAE':rows,'L':Ls},indent=2))
