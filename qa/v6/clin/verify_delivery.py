"""Read-only final delivery checks, using the supplied narration and timeline."""
import json, subprocess, pathlib, numpy as np
from PIL import Image, ImageChops, ImageStat
root=pathlib.Path('qa/v6/clin')
def run(args): return subprocess.check_output(args)
def audio(path,start=None,duration=None):
 args=['ffmpeg','-v','error','-threads','1']
 if start is not None: args+=['-ss',str(start)]
 args+=['-i',str(path)]
 if duration is not None: args+=['-t',str(duration)]
 args+=['-vn','-ac','1','-ar','16000','-f','f32le','pipe:1']
 return np.frombuffer(run(args),dtype='<f4')
source=pathlib.Path('/workspace/病理科普视频/配音/全稿_v3')
timeline=json.loads((source/'timeline.json').read_text())
results={}
for scene in ['S02','S03','S16']:
 p=root/scene;k=json.loads((p/'keyframes.json').read_text());v=json.loads((p/'verification.json').read_text())
 assert k['rows']==[r for r in timeline['lines'] if r['n'] in [x['n'] for x in k['rows']]]
 for name in [scene+'.mp4',scene+'_带配音_720p.mp4']:
  run(['ffmpeg','-v','error','-threads','1','-i',str(p/name),'-f','null','-'])
  probe=json.loads(run(['ffprobe','-v','quiet','-show_streams','-of','json',str(p/name)]))
  video=next(s for s in probe['streams'] if s['codec_type']=='video')
  assert [video['width'],video['height']]==([1280,720] if '720p' in name else [1920,1080])
  assert video['avg_frame_rate']=='30/1'
  assert abs(float(video['duration'])-k['duration'])<1/30+.001
 a=audio(source/'旁白_v3.wav',k['origin'],k['duration']);b=audio(p/(scene+'_带配音_720p.mp4'));n=min(len(a),len(b));corr=float(np.corrcoef(a[:n],b[:n])[0,1]);assert corr>.999
 for id in {'S02':['06','08','10'],'S03':['11'],'S16':[]}[scene]:
  A=Image.open(p/('s'+id+'_early.png')).convert('RGB');B=Image.open(p/('s'+id+'_late.png')).convert('RGB')
  diff=sum(ImageStat.Stat(ImageChops.difference(A,B)).mean)/3;assert diff>2
 results[scene]={'full_decode':'PASS','size_fps_duration':'PASS','audio_correlation':corr,'checked_audio_samples':n,'required_motion':'PASS','keyframe_safe_area':v['blankBelow810']}
 assert v['blankBelow810']
(root/'delivery_verification.json').write_text(json.dumps(results,indent=2,ensure_ascii=False)+'\n')
print(json.dumps(results,indent=2))
