import subprocess,pathlib
R=pathlib.Path(__file__).resolve().parents[3]
def run(a):subprocess.run(a,cwd=R,check=True)
for key in ['S01','S06']:
 for mode in ['stills','video']:run(['/workspace/venv_qa/bin/python','qa/v6/gross_swap/build.py',key,mode])
for key in ['S01','S05','S06','S11_s46','S18_s66']:run(['/workspace/venv_qa/bin/python','qa/v6/gross_swap/build.py',key,'reference'])
run(['node','/workspace/garden-skills/skills/motion-showreel/scripts/render.mjs','film/gross_swap_review.html','--q','scene=gross_reference','--workers','1','--still','0,1,2,3','--out','qa/v6/gross_swap/reference_original_pose'])
