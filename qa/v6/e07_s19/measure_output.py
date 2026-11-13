from pathlib import Path
import json,numpy as np
from PIL import Image
P=Path(__file__).resolve().parent

def measure(path,lo,hi,box=(960,350,1260,650),spindle=False):
 a=np.array(Image.open(path).convert('RGB').crop(box)).astype(float);m=(a[:,:,2]>a[:,:,0]*1.1)&(a[:,:,0]<135)&(a[:,:,1]<110);found=[]
 for y,x in zip(*np.where(m)):
  if not m[y,x]:continue
  stack=[(y,x)];m[y,x]=False;pts=[]
  while stack:
   yy,xx=stack.pop();pts.append((yy,xx))
   for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)]:
    ny,nx=yy+dy,xx+dx
    if 0<=ny<m.shape[0] and 0<=nx<m.shape[1] and m[ny,nx]:m[ny,nx]=False;stack.append((ny,nx))
  ys,xs=zip(*pts);w=int(max(xs)-min(xs)+1);h=int(max(ys)-min(ys)+1)
  if min(xs)==0 or min(ys)==0 or max(xs)==m.shape[1]-1 or max(ys)==m.shape[0]-1:continue
  if lo<=min(w,h) and max(w,h)<=hi and ((max(w,h)/min(w,h)>2 and max(w,h)>=15) if spindle else max(w,h)/min(w,h)<1.9):found.append({'bbox':[int(min(xs))+box[0],int(min(ys))+box[1],int(max(xs))+box[0]+1,int(max(ys))+box[1]+1],'long_px':max(w,h),'short_px':min(w,h)})
 return {'n':len(found),'mean_long_px':float(np.mean([v['long_px'] for v in found])),'mean_short_px':float(np.mean([v['short_px'] for v in found])),'profiles':found}
m=json.loads((P/'cell_measurements.json').read_text());m['output_method']='Same threshold; isolated compact profiles, same 300x300 native screen ROI; edge-touching objects excluded.'
m['e04_lymph']=measure(P.parent/'e04_s19/s70_lymph.png',12,50)
m['e07_lymph']=measure(P/'s70_lymph.png',2,10)
m['e07_fibrosis_small']=measure(P/'s69_fibrosis.png',2,10)
m['e07_spindle']=measure(P/'s70_lymph.png',2,55,spindle=True)
m['error_fraction']={k:m['e07_lymph']['mean_'+k]/m['lymph_mean'][k]-1 for k in ['long_px','short_px']}
(P/'cell_measurements.json').write_text(json.dumps(m,ensure_ascii=False,indent=2));print({k:v for k,v in m.items() if k in ['error_fraction','lymph_mean']});print(m['e07_lymph']['n'],m['e07_lymph']['mean_long_px'],m['e07_lymph']['mean_short_px'])
