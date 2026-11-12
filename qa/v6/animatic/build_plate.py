import json,re,subprocess,pathlib
p=pathlib.Path(__file__).resolve().parent
root=p.parents[2]
d=json.load(open('/workspace/病理科普视频/配音/全稿_v3/timeline.json')); timing=json.load(open(p/'timing.json'))
filters=[]
for scene,a,b in re.findall(r'^\| (S\d{2})／(\d+)—(\d+) ',(root/'分镜/分镜_v1.md').read_text(),re.M):
 a,b=int(a),int(b)
 if scene=='S08':continue
 start=0 if a==1 else d['lines'][a-1]['start']
 end=d['lines'][b]['start'] if b<77 else d['duration']
 text=f'草稿占位 {scene} ／句 {a:02}–{b:02}'
 filters.append(f"drawtext=fontfile=/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc:text='{text}':x=65:y=65:fontsize=28:fontcolor=0x8A8680:enable='gte(t,{start})*lt(t,{end})'")
# S08 overrides the storyboard's S07 sentences 29–30, as explicitly requested.
origin=timing['origin'];end=origin+timing['duration']
f='[0:v]'+','.join(filters)+'[base];[1:v]setpts=PTS-STARTPTS+'+str(origin)+'/TB[s];[base][s]overlay=eof_action=pass:enable=\'gte(t,'+str(origin)+')*lt(t,'+str(end)+')\'[v]'
cmd=['ffmpeg','-y','-v','error','-f','lavfi','-i',f"color=c=0xF4EFE6:s=1920x1080:r=30:d={d['duration']}",'-i',str(p/'S08.mp4'),'-filter_complex',f,'-map','[v]','-t',str(d['duration']),'-r','30','-c:v','libx264','-preset','veryfast','-crf','16','-pix_fmt','yuv420p','-an',str(p/'scene_plate.mp4')]
(p/'plate_command.json').write_text(json.dumps(cmd,ensure_ascii=False,indent=2));subprocess.run(cmd,check=True)
