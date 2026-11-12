"""Iris transitions over an existing plate; ranges are resolved from cue IDs in sceneTheme.js."""
import pathlib,json,subprocess,math
import numpy as np
from PIL import Image
P=pathlib.Path(__file__).resolve().parent
r=json.loads((P/'ranges.json').read_text())[0]
def run(a):subprocess.run(a,check=True)
def frame(t,out):run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(P.parent/'S08.mp4'),'-frames:v','1',str(out)])
frame(0,P/'first.png');frame(25.9,P/'last.png')
y,x=np.mgrid[:1080,:1920]; dist=np.sqrt((x-1110)**2+(y-475)**2)
paper=np.array([244,239,230.]);dark=np.array([17,16,21.])
for kind in ['enter','exit']:
 start,end=r[kind+'Start'],r[kind+'End']
 # Exact global frame alignment avoids a second rounding at overlay placement.
 first=math.floor(start*30);last=math.ceil((end if kind=='enter' else r['exitStart']+0.8)*30)
 im=np.array(Image.open(P/('first.png' if kind=='enter' else 'last.png')).convert('RGB'),dtype=float)
 folder=P/kind;folder.mkdir(exist_ok=True)
 for k,n in enumerate(range(first,last+1)):
  u=np.clip((n/30-start)/(end-start),0,1);u=u*u*(3-2*u);d=u if kind=='enter' else 1-u
  # A feathered iris expands from the eyepiece centre. Background dims independently.
  radius=1250*d; mask=np.clip((radius-dist)/18,0,1)[...,None]
  bg=paper*(1-d)+dark*d
  out=im*mask+bg*(1-mask)
  if d==1:out=im
  Image.fromarray(np.uint8(np.clip(out,0,255))).save(folder/f'{k:03}.png')
 run(['ffmpeg','-v','error','-y','-framerate','30','-i',str(folder/'%03d.png'),'-c:v','libx264','-crf','14','-pix_fmt','yuv420p',str(P/(kind+'.mp4'))])
 r[kind+'FrameStart']=first/30;r[kind+'FrameEnd']=(last+1)/30
(P/'resolved.json').write_text(json.dumps(r,indent=2))
f=f"[1:v]setpts=PTS+{r['enterFrameStart']}/TB[a];[2:v]setpts=PTS+{r['exitFrameStart']}/TB[b];[0:v][a]overlay=eof_action=pass:enable='gte(t,{r['enterFrameStart']})*lt(t,{r['enterFrameEnd']})'[x];[x][b]overlay=eof_action=pass:enable='gte(t,{r['exitFrameStart']})*lt(t,{r['exitFrameEnd']})'[v]"
run(['ffmpeg','-v','error','-y','-i',str(P.parent/'scene_plate.mp4'),'-i',str(P/'enter.mp4'),'-i',str(P/'exit.mp4'),'-filter_complex_threads','1','-filter_complex',f,'-map','[v]','-c:v','libx264','-preset','veryfast','-crf','16','-an',str(P/'scene_plate.mp4')])
