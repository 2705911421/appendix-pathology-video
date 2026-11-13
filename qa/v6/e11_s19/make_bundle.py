from pathlib import Path
import subprocess,tempfile,json,hashlib
P=Path(__file__).resolve().parent;root=Path.cwd();meta=tempfile.mkdtemp(prefix='e10-s19-git-');base=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
subprocess.run(['git','init','--bare',meta],check=True,stdout=subprocess.DEVNULL)
g=['git','--git-dir='+meta,'--work-tree='+str(root)]
# Read original objects; all index/ref writes stay in temporary independent metadata.
objects=subprocess.check_output(['git','rev-parse','--git-path','objects'],text=True).strip();objects=str((root/objects).resolve())
Path(meta,'objects/info/alternates').write_text(objects+'\n')
subprocess.run(g+['symbolic-ref','HEAD','refs/heads/s19-dev'],check=True)
subprocess.run(g+['update-ref','refs/heads/s19-dev',base],check=True)
subprocess.run(g+['read-tree',base],check=True)
files=['film/lib_ext/s19_fix11_chronic.js','film/chapters/s19.js']+[str(x.relative_to(root)) for x in sorted(P.rglob('*')) if x.is_file() and x.suffix!='.bundle' and x.name not in ['bundle交付.txt','artifact_sha256.json','git_meta.json']]
subprocess.run(g+['add','--',*files],check=True)
subprocess.run(g+['-c','user.name=mini','-c','user.email=mini@local','commit','-m','s19_fix11: 淋巴核增大成簇与纤维化增强 (Codex)'],check=True)
commit=subprocess.check_output(g+['rev-parse','HEAD'],text=True).strip();bundle=P/'e11_s19-dev.bundle'
subprocess.run(g+['bundle','create',str(bundle),base+'..refs/heads/s19-dev'],check=True)
r=subprocess.run(['git','bundle','verify',str(bundle)],capture_output=True,text=True,check=True)
(P/'bundle交付.txt').write_text('Commit: '+commit+'\nBase: '+base+'\nRef: refs/heads/s19-dev\n原始 Git 元数据只读；独立临时元数据提交，原分支不变。\n'+r.stdout+r.stderr)
(P/'git_meta.json').write_text(json.dumps({'root':str(root),'meta':meta,'base':base,'commit':commit},indent=2))
(P/'artifact_sha256.json').write_text(json.dumps({str(x.relative_to(P)):hashlib.sha256(x.read_bytes()).hexdigest() for x in P.rglob('*') if x.is_file() and x.name!='artifact_sha256.json'},indent=2,ensure_ascii=False))
print(commit)
