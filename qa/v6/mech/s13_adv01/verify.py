import json,subprocess,hashlib
from pathlib import Path
import numpy as np
P=Path(__file__).resolve().parent
rows=[r for r in json.load(open('/workspace/病理科普视频/配音/全稿_v3/timeline.json'))['lines'] if 49<=r['n']<=53]
origin=rows[0]['start'];duration=rows[-1]['end']-origin
probe={}
for name in ['S13.mp4','S13_带配音_720p.mp4']:
    path=P/name
    probe[name]=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)]))
    v=next(s for s in probe[name]['streams'] if s['codec_type']=='video')
    assert int(v['nb_frames'])==round(duration*30)
    assert v['width']==(1280 if '720p' in name else 1920)
    subprocess.run(['ffmpeg','-v','error','-threads','1','-i',str(path),'-f','null','-'],check=True)
(P/'probe.json').write_text(json.dumps(probe,ensure_ascii=False,indent=2))
def pcm(args):
    return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-threads','1',*args,'-vn','-ac','1','-ar','16000','-f','f32le','-']),dtype=np.float32)
a=pcm(['-ss',str(origin),'-t',str(duration),'-i','/workspace/病理科普视频/配音/全稿_v3/旁白_v3.wav'])
b=pcm(['-i',str(P/'S13_带配音_720p.mp4')]);m=min(len(a),len(b));corr=float(np.corrcoef(a[:m],b[:m])[0,1]);assert corr>.98,corr
print('Real narration correlation',corr,'samples',m,'duration',duration)
files=[f'engine/lib/{n}.js' for n in ['he','he_detail','wash','ann','scope','camera']]+['parity_r4/chapters/04.js']
end=subprocess.check_output(['sha256sum',*files]);(P/'locked_end.sha256').write_bytes(end)
assert end==(P/'locked_start.sha256').read_bytes()
print('Locked SHA: seven files unchanged')
subprocess.run(['git','diff','--check'],check=True)
print('Both videos decode without error; dimensions, frames and real audio verified.')
