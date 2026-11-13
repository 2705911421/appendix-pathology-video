#!/bin/bash
set -euo pipefail
cd /workspace/病理科普视频/v5
p=qa/v6/h06_adv
while true; do
 count=$(ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 "$p/s07/S07.mp4" 2>/dev/null || true)
 if [ "$count" = 730 ]; then break; fi
 if rg -q 'Error:|NOT deterministic' "$p/render.log"; then exit 1; fi
 sleep 3
done
python3 "$p/reviews.py" > "$p/reviews.log" 2>&1
python3 "$p/build_v15.py" > "$p/build_v15.log" 2>&1
python3 "$p/verify.py" > "$p/verify.log" 2>&1
python3 "$p/audio_verify.py" > "$p/audio_verify.log" 2>&1
python3 "$p/subtitle_verify.py" > "$p/subtitle_verify.log" 2>&1
python3 "$p/boundaries.py" > "$p/boundary.log" 2>&1
python3 "$p/boundaries.py" _720p > "$p/boundary_720p.log" 2>&1
sha256sum engine/lib/{he,he_detail,wash,ann,scope,camera}.js parity_r4/chapters/04.js > "$p/locked_end.sha256"
cmp "$p/locked_start.sha256" "$p/locked_end.sha256"
echo verified > "$p/pipeline_done"
