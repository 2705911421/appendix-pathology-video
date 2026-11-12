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
for q in data['picks']:
 im=Image.open(p+'/'+q['name']+'.png').convert('RGB');strip=im.crop((0,950,1920,1080));delta=ImageChops.difference(strip,Image.new('RGB',strip.size,'#F4EFE6'));assert delta.getbbox() is None,q['name']+' unsafe content'
out['safe_y950']=True;out['sentence_ids']=[s['n'] for s in data['rows']];json.dump(out,open(p+'/验证.json','w'),ensure_ascii=False,indent=2);print(out)
