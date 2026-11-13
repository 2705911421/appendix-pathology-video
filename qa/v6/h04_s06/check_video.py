import pathlib,json,subprocess,numpy as np,hashlib
from PIL import Image
P=pathlib.Path(__file__).resolve().parent;A=P.parent/'animatic';k=json.loads((P/'keyframes.json').read_text())
def run(a):return subprocess.check_output(list(map(str,a)))
def frame(p,n,w,h):
 return np.frombuffer(run(['ffmpeg','-v','error','-threads','2','-ss',n/30,'-i',p,'-frames:v','1','-threads','2','-f','rawvideo','-pix_fmt','rgb24','-']),np.uint8).reshape(h,w,3)
r={}
for suffix,w,h,safe in [('',1920,1080,950),('_720p',1280,720,634)]:
 old=A/('粗剪_v12'+suffix+'.mp4');new=A/('粗剪_v12_h04'+suffix+'.mp4');win=json.loads((P/('splice'+suffix)/'window.json').read_text());sf,ef=win['start_frame'],win['end_frame'];pairs={}
 # Include both sides of exact sentence-window and boundary-GOP joins.
 for n in sorted(set([0,600,2400,3300,4800,6600,8400,9300,10194,sf-1,ef,win['gop_start'],win['gop_end']-1,win['gop_end']])):
  if sf<=n<ef:continue
  a,b=frame(old,n,w,h),frame(new,n,w,h);mae=float(abs(a.astype(float)-b.astype(float)).mean());pairs[str(n)]=mae;assert mae==0,(suffix,n,mae)
 # Check every video packet outside the enclosing GOP: compressed bytes retained exactly.
 packets=[]
 for p in [old,new]:
  q=json.loads(run(['ffprobe','-v','error','-select_streams','v:0','-show_packets','-show_data_hash','sha256','-show_entries','packet=pts_time,data_hash','-of','json',p]))['packets'];packets.append(q)
 assert len(packets[0])==len(packets[1]),(len(packets[0]),len(packets[1]))
 outside=[i for i in range(len(packets[0])) if i<win['gop_start'] or i>=win['gop_end']]
 assert all(packets[0][i]['data_hash']==packets[1][i]['data_hash'] for i in outside)
 hashes=[run(['ffmpeg','-v','error','-i',p,'-map','0:a:0','-c','copy','-f','hash','-']).decode().strip() for p in [old,new]];assert hashes[0]==hashes[1]
 subtitle={}
 for p in k['picks']:
  n=round((k['origin']+p['t'])*30);a,b=frame(old,n,w,h),frame(new,n,w,h);mae=float(abs(a[safe:].astype(float)-b[safe:].astype(float)).mean());subtitle[p['name']]=mae;assert mae==0
 # Exhaustively hash decoded frames in the boundary GOP outside the replacement.
 boundary=[]
 for path in [old,new]:
  hashes_boundary=run(['ffmpeg','-v','error','-threads','2','-ss',win['gop_start']/30,'-i',path,'-frames:v',win['gop_end']-win['gop_start'],'-an','-f','framemd5','-']).decode()
  boundary.append([line.split(',')[-1].strip() for line in hashes_boundary.splitlines() if not line.startswith('#')])
 indexes=[i for i in range(win['gop_end']-win['gop_start']) if i+win['gop_start']<sf or i+win['gop_start']>=ef]
 assert all(boundary[0][i]==boundary[1][i] for i in indexes)
 r[suffix or '1080p']={'outside_window_MAE':pairs,'outside_gop_packets_identical':len(outside),'boundary_outside_window_frames_exact':len(indexes),'audio_hash':hashes[0],'subtitle_band_MAE':subtitle,'frame_count':len(packets[1]),'window':win}
insertion={}
for pick in k['picks']:
 n=round((k['origin']+pick['t'])*30);im=frame(A/'粗剪_v12_h04.mp4',n,1920,1080);Image.fromarray(im).save(P/(pick['name']+'_final_video.png'));ref=np.array(Image.open(P/(pick['name']+'.png')).convert('RGB'));mae=float(abs(im[:900].astype(float)-ref[:900].astype(float)).mean());insertion[pick['name']]={'frame':n,'picture_MAE_against_still':mae};assert mae<8,(pick,mae)
r['insertion']=insertion
(P/'video_check.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2))
