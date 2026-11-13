"""Sequential, one-thread scene patches on v15; retain its real subtitle band/audio/endcard."""
from pathlib import Path
import json,math,subprocess
P=Path(__file__).resolve().parent; A=P.parent/'animatic'; root=P.parents[2]
def run(args): subprocess.run(list(map(str,args)),check=True)
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
configs=json.loads((P/'configs.json').read_text()); timing=json.load(open('/workspace/病理科普视频/配音/全稿_v3/timeline.json')); rows={r['n']:r for r in timing['lines']};fps=30
# Full latest scenes; S07 owns 29–30 as in v15, S08 resumes at 31 using its original clock.
ranges={'s02':(6,10),'s03':(11,13),'s04':(14,19),'s06':(23,24),'s07':(25,30),'s08':(31,34),'s09':(35,36),'s10':(37,42),'s11':(43,46),'s12':(47,48),'s13':(49,53),'s14':(54,57),'s15':(58,59),'s16':(60,62),'s19':(69,70)}
patches=[]
for c in configs:
 s=c['scene'];a,b=ranges[s];origin=c['key'].get('origin',rows[29]['start']);start=rows[a]['start'];end=rows[b+1]['start'] if b<77 else timing['duration']
 # Preserve existing microscope iris wrappers for S08/S10/S11/S14 already in v15.
 if s in ['s08','s10','s11','s14']:continue
 if s=='s19':origin-=.45;start-=.45;end=max(end,rows[b]['end']+.7)
 d=Path(c['dir']);video=d/(s.upper()+'.mp4')
 if s in ['s06','s07']:video=root/'qa/v6/h06_adv'/s/(s.upper()+'.mp4')
 assert video.exists(),video
 patches.append(dict(scene=s,first=a,last=b,origin=origin,start=start,end=end,video=str(video)))
patches.sort(key=lambda p:p['start']); (P/'coverage.json').write_text(json.dumps({'ranges':ranges,'patches':patches},indent=2))
for suffix,w,h,safe in [('',1920,1080,950),('_720p',1280,720,634)]:
 old=P.parent/'h06_adv'/('粗剪_v15'+suffix+'.mp4');work=P/('splice'+suffix);work.mkdir(exist_ok=True);total=int(probe(old)['streams'][0]['nb_frames']);segments=[];cursor=0
 for i,p in enumerate(patches):
  sf=math.ceil(p['start']*fps);ef=math.ceil(p['end']*fps)
  if cursor<sf:segments.append((cursor,sf,None))
  segments.append((sf,ef,p));cursor=ef
 if cursor<total:segments.append((cursor,total,None))
 paths=[]
 for i,(sf,ef,p) in enumerate(segments):
  dest=work/f'{i:02}.mp4';paths.append(dest)
  if dest.exists():continue
  cmd=['ffmpeg','-v','error','-y','-threads','1','-ss',sf/fps,'-i',old]
  if p:
   offset=max(0,sf/fps-p['origin']);cmd+=['-threads','1','-ss',offset,'-i',p['video']]
   filt=f'[1:v]scale={w}:{h},tpad=stop_mode=clone:stop_duration=2,crop={w}:{safe}:0:0,setpts=PTS-STARTPTS[p];[0:v][p]overlay=0:0:eof_action=repeat[v]'
   cmd+=['-filter_complex_threads','1','-filter_complex',filt,'-map','[v]']
  else:cmd+=['-map','0:v:0']
  cmd+=['-frames:v',ef-sf,'-an','-c:v','libx264','-crf','16','-preset','veryfast','-pix_fmt','yuv420p','-profile:v','high','-level','4.0','-bf','0','-g','30','-threads','1',dest]
  print(suffix,i,sf,ef,p['scene'] if p else 'inherited',flush=True);run(cmd)
 (work/'concat.txt').write_text(''.join(f"file '{x}'\n" for x in paths))
 run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',work/'concat.txt','-i',old,'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',A/('粗剪_v16'+suffix+'.mp4')])
 (work/'segments.json').write_text(json.dumps([dict(start=sf,end=ef,scene=p['scene'] if p else 'inherited') for sf,ef,p in segments],indent=2))
