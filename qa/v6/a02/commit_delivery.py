from pathlib import Path
import subprocess,tempfile,json
P=Path(__file__).resolve().parent;root=Path.cwd();base=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
files=[str(x.relative_to(root)) for x in P.rglob('*') if x.is_file() and x.suffix!='.bundle' and not any(v.startswith('splice') for v in x.relative_to(P).parts) and x.name not in ['commit.log','delivery.json']]
files += ['qa/v6/animatic/'+n for n in ['粗剪_v16.mp4','粗剪_v16_720p.mp4','自检_v16.md','contact_sheet_v16.png','verification_v16.json']]
def run(a,**kw):return subprocess.run(a,check=True,**kw)
r=subprocess.run(['git','add','-f','--',*files],capture_output=True,text=True)
if r.returncode==0:
 run(['git','-c','user.name=mini','-c','user.email=mini@local','commit','-m','v6_a02 (Codex): 并线逐场像素验收与全稿粗剪v16'])
 result={'mode':'commit','commit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()}
else:
 print('Original git add failed:',r.stderr,flush=True)
 meta=tempfile.mkdtemp(prefix='a02-git-');run(['git','init','--bare',meta]);g=['git','--git-dir='+meta,'--work-tree='+str(root)];objects=subprocess.check_output(['git','rev-parse','--git-path','objects'],text=True).strip();Path(meta,'objects/info/alternates').write_text(str((root/objects).resolve())+'\n');run(g+['symbolic-ref','HEAD','refs/heads/a02-dev']);run(g+['update-ref','refs/heads/a02-dev',base]);run(g+['read-tree',base]);run(g+['add','-f','--',*files]);run(g+['-c','user.name=mini','-c','user.email=mini@local','commit','-m','v6_a02 (Codex): 并线逐场像素验收与全稿粗剪v16']);commit=subprocess.check_output(g+['rev-parse','HEAD'],text=True).strip();bundle=P/'a02.bundle';run(g+['bundle','create',str(bundle),base+'..refs/heads/a02-dev']);v=run(['git','bundle','verify',str(bundle)],capture_output=True,text=True);print(v.stdout+v.stderr);result={'mode':'bundle','base':base,'commit':commit,'bundle':str(bundle),'verified':True,'reason':r.stderr}
(P/'delivery.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(result)
