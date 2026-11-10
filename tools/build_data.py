"""Parse the approved six-column script table. No translation or timing from old film."""
import json,re,argparse
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--source',type=Path,default=root.parent/'解说词_v2/解说词_定稿.md');a=p.parse_args()
rows=[];entries=[];discrepancies=[];t=0
for line in a.source.read_text().splitlines():
 if not re.match(r'^\| \d{2} \|',line):continue
 cols=[c.strip() for c in line.strip('|').split('|')]
 if len(cols)!=6:continue
 id,section,zh,count,visual,teacher=cols
 row={'id':id,'section':section,'zh':zh,'englishCards':re.findall(r'英文(?:续卡)?：([^<]+)',visual),'visual':visual.split('<br>英文：')[0],'references':re.findall(r'\[\d+\]',zh),'hanzi':len(re.findall(r'[\u4e00-\u9fff]',zh))}
 if row['hanzi']!=int(count):discrepancies.append({'id':id,'declared':int(count),'actual':row['hanzi']})
 assert row['englishCards'] and all(len(c)<=42 for c in row['englishCards'])
 rows.append(row);dur=row['hanzi']*.22+.4;entries.append({'id':id,'zh':zh,'start':round(t,4),'end':round(t+dur,4)});t+=dur
assert [r['id'] for r in rows]==[f'{i:02}' for i in range(1,78)]
assert sum(len(r['englishCards']) for r in rows)==136
for dest,data in [('script.json',{'source':'解说词_v2/解说词_定稿.md','sentences':rows}),('timeline.preview.json',{'status':'preview','formula':'Hanzi count × 0.22 seconds + 0.4 seconds per sentence; NOT final audio timing','replaceWith':'audio/narration.json when final narration is available','duration':round(t,4),'sentences':entries})]:
 (root/'data'/dest).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
(root/'data/source-validation.json').write_text(json.dumps({'sentences':77,'englishCards':136,'actualHanzi':sum(r['hanzi'] for r in rows),'countDiscrepancies':discrepancies,'policy':'Preserve verbatim source; estimate preview from actual Hanzi, not the declared count column'},ensure_ascii=False,indent=2)+'\n')
print('PASS: 77 verbatim sentences, 136 English cards, preview timing only; count discrepancy recorded')
