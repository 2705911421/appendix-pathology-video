import subprocess,json,pathlib,numpy as np
P=pathlib.Path(__file__).resolve().parent;A=P.parent/'animatic'
def frame(path,t,w,h):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(path),'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-']),np.uint8).reshape(h,w,3)
r={}
for suffix,w,h in [('',1920,1080),('_720p',1280,720)]:
 old=A/('粗剪_v8'+suffix+'.mp4');new=A/('粗剪_v9'+suffix+'.mp4');pairs={}
 for t in [20,80,100,110,120,160,180,220,280,300,310]:
  mae=float(np.abs(frame(old,t,w,h).astype(float)-frame(new,t,w,h)).mean());pairs[str(t)]=mae;assert mae==0
 meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(new)]));
 hashes=[subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-map','0:a:0','-c','copy','-f','hash','-']).decode().strip() for p in [old,new]];assert hashes[0]==hashes[1]
 k=json.loads((P/'keyframes.json').read_text());themes={}
 for n,p in [('54',k['picks'][1]),('55',k['picks'][2]),('56',k['picks'][3]),('57',k['picks'][4])]:
  f=frame(new,k['origin']+p['t'],w,h);rgb=f[int(h*.91),int(w*.02)].tolist();themes[n]=rgb;assert max(rgb)<40
 r[suffix or '1080p']={'outside_window_MAE':pairs,'audio_hash':hashes[0],'dark_subtitle_background':themes,'video':{key:meta['streams'][0].get(key) for key in ['width','height','r_frame_rate','nb_frames']},'duration':meta['format']['duration']}
(P/'video_check.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2))
