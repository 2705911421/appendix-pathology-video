"""Replace only the sentence window. Copy exterior packets and audio.
Boundary GOP is lossless so exterior decoded YUV pixels remain exact; the new
scene itself is encoded CRF16 by render.mjs (720p patch also CRF16).
"""
import pathlib,json,subprocess,math
P=pathlib.Path(__file__).resolve().parent;A=P.parent/'animatic';k=json.loads((P/'keyframes.json').read_text());fps=30
sf=math.ceil(k['origin']*fps);ef=math.ceil((k['origin']+k['duration'])*fps)
def run(a):subprocess.run(list(map(str,a)),check=True)
for suffix,w,h,safe in [('',1920,1080,950),('_720p',1280,720,634)]:
 old=A/('粗剪_v12_h04'+suffix+'.mp4');work=P/('splice'+suffix);work.mkdir(exist_ok=True)
 keys=subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-skip_frame','nokey','-show_entries','frame=pts_time','-of','csv=p=0',str(old)]).decode()
 keys=[round(float(s.strip().strip(','))*fps) for s in keys.splitlines() if s.strip().strip(',')];bs=max(i for i in keys if i<=sf);be=min(i for i in keys if i>=ef)
 (work/'window.json').write_text(json.dumps(dict(start_frame=sf,end_frame=ef,gop_start=bs,gop_end=be,fps=fps)))
 patch=P/'S07.mp4'
 if suffix:
  patch=work/'patch.mp4';run(['ffmpeg','-v','error','-y','-threads','2','-i',P/'S07.mp4','-vf','scale=1280:720','-an','-c:v','libx264','-crf','16','-preset','veryfast','-threads','2',patch])
 # Rebuild the enclosing GOP once, losslessly. Only the sentence window passes
 # through overlay; its neighbours round by at most a few code values.
 n=be-bs
 f=f'[1:v]crop={w}:{safe}:0:0,setpts=PTS-STARTPTS+{(sf-bs)/fps}/TB[p];[0:v][p]overlay=0:0:eof_action=pass:enable=\'gte(t,{(sf-bs+.5)/fps})*lt(t,{(ef-bs+.5)/fps})\',trim=end_frame={n},setpts=PTS-STARTPTS[v]'
 run(['ffmpeg','-v','error','-y','-threads','2','-ss',bs/fps,'-i',old,'-i',patch,'-filter_complex_threads','1','-filter_complex',f,'-map','[v]','-frames:v',n,'-an','-c:v','libx264','-crf','1','-preset','veryfast','-pix_fmt','yuv420p','-profile:v','high','-level','4.0','-bf','0','-g','30','-x264-params','repeat-headers=1','-threads','2',work/'middle.mp4'])
 run(['ffmpeg','-v','error','-y','-i',old,'-frames:v',bs,'-map','0:v:0','-an','-c:v','copy',work/'before.mp4'])
 run(['ffmpeg','-v','error','-y','-ss',be/fps,'-i',old,'-map','0:v:0','-an','-c:v','copy',work/'after.mp4'])
 (work/'concat.txt').write_text(''.join("file '"+str((work/(n+'.mp4')).resolve())+"'\n"+(f'duration {d}\n' if d is not None else '') for n,d in [('before',bs/fps),('middle',(be-bs)/fps),('after',None)]))
 out=A/('粗剪_v13'+suffix+'.mp4')
 run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',work/'concat.txt','-i',old,'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',out])
 if suffix:run(['ffmpeg','-v','error','-y','-ss',sf/fps,'-i',out,'-t',(ef-sf)/fps,'-c:v','libx264','-crf','16','-preset','veryfast','-threads','2','-c:a','aac','-b:a','192k',P/'S07_带配音_720p.mp4'])
