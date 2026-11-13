import json, subprocess, numpy as np
from pathlib import Path
root=Path('qa/v6/clin')
rows=json.load(open('/workspace/病理科普视频/配音/全稿_v3/timeline.json'))['lines']
def samples(args):
    data=subprocess.check_output(['ffmpeg','-v','error',*args,'-vn','-ac','1','-ar','16000','-f','f32le','pipe:1'])
    return np.frombuffer(data,dtype=np.float32)
result={}
for name in ['S02','S03','S16']:
    info=json.load(open(root/name/'keyframes.json'))
    for row in info['rows']:
        source=next(r for r in rows if r['n']==row['n'])
        assert source['text']==row['text'] and source['start']==row['start'] and source['end']==row['end']
    orig=samples(['-ss',str(info['origin']),'-t',str(info['duration']),'-i','/workspace/病理科普视频/配音/全稿_v3/旁白_v3.wav'])
    video=samples(['-i',str(root/name/(name+'_带配音_720p.mp4'))])
    n=min(len(orig),len(video));a=orig[:n];b=video[:n]
    corr=float(np.dot(a,b)/np.sqrt(np.dot(a,a)*np.dot(b,b)))
    assert corr>.98,(name,corr)
    result[name]={'source_timeline_rows_match':True,'audio_correlation':corr,'compared_seconds':n/16000,'source_samples':len(orig),'delivered_samples':len(video)}
(root/'audio_verification.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
