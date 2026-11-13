import json,subprocess,sys,os
from PIL import Image,ImageChops
p=sys.argv[1];scene=os.path.basename(p);data=json.load(open(p+'/keyframes.json'));out={}
for suffix in ['.mp4','_带配音_720p.mp4']:
 path=p+'/'+scene+suffix
 meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',path]));v=next(s for s in meta['streams'] if s['codec_type']=='video');audio=[s for s in meta['streams'] if s['codec_type']=='audio'];expected=(1280,720) if '720p' in suffix else (1920,1080)
 assert (v['width'],v['height'])==expected
 assert abs(float(v['duration'])-data['duration'])<.08
 assert bool(audio)==('720p' in suffix)
 out[suffix]={'size':expected,'duration':v['duration'],'frames':v.get('nb_frames'),'audio':bool(audio)}
out['content_bbox']={}
for q in data['picks']:
 im=Image.open(p+'/'+q['name']+'.png').convert('RGB');out['content_bbox'][q['name']]=ImageChops.difference(im,Image.new('RGB',im.size,'#F4EFE6')).getbbox();strip=im.crop((0,810,1920,1080));delta=ImageChops.difference(strip,Image.new('RGB',strip.size,'#F4EFE6'));assert delta.getbbox() is None,q['name']+' unsafe content'
out['safe_y810']=True;out['sentence_ids']=[s['n'] for s in data['rows']];json.dump(out,open(p+'/验证.json','w'),ensure_ascii=False,indent=2);print(out)
# Decode every frame's reserved strip as well; codec rounding permits 16 RGB levels (JPEG capture + H.264 edge ringing).
import numpy as np
proc=subprocess.Popen(['ffmpeg','-v','error','-threads','1','-i',p+'/'+scene+'.mp4','-vf','crop=1920:270:0:810','-threads','1','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
size=1920*270*3;peak=0;frames=0
while True:
 raw=proc.stdout.read(size)
 if not raw:break
 assert len(raw)==size
 a=np.frombuffer(raw,dtype=np.uint8).reshape(-1,3).astype(np.int16)
 peak=max(peak,int(np.abs(a-np.array([244,239,230])).max()));frames+=1
assert proc.wait()==0
assert peak<=16,('video unsafe content',peak)
out['video_safe_y810']={'frames':frames,'max_codec_delta':peak}
json.dump(out,open(p+'/验证.json','w'),ensure_ascii=False,indent=2)
print(out['video_safe_y810'])
