#!/usr/bin/env /workspace/venv_qa/bin/python
import numpy as np
from PIL import Image
import json

ref_dir = '/workspace/病理科普视频/v5/qa/v6/b10'
faith_dir = 'qa/v6/s10s11_b09/faith'

# s31 → t_015.00.png, s34 → t_033.00.png
pairs = [
    ('s31', f'{faith_dir}/t_015.00.png', f'{ref_dir}/s08_high_s31.png'),
    ('s34', f'{faith_dir}/t_033.00.png', f'{ref_dir}/s08_high_s34.png'),
]

results = {}
for name, our, ref in pairs:
    a = np.array(Image.open(our).convert('RGB')).astype(float)
    b = np.array(Image.open(ref).convert('RGB')).astype(float)
    mae = float(np.abs(a - b).mean())
    results[name] = {'MAE': round(mae, 6), 'pass': mae <= 1.0}
    print(f'{name}: MAE={mae:.6f} {"PASS" if mae<=1.0 else "FAIL"} (threshold ≤1.0/255)')

print(json.dumps(results, indent=2))
