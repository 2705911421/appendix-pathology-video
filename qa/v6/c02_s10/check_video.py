from pathlib import Path
import subprocess,json,numpy as np
P=Path(__file__).resolve().parent;A=P.parent/'animatic';reports=[]
def frame(path,t,w,h):
 b=subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(path),'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-threads','1','-']);return np.frombuffer(b,np.uint8).reshape(h,w,3).astype(float)
for suf,w,h in [('',1920,1080),('_720p',1280,720)]:
 old=A/('粗剪_v3'+suf+'.mp4');new=A/('粗剪_v4'+suf+'.mp4')
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(new)]));(P/('probe'+suf+'.json')).write_text(json.dumps(probe,indent=2))
 tests=[]
 for t in [20,80,220]:
  mae=float(abs(frame(old,t,w,h)-frame(new,t,w,h)).mean());tests.append({'time':t,'MAE':mae});assert mae<1,tests
 audio=[subprocess.check_output(['ffmpeg','-v','error','-i',str(v),'-map','0:a:0','-c','copy','-f','hash','-']).decode().strip() for v in [old,new]]
 assert audio[0]==audio[1]
 reports.append({'version':suf or '1080p','paper_samples':tests,'audio_hash_equal':True,'duration':probe['format']['duration']})
(P/'video_check.json').write_text(json.dumps(reports,indent=2));print(reports)
