from pathlib import Path
import json,re,sys
p=Path(__file__).resolve().parent
rows=json.loads((p/'subtitles.json').read_text(encoding='utf-8'))
script=(p/'解说词与双语字幕.md').read_text(encoding='utf-8')
refs=(p/'医学与引用核验.md').read_text(encoding='utf-8')
mapping=(p/'老师意见映射.md').read_text(encoding='utf-8')
spoken=(p/'中文纯口播.txt').read_text(encoding='utf-8')
errors=[]
def check(ok,msg):
 if not ok: errors.append(msg)
ids=[x['id'] for x in rows]
check(len(ids)==len(set(ids)), '句 ID 重复')
check(all(re.fullmatch(r'S\d{3}[A-Z]?',x) for x in ids),'句 ID 格式')
for x in rows:
 check(bool(x['chapter'] and x['zh'] and x['en_cards']) and all(x['en_cards']),x['id']+' 内容为空')
 check(len(x['zh'])<=25,x['id']+' 中文卡超 25 字符')
 check(all(len(c)<=42 for c in x['en_cards']),x['id']+' 英文卡超 42 字符')
 line=f"- **{x['id']}｜{x['chapter']}** {x['zh']}  \n  {' / '.join(x['en_cards'])}"
 check(line in script,x['id']+' 可读稿与 JSON 不一致')
 if 'spoken_zh' in x:
  check(isinstance(x['spoken_zh'],str) and bool(x['spoken_zh'].strip()),x['id']+' spoken_zh 为空')
  check('口播：'+x['spoken_zh'] in script,x['id']+' 可读稿口播不一致')
 check(not re.search(r'[→←↔()（）]',x.get('spoken_zh',x['zh'])),x['id']+' 口播含箭头或括号')
 check(len(x['en_cards'])==1 or x.get('en_continuation')=='sequential',x['id']+' 英文续卡未声明顺序')
 check(all(c==c.strip() for c in x['en_cards'][:-1]),x['id']+' 英文续卡末尾不规范')
 for ref in x['refs']: check(f'[{ref}]' in refs,x['id']+' 引文不存在 '+ref)
check(spoken=='\n'.join(x.get('spoken_zh',x['zh']) for x in rows)+'\n','纯口播与 JSON 不一致')
nums=[int(x) for x in re.findall(r'^\| (\d+) \|',mapping,re.M)]
check(sorted(nums)==list(range(1,23)),'老师 22 条不完整或重复')
for id in re.findall(r'\bS\d{3}[A-Z]?\b',mapping): check(id in ids,'映射引用未知句 '+id)
if errors:
 print('\n'.join(errors));sys.exit(1)
hanzi=sum(len(re.findall(r'[\u4e00-\u9fff]',x.get('spoken_zh',x['zh']))) for x in rows)
display_hanzi=sum(len(re.findall(r'[\u4e00-\u9fff]',x['zh'])) for x in rows)
print(f'PASS: {len(rows)} 句卡；ID、双语非空与稿件一致、中文≤25字符、英文≤42字符、引用标识、22条映射。口播汉字 {hanzi}，展示字幕汉字 {display_hanzi}；续卡顺序及纯口播符号已核验。')
print('限制：程序不验证英文续卡语义完整性、医学准确性或成片可读性；须人工审阅。')
