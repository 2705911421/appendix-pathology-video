"""Supplement the historical bbox metric with orientation-corrected nuclear axes."""
from pathlib import Path
import json,numpy as np
from PIL import Image
P=Path(__file__).resolve().parent;m=json.loads((P/'cell_measurements.json').read_text())
def axes(path,profiles):
 a=np.array(Image.open(path).convert('RGB')).astype(float);out=[]
 for q in profiles:
  x,y,x1,y1=q['bbox'];b=a[y:y1,x:x1];mask=(b[:,:,0]<135)&(b[:,:,1]<110)&(b[:,:,2]>b[:,:,0]*1.1)
  yy,xx=np.where(mask);pts=np.stack([xx,yy],axis=1).astype(float)
  if len(pts)<4:continue
  pts-=pts.mean(0);_,v=np.linalg.eigh(np.cov(pts.T));proj=pts@v
  # Pixel-support width along the principal directions, not ellipse fitted diameter.
  ext=np.ptp(proj,axis=0)+np.abs(v).sum(axis=0)
  out.append({'bbox':q['bbox'],'major_px':float(ext[1]),'transverse_px':float(ext[0])})
 return {'n':len(out),'mean_major_px':float(np.mean([q['major_px'] for q in out])),'mean_transverse_px':float(np.mean([q['transverse_px'] for q in out])),'profiles':out}
m['oriented_axes_method']='PCA principal direction of thresholded pixels within each accepted bbox; projected extent plus projected unit-pixel support. Transverse width includes curvature, not minimum local nuclear thickness. Same threshold and native resolution.'
m['reference_spindle_axes']=axes('qa/ref/style_target/t_089.73.png',m['spindle'])
for ver in ['e06','e07']:
 m[ver+'_spindle_axes']=axes(P.parent/(ver+'_s19')/'s70_lymph.png',m[ver+'_spindle']['profiles'])
(P/'cell_measurements.json').write_text(json.dumps(m,ensure_ascii=False,indent=2))
print({k:v for k,v in m.items() if k.endswith('_axes') for v in [{a:b for a,b in v.items() if a!='profiles'}]})
