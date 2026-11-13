from pathlib import Path
from PIL import Image
import numpy as np,json
def label(m):
 l=np.zeros(m.shape,dtype=int);n=0
 for y,x in zip(*np.where(m)):
  if l[y,x]:continue
  n+=1;stack=[(y,x)];l[y,x]=n
  while stack:
   yy,xx=stack.pop()
   for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)]:
    ny,nx=yy+dy,xx+dx
    if 0<=ny<m.shape[0] and 0<=nx<m.shape[1] and m[ny,nx] and not l[ny,nx]:l[ny,nx]=n;stack.append((ny,nx))
 return l,n
def find_objects(l):
 out=[]
 for i in range(1,l.max()+1):
  y,x=np.where(l==i);out.append((slice(y.min(),y.max()+1),slice(x.min(),x.max()+1)))
 return out

P=Path(__file__).resolve().parent;out={}
for v in ['e07_s19','e08_s19']:
 a=np.array(Image.open(P.parent/v/'s70_lymph.png').crop((800,200,1420,750)).convert('RGB'),dtype=float)
 mask=(a[:,:,0]<145)&(a[:,:,1]<110)&(a[:,:,2]>a[:,:,0])
 lab,n=label(mask);rounds=[];spindles=[]
 for sl in find_objects(lab):
  if sl is None:continue
  sub=mask[sl];yy,xx=np.where(sub);area=len(xx)
  if area<6:continue
  cov=np.cov(np.array([xx,yy]));ev=np.linalg.eigvalsh(cov);minor,major=4*np.sqrt(np.maximum(ev,0));aspect=major/max(minor,.1)
  if aspect<1.65 and 3<major<13:rounds.append(float(major))
  if aspect>3.8 and 16<major<65:spindles.append(float(major))
 out[v]={'round_n':len(rounds),'spindle_n':len(spindles),'round_major_median':float(np.median(rounds)),'spindle_major_median':float(np.median(spindles)),'spindle_to_round':float(np.median(spindles)/np.median(rounds))}
(P/'spindle_measurements.json').write_text(json.dumps(out,indent=2));print(out)
