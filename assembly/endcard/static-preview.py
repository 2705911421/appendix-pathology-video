"""Fallback layout proof only. The production screenshot renderer is render.mjs."""
import io,json,math,random
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageFilter
from fontTools.ttLib import TTFont
ROOT=Path(__file__).resolve().parent
D=json.loads((ROOT/'data/endcard.json').read_text()); L=D['layout']; C=D['colors']
fonts={};coverage={}
for w,name in [(400,'Regular'),(700,'Bold')]:
 f=TTFont(ROOT/f'fonts/MixSans-{name}.woff2');coverage[w]=set(f.getBestCmap());f.flavor=None;b=io.BytesIO();f.save(b);fonts[w]=b.getvalue()
def font(size,weight=400):return ImageFont.truetype(io.BytesIO(fonts[700 if weight==700 else 400]),size)
measure=[]
def runs(s,size,weight):
 result=[]
 for char in s:
  fallback=ord(char) not in coverage[700 if weight==700 else 400]
  if result and result[-1][0]==fallback:result[-1][1]+=char
  else:result.append([fallback,char])
 return [(ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-'+('Bold' if weight==700 else 'Regular')+'.ttc',size) if fb else font(size,weight),v) for fb,v in result]
def text(im,s,x,y,size,weight=400,alpha=1,center=False,color=None):
 parts=runs(s,size,weight);length=sum(f.getlength(v) for f,v in parts)
 if center:x-=length/2
 layer=Image.new('RGBA',im.size);dr=ImageDraw.Draw(layer);bounds=[]
 for f,v in parts:
  bounds.append(dr.textbbox((x,y),v,font=f,anchor='ls'));dr.text((x,y),v,font=f,anchor='ls',fill=(*bytes.fromhex((color or C['ink'])[1:]),int(255*alpha)));x+=f.getlength(v)
 box=(min(b[0] for b in bounds),min(b[1] for b in bounds),max(b[2] for b in bounds),max(b[3] for b in bounds));measure.append((s,box));im.alpha_composite(layer)
def heading(im,s,y):
 dr=ImageDraw.Draw(im);dr.rectangle((L['x'],y-24,L['x']+32,y-20),fill=C['red']);text(im,s,L['x']+50,y,30,700,color=C['red'])
def base():
 im=Image.new('RGBA',(1920,1080),C['paper']); wash=Image.new('RGBA',im.size);dr=ImageDraw.Draw(wash)
 for x,y,r in [(175,95,255),(1735,800,210)]:
  for radius in range(r,0,-3):dr.ellipse((x-radius,y-radius,x+radius,y+radius),fill=(214,69,58,int(22*(1-radius/r)**2)))
 im.alpha_composite(wash.filter(ImageFilter.GaussianBlur(9)));dr=ImageDraw.Draw(im);x,y,w,h=L['frame'];rng=random.Random(71)
 for offset in [0,1]:
  pts=[(x+rng.uniform(-1,1),y+rng.uniform(-1,1)),(x+w+rng.uniform(-1,1),y+rng.uniform(-1,1)),(x+w+rng.uniform(-1,1),y+h+rng.uniform(-1,1)),(x+rng.uniform(-1,1),y+h+rng.uniform(-1,1))];dr.line(pts+[pts[0]],fill=(42,42,53,180),width=1)
 return im
A=base();text(A,D['titleLines'][0],960,L['titleY'],48,700,center=True);text(A,D['titleLines'][1],960,L['subtitleY'],32,alpha=.75,center=True)
heading(A,D['creationHeading'],L['aHeadingY']);text(A,D['intro'],L['x'],L['introY'],27)
cell_y=L['cellY']
for lines in D['cells']:
 for j,s in enumerate(lines):text(A,s,L['x']+(20 if j else 0),cell_y+j*L['bodyLeading'],L['bodySize'])
 cell_y+=L['cellRow']+(len(lines)-1)*L['bodyLeading']
for i,s in enumerate(D['notes']):text(A,s,L['x'],L['notesY']+i*L['bodyLeading'],25,alpha=.8)
B=base();heading(B,D['musicHeading'],L['musicHeadingY'])
for i,s in enumerate(D['music']):text(B,s,L['x'],L['musicY']+i*L['musicLeading'],26,alpha=.75 if i==1 else 1)
heading(B,D['refsHeading'],L['refsHeadingY']);y=L['refsY']
for i,r in enumerate(D['references']):
 assert ' '.join(r['lines'])==r['verbatim']
 for j,s in enumerate(r['lines']):text(B,s,L['x']+(L['hanging'] if j else 0),y,L['refSize']);last=y;y+=L['refLeading']
 if i==1:text(B,D['pending'],L['x']+L['hanging'],y,L['refSize'],alpha=.75);y+=L['refLeading']
 y+=L['refGap']
for s,b in measure:
 assert b[0]>=190 and b[2]<=1720 and b[3]<810,(s,b)
print('Reference size:',L['refSize'],'last baseline:',last,'last descent:',measure[-1][1][3]);print('Text bounds passed:',len(measure))
for i,im in enumerate([A,B]):
 text(im,D['captions'][i],L['captionX'],L['captionY'],L['captionSize'],alpha=.65)
 text(im,D['previewLabel'],1250,L['previewLabelY'],20,alpha=.6)
sheet=Image.new('RGB',(1920,2160));sheet.paste(A.convert('RGB'),(0,0));sheet.paste(B.convert('RGB'),(0,1080));sheet.save(ROOT/'样帧_片尾.png')
