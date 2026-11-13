from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,numpy as np
P=Path(__file__).resolve().parent
G=json.loads((P/'cell_geometry.json').read_text());font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',18)
# Fixed same-area crops: original pixels, no rescaling before counting.
boxes={'e09':(1050,415,1170,535),'e10':(1050,415,1170,535),'样张':(500,560,620,680)}
# Manual grouping of lobes by visible cytoplasmic envelope. Ambiguous boundary groups are reported separately.
ref_centres=[(33,2),(47,2),(70,5),(113,7),(115,28),(29,35),(6,49),(40,49),(92,54),(113,47),(29,68),(49,68),(69,71),(110,71),(26,89),(69,85),(45,118),(90,108),(106,108)]
counts={};out=Image.new('RGB',(1440,570),'#111114');d=ImageDraw.Draw(out)
for col,v in enumerate(['e09','e10','样张']):
 box=boxes[v]
 im=Image.open(P.parent/(v+'_s19')/'s70_lymph.png') if v!='样张' else Image.open('/workspace/病理科普视频/v5/qa/ref/style_target/t_089.73.png')
 crop=im.crop(box);a=np.array(crop);mask=(a[:,:,0]<145)&(a[:,:,1]<120)&(a[:,:,2]>a[:,:,0]+4)
 if v!='样张':
  cp=G[v]['focus']['lymph'];cs=G[v]['cells'];centres=[((q['x']-cp[0])*4.8+60,(q['y']-cp[1])*4.8+60) for q in cs if q['type']=='lymph' and abs((q['x']-cp[0])*4.8)<60 and abs((q['y']-cp[1])*4.8)<60]
 else:centres=ref_centres
 counts[v]={'source_box':box,'area_pixels':14400,'lymphocyte_centres' if v!='样张' else 'manually_grouped_acute_cells':len(centres),'dark_nuclear_pixel_fraction':float(mask.mean())}
 tile=crop.resize((480,480),Image.Resampling.NEAREST);td=ImageDraw.Draw(tile)
 for i,(x,y) in enumerate(centres):
  td.ellipse((x*4-3,y*4-3,x*4+3,y*4+3),outline='#48ad43',width=1)
  if v=='样张':td.text((x*4+3,y*4),str(i+1),fill='#167220',font=font)
 out.paste(tile,(col*480,55));d.text((col*480+8,8),v+' · 120×120 原像素 · 400%',font=font,fill='white')
counts['reference_note']='人工归组19个可辨急性细胞；边缘和密集处约±3个的不确定性。多个核叶只算一个细胞；不能与单核淋巴细胞数按1:1匹配。深核面积率仅为统一阈值的图像描述。'
out.save(P/'同面积细胞计数.png')
cp=G['e10']['focus']['plasma'];pl=[q for q in G['e10']['cells'] if q['type']=='plasma' and abs((q['x']-cp[0])*22)<150 and abs((q['y']-cp[1])*22)<150]
counts['plasma_300x300']={'count':len(pl),'centres_screen':[[1110+(q['x']-cp[0])*22,475+(q['y']-cp[1])*22] for q in pl]};assert len(pl)==4
im=Image.open(P/'s70_plasma.png').copy();dr=ImageDraw.Draw(im)
for i,(x,y) in enumerate(counts['plasma_300x300']['centres_screen']):dr.ellipse((x-33,y-28,x+33,y+28),outline='#58a553',width=2);dr.text((x+35,y),str(i+1),font=font,fill='#58a553')
im.save(P/'浆细胞四枚_核对.png')
(P/'cell_counts.json').write_text(json.dumps(counts,ensure_ascii=False,indent=2))
for name in ['s69_low','s69_middle','s69_fibrosis']:Image.open(P/(name+'.png')).resize((3840,2160),Image.Resampling.NEAREST).save(P/(name+'_全画面200pct.png'))
print(json.dumps(counts,ensure_ascii=False,indent=2))
