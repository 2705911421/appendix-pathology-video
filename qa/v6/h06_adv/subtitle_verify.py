from pathlib import Path
import subprocess,json,numpy as np
P=Path(__file__).resolve().parent;r={}
for suffix,w,h,safe in [('',1920,1080,950),('_720p',1280,720,634)]:
 win=json.loads((P/('splice'+suffix)/'window.json').read_text());qs=[];n=win['end_frame']-win['start_frame'];size=w*(h-safe)*3
 for file in [P.parent/'animatic'/('粗剪_v14'+suffix+'.mp4'),P/('粗剪_v15'+suffix+'.mp4')]:
  qs.append(subprocess.Popen(['ffmpeg','-v','error','-threads','1','-ss',str(win['start_frame']/30),'-i',str(file),'-frames:v',str(n),'-vf',f'crop={w}:{h-safe}:0:{safe}','-an','-threads','1','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE))
 maes=[];mx=0
 for i in range(n):
  a,b=[np.frombuffer(q.stdout.read(size),np.uint8).astype(int) for q in qs];assert len(a)==len(b)==size;delta=abs(a-b);maes.append(float(delta.mean()));mx=max(mx,int(delta.max()))
 assert all(q.wait()==0 for q in qs);assert max(maes)<2,(suffix,max(maes))
 r[suffix or '1080p']={'all_window_frames_checked':n,'mean_MAE':float(np.mean(maes)),'max_frame_MAE':max(maes),'max_channel_difference':mx,'note':'Original subtitle band is retained by overlay; CRF16 re-encoding introduces measured pixel differences.'}
(P/'subtitle_verification.json').write_text(json.dumps(r,indent=2));print(r)
