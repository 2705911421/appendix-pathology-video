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
P=Path(__file__).resolve().parent

def count(path,box):
 a=np.array(Image.open(path).convert('RGB').crop(box)).astype(float);m=(a[:,:,0]<135)&(a[:,:,1]<110)&(a[:,:,2]>a[:,:,0]*1.1)
 l,n=label(m);out={'small':[],'spindle':[],'other':[]}
 for i,s in enumerate(find_objects(l),1):
  y,x=s;w=x.stop-x.start;h=y.stop-y.start;area=int((l[s]==i).sum())
  if area<4:continue
  kind='spindle' if max(w,h)>=15 and max(w,h)/min(w,h)>2 else 'small' if max(w,h)<=14 else 'other'
  out[kind].append([x.start+box[0],y.start+box[1],w,h,area])
 return {'counts':{k:len(v) for k,v in out.items()},'profiles':out}
r={'method':'Native RGB R<135 G<110 B>1.1R; four connected components area>=4; spindle long>=15 aspect>2; small long<=14; boundary included. Acute reference counts nuclear profiles, not whole cells. Fused nuclei undercounted.','roi_reference':[400,460,700,760],'roi_output':[960,350,1260,650]}
r['reference']=count('qa/ref/style_target/t_089.73.png',r['roi_reference'])
for ver in ['e06','e07']:
 for name in ['s70_lymph','s69_fibrosis']:
  path=P.parent/(ver+'_s19')/(name+'.png')
  if path.exists():
   q=count(path,r['roi_output']);q['relative_error']={k:q['counts'][k]/r['reference']['counts'][k]-1 for k in ['small','spindle']};r[ver+'_'+name]=q
(P/'density_measurements.json').write_text(json.dumps(r,indent=2,default=int));print({k:{a:b for a,b in v.items() if a!='profiles'} for k,v in r.items() if isinstance(v,dict)})
from PIL import ImageDraw
for key,path,box in [('reference','qa/ref/style_target/t_089.73.png',r['roi_reference']),('e07_s70_lymph',P/'s70_lymph.png',r['roi_output']),('e07_s69_fibrosis',P/'s69_fibrosis.png',r['roi_output'])]:
 im=Image.open(path).convert('RGB').crop(box).resize((900,900));dr=ImageDraw.Draw(im)
 for kind in ['small','spindle']:
  for x,y,w,h,a in r[key]['profiles'][kind]:dr.rectangle(((x-box[0])*3,(y-box[1])*3,(x+w-box[0])*3,(y+h-box[1])*3),outline='#60c080' if kind=='small' else '#4080ff',width=1)
 im.save(P/('density_audit_'+key+'.png'))
