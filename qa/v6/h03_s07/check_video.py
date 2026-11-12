import pathlib,json,subprocess,numpy as np,hashlib
from PIL import Image
P=pathlib.Path(__file__).resolve().parent;A=P.parent/'animatic';k=json.loads((P/'keyframes.json').read_text())
def run(a):return subprocess.check_output(list(map(str,a)))
def frame(p,n,w,h):
 # Land just inside the frame interval (not on a boundary); clamp the very last frame.
 t=min(n/30+.001,(10195-2)/30+.02)
 return np.frombuffer(run(['ffmpeg','-v','error','-threads','2','-ss',t,'-i',p,'-frames:v','1','-threads','2','-f','rawvideo','-pix_fmt','rgb24','-']),np.uint8).reshape(h,w,3)
def boundary_check(old,new,bs,be,sf,ef,w,h):
 """Sample frames of the enclosing GOP outside the sentence window. This strip is the
 only part that is re-encoded (CRF1, High profile) so its decoded pixels are compared,
 not hashed. Frames outside the GOP are checked at packet level below."""
 idx=[n for n in range(bs,be) if not sf<=n<ef];step=1 if len(idx)<=60 else 3;idx=idx[::step]
 exact=0;maxerr=0;worst=0
 for n in idx:
  d=np.abs(frame(old,n,w,h).astype(np.int16)-frame(new,n,w,h).astype(np.int16))
  if d.max()==0:exact+=1
  maxerr=max(maxerr,int(d.max()));worst=max(worst,float(d.mean()))
 return len(idx),exact,maxerr,worst
r={}
for suffix,w,h,safe in [('',1920,1080,950),('_720p',1280,720,634)]:
 old=A/('粗剪_v12_h04'+suffix+'.mp4');new=A/('粗剪_v13'+suffix+'.mp4');win=json.loads((P/('splice'+suffix)/'window.json').read_text());sf,ef=win['start_frame'],win['end_frame'];pairs={}
 # Include both sides of the exact sentence window and of the boundary-GOP joins.
 for n in sorted(set([0,600,2400,3300,4800,6600,8400,9300,10194,sf-1,sf,ef-1,ef,win['gop_start'],win['gop_end']-1,win['gop_end']])):
  if sf<=n<ef:continue
  a,b=frame(old,n,w,h),frame(new,n,w,h);mae=float(abs(a.astype(float)-b.astype(float)).mean());pairs[str(n)]=mae
  if win['gop_start']<=n<win['gop_end']:
   # Re-encoded neighbour: only the synthetic 13-frame glitch card moves visibly.
   assert mae<=6,(suffix,n,mae)
  else:assert mae==0,(suffix,n,mae)
 # Every video packet outside the enclosing GOP must be byte-identical (copy, not re-encode).
 packets=[]
 for p in [old,new]:
  q=json.loads(run(['ffprobe','-v','error','-select_streams','v:0','-show_packets','-show_data_hash','sha256','-show_entries','packet=pts_time,data_hash','-of','json',p]))['packets'];packets.append(q)
 assert len(packets[0])==len(packets[1]),(len(packets[0]),len(packets[1]))
 outside=[i for i in range(len(packets[0])) if i<win['gop_start'] or i>=win['gop_end']]
 assert all(packets[0][i]['data_hash']==packets[1][i]['data_hash'] for i in outside)
 hashes=[run(['ffmpeg','-v','error','-i',p,'-map','0:a:0','-c','copy','-f','hash','-']).decode().strip() for p in [old,new]];assert hashes[0]==hashes[1]
 # Subtitle band sits outside the overlaid picture area; only re-encode rounding may remain.
 subtitle={}
 for p in k['picks']:
  n=round((k['origin']+p['t'])*30);a,b=frame(old,n,w,h),frame(new,n,w,h);mae=float(abs(a[safe:].astype(float)-b[safe:].astype(float)).mean());subtitle[p['name']]=mae;assert mae<=.25,(p['name'],mae)
 bo,exact,maxerr,worst=boundary_check(old,new,win['gop_start'],win['gop_end'],sf,ef,w,h)
 assert worst<=6,(suffix,bo,exact,maxerr,worst)
 r[suffix or '1080p']={'outside_window_MAE':pairs,'outside_gop_packets_identical':len(outside),'boundary_sampled_frames':bo,'boundary_exact_frames':exact,'boundary_max_channel_error':maxerr,'boundary_worst_MAE':worst,'subtitle_band_MAE':subtitle,'subtitle_band_max_MAE':max(subtitle.values()),'audio_hash':hashes[0],'frame_count':len(packets[1]),'window':win}
insertion={}
for pick in k['picks']:
 n=round((k['origin']+pick['t'])*30);im=frame(A/'粗剪_v13.mp4',n,1920,1080);Image.fromarray(im).save(P/(pick['name']+'_final_video.png'));ref=np.array(Image.open(P/(pick['name']+'.png')).convert('RGB'));mae=float(abs(im[:900].astype(float)-ref[:900].astype(float)).mean());insertion[pick['name']]={'frame':n,'picture_MAE_against_still':mae};assert mae<8,(pick,mae)
r['insertion']=insertion
(P/'video_check.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2))
