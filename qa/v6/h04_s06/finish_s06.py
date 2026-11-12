from pathlib import Path
import subprocess,time,json,hashlib
p=Path(__file__).resolve().parent
while not (p/'S06.mp4').exists() or (p/'S06.mp4.lock').exists():time.sleep(3)
def run(name):subprocess.run(['python3',str(p/name)],check=True)
run('build_h04.py');run('check_video.py');run('check_safe.py')
while not all((p/(s+'_parity')).exists() and len(list((p/(s+'_parity')).glob('*.png')))>=n for s,n in [('s08',7),('s10',8),('s11',8),('s19',5),('s14',5)]):time.sleep(3)
run('check_stills.py')
files=[s.split('  ')[1] for s in (p/'sha256_开工.txt').read_text().splitlines()];(p/'sha256_结束.txt').write_text(''.join(hashlib.sha256(Path(f).read_bytes()).hexdigest()+'  '+f+'\n' for f in files));assert (p/'sha256_结束.txt').read_bytes()==(p/'sha256_开工.txt').read_bytes()
(p/'pipeline_done').write_text('verified\n')
