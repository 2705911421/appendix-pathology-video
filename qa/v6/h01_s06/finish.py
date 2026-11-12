from pathlib import Path
import subprocess,hashlib,json
P=Path(__file__).resolve().parent;root=P.parents[2]
def run(a,**kw):subprocess.run(list(map(str,a)),check=True,**kw)
p=P/'S06_retry.mp4'
if not p.exists():p=P/'S06.mp4'
meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(p)]));assert int(meta['streams'][0]['nb_frames'])==round(json.loads((P/'keyframes.json').read_text())['duration']*30)
if p.name!='S06.mp4':p.replace(P/'S06.mp4')
for task in ['check_video.py']:run(['python3',P/task])
files=['engine/lib/'+n+'.js' for n in ['he','he_detail','wash','ann','scope','camera']]+['parity_r4/chapters/04.js']
(P/'sha256_结束.txt').write_text(''.join(hashlib.sha256((root/f).read_bytes()).hexdigest()+'  '+f+'\n' for f in files))
assert (P/'sha256_结束.txt').read_bytes()==(P/'sha256_开工.txt').read_bytes()
with (P/'sha256_校验.log').open('w') as log:run(['sha256sum','-c',P/'sha256_开工.txt'],cwd=root,stdout=log)
run(['python3',P/'write_report.py'])
for stale in ['S06.mp4.lock','.segs-2s755S']:
 q=P/stale
 if q.is_dir():q.rmdir()
 elif q.exists():q.unlink()
outputs=[P/'S06.mp4',P/'S06_带配音_720p.mp4',P/'review_sheet.png',P/'自检.md',P.parent/'animatic/粗剪_v11.mp4',P.parent/'animatic/粗剪_v11_720p.mp4']+list(P.glob('s2*.png'))
(P/'outputs.sha256').write_text(''.join(hashlib.sha256(f.read_bytes()).hexdigest()+'  '+str(f.relative_to(root))+'\n' for f in sorted(outputs)))
print('FINISHED: video, audio, parity, determinism and file locks verified.')
