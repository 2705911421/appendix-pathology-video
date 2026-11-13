from pathlib import Path
import hashlib,json
P=Path(__file__).resolve().parent
assert (P/'pipeline_done').exists()
assert 'deterministic:' in (P/'determinism.log').read_text()
for name in ['parity.json','video_check.json','audio_timing.json','safe_area.json']:json.loads((P/name).read_text())
assert (P/'sha256_结束.txt').read_text()==(P.parent/'h04_s06/sha256_开工.txt').read_text()
files=sorted(f for f in P.iterdir() if f.is_file() and f.suffix in ['.png','.mp4','.md','.json','.txt'] and f.name!='outputs.sha256')
(P/'outputs.sha256').write_text(''.join(hashlib.sha256(f.read_bytes()).hexdigest()+'  '+str(f)+'\n' for f in files))
print('Finalized',len(files),'artifacts')
