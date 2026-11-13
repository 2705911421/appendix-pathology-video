#!/usr/bin/env python3
# Compare baseline (8560137 s13) vs restored s13r at key frames; measure circle-masked MAE
import sys,json
from pathlib import Path
import numpy as np
from PIL import Image

def masked_mae(a_path,b_path,cx,cy,r):
    a,b=np.array(Image.open(a_path)),np.array(Image.open(b_path))
    if a.shape!=b.shape:
        return {'error':'shape_mismatch','a':list(a.shape),'b':list(b.shape)}
    h,w=a.shape[:2]
    y,x=np.ogrid[:h,:w]
    mask=((x-cx)**2+(y-cy)**2)<r**2
    if a.ndim==3:mask=np.repeat(mask[...,None],3,axis=2)
    a_m,b_m=a[mask],b[mask]
    mae=np.mean(np.abs(a_m.astype(float)-b_m.astype(float)))
    return {'mae':round(mae,6),'pixels':int(mask.sum()//(1 if a.ndim==2 else 3))}

# S13 circle center/radius (from s13r.js):  wx=1432, wy=452, wr=350
out_dir=Path(sys.argv[1])
base_dir,rev_dir=out_dir/'base',out_dir/'reverted'
times=['219.402','221.096','224.833']
cx,cy,r=1432,452,350

result=[]
for t in times:
    base,rev=base_dir/f't{t}.png',rev_dir/f't{t}.png'
    m=masked_mae(base,rev,cx,cy,r)
    result.append({'t':float(t),'base':str(base),'reverted':str(rev),**m})
    print(f't={t} MAE={m.get("mae","ERR")}')
(out_dir/'compare_mae.json').write_text(json.dumps(result,indent=1))
