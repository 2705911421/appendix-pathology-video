from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import subprocess,json,numpy as np,io
P=Path(__file__).resolve().parent;A=P.parent/'animatic';font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',20)
def get(a):return subprocess.check_output(list(map(str,a)))
def packets(p,stream):return json.loads(get(['ffprobe','-v','error','-select_streams',stream,'-show_packets','-show_data_hash','sha256','-show_entries','packet=pts_time,data_hash','-of','json',p]))['packets']
r={}
for suffix in ['', '_720p']:
 old=A/('粗剪_v13'+suffix+'.mp4');new=A/('粗剪_v14'+suffix+'.mp4');win=json.loads((P/('splice'+suffix)/'window.json').read_text());a,b=packets(old,'v:0'),packets(new,'v:0');assert len(a)==len(b),(len(a),len(b));outside=[i for i in range(len(a)) if i<win['gop_start'] or i>=win['gop_end']];assert all(a[i]['data_hash']==b[i]['data_hash'] for i in outside)
 aa,bb=packets(old,'a:0'),packets(new,'a:0');assert [v['data_hash'] for v in aa]==[v['data_hash'] for v in bb]
 r[suffix or '1080p']={'video_frames':len(b),'outside_gop_identical_packets':len(outside),'audio_packets_identical':len(aa),'window':win}
# Decode the delivered final video sequentially, covering every requested frame.
frames=P/'boundary_frames';frames.mkdir(exist_ok=True)
subprocess.run(['ffmpeg','-v','error','-y','-threads','1','-i',str(A/'粗剪_v14.mp4'),'-vf',"select='between(n,3020,3040)'",'-vsync','0','-threads','1',str(frames/'%02d.png')],check=True)
sheet=Image.new('RGB',(7*384,3*242),'#F4EFE6');d=ImageDraw.Draw(sheet);stats=[]
for i in range(21):
 im=Image.open(frames/f'{i+1:02d}.png').convert('RGB');x=i%7*384;y=i//7*242;sheet.paste(im.resize((384,216)),(x,y+26));d.text((x+5,y+1),str(3020+i),font=font,fill='black');arr=np.array(im);stats.append({'frame':3020+i,'std':float(arr[:950].std()),'mean':float(arr[:950].mean())});assert arr[:950].std()>15
sheet.save(P/'frames_3020_3040.png');r['boundary_frames']=stats
(P/'verification.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2))
