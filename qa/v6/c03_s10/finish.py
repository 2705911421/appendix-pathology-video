from pathlib import Path
import subprocess,time,json
P=Path(__file__).resolve().parent
while True:
 try:
  d=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(P/'S10.mp4')],stderr=subprocess.DEVNULL));n=int(d['streams'][0].get('nb_frames','0'))
  if n==837:break
 except (subprocess.CalledProcessError,KeyError,ValueError,IndexError):pass
 time.sleep(10)
for script,args in [('check_stills.py',[]),('compare.py',[]),('extra_checks.py',[]),('annotate.py',[]),('build_v3.py',['--plate-only']),('preserve_pixels.py',[]),('check_video.py',[])]:
 print('Running',script,flush=True);subprocess.run(['python3',str(P/script),*args],check=True)
(P/'finished.ok').write_text('All rendering, parity, composition and video checks passed.\n')
