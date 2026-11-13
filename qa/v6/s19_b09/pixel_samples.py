from pathlib import Path
from PIL import Image
from scipy import ndimage as ndi
import numpy as np,json,math
P=Path('qa/v6/s19_b09');q=json.loads((P/'populations.json').read_text());K=json.loads((P/'keyframes.json').read_text());m=json.loads((P/'metrics.json').read_text())
def point(x,y):
 a=x/620-math.pi/2;r=620+y+12*math.sin(a*3)+9*math.sin(a*5);u=1.6*math.cos(a)*r;v=math.sin(a)*r
 return np.array([u*math.cos(.14)-v*math.sin(.14),u*math.sin(.14)+v*math.cos(.14)])
pick=K['picks'][2];cam=q['cameras'][2]['camera'];arr=np.array(Image.open(P/'keyframes/s70_lymph.png').convert('RGB'));r,g,b=np.moveaxis(arr.astype(int),-1,0);dark=(r<120)&(g<90)&(b>r)
lab,n=ndi.label(dark);objs=ndi.find_objects(lab);samples=[];seen=set()
for p in q['populations'][:112]:
 uv=np.array([1110,475])+(point(p['x'],p['y'])-np.array(cam[:2]))*cam[2];xx,yy=np.rint(uv).astype(int)
 if not(0<=xx<1920 and 0<=yy<1080) or np.linalg.norm(uv-[1110,475])>390:continue
 near=lab[max(0,yy-3):yy+4,max(0,xx-3):xx+4];ids=near[near>0]
 if not len(ids):continue
 ids=np.bincount(ids).argmax()
 if ids in seen:continue
 seen.add(ids);sl=objs[ids-1];h=sl[0].stop-sl[0].start;w=sl[1].stop-sl[1].start;area=np.sum(lab[sl]==ids);d=math.sqrt(4*area/math.pi)
 if w>28 or h>28 or area<18:continue
 samples.append({'source_xy':[p['x'],p['y']],'screen_xy':uv.tolist(),'diameter_px':d,'component_wh':[w,h]})
m['pixel_targeted']={'n':len(samples),'median_px':float(np.median([s['diameter_px'] for s in samples])),'samples':samples};m['pixel_targeted']['median_um']=m['pixel_targeted']['median_px']/(850/475)
# The preserved drawHE routine includes lumen kind=pus independently of neut=0. Count centres surviving source crop.
pus=q['inheritedPus'];m['medical']={'added_neutrophils':0,'inherited_pus_source_centres_inside_crop':sum(-320<=p['y']<280 and -420<=p['x']<420 for p in pus),'inherited_pus_source_near_crop':len(pus),'epithelium_original_ulcer_parameter':.16,'clusters':4,'lymph_added':112,'plasma_added':14,'collagen_bands':3,'gap_or_ulcer_mode_used':False,'neutrophils_zero_pass':False}
for name,camrow in zip([p['name'] for p in K['picks']],q['cameras']):
 cx,cy,z=camrow['camera'];count=0
 for p in pus:
  if not(-320<=p['y']<280 and -420<=p['x']<420):continue
  for turn in range(-2,5):
   sx=p['x']+840*turn
   if not(-math.pi<=(sx/620-math.pi/2)<math.pi):continue
   screen=np.array([1110,475])+(point(sx,p['y'])-np.array([cx,cy]))*z
   if np.linalg.norm(screen-[1110,475])<425:count+=1
 m['medical'][name+'_inherited_pus_centres']=count
m['scale']['empirical_high_px_um_from_lymph7p5']=m['sizes']['lymph']['new_median_px']/7.5
m['scale']['empirical_overview_px_um']=m['scale']['empirical_high_px_um_from_lymph7p5']*.60/1.45
m['focus']['lymph']['screen_at_keyframe']=(np.array([1110,475])+(np.array(q['focus']['lymph'])-np.array(q['cameras'][2]['camera'][:2]))*q['cameras'][2]['camera'][2]).tolist()
(P/'metrics.json').write_text(json.dumps(m,ensure_ascii=False,indent=2));print(json.dumps({k:v for k,v in m.items() if k in ['pixel_targeted','medical','scale']},ensure_ascii=False,indent=2))
