from pathlib import Path
import subprocess,json
from PIL import Image
import numpy as np
P=Path(__file__).resolve().parent;k=json.loads((P/'keyframes.json').read_text());out={}
for q in k['picks']:
 # Scene video precedes the iris edit; compare its nearest encoded frame to the exact still.
 t=round(q['t']*30)/30
 data=subprocess.check_output(['ffmpeg','-threads','1','-v','error','-ss',str(t),'-i',str(P/'S19_scene.mp4'),'-frames:v','1','-f','image2pipe','-vcodec','png','-'])
 import io
 a=np.array(Image.open(io.BytesIO(data)).convert('RGB'),dtype=float);b=np.array(Image.open(P/(q['name']+'.png')).convert('RGB'),dtype=float)
 mae=float(abs(a-b).mean());out[q['name']]={'scene_time':t,'MAE_after_h264':mae};assert mae<4,(q['name'],mae)
(P/'video_frame_parity.json').write_text(json.dumps(out,indent=2));print(out)
for f in ['ffprobe.json','ffprobe_audio_720p.json']:
 d=json.loads((P/f).read_text());print(f,[(s['codec_type'],s.get('width'),s.get('height'),s.get('sample_rate')) for s in d['streams']],d['format']['duration'])
assert any(x['codec_type']=='audio' for x in json.loads((P/'ffprobe_audio_720p.json').read_text())['streams'])
