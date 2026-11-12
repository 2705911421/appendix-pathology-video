import pathlib,json,subprocess,math
import numpy as np
from PIL import Image,ImageDraw,ImageFont
P=pathlib.Path(__file__).resolve().parent
font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',22)
r=json.loads((P/'resolved.json').read_text());cues=json.loads((P.parent/'cues_real.json').read_text())['cues']
v2=P.parent/'粗剪_v2.mp4';v1=P.parent/'粗剪_v1.mp4'
def frame(v,t):
 data=subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(v),'-frames:v','1','-f','image2pipe','-vcodec','png','-threads','1','-'])
 import io
 return Image.open(io.BytesIO(data)).convert('RGB')
for kind,label in [('enter','切入'),('exit','切出')]:
 times=np.linspace(r[kind+'Start']-.1,r[kind+'End']+.1,6)
 sheet=Image.new('RGB',(1920,2*400),'#F4EFE6');d=ImageDraw.Draw(sheet)
 for i,t in enumerate(times):
  t=round(t*30)/30;im=frame(v2,t).resize((640,360));x=(i%3)*640;y=(i//3)*400
  sheet.paste(im,(x,y+40));d.text((x+12,y+8),f'{label}  t={t:.3f}s',font=font,fill='#2A2A35')
 sheet.save(P/f'过渡_{label}.png')
sheet=Image.new('RGB',(3840,380),'#F4EFE6');d=ImageDraw.Draw(sheet)
for i,id in enumerate(['31','34']):
 cue=next(c for c in cues if c['id']==id);t=round((cue['start']+.65)*30)/30
 for j,v in enumerate([v1,v2]):
  sheet.paste(frame(v,t).crop((0,950,1920,1080)),(j*1920,i*190+50))
  d.text((j*1920+15,i*190+10),f'句{id} / v{j+1} / t={t:.3f}s',font=font,fill='#2A2A35')
sheet.save(P/'字幕_v1_vs_v2.png')
video_mae=[]
for t in [1,50,220]:
 a=np.array(frame(v1,t).crop((0,950,1920,1080)),dtype=float);b=np.array(frame(v2,t).crop((0,950,1920,1080)),dtype=float)
 video_mae.append({'t':t,'mae_rgb':float(np.abs(a-b).mean())})
(P/'video_paper_mae.json').write_text(json.dumps(video_mae,indent=2))
print('encoded paper MAE',video_mae)
for v in [v2,P.parent/'粗剪_v2_720p.mp4']:
 data=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(v)]));(P/(v.stem+'_probe.json')).write_text(json.dumps(data,indent=2));print(v.name,data['format']['duration'])
