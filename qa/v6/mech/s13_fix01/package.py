import json,subprocess
from pathlib import Path
P=Path(__file__).resolve().parent
root=Path.cwd()
def run(a,**kw):return subprocess.run(a,check=True,**kw)
probe={}
for name in ['S13.mp4','S13_带配音_720p.mp4']:
 r=subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(P/name)])
 probe[name]=json.loads(r)
 video=next(s for s in probe[name]['streams'] if s['codec_type']=='video')
 assert int(video['nb_frames'])==630,(name,video['nb_frames'])
 assert video['width']==(1280 if '720p' in name else 1920)
 if '720p' in name:assert any(s['codec_type']=='audio' for s in probe[name]['streams'])
(P/'probe.json').write_text(json.dumps(probe,ensure_ascii=False,indent=2))
with (P/'locked_end.sha256').open('w') as f:run(['sha256sum',*[str(Path('engine/lib')/(n+'.js')) for n in ['he','he_detail','wash','ann','scope','camera']],'parity_r4/chapters/04.js'],stdout=f)
assert (P/'locked_start.sha256').read_bytes()==(P/'locked_end.sha256').read_bytes()
run(['git','diff','--check'])
with (P/'提交日志.txt').open('a') as f:f.write('最终验证：两版视频均630帧；720p含真实音轨；首尾锁定SHA256一致；diff --check通过。\n')
g=['git','--git-dir=/tmp/mech_fix01_git','--work-tree='+str(root)]
run(g+['add','film/chapters/s13.js','film/lib_ext/mech_cross.js','film/lib_ext/mech_tissue.js',str(P.relative_to(root))])
run(g+['-c','user.name=mini','-c','user.email=mini@local','commit','-m','mech_fix01 Codex: 修正S13横截面、HE坏死出血与大体构图'])
run(g+['bundle','create',str(P/'mech_fix01-dev.bundle'),'HEAD^..HEAD'])
run(['git','bundle','verify',str(P/'mech_fix01-dev.bundle')])
print('COMMIT',subprocess.check_output(g+['rev-parse','HEAD'],text=True).strip())
