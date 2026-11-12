"""Encode only the S19 window at CRF16; copy all other video packets and original audio."""
import json,pathlib,subprocess,math
P=pathlib.Path(__file__).resolve().parent;A=P.parent/'animatic';B=P;r=json.loads((P/'iris/resolved.json').read_text());
def run(args):subprocess.run([str(x) for x in args],check=True)
for suffix in ['', '_720p']:
 old=A/('粗剪_v7'+suffix+'.mp4');work=P/('splice'+suffix);work.mkdir(exist_ok=True)
 patch=B/'assembled'/('粗剪_v8'+suffix+'.mp4')
 keys=subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-skip_frame','nokey','-show_entries','frame=pts_time','-of','csv=p=0',str(old)]).decode()
 keys=[round(float(v.strip().strip(','))*30) for v in keys.splitlines() if v.strip().strip(',')]
 sf=max(v for v in keys if v/30<=r['enterFrameStart']);ef=min(v for v in keys if v/30>=r['exitFrameEnd']);start=sf/30;end=ef/30
 (work/'window.json').write_text(json.dumps({'start_frame':sf,'end_frame':ef,'start':start,'end':end}))
 f='[2:v]crop=1920:950:0:0'+(',scale=1280:634' if suffix else '')+'[picture];[1:v][picture]overlay=0:0[patch];[0:v][patch]overlay=0:0:enable=\'gte(t,'+str(r['enterFrameStart'])+')*lt(t,'+str(r['exitFrameEnd'])+')\',trim=start_frame='+str(sf)+':end_frame='+str(ef)+',setpts=PTS-STARTPTS[v]'
 run(['ffmpeg','-v','error','-y','-i',old,'-i',patch,'-i',P/'scene_plate.mp4','-filter_complex_threads','1','-filter_complex',f,'-map','[v]','-an','-c:v','libx264','-crf','16','-preset','veryfast','-pix_fmt','yuv420p','-bf','0','-g','30',work/'middle.mp4'])
 run(['ffmpeg','-v','error','-y','-i',old,'-frames:v',sf,'-map','0:v:0','-an','-c:v','copy',work/'before.mp4'])
 run(['ffmpeg','-v','error','-y','-ss',end,'-i',old,'-map','0:v:0','-an','-c:v','copy',work/'after.mp4'])
 (work/'concat.txt').write_text(''.join("file '"+str((work/(n+'.mp4')).resolve())+"'\n"+(('duration '+str(d)+'\n') if d is not None else '') for n,d in [('before',start),('middle',end-start),('after',None)]))
 run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',work/'concat.txt','-i',old,'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',A/('粗剪_v8'+suffix+'.mp4')])
