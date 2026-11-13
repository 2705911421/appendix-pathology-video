from pathlib import Path
import json
P=Path('qa/v6/s19_b09')
rows=[s for s in json.loads(Path('/workspace/病理科普视频/配音/全稿_v3/timeline.json').read_text())['lines'] if s['n'] in (69,70)]
P.joinpath('timing.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
p=Path('film/s19_b09_qa.html');s=p.read_text();a=s.index('const rows=')+len('const rows=');b=s.index(',origin=rows[0].start;',a);p.write_text(s[:a]+json.dumps(rows,ensure_ascii=False,indent=2)+s[b:])
