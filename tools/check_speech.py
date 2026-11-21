import difflib
import json
import os
from pathlib import Path
import re
import subprocess

import numpy as np
from faster_whisper import WhisperModel


ROOT = Path(__file__).resolve().parents[1]
timeline = json.loads((ROOT / 'film' / 'timeline.json').read_text(encoding='utf-8'))
terms = json.loads((ROOT / 'tools' / 'audit_terms.json').read_text(encoding='utf-8'))
model = WhisperModel(os.environ.get('WHISPER_MODEL', 'small'), device='cpu', compute_type='int8',
                     cpu_threads=2, local_files_only=True)
decoded = subprocess.run([os.environ.get('FFMPEG_PATH', 'ffmpeg'), '-v','error','-i',str(ROOT / 'audio' / 'narration.wav'),
                          '-ac','1','-ar','16000','-f','f32le','-'], check=True, stdout=subprocess.PIPE).stdout
samples = np.frombuffer(decoded, dtype='<f4')
segments, _ = model.transcribe(samples, language='zh',
                              beam_size=2, vad_filter=True, condition_on_previous_text=False)
observed = []
for segment in segments:
    print(f'{segment.start:6.2f}–{segment.end:6.2f} {segment.text.strip()}', flush=True)
    observed.append({'start': segment.start, 'end': segment.end, 'text': segment.text.strip()})

text = '\n'.join(row['text'] for row in observed)
expected = ''.join(cue['zh'] for cue in timeline['cues'])
only_chinese = lambda value: ''.join(re.findall(r'[\u3400-\u9fff]', value))
similarity = difflib.SequenceMatcher(a=only_chinese(expected), b=only_chinese(text), autojunk=False).ratio()
latin_words = re.findall(r'(?<![A-Za-z])[A-Za-z]{2,}(?![A-Za-z])', text)
# The recognizer can abbreviate the spoken Chinese phrase for computed tomography.
english = [word for word in latin_words if word.upper() != 'CT']
forbidden = [key for key, patterns in terms.items() if re.search('|'.join(patterns), text, re.IGNORECASE)]
result = {'model': 'faster-whisper small', 'segments': observed, 'chineseSimilarity': round(similarity, 3),
          'unexpectedLatinWords': english, 'forbiddenMatches': forbidden}
(ROOT / 'qa' / 'speech.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
if not observed or similarity < .65 or english or forbidden or observed[-1]['end'] > timeline['creditsFrame'] / timeline['fps'] + .4:
    raise SystemExit('Speech transcript requires targeted listening review')
print(f'ASR check completed, transcript similarity {similarity:.3f}')
