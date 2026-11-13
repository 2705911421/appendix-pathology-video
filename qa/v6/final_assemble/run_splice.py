import sys; sys.path.insert(0, 'qa/v6/final_assemble')
from build_final import build_coverage, splice_film
cov = build_coverage()
from pathlib import Path
import json
Path('qa/v6/final_assemble/coverage_final.json').write_text(json.dumps(cov, indent=2, ensure_ascii=False))
print(f'coverage: {len(cov["scenes"])} scenes, fallbacks={[c["scene"] for c in cov["scenes"] if c.get("fallback")]}', flush=True)
film_v = splice_film(cov)
print(f'splice done → {film_v}', flush=True)
