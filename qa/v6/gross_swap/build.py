import json,subprocess,pathlib,os,time
from PIL import Image,ImageDraw
ROOT=pathlib.Path(__file__).resolve().parents[3]; B=ROOT/'qa/v6/gross_swap'
rows=json.load(open('/workspace/病理科普视频/配音/全稿_v3/timeline.json'))['lines'];row={r['n']:r for r in rows}
RENDER='/workspace/garden-skills/skills/motion-showreel/scripts/render.mjs'
SCENES={'S01':('s01',1,5,[1,2,3,4,5]),'S05':('s05',20,22,[20,21,22]),'S06':('s06',23,24,[23,24]),'S11_s46':('s11',37,46,[46]),'S18_s66':('s18',66,68,[66])}
def run(cmd,log):
 while int(subprocess.check_output(['free','-g']).decode().splitlines()[1].split()[-1])<2:time.sleep(30)
 with open(log,'w') as f:subprocess.run(cmd,cwd=ROOT,stdout=f,stderr=subprocess.STDOUT,check=True)
def render(scene,args,log,before=False):run(['node',RENDER,'film/gross_swap_review.html','--q','scene='+scene+('&before=1' if before else ''),'--workers','1']+args,log)
def execute(key,mode):
 scene,first,last,ids=SCENES[key];out=B/key;out.mkdir(exist_ok=True,parents=True)
 origin=row[first]['start'];samples=[{'sentence':n,'fraction':f,'time':row[n]['start']-origin+(row[n]['end']-row[n]['start'])*f} for n in ids for f in ([.10,.84] if n==66 else [.48,.84] if n in [2,20,23,46] else [.65])]
 (out/'events.json').write_text(json.dumps({'origin':origin,'samples':samples,'clock':'timeline.json; T.frac','scope':'gross only; no magnification label'},ensure_ascii=False,indent=2))
 if mode in ['stills','before','reference']:
  before=mode=='before';folder=out/('before' if before else 'reference' if mode=='reference' else 'stills')
  render(scene+('&reference=1' if mode=='reference' else ''),['--still',','.join(f"{s['time']:.5f}" for s in samples),'--out',str(folder)],out/(mode+'.log'),before)
  if before or mode=='reference':return
  k=out/'keyframes';k.mkdir(exist_ok=True);board=Image.new('RGB',(1200,370*len(samples)),'#F4EFE6');d=ImageDraw.Draw(board)
  for i,(sample,src) in enumerate(zip(samples,sorted(folder.glob('t_*.png')))):
   tag=f"s{sample['sentence']:02d}_f{round(sample['fraction']*100):02d}";im=Image.open(src).convert('RGB');im.save(k/(tag+'.png'))
   crop=im.crop((900,240,1400,740));crop.resize((1000,1000)).save(k/(tag+'_200pct.png'))
   board.paste(im.resize((640,360)),(0,i*370+10));board.paste(crop.resize((350,350)),(700,i*370+10));d.text((4,i*370),f"sentence {sample['sentence']} / {sample['time']:.3f}s",fill='#2A2A35')
  board.save(out/'review_sheet.png')
 elif mode=='video':
  start=row[ids[0]]['start']-origin if key in ['S11_s46','S18_s66'] else 0
  tail=.9 if key=='S01' else row[25]['start']-row[24]['end'] if key=='S06' else 0
  dur=(row[ids[-1]]['end']-row[ids[0]]['start']) if key in ['S11_s46','S18_s66'] else row[last]['end']-origin+tail
  render(scene,['--start',str(start),'--duration',str(dur),'--out',str(out/(key+'.mp4')),'--size','1920x1080','--fps','30','--crf','16'],out/'video.log')
  audio_start=origin+start
  run(['ffmpeg','-v','error','-threads','1','-i',str(out/(key+'.mp4')),'-ss',str(audio_start),'-t',str(dur),'-i','/workspace/病理科普视频/配音/全稿_v3/旁白_v3.wav','-filter_complex','[0:v]scale=1280:720:flags=lanczos[v];[1:a]apad[a]','-map','[v]','-map','[a]','-t',str(dur),'-c:v','libx264','-threads','1','-crf','16','-c:a','aac','-b:a','160k','-y',str(out/(key+'_带配音_720p.mp4'))],out/'audio.log')
  (out/'duration_expected.json').write_text(json.dumps({'start':audio_start,'duration':dur}))
if __name__=='__main__':
 import sys
 execute(sys.argv[1],sys.argv[2])
