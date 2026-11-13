from pathlib import Path
import subprocess,json,hashlib
P=Path(__file__).resolve().parent;cfg=json.loads((P/'git_meta.json').read_text());g=['git','--git-dir='+cfg['meta'],'--work-tree='+cfg['root']]
files=['film/lib_ext/he_chronic.js']+[str(x.relative_to(Path.cwd())) for x in sorted(P.rglob('*')) if x.is_file() and x.suffix!='.bundle' and x.name not in ['git_meta.json','bundle交付.txt','artifact_sha256.json'] and 'preview' not in x.parts]
subprocess.run(g+['add','--',*files],check=True)
subprocess.run(g+['-c','user.name=mini','-c','user.email=mini@local','commit','-m','s19_fix08: 连续间质层次、羽化接缝与慢性细胞特写修正 (Codex)'],check=True)
commit=subprocess.check_output(g+['rev-parse','HEAD'],text=True).strip();bundle=P/'e08_s19-dev.bundle'
subprocess.run(g+['bundle','create',str(bundle),cfg['base']+'..refs/heads/s19-dev'],check=True)
r=subprocess.run(['git','bundle','verify',str(bundle)],text=True,capture_output=True,check=True)
(P/'bundle交付.txt').write_text('Commit: '+commit+'\nBase: '+cfg['base']+'\nRef: refs/heads/s19-dev\nOriginal Git metadata is read-only; original branch unchanged.\n'+r.stdout+r.stderr)
artifacts={str(x.relative_to(P)):hashlib.sha256(x.read_bytes()).hexdigest() for x in sorted(P.rglob('*')) if x.is_file() and x.name not in ['artifact_sha256.json','git_meta.json']}
(P/'artifact_sha256.json').write_text(json.dumps(artifacts,ensure_ascii=False,indent=2));print(commit);print(r.stdout+r.stderr)
