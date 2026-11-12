from pathlib import Path
import json,subprocess,sys
P=Path(__file__).resolve().parent;A=P.parent/'animatic'
def run(a):subprocess.run([str(x) for x in a],check=True)
run(['python3',P/'preserve_pixels.py'])
if '--skip-stills' not in sys.argv:run(['python3',P/'check_stills.py'])
run(['python3',P/'check_video.py'])
r=json.loads((P/'iris/resolved.json').read_text());start=r['enterFrameStart'];end=r['exitFrameEnd']
run(['ffmpeg','-v','error','-y','-ss',start,'-i',A/'粗剪_v10_720p.mp4','-t',str(end-start),'-c:v','libx264','-preset','veryfast','-crf','16','-c:a','aac','-b:a','192k',P/'S14_带配音_720p.mp4'])
