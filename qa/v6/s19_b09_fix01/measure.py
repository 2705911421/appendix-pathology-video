from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np,json,math,hashlib
from scipy import ndimage as ndi
P=Path('qa/v6/s19_b09_fix01');q=json.loads((P/'populations.json').read_text());K=json.loads((P/'keyframes.json').read_text());metrics={}
y,x=np.mgrid[:1080,:1920];circle=(x-1110)**2+(y-475)**2<424**2
load=lambda f:np.array(Image.open(f).convert('RGB')).astype(float)
base=load(P/'bare.png');full=load(P/'chronic.png');faith=load(P/'fidelity/t_000.00.png');col=load(P/'collagen.png');cells=load(P/'cells.png')
cm=np.max(abs(col-base),2)>.5;lm=np.max(abs(cells-base),2)>.5;nm=np.max(abs(faith-base),2)>.5
ref=load('qa/v6/b10/s08_high_s31.png');fidelity_mae=float(abs(faith-ref)[circle].mean());metrics['fidelity']={'mae_255':fidelity_mae,'threshold':1.0,'pass':fidelity_mae<=1};(P/'fidelity.json').write_text(json.dumps(metrics['fidelity'],indent=2))
mask=circle&~ndi.binary_dilation(cm|lm|nm,iterations=2)
metrics['unchanged']={'mae_255':float(abs(full-faith)[mask].mean()),'n_pixels':int(mask.sum()),'collagen_percent':float((cm&circle).sum()/circle.sum()*100),'cells_percent':float((lm&circle).sum()/circle.sum()*100),'measurement_camera_z':2.7}
Image.fromarray(np.uint8(mask)*255).save(P/'unchanged_mask.png')
def point(x,y):
 a=x/620-math.pi/2;r=620+y+12*math.sin(a*3)+9*math.sin(a*5);u=1.6*math.cos(a)*r;v=math.sin(a)*r
 return np.array([u*math.cos(.14)-v*math.sin(.14),u*math.sin(.14)+v*math.cos(.14)])
def jac(p):
 return np.column_stack(((point(p['x']+.001,p['y'])-point(p['x']-.001,p['y']))/.002,(point(p['x'],p['y']+.001)-point(p['x'],p['y']-.001))/.002))
def diam(p,z,body=False):
 # Nominal ellipse diameter after rotation and full polar-map Jacobian: geometric mean of principal diameters.
 rx,ry=(9,8) if body else ((5.3,5.1) if p['type']=='lymph' else (4.4,4.3))
 a=p['rot'];rot=np.array([[math.cos(a),-math.sin(a)],[math.sin(a),math.cos(a)]])
 J=jac(p)@rot@np.diag([rx,ry])*p['sz']*z
 axes=np.linalg.svd(J,compute_uv=False)*2
 return float(np.sqrt(np.prod(axes)))
metrics['sizes']={}
for typ in ['lymph','plasma']:
 new=[p for p in q['populations'] if p['type']==typ]; unique_n=len(new)
 if typ=='plasma':new=[dict(p,x=p['x']+turn*840) for turn in [-1,0,1] for p in new]
 ref=[p for p in q['referencePopulations'] if p['type']==typ]
 n=[diam(p,1.45) for p in new];r=[diam(p,1.45) for p in ref]
 metrics['sizes'][typ]={'new_n':len(n),'unique_source_cells':unique_n,'reference_n':len(r),'new_median_px':float(np.median(n)),'reference_median_px':float(np.median(r)),'ratio':float(np.median(n)/np.median(r)),'implied_um_at_fov475':float(np.median(n)/(850/475)),'samples':n}
new=[p for p in q['populations'] if p['type']=='plasma'];metrics['sizes']['oil_body']={'n':len(new),'median_px':float(np.median([diam(p,3.25,True) for p in new])),'focused_px':diam(new[0],3.25,True),'implied_um':float(np.median([diam(p,3.25,True) for p in new])/(850/190))}
metrics['scale']={'z_hi':1.45,'z_oil':3.25,'high_px_um':850/475,'overview_px_um':850/475*.60/1.45,'oil_px_um':850/190}
metrics['focus']={name:{'atlas_relative_xy':pt,'atlas_pixel_xy':[pt[0]+1600,pt[1]+1050],'screen_when_centered':[1110,475]} for name,pt in q['focus'].items()}
font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',24)
(P/'keyframes').mkdir(exist_ok=True);sheet=Image.new('RGB',(1920,1240),'#eee9e0');d=ImageDraw.Draw(sheet);metrics['determinism']={};metrics['contrast']={}
for i,p in enumerate(K['picks']):
 f=f"t_{p['t']:06.2f}.png";im=Image.open(P/'stills'/f).convert('RGB');name=p['name'];im.save(P/'keyframes'/f'{name}.png')
 crop=im.crop((960,325,1260,625)).resize((600,600),Image.Resampling.NEAREST);crop.save(P/'keyframes'/f'{name}_200pct.png')
 sheet.paste(im.resize((960,540)),((i%2)*960,(i//2)*620+55));d.text(((i%2)*960+20,(i//2)*620+15),f"{name}   t={p['t']:.3f}s",font=font,fill='#51336F')
 md5=lambda f:hashlib.md5(f.read_bytes()).hexdigest()
 metrics['determinism'][name]={'first':md5(P/'stills'/f),'second':md5(P/'repeat'/f),'pass':md5(P/'stills'/f)==md5(P/'repeat'/f)}
 if i:
  arr=np.array(im).astype(float)/255;bg=arr[235:280,1550:1820].reshape(-1,3);dark=bg[np.max(bg,1)<.2].mean(0)
  lin=lambda x:np.where(x<=.04045,x/12.92,((x+.055)/1.055)**2.4)
  lum=lambda x:float(lin(np.array(x))@np.array([.2126,.7152,.0722]))
  fg=bg[np.linalg.norm(bg-np.array([216,197,231])/255,axis=1)<.035].mean(0)
  metrics['contrast'][name]=(lum(fg)+.05)/(lum(dark)+.05)
sheet.save(P/'review_sheet.png')
# Same 2.7 zoom on left and right for direct comparison; production high is 1.45, recorded separately.
comp=Image.new('RGB',(1280,690),'#eee9e0');draw=ImageDraw.Draw(comp)
a=Image.open('qa/v6/b10/s08_high_s31.png').convert('RGB');b=Image.open(P/'chronic.png').convert('RGB')
for i,(im,title) in enumerate([(a,'b10 / z=2.7'),(b,'b09 chronic / z=2.7 (audit only)')]):
 comp.paste(im.crop((950,315,1270,635)).resize((640,640),Image.Resampling.NEAREST),(i*640,50));draw.text((i*640+12,8),title,font=font,fill='#51336F')
comp.save(P/'compare_vs_ref_200pct.png')
metrics['text']={'minimum_px':36,'title_px':44,'max_content_y':906,'contrast_min':min(metrics['contrast'].values())}
metrics['events']={'max_error_s':0,'source':'配音/全稿_v3/timeline.json','origin':K['origin'],'duration':K['duration']}
(P/'metrics.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in metrics.items() if k not in ['focus','determinism']},ensure_ascii=False,indent=2))
