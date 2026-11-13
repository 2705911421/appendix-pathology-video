from pathlib import Path
import hashlib,json,numpy as np
from PIL import Image
P=Path(__file__).resolve().parent
a=np.array(Image.open('qa/ref/style_target/t_089.73.png').convert('RGB'))[460:690,400:800].astype(float);m=(a[:,:,2]>a[:,:,0]*1.1)&(a[:,:,0]<135)&(a[:,:,1]<110);out={'source':'qa/ref/style_target/t_089.73.png','method':'Native RGB threshold R<135,G<110,B>1.1R; 4-connected bbox; boundary-touching profiles excluded; lymph-like profiles only (reference is acute tissue)','lymph':[],'spindle':[]}
for y,x in zip(*np.where(m)):
 if not m[y,x]:continue
 stack=[(y,x)];m[y,x]=False;pts=[]
 while stack:
  yy,xx=stack.pop();pts.append((yy,xx))
  for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)]:
   ny,nx=yy+dy,xx+dx
   if 0<=ny<m.shape[0] and 0<=nx<m.shape[1] and m[ny,nx]:m[ny,nx]=False;stack.append((ny,nx))
 ys,xs=zip(*pts)
 if min(xs)==0 or min(ys)==0 or max(xs)==m.shape[1]-1 or max(ys)==m.shape[0]-1:continue
 w=max(xs)-min(xs)+1;h=max(ys)-min(ys)+1;q={'bbox':[min(xs)+400,min(ys)+460,max(xs)+401,max(ys)+461],'long_px':max(w,h),'short_px':min(w,h)}
 if 3<=min(w,h)<=7 and max(w,h)<=9 and max(w,h)/min(w,h)<1.9 and len(out['lymph'])<15:out['lymph'].append(q)
 if 15<=w<=50 and 2<=h<=7 and w/h>4 and len(out['spindle'])<8:out['spindle'].append(q)
for kind in ['lymph','spindle']:out[kind+'_mean']={k:float(np.mean([v[k] for v in out[kind]])) for k in ['long_px','short_px']}
(P/'cell_measurements.json').write_text(json.dumps(out,indent=2,default=int));print(out)
