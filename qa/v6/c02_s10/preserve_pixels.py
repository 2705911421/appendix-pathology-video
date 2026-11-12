"""CRF16 final H.264 pass updates S10 while reusing the original audio and other scene content."""
import json,pathlib,subprocess
P=pathlib.Path(__file__).resolve().parent;A=P.parent/'animatic';r=json.loads((P/'iris/resolved.json').read_text())
for suffix in ['', '_720p']:
 old=A/('粗剪_v2'+suffix+'.mp4');patch=P/'assembled'/('粗剪_v4'+suffix+'.mp4')
 f='[2:v]crop=1920:950:0:0'+(',scale=1280:634' if suffix else '')+'[picture];[1:v][picture]overlay=0:0[patch];[0:v][patch]overlay=0:0:enable=\'gte(t,'+str(r['enterFrameStart'])+')*lt(t,'+str(r['exitFrameEnd'])+')\'[v]'
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(old),'-i',str(patch),'-i',str(P/'scene_plate.mp4'),'-filter_complex_threads','1','-filter_complex',f,'-map','[v]','-map','0:a:0','-c:a','copy','-c:v','libx264','-crf','16','-preset','veryfast','-pix_fmt','yuv420p','-bf','0','-g','30','-movflags','+faststart',str(A/('粗剪_v4'+suffix+'.mp4'))],check=True)
