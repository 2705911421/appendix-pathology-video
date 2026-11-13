import json
from pathlib import Path
from PIL import Image
import numpy as np
P=Path('qa/v6/a02');out=[]
for c in json.loads((P/'configs.json').read_text()):
 rows=[]
 for p in c['key']['picks']:
  a=np.asarray(Image.open(Path(c['dir'])/(p['name']+'.png')).convert('RGB'),dtype=np.int16); b=np.asarray(Image.open(P/c['scene']/(p['name']+'.png')).convert('RGB'),dtype=np.int16)
  rows.append(dict(name=p['name'],t=p['t'],MAE=float(np.abs(a-b).mean())))
 out.append(dict(scene=c['scene'],reference=c['dir'],max_MAE=max(r['MAE'] for r in rows),frames=rows))
(P/'mae.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)); print([(x['scene'],x['max_MAE']) for x in out])
