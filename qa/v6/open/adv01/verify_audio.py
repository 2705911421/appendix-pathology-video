import json,pathlib,subprocess,numpy as np
base=pathlib.Path(__file__).resolve().parents[1]
rows=json.load(open('/workspace/病理科普视频/配音/全稿_v3/timeline.json'))['lines']
def pcm(args):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-threads','1']+args+['-vn','-ac','1','-ar','24000','-f','f32le','-']),np.float32)
for scene,first,last in [('s01',1,5),('s21',75,77)]:
 start=rows[first-1]['start'];end=rows[last]['start'] if last<len(rows) else rows[last-1]['end']
 src=pcm(['-ss',str(start),'-t',str(end-start),'-i','/workspace/病理科普视频/配音/全稿_v3/旁白_v3.wav'])
 dst=pcm(['-i',str(base/scene/(scene.upper()+'_带配音_720p.mp4'))]);n=min(len(src),len(dst))
 corr=float(np.corrcoef(src[:n],dst[:n])[0,1]);rms=float(np.sqrt(np.mean(dst[-12000:]**2)))
 result={'source_start':start,'source_end':end,'zero_lag_pcm_correlation':corr,'tail_half_second_rms':rms,'output_audio_duration':len(dst)/24000}
 json.dump(result,open(base/'adv01'/(scene+'_audio_verify.json'),'w'),indent=2);print(scene,result);assert corr>.98;assert rms<.001
