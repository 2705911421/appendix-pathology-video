"""Rebuild S14 plate using cue anchors, iris mechanism and the approved assembler."""
import json,pathlib,subprocess,sys
P=pathlib.Path(__file__).resolve().parent;root=P.parents[2]
def run(cmd):subprocess.run([str(x) for x in cmd],check=True)
k=json.loads((P/'keyframes.json').read_text());o=k['origin'];duration=k['duration']
js="import fs from 'node:fs';import {resolveRanges} from './assembly/subtitle/sceneTheme.js';const cues=JSON.parse(fs.readFileSync('qa/v6/animatic/cues_real.json')).cues;fs.writeFileSync('qa/v6/f03_s14/ranges.json',JSON.stringify(resolveRanges(cues),null,2));"
run(['node','--input-type=module','-e',js])
f=f"[1:v]setpts=PTS-STARTPTS+{o}/TB[s];[0:v][s]overlay=eof_action=pass:enable='gte(t,{o})*lt(t,{o+duration})'[v]"
if '--iris-only' not in sys.argv:run(['ffmpeg','-v','error','-y','-i',root/'qa/v6/e02_s19/scene_plate.mp4','-i',P/'S14.mp4','-filter_complex_threads','1','-filter_complex',f,'-map','[v]','-c:v','libx264','-preset','veryfast','-crf','16','-an',P/'plate_insert.mp4'])
# Exit starts at sentence 57 end and lasts 0.7 seconds.
run(['python3',P/'iris_plate.py','--ranges',P/'ranges.json','--scene','S14','--scene-video',P/'S14.mp4','--base',P/'plate_insert.mp4','--out',P/'scene_plate.mp4','--work',P/'iris','--tail','0.7'])
if '--plate-only' in sys.argv: sys.exit(0)
d=json.load(open('/workspace/病理科普视频/配音/全稿_v3/timeline.json'))
run([root/'assembly/pipeline/assemble.sh','--scene-video',P/'scene_plate.mp4','--cues',root/'qa/v6/animatic/cues_real.json','--voice','/workspace/病理科普视频/配音/全稿_v3/旁白_v3.wav','--content-duration',str(d['duration']),'--fps','30','--out-dir',P/'assembled','--out-name','粗剪_v10','--no-blind'])
