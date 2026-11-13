from pathlib import Path
import subprocess,json,numpy as np
P=Path(__file__).resolve().parent;report={}
def pcm(a):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-threads','1',*list(map(str,a)),'-ar','16000','-ac','1','-f','f32le','-']),np.float32)
for scene in ['s06','s07']:
 k=json.loads((P/(scene+'_keyframes.json')).read_text());x=pcm(['-ss',k['origin'],'-i',P.parents[3]/'配音/全稿_v3/旁白_v3.wav','-t',k['duration']]);y=pcm(['-i',P/scene/(scene.upper()+'_带配音_720p.mp4')]);n=min(len(x),len(y));x=x[:n];y=y[:n];nfft=1<<(2*n-1).bit_length();c=np.fft.irfft(np.fft.rfft(y,nfft)*np.conj(np.fft.rfft(x,nfft)),nfft);lags=np.arange(-1600,1601);values=c[lags%nfft];idx=np.argmax(values);lag=int(lags[idx]);peak=float(values[idx]/np.sqrt(np.dot(x,x)*np.dot(y,y)));assert peak>.95,(scene,peak,lag);assert abs(lag)<800,(scene,lag)
 report[scene]={'source':'配音/全稿_v3/旁白_v3.wav','correlation':peak,'lag_samples_16k':lag,'lag_ms':lag/16,'duration_from_sentence_clock':k['duration']}
(P/'audio_verification.json').write_text(json.dumps(report,indent=2));print(report)
