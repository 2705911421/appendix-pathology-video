import pathlib,json,subprocess
P=pathlib.Path(__file__).resolve().parent;A=P.parent/'animatic'
def hashes(v,out):
 subprocess.run(['ffmpeg','-v','error','-i',str(v),'-map','0:v:0','-f','framemd5','-threads','2','-y',str(out)],check=True)
 return [s.split(',')[-1].strip() for s in out.read_text().splitlines() if not s.startswith('#') and s.strip()]
r=json.loads((P/'iris/resolved.json').read_text());lo=round(r['enterFrameStart']*30);hi=round(r['exitFrameEnd']*30)
report=[]
for suffix in ['', '_720p']:
 old=A/('粗剪_v2'+suffix+'.mp4');new=A/('粗剪_v3'+suffix+'.mp4')
 a=hashes(old,P/('v2'+suffix+'.framemd5'));b=hashes(new,P/('v3'+suffix+'.framemd5'))
 diffs=[i for i,(x,y) in enumerate(zip(a,b)) if x!=y];outside=[i for i in diffs if not lo<=i<hi]
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(new)]));(P/('probe'+suffix+'.json')).write_text(json.dumps(probe,indent=2))
 audio=[]
 for video in [old,new]:
  audio.append(subprocess.check_output(['ffmpeg','-v','error','-i',str(video),'-map','0:a:0','-c','copy','-f','hash','-']).decode().strip())
 video=next(x for x in probe['streams'] if x['codec_type']=='video');sound=next(x for x in probe['streams'] if x['codec_type']=='audio')
 assert (video['width'],video['height'])==((1280,720) if suffix else (1920,1080))
 assert video['codec_name']=='h264' and video['pix_fmt']=='yuv420p' and video['r_frame_rate']=='30/1'
 assert sound['channels']==2 and sound['sample_rate']=='48000' and audio[0]==audio[1]
 report.append({'audio_encoded_hash_equal':audio[0]==audio[1],'suffix':suffix,'frames_v2':len(a),'frames_v3':len(b),'allowed_frames':[lo,hi],'changed_frames':len(diffs),'changed_outside_S10':len(outside),'outside_examples':outside[:20],'all_unaffected_frames_MAE':0 if not outside else None,'duration':probe['format']['duration']})
(P/'final_parity.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));assert all(x['frames_v2']==x['frames_v3'] and x['changed_outside_S10']==0 for x in report)
