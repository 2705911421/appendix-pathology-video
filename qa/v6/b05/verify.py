from pathlib import Path
from PIL import Image,ImageChops,ImageStat,ImageDraw,ImageFont
import hashlib,json,shutil
root=Path(__file__).resolve().parents[3];out=Path(__file__).resolve().parent;base=out.parent/'b02'
frames=[('s08_low',1),('s08_transition_01',2.3),('s08_transition_02',3.2),('s08_mid',3.8)]+[(f's08_high_s{s}',t) for s,t in zip(range(30,35),[9,15,21,27,33])]
for name,t in frames:shutil.copyfile(out/f't_{t:06.2f}.png',out/f'{name}.png')
rows=[]
for name,t in frames[3:]:
 a=Image.open(base/f'{name}.png').convert('RGB');b=Image.open(out/f'{name}.png').convert('RGB');clean=Image.open(out/f'no_leader_{t}.png').convert('RGB')
 d=ImageChops.difference(a,b);dc=ImageChops.difference(a,clean)
 # The only intercepted code is the new leader's path commands. All other rendering is unchanged.
 leader=ImageChops.difference(b,clean).convert('L').point(lambda v:255 if v else 0)
 # Use RGB union to include pixels whose luminance could round to zero.
 bands=ImageChops.difference(b,clean).split();leader=ImageChops.lighter(ImageChops.lighter(bands[0],bands[1]),bands[2]).point(lambda v:255 if v else 0)
 outside=Image.composite(Image.new('RGB',a.size),d,leader)
 mae=sum(ImageStat.Stat(dc).mean)/3;outside_mae=sum(ImageStat.Stat(outside).mean)/3
 rows.append(dict(frame=name,time=t,MAE_full=sum(ImageStat.Stat(d).mean)/3,MAE_without_leader=mae,MAE_outside_leader=outside_mae,leader_changed_pixels=leader.histogram()[255],passed=mae<.5 and outside_mae==0))
 assert rows[-1]['passed']
 leader.save(out/f'{name}_指引线例外遮罩.png')
(out/'像素一致性报告.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
(out/'像素一致性报告.md').write_text('# b05 与 b02b 像素一致性\n\n1920×1080 RGB，MAE 范围 0–255。指引线为本轮授权例外，宽 1.6px。通过浏览器仅移除新增指引线路径命令重新渲染，其余生产代码完全相同；与 b02b 比较全部 MAE=0。另验证正式帧在指引线实际覆盖像素外差异为零，保留逐帧例外遮罩。\n\n|帧|含指引线 MAE|移除新增指引线 MAE|指引线之外 MAE|通过|\n|---|---|---|---|---|\n'+''.join(f"|{r['frame']}|{r['MAE_full']:.8f}|{r['MAE_without_leader']}|{r['MAE_outside_leader']}|{r['passed']}|\n" for r in rows))
font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',22)
canvas=Image.new('RGB',(1920,580),'#111114');dr=ImageDraw.Draw(canvas)
for j,folder in enumerate([out.parent/'b04',out]):
 canvas.paste(Image.open(folder/'s08_low.png').convert('RGB').resize((960,540)),(j*960,40));dr.text((j*960+30,8),'b04' if j==0 else 'b05',font=font,fill='white')
canvas.save(out/'低倍_b04_vs_b05.png')
# Seven principal frames: low, medium and five high-power scenes. Transitions supplied separately.
seven=[frames[0]]+frames[3:];sheet=Image.new('RGB',(1920,4*398),'#111114');dr=ImageDraw.Draw(sheet)
for i,(name,t) in enumerate(seven):
 x=i%2*960;y=i//2*398;sheet.paste(Image.open(out/f'{name}.png').convert('RGB').resize((640,360)),(x+160,y+34));dr.text((x+24,y+3),f'{name} · {t}s',font=font,fill='white')
sheet.save(out/'review_sheet.png')
files=sorted(p for p in (root/'engine/lib').rglob('*') if p.is_file())+[root/'parity_r4/chapters/04.js']
end=''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(root))+'\n' for p in files)
(out/'sha256_结束.txt').write_text(end);assert end==(out/'sha256_开工.txt').read_text();assert end==(out.parent/'b04/sha256_结束.txt').read_text()
(out/'sha256_校验.log').write_text('PASS: b04 结束 = b05 开工 = b05 结束；engine/lib 全部文件及 parity_r4/chapters/04.js sha256 一致\n')
print(json.dumps(rows,ensure_ascii=False,indent=2))
