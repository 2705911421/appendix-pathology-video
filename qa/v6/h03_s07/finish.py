from pathlib import Path
import subprocess,time,shutil,hashlib,json
p=Path(__file__).resolve().parent;h=p.parent/'h04_s06'
while not (h/'pipeline_done').exists() or 'complete ' not in (p/'fast_video.log').read_text():time.sleep(3)
def run(name):subprocess.run(['python3',str(p/name)],check=True)
for s in ['s08','s10','s11','s19','s14']:shutil.copytree(h/(s+'_parity'),p/(s+'_parity'),dirs_exist_ok=True)
shutil.copytree(h/'stills',p/'s06_parity',dirs_exist_ok=True)
run('check_stills.py');run('build_v13.py');run('check_video.py');run('check_safe.py');run('check_audio_timing.py')
files=[s.split('  ')[1] for s in (h/'sha256_开工.txt').read_text().splitlines()];(p/'sha256_结束.txt').write_text(''.join(hashlib.sha256(Path(f).read_bytes()).hexdigest()+'  '+f+'\n' for f in files));assert (p/'sha256_结束.txt').read_bytes()==(h/'sha256_开工.txt').read_bytes()
(p/'pipeline_done').write_text('verified\n')
