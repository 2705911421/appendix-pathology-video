from pathlib import Path
import json,subprocess,numpy as np
from PIL import Image
P=Path(__file__).resolve().parent;k=json.loads((P/'keyframes.json').read_text());r={}
for p in k['picks']:
 t=round((k['origin']+p['t'])*30)/30
 data=subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(P.parent/'animatic/粗剪_v9.mp4'),'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-'])
 a=np.frombuffer(data,np.uint8).reshape(1080,1920,3);Image.fromarray(a).save(P/(p['name']+'_final_video.png'))
 b=np.array(Image.open(P/(p['name']+'.png')).convert('RGB'))
 mae=float(abs(a[:900].astype(float)-b[:900].astype(float)).mean());r[p['name']]={'t':t,'MAE_picture_against_lossless_still':mae};assert mae<12,(p,mae)
(P/'insert_check.json').write_text(json.dumps(r,indent=2));print(r)
