from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,statistics
P=Path(__file__).resolve().parent
# Manual outer cytoplasm bounds, all in native 1920x1080 output pixels.
boxes={'s44':[(1002,294,1063,353),(1080,451,1129,497),(1151,449,1196,497)],'s45_pus':[(1002,294,1063,353),(1080,451,1129,497),(1151,449,1196,497)],'s55':[(1022,349,1073,398),(1070,373,1120,421),(1114,340,1163,389)]}
out={}
for name,bs in boxes.items():
 path=P/'s55.png' if name=='s55' else P.parent/'d01_s11'/(name+'.png')
 im=Image.open(path).convert('RGB');d=ImageDraw.Draw(im)
 sizes=[]
 for i,b in enumerate(bs):
  d.rectangle(b,outline='#00c7a2',width=1);d.text((b[0],b[1]-13),str(i+1),fill='black');sizes.append({'id':i+1,'bbox':b,'width':b[2]-b[0],'height':b[3]-b[1]})
 out[name]={'method':'manual outer cytoplasm bounds, ±2 px; identical coordinate crop for s44/s45; exclude overlapping/occluded edges where possible','cells':sizes,'median_width':statistics.median(x['width'] for x in sizes),'median_height':statistics.median(x['height'] for x in sizes)}
 im.crop((950,260,1250,560)).resize((600,600),Image.Resampling.NEAREST).save(P/(name+'_measure_200pct.png'))
(P/'cell_measurements.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
