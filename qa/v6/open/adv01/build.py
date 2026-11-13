import json, subprocess, pathlib
from PIL import Image, ImageDraw
ROOT=pathlib.Path(__file__).resolve().parents[4]
BASE=ROOT/'qa/v6/open'
RENDER='/workspace/garden-skills/skills/motion-showreel/scripts/render.mjs'
AUDIO='/workspace/病理科普视频/配音/全稿_v3/旁白_v3.wav'
rows=json.load(open('/workspace/病理科普视频/配音/全稿_v3/timeline.json'))['lines']
def run(args,log):
 with open(log,'w') as f:subprocess.run(args,cwd=ROOT,stdout=f,stderr=subprocess.STDOUT,check=True)
def render(scene,args,log):run(['node',RENDER,'film','--q','scene='+scene,'--workers','1']+args,BASE/'adv01'/log)
def stills(scene):
 manifest=json.load(open(BASE/'adv01/关键帧时码.json'))[scene]
 origin=rows[manifest['first']-1]['start']
 times=[rows[f['sentence']-1]['start']-origin+(rows[f['sentence']-1]['end']-rows[f['sentence']-1]['start'])*f['fraction'] for f in manifest['keyframes']]
 render(scene,['--still',','.join(str(round(t,4)) for t in times),'--out',str(BASE/'adv01'/('stills_'+scene))], 'stills_'+scene+'.log')
def sheet(scene,names,crops):
 src=sorted((BASE/'adv01'/('stills_'+scene)).glob('t_*.png'))
 out=BASE/scene
 board=Image.new('RGB',(1440,len(names)*430),'#F4EFE6');d=ImageDraw.Draw(board)
 for i,(p,name,box) in enumerate(zip(src,names,crops)):
  im=Image.open(p).convert('RGB');im.save(out/(name+'.png'))
  crop=im.crop(box).resize(((box[2]-box[0])*2,(box[3]-box[1])*2));crop.save(out/(name+'_200pct.png'))
  thumb=im.copy();thumb.thumbnail((768,400));board.paste(thumb,(0,i*430+25));crop.thumbnail((640,400));board.paste(crop,(790,i*430+25));d.text((12,i*430+6),name,fill='#2A2A35')
 board.save(out/'review_sheet.png')
def video(scene,first,last):
 out=BASE/scene
 render(scene,['--out',str(out/(scene.upper()+'.mp4')),'--size','1920x1080','--fps','30','--crf','16'],scene+'_video.log')
 render(scene,['--determinism'],scene+'_determinism.log')
 start=rows[first-1]['start'];dur=rows[last-1]['end']-start+.9
 audioend=min(rows[last]['start'] if last<len(rows) else rows[last-1]['end'],start+dur)
 run(['ffmpeg','-v','error','-threads','1','-i',str(out/(scene.upper()+'.mp4')),'-ss',str(start),'-t',str(audioend-start),'-i',AUDIO,'-filter_complex','[0:v]scale=1280:720:flags=lanczos[v];[1:a]apad[a]','-map','[v]','-map','[a]','-t',str(dur),'-c:v','libx264','-threads','1','-crf','16','-c:a','aac','-b:a','160k','-y',str(out/(scene.upper()+'_带配音_720p.mp4'))],BASE/'adv01'/(scene+'_audio.log'))
if __name__=='__main__':
 import sys
 scene=sys.argv[1]
 if scene=='s01':
  stills(scene)
  sheet(scene,['s01_locate','s01_blind','s01_trio','s01_wall','s01_title','s01_alter'],[(920,485,1400,775),(1330,100,1680,400),(1380,170,1740,670),(1070,280,1450,690),(70,150,510,490),(70,180,510,610)])
  video(scene,1,5)
 else:
  stills(scene)
  sheet(scene,['s21_compass','s21_turn','s21_hospital','s21_arrive','s21_end'],[(880,150,1370,640),(880,150,1370,640),(1325,505,1760,810),(855,295,1160,590),(1300,495,1780,810)])
  video(scene,75,77)
