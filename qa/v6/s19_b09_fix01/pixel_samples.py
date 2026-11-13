from pathlib import Path
from PIL import Image
from scipy import ndimage as ndi
import numpy as np,json,math
P=Path('qa/v6/s19_b09_fix01');q=json.loads((P/'populations.json').read_text());K=json.loads((P/'keyframes.json').read_text());m=json.loads((P/'metrics.json').read_text())
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
# Same projection as the failed delivery. A centre counts only when the painted window is still a neutrophil nucleus.
# Chronic mode covers every kind=pus footprint, so a dark-purple nucleus at the projected centre means the cell is still drawn.
pus=q['inheritedPus']
frames={p['name']:np.array(Image.open(P/'keyframes'/f"{p['name']}.png").convert('RGB')) for p in K['picks']}
def nuclear(win):
 # Neutrophil chromatin #51336F/#3F2A66. Epithelium #6B4C9A is lighter (r≈107) and is excluded.
 r,g,b=win[:,:,0].astype(int),win[:,:,1].astype(int),win[:,:,2].astype(int)
 return (r<100)&(g<80)&(b>r)&(b<160)&(b>40)
ulcer=0.0;gap0=-90+100*(1-ulcer);gap1=110-100*(1-ulcer)
m['medical']={'added_neutrophils':0,'epithelium_ulcer_parameter':ulcer,'epithelium_gap_units':gap1-gap0,'gap_x':[gap0,gap1],'clusters':4,'lymph_added':112,'plasma_added':14,'collagen_bands':3,'neutrophils_zero_pass':True,'pus_painted':{}}
for name,camrow in zip([p['name'] for p in K['picks']],q['cameras']):
 cx,cy,z=camrow['camera'];painted=0;projected=0;im=frames[name]
 for p in pus:
  if not(-320<=p['y']<280 and -420<=p['x']<420):continue
  for turn in range(-2,5):
   sx=p['x']+840*turn
   if not(-math.pi<=(sx/620-math.pi/2)<math.pi):continue
   screen=np.array([1110.,475.])+(point(sx,p['y'])-np.array([cx,cy]))*z
   if np.linalg.norm(screen-[1110,475])>=425:continue
   projected+=1;xx,yy=int(round(screen[0])),int(round(screen[1]))
   win=im[max(0,yy-6):yy+7,max(0,xx-6):xx+7]
   if nuclear(win).sum()>=3:painted+=1
 m['medical']['pus_painted'][name]={'projected_centres':projected,'painted_nuclear_windows':painted}
m['medical']['painted_pus_max']=max(v['painted_nuclear_windows'] for v in m['medical']['pus_painted'].values())
m['medical']['neutrophils_zero_pass']=m['medical']['painted_pus_max']==0 and m['medical']['epithelium_gap_units']==0
m['scale']['empirical_high_px_um_from_lymph7p5']=m['sizes']['lymph']['new_median_px']/7.5
m['scale']['empirical_overview_px_um']=m['scale']['empirical_high_px_um_from_lymph7p5']*.60/1.45
m['focus']['lymph']['screen_at_keyframe']=(np.array([1110,475])+(np.array(q['focus']['lymph'])-np.array(q['cameras'][2]['camera'][:2]))*q['cameras'][2]['camera'][2]).tolist()
(P/'metrics.json').write_text(json.dumps(m,ensure_ascii=False,indent=2));print(json.dumps({k:v for k,v in m.items() if k in ['pixel_targeted','medical','scale']},ensure_ascii=False,indent=2))
