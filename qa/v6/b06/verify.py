from pathlib import Path
from PIL import Image, ImageChops, ImageStat, ImageDraw, ImageFont
import shutil,hashlib,json
out=Path(__file__).resolve().parent;root=out.parents[2];base=out.parent/'b05'
frames=[('s08_low',1),('s08_transition_01',2.3),('s08_transition_02',3.2),('s08_mid',3.8)]+[(f's08_high_s{s}',t) for s,t in zip(range(30,35),[9,15,21,27,33])]
for name,t in frames:shutil.copyfile(out/f't_{t:06.2f}.png',out/f'{name}.png')
rows=[]
for name,t in frames[3:-1]:
 a=Image.open(base/f'{name}.png').convert('RGB');b=Image.open(out/f'{name}.png').convert('RGB');d=ImageChops.difference(a,b);mae=sum(ImageStat.Stat(d).mean)/3
 rows.append(dict(frame=name,RGB_MAE=mae,changed_pixels=sum(1 for p in d.getdata() if max(p)>0),passed=mae<.5));assert mae<.5
(out/'像素一致性报告.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
(out/'像素一致性报告.md').write_text('# b06 / b05 像素一致性\n\n1920×1080，RGB 0–255；整帧比较，无遮罩、配准或颜色校正。\n\n|帧|MAE|变化像素|通过|\n|---|---|---|---|\n'+''.join(f"|{r['frame']}|{r['RGB_MAE']}|{r['changed_pixels']}|{r['passed']}|\n" for r in rows))
font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',22)
for title,name in [('低倍','s08_low'),('s34','s08_high_s34')]:
 canvas=Image.new('RGB',(1920,580),'#111114');dr=ImageDraw.Draw(canvas)
 for j,folder in enumerate([base,out]):
  canvas.paste(Image.open(folder/f'{name}.png').convert('RGB').resize((960,540)),(j*960,40));dr.text((j*960+30,8),'b05' if j==0 else 'b06',font=font,fill='white')
 canvas.save(out/f'{title}_b05_vs_b06.png')
seven=[frames[0]]+frames[3:];sheet=Image.new('RGB',(1920,4*398),'#111114');dr=ImageDraw.Draw(sheet)
for i,(name,t) in enumerate(seven):
 x=i%2*960;y=i//2*398;sheet.paste(Image.open(out/f'{name}.png').convert('RGB').resize((640,360)),(x+160,y+34));dr.text((x+24,y+3),f'{name} · {t}s',font=font,fill='white')
sheet.save(out/'review_sheet.png')
files=sorted(p for p in (root/'engine/lib').rglob('*') if p.is_file())+[root/'parity_r4/chapters/04.js']
end=''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(root))+'\n' for p in files)
(out/'sha256_结束.txt').write_text(end);assert end==(out/'sha256_开工.txt').read_text();assert end==(base/'sha256_结束.txt').read_text()
(out/'sha256_校验.log').write_text('PASS: b05 结束 = b06 开工 = b06 结束；engine/lib 全部文件及 parity_r4/chapters/04.js sha256 一致\n')
print(json.dumps(rows,ensure_ascii=False,indent=2))
