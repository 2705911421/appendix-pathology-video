from pathlib import Path
import subprocess,json,math
import numpy as np
from PIL import Image
P=Path('qa/v6/a02');metrics=json.load(open(P/'boundary_metrics.json'));src=P.parent/'e12_s19/S19.mp4'; checks=[]
patch=next(p for p in json.load(open(P/'coverage.json'))['patches'] if p['scene']=='s19');sf=math.ceil(patch['start']*30);ef=math.ceil(patch['end']*30);n=json.load(open(P.parent/'e12_s19/video_check.json'))['frames']
for frame,candidates in [(sf,[0,1]),(ef-1,[n-2,n-1])]:
 a=np.asarray(Image.open(P/'boundaries'/f'{frame:05}.png').convert('RGB'),dtype=np.int16)[:948]
 maes=[]
 for f in candidates:
  out=P/f'iris_source_{f}.png';subprocess.run(['ffmpeg','-v','error','-threads','1','-y','-i',str(src),'-vf',f'select=eq(n\\,{f})','-frames:v','1','-threads','1',str(out)],check=True);b=np.asarray(Image.open(out).convert('RGB'),dtype=np.int16)[:948];maes.append(float(np.abs(a-b).mean()))
 best=min(maes);assert best<.5,(frame,maes);checks.append({'frame':frame,'source_candidates':candidates,'MAE':maes,'expected_iris_dark':True})
for m in metrics:
 m['expected_iris_dark']=m['frame'] in [sf,ef-1];m['no_unexpected_blank']=m['not_blank'] or m['expected_iris_dark']
assert all(m['no_unexpected_blank'] for m in metrics)
(P/'boundary_metrics.json').write_text(json.dumps(metrics,indent=2));(P/'iris_boundary_verification.json').write_text(json.dumps(checks,indent=2));print(checks)
