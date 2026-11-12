from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import math,json,numpy as np
P=Path(__file__).resolve().parent
im=Image.open(P/'s37_open_low.png').convert('RGB');a=np.asarray(im).astype(float)
def point(x,y):
 t=x/620-math.pi/2;r=640+y+12*math.sin(t*3)+9*math.sin(t*5);u=1.6*math.cos(t)*r;v=math.sin(t)*r
 return (1110+.5*(u*math.cos(.4)-v*math.sin(.4)-120),475+.5*(u*math.sin(.4)+v*math.cos(.4)-120))
reports=[]
maskall=Image.new('1',im.size)
for k in range(-1,4):
 pts=[point(k*840+x,-290+3*math.sin(x*.045)) for x in range(-98,99,2)]
 if not all((x-1110)**2+(y-475)**2<410**2 for x,y in pts):continue
 mask=Image.new('1',im.size);ImageDraw.Draw(mask).line(pts,fill=1,width=15);m=np.array(mask,dtype=bool)
 purple=(a[:,:,0]<165)&(a[:,:,1]<135)&(a[:,:,2]>a[:,:,1]*1.08)
 ratio=float(purple[m].mean()*100);reports.append({'repeat':k,'purple_percent':ratio,'pixels':int(m.sum()),'nominal_perimeter_percent':220/(620*math.tau)*100})
 ImageDraw.Draw(maskall).line(pts,fill=1,width=15)
maskall.save(P/'gap_sampling_mask.png');(P/'gap_metrics.json').write_text(json.dumps(reports,indent=2));print(reports);assert len(reports)>=2 and all(r['purple_percent']<5 for r in reports)
