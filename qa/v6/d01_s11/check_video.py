from pathlib import Path
import subprocess,json,numpy as np
P=Path(__file__).resolve().parent;A=P.parent/'animatic';reports=[]
def frame(path,t,w,h):
 b=subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(path),'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-threads','1','-']);return np.frombuffer(b,np.uint8).reshape(h,w,3).astype(float)
for suf,w,h in [('',1920,1080),('_720p',1280,720)]:
 old=A/('粗剪_v2'+suf+'.mp4');new=A/('粗剪_v6'+suf+'.mp4')
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(new)]));(P/('probe'+suf+'.json')).write_text(json.dumps(probe,indent=2))
 v=next(s for s in probe['streams'] if s['codec_type']=='video');assert (v['width'],v['height'])==(w,h);assert int(v['nb_frames'])==10195;assert v['r_frame_rate']=='30/1';assert abs(float(probe['format']['duration'])-339.833333)<.001
 tests=[]
 dark_checks=[]
 rows=json.load(open('/workspace/病理科普视频/配音/全稿_v3/timeline.json'))['lines']
 for row in [r for r in rows if 37<=r['n']<=46]:
  t=(row['start']+row['end'])/2;im=frame(new,t,w,h);rgb=im[int(h*.9):int(h*.92),:int(w*.03)].mean(axis=(0,1));dark_checks.append({'sentence':row['n'],'corner_rgb':rgb.tolist()});assert rgb.max()<35, dark_checks[-1]
 for t in [20,80,100,110,120,220]:
  mae=float(abs(frame(old,t,w,h)-frame(new,t,w,h)).mean());tests.append({'time':t,'MAE':mae});assert mae==0,tests
 v2tests=[]
 for t in [20,80,100,110,120]:
  mae=float(abs(frame(A/('粗剪_v2'+suf+'.mp4'),t,w,h)-frame(new,t,w,h)).mean());v2tests.append({'time':t,'MAE':mae});assert mae==0
 audio=[subprocess.check_output(['ffmpeg','-v','error','-i',str(v),'-map','0:a:0','-c','copy','-f','hash','-']).decode().strip() for v in [old,new]]
 assert audio[0]==audio[1]
 reports.append({'version':suf or '1080p','paper_samples':tests,'v2_paper_and_S08_samples':v2tests,'dark_subtitle_band':dark_checks,'audio_hash_equal':True,'duration':probe['format']['duration']})
(P/'video_check.json').write_text(json.dumps(reports,indent=2));print(reports)
