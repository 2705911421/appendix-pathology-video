import subprocess,pathlib,json,time
R=pathlib.Path(__file__).resolve().parents[3]
for key in ['S01','S05','S06','S11_s46','S18_s66']:
 for mode in ['stills','before','video']:
  if key=='S01' and mode=='stills':continue
  print(key,mode,flush=True)
  p=subprocess.run(['/workspace/venv_qa/bin/python','qa/v6/gross_swap/build.py',key,mode],cwd=R)
  if p.returncode:print('ERROR',key,mode,p.returncode,flush=True);break
 print('FINISHED',key,flush=True)
