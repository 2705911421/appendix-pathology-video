from pathlib import Path
from PIL import Image
import numpy as np,json,subprocess,hashlib,math
P=Path(__file__).resolve().parent;A=P.parent/'animatic';r={}
def out(a):return subprocess.check_output(list(map(str,a)))
def packets(p,s):return json.loads(out(['ffprobe','-v','error','-select_streams',s,'-show_packets','-show_data_hash','sha256','-show_entries','packet=pts,dts,duration,data_hash','-of','json',p]))['packets']
for suffix in ['', '_720p']:
 old=A/('粗剪_v14'+suffix+'.mp4');new=P/('粗剪_v15'+suffix+'.mp4');w=json.loads((P/('splice'+suffix)/'window.json').read_text());a,b=packets(old,'v:0'),packets(new,'v:0');assert len(a)==len(b)
 ii=[i for i in range(len(a)) if i<w['start_frame'] or i>=w['end_frame']];assert all(a[i]==b[i] for i in ii),'outside window packet mismatch'
 aa,bb=packets(old,'a:0'),packets(new,'a:0');assert aa==bb,'audio mismatch'
 r[suffix or '1080p']={'outside_window_video_packets_identical':len(ii),'all_audio_packets_and_timestamps_identical':len(aa),'frame_count':len(b),'window':w}
for scene in ['s06','s07']:
 d=P/scene;k=json.loads((P/(scene+'_keyframes.json')).read_text());det=[];seam=[]
 for p in k['picks']:
  a=np.array(Image.open(d/(p['name']+'.png')).convert('RGB')).astype(int);b=np.array(Image.open(d/(p['name']+'_reverse.png')).convert('RGB')).astype(int);delta=abs(a-b);fraction=float((delta.max(2)>24).mean());assert fraction<=.0005,(scene,p['name'],fraction)
  det.append({'name':p['name'],'byte_identical':bool(np.array_equal(a,b)),'mae':float(delta.mean()),'pixels_difference_gt24_fraction':fraction})
  if scene=='s07' and p['name'].startswith('s2') or scene=='s07' and p['name'].startswith('s30'):
   # Circle fully settled: x=844 is entirely outside, including the old seam.
   # Exclude the circle's antialiased tangent and the intentional leader crossing.
   strip=np.concatenate([a[150:400,842:845],a[700:900,842:845]],axis=0);err=abs(strip-[244,239,230]);assert err.max()==0,(p['name'],err.max());seam.append(p['name'])
 (d/'determinism_metrics.json').write_text(json.dumps(det,indent=2));r[scene]={'determinism':det,'seam_check_passed':seam}
 # Verify the complete scene has no painted content below y950 after encode.
 q=subprocess.Popen(['ffmpeg','-v','error','-threads','1','-i',str(d/(scene.upper()+'.mp4')),'-vf','crop=1920:130:0:950','-threads','1','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
 n=0;mx=0
 while True:
  raw=q.stdout.read(1920*130*3)
  if not raw:break
  ar=np.frombuffer(raw,np.uint8).reshape(130,1920,3).astype(int);mx=max(mx,int(abs(ar-[244,239,230]).max()));n+=1
 assert q.wait()==0;assert mx<=5,(scene,mx);r[scene]['safe_area']={'all_frames':n,'below_y950_max_error':mx}
 # Save all delivered rough-cut review frames, with subtitles, for final inspection.
 for p in k['picks']:
  t=round((k['origin']+p['t'])*30)/30+.001
  subprocess.run(['ffmpeg','-v','error','-y','-threads','1','-ss',str(t),'-i',str(P/'粗剪_v15.mp4'),'-frames:v','1','-threads','1',str(d/(p['name']+'_final_video.png'))],check=True)
# The scene clock matches the actual narration timeline.
timeline=json.loads((P.parents[3]/'配音/全稿_v3/timeline.json').read_text())['lines']
for scene,first,last in [('s06',23,24),('s07',25,30)]:
 k=json.loads((P/(scene+'_keyframes.json')).read_text());rows=[v for v in timeline if first<=v['n']<=last];assert abs(rows[0]['start']-k['origin'])<1e-8
 r[scene]['audio_origin_verified_against_timeline']=True
(P/'verification.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2))
