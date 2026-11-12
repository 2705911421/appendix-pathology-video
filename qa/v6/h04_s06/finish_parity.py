from pathlib import Path
import subprocess,time,json,shutil
p=Path(__file__).resolve().parent;s=p.parent/'h03_s07';last=round(json.loads((p.parent/'d01_s11/keyframes.json').read_text())['picks'][-1]['t'],6)
while not any(line.startswith('s11 ') and float(line.split()[1])==last for line in (p/'parity_precision_retry.log').read_text().splitlines() if line.startswith('s11 ')):time.sleep(3)
subprocess.run(['python3',str(p/'check_stills.py')],check=True)
(p/'pipeline_done').write_text('verified\n')
for scene in ['s08','s10','s11','s19','s14']:shutil.copytree(p/(scene+'_parity'),s/(scene+'_parity'),dirs_exist_ok=True)
shutil.copytree(p/'stills',s/'s06_parity',dirs_exist_ok=True)
subprocess.run(['python3',str(s/'check_stills.py')],check=True)
shutil.copyfile(p/'sha256_结束.txt',s/'sha256_结束.txt')
subprocess.run(['python3',str(p/'finalize.py')],check=True)
while not all((s/f).exists() for f in ['video_check.json','audio_timing.json','safe_area.json']):time.sleep(3)
(s/'pipeline_done').write_text('verified\n')
subprocess.run(['python3',str(s/'finalize.py')],check=True)
