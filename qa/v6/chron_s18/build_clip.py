"""Build S18_带配音_720p.mp4: S18 plate + real voice (sentences 66-68) + dark subtitle band."""
import json, pathlib, subprocess
P = pathlib.Path(__file__).resolve().parent
root = P.parents[2]
voice = '/workspace/病理科普视频/配音/全稿_v3/旁白_v3.wav'
d = json.load(open('/workspace/病理科普视频/配音/全稿_v3/timeline.json'))['lines']
s66 = next(x for x in d if x['n'] == 66); s68 = next(x for x in d if x['n'] == 68)
origin, dur = s66['start'], s68['end'] - s66['start'] + 0.8
fc = ("[1:v]scale=1280:720[base];[2:v]scale=1280:720[sub];"
      "[base][sub]overlay=0:0:format=auto,format=yuv420p[v]")
cmd = ['ffmpeg', '-v', 'error', '-y',
       '-ss', f'{origin:.6f}', '-t', f'{dur:.6f}', '-i', voice,
       '-i', str(P / 'S18.mp4'),
       '-framerate', '30', '-i', str(P / 'subtitles/f_%05d.png'),
       '-filter_complex', fc, '-map', '[v]', '-map', '0:a',
       '-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast', '-threads', '2',
       '-c:a', 'aac', '-b:a', '192k', '-t', f'{dur:.6f}',
       '-movflags', '+faststart', str(P / 'S18_带配音_720p.mp4')]
subprocess.run(cmd, check=True)
print('ok', origin, dur)
