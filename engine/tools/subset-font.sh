#!/bin/bash
# Subset Noto Sans CJK SC (SIL OFL 1.1) to the glyphs used by the film → fonts/MixSans-*.woff2. Re-run after editing text.
cd "$(dirname "$0")/.." || exit 1
python3 - > /tmp/mix_chars.txt <<'PY'
import glob,re
s=set()
for f in ['data/sentences.tsv']+glob.glob('chapters/*.js')+glob.glob('lib/*.js')+glob.glob('audio/*.json'):
    try: s|=set(open(f,encoding='utf8').read())
    except Exception: pass
s|=set(''.join(chr(c) for c in range(32,127)))|set('，。、；：？！“”‘’（）《》·—…℃°×→')
print(''.join(sorted(c for c in s if c.isprintable())))
PY
for w in Regular Bold; do
  $(command -v pyftsubset || echo /opt/manimconda/bin/pyftsubset) /usr/share/fonts/opentype/noto/NotoSansCJK-$w.ttc --font-number=2 \
    --text-file=/tmp/mix_chars.txt --flavor=woff2 --layout-features='*' --output-file=fonts/MixSans-$w.woff2
done
ls -la fonts
