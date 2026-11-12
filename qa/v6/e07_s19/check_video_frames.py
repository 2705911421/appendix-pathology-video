from pathlib import Path
import json,subprocess
from PIL import Image
import numpy as np
P=Path(__file__).resolve().parent;k=json.loads((P/'keyframes.json').read_text());r={}
for q in k['picks']:
 if q['name'] not in ['s69_fibrosis','s70_lymph','s70_plasma']:continue
 t=q['t']+.45
 dest=P/(q['name']+'_video.png')
 subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(P/'S19.mp4'),'-frames:v','1',str(dest)],check=True)
 a=np.array(Image.open(P/(q['name']+'.png')).convert('RGB').crop((960,350,1260,650))).astype(float);b=np.array(Image.open(dest).convert('RGB').crop((960,350,1260,650))).astype(float)
 mae=float(abs(a-b).mean());corr=float(np.corrcoef(a.mean(2).ravel(),b.mean(2).ravel())[0,1]);r[q['name']]={'native_roi':[960,350,1260,650],'video_time':t,'raw_MAE':mae,'grayscale_correlation':corr,'note':'Lossy JPEG95 + CRF16 and iris re-encode; not lossless parity. Structural identity criterion correlation>0.95.'};assert corr>.95,(q['name'],mae,corr)
(P/'video_frame_parity.json').write_text(json.dumps(r,indent=2));print(r)
