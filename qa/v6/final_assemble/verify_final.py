#!/usr/bin/env python3
"""验收脚本：对照 brief (e) 逐项检查数值。"""
from __future__ import annotations
import json, subprocess, math, sys
from pathlib import Path
import numpy as np
from PIL import Image
import io

ROOT = Path(__file__).resolve().parents[3]
QA = ROOT / 'qa/v6/final_assemble'
FINAL_DIR = ROOT / 'final'
TIMELINE = ROOT.parent / '配音/全稿_v3/timeline.json'
FPS = 30

def probe(p):
    return json.loads(subprocess.check_output(
        ['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))

def frame_at(video, t_s, size=(192,108)):
    r = subprocess.run(['ffmpeg','-v','error','-ss',str(t_s),'-i',str(video),
        '-vframes','1','-f','image2pipe','-vcodec','png','-'],
        capture_output=True, check=True)
    img = Image.open(io.BytesIO(r.stdout)).resize(size, Image.LANCZOS)
    return np.array(img).astype(float)

def main():
    cov = json.loads((QA/'coverage_final.json').read_text())
    t_data = json.loads(TIMELINE.read_text())
    rows = {r['n']:r for r in t_data['lines']}
    total_dur = t_data['duration']

    results = {}

    # ── 1. 覆盖：concat 后无空帧 ──
    concat = QA / 'film_no_audio.mp4'
    if not concat.exists():
        print('SKIP: film_no_audio.mp4 not ready'); sys.exit(1)

    info = probe(concat)
    vst = next(s for s in info['streams'] if s['codec_type']=='video')
    total_frames_out = int(vst['nb_frames'])
    dur_out = float(info['format']['duration'])
    print(f'[verify] film_no_audio: {total_frames_out} frames, {dur_out:.3f}s', flush=True)

    # blackdetect
    r = subprocess.run(['ffmpeg','-v','error','-i',str(concat),
        '-vf','blackdetect=d=0.1:pic_th=0.98','-an','-f','null','-'],
        capture_output=True, text=True)
    black_out = r.stderr
    has_black = 'black_start' in black_out
    results['blackdetect'] = {'pass': not has_black, 'detail': black_out[:500] if has_black else ''}
    print(f'[verify] blackdetect: {"FAIL" if has_black else "PASS"}', flush=True)

    # ── 2. 场景覆盖率（每场景抽5帧 MAE vs 源视频）──
    scene_maes = {}
    for sc in cov['scenes']:
        vid = Path(sc['video'])
        if not vid.exists(): continue
        start_s = sc['start']
        dur = sc['end'] - sc['start']
        maes = []
        for frac in [0.1, 0.3, 0.5, 0.7, 0.9]:
            t_global = start_s + frac * dur
            t_scene  = frac * dur
            try:
                fa = frame_at(concat, t_global)
                fb = frame_at(vid, t_scene)
                mae = float(np.abs(fa.astype(float) - fb.astype(float)).mean())
                maes.append(mae)
            except Exception as e:
                maes.append(999.0)
        median_mae = float(np.median(maes))
        scene_maes[sc['scene']] = {'mae': round(median_mae, 3), 'pass': median_mae <= 5.0, 'samples': [round(m,3) for m in maes]}
        status = 'PASS' if median_mae <= 5.0 else 'FAIL'
        print(f'[verify] {sc["scene"]} MAE={median_mae:.2f} {status}', flush=True)
    results['scene_maes'] = scene_maes

    # ── 总时长验收 ──
    expected_dur = total_dur  # 327.83s（无片尾）
    dur_diff = abs(dur_out - expected_dur)
    results['duration'] = {'out': round(dur_out,3), 'expected_no_credits': round(expected_dur,3),
                           'diff': round(dur_diff,3), 'pass': dur_diff < 2.0}
    print(f'[verify] duration: {dur_out:.3f}s vs expected {expected_dur:.3f}s diff={dur_diff:.3f} {"PASS" if dur_diff<2.0 else "FAIL"}', flush=True)

    # 写结果
    (QA/'verify_splice.json').write_text(json.dumps(results, indent=2, ensure_ascii=False))
    all_pass = results['blackdetect']['pass'] and results['duration']['pass'] and all(v['pass'] for v in scene_maes.values())
    print(f'\n[verify] OVERALL: {"PASS" if all_pass else "FAIL"}', flush=True)
    return 0 if all_pass else 1

if __name__ == '__main__':
    sys.exit(main())
