set -eu
node qa/v6/h03_s07/render_all.mjs > qa/v6/h05/s07_stills.log 2>&1
node qa/v6/h03_s07/render_all.mjs --det > qa/v6/h05/s07_determinism.log 2>&1
node qa/v6/h05/export_video.mjs s07 qa/v6/h03_s07/S07.mp4 > qa/v6/h05/s07_video.log 2>&1
# Re-extract S06 stills after the final pale-centre refinement.
node /workspace/garden-skills/skills/motion-showreel/scripts/render.mjs film --q scene=s06 --still "$(node --input-type=module -e "import fs from 'node:fs';console.log(JSON.parse(fs.readFileSync('qa/v6/h04_s06/keyframes.json')).picks.map(p=>p.t.toFixed(6)).join(','))")" --out qa/v6/h04_s06/stills > qa/v6/h05/s06_final_stills.log 2>&1
python3 qa/v6/h05/make_reviews.py
python3 qa/v6/h05/build_v14.py > qa/v6/h05/build_v14.log 2>&1
python3 qa/v6/h05/check_v14.py > qa/v6/h05/check_v14.log 2>&1
python3 qa/v6/h05/check_scenes.py > qa/v6/h05/check_scenes.log 2>&1
sha256sum engine/lib/{he,he_detail,wash,ann,scope,camera}.js parity_r4/chapters/04.js > qa/v6/h05/locked_end.sha256
diff qa/v6/h05/locked_start.sha256 qa/v6/h05/locked_end.sha256
