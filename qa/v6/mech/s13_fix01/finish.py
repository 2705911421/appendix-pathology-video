import json,subprocess
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
P=Path(__file__).resolve().parent
TOOL=str(P/'render_patient.mjs')
def run(a): subprocess.run(a,check=True)
run(['python3',str(P/'make_sheet.py')])
f=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',23)
k=json.loads((P/'keyframes.json').read_text())
out=Image.new('RGB',(1280,len(k['picks'])*390),'#F4EFE6');d=ImageDraw.Draw(out)
for i,p in enumerate(k['picks']):
 for col,folder in enumerate([P.parent/'s13',P]):
  im=Image.open(folder/(p['name']+'.png'));im.thumbnail((630,354));out.paste(im,(col*640,i*390+30))
 d.text((10,i*390),p['name']+' 修改前',font=f,fill='#2A2A35');d.text((650,i*390),'修改后',font=f,fill='#2A2A35')
out.save(P/'修改前后对比.png')
run(['node',TOOL,'film','--q','scene=s13','--determinism'])
run(['node',TOOL,'film','--q','scene=s13','--out',str(P/'S13.mp4'),'--crf','16','--fps','30','--workers','1'])
t=json.loads(Path('/workspace/病理科普视频/配音/全稿_v3/timeline.json').read_text())['lines'];rows=[r for r in t if 49<=r['n']<=53];origin=rows[0]['start'];duration=rows[-1]['end']-origin
run(['ffmpeg','-y','-threads','1','-i',str(P/'S13.mp4'),'-ss',str(origin),'-t',str(duration),'-i','/workspace/病理科普视频/配音/全稿_v3/旁白_v3.wav','-map','0:v:0','-map','1:a:0','-vf','scale=1280:720','-c:v','libx264','-threads','1','-crf','16','-c:a','aac','-b:a','192k','-t',str(duration),'-movflags','+faststart',str(P/'S13_带配音_720p.mp4')])
