from pathlib import Path
import subprocess,json,numpy as np
from PIL import Image
P=Path(__file__).resolve().parent
# Decode the complete scene and check that all newly drawn content stays above y=950.
q=subprocess.Popen(['ffmpeg','-v','error','-i',str(P/'S07.mp4'),'-vf','crop=1920:130:0:950','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
a=[]
while True:
 b=q.stdout.read(1920*130*3)
 if not b:break
 im=np.frombuffer(b,np.uint8).reshape(130,1920,3).astype(int)
 a.append(int(abs(im-np.array([244,239,230])).max()))
assert q.wait()==0
# CRF16 paper has a small uniform YUV conversion offset; no structure may enter this band.
assert max(a)<=5,max(a)
(P/'safe_area.json').write_text(json.dumps({'decoded_frames':len(a),'y950_and_below_max_paper_channel_error':max(a)},indent=2))
print('Safe area passed',len(a),'frames',max(a))
