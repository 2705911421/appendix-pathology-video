"""Use sentence IDs to cut real narration and align it to the iris review edit."""
from pathlib import Path
import json,subprocess
P=Path(__file__).resolve().parent
source=Path('/workspace/病理科普视频/配音/全稿_v3')
timeline=json.loads((source/'timeline.json').read_text())['lines']
first=next(x for x in timeline if x['n']==69)
last=next(x for x in timeline if x['n']==70)
k=json.loads((P/'keyframes.json').read_text())
assert abs(first['start']-k['origin'])<1e-6
assert abs(last['end']-first['start']-k['duration'])<1e-6
subprocess.run(['ffmpeg','-v','error','-y','-i',str(P/'S19.mp4'),'-ss',str(first['start']),'-t',str(last['end']-first['start']),'-i',str(source/'旁白_v3.wav'),'-filter_complex','[0:v]scale=1280:720[v];[1:a]adelay=450:all=1,apad[a]','-map','[v]','-map','[a]','-c:v','libx264','-threads','1','-crf','16','-preset','medium','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart',str(P/'S19_带配音_720p.mp4')],check=True)
(P/'audio_alignment.json').write_text(json.dumps({'sentence_ids':[69,70],'source':str(source/'旁白_v3.wav'),'source_start':first['start'],'source_end':last['end'],'video_audio_delay_seconds':.45,'note':'Narration cut by sentence IDs; preserves original pause between sentences.'},ensure_ascii=False,indent=2))
