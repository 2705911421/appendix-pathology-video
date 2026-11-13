from pathlib import Path
import subprocess,json,hashlib,math
import numpy as np
from PIL import Image,ImageDraw,ImageFont
P=Path(__file__).resolve().parent; A=P.parent/'animatic'
def run(cmd):return subprocess.check_output(list(map(str,cmd)))
def probe(p):return json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',p]))
report={}
for suffix in ['', '_720p']:
 f=A/('粗剪_v16'+suffix+'.mp4');old=P.parent/'h06_adv'/('粗剪_v15'+suffix+'.mp4')
 q=probe(f); run(['ffmpeg','-v','error','-threads','1','-i',f,'-map','0:v','-map','0:a','-f','null','-'])
 def audio(p):return run(['ffmpeg','-v','error','-i',p,'-map','0:a:0','-c','copy','-f','adts','-'])
 ah=hashlib.sha256(audio(f)).hexdigest();bh=hashlib.sha256(audio(old)).hexdigest();assert ah==bh
 segments=json.loads((P/('splice'+suffix)/'segments.json').read_text());assert segments[0]['start']==0;assert all(a['end']==b['start'] for a,b in zip(segments,segments[1:]));assert segments[-1]['end']==int(q['streams'][0]['nb_frames'])
 report[suffix or '1080p']={'probe':q,'audio_sha256':ah,'audio_matches_v15':True,'full_decode':True,'contiguous_frames':True}
(A/'verification_v16.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',19); times=list(range(0,math.ceil(float(report['1080p']['probe']['format']['duration'])),15));sheet=Image.new('RGB',(1280,math.ceil(len(times)/4)*206),'#F4EFE6');d=ImageDraw.Draw(sheet); fd=P/'contact';fd.mkdir(exist_ok=True)
for i,t in enumerate(times):
 out=fd/f'{t:03}.png';run(['ffmpeg','-v','error','-threads','1','-y','-ss',t,'-i',A/'粗剪_v16.mp4','-frames:v','1','-vf','scale=320:180','-threads','1',out]);sheet.paste(Image.open(out),(i%4*320,i//4*206));d.text((i%4*320+8,i//4*206+182),f'{t}s',font=font,fill='#2A2A35')
sheet.save(A/'contact_sheet_v16.png')
# Inspect both sides of every patch boundary, sequential decoding with accurate seek.
bounds=sorted({s[k] for s in json.loads((P/'splice/segments.json').read_text()) for k in ['start','end'] if 0<s[k]<int(report['1080p']['probe']['streams'][0]['nb_frames'])});bd=P/'boundaries';bd.mkdir(exist_ok=True);metrics=[]
for b in bounds:
 for frame in [b-1,b]:
  f=bd/f'{frame:05}.png';run(['ffmpeg','-v','error','-threads','1','-y','-ss',max(0,(frame-30)/30),'-i',A/'粗剪_v16.mp4','-vf',f'select=eq(n\\,{min(30,frame)})','-frames:v','1','-threads','1',f]);a=np.asarray(Image.open(f).convert('RGB'))[:950];metrics.append({'frame':frame,'mean':float(a.mean()),'std':float(a.std()),'not_blank':bool(a.std()>2)})
(P/'boundary_metrics.json').write_text(json.dumps(metrics,indent=2));
subprocess.run(['python3',str(P/'classify_iris.py')],check=True)
print('PASS',[(k,v['probe']['format']['duration']) for k,v in report.items()])
