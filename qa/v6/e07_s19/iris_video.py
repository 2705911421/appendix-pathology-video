"""S19 only; add cue-relative .7-second irises without assembling the full film."""
from pathlib import Path
import subprocess,json,math
import numpy as np
from PIL import Image
P=Path(__file__).resolve().parent;k=json.loads((P/'keyframes.json').read_text());duration=k['duration'];fps=30;w,h=1920,1080
src=P/'S19_scene.mp4'
if not src.exists():(P/'S19.mp4').rename(src)
dec=subprocess.Popen(['ffmpeg','-v','error','-i',str(src),'-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
enc=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1920x1080','-r','30','-i','-','-an','-c:v','libx264','-crf','16','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart',str(P/'S19.mp4')],stdin=subprocess.PIPE)
y,x=np.mgrid[:h,:w];dist=np.sqrt((x-1110)**2+(y-475)**2).astype('float32');dark=np.array([17,17,20.],dtype='float32')
idx=-1;frame=None;total=math.ceil((duration+.45+.7)*fps)
def smooth(t):t=min(1,max(0,t));return t*t*(3-2*t)
for n in range(total):
 t=n/fps-.45;want=min(round(duration*fps)-1,max(0,math.floor(t*fps+1e-5)))
 while idx<want:
  data=dec.stdout.read(w*h*3)
  if len(data)!=w*h*3:break
  frame=np.frombuffer(data,np.uint8).reshape(h,w,3);idx+=1
 d=smooth((t+.45)/.7) if t<.25 else 1-smooth((t-duration)/.7) if t>duration else 1
 if d<1:
  mask=np.clip((430*d-dist)/16,0,1)[...,None];out=(frame*mask+dark*(1-mask)).astype('uint8')
 else:out=frame
 if n==10:Image.fromarray(out).save(P/'iris_enter.png')
 if n==round((duration+.45+.35)*fps):Image.fromarray(out).save(P/'iris_exit.png')
 enc.stdin.write(out.tobytes())
enc.stdin.close();assert enc.wait()==0;dec.stdout.close();dec.wait()
(P/'video_check.json').write_text(json.dumps({'origin_sentence_id':69,'origin':k['origin'],'local_origin_shift':-.45,'iris_enter':[-.45,.25],'iris_exit':[duration,duration+.7],'frames':total,'fps':30,'crf':16,'size':[w,h]},indent=2))
