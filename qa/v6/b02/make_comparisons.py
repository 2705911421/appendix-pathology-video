from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
p=Path(__file__).parent
font=ImageFont.truetype('/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf',24)
def label(im,xy,s):ImageDraw.Draw(im).text(xy,s,font=font,fill='#51336F')
# b02 has a larger field zoom. Normalize by the measured neutrophil diameter:
# reference ~18 px, b02 ~64 px at this peripheral vessel. Both panels ~54 px.
a=Image.open('qa/ref/style_target/t_089.73.png').convert('RGB');b=Image.open(p/'s08_high_s30.png').convert('RGB')
out=Image.new('RGB',(1360,800),'#F6EEF0');out.paste(a.crop((420,290,640,510)).resize((660,660)),(10,90));out.paste(b.crop((750,180,1530,960)).resize((660,660)),(690,90));label(out,(20,20),'样张 89.73 秒 / 中性粒直径归一');label(out,(700,20),'b02 第30句 / 相同细胞显示尺度');out.save(p/'对比_样张vs_b02.png')
out=Image.new('RGB',(1600,780),'#F6EEF0');new=Image.open(p/'cells/t_000.00.png');out.paste(new.crop((70,150,1100,320)),(30,100));label(out,(30,30),'新增细胞：2倍绘制（同引擎 rng、染色质、核色族）')
label(out,(30,340),'样张中性粒：89.73 秒，原始像素2倍');out.paste(a.crop((420,290,640,430)).resize((440,280)),(30,390))
r=Image.open('qa/ref/style_target/t_099.22.png');label(out,(580,340),'样张红细胞：99.22 秒，原始像素2倍');out.paste(r.crop((550,225,650,300)).resize((200,150)),(580,390));label(out,(580,580),'红细胞沿用样张，不新写红细胞画法');out.save(p/'对比_新细胞vs样张中性粒.png')
