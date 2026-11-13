from pathlib import Path
import subprocess,json,cv2,numpy as np
B=Path(__file__).resolve().parent;results={}
refs={'S01':B.parent/'open/s01/S01_带配音_720p.mp4','S05':B.parent/'card/S05/S05_带配音_720p.mp4','S06':B.parent/'h02_s06/S06_带配音_720p.mp4'}
def duration(p):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(p)]))
for folder in sorted(B.iterdir()):
 if not folder.is_dir() or not (folder/'duration_expected.json').exists():continue
 key=folder.name;expected=json.load(open(folder/'duration_expected.json'))['duration'];metrics=[]
 for p in sorted(folder.glob('*.mp4')):
  dur=duration(p);log=subprocess.run(['ffmpeg','-threads','1','-i',str(p),'-vf','blackdetect=d=0.1:pic_th=0.98','-an','-f','null','-'],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True).stdout
  (folder/(p.stem+'_blackdetect.log')).write_text(log);black=[s for s in log.splitlines() if 'black_start:' in s]
  cap=cv2.VideoCapture(str(p));count=int(cap.get(cv2.CAP_PROP_FRAME_COUNT));cap.set(cv2.CAP_PROP_POS_FRAMES,0);ok,a=cap.read();cap.set(cv2.CAP_PROP_POS_FRAMES,count-1);ok2,b=cap.read();cap.release()
  endpoints=[float(np.mean(im)) for im in [a,b] if im is not None]
  metrics.append({'file':p.name,'duration':dur,'expected':expected,'duration_error':abs(dur-expected),'black_intervals':black,'endpoint_mean_luma':endpoints,'endpoint_nonblack':len(endpoints)==2 and min(endpoints)>3,'duration_pass':abs(dur-expected)<=.05})
 data={'videos':metrics}
 if key in refs and refs[key].exists():
  old=duration(refs[key]);new=next(x['duration'] for x in metrics if '720p' in x['file']);data.update({'before_audio_duration':old,'after_audio_duration':new,'audio_duration_difference':abs(new-old),'audio_same_duration_pass':abs(new-old)<=.05})
 results[key]=data;(folder/'metrics_video.json').write_text(json.dumps(data,indent=2))
(B/'video_metrics.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
