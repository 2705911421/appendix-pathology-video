from pathlib import Path
import json,numpy as np
from PIL import Image,ImageDraw,ImageFont
class Components:
 @staticmethod
 def binary_fill_holes(mask):
  # Nuclear centre is already below the threshold; fill small internal holes by flood from exterior.
  from collections import deque
  outside=np.zeros(mask.shape,bool);q=deque()
  h,w=mask.shape
  for y,x in [(0,i) for i in range(w)]+[(h-1,i) for i in range(w)]+[(i,0) for i in range(h)]+[(i,w-1) for i in range(h)]:
   if not mask[y,x] and not outside[y,x]:outside[y,x]=True;q.append((y,x))
  while q:
   y,x=q.popleft()
   for yy,xx in [(y-1,x),(y+1,x),(y,x-1),(y,x+1)]:
    if 0<=yy<h and 0<=xx<w and not mask[yy,xx] and not outside[yy,xx]:outside[yy,xx]=True;q.append((yy,xx))
  return ~outside
 @staticmethod
 def label(mask):
  h,w=mask.shape;lab=np.zeros((h,w),int);n=0
  for y,x in zip(*np.nonzero(mask)):
   if lab[y,x]:continue
   n+=1;lab[y,x]=n;q=[(y,x)]
   while q:
    yy,xx=q.pop()
    for a,b in [(yy-1,xx),(yy+1,xx),(yy,xx-1),(yy,xx+1)]:
     if 0<=a<h and 0<=b<w and mask[a,b] and not lab[a,b]:lab[a,b]=n;q.append((a,b))
  return lab,n
 @staticmethod
 def find_objects(labels):
  out=[]
  for i in range(1,labels.max()+1):
   y,x=np.nonzero(labels==i);out.append((slice(y.min(),y.max()+1),slice(x.min(),x.max()+1)))
  return out
ndimage=Components
P=Path(__file__).resolve().parent
font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',19)
results={};sheet=Image.new('RGB',(1800,700),'#111114');d=ImageDraw.Draw(sheet)
for col,(v,path,box) in enumerate([('e11',P.parent/'e11_s19/s70_lymph.png',(960,350,1260,650)),('e12',P/'s70_lymph.png',(960,350,1260,650)),('样张',Path('/workspace/病理科普视频/v5/qa/ref/style_target/t_089.73.png'),(400,460,700,760))]):
 im=Image.open(path).convert('RGB').crop(box);a=np.asarray(im,dtype=float)
 mask=(a[:,:,0]<155)&(a[:,:,1]<125)&(a[:,:,2]>a[:,:,0]+4)
 mask=ndimage.binary_fill_holes(mask)
 labels,n=ndimage.label(mask);profiles=[]
 for i,sl in enumerate(ndimage.find_objects(labels),1):
  if sl is None:continue
  m=labels[sl]==i;area=int(m.sum());yy,xx=np.nonzero(m)
  if area<5 or sl[0].start==0 or sl[1].start==0 or sl[0].stop==300 or sl[1].stop==300:continue
  cov=np.cov(np.array([xx,yy]));eig=np.linalg.eigvalsh(cov)+.1
  if np.sqrt(eig[1]/eig[0])>2:continue
  profiles.append({'centre':[float(xx.mean()+sl[1].start),float(yy.mean()+sl[0].start)],'area':area,'diameter':float(2*np.sqrt(area/np.pi))})
 ds=[q['diameter'] for q in profiles]
 results[v]={'source_box':box,'area_pixels':90000,'nuclear_profiles':len(ds),'mean_equivalent_diameter_px':float(np.mean(ds)),'median_equivalent_diameter_px':float(np.median(ds)),'profiles':profiles,'accepted_nuclear_area_fraction':float(sum(q['area'] for q in profiles)/90000)}
 tile=im.resize((600,600),Image.Resampling.NEAREST);dr=ImageDraw.Draw(tile)
 for q in profiles:
  x,y=q['centre'];dr.ellipse((x*2-3,y*2-3,x*2+3,y*2+3),outline='#4d9b58')
 sheet.paste(tile,(col*600,65));d.text((col*600+8,10),f"{v} · 300×300 原像素 · 200%",font=font,fill='white');d.text((col*600+8,670),f"均值 {np.mean(ds):.2f} px / {len(ds)} 核轮廓",font=font,fill='white')
results['method']='同面积300×300原像素；统一RGB阈值，填核内浅区；排除边界、面积<5px和主轴比>2的梭形轮廓。等效圆直径=2√(面积/π)。样张分叶核按可分辨核轮廓而非整细胞统计，故只能比较图像核径，不能作生物学尺寸推断。'
(P/'nuclear_diameter.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));sheet.save(P/'同面积核径对比.png');print({k:v['nuclear_profiles'] for k,v in results.items() if isinstance(v,dict)})
