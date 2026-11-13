from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,numpy as np,hashlib
P=Path(__file__).resolve().parent
font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',24)
k=json.loads((P/'keyframes.json').read_text())
picks=k['picks']+([{'name':'iris_enter'},{'name':'iris_exit'}] if (P/'iris_exit.png').exists() else [])
sheet=Image.new('RGB',(1920,len(picks)*650),'#111114');d=ImageDraw.Draw(sheet)
for i,p in enumerate(picks):
 name=p['name'];src=P/(name+'.png') if name.startswith('iris') else P/'stills'/f"t_{p['t']:06.2f}.png"
 im=Image.open(src).convert('RGB');im.save(P/(name+'.png'))
 box=(960,70,1260,370) if name in ['s69_low','iris_enter'] else (960,350,1260,650)
 detail=im.crop(box).resize((600,600),Image.Resampling.NEAREST);detail.save(P/(name+'_200pct.png'))
 sheet.paste(im.resize((960,540)),(0,i*650+50));sheet.paste(detail,(1140,i*650+40));d.text((20,i*650+5),name,font=font,fill='white');d.text((1140,i*650+5),'200% 局部',font=font,fill='white')
sheet.save(P/'review_sheet.png')
comparison=Image.new('RGB',(1800,2100),'#111114');d=ImageDraw.Draw(comparison)
ref=Path('/workspace/病理科普视频/v5/qa/ref/style_target/t_089.73.png')
metrics={}
for row,name in enumerate(['s70_plasma','s70_lymph','s69_fibrosis']):
 for col,v in enumerate(['e08_s19','e09_s19','样张']):
  im=Image.open(P.parent/v/(name+'.png')).crop((960,350,1260,650)) if col<2 else Image.open(ref).crop((400,460,700,760))
  comparison.paste(im.resize((600,600),Image.Resampling.NEAREST),(col*600,row*700+65));d.text((col*600+12,row*700+18),v+' · '+(['浆细胞','淋巴细胞','纤维化'][row] if col<2 else '间质风格')+' · 200%',font=font,fill='#E8DDE9')
  a=np.array(im.convert('RGB'),dtype=float)
  # Exclude violet nuclei and neutral leader lines; use exactly the same stain mask on all crops.
  mask=(a[:,:,0]>155)&(a[:,:,0]-a[:,:,1]>15)&(a[:,:,2]-a[:,:,1]>2)&(a[:,:,0]>a[:,:,2])
  lum=a[mask]@np.array([.2126,.7152,.0722]);q=np.percentile(lum,[5,50,95]);metrics[name+'_'+v]={'stroma_pixels':int(mask.sum()),'luminance_p05_p50_p95':q.tolist(),'p95_p05':float(q[2]-q[0]),'std':float(lum.std())}
comparison.save(P/'对比_e08_e09_样张.png')
(P/'stroma_histogram.json').write_text(json.dumps(metrics,indent=2,ensure_ascii=False))
# Histograms of identically selected non-nuclear stroma, on one common scale.
hist=Image.new('RGB',(1200,840),'white');hd=ImageDraw.Draw(hist)
for row,name in enumerate(['s70_plasma','s70_lymph','s69_fibrosis']):
 hd.text((20,row*280+10),name,font=font,fill='black')
 for col,v in enumerate(['e08_s19','e09_s19','样张']):
  im=Image.open(P.parent/v/(name+'.png')).crop((960,350,1260,650)) if col<2 else Image.open(ref).crop((400,460,700,760))
  a=np.array(im,dtype=float);mask=(a[:,:,0]>155)&(a[:,:,0]-a[:,:,1]>15)&(a[:,:,2]-a[:,:,1]>2)&(a[:,:,0]>a[:,:,2]);lum=a[mask]@np.array([.2126,.7152,.0722]);h,_=np.histogram(lum,bins=64,range=(100,256));h=h/max(1,h.sum())
  points=[(40+i*17,row*280+240-float(y)*1100) for i,y in enumerate(h)];hd.line(points,fill=['#888888','#b54072','#624d91'][col],width=2);hd.text((350+col*270,row*280+10),v,font=font,fill=['#888888','#b54072','#624d91'][col])
hist.save(P/'间质色阶直方图.png')
files=[line.split('  ')[1] for line in (P/'sha256_开工.txt').read_text().splitlines()]
end=''.join(hashlib.sha256(Path(x).read_bytes()).hexdigest()+'  '+x+'\n' for x in files)
(P/'sha256_结束.txt').write_text(end);assert end==(P/'sha256_开工.txt').read_text();(P/'sha256_校验.log').write_text('七项锁定文件开工/结束 SHA256 完全一致。\n')
print(json.dumps(metrics,ensure_ascii=False,indent=2))
