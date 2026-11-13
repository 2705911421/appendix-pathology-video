from pathlib import Path
import subprocess,json
P=Path(__file__).resolve().parent;video=P.parent/'animatic/粗剪_v14.mp4'
for lane in ['h04_s06','h03_s07']:
 q=P.parent/lane;k=json.loads((q/'keyframes.json').read_text())
 for pick in k['picks']:
  t=round((k['origin']+pick['t'])*30)/30+.001
  subprocess.run(['ffmpeg','-v','error','-y','-threads','1','-ss',str(t),'-i',str(video),'-frames:v','1','-threads','1',str(q/(pick['name']+'_final_video.png'))],check=True)
