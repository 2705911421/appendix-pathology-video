from pathlib import Path
from PIL import Image,ImageChops,ImageStat,ImageDraw
import hashlib,json,shutil
root=Path(__file__).resolve().parents[3];out=Path(__file__).resolve().parent;base=out.parent/'b02'
frames=[('s08_low',1),('s08_transition_01',2.3),('s08_transition_02',3.2),('s08_mid',3.8)]+[(f's08_high_s{s}',t) for s,t in zip(range(30,35),[9,15,21,27,33])]
for name,t in frames:shutil.copyfile(out/f't_{t:06.2f}.png',out/f'{name}.png')
rows=[]
for name,t in frames[3:]:
 a=Image.open(base/f'{name}.png').convert('RGB');b=Image.open(out/f'{name}.png').convert('RGB');d=ImageChops.difference(a,b);mae=sum(ImageStat.Stat(d).mean)/3
 rows.append(dict(frame=name,time=t,MAE_RGB=mae,max_difference=max(v[1] for v in d.getextrema()),passed=mae<.5))
(out/'像素一致性报告.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
(out/'像素一致性报告.md').write_text('# b02b / b04 像素一致性\n\n原始1920×1080 PNG，逐像素比较RGB三通道，MAE范围0–255；未经缩放。\n\n|帧|时间|MAE|最大差|通过 <0.5|\n|---|---|---|---|---|\n'+''.join(f"|{r['frame']}|{r['time']}|{r['MAE_RGB']:.8f}|{r['max_difference']}|{r['passed']}|\n" for r in rows))
canvas=Image.new('RGB',(1920,580),'#111114');dr=ImageDraw.Draw(canvas)
for j,folder in enumerate([base,out]):
 im=Image.open(folder/'s08_low.png').convert('RGB');im=im.resize((960,540));canvas.paste(im,(j*960,40));dr.text((j*960+30,12),'b02b' if j==0 else 'b04',fill='white')
canvas.save(out/'低倍_b02b_vs_b04.png')
files=sorted(p for p in (root/'engine/lib').rglob('*') if p.is_file())+[root/'parity_r4/chapters/04.js']
end=''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(root))+'\n' for p in files)
(out/'sha256_结束.txt').write_text(end)
assert end==(out/'sha256_开工.txt').read_text()
(out/'sha256_校验.log').write_text('开工/结束一致；全部锁定文件 OK\n')
assert all(r['passed'] for r in rows)
print(json.dumps(rows,ensure_ascii=False))
