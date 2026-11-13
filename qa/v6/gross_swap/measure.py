from PIL import Image
import cv2,numpy as np,json,pathlib,math,subprocess,hashlib
R=pathlib.Path(__file__).resolve().parents[3];B=R/'qa/v6/gross_swap';G=json.load(open(B/'geometry.json'));paper=np.array([244,239,230],float)
def mat(x,y,sc,rot):
 a,b=sc*math.cos(rot),sc*math.sin(rot);return np.array([[a,-b,x],[b,a,y],[0,0,1]],float)
REF=mat(**G['reference_pose'])
def shape_mask(state,M):
 pts=np.array(G['states'][state]);pts=np.c_[pts,np.ones(len(pts))]@M.T
 mask=np.zeros((1080,1920),np.uint8);cv2.fillPoly(mask,[np.round(pts[:,:2]).astype('int32')],1);return mask
refs={s:cv2.cvtColor(cv2.imread(str(R/f'qa/gross/gross_{ch}.png')),cv2.COLOR_BGR2RGB) for s,ch in [('normal','正常'),('red','红'),('yellow','黄'),('black','黑')]}
def ref_compare(im,state,M,alpha=1,clip=None,ref_img=None):
 # Prefer a same-pose reference render (ref_img) over warpAffine from fixed-pose screenshot.
 # warpAffine across >2x scale change blurs watercolor grain and inflates MAE artificially.
 # When ref_img is provided, alpha is already baked into the reference render — do NOT re-apply it.
 if ref_img is not None:
  expected=ref_img.astype(float)
 else:
  A=(M@np.linalg.inv(REF))[:2]
  expected=cv2.warpAffine(refs[state],A,(1920,1080),flags=cv2.INTER_LINEAR,borderValue=(244,239,230))
  expected=np.clip(expected*alpha+paper*(1-alpha),0,255)
 mask=shape_mask(state,M)
 if clip is not None:mask*=clip
 # Full contour region and inner region both reported; no hidden error cropping.
 err=np.abs(im.astype(float)-expected)
 core=cv2.erode(mask,np.ones((5,5),np.uint8))
 return {'state':state,'mae_255':float(err[mask>0].mean()) if mask.any() else None,'inner_mae_255':float(err[core>0].mean()) if core.any() else None,'region_px':int(mask.sum())},expected.astype('uint8'),mask
smooth=lambda p:(lambda x:x*x*(3-2*x))(max(0,min(1,p)))
rows=json.load(open('/workspace/病理科普视频/配音/全稿_v3/timeline.json'))['lines'];row={r['n']:r for r in rows}
results={}
for key in ['S01','S05','S06','S11_s46','S18_s66']:
 out=B/key
 if not (out/'events.json').exists():continue
 ev=json.load(open(out/'events.json'));images=sorted((out/'stills').glob('t_*.png'));before=sorted((out/'before').glob('t_*.png'))
 ref_imgs=sorted((out/'reference').glob('t_*.png')) if (out/'reference').exists() else []
 fm=[]
 for idx,(sample,src,old) in enumerate(zip(ev['samples'],images,before)):
  im=np.array(__import__('PIL').Image.open(src).convert('RGB'));prev=np.array(__import__('PIL').Image.open(old).convert('RGB'))
  ref_raw=np.array(__import__('PIL').Image.open(ref_imgs[idx]).convert('RGB')) if idx<len(ref_imgs) else None
  mask=np.zeros((1080,1920),np.uint8);n=sample['sentence'];f=sample['fraction'];parts=[]
  if key=='S01':
   mask[0:950,548:1884]=1
   if n==1:
    g=smooth((f-.4)/(.74-.4));parts=[('normal',mat(1215,420,.90+.16*g,-.78),1)]
   elif n in [2,4,5]:parts=[(s,mat(x,440,.7,-1.2),.82 if n==5 else 1) for s,x in [('red',878),('yellow',1225),('black',1572)]]
   elif n==3:parts=[('yellow',mat(1240,385,1.02,-1.2),1)]
  elif key=='S05':
   mask[0:950,550:1890]=1
   if n>=21 or f>=.9:parts=[('black',mat(1240,355,1.425,-.62),1)]
  elif key=='S06':
   mask[0:950,400:1460]=1
   if n==24:
    circle=np.zeros_like(mask);cv2.circle(circle,(1410,490),390,1,-1);mask[circle>0]=0
    parts=[('red',mat(815,480,.83,-1.12),1)]
   elif f>=.72:parts=[('red',mat(1220,395,1.72,-.65),1)]
  elif key=='S11_s46':
   cv2.circle(mask,(1110,475),433,1,-1);mask[260:470,60:1015]=1;mask[0:50,1000:1250]=1
   q=np.array(G['focusPoint']);M=mat(1110,475,3,-1.2);M[:2,2]-=M[:2,:2]@q;parts=[('yellow',M,1)]
  elif key=='S18_s66':
   mask[120:820,900:1800]=1
   if f==.1:
    pts=np.array(G['states']['normal']);center=(pts.min(0)+pts.max(0))/2;M=mat(1340,470,.74,-.62);M[:2,2]-=M[:2,:2]@center;parts=[('red',M,1)]
  d=np.abs(im.astype(float)-prev.astype(float));item={**sample,'outside_mae_255':float(d[mask==0].mean()),'outside_changed_px':int(np.any(d>0,axis=2)[mask==0].sum()),'reference':[]}
  for j,(state,M,a) in enumerate(parts):
   clip=np.ones_like(mask)
   if key=='S11_s46':clip[:]=0;cv2.circle(clip,(1110,475),422,1,-1)
   if key=='S06' and n==24:cv2.circle(clip,(1410,490),393,0,-1)
   # S01 s2/s4/s5: three states in one frame → ref_raw is a full-frame reference with all states at same pose
   # Pass ref_raw for ALL parts of a multi-state frame (mask selects the right region)
   use_ref=ref_raw if ref_raw is not None else None
   m,expected,region=ref_compare(im,state,M,a,clip,ref_img=use_ref);item['reference'].append(m)
   if j==0:
    ys,xs=np.where(region>0)
    if len(xs):
     box=(max(0,xs.min()-8),max(0,ys.min()-8),min(1920,xs.max()+9),min(1080,ys.max()+9));x0,y0,x1,y1=box
     panel=np.concatenate([expected[y0:y1,x0:x1],im[y0:y1,x0:x1]],axis=1)
     from PIL import Image
     Image.fromarray(panel).resize((panel.shape[1]*2,panel.shape[0]*2)).save(out/f"compare_s{n}_f{round(f*100)}_200pct.png")
  fm.append(item)
 metrics={'frames':fm,'outside_mae_max':max((x['outside_mae_255'] for x in fm),default=None),'reference_mae_max':max((m['mae_255'] for x in fm for m in x['reference']),default=None)}
 results[key]=metrics;(out/'metrics_frames.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2))
(B/'pixel_metrics.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps({k:{a:v for a,v in x.items() if a!='frames'} for k,x in results.items()},indent=2))
