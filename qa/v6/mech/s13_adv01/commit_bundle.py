import subprocess
from pathlib import Path
P=Path(__file__).resolve().parent
root=Path.cwd(); temp=Path('/tmp/mech_adv01_commit')
def run(a,**kw):return subprocess.run(a,check=True,**kw)
# The worktree gitdir is mounted read-only; use the authorized bundle fallback.
run(['git','clone','--shared','--no-checkout',str(root),str(temp)])
g=['git','--git-dir='+str(temp/'.git'),'--work-tree='+str(root)]
run(g+['reset','--mixed','HEAD'])
run(g+['add','film/lib_ext/mech_cross.js','film/lib_ext/mech_vascular.js','film/lib_ext/mech_tissue.js',str(P.relative_to(root))])
run(g+['-c','user.name=mini','-c','user.email=mini@local','commit','-m','mech_adv01 (Codex): 补足S13组织层次、血栓分层及坏死核碎屑'])
run(g+['bundle','create',str(P/'mech_adv01-dev.bundle'),'HEAD^..HEAD'])
run(['git','bundle','verify',str(P/'mech_adv01-dev.bundle')])
print('COMMIT',subprocess.check_output(g+['rev-parse','HEAD'],text=True).strip())
