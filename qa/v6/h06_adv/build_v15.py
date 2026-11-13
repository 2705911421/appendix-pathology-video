from pathlib import Path
import json,math,subprocess
P=Path(__file__).resolve().parent;A=P.parent/'animatic'
def run(a):subprocess.run(list(map(str,a)),check=True)
fps=30
for suffix,w,h,safe in [('',1920,1080,950),('_720p',1280,720,634)]:
 old=A/('粗剪_v14'+suffix+'.mp4');work=P/('splice'+suffix);work.mkdir(exist_ok=True)
 k6=json.loads((P/'s06_keyframes.json').read_text());k7=json.loads((P/'s07_keyframes.json').read_text())
 sf=math.ceil(k6['origin']*fps);join=math.ceil(k7['origin']*fps);ef=math.ceil((k7['origin']+k7['duration'])*fps)
 keys=subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-skip_frame','nokey','-show_entries','frame=pts_time','-of','csv=p=0',str(old)]).decode();keys=[round(float(s.strip().strip(','))*fps) for s in keys.splitlines() if s.strip().strip(',')];bs=max(i for i in keys if i<=sf);be=min(i for i in keys if i>=ef)
 patches=[]
 for lane,scene in [('s06','S06'),('s07','S07')]:
  patch=P/lane/(scene+'.mp4')
  if suffix:
   dest=work/(scene+'.mp4');run(['ffmpeg','-v','error','-y','-threads','1','-i',patch,'-vf',f'scale={w}:{h}','-an','-c:v','libx264','-crf','16','-preset','veryfast','-threads','1',dest]);patch=dest
  patches.append(patch)
 f=f"[1:v]tpad=stop_mode=clone:stop_duration=1,crop={w}:{safe}:0:0,setpts=PTS-STARTPTS+{(sf-bs)/fps}/TB[p6];[2:v]crop={w}:{safe}:0:0,setpts=PTS-STARTPTS+{(join-bs)/fps}/TB[p7];[0:v][p6]overlay=0:0:eof_action=pass:enable='gte(t,{(sf-bs)/fps})*lt(t,{(join-bs)/fps})'[v6];[v6][p7]overlay=0:0:eof_action=pass:enable='gte(t,{(join-bs)/fps})*lt(t,{(ef-bs)/fps})',trim=end_frame={be-bs},setpts=PTS-STARTPTS[v]"
 run(['ffmpeg','-v','error','-y','-threads','1','-ss',bs/fps,'-i',old,'-i',patches[0],'-i',patches[1],'-filter_complex_threads','1','-filter_complex',f,'-map','[v]','-frames:v',be-bs,'-an','-c:v','libx264','-crf','16','-preset','veryfast','-pix_fmt','yuv420p','-profile:v','high','-level','4.0','-bf','0','-g','30','-x264-params','repeat-headers=1','-threads','1',work/'middle.mp4'])
 run(['ffmpeg','-v','error','-y','-i',old,'-frames:v',bs,'-map','0:v:0','-an','-c:v','copy',work/'before.mp4']);run(['ffmpeg','-v','error','-y','-ss',be/fps,'-i',old,'-map','0:v:0','-an','-c:v','copy',work/'after.mp4'])
 (work/'concat.txt').write_text(''.join("file '"+str((work/(n+'.mp4')).resolve())+"'\n"+(f'duration {d}\n' if d else '') for n,d in [('before',bs/fps),('middle',(be-bs)/fps),('after',None)]))
 dest=P/('粗剪_v15'+suffix+'.mp4');run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',work/'concat.txt','-i',old,'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',dest])
 (work/'window.json').write_text(json.dumps(dict(start_frame=sf,join_frame=join,end_frame=ef,gop_start=bs,gop_end=be)))
 if suffix:
  for lane,scene,k in [('s06','S06',k6),('s07','S07',k7)]:
   run(['ffmpeg','-v','error','-y','-ss',k['origin'],'-i',dest,'-t',k['duration'],'-c:v','libx264','-crf','16','-preset','veryfast','-threads','1','-c:a','aac','-b:a','192k',P/lane/(scene+'_带配音_720p.mp4')])
