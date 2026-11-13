import json,subprocess,sys
from pathlib import Path
scene=sys.argv[1];p=Path('qa/v6/ct')/scene
m=json.load(open(p/'keyframes.json'))
results={}
for file in [scene+'.mp4',scene+'_带配音_720p.mp4']:
 data=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_streams','-show_format','-of','json',str(p/file)]))
 results[file]={'duration':float(data['format']['duration']),'streams':[{k:s.get(k) for k in ['codec_type','codec_name','width','height']} for s in data['streams']]}
 assert abs(results[file]['duration']-m['duration'])<.15
 assert any(s['codec_type']=='video' for s in data['streams'])
 if '720p' in file: assert any(s['codec_type']=='audio' for s in data['streams'])
(p/'media_check.json').write_text(json.dumps(results,indent=2,ensure_ascii=False))
print(results)
