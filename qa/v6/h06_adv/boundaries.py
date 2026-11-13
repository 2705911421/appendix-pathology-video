from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import subprocess,json,numpy as np,sys
suffix=sys.argv[1] if len(sys.argv)>1 else '';P=Path(__file__).resolve().parent;win=json.loads((P/'splice/window.json').read_text());ns=[]
for key in ['start_frame','join_frame','end_frame']:
 for i in [-2,-1,0,1,2]:ns.append(win[key]+i)
d=P/('boundary_frames'+suffix);d.mkdir(exist_ok=True);sheet=Image.new('RGB',(5*384,3*245),'#F4EFE6');dr=ImageDraw.Draw(sheet);f=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',18);metrics=[]
select="select='"+'+'.join('eq(n,'+str(n)+')' for n in ns)+"'"
for source,prefix in [(P/('粗剪_v15'+suffix+'.mp4'),'new'),(P.parent/'animatic'/('粗剪_v14'+suffix+'.mp4'),'old')]:
 subprocess.run(['ffmpeg','-v','error','-y','-threads','1','-i',str(source),'-vf',select,'-vsync','0','-threads','1',str(d/(prefix+'_%02d.png'))],check=True)
for i,n in enumerate(ns):
 im=Image.open(d/('new_%02d.png'%(i+1))).convert('RGB');ar=np.array(im)[:950];assert ar.std()>15 or not(win['start_frame']<=n<win['end_frame']);metrics.append({'frame':n,'std':float(ar.std())});x=i%5*384;y=i//5*245;sheet.paste(im.resize((384,216)),(x,y+28));dr.text((x+5,y+2),str(n),font=f,fill='black')

for i,n in enumerate(ns):
 if n<win['start_frame'] or n>=win['end_frame']:
  a=np.array(Image.open(d/('new_%02d.png'%(i+1)))).astype(int);b=np.array(Image.open(d/('old_%02d.png'%(i+1)))).astype(int);mae=float(abs(a-b).mean());assert mae==0,(n,mae);metrics[i]['outside_window_decoded_MAE']=mae
sheet.save(P/('boundary_review'+suffix+'.png'));(P/('boundary_metrics'+suffix+'.json')).write_text(json.dumps(metrics,indent=2))
