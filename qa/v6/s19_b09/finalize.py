from pathlib import Path
import json,subprocess,hashlib
import numpy as np
from PIL import Image,ImageDraw,ImageFont
P=Path('qa/v6/s19_b09');k=json.loads((P/'keyframes.json').read_text());start=k['origin'];dur=k['duration']
subprocess.run(['ffmpeg','-y','-i',str(P/'S19.mp4'),'-ss',str(start),'-t',str(dur),'-i','/workspace/病理科普视频/配音/全稿_v3/旁白_v3.wav','-map','0:v:0','-map','1:a:0','-vf','scale=1280:720','-c:v','libx264','-threads','1','-crf','16','-c:a','aac','-b:a','160k','-t',str(dur),'-movflags','+faststart',str(P/'S19_带配音_720p.mp4')],check=True,stdout=subprocess.DEVNULL,stderr=(P/'audio_mux.log').open('w'))
m=json.loads((P/'metrics.json').read_text());m['pixel_tool']=json.loads((P/'pixel_tool.json').read_text());m['video']={}
for f in ['S19.mp4','S19_带配音_720p.mp4']:
 data=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_type,width,height','-of','json',str(P/f)]));length=float(data['format']['duration'])
 r=subprocess.run(['ffmpeg','-i',str(P/f),'-vf','blackdetect=d=0.1:pic_th=0.98','-an','-f','null','-'],capture_output=True,text=True);(P/(f+'.blackdetect.log')).write_text(r.stderr)
 endpoints={}
 for tag,args in [('first',['-ss','0']),('last',['-sseof','-0.2'])]:
  out=P/f'{f}_{tag}.png';subprocess.run(['ffmpeg','-y',*args,'-i',str(P/f),*(['-vf','reverse'] if tag=='last' else []),'-frames:v','1',str(out)],check=True,capture_output=True);a=np.array(Image.open(out).convert('RGB'));endpoints[tag]={'mean_rgb':float(a.mean()),'nonblack_fraction':float((a.max(2)>20).mean())}
 m['video'][f]={'duration_s':length,'timeline_duration_s':dur,'error_s':abs(length-dur),'black_segments':[line for line in r.stderr.splitlines() if 'black_start:' in line],'endpoints':endpoints,'streams':data['streams']}
m['audio']={'source':'配音/全稿_v3/旁白_v3.wav','start_s':start,'end_s':start+dur,'duration_s':dur,'sentences':[69,70]}
# Report overlay coverage in the actual production cameras, independently of the reference audit camera.
y,x=np.mgrid[:1080,:1920];circle=(x-1110)**2+(y-475)**2<424**2
load=lambda f:np.array(Image.open(f).convert('RGB')).astype(int)
m['production_overlay']={}
for pick in k['picks']:
 n=pick['name'];b=load(P/'audit'/f'bare_{n}.png');co=load(P/'audit'/f'collagen_{n}.png');ce=load(P/'audit'/f'cells_{n}.png')
 m['production_overlay'][n]={'collagen_percent':float(((abs(co-b).max(2)>0)&circle).sum()/circle.sum()*100),'cells_percent':float(((abs(ce-b).max(2)>0)&circle).sum()/circle.sum()*100)}
# Compare production lymph frame with reference, bringing both to the same effective magnification.
ref=Image.open('qa/v6/b10/s08_high_s31.png').convert('RGB');prod=Image.open(P/'keyframes/s70_lymph.png').convert('RGB');half=160*2.7/1.45
refcrop=ref.crop((round(1110-half),round(475-half),round(1110+half),round(475+half))).resize((640,640),Image.Resampling.NEAREST)
prod=prod.crop((950,315,1270,635)).resize((640,640),Image.Resampling.NEAREST)
comp=Image.new('RGB',(1280,700),'#eee9e0');comp.paste(refcrop,(0,60));comp.paste(prod,(640,60));d=ImageDraw.Draw(comp);font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',22)
d.text((10,8),'b10 s31 / normalized to z=1.45 / 200%',font=font,fill='#51336F');d.text((650,8),'S19 lymph / z=1.45 / 200%',font=font,fill='#51336F');comp.save(P/'compare_vs_ref_200pct.png')
m['rounds']=3;m['lock_check']={'start_ok':16,'end_ok':16,'files_unchanged':True};m['deviations']=['overview z=.60 instead of .50, to meet measured medium-power scale','oil pan settles at sentence70 fraction .87 and holds through the end','plasma sample42 consists of 14 source cells measured at 3 actual periodic atlas occurrences; source-cell limit remains14','targeted pixel segmentation has14 separated lymph nuclei due to overlapping clusters; supplied pixel tool has130 nuclear clusters']
m['failures']=[{'requirement':'医学：中性粒细胞/脓细胞=0','measured':m['medical']['inherited_pus_source_centres_inside_crop'],'threshold':0,'reason':'Locked drawHE renders kind=pus regardless of neut=0. Only the two explicitly permitted S08 neutrophil loops were skipped; clearing the inherited population is outside permitted operations.'},{'requirement':'医学：上皮完整','measured_ulcer_parameter':.16,'measured_source_gap_units':32,'threshold_gap_units':0,'reason':'Verbatim S08 buildSource calls drawHE with ulcer:.16. drawHE creates a surface gap from x=-6 to26. Fixing it requires altering a base call or drawing outside the three permitted overlays.'}]
m['status']='failed';(P/'metrics.json').write_text(json.dumps(m,ensure_ascii=False,indent=2))
