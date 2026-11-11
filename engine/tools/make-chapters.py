#!/usr/bin/env python3
# Measured sentence starts stay unchanged. Render through the next chapter start (including VO gaps).
# The two existing end cards require 12 s, matching main.js END_CARD.
import csv, json, os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
END_CARD = 12
rows = list(csv.DictReader(open('data/sentences.tsv', encoding='utf8'), delimiter='\t'))
seg = json.load(open('audio/narration.json'))['segments'] if os.path.exists('audio/narration.json') else None
if seg is not None and len(seg) != len(rows):
    raise ValueError('narration.json / TSV segment count mismatch')
ch = {}
for i, r in enumerate(rows):
    a, b = (seg[i]['start'], seg[i]['end']) if seg else (float(r['起']), float(r['止']))
    ch.setdefault(r['段'], [a, b]); ch[r['段']][1] = b
keys = list(ch)
for i, k in enumerate(keys[:-1]):
    ch[k][1] = ch[keys[i + 1]][0]
ch['07'][1] += END_CARD
out = {"version": 1, "duration": round(ch['07'][1], 2), "size": "1920x1080", "fps": 30,
       "note": f"Measured VO {ch['07'][1]-END_CARD:.1f}s; preserve current sentence/chapter starts and VO gaps. Two end cards = +12s on 07 (matches main.js).",
       "chapters": [{"id": k, "project": ".", "start": round(v[0], 3), "duration": round(v[1] - v[0], 3)} for k, v in ch.items()]}
json.dump(out, open('chapters.json', 'w'), ensure_ascii=False, indent=1); print(out['duration'], out['size'], out['chapters'])
