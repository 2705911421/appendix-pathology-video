from pathlib import Path
import subprocess,json,numpy as np
P=Path(__file__).resolve().parent;r={}
for lane,scene in [('h04_s06','S06'),('h03_s07','S07')]:
 f=P.parent/lane/(scene+'.mp4');q=subprocess.Popen(['ffmpeg','-v','error','-threads','1','-i',str(f),'-vf','crop=1920:130:0:950','-threads','1','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
 errors=[]
 while True:
  b=q.stdout.read(1920*130*3)
  if not b:break
  a=np.frombuffer(b,np.uint8).reshape(130,1920,3).astype(int);errors.append(int(abs(a-np.array([244,239,230])).max()))
 assert q.wait()==0
 assert max(errors)<=5,(scene,max(errors))
 r[scene]={'frames':len(errors),'below_y950_max_error':max(errors)}
(P/'scene_verification.json').write_text(json.dumps(r,indent=2));print(r)
