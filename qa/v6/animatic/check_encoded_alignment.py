# Preserve encoded frame pairs around each requested sentence boundary for review.
import json,subprocess,pathlib
p=pathlib.Path(__file__).resolve().parent
for a in json.load(open(p/'alignment.json')):
 for label,n in [('before',a['firstVisibleFrame']-1),('visible',a['firstVisibleFrame'])]:
  out=p/'alignment_frames';out.mkdir(exist_ok=True)
  subprocess.run(['ffmpeg','-y','-v','error','-ss',str(n/30),'-i',str(p/'粗剪_v1.mp4'),'-frames:v','1',str(out/f"s{a['n']:02}_{label}.png")],check=True)
