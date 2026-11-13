import json,sys,subprocess,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
s=sys.argv[1];root=Path('qa/v6/ct_real_adv01');p=root/s;m=json.load(open(p/'keyframes.json'))
timing=json.loads(Path('film/timing_snapshot.js').read_text().split('=',1)[1].strip().rstrip(';'))
orig=json.load(open('/workspace/病理科普视频/配音/全稿_v3/timeline.json'))['lines']
assert all(a['start']==b['start'] and a['end']==b['end'] for a,b in zip(timing,orig))
assets=[]
for f in Path('film/assets/ct_real').iterdir():
 source=Path('/workspace/病理科普视频/ct_real')/f.name[:3]/f.name
 if source.exists():
  digest=hashlib.sha256(f.read_bytes()).hexdigest(); assert digest==hashlib.sha256(source.read_bytes()).hexdigest(); assets.append({'file':f.name,'sha256':digest})
parity={}
for k in m['picks']:
 a=np.array(Image.open(p/(k['name']+'.png')));b=np.array(Image.open(Path('qa/v6/ct_real')/s/(k['name']+'.png')))
 assert np.array_equal(a[:,:600],b[:,:600]);parity[k['name']+'_sidebar']='pixel identical'
 if s=='S04' and int(k['name'][1:3])<=15:assert np.array_equal(a,b);parity[k['name']+'_doctor_choice']='pixel identical'
def pcm(args):
 return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error',*args,'-vn','-ac','1','-ar','16000','-f','s16le','-']),dtype=np.int16).astype(float)
a=pcm(['-i',str(p/(s+'_带配音_720p.mp4'))]);b=pcm(['-ss',str(m['origin']),'-t',str(m['duration']),'-i','/workspace/病理科普视频/配音/全稿_v3/旁白_v3.wav'])
n=min(len(a),len(b));corr=float(np.corrcoef(a[:n],b[:n])[0,1]);assert corr>.98,corr
# Review the encoded 720p result, not just browser stills.
frames=[]
for k in m['picks']:
 dest=p/(k['name']+'_video720.png');subprocess.run(['ffmpeg','-v','error','-y','-ss',str(k['t']),'-i',str(p/(s+'_带配音_720p.mp4')),'-frames:v','1',str(dest)],check=True)
 frames.append(Image.open(dest).resize((640,360)))
sheet=Image.new('RGB',(1280,360*((len(frames)+1)//2)),'#F4EFE6')
for i,im in enumerate(frames):sheet.paste(im,((i%2)*640,(i//2)*360))
sheet.save(p/'review_video720.png')
(p/'validation.json').write_text(json.dumps({'timeline_matches':True,'assets':assets,'non_CT_parity':parity,'real_narration_PCM_correlation':corr},ensure_ascii=False,indent=2))
print(s,'validation passed; narration correlation',corr)
