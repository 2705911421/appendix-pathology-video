import subprocess,json,pathlib
P=pathlib.Path(__file__).resolve().parent;A=P.parent/'animatic';r={}
for suffix in ['', '_720p']:
 rows=[]
 for version in ['v11','v12']:
  p=A/('粗剪_'+version+suffix+'.mp4');d=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','a:0','-show_packets','-show_entries','packet=pts,dts,duration','-of','json',str(p)]));rows.append(d['packets'])
 assert rows[0]==rows[1],suffix
 r[suffix or '1080p']={'all_audio_packet_timestamps_identical':True,'packet_count':len(rows[0])}
(P/'audio_timing.json').write_text(json.dumps(r,indent=2));print(r)
