#!/usr/bin/env python3
"""build_final.py — 全片装配脚本（可重跑）

用法:
  /workspace/venv_qa/bin/python qa/v6/final_assemble/build_final.py [--check-lanes-only]

覆盖来源表写在 coverage_final.json（本脚本每次运行都重新生成）。
先用回退版本做整片，再（若时间 <=16:45）检查仍在进行的 lane。
"""

from __future__ import annotations
import json, math, subprocess, sys, shutil, hashlib, os
from pathlib import Path
from datetime import datetime, timezone

# ─────────────────────── 路径常量 ───────────────────────
ROOT      = Path(__file__).resolve().parents[3]      # /workspace/病理科普视频/v5
WORKSPACE = ROOT.parent                               # /workspace/病理科普视频
QA        = ROOT / 'qa/v6/final_assemble'
FINAL_DIR = ROOT / 'final'
TIMELINE  = WORKSPACE / '配音/全稿_v3/timeline.json'
NARRATION = WORKSPACE / '配音/全稿_v3/旁白_v3.wav'
MUSIC_WAV = ROOT / 'music/Wholesome.mp3'
EXPORT_PY = WORKSPACE / 'v5_qa_dev/qa/v6/export/export_final.py'
PYTHON    = '/workspace/venv_qa/bin/python'
FPS       = 30

# ─────────────────────── 场景来源表 ───────────────────────
# 格式：(候选路径, DONE.json路径, 回退路径, 是否已知pass)
# done_path=None → 无需检查 DONE，always用候选（已知 pass）
# done_path=False → 直接用回退

def _gross(sub): return WORKSPACE / f'v5_gross_dev/qa/v6/gross_swap/{sub}'
def _clin(sub):  return WORKSPACE / f'v5_clin_dev/qa/v6/{sub}'
def _mech(sub):  return WORKSPACE / f'v5_mech_dev/qa/v6/{sub}'
def _chron(sub): return WORKSPACE / f'v5_chron_dev/qa/v6/{sub}'
def _open(sub):  return WORKSPACE / f'v5_open_dev/qa/v6/{sub}'
def _card(sub):  return WORKSPACE / f'v5_card_dev/qa/v6/{sub}'
def _ct(sub):    return WORKSPACE / f'v5_ct_dev/qa/v6/{sub}'
def _s19(sub):   return WORKSPACE / f'v5_s19_dev/qa/v6/{sub}'
def _v5(sub):    return ROOT / sub

GROSS_DONE = _gross('DONE.json')
S13S14_DONE = _mech('s13s14_rescale/DONE.json')
S19_DONE = _s19('s19_b09_fix01/DONE.json')

# 仍在进行的三条 lane（每次跑时重新检查）
PENDING_LANES = {
    's10s11_b09': {
        'done': _clin('s10s11_b09/DONE.json'),
        'lock_glob': 'S10_S11.mp4.lock',
    },
    'mech_fix02': {
        'done': _mech('mech_fix02/DONE.json'),
        'lock_glob': 'S13r.mp4.lock',
    },
    's18_b09': {
        'done': _chron('s18_b09/DONE.json'),
        'lock_glob': 'S18.mp4.lock',
    },
}

def lane_pass(done_path: Path) -> bool:
    """检查 DONE.json 是否存在且 status=pass，且无对应 .lock 文件。"""
    if not done_path.exists():
        return False
    # 检查同目录下是否有任何 .lock 文件
    for f in done_path.parent.glob('*.lock'):
        print(f'  WARN: lock file exists: {f}', flush=True)
        return False
    try:
        d = json.loads(done_path.read_text())
        return str(d.get('status', '')).lower() == 'pass'
    except Exception:
        return False


def build_coverage() -> dict:
    """构建覆盖表，返回每个场景的实际视频路径和是否回退。"""
    gross_ok = lane_pass(GROSS_DONE)
    s13s14_ok = lane_pass(S13S14_DONE)
    s19_ok = lane_pass(S19_DONE)
    s10s11_ok = lane_pass(_clin('s10s11_b09/DONE.json'))
    mech_fix02_ok = lane_pass(_mech('mech_fix02/DONE.json'))
    s18_b09_ok = lane_pass(_chron('s18_b09/DONE.json'))

    print(f'[coverage] gross_swap={gross_ok}, s13s14_rescale={s13s14_ok}, '
          f's19_b09_fix01={s19_ok}, s10s11_b09={s10s11_ok}, '
          f'mech_fix02={mech_fix02_ok}, s18_b09={s18_b09_ok}', flush=True)

    t = json.loads(TIMELINE.read_text())
    rows = {r['n']: r for r in t['lines']}
    total_dur = t['duration']  # 327.8315

    def row_start(n): return rows[n]['start']
    def row_end(n):   return rows[n]['end']

    # ── 场景区间（句号→时间） ──
    # 每条记录: scene_id, sentences, start_s, end_s, video, fallback
    # end_s 取下一句的 start（或 total_dur 对于最后句）
    def seg_end(last_n):
        nxt = last_n + 1
        return rows[nxt]['start'] if nxt in rows else total_dur

    cov = []

    # S01 句1-5
    s01_vid = _gross('S01/S01.mp4') if gross_ok else _open('open/s01/S01.mp4')
    cov.append(dict(scene='S01', sentences=list(range(1,6)),
        start=row_start(1), end=seg_end(5),
        video=str(s01_vid), fallback=not gross_ok,
        source='gross_swap/S01' if gross_ok else 'open/s01'))

    # S02 句6-10
    cov.append(dict(scene='S02', sentences=list(range(6,11)),
        start=row_start(6), end=seg_end(10),
        video=str(_clin('clin/S02/S02.mp4')), fallback=False, source='clin/S02'))

    # S03 句11-13
    cov.append(dict(scene='S03', sentences=list(range(11,14)),
        start=row_start(11), end=seg_end(13),
        video=str(_clin('clin/S03/S03.mp4')), fallback=False, source='clin/S03'))

    # S04 句14-19
    cov.append(dict(scene='S04', sentences=list(range(14,20)),
        start=row_start(14), end=seg_end(19),
        video=str(_ct('ct_real_adv01/S04/S04.mp4')), fallback=False, source='ct_real_adv01/S04'))

    # S05 句20-22
    s05_vid = _gross('S05/S05.mp4') if gross_ok else _card('card/S05/S05.mp4')
    cov.append(dict(scene='S05', sentences=list(range(20,23)),
        start=row_start(20), end=seg_end(22),
        video=str(s05_vid), fallback=not gross_ok,
        source='gross_swap/S05' if gross_ok else 'card/S05'))

    # S06 句23-24
    s06_vid = _gross('S06/S06.mp4') if gross_ok else _v5('qa/v6/h06_adv/s06/S06.mp4')
    cov.append(dict(scene='S06', sentences=[23,24],
        start=row_start(23), end=seg_end(24),
        video=str(s06_vid), fallback=not gross_ok,
        source='gross_swap/S06' if gross_ok else 'h06_adv/s06'))

    # S07 句25-30
    cov.append(dict(scene='S07', sentences=list(range(25,31)),
        start=row_start(25), end=seg_end(30),
        video=str(_v5('qa/v6/h06_adv/s07/S07.mp4')), fallback=False, source='h06_adv/s07'))

    # S08 句31-34（s08_rescale 已 FAILED → 直接用 animatic/S08.mp4）
    cov.append(dict(scene='S08', sentences=list(range(31,35)),
        start=row_start(31), end=seg_end(34),
        video=str(_v5('qa/v6/animatic/S08.mp4')), fallback=True, source='animatic/S08'))

    # S09 句35-36
    cov.append(dict(scene='S09', sentences=[35,36],
        start=row_start(35), end=seg_end(36),
        video=str(_ct('ct_real_adv01/S09/S09.mp4')), fallback=False, source='ct_real_adv01/S09'))

    # S10+S11 句37-46（含 S11_s46 特殊处理）
    if s10s11_ok:
        s10s11_vid = _clin('s10s11_b09/S10_S11.mp4')
        s10s11_src = 's10s11_b09/S10_S11'
        s10s11_fb = False
    else:
        s10s11_vid = _v5('qa/v6/d01_s11/S10_S11.mp4')
        s10s11_src = 'd01_s11/S10_S11 (fallback)'
        s10s11_fb = True
    # 句46 用 gross_swap/S11_s46（若 gross_ok），叠接
    s11_s46_vid = _gross('S11_s46/S11_s46.mp4') if gross_ok else None
    cov.append(dict(scene='S10_S11', sentences=list(range(37,47)),
        start=row_start(37), end=seg_end(46),
        video=str(s10s11_vid), fallback=s10s11_fb, source=s10s11_src,
        s46_override=str(s11_s46_vid) if s11_s46_vid and s11_s46_vid.exists() else None))

    # S12 句47-48
    cov.append(dict(scene='S12', sentences=[47,48],
        start=row_start(47), end=seg_end(48),
        video=str(_ct('ct_real_adv01/S12/S12.mp4')), fallback=False, source='ct_real_adv01/S12'))

    # S13 句49-53（mech_fix02 无 DONE → 回退 mech/s13_adv01；不用 s13s14_rescale/S13r）
    if mech_fix02_ok:
        s13_vid = _mech('mech_fix02/S13r.mp4')
        s13_src = 'mech_fix02/S13r'
        s13_fb = False
    else:
        s13_vid = _mech('mech/s13_adv01/S13.mp4')
        s13_src = 'mech/s13_adv01 (fallback, s13s14_rescale S13r 已否)'
        s13_fb = True
    cov.append(dict(scene='S13', sentences=list(range(49,54)),
        start=row_start(49), end=seg_end(53),
        video=str(s13_vid), fallback=s13_fb, source=s13_src))

    # S14 句54-57（s13s14_rescale 已 pass）
    s14_vid = _mech('s13s14_rescale/S14r.mp4') if s13s14_ok else _v5('qa/v6/f03_s14/S14.mp4')
    cov.append(dict(scene='S14', sentences=list(range(54,58)),
        start=row_start(54), end=seg_end(57),
        video=str(s14_vid), fallback=not s13s14_ok,
        source='s13s14_rescale/S14r' if s13s14_ok else 'f03_s14 (fallback)'))

    # S15 句58-59
    cov.append(dict(scene='S15', sentences=[58,59],
        start=row_start(58), end=seg_end(59),
        video=str(_ct('ct_real_adv01/S15/S15.mp4')), fallback=False, source='ct_real_adv01/S15'))

    # S16 句60-62
    cov.append(dict(scene='S16', sentences=[60,61,62],
        start=row_start(60), end=seg_end(62),
        video=str(_clin('clin/S16/S16.mp4')), fallback=False, source='clin/S16'))

    # S17 句63-65
    cov.append(dict(scene='S17', sentences=[63,64,65],
        start=row_start(63), end=seg_end(65),
        video=str(_card('card/S17/S17.mp4')), fallback=False, source='card/S17'))

    # S18 句66-68（句66 用 gross_swap/S18_s66）
    if s18_b09_ok:
        s18_vid = _chron('s18_b09/S18.mp4')
        s18_src = 's18_b09/S18'
        s18_fb = False
    else:
        s18_vid = _chron('chron_s18/S18.mp4')
        s18_src = 'chron_s18 (fallback)'
        s18_fb = True
    s18_s66_vid = _gross('S18_s66/S18_s66.mp4') if gross_ok else None
    cov.append(dict(scene='S18', sentences=[66,67,68],
        start=row_start(66), end=seg_end(68),
        video=str(s18_vid), fallback=s18_fb, source=s18_src,
        s66_override=str(s18_s66_vid) if s18_s66_vid and s18_s66_vid.exists() else None))

    # S19 句69-70（已 pass）
    s19_vid = _s19('s19_b09_fix01/S19.mp4') if s19_ok else _v5('qa/v6/e12_s19/S19.mp4')
    cov.append(dict(scene='S19', sentences=[69,70],
        start=row_start(69), end=seg_end(70),
        video=str(s19_vid), fallback=not s19_ok,
        source='s19_b09_fix01/S19' if s19_ok else 'e12_s19 (fallback)'))

    # S20 句71-74
    cov.append(dict(scene='S20', sentences=[71,72,73,74],
        start=row_start(71), end=seg_end(74),
        video=str(_card('card/S20/S20.mp4')), fallback=False, source='card/S20'))

    # S21 句75-77
    cov.append(dict(scene='S21', sentences=[75,76,77],
        start=row_start(75), end=total_dur,
        video=str(_open('open/s21/S21.mp4')), fallback=False, source='open/s21'))

    # 验证所有视频存在
    missing = []
    for c in cov:
        if not Path(c['video']).exists():
            missing.append(c['video'])
    if missing:
        print('MISSING VIDEOS:', missing, flush=True)
        raise FileNotFoundError(f'Missing: {missing}')

    return {'scenes': cov, 'total_dur': total_dur,
            'generated': datetime.now(timezone.utc).isoformat()}


# ─────────────────────── 拼接主函数 ───────────────────────
def run(args):
    """Return (cmd, log_path) for ffmpeg calls; just prints."""
    pass


def splice_film(cov: dict) -> Path:
    """用 build_v16 的帧补丁方式，把每个场景嵌入基线视频对应区间。
    基线 = qa/v6/animatic/粗剪_v16.mp4（已含字幕带/音频）。
    输出 qa/v6/final_assemble/splice/ 下分段 + 拼接成片。
    返回拼接后视频路径。
    """
    baseline = ROOT / 'qa/v6/animatic/粗剪_v16.mp4'
    if not baseline.exists():
        raise FileNotFoundError(baseline)

    splice_dir = QA / 'splice'
    splice_dir.mkdir(exist_ok=True)

    # 基线帧数
    info = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(baseline)
    ]))
    total_frames = int(next(s for s in info['streams'] if s['codec_type']=='video')['nb_frames'])
    baseline_dur = float(info['format']['duration'])
    print(f'[splice] baseline: {total_frames} frames, {baseline_dur:.3f}s', flush=True)

    scenes = cov['scenes']

    # 对 S10_S11 句46 和 S18 句66 有 override，需要先把 override 嵌入主视频再整段替换
    # 策略：每条 scene 计算它在基线中的帧范围，
    # 若有 s46_override / s66_override，把那一句的帧段再叠一次

    segments = []
    cursor = 0
    for sc in scenes:
        sf = math.ceil(sc['start'] * FPS)
        ef = min(math.ceil(sc['end'] * FPS), total_frames)
        if cursor < sf:
            segments.append({'sf': cursor, 'ef': sf, 'scene': None})
        segments.append({'sf': sf, 'ef': ef, 'scene': sc})
        cursor = ef
    if cursor < total_frames:
        segments.append({'sf': cursor, 'ef': total_frames, 'scene': None})

    paths = []
    for i, seg in enumerate(segments):
        dest = splice_dir / f'{i:03d}.mp4'
        paths.append(dest)
        if dest.exists():
            print(f'  skip {dest.name} (exists)', flush=True)
            continue

        sf, ef, sc = seg['sf'], seg['ef'], seg['scene']
        dur_frames = ef - sf

        if sc is None:
            # 直接从基线切
            cmd = ['ffmpeg', '-v', 'error', '-y',
                   '-threads', '1',
                   '-ss', str(sf / FPS), '-i', str(baseline),
                   '-frames:v', str(dur_frames),
                   '-map', '0:v:0', '-an',
                   '-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast',
                   '-pix_fmt', 'yuv420p', '-bf', '0', '-g', str(FPS),
                   '-threads', '1', str(dest)]
        else:
            vid = sc['video']
            # origin = 场景视频相对于全片时间轴的起点（start_s）
            origin = sc['start']
            ss_scene = max(0.0, sf / FPS - origin)

            # 对 s46/s66 override 场景：用 overlay 把 override 叠在正确时间段
            # 简化处理：overlay 在 ff_complex 里做时间门控
            override_key = None
            override_vid = None
            override_sf = override_ef = 0

            if sc.get('s46_override'):
                # 句46 start/end
                t46_start = cov['scenes'][0]['start']  # dummy, recalc below
                t = json.loads(TIMELINE.read_text())
                rmap = {r['n']: r for r in t['lines']}
                s46_start = rmap[46]['start']
                s46_end   = rmap[46]['end']
                override_key = 's46'
                override_vid = sc['s46_override']
                override_sf = int(s46_start * FPS)
                override_ef = min(int(s46_end * FPS) + FPS, ef)  # 给一秒余量

            if sc.get('s66_override'):
                t = json.loads(TIMELINE.read_text())
                rmap = {r['n']: r for r in t['lines']}
                s66_start = rmap[66]['start']
                s66_end   = rmap[66]['end']
                override_key = 's66'
                override_vid = sc['s66_override']
                override_sf = int(s66_start * FPS)
                override_ef = min(int(s66_end * FPS) + FPS, ef)

            if override_key and override_vid and Path(override_vid).exists():
                # 叠 override：在 s46/s66 时间段内用 override 视频覆盖场景视频
                ov_origin = override_sf / FPS
                ov_ss = max(0.0, sf / FPS - ov_origin)
                # filter: scene video + overlay video → 在 override 窗口内切换
                rel_ov_sf = override_sf - sf   # override 窗口相对于本段起始帧
                rel_ov_ef = override_ef - sf
                # 拼 filter_complex
                filt = (
                    f'[1:v]scale=1920:1080,setpts=PTS-STARTPTS[sc];'
                    f'[2:v]scale=1920:1080,setpts=PTS-STARTPTS[ov];'
                    f'[sc][ov]overlay=0:0:enable=between(t\\,{rel_ov_sf/FPS:.4f}\\,{rel_ov_ef/FPS:.4f})[v]'
                )
                cmd = ['ffmpeg', '-v', 'error', '-y',
                       '-threads', '1',
                       '-ss', str(sf / FPS), '-i', str(baseline),
                       '-threads', '1', '-ss', str(ss_scene), '-i', vid,
                       '-threads', '1', '-ss', str(ov_ss), '-i', str(override_vid),
                       '-filter_complex_threads', '1',
                       '-filter_complex', filt,
                       '-map', '[v]',
                       '-frames:v', str(dur_frames), '-an',
                       '-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast',
                       '-pix_fmt', 'yuv420p', '-bf', '0', '-g', str(FPS),
                       '-threads', '1', str(dest)]
            else:
                # 普通场景覆盖
                filt = (
                    f'[1:v]scale=1920:1080,tpad=stop_mode=clone:stop_duration=5,'
                    f'setpts=PTS-STARTPTS[p];'
                    f'[0:v][p]overlay=0:0:eof_action=repeat[v]'
                )
                cmd = ['ffmpeg', '-v', 'error', '-y',
                       '-threads', '1',
                       '-ss', str(sf / FPS), '-i', str(baseline),
                       '-threads', '1', '-ss', str(ss_scene), '-i', vid,
                       '-filter_complex_threads', '1',
                       '-filter_complex', filt,
                       '-map', '[v]',
                       '-frames:v', str(dur_frames), '-an',
                       '-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast',
                       '-pix_fmt', 'yuv420p', '-bf', '0', '-g', str(FPS),
                       '-threads', '1', str(dest)]

        print(f'  [{i:03d}] {sf}–{ef} scene={sc["scene"] if sc else "inherit"}', flush=True)
        subprocess.run([str(c) for c in cmd], check=True)

    # concat
    concat_txt = splice_dir / 'concat.txt'
    concat_txt.write_text(''.join(f"file '{p}'\n" for p in paths))
    out_vid = QA / 'film_no_audio.mp4'
    if not out_vid.exists():
        subprocess.run([
            'ffmpeg', '-v', 'error', '-y',
            '-f', 'concat', '-safe', '0', '-i', str(concat_txt),
            '-c', 'copy', '-an', '-movflags', '+faststart',
            str(out_vid)
        ], check=True)
        print(f'[splice] concat done → {out_vid}', flush=True)
    else:
        print(f'[splice] concat exists → {out_vid}', flush=True)
    return out_vid


def mix_audio_and_export(film_v: Path, cov: dict):
    """1) 用基线 v16 的音频轨（已含旁白+字幕）作为音频底；
    2) 配乐混入；
    3) 生成 credits（实名+盲审）；
    4) 调 export_final.py 生成最终三版。
    """
    baseline = ROOT / 'qa/v6/animatic/粗剪_v16.mp4'

    # ── 1. 抽基线音频 + 旁白 ──
    audio_base = QA / 'audio_base.wav'
    if not audio_base.exists():
        subprocess.run([
            'ffmpeg', '-v', 'error', '-y', '-threads', '1',
            '-i', str(baseline),
            '-vn', '-ac', '2', '-ar', '48000',
            '-c:a', 'pcm_s16le', str(audio_base)
        ], check=True)
        print(f'[audio] baseline audio → {audio_base}', flush=True)

    # ── 2. 合并视频+音频 ──
    pic_voice = QA / 'picture_and_voice.mp4'
    if not pic_voice.exists():
        subprocess.run([
            'ffmpeg', '-v', 'error', '-y', '-threads', '1',
            '-i', str(film_v), '-i', str(audio_base),
            '-map', '0:v:0', '-map', '1:a:0',
            '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
            '-ar', '48000', '-ac', '2',
            '-movflags', '+faststart', str(pic_voice)
        ], check=True)
        print(f'[audio] pic+voice → {pic_voice}', flush=True)

    # ── 3. credits 渲染 ──
    # 用 render.mjs 渲染 credits 场景（实名版和盲审版）
    credits_named = QA / 'credits_named.mp4'
    credits_blind = QA / 'credits_blind.mp4'

    RENDER = Path('/workspace/garden-skills/skills/motion-showreel/scripts/render.mjs')

    if not credits_named.exists():
        print('[credits] rendering named ...', flush=True)
        subprocess.run([
            'node', str(RENDER), 'film',
            '--q', 'scene=credits&duration=14',
            '--fps', '30', '--workers', '1',
            '--out', str(credits_named),
        ], cwd=str(ROOT), check=True)
        print(f'[credits] named → {credits_named}', flush=True)

    if not credits_blind.exists():
        print('[credits] rendering blind ...', flush=True)
        subprocess.run([
            'node', str(RENDER), 'film',
            '--q', 'scene=credits&duration=14&blind=true',
            '--fps', '30', '--workers', '1',
            '--out', str(credits_blind),
        ], cwd=str(ROOT), check=True)
        print(f'[credits] blind → {credits_blind}', flush=True)

    # ── 4. export_final.py ──
    FINAL_DIR.mkdir(exist_ok=True)
    out_dir = FINAL_DIR
    # 复制 credits 到 export 能找到的位置
    cmd = [
        PYTHON, str(EXPORT_PY),
        '--video', str(pic_voice),
        '--music', str(MUSIC_WAV),
        '--credits', str(credits_named),
        '--out', str(out_dir),
    ]
    print('[export] running export_final.py ...', flush=True)
    env = os.environ.copy()
    env['PATH'] = '/workspace/venv_qa/bin:' + env.get('PATH', '')
    subprocess.run(cmd, cwd=str(ROOT), check=True, env=env)
    print('[export] export_final.py done', flush=True)

    # export_final.py 会生成 成片_1080p.mp4 和 成片_盲审版.mp4
    # 重命名为 brief 要求的文件名
    master = out_dir / '成片_1080p.mp4'
    blind  = out_dir / '成片_盲审版.mp4'
    final_1080 = out_dir / '阑尾_final_1080p.mp4'
    final_720  = out_dir / '阑尾_final_720p.mp4'
    final_blind = out_dir / '阑尾_blind_1080p.mp4'

    if master.exists() and not final_1080.exists():
        shutil.copy2(master, final_1080)
    if blind.exists() and not final_blind.exists():
        shutil.copy2(blind, final_blind)

    # 生成 720p 预览
    if final_1080.exists() and not final_720.exists():
        subprocess.run([
            'ffmpeg', '-v', 'error', '-y', '-threads', '1',
            '-i', str(final_1080),
            '-vf', 'scale=1280:720',
            '-c:v', 'libx264', '-crf', '20', '-preset', 'fast',
            '-c:a', 'aac', '-b:a', '128k',
            '-movflags', '+faststart', str(final_720)
        ], check=True)
        print(f'[export] 720p → {final_720}', flush=True)

    return final_1080, final_720, final_blind


def main():
    check_only = '--check-lanes-only' in sys.argv
    no_splice = '--no-splice' in sys.argv

    # 1. 覆盖表（每次重跑都重新检查）
    cov = build_coverage()
    (QA / 'coverage_final.json').write_text(json.dumps(cov, indent=2, ensure_ascii=False))
    print(f'[main] coverage written, {len(cov["scenes"])} scenes', flush=True)

    # 列出回退场景
    fb = [c['scene'] for c in cov['scenes'] if c.get('fallback')]
    if fb:
        print(f'[main] FALLBACK scenes: {fb}', flush=True)

    if check_only:
        return

    if not no_splice:
        # 2. 拼接
        film_v = splice_film(cov)
        # 3. 音频+导出
        f1080, f720, fblind = mix_audio_and_export(film_v, cov)
        print(f'[main] DONE: {f1080}, {f720}, {fblind}', flush=True)

    # 4. 校验.json
    write_probe_summary()


def write_probe_summary():
    FINAL_DIR.mkdir(exist_ok=True)
    out = {}
    for name in ['阑尾_final_1080p.mp4', '阑尾_final_720p.mp4', '阑尾_blind_1080p.mp4']:
        p = FINAL_DIR / name
        if p.exists():
            info = json.loads(subprocess.check_output([
                'ffprobe', '-v', 'error', '-show_format', '-show_streams',
                '-of', 'json', str(p)
            ]))
            h = hashlib.sha256(p.read_bytes()).hexdigest()
            out[name] = {
                'path': str(p),
                'size_bytes': p.stat().st_size,
                'sha256': h,
                'duration': info['format'].get('duration'),
                'streams': [{'codec_name': s.get('codec_name'),
                              'width': s.get('width'), 'height': s.get('height'),
                              'codec_type': s.get('codec_type')} for s in info['streams']],
            }
    (FINAL_DIR / '校验.json').write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print('[main] 校验.json written', flush=True)


if __name__ == '__main__':
    main()



