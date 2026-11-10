from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
root=Path(__file__).resolve().parents[1]
text=''.join(p.read_text() for ext in ('*.js','*.json') for p in root.rglob(ext) if 'vendor' not in p.parts)
text+=''.join(chr(i) for i in range(32,127))
for weight in ('Regular','Bold'):
 font=TTFont(f'/usr/share/fonts/opentype/noto/NotoSansCJK-{weight}.ttc',fontNumber=2)
 cmap=font.getBestCmap();missing=sorted(set(c for c in text if ord(c)>32 and ord(c) not in cmap))
 # JSON/source comments may contain nonprinting controls. Visible strings must be covered.
 assert not missing,repr(missing)
 options=subset.Options();options.flavor='woff2';options.layout_features=['*']
 sub=subset.Subsetter(options=options);sub.populate(text=text);sub.subset(font);font.flavor='woff2';font.save(root/f'assets/fonts/v5-CJK-{weight}.woff2')
 print(weight,'covered',len(set(text)),'source characters')
