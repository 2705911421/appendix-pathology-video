import json,subprocess,pathlib
import numpy as np
from PIL import Image
base=pathlib.Path(__file__).resolve().parents[1]
import sys
scene=sys.argv[1];out=base/scene
p=subprocess.Popen(['ffmpeg','-v','error','-threads','1','-i',str(out/(scene.upper()+'.mp4')),'-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
n=0;err=0;bottom=0;bad=[]
while True:
 b=p.stdout.read(1920*1080*3)
 if not b:break
 a=np.frombuffer(b,np.uint8).reshape(1080,1920,3).astype(np.int16);diff=np.abs(a-np.array([244,239,230]));err=max(err,int(diff[810:].max()));ys=np.where(diff.max(2)>16)[0]
 if len(ys):bottom=max(bottom,int(ys.max()))
 if np.any(diff[810:]>16):bad.append(n)
 n+=1
assert p.wait()==0
result={'decoded_frames':n,'content_bottom_threshold16':bottom,'y810_and_below_max_paper_channel_error':err,'bad_frames':bad}
json.dump(result,open(out/'safe_area.json','w'),indent=2);print(result);assert not bad
