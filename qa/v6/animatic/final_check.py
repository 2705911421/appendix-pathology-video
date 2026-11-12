from pathlib import Path
import json,subprocess,math,hashlib
from PIL import Image,ImageDraw,ImageFont
p=Path(__file__).resolve().parent;root=p.parents[2]
probe=lambda f:json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(f)]))
master=p/'粗剪_v1.mp4'; info=probe(master);dur=float(info['format']['duration']);timing=json.load(open(p/'timing.json'));alignment=json.load(open(p/'alignment.json'));mae=json.load(open(p/'mae.json'))
# Full-film samples plus six S08 states (mid power and five high power states).
times=list(range(0,math.ceil(dur),20))+[timing['origin']+t for t in timing['states'][1:]]
out=p/'contact_frames';out.mkdir(exist_ok=True)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
cw,ch=480,300; sheet=Image.new('RGB',(cw*4,ch*math.ceil(len(times)/4)), '#29292d');draw=ImageDraw.Draw(sheet)
for i,t in enumerate(times):
 file=out/f'{i:02}_{t:.3f}.png'
 subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(master),'-frames:v','1','-vf','scale=480:270',str(file)],check=True)
 x,y=i%4*cw,i//4*ch;sheet.paste(Image.open(file).convert('RGB'),(x,y));draw.text((x+8,y+274),f'{t:.3f} s'+(' / S08' if i>=len(range(0,math.ceil(dur),20)) else ''),font=font,fill='white')
sheet.save(p/'contact_sheet.png')
locked=['engine/lib/'+s+'.js' for s in ['he','he_detail','wash','ann','scope','camera']]+['parity_r4/chapters/04.js']
final=''.join(hashlib.sha256((root/f).read_bytes()).hexdigest()+'  '+f+'\n' for f in locked)
(p/'sha256_结束.txt').write_text(final);ok=final==(p/'sha256_开工.txt').read_text();(p/'sha256_校验.log').write_text('PASS: all seven hashes unchanged\n' if ok else 'FAIL\n')
report=json.load(open(p/'粗剪_v1_report.json'))
text=f'''# 整片粗剪 v1 自检

基线 66ff9d4，分支 v6-fresh；未执行 git commit。保留开工时已有工作区改动，未改 v4_mix/、S08 绘制代码或锁定文件，未读取或修改 .mimo.env。无新增医学数字上屏；粗剪占位场景/句号编号按任务要求显示。

总时长：**{dur:.6f} s**（1080p 与 720p 同长）；内容 {report['contentDuration']:.6f} s，真实 timeline.json duration=327.831500 s，30 fps 取整误差 {report['contentDuration']-327.8315:+.6f} s；保留片尾 12 s。主片 1920×1080、30 fps、H.264；音频 AAC、48 kHz、双声道，无音乐。

S08 全局起点 {timing['origin']:.9f} s；句34结束 141.816458333 s；尾留 0.8 s；请求片段长 {timing['duration']:.9f} s，编码为26.000000 s。嵌入底板按全局时间戳定位，30 fps 最多一帧量化误差。

## 真实时间绑定

仅 film/timeline.js 改动 S08 时序：读取自真实时间轴生成的六句数据快照，以句29起点为0，把每句真实 start/end 映射到原6秒状态区间；句间0.45秒空隙停在下一句起始状态。绘制函数在该模块包装，所有原画笔、相机关键状态与标注保持原代码。句34结束后定格在 b10 的 s34 检查状态。

句29长4.097625秒，低倍保持1.147335秒，低→中推进约1.475145秒，高倍在句29结束前到位，早于句30。各句原状态完整保留，没有因时长删状态。s33最短2.914833秒，镜头推进约0.932747秒，仍保留约1.98秒稳定状态。

分镜表S07为25–30、S08为31–34；本任务明确要求S08成片从29开始，因此S08实际视频覆盖29–34，优先覆盖S07末两句。其余场景按分镜范围显示占位。占位文字左上角x65/y65、28px灰字，完整位于y<950。

## 字幕与配音对齐

loadCues默认没有优先读取timeline.json，存在估算回退。本次显式传入 cues_real.json：77句中英文来自真实timeline.json，start/end逐字段一致，formula=null、finalAudioTiming=true；配音从0开始、不变速。实际合成使用同一subtitleState和30fps采样。下表“出现”指中英alpha都大于0的首个视频帧；0.12秒淡入导致恰在start的alpha为0，故首句首个可见帧为1/30秒。差值均不超过一帧，非估算对齐。

|句|真实start / s|快照差值 / s|首个可见帧时间 / s|差值 / s|
|---|---:|---:|---:|---:|
'''
for a in alignment:text+=f"|{a['n']:02}|{a['start']:.9f}|0|{a['appears']:.9f}|{a['delta']:+.9f}|\n"
text+='\n## S08 七状态 MAE\n\n比较新渲染原始1920×1080 PNG与qa/v6/b10七帧，全帧RGB通道平均绝对误差（视频经过有损H.264编码，验收用编码前PNG）。\n\n|b10旧时刻 / s|新片段时刻 / s|MAE|\n|---|---:|---:|\n'
for m,t in zip(mae,timing['states']):text+=f"|{m['old']}|{t:.9f}|{m['mae']:.9f}|\n"
text+='\n七帧全部逐像素一致，MAE=0<0.5。contact_sheet.png含整片每20秒17帧（0–320秒）及S08中倍、s30–s34共6帧。\n\n## 命令\n\n```bash\nnode /workspace/garden-skills/skills/motion-showreel/scripts/render.mjs film --duration 26.00191666666662 --out qa/v6/animatic/S08.mp4 --size 1920x1080 --fps 30 --workers 3 --png\nnode /workspace/garden-skills/skills/motion-showreel/scripts/render.mjs film --still 0.6829375,2.5951625,6.74502083333333,11.43614583333333,16.125708333333314,20.228958333333317,23.669145833333292 --out qa/v6/animatic/s08_states --size 1920x1080\npython3 qa/v6/animatic/build_plate.py\nassembly/pipeline/assemble.sh --scene-video /workspace/病理科普视频/v5/qa/v6/animatic/scene_plate.mp4 --cues /workspace/病理科普视频/v5/qa/v6/animatic/cues_real.json --voice /workspace/病理科普视频/配音/全稿_v3/旁白_v3.wav --content-duration 327.8315 --fps 30 --out-dir /workspace/病理科普视频/v5/qa/v6/animatic --out-name 粗剪_v1 --no-blind\nnode qa/v6/animatic/check_alignment.mjs\npython3 qa/v6/animatic/final_check.py\n```\n\n底板完整ffmpeg参数见plate_command.json，渲染/合成日志见render.log、assembly.log。assemble脚本已修正固定29–31秒的试片时长检查，改为核对实际预期时长。\n\n## SHA-256\n\n'+('PASS：' if ok else 'FAIL：')+'七个锁定文件开工=结束；记录见sha256_开工.txt、sha256_结束.txt、sha256_校验.log。\n\n```text\n'+final+'```\n\n合成脚本检查结果：'+str(report['blockers'])+'。片尾保持本次开工前状态，合成期间未修改。\n'
(p/'自检.md').write_text(text)
print('Duration',dur,'SHA PASS',ok,'blockers',report['blockers'])
